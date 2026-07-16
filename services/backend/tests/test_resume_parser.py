"""
Tests for resume parser service.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from app.services.resume_parser import resume_parser_service


@pytest.mark.asyncio
async def test_structure_resume_llm():
    """Verify that structure_resume correctly structures resume markdown text using LLM."""
    mock_response = MagicMock()
    mock_choice = MagicMock()
    mock_message = MagicMock()
    mock_message.content = """
    {
      "summary": "Experienced software developer specialized in Python and cloud technologies.",
      "skills": [
        {"name": "Python", "category": "Programming Languages", "proficiency": "expert", "years_experience": 5.0},
        {"name": "Docker", "category": "Tools", "proficiency": "intermediate", "years_experience": 2.0}
      ],
      "education": [
        {
          "institution": "Stanford University",
          "degree": "M.S.",
          "field_of_study": "Computer Science",
          "start_date": "2020-09-01",
          "end_date": "2022-06-15",
          "gpa": 3.9,
          "description": null,
          "is_current": false
        }
      ],
      "work_experience": [],
      "projects": [],
      "certifications": []
    }
    """
    mock_choice.message = mock_message
    mock_response.choices = [mock_choice]

    with patch("app.services.resume_parser.completion", new_callable=AsyncMock) as mock_completion:
        mock_completion.return_value = mock_response

        markdown_content = "This is raw markdown resume content."
        result = await resume_parser_service.structure_resume(markdown_content)

        assert result["summary"] == "Experienced software developer specialized in Python and cloud technologies."
        assert len(result["skills"]) == 2
        assert result["skills"][0]["name"] == "Python"
        assert result["education"][0]["institution"] == "Stanford University"
        mock_completion.assert_called_once()
