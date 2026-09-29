from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.core.handles import validate_handle
from app.core.links import clean_social_links, clean_url
from app.core.taxonomy import MAX_BIO_LENGTH, MAX_WRITER_GENRES, PROFILE_TONES, clean_genres


class UserCreate(BaseModel):
    email: EmailStr
    password: str


class SocialLink(BaseModel):
    platform: str
    url: str


class UserRead(BaseModel):
    id: UUID
    email: str
    is_active: bool
    is_writer: bool = False
    pen_name: str | None = None
    bio: str | None = None
    genres: list[str] = []
    writer_since: datetime | None = None
    handle: str | None = None
    tagline: str | None = None
    location: str | None = None
    website: str | None = None
    social_links: list[SocialLink] = []
    avatar_tone: str = "lavender"
    cover_tone: str = "lavender"
    admin_role: str | None = None
    created_at: datetime
    updated_at: datetime

    @field_validator("genres", "social_links", mode="before")
    @classmethod
    def _none_to_empty_list(cls, v: list | None) -> list:
        return v or []


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class BecomeWriter(BaseModel):
    pen_name: str = Field(min_length=2, max_length=60)
    bio: str = Field(default="", max_length=MAX_BIO_LENGTH)
    genres: list[str] = []
    accepted_terms: Literal[True]

    @field_validator("pen_name")
    @classmethod
    def _clean_pen_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 2:
            raise ValueError("Pen name must be at least 2 characters")
        return v

    @field_validator("genres")
    @classmethod
    def _genres(cls, v: list[str]) -> list[str]:
        return clean_genres(v, limit=MAX_WRITER_GENRES)

    @field_validator("bio")
    @classmethod
    def _strip_bio(cls, v: str) -> str:
        return v.strip()


class WriterUpgrade(Token):
    user: UserRead


def _strip_or_none(v: str | None) -> str | None:
    if v is None:
        return None
    v = " ".join(v.split())
    return v or None


class ProfileUpdate(BaseModel):
    """Every field optional — only what's sent is changed."""

    pen_name: str | None = Field(default=None, max_length=60)
    handle: str | None = None
    tagline: str | None = Field(default=None, max_length=80)
    bio: str | None = Field(default=None, max_length=MAX_BIO_LENGTH)
    genres: list[str] | None = None
    location: str | None = Field(default=None, max_length=60)
    website: str | None = None
    social_links: list[SocialLink] | None = None
    avatar_tone: str | None = None
    cover_tone: str | None = None

    @field_validator("pen_name")
    @classmethod
    def _pen_name(cls, v: str | None) -> str | None:
        if v is None:
            return None
        v = " ".join(v.split())
        if len(v) < 2:
            raise ValueError("Pen name must be at least 2 characters")
        return v

    @field_validator("handle")
    @classmethod
    def _handle(cls, v: str | None) -> str | None:
        return None if v is None else validate_handle(v)

    @field_validator("tagline", "location")
    @classmethod
    def _single_line(cls, v: str | None) -> str | None:
        return _strip_or_none(v)

    @field_validator("bio")
    @classmethod
    def _bio(cls, v: str | None) -> str | None:
        return None if v is None else (v.strip() or None)

    @field_validator("genres")
    @classmethod
    def _genres(cls, v: list[str] | None) -> list[str] | None:
        return None if v is None else clean_genres(v, limit=MAX_WRITER_GENRES)

    @field_validator("website")
    @classmethod
    def _website(cls, v: str | None) -> str | None:
        return clean_url(v)

    @field_validator("social_links")
    @classmethod
    def _socials(cls, v: list[SocialLink] | None) -> list[SocialLink] | None:
        if v is None:
            return None
        return [
            SocialLink(**link) for link in clean_social_links([link.model_dump() for link in v])
        ]

    @field_validator("avatar_tone", "cover_tone")
    @classmethod
    def _tone(cls, v: str | None) -> str | None:
        if v is not None and v not in PROFILE_TONES:
            raise ValueError(f"Unknown colour: {v}")
        return v


class HandleAvailability(BaseModel):
    handle: str
    available: bool
    reason: str | None = None
