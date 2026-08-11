"""
Resume parsing service.

Extracts text/markdown from PDF/DOCX and structure-extracts
key details (Education, Experience, Skills, Projects, Summary) using an LLM.
"""

from dataclasses import dataclass
from pathlib import Path
from typing import Any

import instructor
import pymupdf4llm
import structlog
from docx import Document
from litellm import acompletion
from pydantic import BaseModel, Field
from langfuse import observe

from app.config import settings

logger = structlog.get_logger()


@dataclass
class ParsedResume:
    text: str
    markdown: str
    sections: dict


class SkillItem(BaseModel):
    name: str
    category: str
    proficiency: str
    years_experience: float | None = None


class EducationItem(BaseModel):
    institution: str
    degree: str
    field_of_study: str
    start_date: str | None = None
    end_date: str | None = None
    gpa: float | None = None
    description: str | None = None
    is_current: bool = False


class WorkExperienceItem(BaseModel):
    company: str
    title: str
    location: str | None = None
    start_date: str | None = None
    end_date: str | None = None
    description: str | None = None
    highlights: list[str] = Field(default_factory=list)
    technologies: list[str] = Field(default_factory=list)
    is_current: bool = False


class ProjectItem(BaseModel):
    name: str
    description: str
    url: str | None = None
    technologies: list[str] = Field(default_factory=list)
    highlights: list[str] = Field(default_factory=list)
    start_date: str | None = None
    end_date: str | None = None


class CertificationItem(BaseModel):
    name: str
    issuer: str
    issue_date: str | None = None
    expiry_date: str | None = None
    credential_id: str | None = None
    credential_url: str | None = None


class ContactInfo(BaseModel):
    full_name: str | None = None
    email: str | None = None
    phone: str | None = None
    location: str | None = None
    linkedin_url: str | None = None
    github_url: str | None = None
    portfolio_url: str | None = None


class ResumeSections(BaseModel):
    contact: ContactInfo | None = None
    summary: str
    skills: list[SkillItem] = Field(default_factory=list)
    education: list[EducationItem] = Field(default_factory=list)
    work_experience: list[WorkExperienceItem] = Field(default_factory=list)
    projects: list[ProjectItem] = Field(default_factory=list)
    certifications: list[CertificationItem] = Field(default_factory=list)


class ResumeParserService:
    """Service to extract and structure content from resumes using LLMs."""

    @observe(name="extract-pdf-text")
    def extract_text_from_pdf(self, file_path: str) -> tuple[str, str]:
        """Extract raw text and markdown from PDF using pymupdf4llm."""
        logger.info("extracting_text_pdf", file_path=file_path)
        try:
            # pymupdf4llm outputs markdown representation
            markdown_content = pymupdf4llm.to_markdown(file_path)
            # Simple text extraction can just be markdown for now, or text extracted by fitz
            # pymupdf4llm.to_markdown works well as both text and markdown context
            return markdown_content, markdown_content
        except Exception as e:
            logger.error("pdf_extraction_failed", error=str(e))
            raise RuntimeError(f"Failed to extract text from PDF: {e}")

    @observe(name="extract-docx-text")
    def extract_text_from_docx(self, file_path: str) -> tuple[str, str]:
        """Extract text from DOCX using python-docx."""
        logger.info("extracting_text_docx", file_path=file_path)
        try:
            doc = Document(file_path)
            full_text = []
            for para in doc.paragraphs:
                full_text.append(para.text)
            text_content = "\n".join(full_text)
            # Simple markdown approximation
            markdown_content = text_content
            return text_content, markdown_content
        except Exception as e:
            logger.error("docx_extraction_failed", error=str(e))
            raise RuntimeError(f"Failed to extract text from DOCX: {e}")

    @observe(name="structure-resume", as_type="generation")
    async def structure_resume(self, markdown_content: str) -> dict:
        """Use LiteLLM and instructor to extract structured fields from the markdown resume content."""
        logger.info(
            "structuring_resume_llm", provider=settings.llm_provider, model=settings.llm_model
        )

        # Truncate content to ~12000 characters (approx 3000 tokens) to ensure it fits safely inside Groq's strict 6000 TPM limits
        safe_markdown_content = markdown_content[:12000]
        
        prompt = f"""
You are an expert AI Resume Parser. Your job is to extract structured information from the markdown resume content below.
Extract the details accurately based on the provided schema.

Resume content to parse:
---
{safe_markdown_content}
---
"""

        try:
            if settings.llm_provider == "gemini":
                from google import genai
                from google.genai import types
                
                # Assume genai.Client() can pick up settings.gemini_api_key either from env or default
                client = genai.Client()
                
                response = await client.aio.models.generate_content(
                    model=settings.llm_model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=ResumeSections,
                        temperature=0.0,
                    ),
                )
                
                return ResumeSections.model_validate_json(response.text).model_dump()
            
            # Fallback for Groq/OpenAI using Instructor + LiteLLM
            kwargs: dict[str, Any] = {}
            if settings.llm_provider == "groq" and settings.groq_api_key:
                kwargs["api_key"] = settings.groq_api_key
            elif settings.llm_provider == "openai" and settings.openai_api_key:
                kwargs["api_key"] = settings.openai_api_key

            # Create an async instructor client using litellm's acompletion
            # Using Mode.JSON is much more reliable for complex nested schemas on Groq/Llama
            client = instructor.from_litellm(acompletion, mode=instructor.Mode.JSON)

            response_model = await client.chat.completions.create(  # type: ignore[misc]
                model=settings.litellm_model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a precise extraction engine. You must output a JSON object matching the requested schema. Return ONLY valid JSON.",
                    },
                    {"role": "user", "content": prompt},
                ],
                response_model=ResumeSections,
                temperature=0.0,
                max_tokens=2000 if "groq" in settings.llm_provider else 8192,
                **kwargs,
            )

            # Return as dictionary
            return response_model.model_dump()
        except Exception as e:
            logger.error("llm_structuring_failed", error=str(e))
            raise e

    @observe(name="parse-resume")
    async def parse_resume(self, file_path: str) -> ParsedResume:
        """Parse resume file (PDF or DOCX) to extract raw text, markdown, and structured sections."""
        ext = Path(file_path).suffix.lower()
        if ext == ".pdf":
            text, markdown = self.extract_text_from_pdf(file_path)
        elif ext in (".docx", ".doc"):
            text, markdown = self.extract_text_from_docx(file_path)
        else:
            raise ValueError(f"Unsupported file format: {ext}")

        structured_sections = await self.structure_resume(markdown)

        logger.debug(
            "resume_text_extracted",
            markdown_length=len(markdown),
            preview=markdown[:200],
        )

        return ParsedResume(text=text, markdown=markdown, sections=structured_sections)


resume_parser_service = ResumeParserService()
