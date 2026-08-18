"""
Tests for the StorageService.
"""

import os
import tempfile
from unittest.mock import MagicMock, PropertyMock, patch

import pytest

from app.config import settings
from app.services.storage import StorageService


@pytest.fixture
def mock_supabase_storage_service():
    with patch.object(settings.__class__, "supabase_configured", new_callable=PropertyMock, return_value=True), \
         patch.object(settings, "supabase_url", "http://test.supabase.co"), \
         patch.object(settings, "supabase_service_role_key", "test_key"), \
         patch.object(settings, "supabase_storage_bucket", "resumes"):
         
        with patch("supabase.create_client") as mock_create_client:
            mock_client = MagicMock()
            
            # Setup list_buckets to avoid bucket creation call
            mock_bucket = MagicMock()
            mock_bucket.name = "resumes"
            mock_client.storage.list_buckets.return_value = [mock_bucket]
            
            mock_create_client.return_value = mock_client
            
            service = StorageService()
            return service, mock_client


@pytest.fixture
def local_storage_service():
    with patch.object(settings.__class__, "supabase_configured", new_callable=PropertyMock, return_value=False):
        service = StorageService()
        return service


@pytest.mark.asyncio
async def test_upload_to_supabase(mock_supabase_storage_service):
    service, mock_client = mock_supabase_storage_service
    
    # Configure mock for upload
    mock_from = MagicMock()
    mock_client.storage.from_.return_value = mock_from
    
    file_bytes = b"pdf content"
    profile_id = "user123"
    
    storage_path = await service.upload(file_bytes, "test resume.pdf", profile_id)
    
    assert storage_path.startswith(f"{profile_id}/")
    assert "test_resume.pdf" in storage_path
    
    mock_client.storage.from_.assert_called_with("resumes")
    mock_from.upload.assert_called_once()
    
    # Extract kwargs to verify options
    call_args, call_kwargs = mock_from.upload.call_args
    assert call_kwargs["path"] == storage_path
    assert call_kwargs["file"] == file_bytes
    assert call_kwargs["file_options"]["content-type"] == "application/octet-stream"


@pytest.mark.asyncio
async def test_upload_local_fallback(local_storage_service):
    # Using tempfile and chdir to avoid actually writing to the real project dir
    with tempfile.TemporaryDirectory() as tmpdir:
        original_cwd = os.getcwd()
        os.chdir(tmpdir)
        try:
            file_bytes = b"local pdf content"
            profile_id = "user123"
            
            storage_path = await local_storage_service.upload(file_bytes, "test.pdf", profile_id)
            
            assert os.path.exists(storage_path)
            with open(storage_path, "rb") as f:
                assert f.read() == file_bytes
                
            assert "uploads" in storage_path
            assert profile_id in storage_path
        finally:
            os.chdir(original_cwd)


@pytest.mark.asyncio
async def test_download_from_supabase(mock_supabase_storage_service):
    service, mock_client = mock_supabase_storage_service
    
    mock_from = MagicMock()
    mock_from.download.return_value = b"downloaded content"
    mock_client.storage.from_.return_value = mock_from
    
    content = await service.download("user123/file.pdf")
    
    assert content == b"downloaded content"
    mock_from.download.assert_called_once_with("user123/file.pdf")


@pytest.mark.asyncio
async def test_delete_from_supabase(mock_supabase_storage_service):
    service, mock_client = mock_supabase_storage_service
    
    mock_from = MagicMock()
    mock_client.storage.from_.return_value = mock_from
    
    await service.delete("user123/file.pdf")
    
    mock_from.remove.assert_called_once_with(["user123/file.pdf"])
