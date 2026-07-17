"""
Ingestion pipeline: turns a profile's resume + knowledge-base rows into
embedded chunks in `resume_chunks`, so the autofill engine can retrieve
only what's relevant per form field instead of stuffing everything into
every prompt.

Call `reindex_profile(profile_id)` after:
  - a resume finishes parsing (see routes/resumes.py — right after
    `_do_import_resume_sections(...)` in both `upload_resume` and
    `import_resume_to_knowledge_base`)
  - any manual knowledge-base edit you want reflected immediately

This does a full wipe-and-rebuild per profile on every call. That's
fine at the scale of "one person's career history" — a few dozen
chunks, a handful of embedding calls. Revisit only if it becomes
noticeably slow.
"""

from app.core.auth import supabase
from app.services.chunking import chunk_text
from app.services.embeddings import embed_texts


def _experience_to_text(exp: dict) -> str:
    end = exp.get("end_date") or "Present"
    lines = [f"{exp.get('title')} at {exp.get('company')} ({exp.get('start_date')} - {end})"]
    if exp.get("description"):
        lines.append(exp["description"])
    if exp.get("highlights"):
        lines.append("Highlights: " + "; ".join(exp["highlights"]))
    if exp.get("technologies"):
        lines.append("Technologies: " + ", ".join(exp["technologies"]))
    return "\n".join(lines)


def _project_to_text(proj: dict) -> str:
    lines = [proj.get("name", "")]
    if proj.get("description"):
        lines.append(proj["description"])
    if proj.get("technologies"):
        lines.append("Technologies: " + ", ".join(proj["technologies"]))
    if proj.get("highlights"):
        lines.append("Highlights: " + "; ".join(proj["highlights"]))
    return "\n".join(lines)


def _education_to_text(edu: dict) -> str:
    end = edu.get("end_date") or "Present"
    text = (
        f"{edu.get('degree')} in {edu.get('field_of_study')} "
        f"- {edu.get('institution')} ({edu.get('start_date')} - {end})"
    )
    if edu.get("description"):
        text += f"\n{edu['description']}"
    return text


def _certification_to_text(cert: dict) -> str:
    text = f"{cert.get('name')}"
    if cert.get("issuer"):
        text += f" - issued by {cert['issuer']}"
    if cert.get("issue_date"):
        text += f" ({cert['issue_date']})"
    if cert.get("credential_id"):
        text += f"\nCredential ID: {cert['credential_id']}"
    return text


def _achievement_to_text(ach: dict) -> str:
    text = ach.get("title", "")
    if ach.get("date"):
        text += f" ({ach['date']})"
    if ach.get("description"):
        text += f"\n{ach['description']}"
    return text


def _publication_to_text(pub: dict) -> str:
    text = pub.get("title", "")
    if pub.get("publisher"):
        text += f" - {pub['publisher']}"
    if pub.get("date"):
        text += f" ({pub['date']})"
    if pub.get("description"):
        text += f"\n{pub['description']}"
    return text


def _skills_summary_to_text(user_skills: list[dict]) -> str:
    """
    Skills are short, low-signal on their own ("Python" as a standalone
    chunk carries almost no embeddable meaning), so unlike the other
    knowledge-base rows they're combined into a single chunk rather than
    one chunk per row.
    """
    lines = []
    for row in user_skills:
        skill_name = (row.get("skills") or {}).get("name", "Unknown")
        parts = [skill_name]
        if row.get("proficiency"):
            parts.append(f"({row['proficiency']})")
        if row.get("years_experience"):
            parts.append(f"- {row['years_experience']} years")
        lines.append(" ".join(parts))
    return "Skills: " + "; ".join(lines)


async def reindex_profile(profile_id: str) -> int:
    """
    Rebuild every chunk for a profile. Returns the number of chunks written.
    """
    sources: list[tuple[str, str | None, str]] = []  # (source, source_id, text)

    # Primary resume — the only free-form long text, so the only thing
    # that actually needs chunk_text() splitting.
    resume_res = (
        supabase.table("resumes")
        .select("id, parsed_text")
        .eq("profile_id", profile_id)
        .eq("is_primary", True)
        .execute()
    )
    if resume_res.data and resume_res.data[0].get("parsed_text"):
        resume = resume_res.data[0]
        for piece in chunk_text(resume["parsed_text"]):
            sources.append(("resume", resume["id"], piece))

    # Structured knowledge-base rows — each row is already a self
    # contained, short unit, so one row = one chunk (no splitting).
    experience = (
        supabase.table("work_experience").select("*").eq("profile_id", profile_id).execute().data
    )
    for exp in experience or []:
        sources.append(("work_experience", exp["id"], _experience_to_text(exp)))

    projects = supabase.table("projects").select("*").eq("profile_id", profile_id).execute().data
    for proj in projects or []:
        sources.append(("project", proj["id"], _project_to_text(proj)))

    education = supabase.table("education").select("*").eq("profile_id", profile_id).execute().data
    for edu in education or []:
        sources.append(("education", edu["id"], _education_to_text(edu)))

    certifications = (
        supabase.table("certifications").select("*").eq("profile_id", profile_id).execute().data
    )
    for cert in certifications or []:
        sources.append(("certification", cert["id"], _certification_to_text(cert)))

    achievements = (
        supabase.table("achievements").select("*").eq("profile_id", profile_id).execute().data
    )
    for ach in achievements or []:
        sources.append(("achievement", ach["id"], _achievement_to_text(ach)))

    publications = (
        supabase.table("publications").select("*").eq("profile_id", profile_id).execute().data
    )
    for pub in publications or []:
        sources.append(("publication", pub["id"], _publication_to_text(pub)))

    # Skills join to the shared `skills` lookup table for the name —
    # same join pattern as core/auth.py's profile loader.
    user_skills = (
        supabase.table("user_skills")
        .select("*, skills(name)")
        .eq("profile_id", profile_id)
        .execute()
        .data
    )
    if user_skills:
        sources.append(("skills", None, _skills_summary_to_text(user_skills)))

    # Wipe existing chunks either way — keeps re-runs idempotent and
    # avoids stale chunks after a resume/knowledge-base edit.
    supabase.table("resume_chunks").delete().eq("profile_id", profile_id).execute()

    if not sources:
        return 0

    texts = [s[2] for s in sources]
    embeddings = await embed_texts(texts)

    rows = [
        {
            "profile_id": profile_id,
            "resume_id": source_id if source == "resume" else None,
            "source": source,
            "source_id": source_id,
            "chunk_text": text,
            "embedding": embedding,
        }
        for (source, source_id, text), embedding in zip(sources, embeddings)
    ]

    supabase.table("resume_chunks").insert(rows).execute()
    return len(rows)