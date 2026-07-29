"""
Pydantic Settings — environment-driven configuration.

All settings are loaded from environment variables (or .env file).
This is the single source of truth for backend configuration.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=["../../.env", "../.env", ".env"],
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ─── App ────────────────────────────────────────────────
    app_name: str = "JobSA Backend"
    app_version: str = "0.1.0"
    debug: bool = True
    log_level: str = "DEBUG"

    # ─── Database (Supabase PostgreSQL or local) ───────────
    database_url: str = "postgresql+asyncpg://jobsa:jobsa_dev@localhost:5432/jobsa"
    database_url_sync: str = "postgresql://jobsa:jobsa_dev@localhost:5432/jobsa"

    # ─── Supabase ──────────────────────────────────────────
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_storage_bucket: str = "resumes"

    @property
    def supabase_configured(self) -> bool:
        """Check if Supabase credentials are provided."""
        return bool(self.supabase_url and self.supabase_anon_key)

    # ─── CORS ──────────────────────────────────────────────
    cors_origins: str = "https://jobsa-web-dashboard.vercel.app,chrome-extension://"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    # ─── LLM (via LiteLLM — supports Groq, OpenAI, Ollama, etc.) ──
    llm_provider: str = "groq"
    llm_model: str = "llama-3.1-8b-instant"
    groq_api_key: str = ""
    openai_api_key: str = ""

    # Ollama fallback (for local dev without API keys)
    ollama_base_url: str = "http://localhost:11434"

    @property
    def litellm_model(self) -> str:
        """Build the LiteLLM model identifier string."""
        if self.llm_provider == "groq":
            return f"groq/{self.llm_model}"
        elif self.llm_provider == "openai":
            return self.llm_model  # OpenAI models don't need prefix
        elif self.llm_provider == "ollama":
            return f"ollama/{self.llm_model}"
        return f"{self.llm_provider}/{self.llm_model}"

    # ─── File Upload ───────────────────────────────────────
    max_upload_size_mb: int = 10

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024


# Singleton instance
settings = Settings()

# Propagate settings to environment variables for third-party libraries (LiteLLM, Supabase, etc.)
import os
if settings.groq_api_key:
    os.environ["GROQ_API_KEY"] = settings.groq_api_key
if settings.openai_api_key:
    os.environ["OPENAI_API_KEY"] = settings.openai_api_key
if settings.supabase_url:
    os.environ["SUPABASE_URL"] = settings.supabase_url
if settings.supabase_anon_key:
    os.environ["SUPABASE_ANON_KEY"] = settings.supabase_anon_key

