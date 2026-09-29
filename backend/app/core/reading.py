"""Reading status and stats, shared by the reader's /me routes and the admin console.
`reading_stats()` returns one shape for a single reader, a single story or the platform."""

from collections.abc import Iterable
from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import Date, Integer, String, and_, case, cast, literal_column
from sqlmodel import Session, col, func, select

from app.models.reading import ReadingProgress, SavedStory
from app.models.story import Scene, SceneType, Story
from app.schemas.reading import (
    ActivityPoint,
    LibraryEntry,
    NamedCount,
    ReadingStats,
    ReadingStatus,
)


def ending_ids(db: Session, story_ids: Iterable[UUID]) -> dict[UUID, set[str]]:
    ids = set(story_ids)
    out: dict[UUID, set[str]] = {sid: set() for sid in ids}
    if not ids:
        return out
    for scene_id, story_id in db.exec(
        select(Scene.id, Scene.story_id).where(
            col(Scene.story_id).in_(ids), Scene.scene_type == SceneType.ending
        )
    ).all():
        out[story_id].add(str(scene_id))
    return out


def found_endings(row: ReadingProgress, endings: set[str]) -> set[str]:
    # Endings the writer has since deleted no longer count.
    return set(row.endings_found or []) & endings


def status_of(row: ReadingProgress, endings: set[str]) -> ReadingStatus:
    if row.first_finished_at is None:
        return "in_progress"
    if row.current_scene_id is not None and not row.run_finished:
        return "reading_again"
    if endings and found_endings(row, endings) >= endings:
        return "all_endings"
    return "finished"


def library(db: Session, user_id: UUID) -> dict[UUID, LibraryEntry]:
    rows = db.exec(select(ReadingProgress).where(ReadingProgress.user_id == user_id)).all()
    saved = dict(
        db.exec(
            select(SavedStory.story_id, SavedStory.created_at).where(SavedStory.user_id == user_id)
        ).all()
    )
    endings = ending_ids(db, [r.story_id for r in rows] + list(saved))
    entries: dict[UUID, LibraryEntry] = {}
    for row in rows:
        story_endings = endings.get(row.story_id, set())
        entries[row.story_id] = LibraryEntry(
            status=status_of(row, story_endings),
            endings_found=len(found_endings(row, story_endings)),
            endings_total=len(story_endings),
            saved=row.story_id in saved,
            last_read_at=row.last_read_at,
        )
    for story_id in saved:
        entries.setdefault(
            story_id,
            LibraryEntry(saved=True, endings_total=len(endings.get(story_id, set()))),
        )
    return entries


# ── Stats: counted in Postgres, so only totals leave the database ──────────────

_WORDS = case(
    (func.trim(func.coalesce(Scene.content, "")) == "", 0),
    else_=func.array_length(
        func.regexp_split_to_array(func.trim(Scene.content), literal_column("'\\s+'")), 1
    ),
)


def _total(expr):
    # SUM of integers is numeric in Postgres; cast back so the API returns plain ints.
    return cast(func.coalesce(func.sum(expr), 0), Integer)


