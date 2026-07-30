"""
Job Match Scoring API endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import get_current_user
from app.schemas.autofill import JobMatchRequest, JobMatchResponse
from app.services.rag_engine import generate_job_match_score

router = APIRouter(prefix="/match", tags=["match"])


@router.post("", response_model=JobMatchResponse)
async def match_job(
    payload: JobMatchRequest,
    profile: dict = Depends(get_current_user),
) -> JobMatchResponse:
    """
    Score the user's resume against a job description.
    """
    try:
        return await generate_job_match_score(profile=profile, payload=payload)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate match score: {str(e)}",
        )
