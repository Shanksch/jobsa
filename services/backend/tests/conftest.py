"""
Shared Pytest fixtures for backend testing.

Sets up SQLite or PostgreSQL memory-equivalent async session, Mock LLM context,
and provides standard user profile fixtures.
"""

import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.main import app
from app.core.database import get_db
from app.models.base import Base
from app.models.profile import UserProfile
from app.api.routes.profile import DEFAULT_EMAIL, DEFAULT_NAME

# Use SQLite memory database for testing (easy, fast, self-contained)
TEST_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_test_db():
    """Create all tables in the test database once per session."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    async with engine.begin() as conn:
        # SQLite doesn't natively support postgresql JSONB or UUID directly,
        # but SQLAlchemy mapping translates sa.UUID and JSONB to SQLite equivalent values nicely.
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest_asyncio.fixture
async def db_session() -> AsyncSession:
    """Provide a transactional DB session for individual tests."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    session_factory = async_sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with session_factory() as session:
        # Start transaction
        yield session
        await session.rollback()
    await engine.dispose()


@pytest_asyncio.fixture
async def client(db_session: AsyncSession):
    """Override standard get_db dependency with test database session."""
    async def override_get_db():
        yield db_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def test_profile(db_session: AsyncSession) -> UserProfile:
    """Create a default user profile in the database."""
    profile = UserProfile(
        email=DEFAULT_EMAIL,
        full_name=DEFAULT_NAME,
        summary="Professional software engineer",
        preferred_locations=["Remote", "New York"],
        languages=[{"language": "English", "proficiency": "Native"}],
    )
    db_session.add(profile)
    await db_session.commit()
    await db_session.refresh(profile)
    return profile
