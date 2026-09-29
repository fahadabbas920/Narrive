"""The signed-in reader's own progress, Read later list and stats."""

from datetime import UTC, datetime
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, col, select

from app.core.catalogue import story_list, visible_stories
from app.core.database import get_session
from app.core.deps import get_current_user, is_admin
from app.core.reading import found_endings, library, reading_stats, status_of
from app.models.reading import ReadingProgress, SavedStory
from app.models.story import Choice, Scene, SceneType, Story
from app.models.user import User
from app.schemas.reading import (
    MAX_HISTORY,
    LibraryEntry,
    ProgressRead,
    ProgressUpdate,
    ReadingListItem,
    ReadingStats,
)

router = APIRouter(prefix="/me", tags=["reading"])


def _readable_story(db: Session, story_id: UUID, user: User) -> Story:
    """Catalogue stories, plus the reader's own stories and (for admins) any story."""
    story = db.exec(visible_stories().where(Story.id == story_id)).first()
    if story:
        return story
    story = db.get(Story, story_id)
    if story and (story.author_id == user.id or is_admin(user)):
        return story
    raise HTTPException(status_code=404, detail="Story not found")


def _scene_types(db: Session, story_id: UUID) -> dict[str, SceneType]:
    return {
        str(sid): scene_type
        for sid, scene_type in db.exec(
            select(Scene.id, Scene.scene_type).where(Scene.story_id == story_id)
        ).all()
    }


def _get_row(
    db: Session, user: User, story_id: UUID, *, for_update: bool = False
) -> ReadingProgress | None:
    query = select(ReadingProgress).where(
        ReadingProgress.user_id == user.id, ReadingProgress.story_id == story_id
    )
    return db.exec(query.with_for_update() if for_update else query).first()


def _progress_read(row: ReadingProgress, types: dict[str, SceneType]) -> ProgressRead:
    endings = {sid for sid, t in types.items() if t == SceneType.ending}
    return ProgressRead(
        story_id=row.story_id,
        status=status_of(row, endings),
        current_scene_id=row.current_scene_id if str(row.current_scene_id) in types else None,
        history=[UUID(h) for h in row.history or [] if h in types],
        scenes_seen=len(set(row.scenes_seen or []) & set(types)),
        scenes_total=len(types),
        endings_found=[UUID(e) for e in found_endings(row, endings)],
        endings_total=len(endings),
        runs_finished=row.runs_finished,
        started_at=row.started_at,
        last_read_at=row.last_read_at,
        first_finished_at=row.first_finished_at,
    )


def _merge(existing: list[str], *new: str) -> list[str]:
    return list(dict.fromkeys([*existing, *new]))


def _choices(db: Session, story_id: UUID) -> set[tuple[str, str]]:
    return {
        (str(a), str(b))
        for a, b in db.exec(
            select(Choice.from_scene_id, Choice.to_scene_id).where(Choice.story_id == story_id)
        ).all()
    }


def _run_is_real(
    row: ReadingProgress | None,
    history: list[str],
    scene: str,
    start: str | None,
    choices: set[tuple[str, str]],
) -> bool:
    """Whether this save continues a run the server has watched, one real choice at a time.

    The reader downloads the whole story, so a scene id alone proves nothing. A run counts
    when it begins at the start scene and every step since the last save follows a choice.
    Several steps at once are fine (a save can fail and the next one covers it), and so is
    going back within the run.
    """
    if not history:
        return scene == start  # a fresh run
    path = [*history, scene]

    def follows_choices(steps: list[str]) -> bool:
        return all(step in choices for step in zip(steps, steps[1:], strict=False))

    current = str(row.current_scene_id) if row and row.current_scene_id else None
    if current is None:  # first save, or after "start over": the whole path must check out
        return path[0] == start and follows_choices(path)
    if not row.run_verified:
        return False
    if current in path:  # forward from where the server last saw the reader
        last = len(path) - 1 - path[::-1].index(current)
        return follows_choices(path[last:])
    return scene in (row.history or [])  # stepped back within this run


# ── Progress ─────────────────────────────────────────────────────────────────


