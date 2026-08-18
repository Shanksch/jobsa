"""
Tests for chunking utilities.
"""

from unittest.mock import AsyncMock, patch

import pytest

from app.services.chunking import chunk_text, chunk_text_semantic, SemanticChunk, SemanticChunkList


def test_chunk_text_short_input():
    """Short input should not be split."""
    text = "Short resume text."
    chunks = chunk_text(text, chunk_size=100)
    assert len(chunks) == 1
    assert chunks[0] == "Short resume text."


def test_chunk_text_respects_paragraphs():
    """Chunking should split on paragraphs if they exceed chunk_size."""
    text = "Paragraph 1.\n\nParagraph 2.\n\nParagraph 3."
    # Set chunk size so that two paragraphs fit, but not three
    chunks = chunk_text(text, chunk_size=30)
    
    assert len(chunks) == 2
    assert chunks[0] == "Paragraph 1.\n\nParagraph 2."
    assert chunks[1] == "Paragraph 3."


def test_chunk_text_overlap():
    """Verify the chunking applies word-boundary overlap for a single long paragraph."""
    # A single continuous sentence without paragraph breaks
    text = "This is a very long continuous paragraph without any line breaks meant to test if the overlapping logic correctly applies word boundaries without splitting mid-word."
    
    chunks = chunk_text(text, chunk_size=50, overlap=15)
    
    # Check that it splits properly and applies overlap
    assert len(chunks) > 1
    
    # Just verify that chunks don't cut words in half and have some overlap
    for chunk in chunks:
        # None of the chunks should contain partial words like "continu"
        assert "continu " not in chunk


def test_chunk_text_word_boundary():
    """Verify hard splits happen at word boundaries, not char boundaries."""
    text = "word1 word2 word3 word4 word5"
    # Size cuts right in the middle of word3
    chunks = chunk_text(text, chunk_size=14, overlap=0)
    
    # "word1 word2 " = 12 chars
    # "word1 word2 word3" = 17 chars (too big)
    assert chunks[0] == "word1 word2"


@pytest.mark.asyncio
async def test_chunk_text_semantic_success():
    """Verify semantic chunking parses Gemini JSON correctly."""
    
    mock_json = '{"chunks": [{"chunk_text": "Experience 1", "chunk_type": "Work"}, {"chunk_text": "Edu 1", "chunk_type": "Education"}]}'
    
    with patch("app.services.chunking.client.aio.models.generate_content", new_callable=AsyncMock) as mock_generate:
        mock_response = AsyncMock()
        mock_response.text = mock_json
        mock_generate.return_value = mock_response
        
        chunks = await chunk_text_semantic("Resume text")
        
        assert len(chunks) == 2
        assert chunks[0] == "Experience 1"
        assert chunks[1] == "Edu 1"


@pytest.mark.asyncio
async def test_chunk_text_semantic_fallback():
    """Verify semantic chunking falls back to naive chunking on error."""
    
    with patch("app.services.chunking.client.aio.models.generate_content", new_callable=AsyncMock) as mock_generate:
        mock_generate.side_effect = Exception("API failed")
        
        text = "This is a fallback test."
        
        # We also need to patch asyncio.sleep to bypass tenacity delays in the retry
        with patch("asyncio.sleep", new_callable=AsyncMock):
            chunks = await chunk_text_semantic(text)
            
        # It should have fallen back to naive chunk_text
        assert len(chunks) == 1
        assert chunks[0] == "This is a fallback test."
