"""
Resumes API routes.

Provides endpoints to upload, list, retrieve, delete, and download resumes.
Integrates with storage_service and resume_parser_service to parser uploads.
"""

import uuid
from typing import Any, cast
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status, Form
from fastapi.responses import Response

from app.core.auth import get_current_user, supabase
from app.schemas.resume import ResumeListItem, ResumeResponse, ResumeUpdate
from app.services.storage import storage_service
from app.services.resume_parser import resume_parser_service
from app.services.ingestion import reindex_profile

supabase = cast(Any, supabase)

router = APIRouter(prefix="/resumes", tags=["resumes"])


@router.post("", response_model=ResumeResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    file: UploadFile = File(...),
    name: str = Form(...),
    is_primary: bool = Form(False),
    profile: dict = Depends(get_current_user),
) -> dict:
    """Upload and parse a resume (PDF or DOCX)."""
    # 1. Validate file extension
    file_ext = file.filename.split(".")[-1].lower() if file.filename else ""
    if file_ext not in ("pdf", "docx", "doc"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported file format. Please upload PDF or DOCX.",
        )

    # 2. Read file contents
    file_bytes = await file.read()
    file_size = len(file_bytes)

    # 3. Save to storage
    storage_path = await storage_service.upload(
        file_bytes=file_bytes,
        original_filename=file.filename or "resume.pdf",
        profile_id=str(profile["id"]),
        content_type=file.content_type or "application/octet-stream",
    )

    # 4. Parse content using resume_parser_service
    # Write file to a temporary location to let pymupdf4llm read it
    import tempfile
    import os
    temp_dir = tempfile.gettempdir()
    safe_filename = file.filename.replace(" ", "_") if file.filename else "resume.pdf"
    temp_path = os.path.join(temp_dir, f"{profile['id']}_{safe_filename}")
    try:
        with open(temp_path, "wb") as f:
            f.write(file_bytes)

        parsed_data = await resume_parser_service.parse_resume(temp_path)
    except Exception as e:
        # Cleanup storage on parse failure to keep clean
        await storage_service.delete(storage_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse resume: {e}",
        )
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

    # 5. Handle is_primary constraint (if true, remove primary flag from others)
    if is_primary:
        supabase.table("resumes").update({"is_primary": False}).eq("profile_id", profile["id"]).execute()

    # 6. Create database record
    new_resume = {
        "id": str(uuid.uuid4()),
        "profile_id": profile["id"],
        "name": name,
        "storage_path": storage_path,
        "file_name": file.filename or "resume.pdf",
        "file_size": file_size,
        "mime_type": file.content_type or "application/pdf",
        "parsed_text": parsed_data.text,
        "parsed_markdown": parsed_data.markdown,
        "parsed_sections": parsed_data.sections,
        "is_primary": is_primary,
    }
    insert_res = supabase.table("resumes").insert(new_resume).execute()

    # 7. Auto-populate user profile from parsed resume contact info
    sections = parsed_data.sections
    if sections.get("contact"):
        contact = sections["contact"]
        # Build update dict — only fill fields that are currently empty or set to defaults
        profile_update = {}
        field_map = {
            "full_name": "full_name",
            "phone": "phone",
            "location": "location",
            "linkedin_url": "linkedin_url",
            "github_url": "github_url",
            "portfolio_url": "portfolio_url",
        }
        url_fields = {"linkedin_url", "github_url", "portfolio_url"}
        # Placeholder defaults that should be treated as "empty"
        placeholder_defaults = {
            "full_name": {"User", "user", ""},
        }

        for resume_key, profile_key in field_map.items():
            parsed_val = contact.get(resume_key)
            existing_val = profile.get(profile_key)
            # Treat placeholder defaults as empty
            defaults = placeholder_defaults.get(profile_key, set())
            is_empty = not existing_val or existing_val in defaults
            if parsed_val and is_empty:
                # Sanitize URL fields: prepend https:// if missing
                if profile_key in url_fields:
                    parsed_val = parsed_val.strip()
                    if parsed_val and not parsed_val.startswith(("http://", "https://")):
                        parsed_val = f"https://{parsed_val}"
                profile_update[profile_key] = parsed_val

        # Also update summary if it's the default placeholder
        if sections.get("summary") and (not profile.get("summary") or profile.get("summary") == "Career profile summary"):
            profile_update["summary"] = sections["summary"]

        if profile_update:
            supabase.table("user_profiles").update(profile_update).eq("id", profile["id"]).execute()

    # 8. Auto-populate all knowledge base tables
    _do_import_resume_sections(profile["id"], sections)

    # 9. Reindex the profile's resume chunks for vector retrieval
    await reindex_profile(profile["id"])

    return insert_res.data[0]


