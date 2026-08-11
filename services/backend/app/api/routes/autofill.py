"""
Autofill API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import get_current_user
from app.schemas.autofill import AutofillResponse, FormSchema
from app.services.rag_engine import generate_autofill_answers
from langfuse import observe, propagate_attributes

router = APIRouter(prefix="/autofill", tags=["autofill"])


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
            return await generate_autofill_answers(profile=profile, form_schema=payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate autofill answers: {str(e)}",
        )
