"""
Autofill API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import get_current_user
from app.schemas.autofill import AutofillResponse, FormSchema
from app.services.rag_engine import generate_autofill_answers
from langfuse import observe, propagate_attributes

router = APIRouter(prefix="/autofill", tags=["autofill"])


STRUCTURED_FIELD_SYNONYMS = {
    "first_name": {"first name", "given name", "legal first name"},
    "last_name": {"last name", "surname", "family name"},
    "full_name": {"name", "full name", "applicant name"},
    "email": {"email", "email address", "e-mail"},
    "phone": {"phone", "phone number", "mobile", "contact number"},
    "linkedin_url": {"linkedin", "linkedin profile", "linkedin url"},
    "github_url": {"github", "github profile", "github url"},
    "portfolio_url": {"portfolio", "website", "personal website"},
    "location": {"city", "current city", "location"},
    "notice_period": {"notice period", "availability"},
    "salary_expectation": {"salary expectation", "expected salary"},
    "work_authorization": {"work authorization", "authorized to work"},
}

def classify_field(label: str) -> str | None:
    normalized = label.strip().lower()
    for key, synonyms in STRUCTURED_FIELD_SYNONYMS.items():
        if normalized in synonyms:
            return key
    return None

def route_fields(fields: list, profile: dict):
    structured = []
    open_ended = []
    for field in fields:
        key = classify_field(field.label)
        if key and profile.get(key):
            structured.append((field, key))
        else:
            open_ended.append(field)
    return structured, open_ended

@router.post("", response_model=AutofillResponse)
@observe(name="api-autofill")
async def autofill_form(
    payload: FormSchema,
    profile: dict = Depends(get_current_user),
) -> AutofillResponse:
    """
    Generate answers for a job application form using the candidate's RAG context.
    """
    try:
        with propagate_attributes(user_id=profile["id"]):
            structured_fields, open_ended_fields = route_fields(payload.fields, profile)
            
            answers = {}
            # Fill structured fields immediately
            for field, key in structured_fields:
                answers[field.id] = str(profile[key])
                
            # Delegate open_ended fields to the RAG engine
            if open_ended_fields:
                # Create a temporary schema for the RAG engine
                open_ended_schema = FormSchema(
                    url=payload.url,
                    fields=open_ended_fields,
                    resume_id=payload.resume_id
                )
                llm_response = await generate_autofill_answers(profile=profile, form_schema=open_ended_schema)
                answers.update(llm_response.answers)
                
            return AutofillResponse(answers=answers)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate autofill answers: {str(e)}",
        )
