from datetime import date, datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, field_validator

from app.models.story import StoryStatus
from app.schemas.story import ChoiceRead, SceneRead


class Page[T](BaseModel):
    items: list[T]
    total: int
    page: int
    page_size: int


class Issue(BaseModel):
    level: Literal["error", "warning"]
    message: str


# ── Overview ─────────────────────────────────────────────────────────────────


class Metric(BaseModel):
    value: int
    previous: int | None = None  # same-length period before, for the change indicator


class OverviewCards(BaseModel):
    users: int
    writers: int
    admins: int
    suspended: int
    new_users_7d: Metric
    new_users_30d: Metric
    published: int
    drafts: int
    archived: int
    originals: int
    featured: int
    scenes: int
    choices: int


class GrowthPoint(BaseModel):
    date: date
    signups: int
    published: int


class Funnel(BaseModel):
    signed_up: int
    became_writer: int
    created_story: int
    published_story: int


class TopWriter(BaseModel):
    id: UUID
    handle: str | None
    pen_name: str | None
    avatar_tone: str
    published: int
    total: int


class CountItem(BaseModel):
    name: str
    count: int


class RecentUser(BaseModel):
    id: UUID
    email: str
    handle: str | None
    pen_name: str | None
    is_writer: bool
    created_at: datetime


class RecentStory(BaseModel):
    id: UUID
    title: str
    author_name: str | None
    is_official: bool
    published_at: datetime | None


class AuditEntry(BaseModel):
    id: UUID
    actor_id: UUID
    actor_email: str | None = None
    action: str
    target_type: str
    target_id: str | None
    details: dict[str, Any] = {}
    created_at: datetime

    @field_validator("details", mode="before")
    @classmethod
    def _none_to_empty(cls, v: dict | None) -> dict:
        return v or {}


class Overview(BaseModel):
    cards: OverviewCards
    growth: list[GrowthPoint]
    funnel: Funnel
    top_writers: list[TopWriter]
    genres: list[CountItem]
    moods: list[CountItem]
    recent_users: list[RecentUser]
    recent_stories: list[RecentStory]
    recent_actions: list[AuditEntry]


class HealthRow(BaseModel):
    id: UUID
    title: str
    author_name: str | None
    is_official: bool
    scene_count: int
    issues: list[Issue]


class HealthReport(BaseModel):
    checked: int
    with_issues: int
    stories: list[HealthRow]


# ── Users ────────────────────────────────────────────────────────────────────


class AdminUserRow(BaseModel):
    id: UUID
    email: str
    handle: str | None
    pen_name: str | None
    avatar_tone: str
    is_active: bool
    is_writer: bool
    admin_role: str | None
    story_count: int = 0
    published_count: int = 0
    created_at: datetime
    writer_since: datetime | None


class AdminUserUpdate(BaseModel):
    is_active: bool | None = None
    is_writer: bool | None = None


# ── Stories ──────────────────────────────────────────────────────────────────


class AdminStoryRow(BaseModel):
    id: UUID
    title: str
    status: StoryStatus
    author_id: UUID
    author_name: str | None
    author_handle: str | None
    author_tone: str | None
    is_official: bool
    is_featured: bool
    featured_rank: int | None
    genres: list[str] = []
    content_rating: str | None
    scene_count: int = 0
    import_id: UUID | None
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None

    @field_validator("genres", mode="before")
    @classmethod
    def _none_to_empty(cls, v: list | None) -> list:
        return v or []


class AdminStoryDetail(AdminStoryRow):
    description: str
    moods: list[str] = []
    tags: list[str] = []
    words: int = 0
    choice_count: int = 0
    issues: list[Issue] = []
    scenes: list[SceneRead] = []
    choices: list[ChoiceRead] = []

    @field_validator("moods", "tags", mode="before")
    @classmethod
    def _none_to_empty_list(cls, v: list | None) -> list:
        return v or []


class AdminUserDetail(AdminUserRow):
    bio: str | None
    tagline: str | None
    location: str | None
    stories: list[AdminStoryRow] = []


class AdminStoryUpdate(BaseModel):
    status: StoryStatus | None = None
    is_featured: bool | None = None
    featured_rank: int | None = None


# ── Imports ──────────────────────────────────────────────────────────────────


class ImportRow(BaseModel):
    id: UUID
    actor_id: UUID
    actor_email: str | None
    story_count: int
    scene_count: int
    remaining: int  # stories from this import that still exist
    published: int
    created_at: datetime
