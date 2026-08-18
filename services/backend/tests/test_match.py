"""
Tests for the Job Match API.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_match_endpoint_returns_score(client: AsyncClient, test_profile: dict):
    """POST /api/match should evaluate a resume against a job description."""
    
    match_request = {
        "resume_id": "00000000-0000-0000-0000-000000000000",
        "job_description": "We are looking for a Python developer with Docker experience."
    }

    from app.schemas.autofill import JobMatchResponse, CategoryScores

    mock_response = JobMatchResponse(
        overall_score=85,
        verdict="Strong Match",
        category_scores=CategoryScores(
            required_skills=90,
            experience_seniority=80,
            domain_relevance=85,
            nice_to_have_skills=75,
            education_certifications=85,
            career_trajectory=90
        ),
        matched_requirements=["Python", "Docker"],
        missing_requirements=[],
        inferred_transferable_skills=["Cloud deployment"],
        red_flags=[],
        confidence="High",
        rationale="Candidate has strong Python and Docker experience."
    )

    with (
        patch("app.services.rag_engine.supabase.table") as mock_table,
        patch("app.services.rag_engine.retrieve_for_form", new_callable=AsyncMock) as mock_retrieve,
        patch("app.services.rag_engine.client") as mock_client,
    ):
        # Mock DB Skills
        mock_skills_execute = MagicMock()
        mock_skills_execute.execute.return_value = MagicMock(data=[
            {"skills": {"name": "Python"}, "proficiency": "expert", "years_experience": 5},
            {"skills": {"name": "Docker"}, "proficiency": "intermediate", "years_experience": 3}
        ])
        
        # Mock DB Experience
        mock_exp_execute = MagicMock()
        mock_exp_execute.execute.return_value = MagicMock(data=[
            {"title": "Software Engineer", "company": "Tech Corp", "start_date": "2020-01-01", "end_date": "2023-01-01"}
        ])
        
        def mock_table_side_effect(name):
            mock = MagicMock()
            if name == "user_skills":
                mock.select.return_value.eq.return_value = mock_skills_execute
            elif name == "work_experience":
                mock.select.return_value.eq.return_value.order.return_value = mock_exp_execute
            return mock
            
        mock_table.side_effect = mock_table_side_effect
        
        # Mock Retrieval
        mock_retrieve.return_value = [
            {"chunk_text": "Experienced Python developer", "source": "resume.pdf"}
        ]
        
        # Mock LLM
        mock_chat_completion = AsyncMock()
        mock_chat_completion.return_value = mock_response
        mock_client.chat.completions.create = mock_chat_completion

        response = await client.post("/api/match", json=match_request)

    if response.status_code != 200:
        print(f"DEBUG: {response.status_code} {response.text}")
    assert response.status_code == 200
    data = response.json()
    assert data["overall_score"] == 85
    assert data["verdict"] == "Strong Match"
    assert data["matched_requirements"] == ["Python", "Docker"]


@pytest.mark.asyncio
async def test_match_endpoint_empty_jd(client: AsyncClient, test_profile: dict):
    """POST /api/match should handle an empty job description gracefully."""
    
    match_request = {
        "resume_id": "00000000-0000-0000-0000-000000000000",
        "job_description": "   "
    }

    # The API might return a 400 for empty JD. Let's see what it does.
    # We expect it to still be processed or rejected via validation.
    # The Pydantic model JobMatchRequest doesn't strict check length right now.
    
    from app.schemas.autofill import JobMatchResponse, CategoryScores
    
    mock_response = JobMatchResponse(
        overall_score=0,
        verdict="Not Qualified",
        category_scores=CategoryScores(
            required_skills=0, experience_seniority=0, domain_relevance=0,
            nice_to_have_skills=0, education_certifications=0, career_trajectory=0
        ),
        matched_requirements=[],
        missing_requirements=[],
        inferred_transferable_skills=[],
        red_flags=["Empty job description"],
        confidence="Low",
        rationale="No job description provided."
    )
    
    with (
        patch("app.services.rag_engine.supabase.table") as mock_table,
        patch("app.services.rag_engine.retrieve_for_form", new_callable=AsyncMock) as mock_retrieve,
        patch("app.services.rag_engine.client") as mock_client,
    ):
        mock_table.return_value.select.return_value.eq.return_value.execute.return_value = MagicMock(data=[])
        mock_table.return_value.select.return_value.eq.return_value.order.return_value.execute.return_value = MagicMock(data=[])
        
        mock_retrieve.return_value = []
        
        mock_chat_completion = AsyncMock()
        mock_chat_completion.return_value = mock_response
        mock_client.chat.completions.create = mock_chat_completion

        response = await client.post("/api/match", json=match_request)

    assert response.status_code == 200
    data = response.json()
    assert data["overall_score"] == 0
    assert data["red_flags"] == ["Empty job description"]
