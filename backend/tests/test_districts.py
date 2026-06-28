"""Tests for district and health endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(client: AsyncClient):
    """GET /api/health should return 200 with healthy status."""
    response = await client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "0.1.0"


@pytest.mark.asyncio
async def test_list_districts(client: AsyncClient):
    """GET /api/districts should return 200 with a list of districts."""
    response = await client.get("/api/districts")
    assert response.status_code == 200
    data = response.json()
    assert "districts" in data or isinstance(data, list)
