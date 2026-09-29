from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import Column
from sqlalchemy.dialects.postgresql import JSON
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(UTC)


class AdminAction(SQLModel, table=True):
    """Audit log: one row per change an admin makes, written in the same transaction."""

    __tablename__ = "admin_actions"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    actor_id: UUID = Field(foreign_key="users.id", index=True, nullable=False)
    action: str = Field(max_length=40, index=True)
    target_type: str = Field(max_length=20)
    target_id: str | None = Field(default=None, max_length=64, index=True)
    details: dict[str, Any] = Field(default={}, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=utcnow, index=True)


class StoryImport(SQLModel, table=True):
    """One bulk JSON import. Stories created by it point back here so it can be undone."""

    __tablename__ = "imports"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    actor_id: UUID = Field(foreign_key="users.id", nullable=False)
    story_count: int = Field(default=0)
    scene_count: int = Field(default=0)
    created_at: datetime = Field(default_factory=utcnow)
