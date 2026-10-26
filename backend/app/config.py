"""Application settings, read from environment variables and backend/.env."""

from functools import lru_cache
from pathlib import Path

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict

ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=ENV_FILE, env_file_encoding="utf-8", extra="ignore")

    # Local MongoDB or an Atlas "mongodb+srv://..." URI. Credentials belong only in .env.
    mongodb_uri: SecretStr = SecretStr("mongodb://localhost:27017")
    mongodb_database: str = "bridgetalk"
    mongodb_timeout_ms: int = 3000

    gemini_api_key: SecretStr = SecretStr("")
    gemini_model: str = "gemini-3.5-flash"
    # Comma-separated models tried in order when the primary one is overloaded or unavailable.
    gemini_fallback_models: str = "gemini-3.8-flash,gemini-flash-latest,gemini-3.5-flash-lite"

    frontend_origin: str = "http://localhost:3000"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
