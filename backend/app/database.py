"""Async SQLAlchemy database engine, session, and dependency injection.

Provides the async engine, session factory, declarative base, and FastAPI
dependency for injecting database sessions into route handlers.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import declarative_base

from app.config import settings

# SQLite (the no-Docker demo/test mode) doesn't accept the Postgres pool
# tuning args, so only apply them on server-grade drivers.
if settings.DATABASE_URL.startswith("sqlite"):
    engine = create_async_engine(settings.DATABASE_URL, echo=settings.DEBUG)
else:
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG,
        pool_size=20,
        max_overflow=10,
        pool_pre_ping=True,
    )

async_session = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async database session.

    The session is automatically closed after the request completes.

    Yields:
        AsyncSession: An async SQLAlchemy session bound to the engine.
    """
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db() -> None:
    """Create all database tables from the declarative base metadata.

    Intended for development bootstrapping. In production, use Alembic
    migrations instead.
    """
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all, checkfirst=True)
