"""
Tests for the health check endpoint.

This is the Phase 0 verification test — proves the backend
can start and respond to requests correctly.
"""

import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app


@pytest.fixture
async def client():
    """Create an async test client."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.mark.asyncio
async def test_health_check_returns_200(client: AsyncClient):
    """GET /api/health should return 200 with healthy status."""
    response = await client.get("/api/health")

    assert response.status_code == 200

    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "0.1.0"
    assert "timestamp" in data


@pytest.mark.asyncio
async def test_health_check_has_request_id(client: AsyncClient):
    """Response should include an X-Request-ID header from middleware."""
    response = await client.get("/api/health")

    assert "x-request-id" in response.headers
    # Should be a valid UUID-like string
    assert len(response.headers["x-request-id"]) > 0


@pytest.mark.asyncio
async def test_health_check_cors_headers(client: AsyncClient):
    """OPTIONS preflight should return CORS headers."""
    response = await client.options(
        "/api/health",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert "access-control-allow-origin" in response.headers
