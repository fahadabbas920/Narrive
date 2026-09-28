from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import Column, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlmodel import Field, Relationship, SQLModel


def utcnow() -> datetime:
    return datetime.now(UTC)


class StoryStatus(StrEnum):
    draft = "draft"
    published = "published"
    archived = "archived"


class SceneType(StrEnum):
    start = "start"
    middle = "middle"
    ending = "ending"


class Story(SQLModel, table=True):
    __tablename__ = "stories"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    author_id: UUID = Field(foreign_key="users.id", index=True, nullable=False)
    title: str = Field(nullable=False, max_length=200)
    description: str = Field(default="", sa_column=Column(Text))
    cover_image: str | None = Field(default=None)
    genres: list[str] = Field(default=[], sa_column=Column(JSON))
    moods: list[str] = Field(default=[], sa_column=Column(JSON))
    content_rating: str | None = Field(default=None, max_length=20)
    tags: list[str] = Field(default=[], sa_column=Column(JSON))
    status: StoryStatus = Field(default=StoryStatus.draft)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    scenes: list["Scene"] = Relationship(
        back_populates="story",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )
    choices: list["Choice"] = Relationship(
        back_populates="story",
        sa_relationship_kwargs={"cascade": "all, delete-orphan"},
    )


class Scene(SQLModel, table=True):
    __tablename__ = "scenes"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    story_id: UUID = Field(foreign_key="stories.id", index=True, nullable=False)
    title: str = Field(default="Untitled Scene", max_length=200)
    content: str = Field(default="", sa_column=Column(Text))
    scene_type: SceneType = Field(default=SceneType.middle)
    position_x: float = Field(default=100.0)
    position_y: float = Field(default=100.0)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    story: Story | None = Relationship(back_populates="scenes")


class Choice(SQLModel, table=True):
    __tablename__ = "choices"

    id: UUID = Field(default_factory=uuid4, primary_key=True)
    story_id: UUID = Field(foreign_key="stories.id", index=True, nullable=False)
    from_scene_id: UUID = Field(foreign_key="scenes.id", nullable=False)
    to_scene_id: UUID = Field(foreign_key="scenes.id", nullable=False)
    text: str = Field(nullable=False, max_length=500)
    display_order: int = Field(default=0)
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)

    story: Story | None = Relationship(back_populates="choices")