@router.put("/reading/{story_id}", response_model=ProgressRead)
def save_progress(
    story_id: UUID,
    data: ProgressUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    return _save_progress(db, user, story_id, data)


def _save_progress(
    db: Session, user: User, story_id: UUID, data: ProgressUpdate, *, retried: bool = False
) -> ProgressRead:
    _readable_story(db, story_id, user)
    types = _scene_types(db, story_id)
    scene = str(data.scene_id)
    if scene not in types:
        raise HTTPException(status_code=422, detail="Scene not found in this story")
    # Scenes the writer has since deleted are dropped rather than rejected.
    history = [str(h) for h in data.history if str(h) in types][-MAX_HISTORY:]
    now = datetime.now(UTC)

    # Locking the row stops two quick saves from each merging endings into a stale copy.
    row = _get_row(db, user, story_id, for_update=True)
    start = next((sid for sid, t in types.items() if t == SceneType.start), None)
    verified = _run_is_real(row, history, scene, start, _choices(db, story_id))
    if row is None:
        row = ReadingProgress(user_id=user.id, story_id=story_id, started_at=now)

    # The position is always saved, so reading never breaks; only a real run earns credit.
    row.run_verified = verified
    if verified:
        row.scenes_seen = _merge(row.scenes_seen or [], *history, scene)
    if verified and types[scene] == SceneType.ending:
        row.endings_found = _merge(row.endings_found or [], scene)
        if not row.run_finished:
            row.runs_finished += 1
        row.run_finished = True
        row.first_finished_at = row.first_finished_at or now
    else:
        row.run_finished = False
    row.current_scene_id = data.scene_id
    row.history = history
    row.last_read_at = now
    db.add(row)
    try:
        db.commit()
    except IntegrityError as err:
        # Two saves raced to create the row; the other one won, so apply this one on top, once.
        db.rollback()
        if retried or "uq_reading_progress_user_story" not in str(err.orig):
            raise
        return _save_progress(db, user, story_id, data, retried=True)
    db.refresh(row)
    return _progress_read(row, types)


@router.get("/reading/stats", response_model=ReadingStats)
def my_stats(user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    return reading_stats(db, user_id=user.id)


@router.get("/reading/{story_id}", response_model=ProgressRead)
def get_progress(
    story_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    row = _get_row(db, user, story_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Not started")
    return _progress_read(row, _scene_types(db, story_id))


@router.delete("/reading/{story_id}", status_code=status.HTTP_204_NO_CONTENT)
def start_over(
    story_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """Resets the current run. Endings found and stats are kept."""
    row = _get_row(db, user, story_id)
    if row is None:
        return
    row.current_scene_id = None
    row.history = []
    row.run_finished = False
    db.add(row)
    db.commit()


def _items(
    db: Session, user: User, story_ids: list[UUID], saved_at: dict[UUID, datetime] | None = None
) -> list[ReadingListItem]:
    """Stories in the given order, limited to ones still in the catalogue."""
    if not story_ids:
        return []
    stories = {
        s.id: s for s in db.exec(visible_stories().where(col(Story.id).in_(story_ids))).all()
    }
    ordered = [stories[sid] for sid in story_ids if sid in stories]
    entries = library(db, user.id)
    return [
        ReadingListItem(
            story=public,
            entry=entries.get(public.id, LibraryEntry()),
            saved_at=(saved_at or {}).get(public.id),
        )
        for public in story_list(db, ordered)
    ]


@router.get("/reading", response_model=list[ReadingListItem])
def my_reading(
    status_filter: Literal["reading", "finished"] | None = Query(None, alias="status"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    """`reading`: a run in progress (first read or re-read). `finished`: any ending reached."""
    query = select(ReadingProgress).where(ReadingProgress.user_id == user.id)
    if status_filter == "reading":
        query = query.where(
            col(ReadingProgress.current_scene_id).is_not(None),
            col(ReadingProgress.run_finished).is_(False),
        )
    elif status_filter == "finished":
        query = query.where(col(ReadingProgress.first_finished_at).is_not(None))
    rows = db.exec(query.order_by(col(ReadingProgress.last_read_at).desc())).all()
    return _items(db, user, [r.story_id for r in rows])


# ── Read later ───────────────────────────────────────────────────────────────


@router.get("/saved", response_model=list[ReadingListItem])
def my_saved(user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    rows = db.exec(
        select(SavedStory)
        .where(SavedStory.user_id == user.id)
        .order_by(col(SavedStory.created_at).desc())
    ).all()
    return _items(db, user, [r.story_id for r in rows], {r.story_id: r.created_at for r in rows})


@router.put("/saved/{story_id}", status_code=status.HTTP_204_NO_CONTENT)
def save_for_later(
    story_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    if not db.exec(visible_stories().where(Story.id == story_id)).first():
        raise HTTPException(status_code=404, detail="Story not found")
    if db.get(SavedStory, (user.id, story_id)) is None:
        db.add(SavedStory(user_id=user.id, story_id=story_id))
        try:
            db.commit()
        except IntegrityError:
            db.rollback()  # already saved by a parallel request


@router.delete("/saved/{story_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_saved(
    story_id: UUID,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    row = db.get(SavedStory, (user.id, story_id))
    if row:
        db.delete(row)
        db.commit()


# ── Library: your status on every story you've touched ───────────────────────


@router.get("/library", response_model=dict[UUID, LibraryEntry])
def my_library(user: User = Depends(get_current_user), db: Session = Depends(get_session)):
    return library(db, user.id)
