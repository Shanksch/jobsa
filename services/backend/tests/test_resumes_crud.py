"""
CRUD Tests for resumes API endpoints (list, retrieve, delete, download, import).
"""

import uuid
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_resume_by_id(client: AsyncClient, test_profile: dict):
    """GET /api/resumes/{id} should return specific resume."""
    resume_id = str(uuid.uuid4())
    with patch("app.api.routes.resumes.supabase.table") as mock_table:
        mock_get_execute = MagicMock()
        mock_get_execute.execute.return_value = MagicMock(data=[{
            "id": resume_id,
            "profile_id": test_profile["id"],
            "name": "My Resume",
            "is_primary": True,
            "storage_path": "path",
            "file_name": "resume.pdf",
            "file_size": 123,
            "mime_type": "application/pdf",
            "parsed_text": "text",
            "parsed_markdown": "md",
            "parsed_sections": {"summary": "Developer"},
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2023-01-01T00:00:00Z"
        }])
        
        # Note: route uses .select("*").eq().eq().execute() and accesses data[0]
        mock_table.return_value.select.return_value.eq.return_value.eq.return_value = mock_get_execute

        response = await client.get(f"/api/resumes/{resume_id}")
        assert response.status_code == 200
        assert response.json()["name"] == "My Resume"
        assert response.json()["id"] == resume_id


@pytest.mark.asyncio
async def test_get_resume_not_found(client: AsyncClient, test_profile: dict):
    """GET /api/resumes/{id} should return 404 if not found."""
    resume_id = str(uuid.uuid4())
    with patch("app.api.routes.resumes.supabase.table") as mock_table:
        mock_get_execute = MagicMock()
        mock_get_execute.execute.return_value = MagicMock(data=[])
        mock_table.return_value.select.return_value.eq.return_value.eq.return_value = mock_get_execute

        response = await client.get(f"/api/resumes/{resume_id}")
        assert response.status_code == 404


@pytest.mark.asyncio
async def test_update_resume_metadata(client: AsyncClient, test_profile: dict):
    """PATCH /api/resumes/{id} should update resume name."""
    resume_id = str(uuid.uuid4())
    
    with patch("app.api.routes.resumes.supabase.table") as mock_table:
        mock_get_execute = MagicMock()
        # Mocking the SELECT query
        mock_get_execute.execute.return_value = MagicMock(data=[{
            "id": resume_id,
            "profile_id": test_profile["id"],
            "name": "Old Name",
            "is_primary": False,
            "storage_path": "path",
            "file_name": "resume.pdf",
            "file_size": 123,
            "mime_type": "application/pdf",
            "parsed_text": "text",
            "parsed_markdown": "md",
            "parsed_sections": {"summary": "Developer"},
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2023-01-01T00:00:00Z"
        }])
        
        mock_update_execute = MagicMock()
        # Mocking the UPDATE query response
        mock_update_execute.execute.return_value = MagicMock(data=[{
            "id": resume_id,
            "profile_id": test_profile["id"],
            "name": "Updated Name",
            "is_primary": False,
            "storage_path": "path",
            "file_name": "resume.pdf",
            "file_size": 123,
            "mime_type": "application/pdf",
            "parsed_text": "text",
            "parsed_markdown": "md",
            "parsed_sections": {"summary": "Developer"},
            "created_at": "2023-01-01T00:00:00Z",
            "updated_at": "2023-01-01T00:00:00Z"
        }])

        mock_resumes_table = MagicMock()
        def mock_table_side_effect(name):
            if name == "resumes":
                mock_resumes_table.select.return_value.eq.return_value.eq.return_value = mock_get_execute
                mock_resumes_table.update.return_value.eq.return_value = mock_update_execute
                return mock_resumes_table
            return MagicMock()
            
        mock_table.side_effect = mock_table_side_effect

        response = await client.patch(
            f"/api/resumes/{resume_id}", 
            json={"name": "Updated Name"}
        )
        assert response.status_code == 200
        assert response.json()["name"] == "Updated Name"
        
        # Verify that update was called with the correct data
        mock_table("resumes").update.assert_called_with({"name": "Updated Name"})


