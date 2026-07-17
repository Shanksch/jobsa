"""
RAG Engine service.

Retrieves the candidate's core profile fields (always included - small
and almost always relevant) plus the top chunks retrieved for *this*
form's fields (via pgvector), then asks the LLM to fill in the form.

This replaces the previous version, which fetched and pasted every
resume, work-experience row, and skill into every prompt regardless of
form size - fine for one resume and a dozen rows, but it doesn't scale
and costs more tokens than necessary as a profile's history grows.
"""

import instructor
from litellm import acompletion

from app.config import settings
from app.schemas.autofill import FormSchema, AutofillResponse
from app.services.retrieval import retrieve_for_form


async def generate_autofill_answers(
    profile: dict,
    form_schema: FormSchema,
) -> AutofillResponse:
    """
    Generate answers for the given form schema using the user's data.
    """
    profile_id = profile["id"]

    # 1. Always-included, cheap context: the profile's own top-level fields.
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
    context_parts = [f"--- PROFILE ---\n{profile_ctx.strip()}"]

    # 2. Retrieved context: only the chunks relevant to this form's fields,
    #    instead of every resume/experience/skill row on file.
    field_labels = [field.label for field in form_schema.fields]
    chunks = await retrieve_for_form(profile_id, field_labels, per_field_k=4)
    if chunks:
        retrieved_ctx = "\n\n".join(f"[{c['source']}] {c['chunk_text']}" for c in chunks)
        context_parts.append(f"--- RELEVANT BACKGROUND ---\n{retrieved_ctx}")

    full_context = "\n\n".join(context_parts)

    # 3. Construct form prompt (unchanged)
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

    # 4. Generate with LLM (unchanged)
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