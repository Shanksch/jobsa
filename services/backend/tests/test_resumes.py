"""
Tests for resumes API endpoints.
"""

import io
import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient

from app.models.profile import UserProfile
from app.services.resume_parser import ParsedResume


@pytest.mark.asyncio
async def test_upload_resume(client: AsyncClient, test_profile: UserProfile):
    """POST /api/resumes should upload and parse a resume file successfully."""
    mock_parsed = ParsedResume(
        text="Extracted text content from PDF",
        markdown="Extracted markdown content from PDF",
        sections={"summary": "Sample summary", "skills": ["Python", "Docker"]}
    )

    with patch("app.api.routes.resumes.storage_service.upload", new_callable=AsyncMock) as mock_upload, \
         patch("app.api.routes.resumes.resume_parser_service.parse_resume", new_callable=AsyncMock) as mock_parse:
        
        mock_upload.return_value = "default_user/resumes/uuid_resume.pdf"
        mock_parse.return_value = mock_parsed

        file_content = b"%PDF-1.4 test file content"
        files = {
            "file": ("resume.pdf", io.BytesIO(file_content), "application/pdf")
        }
        data = {
            "name": "Backend Resume",
            "is_primary": "true"
        }

        response = await client.post("/api/resumes", data=data, files=files)
        assert response.status_code == 201
        res_data = response.json()
        assert res_data["name"] == "Backend Resume"
        assert res_data["is_primary"] is True
        assert res_data["file_name"] == "resume.pdf"
        assert res_data["parsed_sections"]["summary"] == "Sample summary"
        
        mock_upload.assert_called_once()
        mock_parse.assert_called_once()


@pytest.mark.asyncio
async def test_list_resumes_empty(client: AsyncClient, test_profile: UserProfile):
    """GET /api/resumes should return an empty list initially."""
    response = await client.get("/api/resumes")
    assert response.status_code == 200
    assert response.json() == []
