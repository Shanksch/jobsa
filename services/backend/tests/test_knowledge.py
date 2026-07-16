"""
Tests for career knowledge base API endpoints.
"""

import pytest
from httpx import AsyncClient
from app.models.profile import UserProfile


@pytest.mark.asyncio
async def test_education_crud(client: AsyncClient, test_profile: UserProfile):
    """Test full CRUD lifecycle for Education knowledge entries."""
    # 1. Create
    payload = {
        "institution": "Stanford University",
        "degree": "M.S.",
        "field_of_study": "Computer Science",
        "start_date": "2020-09-01",
        "end_date": "2022-06-15",
        "gpa": 3.9,
        "description": "Specialized in Artificial Intelligence.",
        "is_current": False
    }
    response = await client.post("/api/knowledge/education", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["institution"] == "Stanford University"
    assert data["degree"] == "M.S."
    entry_id = data["id"]

    # 2. List
    list_response = await client.get("/api/knowledge/education")
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1
    assert list_response.json()[0]["id"] == entry_id

    # 3. Update (PATCH)
    update_payload = {
        "institution": "Stanford University (Modified)",
        "gpa": 3.95
    }
    update_response = await client.patch(f"/api/knowledge/education/{entry_id}", json=update_payload)
    assert update_response.status_code == 200
    assert update_response.json()["institution"] == "Stanford University (Modified)"
    assert update_response.json()["gpa"] == 3.95

    # 4. Delete
    delete_response = await client.delete(f"/api/knowledge/education/{entry_id}")
    assert delete_response.status_code == 204

    # 5. List again (should be empty)
    list_response_final = await client.get("/api/knowledge/education")
    assert list_response_final.status_code == 200
    assert len(list_response_final.json()) == 0


@pytest.mark.asyncio
async def test_skills_crud(client: AsyncClient, test_profile: UserProfile):
    """Test full CRUD lifecycle for Skills knowledge entries."""
    # 1. Create
    payload = {
        "name": "React",
        "category": "Frontend Frameworks",
        "proficiency": "expert",
        "years_experience": 5.0
    }
    response = await client.post("/api/knowledge/skills", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "React"
    assert data["proficiency"] == "expert"
    entry_id = data["id"]

    # 2. List
    list_response = await client.get("/api/knowledge/skills")
    assert list_response.status_code == 200
    assert len(list_response.json()) == 1

    # 3. Delete
    delete_response = await client.delete(f"/api/knowledge/skills/{entry_id}")
    assert delete_response.status_code == 204
