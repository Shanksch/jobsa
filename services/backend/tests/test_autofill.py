from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient


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
                "required": True,
            }
        ],
    }

    from app.services.rag_engine import LLMAutofillResponse, AnswerModel

    mock_response = LLMAutofillResponse(answers=[AnswerModel(field_id="first_name", value="John")])

    with (
        patch("app.services.rag_engine.client") as mock_client,
        patch("app.services.rag_engine.retrieve_for_form", new_callable=AsyncMock) as mock_retrieve,
    ):
        mock_chat_completion = AsyncMock()
        mock_chat_completion.return_value = mock_response
        mock_client.chat.completions.create = mock_chat_completion

        mock_retrieve.return_value = []
        response = await client.post("/api/autofill", json=form_schema)

    assert response.status_code == 200
    data = response.json()
    assert "answers" in data
    assert data["answers"]["first_name"] == "John"