def reading_stats(
    db: Session,
    *,
    user_id: UUID | None = None,
    story_id: UUID | None = None,
    days: int = 30,
) -> ReadingStats:
    scope = "user" if user_id else "story" if story_id else "platform"

    # The progress rows in scope, as a CTE every count below reads from.
    base = select(
        col(ReadingProgress.id).label("id"),
        col(ReadingProgress.user_id).label("user_id"),
        col(ReadingProgress.story_id).label("story_id"),
        col(ReadingProgress.scenes_seen).label("scenes_seen"),
        col(ReadingProgress.endings_found).label("endings_found"),
        col(ReadingProgress.started_at).label("started_at"),
        col(ReadingProgress.first_finished_at).label("first_finished_at"),
        col(ReadingProgress.last_read_at).label("last_read_at"),
        col(Story.title).label("title"),
        col(Story.genres).label("genres"),
    ).join(Story, col(Story.id) == col(ReadingProgress.story_id))
    if user_id:
        base = base.where(ReadingProgress.user_id == user_id)
    else:
        # A writer reading their own story counts in their personal stats, not the story's.
        base = base.where(col(ReadingProgress.user_id) != col(Story.author_id))
    if story_id:
        base = base.where(ReadingProgress.story_id == story_id)
    p = base.cte("p")
    finished = p.c.first_finished_at.is_not(None)

    started, readers, finished_count, last_read, scenes_read = db.exec(
        select(
            func.count(),
            func.count(func.distinct(p.c.user_id)),
            func.count(p.c.first_finished_at),
            func.max(p.c.last_read_at),
            _total(func.json_array_length(p.c.scenes_seen)),
        ).select_from(p)
    ).one()

    # Endings each story has now, and the ones each reader found that still exist.
    story_endings = (
        select(col(Scene.story_id).label("story_id"), func.count().label("total"))
        .where(Scene.scene_type == SceneType.ending, col(Scene.story_id).in_(select(p.c.story_id)))
        .group_by(Scene.story_id)
        .subquery("se")
    )
    found_ids = select(
        p.c.id,
        p.c.story_id,
        func.json_array_elements_text(p.c.endings_found).label("scene_id"),
    ).subquery("fi")
    found = (
        select(found_ids.c.id, found_ids.c.story_id, func.count().label("n"))
        .join(
            Scene,
            and_(
                col(Scene.story_id) == found_ids.c.story_id,
                cast(Scene.id, String) == found_ids.c.scene_id,
                Scene.scene_type == SceneType.ending,
            ),
        )
        .group_by(found_ids.c.id, found_ids.c.story_id)
        .subquery("f")
    )
    endings_found, completed_all = db.exec(
        select(
            _total(found.c.n),
            func.count().filter(found.c.n >= story_endings.c.total),
        )
        .select_from(found)
        .join(story_endings, story_endings.c.story_id == found.c.story_id)
    ).one()

    saved_query = select(func.count()).select_from(SavedStory)
    if user_id:
        saved_query = saved_query.where(SavedStory.user_id == user_id)
    if story_id:
        saved_query = saved_query.where(SavedStory.story_id == story_id)

    today = datetime.now(UTC).date()
    first_day = today - timedelta(days=days - 1)
    started_day = cast(p.c.started_at, Date)
    finished_day = cast(p.c.first_finished_at, Date)
    started_by_day = dict(
        db.exec(
            select(started_day, func.count()).where(started_day >= first_day).group_by(started_day)
        ).all()
    )
    finished_by_day = dict(
        db.exec(
            select(finished_day, func.count())
            .where(finished, finished_day >= first_day)
            .group_by(finished_day)
        ).all()
    )

    stats = ReadingStats(
        scope=scope,
        readers=readers,
        started=started,
        finished=finished_count,
        in_progress=started - finished_count,
        completed_all_endings=completed_all,
        saved=db.exec(saved_query).one(),
        completion_rate=round(finished_count / started, 3) if started else None,
        endings_found=endings_found,
        scenes_read=scenes_read,
        last_read_at=last_read,
        activity=[
            ActivityPoint(
                date=day,
                started=started_by_day.get(day, 0),
                finished=finished_by_day.get(day, 0),
            )
            for day in (first_day + timedelta(days=i) for i in range(days))
        ],
    )

    if scope == "user":
        per_story = select(p.c.story_id).subquery("ps")
        stats.endings_total = db.exec(
            select(_total(story_endings.c.total))
            .select_from(per_story)
            .join(story_endings, story_endings.c.story_id == per_story.c.story_id)
        ).one()
        seen = (
            select(func.json_array_elements_text(p.c.scenes_seen).label("scene_id"))
            .distinct()
            .subquery("seen")
        )
        stats.words_read = db.exec(
            select(_total(_WORDS)).join(seen, cast(Scene.id, String) == seen.c.scene_id)
        ).one()
    if scope == "story":
        stats.endings_total = db.exec(
            select(func.count()).where(
                Scene.story_id == story_id, Scene.scene_type == SceneType.ending
            )
        ).one()
        reached = (
            select(found_ids.c.scene_id, func.count().label("n"))
            .group_by(found_ids.c.scene_id)
            .subquery("r")
        )
        stats.ending_breakdown = [
            NamedCount(id=str(sid), name=title, count=n)
            for sid, title, n in db.exec(
                select(Scene.id, Scene.title, func.coalesce(reached.c.n, 0))
                .outerjoin(reached, reached.c.scene_id == cast(Scene.id, String))
                .where(Scene.story_id == story_id, Scene.scene_type == SceneType.ending)
                .order_by(func.coalesce(reached.c.n, 0).desc(), Scene.title)
            ).all()
        ]
    if scope in ("user", "platform"):
        genre = func.json_array_elements_text(p.c.genres).label("genre")
        genres = select(genre).where(finished).subquery("g")
        stats.top_genres = [
            NamedCount(name=g, count=n)
            for g, n in db.exec(
                select(genres.c.genre, func.count())
                .group_by(genres.c.genre)
                .order_by(func.count().desc(), genres.c.genre)
                .limit(8)
            ).all()
        ]
    if scope == "platform":
        stats.top_stories = [
            NamedCount(id=str(sid), name=title, count=n)
            for sid, title, n in db.exec(
                select(p.c.story_id, p.c.title, func.count())
                .where(finished)
                .group_by(p.c.story_id, p.c.title)
                .order_by(func.count().desc(), p.c.title)
                .limit(5)
            ).all()
        ]
    return stats
