"""
Resume Pydantic schemas — request/response validation.
"""

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ResumeUpdate(BaseModel):
    """Schema for updating resume metadata."""
    name: str | None = Field(None, min_length=1, max_length=200)
    is_primary: bool | None = None


class ResumeListItem(BaseModel):
    """Compact resume info for list views."""
    id: uuid.UUID
    name: str
    file_name: str
    file_size: int
    mime_type: str
    is_primary: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class ResumeResponse(BaseModel):
    """Full resume details including parsed content."""
    id: uuid.UUID
    profile_id: uuid.UUID
    name: str
    storage_path: str
    file_name: str
    file_size: int
    mime_type: str
    parsed_text: str | None = None
    parsed_markdown: str | None = None
    parsed_sections: dict | None = None
    is_primary: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
