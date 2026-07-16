"""
RAG Engine service.

This service retrieves the candidate's profile, primary resume, and knowledge base
entries from Supabase. It constructs a context-rich prompt and uses an LLM to
generate autofill answers for a given job application form schema.
"""

import instructor
from litellm import acompletion

from app.config import settings
from app.schemas.autofill import FormSchema, AutofillResponse
from app.core.auth import supabase


async def generate_autofill_answers(
    profile: dict,
    form_schema: FormSchema,
) -> AutofillResponse:
    """
    Generate answers for the given form schema using the user's data.
    """
    profile_id = profile["id"]
    
    # 1. Fetch user data context
    
    # Primary resume
    res = supabase.table("resumes").select("*").eq("profile_id", profile_id).eq("is_primary", True).execute()
    resume = res.data[0] if res.data else None
    
    # Knowledge items
    education = supabase.table("education").select("*").eq("profile_id", profile_id).execute().data
    experience = supabase.table("work_experience").select("*").eq("profile_id", profile_id).execute().data
    projects = supabase.table("projects").select("*").eq("profile_id", profile_id).execute().data
    skills = supabase.table("user_skills").select("proficiency, years_experience, skills(name)").eq("profile_id", profile_id).execute().data

    # 2. Construct context string
    context_parts = []
    
    # Profile context
    profile_ctx = f"""
    Name: {profile.get('full_name')}
    Email: {profile.get('email')}
    Phone: {profile.get('phone') or ''}
    Location: {profile.get('location') or ''}
    LinkedIn: {profile.get('linkedin_url') or ''}
    GitHub: {profile.get('github_url') or ''}
    Portfolio: {profile.get('portfolio_url') or ''}
    Summary: {profile.get('summary') or ''}
    Salary Expectation: {profile.get('salary_expectation') or ''}
    Notice Period: {profile.get('notice_period') or ''}
    Work Authorization: {profile.get('work_authorization') or ''}
    """
    context_parts.append(f"--- PROFILE ---\n{profile_ctx}")

    # Resume context (if parsed)
    if resume and resume.get("parsed_text"):
        context_parts.append(f"--- PRIMARY RESUME ---\n{resume['parsed_text']}")

    # Experience context
    if experience:
        exp_ctx = ""
        for exp in experience:
            exp_ctx += f"- {exp.get('title')} at {exp.get('company')} ({exp.get('start_date')} to {exp.get('end_date') or 'Present'})\n  {exp.get('description') or ''}\n"
        context_parts.append(f"--- EXPERIENCE ---\n{exp_ctx}")

    # Education context
    if education:
        edu_ctx = ""
        for edu in education:
            edu_ctx += f"- {edu.get('degree')} in {edu.get('field_of_study')} from {edu.get('institution')} ({edu.get('start_date')} to {edu.get('end_date')})\n"
        context_parts.append(f"--- EDUCATION ---\n{edu_ctx}")

    if skills:
        skill_list = []
        for s in skills:
            skill_name = s.get("skills", {}).get("name")
            if skill_name:
                prof = f" ({s.get('proficiency')})" if s.get('proficiency') else ""
                yoe = f" - {s.get('years_experience')} yrs" if s.get('years_experience') else ""
                skill_list.append(f"{skill_name}{prof}{yoe}")
        skill_ctx = ", ".join(skill_list)
        context_parts.append(f"--- SKILLS ---\n{skill_ctx}")

    full_context = "\n\n".join(context_parts)

    # 3. Construct form prompt
    form_fields_json = form_schema.model_dump_json(indent=2)
    
    system_prompt = """
    You are an expert ATS (Applicant Tracking System) job application autofill assistant.
    Your task is to provide the best possible answers for the form fields provided by the user,
    based on the provided CANDIDATE CONTEXT.
    
    Rules:
    1. For dropdowns (options provided), you must return an exact match to one of the options, or the closest match.
    2. For checkboxes/booleans, return "true" or "false".
    3. For text areas (like Cover Letter, Summary, or Why do you want to work here), generate a concise and professional response based on the candidate's context.
    4. If you genuinely do not know the answer based on the context and it's a specific personal detail (like SSN), return an empty string "".
    """

    user_prompt = f"""
    CANDIDATE CONTEXT:
    {full_context}
    
    FORM SCHEMA TO FILL:
    {form_fields_json}
    """

    # 4. Generate with LLM
    client = instructor.from_litellm(acompletion)
    
    try:
        response_model: AutofillResponse = await client.chat.completions.create(
            model=settings.litellm_model,
            messages=[
                {"role": "system", "content": system_prompt.strip()},
                {"role": "user", "content": user_prompt.strip()},
            ],
            response_model=AutofillResponse,
            temperature=0.2,
        )
        return response_model
    except Exception:
        return AutofillResponse(answers={})
