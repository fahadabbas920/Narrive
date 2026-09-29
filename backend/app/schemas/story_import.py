"""The bulk-import file format ("narrive-story", version 1).

Scenes are identified by short keys the file makes up itself; each choice sits inside the
scene it starts from and points at another scene's key. See docs/plans/ADMIN-PLAN.md §5."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.story import _TaxonomyValidated

IMPORT_FORMAT = "narrive-story"
IMPORT_VERSION = 1

MAX_IMPORT_BYTES = 2 * 1024 * 1024
MAX_STORIES = 50
MAX_SCENES = 500
MAX_CHOICES_PER_SCENE = 20
MAX_SCENE_CONTENT = 50_000
MAX_DESCRIPTION = 5_000


class _Strict(BaseModel):
    # Unknown fields are rejected so a typo ("choises") can't silently drop content.
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class ImportPosition(_Strict):
    x: float
    y: float


class ImportChoice(_Strict):
    text: str = Field(min_length=1, max_length=500)
    to: str = Field(min_length=1, max_length=60)


class ImportScene(_Strict):
    key: str = Field(min_length=1, max_length=60)
    type: Literal["start", "middle", "ending"] = "middle"
    title: str = Field(default="Untitled Scene", min_length=1, max_length=200)
    content: str = Field(default="", max_length=MAX_SCENE_CONTENT)
    position: ImportPosition | None = None
    choices: list[ImportChoice] = Field(default=[], max_length=MAX_CHOICES_PER_SCENE)


class ImportStory(_Strict, _TaxonomyValidated):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=MAX_DESCRIPTION)
    genres: list[str] = []
    moods: list[str] = []
    content_rating: str | None = None
    tags: list[str] = []
    status: Literal["draft", "published"] = "draft"
    scenes: list[ImportScene] = Field(min_length=1, max_length=MAX_SCENES)

    @field_validator("content_rating", mode="before")
    @classmethod
    def _blank_rating(cls, v: str | None) -> str | None:
        return v or None


# ── Report ───────────────────────────────────────────────────────────────────


class ImportProblem(BaseModel):
    path: str
    message: str


class ImportStoryReport(BaseModel):
    index: int
    title: str
    status: str
    scenes: int = 0
    choices: int = 0
    endings: int = 0
    words: int = 0
    errors: list[ImportProblem] = []
    warnings: list[ImportProblem] = []


class ImportReport(BaseModel):
    valid: bool
    story_count: int = 0
    scene_count: int = 0
    choice_count: int = 0
    errors: list[ImportProblem] = []  # file-level (envelope) problems
    stories: list[ImportStoryReport] = []


class ImportResultStory(BaseModel):
    id: str
    title: str
    status: str


class ImportResult(BaseModel):
    import_id: str
    stories: list[ImportResultStory]
    report: ImportReport
