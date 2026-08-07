"""
FastAPI application factory.

Creates the app with middleware, CORS, and routers.
Uses lifespan context manager for startup/shutdown hooks.
"""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.autofill import router as autofill_router
from app.api.routes.health import router as health_router
from app.api.routes.match import router as match_router
from app.api.routes.resumes import router as resumes_router
from app.config import settings
from app.core.logging import setup_logging
from app.core.middleware import RequestIDMiddleware
from app.services.embeddings import start_embedding_keep_alive

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan — startup and shutdown hooks."""
    # ── Startup ──
    setup_logging(settings.log_level)
    
    start_embedding_keep_alive()
    
    logger.info(
        "application_startup",
        app_name=settings.app_name,
        version=settings.app_version,
        debug=settings.debug,
    )

    yield

    # ── Shutdown ──
    logger.info("application_shutdown")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        description="AI Job Application Copilot — backend API",
        docs_url="/docs" if settings.debug else None,
        redoc_url="/redoc" if settings.debug else None,
        lifespan=lifespan,
    )

    # ── Middleware (order matters: outermost first) ──
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_origin_regex="https://.*|http://localhost:.*|chrome-extension://.*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID"],
    )

    # ── Routers ──
    app.include_router(health_router)
    app.include_router(resumes_router, prefix="/api")
    app.include_router(autofill_router, prefix="/api")
    app.include_router(match_router, prefix="/api")

    return app


# The app instance used by uvicorn
app = create_app()