def _do_import_resume_sections(profile_id: str, sections: dict):
    """Internal helper to insert parsed resume sections into the database tables."""
    from datetime import datetime
    
    print("\n--- DEBUG: PARSED SECTIONS EXTRACTED ---")
    print(sections)
    print("---------------------------------------\n")

    def parse_date(date_str: str | None) -> str | None:
        if not date_str or date_str == "null":
            return None
        try:
            # Validate format, then return string for Supabase
            datetime.strptime(date_str, "%Y-%m-%d")
            return date_str
        except ValueError:
            return None

    # Education
    if sections.get("education"):
        for edu in sections["education"]:
            try:
                try:
                    gpa_val = float(edu.get("gpa")) if edu.get("gpa") else None
                except (ValueError, TypeError):
                    gpa_val = None
                    
                inst = edu.get("institution", "Unknown")
                deg = edu.get("degree", "Unknown")
                
                existing = supabase.table("education").select("id").eq("profile_id", profile_id).eq("institution", inst).eq("degree", deg).execute()
                
                edu_dict = {
                    "profile_id": profile_id,
                    "institution": inst,
                    "degree": deg,
                    "field_of_study": edu.get("field_of_study"),
                    "start_date": parse_date(edu.get("start_date")),
                    "end_date": parse_date(edu.get("end_date")),
                    "gpa": gpa_val,
                    "description": edu.get("description"),
                    "is_current": edu.get("is_current", False)
                }
                
                if not existing.data:
                    edu_dict["id"] = str(uuid.uuid4())
                    supabase.table("education").insert(edu_dict).execute()
                else:
                    supabase.table("education").update(edu_dict).eq("id", existing.data[0]["id"]).execute()
            except Exception as e:
                print(f"Error inserting education: {e}")

    # Work Experience
    if sections.get("work_experience"):
        for work in sections["work_experience"]:
            try:
                comp = work.get("company", "Unknown")
                job_title = work.get("title", "Unknown")
                
                existing = supabase.table("work_experience").select("id").eq("profile_id", profile_id).eq("company", comp).eq("title", job_title).execute()
                
                work_dict = {
                    "profile_id": profile_id,
                    "company": comp,
                    "title": job_title,
                    "location": work.get("location"),
                    "start_date": parse_date(work.get("start_date")),
                    "end_date": parse_date(work.get("end_date")),
                    "description": work.get("description"),
                    "highlights": work.get("highlights") or [],
                    "technologies": work.get("technologies") or [],
                    "is_current": work.get("is_current", False)
                }
                
                if not existing.data:
                    work_dict["id"] = str(uuid.uuid4())
                    supabase.table("work_experience").insert(work_dict).execute()
                else:
                    supabase.table("work_experience").update(work_dict).eq("id", existing.data[0]["id"]).execute()
            except Exception as e:
                print(f"Error inserting work experience: {e}")

    # Projects
    if sections.get("projects"):
        for proj in sections["projects"]:
            try:
                proj_name = proj.get("name", "Unknown")
                
                existing = supabase.table("projects").select("id").eq("profile_id", profile_id).eq("name", proj_name).execute()
                
                proj_dict = {
                    "profile_id": profile_id,
                    "name": proj_name,
                    "description": proj.get("description"),
                    "url": proj.get("url"),
                    "technologies": proj.get("technologies") or [],
                    "highlights": proj.get("highlights") or [],
                    "start_date": parse_date(proj.get("start_date")),
                    "end_date": parse_date(proj.get("end_date"))
                }
                
                if not existing.data:
                    proj_dict["id"] = str(uuid.uuid4())
                    supabase.table("projects").insert(proj_dict).execute()
                else:
                    supabase.table("projects").update(proj_dict).eq("id", existing.data[0]["id"]).execute()
            except Exception as e:
                print(f"Error inserting projects: {e}")

    # Skills
    if sections.get("skills"):
        for skill in sections["skills"]:
            try:
                try:
                    yoe = float(skill.get("years_experience")) if skill.get("years_experience") else None
                except (ValueError, TypeError):
                    yoe = None
                    
                skill_name = skill.get("name", "Unknown").strip()
                
                # 1. Fetch or create global skill
                skill_res = supabase.table("skills").select("id").eq("name", skill_name).execute()
                if skill_res.data:
                    skill_id = skill_res.data[0]["id"]
                else:
                    insert_res = supabase.table("skills").insert({
                        "id": str(uuid.uuid4()),
                        "name": skill_name, 
                        "category": skill.get("category")
                    }).execute()
                    if insert_res.data:
                        skill_id = insert_res.data[0]["id"]
                    else:
                        continue
                        
                # 2. Link skill to user profile
                user_skill_res = supabase.table("user_skills").select("id").eq("profile_id", profile_id).eq("skill_id", skill_id).execute()
                if not user_skill_res.data:
                    supabase.table("user_skills").insert({
                        "id": str(uuid.uuid4()),
                        "profile_id": profile_id,
                        "skill_id": skill_id,
                        "proficiency": skill.get("proficiency"),
                        "years_experience": yoe
                    }).execute()
                else:
                    supabase.table("user_skills").update({
                        "proficiency": skill.get("proficiency"),
                        "years_experience": yoe
                    }).eq("id", user_skill_res.data[0]["id"]).execute()
            except Exception as e:
                print(f"Error inserting skills: {e}")

    # Certifications
    if sections.get("certifications"):
        for cert in sections["certifications"]:
            try:
                cert_name = cert.get("name", "Unknown")
                
                existing = supabase.table("certifications").select("id").eq("profile_id", profile_id).eq("name", cert_name).execute()
                
                cert_dict = {
                    "profile_id": profile_id,
                    "name": cert_name,
                    "issuer": cert.get("issuer"),
                    "issue_date": parse_date(cert.get("issue_date")),
                    "expiry_date": parse_date(cert.get("expiry_date")),
                    "credential_id": cert.get("credential_id"),
                    "credential_url": cert.get("credential_url")
                }
                
                if not existing.data:
                    cert_dict["id"] = str(uuid.uuid4())
                    supabase.table("certifications").insert(cert_dict).execute()
                else:
                    supabase.table("certifications").update(cert_dict).eq("id", existing.data[0]["id"]).execute()
            except Exception as e:
                print(f"Error inserting certifications: {e}")

    # Summary
    if sections.get("summary"):
        try:
            supabase.table("user_profiles").update({"summary": sections["summary"]}).eq("id", profile_id).execute()
        except Exception as e:
            print(f"Error updating summary: {e}")



