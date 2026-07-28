"""
Pydantic schemas for the Autofill engine.

Handles the incoming form schema from the extension and the response
containing the generated answers.
"""

from typing import Any, List, Optional
from pydantic import BaseModel, Field


class FormField(BaseModel):
    id: str
    name: str
    type: str
    label: str
    options: Optional[List[str]] = None
    required: bool = False


class FormSchema(BaseModel):
    url: str
    fields: List[FormField]
    resume_id: Optional[str] = None
    context: Optional[str] = None


class AutofillResponse(BaseModel):
    answers: dict[str, str] = Field(
        description="A mapping of field IDs to their generated string answers."
    )
