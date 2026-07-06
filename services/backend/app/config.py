"""
Pydantic Settings — environment-driven configuration.

All settings are loaded from environment variables (or .env file).
This is the single source of truth for backend configuration.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ─── App ────────────────────────────────────────────────
    app_name: str = "JobSA Backend"
    app_version: str = "0.1.0"
    debug: bool = True
    log_level: str = "DEBUG"

    # ─── Database ───────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://jobsa:jobsa_dev@localhost:5432/jobsa"
    database_url_sync: str = "postgresql://jobsa:jobsa_dev@localhost:5432/jobsa"

    # ─── Redis ──────────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"

    # ─── Qdrant ─────────────────────────────────────────────
    qdrant_url: str = "http://localhost:6333"

    # ─── CORS ───────────────────────────────────────────────
    cors_origins: str = "http://localhost:5173,http://localhost:5174,chrome-extension://"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    # ─── LLM ────────────────────────────────────────────────
    llm_provider: str = "ollama"
    llm_model: str = "llama3.1:8b"
    llm_base_url: str = "http://localhost:11434"

    # ─── Embeddings ─────────────────────────────────────────
    embedding_provider: str = "ollama"
    embedding_model: str = "nomic-embed-text"
    embedding_base_url: str = "http://localhost:11434"


# Singleton instance
settings = Settings()
