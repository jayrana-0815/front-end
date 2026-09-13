"""SQLAlchemy persistence for WeatherGPT user profiles."""

from __future__ import annotations

import os
from datetime import datetime
from typing import Any
from uuid import UUID

import asyncpg
from sqlalchemy import DateTime, String, Text, func, select, text
from sqlalchemy.dialects.postgresql import UUID as PostgreSQLUUID
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class DatabaseUnavailableError(RuntimeError):
    """Raised when PostgreSQL is not configured or cannot be reached."""


class Base(DeclarativeBase):
    pass


class Farmer(Base):
    __tablename__ = "farmer"

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    crops_info: Mapped[str] = mapped_column(Text, nullable=False, default="")
    country: Mapped[str] = mapped_column(String(80), nullable=False, default="India")
    location: Mapped[str] = mapped_column(Text, nullable=False, default="")
    state: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    city: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    language: Mapped[str] = mapped_column(String(20), nullable=False, default="en")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


class Citizen(Base):
    __tablename__ = "citizen"

    id: Mapped[UUID] = mapped_column(PostgreSQLUUID(as_uuid=True), primary_key=True)
    name: Mapped[str] = mapped_column(Text, nullable=False)
    country: Mapped[str] = mapped_column(String(80), nullable=False, default="India")
    location: Mapped[str] = mapped_column(Text, nullable=False, default="")
    state: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    city: Mapped[str] = mapped_column(String(120), nullable=False, default="")
    language: Mapped[str] = mapped_column(String(20), nullable=False, default="en")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


engine: AsyncEngine | None = None
session_factory: async_sessionmaker[AsyncSession] | None = None


def database_url() -> str:
    value = os.getenv("DATABASE_URL", "").strip()
    if value.startswith("postgresql://"):
        return value.replace("postgresql://", "postgresql+asyncpg://", 1)
    if value.startswith("postgres://"):
        return value.replace("postgres://", "postgresql+asyncpg://", 1)
    return value


async def initialize_database() -> None:
    global engine, session_factory
    url = database_url()
    if not url:
        return

    try:
        engine = create_async_engine(url, pool_pre_ping=True)
        session_factory = async_sessionmaker(engine, expire_on_commit=False)
        async with engine.begin() as connection:
            await connection.run_sync(Base.metadata.create_all)
            await connection.execute(text("""
                DO $$
                DECLARE target_table_name TEXT;
                BEGIN
                    FOREACH target_table_name IN ARRAY ARRAY['farmer', 'citizen'] LOOP
                        IF EXISTS (
                            SELECT 1 FROM information_schema.columns AS c
                            WHERE c.table_schema = 'public' AND c.table_name = target_table_name
                              AND c.column_name = 'location' AND c.udt_name = 'jsonb'
                        ) THEN
                            EXECUTE format('ALTER TABLE %I RENAME COLUMN location TO location_data', target_table_name);
                        END IF;
                        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS country VARCHAR(80) NOT NULL DEFAULT ''India''', target_table_name);
                        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS location TEXT NOT NULL DEFAULT ''''', target_table_name);
                        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS state VARCHAR(120) NOT NULL DEFAULT ''''', target_table_name);
                        EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS city VARCHAR(120) NOT NULL DEFAULT ''''', target_table_name);
                        IF EXISTS (
                            SELECT 1 FROM information_schema.columns AS c
                            WHERE c.table_schema = 'public' AND c.table_name = target_table_name
                              AND c.column_name = 'location_data'
                        ) THEN
                            EXECUTE format(
                                'UPDATE %I SET country = COALESCE(NULLIF(location_data->>''country'', ''''), ''India''), location = COALESCE(location_data->>''village'', location_data->>''location'', ''''), state = COALESCE(location_data->>''state'', ''''), city = COALESCE(location_data->>''city'', '''') WHERE location_data IS NOT NULL',
                                target_table_name
                            );
                        END IF;
                    END LOOP;
                END $$;
            """))
    except (OSError, SQLAlchemyError, asyncpg.PostgresError) as exc:
        await close_database()
        print(f"PostgreSQL profile persistence is unavailable: {exc}")


async def close_database() -> None:
    global engine, session_factory
    if engine is not None:
        await engine.dispose()
    engine = None
    session_factory = None


def require_session_factory() -> async_sessionmaker[AsyncSession]:
    if session_factory is None:
        raise DatabaseUnavailableError("PostgreSQL is not configured")
    return session_factory


def database_is_connected() -> bool:
    return session_factory is not None


def profile_model(profile_type: str) -> type[Farmer] | type[Citizen]:
    if profile_type == "farmer":
        return Farmer
    if profile_type == "citizen":
        return Citizen
    raise ValueError("Profile type must be farmer or citizen")


def serialize_profile(record: Farmer | Citizen, profile_type: str) -> dict[str, Any]:
    profile = {
        "id": str(record.id),
        "type": profile_type,
        "name": record.name,
        "location": {
            "country": record.country or "India",
            "location": record.location or "",
            "state": record.state or "",
            "city": record.city or "",
        },
        "language": record.language,
        "updated_at": record.updated_at.isoformat(),
    }
    if isinstance(record, Farmer):
        profile["crops_info"] = record.crops_info
    return profile


async def get_profile(profile_type: str, profile_id: UUID) -> dict[str, Any] | None:
    model = profile_model(profile_type)
    factory = require_session_factory()
    try:
        async with factory() as session:
            result = await session.execute(select(model).where(model.id == profile_id))
            record = result.scalar_one_or_none()
    except SQLAlchemyError as exc:
        raise DatabaseUnavailableError("Unable to read profile from PostgreSQL") from exc
    return serialize_profile(record, profile_type) if record else None


async def save_profile(
    profile_type: str,
    profile_id: UUID,
    name: str,
    location: dict[str, Any],
    language: str,
    crops_info: str = "",
) -> dict[str, Any]:
    model = profile_model(profile_type)
    factory = require_session_factory()
    try:
        location_name = str(location.get("location") or location.get("village") or "")
        country = str(location.get("country") or "India")
        state = str(location.get("state") or "")
        city = str(location.get("city") or "")
        async with factory() as session:
            record = await session.get(model, profile_id)
            if record is None:
                record = model(
                    id=profile_id, name=name, country=country, location=location_name,
                    state=state, city=city, language=language,
                )
                if isinstance(record, Farmer):
                    record.crops_info = crops_info
                session.add(record)
            else:
                record.name = name
                record.country = country
                record.location = location_name
                record.state = state
                record.city = city
                record.language = language
                if isinstance(record, Farmer):
                    record.crops_info = crops_info
            await session.commit()
            await session.refresh(record)
    except SQLAlchemyError as exc:
        raise DatabaseUnavailableError("Unable to save profile to PostgreSQL") from exc
    return serialize_profile(record, profile_type)
