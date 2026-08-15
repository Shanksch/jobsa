"""
Pydantic Settings — environment-driven configuration.

All settings are loaded from environment variables (or .env file).
This is the single source of truth for backend configuration.
"""

import os

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

    # ─── Supabase ──────────────────────────────────────────
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_storage_bucket: str = "resumes"

    @property
    def supabase_configured(self) -> bool:
        """Check if Supabase credentials are provided."""
        return bool(self.supabase_url and self.supabase_anon_key)

    cors_origins: str = (
        "https://jobsa-web-dashboard.vercel.app,chrome-extension://,https://*.b4a.run"
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    # ─── LLM (via LiteLLM Router) ──────────────────────────
    autofill_primary_model: str = "gemini/gemini-3.5-flash-lite"
    autofill_fallback_model: str = "groq/openai/gpt-oss-20b"
    match_primary_model: str = "gemini/gemini-3.5-flash-lite"
    match_fallback_model: str = "groq/openai/gpt-oss-120b"
    groq_api_key: str = ""
    openai_api_key: str = ""
    openai_api_base: str = ""
    gemini_api_key: str = ""
    
    # ─── Embeddings & Chunking (Gemini) ─────────────────────
    embedding_model: str = "gemini-embedding-001"
    embedding_dimensions: int = 768
    chunking_model: str = "gemini-3.6-flash"

    # ─── Langfuse ──────────────────────────────────────────
    langfuse_public_key: str = ""
    langfuse_secret_key: str = ""
    langfuse_host: str = "https://cloud.langfuse.com"

    @property
    def langfuse_enabled(self) -> bool:
        return bool(self.langfuse_public_key and self.langfuse_secret_key)


    # ─── File Upload ───────────────────────────────────────
    max_upload_size_mb: int = 10

    @property
    def max_upload_size_bytes(self) -> int:
        return self.max_upload_size_mb * 1024 * 1024


# Singleton instance
settings = Settings()

# Propagate settings to environment variables for third-party libraries (LiteLLM, Supabase, etc.)

if settings.groq_api_key:
    os.environ["GROQ_API_KEY"] = settings.groq_api_key
if settings.openai_api_key:
    os.environ["OPENAI_API_KEY"] = settings.openai_api_key
if settings.openai_api_base:
    os.environ["OPENAI_API_BASE"] = settings.openai_api_base
if settings.supabase_url:
    os.environ["SUPABASE_URL"] = settings.supabase_url
if settings.supabase_anon_key:
    os.environ["SUPABASE_ANON_KEY"] = settings.supabase_anon_key
if settings.gemini_api_key:
    os.environ["GEMINI_API_KEY"] = settings.gemini_api_key
if settings.langfuse_public_key:
    os.environ["LANGFUSE_PUBLIC_KEY"] = settings.langfuse_public_key
if settings.langfuse_secret_key:
    os.environ["LANGFUSE_SECRET_KEY"] = settings.langfuse_secret_key
if settings.langfuse_host:
    os.environ["LANGFUSE_HOST"] = settings.langfuse_host
