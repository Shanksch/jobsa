"""
Tests for the embeddings service.
"""

from unittest.mock import AsyncMock, patch
import math

import pytest

from app.services.embeddings import embed_texts, embed_text


@pytest.mark.asyncio
async def test_embed_texts_returns_normalized_vectors():
    """Verify that embeddings returned from the API are L2-normalized."""
    
    # Unnormalized mock response from GenAI
    unnormalized_vector = [2.0, 0.0, 0.0]  # Length = 2.0
    
    with patch("app.services.embeddings.client.aio.models.embed_content", new_callable=AsyncMock) as mock_embed_content:
        mock_response = AsyncMock()
        
        # Mock the embedding objects structure
        class MockEmbedding:
            def __init__(self, values):
                self.values = values
                
        mock_response.embeddings = [
            MockEmbedding(unnormalized_vector),
            MockEmbedding([0.0, 3.0, 4.0]) # Length = 5.0
        ]
        
        mock_embed_content.return_value = mock_response
        
        result = await embed_texts(["Text 1", "Text 2"])
        
        assert len(result) == 2
        
        # Check first vector is normalized (should be [1.0, 0.0, 0.0])
        assert math.isclose(result[0][0], 1.0)
        assert result[0][1] == 0.0
        assert result[0][2] == 0.0
        
        # Check second vector is normalized (should be [0.0, 0.6, 0.8])
        assert result[1][0] == 0.0
        assert math.isclose(result[1][1], 0.6)
        assert math.isclose(result[1][2], 0.8)


@pytest.mark.asyncio
async def test_embed_texts_empty_input():
    """Empty list should return empty list without calling API."""
    with patch("app.services.embeddings.client.aio.models.embed_content", new_callable=AsyncMock) as mock_embed_content:
        result = await embed_texts([])
        assert result == []
        mock_embed_content.assert_not_called()


@pytest.mark.asyncio
async def test_embed_text_single():
    """embed_text should delegate to embed_texts and return the first vector."""
    with patch("app.services.embeddings.embed_texts", new_callable=AsyncMock) as mock_embed_texts:
        mock_embed_texts.return_value = [[0.1, 0.2, 0.3]]
        
        result = await embed_text("Hello")

        assert result == [0.1, 0.2, 0.3]
        mock_embed_texts.assert_called_once_with(["Hello"], task_type="RETRIEVAL_DOCUMENT")


@pytest.mark.asyncio
async def test_embed_texts_retry_on_failure():
    """Verify tenacity retry logic works when GenAI raises an error."""
    with patch("app.services.embeddings.client.aio.models.embed_content", new_callable=AsyncMock) as mock_embed_content:
        mock_response = AsyncMock()
        class MockEmbedding:
            def __init__(self, values):
                self.values = values
        mock_response.embeddings = [MockEmbedding([1.0, 0.0])]
        
        # First call fails, second succeeds
        mock_embed_content.side_effect = [
            Exception("API Error"),
            mock_response
        ]
        
        # Note: Depending on tenacity configuration, this might take a few seconds in tests.
        # We can mock asyncio.sleep to speed it up if it were slow, but it should be ok for a few retries.
        with patch("asyncio.sleep", new_callable=AsyncMock):
            result = await embed_texts(["Test"])
            
        assert len(result) == 1
        assert mock_embed_content.call_count == 2