@router.get("", response_model=list[ResumeListItem])
async def list_resumes(
    profile: dict = Depends(get_current_user),
) -> list[dict]:
    """List all resumes for the user."""
    res = supabase.table("resumes").select("*").eq("profile_id", profile["id"]).execute()
    return res.data


@router.get("/{resume_id}", response_model=ResumeResponse)
async def get_resume(
    resume_id: uuid.UUID,
    profile: dict = Depends(get_current_user),
) -> dict:
    """Retrieve details of a specific resume."""
    res = supabase.table("resumes").select("*").eq("id", str(resume_id)).eq("profile_id", profile["id"]).execute()
    
    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found",
        )
    return res.data[0]


@router.patch("/{resume_id}", response_model=ResumeResponse)
async def update_resume(
    resume_id: uuid.UUID,
    payload: ResumeUpdate,
    profile: dict = Depends(get_current_user),
) -> dict:
    """Update resume metadata (name, is_primary)."""
    res = supabase.table("resumes").select("*").eq("id", str(resume_id)).eq("profile_id", profile["id"]).execute()
    
    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found",
        )

    update_data = payload.model_dump(exclude_unset=True)

    if update_data.get("is_primary"):
        # Reset other primary badges
        supabase.table("resumes").update({"is_primary": False}).eq("profile_id", profile["id"]).execute()

    if update_data:
        update_res = supabase.table("resumes").update(update_data).eq("id", str(resume_id)).execute()
        return update_res.data[0]
    return res.data[0]


@router.delete("/{resume_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resume(
    resume_id: uuid.UUID,
    profile: dict = Depends(get_current_user),
) -> None:
    """Delete a resume from the database and storage."""
    res = supabase.table("resumes").select("*").eq("id", str(resume_id)).eq("profile_id", profile["id"]).execute()

    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found",
        )
    resume = res.data[0]

    # 1. Delete file from storage
    try:
        await storage_service.delete(resume["storage_path"])
    except Exception as e:
        import structlog
        logger = structlog.get_logger()
        logger.warning("storage_delete_failed", path=resume["storage_path"], error=str(e))

    # 2. Delete DB record
    supabase.table("resumes").delete().eq("id", str(resume_id)).execute()
    return None


@router.get("/{resume_id}/download")
async def download_resume(
    resume_id: uuid.UUID,
    profile: dict = Depends(get_current_user),
) -> Response:
    """Download the original uploaded resume file."""
    res = supabase.table("resumes").select("*").eq("id", str(resume_id)).eq("profile_id", profile["id"]).execute()

    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume not found",
        )
    resume = res.data[0]

    file_bytes = await storage_service.download(resume["storage_path"])
    return Response(
        content=file_bytes,
        media_type=resume["mime_type"],
        headers={"Content-Disposition": f'attachment; filename="{resume["file_name"]}"'},
    )


@router.post("/{resume_id}/import", status_code=status.HTTP_200_OK)
async def import_resume_to_knowledge_base(
    resume_id: uuid.UUID,
    profile: dict = Depends(get_current_user),
) -> dict:
    """Import parsed resume sections into the knowledge base models."""
    from datetime import datetime, date
    from app.core.auth import supabase
    
    profile_id = profile["id"]

    res = supabase.table("resumes").select("*").eq("id", str(resume_id)).eq("profile_id", profile_id).execute()
    resume = res.data[0] if res.data else None

    if not resume or not resume.get("parsed_sections"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Resume or parsed sections not found",
        )

    sections = resume["parsed_sections"]

    # 8. Auto-populate all knowledge base tables
    _do_import_resume_sections(profile_id, sections)

    # 9. Reindex the profile's resume chunks for vector retrieval
    await reindex_profile(profile_id)

    return {"detail": "Successfully imported to knowledge base"}
