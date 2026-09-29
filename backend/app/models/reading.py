from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, ForeignKey, Index, UniqueConstraint
from sqlalchemy import Uuid as SAUuid
from sqlalchemy.dialects.postgresql import JSON
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(UTC)


class ReadingProgress(SQLModel, table=True):
    """One row per reader per story. Ending detection happens server-side, in the router."""

    __tablename__ = "reading_progress"
    __table_args__ = (
        UniqueConstraint("user_id", "story_id", name="uq_reading_progress_user_story"),
        Index("ix_reading_progress_user_last_read", "user_id", "last_read_at"),
    )

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    user_id: UUID = Field(
        sa_column=Column(SAUuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    )
    story_id: UUID = Field(
        sa_column=Column(
            SAUuid, ForeignKey("stories.id", ondelete="CASCADE"), nullable=False, index=True
        )
    )
    # Nullable: the writer may delete the scene, and "start over" clears it.
    current_scene_id: UUID | None = Field(default=None)
    history: list[str] = Field(default=[], sa_column=Column(JSON))
    scenes_seen: list[str] = Field(default=[], sa_column=Column(JSON))
    endings_found: list[str] = Field(default=[], sa_column=Column(JSON))
    runs_finished: int = Field(default=0)
    # True while the current run sits on an ending ("finished" vs "reading again").
    run_finished: bool = Field(default=False)
    # False once the current run skips a real choice (e.g. a hand-made request); endings
    # reached on such a run aren't credited. A fresh run from the start resets it.
    run_verified: bool = Field(default=True)
    started_at: datetime = Field(default_factory=utcnow)
    last_read_at: datetime = Field(default_factory=utcnow)
    first_finished_at: datetime | None = Field(default=None)


class SavedStory(SQLModel, table=True):
    """The Read later list. Separate from progress so saving never touches reading state."""

    __tablename__ = "saved_stories"

    user_id: UUID = Field(
        sa_column=Column(SAUuid, ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    )
    story_id: UUID = Field(
        sa_column=Column(
            SAUuid, ForeignKey("stories.id", ondelete="CASCADE"), primary_key=True, index=True
        )
    )
    created_at: datetime = Field(default_factory=utcnow)
