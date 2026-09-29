import json
from base64 import urlsafe_b64decode, urlsafe_b64encode
from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import String, and_, cast, or_
from sqlmodel import Session, col, func, select

from app.core.catalogue import author_details, story_list, visible_stories
from app.core.database import get_session
from app.models.story import Choice, Scene, Story, StoryStatus
from app.models.user import User
from app.schemas.story import (
    ChoiceRead,
    PublicAuthor,
    PublicStoryDetail,
    PublicStoryPage,
    SceneRead,
    StoryFacets,
)
from app.schemas.writer import PublicWriter, WriterStats

router = APIRouter(prefix="/public", tags=["public"])


PAGE_MAX = 48


def _sort_key():
    # published_at is set on first publish; created_at covers anything published before it existed.
    return func.coalesce(Story.published_at, Story.created_at)


def _encode_cursor(ts: datetime, story_id: UUID) -> str:
    raw = json.dumps({"t": ts.isoformat(), "id": str(story_id)}).encode()
    return urlsafe_b64encode(raw).decode().rstrip("=")


def _decode_cursor(cursor: str) -> tuple[datetime, UUID]:
    try:
        data = json.loads(urlsafe_b64decode(cursor + "=" * (-len(cursor) % 4)))
        ts = datetime.fromisoformat(data["t"])
        return (ts if ts.tzinfo else ts.replace(tzinfo=UTC)), UUID(data["id"])
    except (ValueError, KeyError, TypeError, AttributeError) as err:
        raise HTTPException(status_code=400, detail="Invalid cursor") from err


def _escape_like(value: str) -> str:
    return value.replace("\\", "\\\\").replace("%", r"\%").replace("_", r"\_")


def _any_in_json_list(column, values: list[str]):
    # genres / moods are JSON lists; match the quoted canonical name.
    return or_(*(cast(column, String).ilike(f'%"{_escape_like(v)}"%') for v in values))


def _catalogue_query(q: str | None, genre: list[str], mood: list[str], rating: list[str]):
    query = visible_stories()
    if q and q.strip():
        pattern = f"%{_escape_like(q.strip())}%"
        query = query.where(
            or_(
                col(Story.title).ilike(pattern),
                col(Story.description).ilike(pattern),
                col(User.pen_name).ilike(pattern),
                col(User.handle).ilike(pattern),
            )
        )
    if genre:
        query = query.where(_any_in_json_list(Story.genres, genre))
    if mood:
        query = query.where(_any_in_json_list(Story.moods, mood))
    if rating:
        query = query.where(col(Story.content_rating).in_(rating))
    return query


@router.get("/stories", response_model=PublicStoryPage)
def list_published_stories(
    q: str | None = Query(None, max_length=100),
    genre: list[str] = Query([]),
    mood: list[str] = Query([]),
    rating: list[str] = Query([]),
    featured: bool = Query(False, description="Only featured stories, in featured order"),
    limit: int = Query(12, ge=1, le=PAGE_MAX),
    cursor: str | None = Query(None, max_length=200),
    db: Session = Depends(get_session),
):
    """Newest first, one page at a time. Pass `next_cursor` back as `cursor` for the next page."""
    query = _catalogue_query(q, genre, mood, rating)
    if featured:
        rows = db.exec(
            query.where(col(Story.is_featured))
            .order_by(col(Story.featured_rank).asc().nulls_last(), _sort_key().desc())
            .limit(limit)
        ).all()
        return PublicStoryPage(items=story_list(db, list(rows)), total=len(rows))

    total = db.exec(select(func.count()).select_from(query.subquery())).one()
    key = _sort_key()
    if cursor:
        ts, last_id = _decode_cursor(cursor)
        query = query.where(or_(key < ts, and_(key == ts, col(Story.id) < last_id)))
    rows = list(db.exec(query.order_by(key.desc(), col(Story.id).desc()).limit(limit + 1)).all())
    has_more = len(rows) > limit
    rows = rows[:limit]
    last = rows[-1] if rows else None
    return PublicStoryPage(
        items=story_list(db, rows),
        total=total,
        next_cursor=(
            _encode_cursor(last.published_at or last.created_at, last.id)
            if has_more and last
            else None
        ),
    )


@router.get("/stories/facets", response_model=StoryFacets)
def story_facets(db: Session = Depends(get_session)):
    """Counts for the filter menus, grouped in Postgres."""
    listed = visible_stories(
        col(Story.genres).label("genres"),
        col(Story.moods).label("moods"),
        col(Story.content_rating).label("rating"),
    ).cte("listed")

    def tally(column) -> dict[str, int]:
        values = select(func.json_array_elements_text(column).label("v")).subquery()
        return dict(db.exec(select(values.c.v, func.count()).group_by(values.c.v)).all())

    ratings = dict(
        db.exec(
            select(listed.c.rating, func.count())
            .where(listed.c.rating.is_not(None))
            .group_by(listed.c.rating)
        ).all()
    )
    return StoryFacets(
        total=db.exec(select(func.count()).select_from(listed)).one(),
        genres=tally(listed.c.genres),
        moods=tally(listed.c.moods),
        ratings=ratings,
    )


@router.get("/stories/{story_id}", response_model=PublicStoryDetail)
def get_published_story(story_id: UUID, db: Session = Depends(get_session)):
    story = db.exec(visible_stories().where(Story.id == story_id)).first()
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    scenes = db.exec(select(Scene).where(Scene.story_id == story_id)).all()
    choices = db.exec(select(Choice).where(Choice.story_id == story_id)).all()
    author = author_details(db, {story.author_id}).get(story.author_id) or PublicAuthor()
    return PublicStoryDetail(
        **story.model_dump(exclude={"scenes", "choices"}),
        **author.model_dump(),
        scene_count=len(scenes),
        scenes=[SceneRead.model_validate(s, from_attributes=True) for s in scenes],
        choices=[ChoiceRead.model_validate(c, from_attributes=True) for c in choices],
    )


@router.get("/writers/{handle}", response_model=PublicWriter)
def get_writer(handle: str, db: Session = Depends(get_session)):
    writer = db.exec(select(User).where(User.handle == handle.lower())).first()
    if not writer or not writer.is_writer or not writer.is_active:
        raise HTTPException(status_code=404, detail="Writer not found")

    stories = list(
        db.exec(
            select(Story)
            .where(Story.author_id == writer.id, Story.status == StoryStatus.published)
            .order_by(col(Story.updated_at).desc())
        ).all()
    )
    listed = story_list(db, stories)
    story_ids = [s.id for s in stories]
    choice_count = (
        db.exec(
            select(func.count()).select_from(Choice).where(col(Choice.story_id).in_(story_ids))
        ).one()
        if story_ids
        else 0
    )
    return PublicWriter(
        **writer.model_dump(
            include={
                "handle",
                "tagline",
                "bio",
                "genres",
                "location",
                "website",
                "social_links",
                "avatar_tone",
                "cover_tone",
                "writer_since",
            }
        ),
        pen_name=writer.pen_name or writer.handle,
        stats=WriterStats(
            stories=len(stories),
            scenes=sum(s.scene_count for s in listed),
            choices=choice_count,
        ),
        stories=listed,
    )
