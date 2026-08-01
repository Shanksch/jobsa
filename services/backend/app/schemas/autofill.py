"""
Pydantic schemas for the Autofill engine.

Handles the incoming form schema from the extension and the response
containing the generated answers.
"""

from pydantic import BaseModel, Field


class FormField(BaseModel):
    id: str
    name: str
    type: str
    label: str
    options: list[str] | None = None
    required: bool = False


class FormSchema(BaseModel):
    url: str
    fields: list[FormField]
    resume_id: str | None = None
    context: str | None = None


class AutofillResponse(BaseModel):
    answers: dict[str, str] = Field(
        description="A mapping of field IDs to their generated string answers."
    )


class JobMatchRequest(BaseModel):
    resume_id: str
    job_description: str


class CategoryScores(BaseModel):
    required_skills: int
    experience_seniority: int
    domain_relevance: int
    nice_to_have_skills: int
    education_certifications: int
    career_trajectory: int


class JobMatchResponse(BaseModel):
    overall_score: int
    verdict: str = Field(
        description="Exceptional Match | Strong Match | Moderate Match | Weak Match | Not Qualified"
    )
    category_scores: CategoryScores
    matched_requirements: list[str]
    missing_requirements: list[str]
    inferred_transferable_skills: list[str]
    red_flags: list[str]
    confidence: str = Field(description="High | Medium | Low")
    rationale: str
