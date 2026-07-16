import json
import pytest
from httpx import AsyncClient
from unittest.mock import patch

from app.models.profile import UserProfile


@pytest.mark.asyncio
async def test_autofill_endpoint(client: AsyncClient, test_profile: UserProfile):
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

    mock_llm_response = {
        "answers": {
            "first_name": "John"
        }
    }

    class MockMessage:
        content = json.dumps(mock_llm_response)

    class MockChoice:
        message = MockMessage()

    class MockResponse:
        choices = [MockChoice()]

    with patch("app.services.rag_engine.acompletion", return_value=MockResponse()):
        response = await client.post("/api/autofill", json=form_schema)

    assert response.status_code == 200
    data = response.json()
    assert "answers" in data
    assert data["answers"]["first_name"] == "John"
