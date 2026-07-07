"""Application configuration using pydantic-settings.

Loads settings from environment variables and .env file.
All configuration values can be overridden via environment variables.
"""

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
    CORS_ORIGINS: list[str] = ["http://localhost:3000"]
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

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
