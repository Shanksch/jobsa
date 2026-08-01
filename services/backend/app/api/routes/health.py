"""
Health check endpoint.

The primary round-trip proof for Phase 0:
  Extension popup → GET /api/health → this handler → JSON response
  Dashboard       → GET /api/health → this handler → JSON response
"""

from datetime import UTC, datetime

from fastapi import APIRouter
from pydantic import BaseModel

from app.config import settings

router = APIRouter(prefix="/api", tags=["health"])


class HealthResponse(BaseModel):
    """Health check response schema."""

    status: str = "healthy"
    version: str
    timestamp: str


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """
    Returns the current health status of the backend.

    This is the simplest possible endpoint — no database, no Redis,
    no external dependencies. If this responds, the backend is alive.
    """
    return HealthResponse(
        status="healthy",
        version=settings.app_version,
        timestamp=datetime.now(UTC).isoformat(),
    )
