"""
Tests for resumes API endpoints.
"""

import io
import pytest
from unittest.mock import AsyncMock, patch, MagicMock
from httpx import AsyncClient

from app.services.resume_parser import ParsedResume


@pytest.mark.asyncio
async def test_upload_resume(client: AsyncClient, test_profile: dict):
    """POST /api/resumes should upload and parse a resume file successfully."""
    mock_parsed = ParsedResume(
        text="Extracted text content from PDF",
        markdown="Extracted markdown content from PDF",
        sections={
            "summary": "Sample summary", 
            "skills": [
                {"name": "Python", "category": "Lang", "proficiency": "expert"}, 
                {"name": "Docker", "category": "Tools", "proficiency": "expert"}
            ]
        }
    )

    with patch("app.api.routes.resumes.storage_service.upload", new_callable=AsyncMock) as mock_upload, \
         patch("app.api.routes.resumes.resume_parser_service.parse_resume", new_callable=AsyncMock) as mock_parse, \
         patch("app.api.routes.resumes.reindex_profile", new_callable=AsyncMock) as mock_reindex, \
         patch("app.api.routes.resumes.supabase.table") as mock_table:
        
        mock_upload.return_value = "default_user/resumes/uuid_resume.pdf"
        mock_parse.return_value = mock_parsed
        mock_reindex.return_value = 0
        
        mock_execute = MagicMock()
        # Return what the endpoint expects from insert_res.data[0]
        mock_execute.execute.return_value = MagicMock(data=[{
            "id": "00000000-0000-0000-0000-000000000000",
            "profile_id": "00000000-0000-0000-0000-000000000000",
            "name": "Backend Resume",
            "is_primary": True,
            "file_name": "resume.pdf",
            "storage_path": "default_user/resumes/uuid_resume.pdf",
            "file_size": 1024,
            "mime_type": "application/pdf",
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2023-01-01T00:00:00Z",
            "parsed_sections": {"summary": "Sample summary"}
        }])
        mock_insert = MagicMock()
        mock_insert.insert.return_value = mock_execute
        mock_table.return_value = mock_insert

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
async def test_list_resumes_empty(client: AsyncClient, test_profile: dict):
    """GET /api/resumes should return an empty list initially."""
    with patch("app.api.routes.resumes.supabase.table") as mock_table:
        mock_execute = AsyncMock() if hasattr(AsyncMock, "execute") else MagicMock()
        mock_execute.execute.return_value = MagicMock(data=[])
        mock_eq = MagicMock()
        mock_eq.eq.return_value = mock_execute
        mock_select = MagicMock()
        mock_select.select.return_value = mock_eq
        mock_table.return_value = mock_select
        
        response = await client.get("/api/resumes")
        assert response.status_code == 200
        assert response.json() == []
