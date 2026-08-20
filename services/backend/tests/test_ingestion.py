"""
Tests for the ingestion pipeline.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.ingestion import index_resume


@pytest.mark.asyncio
async def test_index_resume_happy_path():
    """Verify that index_resume clears old chunks and writes new ones."""
    profile_id = "user123"
    resume_id = "resume456"
    
    with (
        patch("app.services.ingestion.supabase") as mock_supabase,
        patch("app.services.ingestion.get_asupabase", new_callable=AsyncMock) as mock_get_asupabase,
        patch("app.services.ingestion.chunk_text_semantic", new_callable=AsyncMock) as mock_chunk,
        patch("app.services.ingestion.embed_texts", new_callable=AsyncMock) as mock_embed
    ):
        mock_asupabase = MagicMock()
        mock_get_asupabase.return_value = mock_asupabase

        # Setup the mocks upfront so we can reference them in asserts
        mock_resumes_table = MagicMock()
        mock_chunks_table = MagicMock()
        
        mock_read_execute = MagicMock()
        mock_read_execute.execute.return_value = MagicMock(data=[{
            "id": resume_id,
            "parsed_text": "Resume text to chunk"
        }])
        mock_resumes_table.select.return_value.eq.return_value.eq.return_value = mock_read_execute
        
        mock_supabase.table.return_value = mock_resumes_table
        mock_asupabase.table.return_value = mock_chunks_table
        
        # Async mock for execute
        mock_delete_execute = AsyncMock()
        mock_chunks_table.delete.return_value.eq.return_value.execute = mock_delete_execute
        
        mock_insert_execute = AsyncMock()
        mock_chunks_table.insert.return_value.execute = mock_insert_execute
        
        # Mock chunking to return 3 chunks
        mock_chunk.return_value = ["Chunk 1", "Chunk 2", "Chunk 3"]
        
        # Mock embeddings to return 3 vectors
        mock_embed.return_value = [[0.1], [0.2], [0.3]]
        
        # Run function
        num_written = await index_resume(profile_id, resume_id)
        
        assert num_written == 3
        
        # Verify old chunks were deleted
        mock_delete_execute.assert_called_once()
        
        # Verify new chunks were inserted
        mock_insert_execute.assert_called_once()


@pytest.mark.asyncio
async def test_index_resume_no_parsed_text():
    """Verify that if parsed_text is empty, it returns 0 and does not insert."""
    profile_id = "user123"
    resume_id = "resume456"
    
    with (
        patch("app.services.ingestion.supabase") as mock_supabase,
        patch("app.services.ingestion.get_asupabase", new_callable=AsyncMock) as mock_get_asupabase,
        patch("app.services.ingestion.chunk_text_semantic", new_callable=AsyncMock) as mock_chunk,
        patch("app.services.ingestion.embed_texts", new_callable=AsyncMock) as mock_embed
    ):
        mock_asupabase = MagicMock()
        mock_get_asupabase.return_value = mock_asupabase

        mock_resumes_table = MagicMock()
        mock_chunks_table = MagicMock()
        
        mock_read_execute = MagicMock()
        # Return a resume with null/empty parsed_text
        mock_read_execute.execute.return_value = MagicMock(data=[{
            "id": resume_id,
            "parsed_text": None
        }])
        mock_resumes_table.select.return_value.eq.return_value.eq.return_value = mock_read_execute
        
        mock_supabase.table.return_value = mock_resumes_table
        mock_asupabase.table.return_value = mock_chunks_table
        
        mock_delete_execute = AsyncMock()
        mock_chunks_table.delete.return_value.eq.return_value.execute = mock_delete_execute
        
        mock_insert_execute = AsyncMock()
        mock_chunks_table.insert.return_value.execute = mock_insert_execute

        num_written = await index_resume(profile_id, resume_id)
        
        assert num_written == 0
        mock_chunk.assert_not_called()
        mock_embed.assert_not_called()
        mock_delete_execute.assert_called_once()
        mock_insert_execute.assert_not_called()


@pytest.mark.asyncio
async def test_index_resume_no_supabase():
    """Verify that if supabase client is None, it raises ValueError."""
    with patch("app.services.ingestion.get_asupabase", new_callable=AsyncMock) as mock_get_asupabase:
        mock_get_asupabase.return_value = None
        with pytest.raises(ValueError, match="Supabase async client is not configured"):
            await index_resume("user123", "resume456")
