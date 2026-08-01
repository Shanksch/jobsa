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

class JobMatchResponse(BaseModel):
    score: int = Field(description="Match score from 0 to 100")
    justification: str = Field(description="Brief justification for the score (2-3 sentences max)")
