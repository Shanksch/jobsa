"""
Tests for profile API endpoints.
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.profile import UserProfile
from app.api.routes.profile import DEFAULT_EMAIL, DEFAULT_NAME


@pytest.mark.asyncio
async def test_get_profile_auto_creates_default(client: AsyncClient):
    """GET /api/profile should auto-create a default profile if none exists."""
    response = await client.get("/api/profile")
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == DEFAULT_EMAIL
    assert data["full_name"] == DEFAULT_NAME
    assert "id" in data


@pytest.mark.asyncio
async def test_create_profile_already_exists(client: AsyncClient, test_profile: UserProfile):
    """POST /api/profile should fail with 400 if a profile with the same email already exists."""
    payload = {
        "email": DEFAULT_EMAIL,
        "full_name": "Another User",
    }
    response = await client.post("/api/profile", json=payload)
    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]


@pytest.mark.asyncio
async def test_patch_profile(client: AsyncClient, test_profile: UserProfile):
    """PATCH /api/profile should update specified profile fields."""
    payload = {
        "full_name": "Updated Name",
        "phone": "+1234567890",
        "summary": "Updated summary description.",
    }
    response = await client.patch("/api/profile", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Updated Name"
    assert data["phone"] == "+1234567890"
    assert data["summary"] == "Updated summary description."
    # Email should be unchanged
    assert data["email"] == DEFAULT_EMAIL


@pytest.mark.asyncio
async def test_delete_profile(client: AsyncClient, test_profile: UserProfile):
    """DELETE /api/profile should delete the profile and return 204."""
    response = await client.delete("/api/profile")
    assert response.status_code == 204

    # Fetching profile again should create a fresh default one
    response_get = await client.get("/api/profile")
    assert response_get.status_code == 200
    assert response_get.json()["full_name"] == DEFAULT_NAME
