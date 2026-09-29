from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field

from app.schemas.story import PublicStoryRead

ReadingStatus = Literal["in_progress", "reading_again", "finished", "all_endings"]

MAX_HISTORY = 500


class ProgressUpdate(BaseModel):
    scene_id: UUID
    history: list[UUID] = Field(default=[], max_length=MAX_HISTORY)


class ProgressRead(BaseModel):
    story_id: UUID
    status: ReadingStatus
    current_scene_id: UUID | None
    history: list[UUID]
    scenes_seen: int
    scenes_total: int
    endings_found: list[UUID]
    endings_total: int
    runs_finished: int
    started_at: datetime
    last_read_at: datetime
    first_finished_at: datetime | None


class LibraryEntry(BaseModel):
    status: ReadingStatus | None = None  # None: saved but never opened
    endings_found: int = 0
    endings_total: int = 0
    saved: bool = False
    last_read_at: datetime | None = None


class ReadingListItem(BaseModel):
    story: PublicStoryRead
    entry: LibraryEntry
    saved_at: datetime | None = None


# ── Stats: one shape for every scope ─────────────────────────────────────────


class ActivityPoint(BaseModel):
    date: date
    started: int
    finished: int


class NamedCount(BaseModel):
    id: str | None = None
    name: str
    count: int


class ReadingStats(BaseModel):
    scope: Literal["user", "story", "platform"]
    readers: int = 0
    started: int = 0
    in_progress: int = 0
    finished: int = 0
    completed_all_endings: int = 0
    saved: int = 0
    completion_rate: float | None = None
    endings_found: int = 0
    endings_total: int | None = None
    scenes_read: int = 0
    words_read: int | None = None
    last_read_at: datetime | None = None
    activity: list[ActivityPoint] = []
    top_genres: list[NamedCount] = []
    top_stories: list[NamedCount] = []
    ending_breakdown: list[NamedCount] = []
