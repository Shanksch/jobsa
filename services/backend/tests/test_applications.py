"""
Tests for applications API endpoints.
"""

import pytest
from httpx import AsyncClient
from app.models.profile import UserProfile


@pytest.mark.asyncio
async def test_applications_lifecycle_and_stats(client: AsyncClient, test_profile: UserProfile):
    """Test full applications creation, list, update, and statistics lifecycle."""
    # 1. Create a draft application
    payload_draft = {
        "company": "Google",
        "role": "AI Engineer",
        "posting_url": "https://careers.google.com/jobs/1",
        "ats_platform": "greenhouse",
        "status": "draft",
        "notes": "Need to tailor resume."
    }
    response_draft = await client.post("/api/applications", json=payload_draft)
    assert response_draft.status_code == 201
    draft_data = response_draft.json()
    assert draft_data["company"] == "Google"
    assert draft_data["status"] == "draft"
    draft_id = draft_data["id"]

    # 2. Create an applied application
    payload_applied = {
        "company": "Meta",
        "role": "Production Engineer",
        "posting_url": "https://careers.meta.com/jobs/2",
        "ats_platform": "lever",
        "status": "applied",
        "match_score": 0.85,
        "notes": "Submitted with primary resume."
    }
    response_applied = await client.post("/api/applications", json=payload_applied)
    assert response_applied.status_code == 201
    applied_data = response_applied.json()
    assert applied_data["company"] == "Meta"
    assert applied_data["status"] == "applied"
    assert applied_data["match_score"] == 0.85

    # 3. Check statistics
    stats_response = await client.get("/api/applications/stats")
    assert stats_response.status_code == 200
    stats = stats_response.json()
    assert stats["total"] == 2
    assert stats["by_status"]["draft"] == 1
    assert stats["by_status"]["applied"] == 1
    assert stats["this_week"] == 2

    # 4. List applications with search
    list_search = await client.get("/api/applications?search=Meta")
    assert list_search.status_code == 200
    assert len(list_search.json()) == 1
    assert list_search.json()[0]["company"] == "Meta"

    # 5. List applications with status filter
    list_filter = await client.get("/api/applications?status=draft")
    assert list_filter.status_code == 200
    assert len(list_filter.json()) == 1
    assert list_filter.json()[0]["company"] == "Google"

    # 6. Update status (PATCH)
    update_payload = {"status": "interview"}
    update_response = await client.patch(f"/api/applications/{draft_id}", json=update_payload)
    assert update_response.status_code == 200
    assert update_response.json()["status"] == "interview"

    # 7. Check updated stats
    stats_updated = (await client.get("/api/applications/stats")).json()
    assert stats_updated["by_status"].get("draft", 0) == 0
    assert stats_updated["by_status"]["interview"] == 1
    # Interview rate = 1 interview / 2 non-draft apps (since both are non-draft now) = 50.0%
    assert stats_updated["interview_rate"] == 50.0

    # 8. Delete application
    delete_response = await client.delete(f"/api/applications/{draft_id}")
    assert delete_response.status_code == 204
