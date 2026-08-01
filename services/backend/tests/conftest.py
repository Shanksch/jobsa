"""
Shared Pytest fixtures for backend testing.

Sets up mocked dependencies (like get_current_user) for testing endpoints
without hitting Supabase authentication.
"""

import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.core.auth import get_current_user
from app.main import app

DEFAULT_EMAIL = "test_user@example.com"
DEFAULT_NAME = "Test User"
TEST_PROFILE_ID = "00000000-0000-0000-0000-000000000000"

@pytest_asyncio.fixture
async def test_profile() -> dict:
    """Provide a mock profile dictionary."""
    return {
        "id": TEST_PROFILE_ID,
        "email": DEFAULT_EMAIL,
        "full_name": DEFAULT_NAME,
        "summary": "Professional software engineer",
        "preferred_locations": ["Remote", "New York"],
        "languages": [{"language": "English", "proficiency": "Native"}],
    }

@pytest_asyncio.fixture
async def client(test_profile: dict):
    """Override get_current_user dependency and provide test client."""
    async def override_get_current_user():
        return test_profile

    app.dependency_overrides[get_current_user] = override_get_current_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
