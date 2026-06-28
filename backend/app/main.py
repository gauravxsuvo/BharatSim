"""BharatSim API – FastAPI application entry point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import districts, datasets, simulations
from app.routers.models import router as model_router
from app.routers.dashboard import router as dashboard_router
from app.routers.assistant import router as assistant_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle handler."""
    await init_db()
    yield


app = FastAPI(
    title="BharatSim API",
    description="AI-Powered Digital Twin of India",
    version="0.1.0",
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------
app.include_router(districts.router, prefix="/api/districts")
app.include_router(datasets.router, prefix="/api/datasets")
app.include_router(simulations.router, prefix="/api/simulations")
app.include_router(model_router, prefix="/api/models")
app.include_router(dashboard_router, prefix="/api/dashboard")
app.include_router(assistant_router, prefix="/api/assistant")


# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------
@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "version": "0.1.0"}
