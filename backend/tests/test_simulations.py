"""Tests for simulation endpoints."""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_list_simulations(client: AsyncClient):
    """GET /api/simulations should return 200."""
    response = await client.get("/api/simulations")
    assert response.status_code == 200
