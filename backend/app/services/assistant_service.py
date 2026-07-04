"""
AI Assistant Service for BharatSim.

Provides an intelligent chat interface powered by OpenAI's API,
with context-aware responses about environmental simulations,
geospatial data, and climate analysis for India.
"""

import json
import logging

import httpx
from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.models import SimulationResult, SimulationRun

logger = logging.getLogger(__name__)

BHARATSIM_SYSTEM_PROMPT = """You are BharatSim AI Assistant, an expert in environmental \
science, climate analysis, and geospatial data for India. You help users understand \
simulation results, interpret environmental data, and provide insights about:

- Flood risk analysis and river monitoring across Indian districts
- Heatwave prediction and temperature trend analysis
- Crop yield forecasting using NDVI and satellite data
- Air quality index predictions and pollution patterns
- Population demographics and urbanization impacts
- District-level geospatial analysis

You have access to simulation results and environmental datasets covering Indian districts. \
Provide data-driven, actionable insights. When referencing specific metrics, cite the \
simulation or data source. Use clear, concise language suitable for policymakers, \
researchers, and disaster management professionals.

If simulation context is provided, analyze the results and highlight key findings, \
trends, and recommendations."""


async def _fetch_simulation_context(
    db: AsyncSession, simulation_id: int
) -> str:
    """
    Fetch simulation results to provide context for the AI assistant.

    Args:
        db: Async database session.
        simulation_id: ID of the simulation run to fetch context from.

    Returns:
        Formatted string with simulation context data.
    """
    try:
        # Fetch simulation run
        run_result = await db.execute(
            select(SimulationRun).where(SimulationRun.id == simulation_id)
        )
        simulation_run = run_result.scalar_one_or_none()

        if not simulation_run:
            return f"Simulation run {simulation_id} not found."

        # Fetch results
        results_query = await db.execute(
            select(SimulationResult).where(
                SimulationResult.simulation_run_id == simulation_id
            )
        )
        results = results_query.scalars().all()

        context_parts = [
            f"Simulation: {simulation_run.name} (ID: {simulation_run.id})",
            f"Type: {simulation_run.simulation_type}",
            f"Status: {simulation_run.status}",
            f"Parameters: {simulation_run.parameters}",
            f"Date Range: {simulation_run.date_range_start} to {simulation_run.date_range_end}",
            f"Results ({len(results)} records):",
        ]

        for r in results[:50]:  # Limit context to avoid token overflow
            context_parts.append(
                f"  - District {r.district_id}: {r.metric_name} = "
                f"{r.metric_value} {r.metric_unit or ''} "
                f"(confidence: {r.confidence}, severity: {r.severity_level})"
            )

        if len(results) > 50:
            context_parts.append(f"  ... and {len(results) - 50} more results")

        return "\n".join(context_parts)

    except Exception as e:
        logger.warning("Failed to fetch simulation context: %s", str(e))
        return f"Error fetching simulation context: {str(e)}"


async def chat(
    db: AsyncSession,
    message: str,
    context: dict | None = None,
) -> dict:
    """
    Process a chat message through the AI assistant.

    Builds context from simulation data if provided, then sends the
    conversation to OpenAI's API for a response.

    Args:
        db: Async database session.
        message: User's chat message.
        context: Optional context dict. May contain 'simulation_id' to
                 include simulation results in the conversation context.

    Returns:
        Dictionary with 'message' (AI response) and 'sources' (data sources used).

    Raises:
        HTTPException: On API errors or configuration issues.
    """
    if not settings.OPENAI_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="OpenAI API key not configured. Set OPENAI_API_KEY in environment.",
        )

    # Build messages list
    messages = [
        {"role": "system", "content": BHARATSIM_SYSTEM_PROMPT},
    ]

    sources = []

    # Add simulation context if provided
    if context and context.get("simulation_id"):
        simulation_id = context["simulation_id"]
        sim_context = await _fetch_simulation_context(db, simulation_id)
        messages.append({
            "role": "system",
            "content": f"Current simulation context:\n{sim_context}",
        })
        sources.append({
            "type": "simulation",
            "id": simulation_id,
            "description": f"Simulation run #{simulation_id} results",
        })

    # Add user message
    messages.append({"role": "user", "content": message})

    logger.info(
        "Processing chat message (context: %s): %s",
        "simulation" if sources else "none",
        message[:100],
    )

    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": getattr(settings, "OPENAI_MODEL", "gpt-4"),
                    "messages": messages,
                    "temperature": 0.7,
                    "max_tokens": 2000,
                },
            )

        if response.status_code != 200:
            logger.error(
                "OpenAI API error: status=%d, body=%s",
                response.status_code, response.text,
            )
            raise HTTPException(
                status_code=502,
                detail=f"AI service returned error: {response.status_code}",
            )

        response_data = response.json()
        ai_message = response_data["choices"][0]["message"]["content"]

        logger.info("Chat response generated successfully")

        return {
            "message": ai_message,
            "sources": sources,
        }

    except httpx.TimeoutException:
        logger.error("OpenAI API request timed out")
        raise HTTPException(
            status_code=504,
            detail="AI service request timed out. Please try again.",
        )
    except httpx.RequestError as e:
        logger.error("OpenAI API request failed: %s", str(e))
        raise HTTPException(
            status_code=502,
            detail="Failed to connect to AI service. Please try again later.",
        )
    except KeyError as e:
        logger.error("Unexpected API response format: %s", str(e))
        raise HTTPException(
            status_code=502,
            detail="Unexpected response from AI service.",
        )
