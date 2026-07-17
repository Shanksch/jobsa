import json
import pytest
from httpx import AsyncClient
from unittest.mock import patch, AsyncMock


@pytest.mark.asyncio
async def test_autofill_endpoint(client: AsyncClient, test_profile: dict):
    """Test the autofill endpoint with a mocked LLM response."""
    
    form_schema = {
        "url": "https://example.com/apply",
        "fields": [
            {
                "id": "first_name",
                "name": "firstName",
                "type": "text",
                "label": "First Name",
                "required": True
            }
        ]
    }

    from app.schemas.autofill import AutofillResponse

    mock_response = AutofillResponse(answers={"first_name": "John"})

    with patch("app.services.rag_engine.instructor.from_litellm") as mock_instructor, \
         patch("app.services.rag_engine.retrieve_for_form", new_callable=AsyncMock) as mock_retrieve:
        mock_client = AsyncMock()
        mock_client.chat.completions.create.return_value = mock_response
        mock_instructor.return_value = mock_client
        
        mock_retrieve.return_value = []
        response = await client.post("/api/autofill", json=form_schema)

    assert response.status_code == 200
    data = response.json()
    assert "answers" in data
    assert data["answers"]["first_name"] == "John"
