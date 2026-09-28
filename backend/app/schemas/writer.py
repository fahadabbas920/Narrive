from datetime import datetime

from pydantic import BaseModel, field_validator

from app.schemas.auth import SocialLink
from app.schemas.story import PublicStoryRead


class WriterStats(BaseModel):
    stories: int
    scenes: int
    choices: int


class PublicWriter(BaseModel):
    handle: str
    pen_name: str
    tagline: str | None = None
    bio: str | None = None
    genres: list[str] = []
    location: str | None = None
    website: str | None = None
    social_links: list[SocialLink] = []
    avatar_tone: str = "lavender"
    cover_tone: str = "lavender"
    writer_since: datetime | None = None
    stats: WriterStats
    stories: list[PublicStoryRead] = []

    @field_validator("genres", "social_links", mode="before")
    @classmethod
    def _none_to_empty_list(cls, v: list | None) -> list:
        return v or []
