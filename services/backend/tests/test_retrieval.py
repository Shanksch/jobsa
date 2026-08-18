"""
Tests for the retrieval service.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.services.retrieval import retrieve_for_form


@pytest.mark.asyncio
async def test_retrieve_for_form_deduplication():
    """Verify that chunks retrieved from multiple fields are deduplicated correctly."""
    
    with (
        patch("app.services.retrieval.embed_texts", new_callable=AsyncMock) as mock_embed_texts,
        patch("app.services.retrieval._search") as mock_search
    ):
        mock_embed_texts.return_value = [[0.1], [0.2]]
        
        # Simulating two search queries (one for each field) returning overlapping chunks
        mock_search.side_effect = [
            [
                {"id": "chunk_1", "similarity": 0.8, "chunk_text": "Experienced Dev", "source": "resume"}
            ],
            [
                # chunk_1 comes back again with higher similarity
                {"id": "chunk_1", "similarity": 0.9, "chunk_text": "Experienced Dev", "source": "resume"},
                {"id": "chunk_2", "similarity": 0.7, "chunk_text": "Led a team", "source": "resume"}
            ]
        ]
        
        results = await retrieve_for_form("profile123", ["Query 1", "Query 2"])
        
        # Should contain exactly 2 unique chunks
        assert len(results) == 2
        
        # chunk_1 should be kept once, and it should retain the highest score
        chunk_1 = next(c for c in results if c["id"] == "chunk_1")
        assert chunk_1["similarity"] == 0.9


@pytest.mark.asyncio
async def test_retrieve_for_form_text_overlap_dedup():
    """Verify that chunks with different IDs but >70% text overlap are deduplicated."""
    
    with (
        patch("app.services.retrieval.embed_texts", new_callable=AsyncMock) as mock_embed_texts,
        patch("app.services.retrieval._search") as mock_search
    ):
        mock_embed_texts.return_value = [[0.1]]
        
        # Return two chunks with different IDs but nearly identical text
        mock_search.side_effect = [
            [
                {"id": "chunk_1", "similarity": 0.9, "chunk_text": "Led a team of five engineers developing scalable web applications using Python and React.", "source": "resume"},
                {"id": "chunk_2", "similarity": 0.8, "chunk_text": "Led a team of 5 engineers developing scalable web applications with Python and ReactJS.", "source": "resume"}
            ]
        ]
        
        results = await retrieve_for_form("profile123", ["Query"])
        
        # Only the higher-scoring chunk should remain due to text deduplication
        assert len(results) == 1
        assert results[0]["id"] == "chunk_1"


@pytest.mark.asyncio
async def test_retrieve_for_form_empty_fields():
    """Empty fields list should return empty list."""
    with patch("app.services.retrieval.embed_texts", new_callable=AsyncMock) as mock_embed_texts:
        results = await retrieve_for_form("profile123", [])
        assert results == []
        mock_embed_texts.assert_not_called()


@pytest.mark.asyncio
async def test_retrieve_for_form_resume_filter():
    """Ensure that filtering by resume_id works."""
    with (
        patch("app.services.retrieval.embed_texts", new_callable=AsyncMock) as mock_embed_texts,
        patch("app.services.retrieval._search") as mock_search
    ):
        mock_embed_texts.return_value = [[0.1]]
        
        mock_search.side_effect = [
            [
                {"id": "c1", "similarity": 0.9, "chunk_text": "T1", "resume_id": "r1"},
                {"id": "c2", "similarity": 0.8, "chunk_text": "T2", "resume_id": "r2"}
            ]
        ]
        
        # Filter for "r1"
        results = await retrieve_for_form("profile123", ["Query"], resume_id="r1")
        
        assert len(results) == 1
        assert results[0]["id"] == "c1"
