"""
Tests for resume parser service.
"""

from unittest.mock import AsyncMock, patch

import pytest

from app.services.resume_parser import resume_parser_service


@pytest.mark.asyncio
async def test_structure_resume_llm():
    """Verify that structure_resume correctly structures resume markdown text using LLM."""
    from app.services.resume_parser import EducationItem, ResumeSections, SkillItem

    mock_response = ResumeSections(
        contact=None,
        summary="Experienced software developer specialized in Python and cloud technologies.",
        skills=[
            SkillItem(
                name="Python",
                category="Programming Languages",
                proficiency="expert",
                years_experience=5.0,
            ),
            SkillItem(
                name="Docker", category="Tools", proficiency="intermediate", years_experience=2.0
            ),
        ],
        education=[
            EducationItem(
                institution="Stanford University",
                degree="M.S.",
                field_of_study="Computer Science",
                start_date="2020-09-01",
                end_date="2022-06-15",
                gpa=3.9,
                description=None,
                is_current=False,
            )
        ],
    )

    with patch("app.services.resume_parser.instructor.from_litellm") as mock_instructor:
        mock_client = AsyncMock()
        mock_client.chat.completions.create.return_value = mock_response
        mock_instructor.return_value = mock_client

        markdown_content = "This is raw markdown resume content."
        result = await resume_parser_service.structure_resume(markdown_content)

        assert (
            result["summary"]
            == "Experienced software developer specialized in Python and cloud technologies."
        )
        assert len(result["skills"]) == 2
        assert result["skills"][0]["name"] == "Python"
        assert result["education"][0]["institution"] == "Stanford University"
        mock_client.chat.completions.create.assert_called_once()
