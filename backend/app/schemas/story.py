from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, field_validator

from app.core.taxonomy import clean_content_rating, clean_genres, clean_moods, clean_tags
from app.models.story import SceneType, StoryStatus


class _TaxonomyValidated(BaseModel):
    """Only values exposed by GET /taxonomy can be stored."""

    @field_validator("genres", check_fields=False)
    @classmethod
    def _genres(cls, v: list[str] | None) -> list[str] | None:
        return None if v is None else clean_genres(v)

    @field_validator("moods", check_fields=False)
    @classmethod
    def _moods(cls, v: list[str] | None) -> list[str] | None:
        return None if v is None else clean_moods(v)

    @field_validator("content_rating", check_fields=False)
    @classmethod
    def _rating(cls, v: str | None) -> str | None:
        return clean_content_rating(v)

    @field_validator("tags", check_fields=False)
    @classmethod
    def _tags(cls, v: list[str] | None) -> list[str] | None:
        return None if v is None else clean_tags(v)


class StoryCreate(_TaxonomyValidated):
    title: str
    description: str = ""
    genres: list[str] = []
    moods: list[str] = []
    content_rating: str | None = None
    tags: list[str] = []


class StoryUpdate(_TaxonomyValidated):
    title: str | None = None
    description: str | None = None
    genres: list[str] | None = None
    moods: list[str] | None = None
    content_rating: str | None = None
    tags: list[str] | None = None
    status: StoryStatus | None = None


class StoryRead(BaseModel):
    id: UUID
    author_id: UUID
    title: str
    description: str
    cover_image: str | None
    genres: list[str] = []
    moods: list[str] = []
    content_rating: str | None = None
    tags: list[str] = []
    status: StoryStatus
    published_at: datetime | None = None
    is_featured: bool = False
    featured_rank: int | None = None
    scene_count: int = 0
    created_at: datetime
    updated_at: datetime

    @field_validator("genres", "moods", "tags", mode="before")
    @classmethod
    def _none_to_empty_list(cls, v: list[str] | None) -> list[str]:
        return v or []


class SceneCreate(BaseModel):
    title: str = "Untitled Scene"
    content: str = ""
    scene_type: SceneType = SceneType.middle
    position_x: float = 100.0
    position_y: float = 100.0


class SceneUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    scene_type: SceneType | None = None
    position_x: float | None = None
    position_y: float | None = None


class SceneRead(BaseModel):
    id: UUID
    story_id: UUID
    title: str
    content: str
    scene_type: SceneType
    position_x: float
    position_y: float
    created_at: datetime
    updated_at: datetime


class ChoiceCreate(BaseModel):
    from_scene_id: UUID
    to_scene_id: UUID
    text: str
    display_order: int = 0


class ChoiceUpdate(BaseModel):
    text: str | None = None
    display_order: int | None = None
    from_scene_id: UUID | None = None
    to_scene_id: UUID | None = None


class ChoiceRead(BaseModel):
    id: UUID
    story_id: UUID
    from_scene_id: UUID
    to_scene_id: UUID
    text: str
    display_order: int
    created_at: datetime
    updated_at: datetime


class StoryDetail(StoryRead):
    scenes: list[SceneRead] = []
    choices: list[ChoiceRead] = []


class PublicAuthor(BaseModel):
    author_name: str | None = None
    author_handle: str | None = None
    author_tone: str | None = None
    # True for Narrive Originals (stories owned by the Narrive house account).
    is_official: bool = False


class PublicStoryRead(StoryRead, PublicAuthor):
    pass


class PublicStoryDetail(StoryDetail, PublicAuthor):
    pass
