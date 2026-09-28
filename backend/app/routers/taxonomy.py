from fastapi import APIRouter, Response
from pydantic import BaseModel

from app.core import taxonomy

router = APIRouter(prefix="/taxonomy", tags=["taxonomy"])


class ContentRating(BaseModel):
    value: str
    label: str
    hint: str


class SocialPlatform(BaseModel):
    value: str
    label: str
    domain: str


class Limits(BaseModel):
    story_genres: int
    story_moods: int
    writer_genres: int
    tags: int
    tag_length: int
    social_links: int
    bio_length: int


class Taxonomy(BaseModel):
    genres: list[str]
    moods: list[str]
    content_ratings: list[ContentRating]
    profile_tones: list[str]
    social_platforms: list[SocialPlatform]
    limits: Limits


@router.get("", response_model=Taxonomy)
def get_taxonomy(response: Response):
    # Revalidate every load so list changes show up immediately after a deploy.
    response.headers["Cache-Control"] = "no-cache"
    return Taxonomy(
        genres=list(taxonomy.GENRES),
        moods=list(taxonomy.MOODS),
        content_ratings=[ContentRating(**r) for r in taxonomy.CONTENT_RATINGS],
        profile_tones=list(taxonomy.PROFILE_TONES),
        social_platforms=[SocialPlatform(**p) for p in taxonomy.SOCIAL_PLATFORMS],
        limits=Limits(
            story_genres=taxonomy.MAX_STORY_GENRES,
            story_moods=taxonomy.MAX_STORY_MOODS,
            writer_genres=taxonomy.MAX_WRITER_GENRES,
            tags=taxonomy.MAX_TAGS,
            tag_length=taxonomy.MAX_TAG_LENGTH,
            social_links=taxonomy.MAX_SOCIAL_LINKS,
            bio_length=taxonomy.MAX_BIO_LENGTH,
        ),
    )
