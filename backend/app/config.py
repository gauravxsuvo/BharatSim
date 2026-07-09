"""Application configuration using pydantic-settings.

Loads settings from environment variables and .env file.
All configuration values can be overridden via environment variables.
"""

import json

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings with environment variable support.

    Attributes:
        DATABASE_URL: PostgreSQL connection string using asyncpg driver.
        REDIS_URL: Redis connection string for Celery task queue.
        MAPBOX_TOKEN: Mapbox API token for map tile rendering.
        OPENAI_API_KEY: OpenAI API key for the AI assistant.
        OPENAI_MODEL: OpenAI model identifier for chat completions.
        ML_MODELS_DIR: Directory path for storing serialized ML model files.
        CORS_ORIGINS: List of allowed CORS origins for the frontend.
        DEBUG: Enable debug mode with verbose logging.
    """

    DATABASE_URL: str = (
        "postgresql+asyncpg://bharatsim:bharatsim@localhost:5432/bharatsim"
    )
    REDIS_URL: str = "redis://localhost:6379/0"
    MAPBOX_TOKEN: str = ""
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o-mini"
    ML_MODELS_DIR: str = "./ml_models"
    # Raw string, not list[str] — Render/most dashboards store env vars as
    # plain text, and pydantic-settings would hard-fail parsing a non-JSON
    # value for a list field. Accepts either a JSON array (legacy/documented
    # format) or a comma-separated string; see cors_origins_list below.
    CORS_ORIGINS: str = "http://localhost:3000,http://127.0.0.1:3000"
    DEBUG: bool = True

    # --- Live data sources (optional) ---------------------------------------
    # Leave blank to run entirely on the bundled sample datasets. Provide a
    # key (or set USE_LIVE_DATA=true for the keyless Open-Meteo provider) and
    # the seed pulls live observations instead of the CSVs.
    OPENWEATHER_API_KEY: str = ""
    USE_LIVE_DATA: bool = False

    @property
    def live_weather_enabled(self) -> bool:
        """True when a live weather source (keyed or keyless) is configured."""
        return bool(self.OPENWEATHER_API_KEY) or self.USE_LIVE_DATA

    @property
    def cors_origins_list(self) -> list[str]:
        """Parsed CORS_ORIGINS as a list, tolerant of JSON-array or CSV input."""
        raw = self.CORS_ORIGINS.strip()
        if not raw:
            return []
        if raw.startswith("["):
            try:
                origins = json.loads(raw)
            except json.JSONDecodeError:
                origins = [raw]
        else:
            origins = raw.split(",")
        return [origin.strip().rstrip("/") for origin in origins if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
