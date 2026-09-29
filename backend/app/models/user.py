from datetime import UTC, datetime
from uuid import UUID, uuid4

from sqlalchemy import Column, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlmodel import Field, SQLModel


def utcnow() -> datetime:
    return datetime.now(UTC)


class User(SQLModel, table=True):
    __tablename__ = "users"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    email: str = Field(unique=True, index=True, nullable=False)
    hashed_password: str = Field(nullable=False)
    is_active: bool = Field(default=True)
    is_writer: bool = Field(default=False, nullable=False)
    pen_name: str | None = Field(default=None, max_length=60)
    bio: str | None = Field(default=None, sa_column=Column(Text))
    genres: list[str] = Field(default=[], sa_column=Column(JSON))
    writer_since: datetime | None = Field(default=None)
    handle: str | None = Field(default=None, unique=True, index=True, max_length=30)
    tagline: str | None = Field(default=None, max_length=80)
    location: str | None = Field(default=None, max_length=60)
    website: str | None = Field(default=None, max_length=200)
    social_links: list[dict[str, str]] = Field(default=[], sa_column=Column(JSON))
    avatar_tone: str = Field(default="lavender", max_length=20)
    cover_tone: str = Field(default="lavender", max_length=20)
    # "superadmin" or null. Only granted by `python -m app.scripts.make_admin`, never by the API.
    admin_role: str | None = Field(default=None, max_length=20)
    # The Narrive house account that owns Narrive Originals. Nobody can sign in as it.
    is_system: bool = Field(default=False, nullable=False)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)