@pytest.mark.asyncio
async def test_delete_resume(client: AsyncClient, test_profile: dict):
    """DELETE /api/resumes/{id} should delete record and storage file."""
    resume_id = str(uuid.uuid4())
    
    with (
        patch("app.api.routes.resumes.supabase.table") as mock_table,
        patch("app.api.routes.resumes.storage_service.delete", new_callable=AsyncMock) as mock_delete,
    ):
        mock_get_execute = MagicMock()
        mock_get_execute.execute.return_value = MagicMock(data=[{
            "id": resume_id,
            "storage_path": "path/to/file.pdf"
        }])
        
        mock_delete_db = MagicMock()
        mock_delete_db.delete.return_value.eq.return_value.execute.return_value = MagicMock()
        
        mock_resumes_table = MagicMock()
        mock_chunks_table = MagicMock()
        def mock_table_side_effect(name):
            if name == "resumes":
                mock_resumes_table.select.return_value.eq.return_value.eq.return_value = mock_get_execute
                mock_resumes_table.delete.return_value.eq.return_value.execute.return_value = MagicMock()
                return mock_resumes_table
            elif name == "resume_chunks":
                mock_chunks_table.delete.return_value.eq.return_value.execute.return_value = MagicMock()
                return mock_chunks_table
            return MagicMock()
            
        mock_table.side_effect = mock_table_side_effect

        response = await client.delete(f"/api/resumes/{resume_id}")
        assert response.status_code == 204
        
        mock_delete.assert_called_once_with("path/to/file.pdf")
        mock_table("resumes").delete.return_value.eq.assert_called_with("id", resume_id)


@pytest.mark.asyncio
async def test_download_resume(client: AsyncClient, test_profile: dict):
    """GET /api/resumes/{id}/download should return file content."""
    resume_id = str(uuid.uuid4())
    
    with (
        patch("app.api.routes.resumes.supabase.table") as mock_table,
        patch("app.api.routes.resumes.storage_service.download", new_callable=AsyncMock) as mock_download,
    ):
        mock_get_execute = MagicMock()
        mock_get_execute.execute.return_value = MagicMock(data=[{
            "id": resume_id,
            "storage_path": "path/to/file.pdf",
            "mime_type": "application/pdf",
            "file_name": "resume.pdf"
        }])
        
        mock_table.return_value.select.return_value.eq.return_value.eq.return_value = mock_get_execute
        
        mock_download.return_value = b"mock pdf content"

        response = await client.get(f"/api/resumes/{resume_id}/download")
        assert response.status_code == 200
        assert response.content == b"mock pdf content"
        assert response.headers["content-type"] == "application/pdf"
        assert 'filename="resume.pdf"' in response.headers["content-disposition"]


@pytest.mark.asyncio
async def test_import_resume_to_kb(client: AsyncClient, test_profile: dict):
    """POST /api/resumes/{id}/import should import sections and chunks."""
    resume_id = str(uuid.uuid4())
    
    with (
        patch("app.api.routes.resumes.supabase.table") as mock_table,
        patch("app.api.routes.resumes._do_import_resume_sections") as mock_import_sections,
        patch("app.api.routes.resumes.index_resume", new_callable=AsyncMock) as mock_index_resume,
    ):
        mock_get_execute = MagicMock()
        mock_get_execute.execute.return_value = MagicMock(data=[{
            "id": resume_id,
            "profile_id": test_profile["id"],
            "parsed_sections": {"skills": [{"name": "Python"}]}
        }])
        
        mock_table.return_value.select.return_value.eq.return_value.eq.return_value = mock_get_execute

        response = await client.post(f"/api/resumes/{resume_id}/import")
        
        assert response.status_code == 200
        assert response.json()["detail"] == "Successfully imported to knowledge base"
        
        mock_import_sections.assert_called_once_with(test_profile["id"], {"skills": [{"name": "Python"}]})
        mock_index_resume.assert_called_once_with(test_profile["id"], resume_id)
