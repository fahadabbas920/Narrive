"""Super admin API. Every route depends on get_current_admin (role re-read from the DB), and
every change writes an AdminAction row in the same transaction as the change itself."""

import json
import re
from collections import Counter
from datetime import UTC, date, datetime, timedelta
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Body, Depends, HTTPException, Query, Request, Response, status
from sqlalchemy import String, cast, or_
from sqlmodel import Session, col, func, select

from app.core.database import get_session
from app.core.deps import get_current_admin, is_admin
from app.core.importer import commit_import, stories_in_import, validate_import
from app.core.originals import get_house_account
from app.core.reading import reading_stats
from app.core.story_graph import Node, analyze
from app.models.admin import AdminAction, StoryImport
from app.models.story import Choice, Scene, Story, StoryStatus
from app.models.user import User
from app.schemas.admin import (
    AdminStoryDetail,
    AdminStoryRow,
    AdminStoryUpdate,
    AdminUserDetail,
    AdminUserRow,
    AdminUserUpdate,
    AuditEntry,
    CountItem,
    Funnel,
    GrowthPoint,
    HealthReport,
    HealthRow,
    ImportRow,
    Issue,
    Metric,
    Overview,
    OverviewCards,
    Page,
    RecentStory,
    RecentUser,
    TopWriter,
)
from app.schemas.reading import ReadingStats
from app.schemas.story import ChoiceRead, SceneRead, StoryCreate
from app.schemas.story_import import (
    IMPORT_FORMAT,
    IMPORT_VERSION,
    MAX_IMPORT_BYTES,
    ImportReport,
    ImportResult,
    ImportResultStory,
)

router = APIRouter(prefix="/admin", tags=["admin"])

MAX_PAGE_SIZE = 100


def _now() -> datetime:
    # Always timezone-aware: newer SQLModel rejects naive datetimes as query parameters.
    return datetime.now(UTC)


def _audit(
    db: Session,
    actor: User,
    action: str,
    target_type: str,
    target_id: Any = None,
    **details: Any,
) -> None:
    db.add(
        AdminAction(
            actor_id=actor.id,
            action=action,
            target_type=target_type,
            target_id=str(target_id) if target_id is not None else None,
            details=json.loads(json.dumps(details, default=str)),
        )
    )


def _paging(page: int, page_size: int) -> tuple[int, int]:
    page_size = max(1, min(page_size, MAX_PAGE_SIZE))
    return max(1, page), page_size


def _count(db: Session, query) -> int:
    return db.exec(select(func.count()).select_from(query.subquery())).one()


def _like(q: str) -> str:
    return f"%{q.strip().replace('%', r'\%').replace('_', r'\_')}%"


# ── Overview ─────────────────────────────────────────────────────────────────


def _people():
    return select(User).where(col(User.is_system).is_(False))


@router.get("/overview", response_model=Overview)
def overview(db: Session = Depends(get_session), _: User = Depends(get_current_admin)):
    now = _now()
    house = get_house_account(db)

    def users_between(start: datetime, end: datetime) -> int:
        return _count(db, _people().where(User.created_at >= start, User.created_at < end))

    status_counts = dict(db.exec(select(Story.status, func.count()).group_by(Story.status)).all())
    cards = OverviewCards(
        users=_count(db, _people()),
        writers=_count(db, _people().where(col(User.is_writer))),
        admins=_count(db, _people().where(col(User.admin_role).is_not(None))),
        suspended=_count(db, _people().where(col(User.is_active).is_(False))),
        new_users_7d=Metric(
            value=users_between(now - timedelta(days=7), now),
            previous=users_between(now - timedelta(days=14), now - timedelta(days=7)),
        ),
        new_users_30d=Metric(
            value=users_between(now - timedelta(days=30), now),
            previous=users_between(now - timedelta(days=60), now - timedelta(days=30)),
        ),
        published=status_counts.get(StoryStatus.published, 0),
        drafts=status_counts.get(StoryStatus.draft, 0),
        archived=status_counts.get(StoryStatus.archived, 0),
        originals=_count(db, select(Story).where(Story.author_id == house.id)),
        featured=_count(db, select(Story).where(col(Story.is_featured))),
        scenes=db.exec(select(func.count()).select_from(Scene)).one(),
        choices=db.exec(select(func.count()).select_from(Choice)).one(),
    )

    # 30 daily buckets, today included. Bucketed in Python to stay database-agnostic.
    first_day = now.date() - timedelta(days=29)
    since = datetime.combine(first_day, datetime.min.time(), tzinfo=UTC)
    signups = Counter(
        d.date()
        for d in db.exec(
            select(User.created_at).where(User.created_at >= since, col(User.is_system).is_(False))
        ).all()
    )
    published = Counter(
        d.date()
        for d in db.exec(
            select(Story.published_at).where(
                col(Story.published_at).is_not(None), Story.published_at >= since
            )
        ).all()
        if d
    )
    growth = [
        GrowthPoint(date=day, signups=signups.get(day, 0), published=published.get(day, 0))
        for day in (first_day + timedelta(days=i) for i in range(30))
    ]

    funnel = Funnel(
        signed_up=cards.users,
        became_writer=cards.writers,
        created_story=db.exec(
            select(func.count(func.distinct(Story.author_id))).where(Story.author_id != house.id)
        ).one(),
        published_story=db.exec(
            select(func.count(func.distinct(Story.author_id))).where(
                Story.author_id != house.id, Story.status == StoryStatus.published
            )
        ).one(),
    )

    published_count = func.count().filter(Story.status == StoryStatus.published)
    top_rows = db.exec(
        select(User.id, User.handle, User.pen_name, User.avatar_tone, published_count, func.count())
        .join(Story, col(Story.author_id) == col(User.id))
        .where(col(User.is_system).is_(False))
        .group_by(User.id)
        .order_by(published_count.desc(), func.count().desc())
        .limit(5)
    ).all()
    top_writers = [
        TopWriter(id=r[0], handle=r[1], pen_name=r[2], avatar_tone=r[3], published=r[4], total=r[5])
        for r in top_rows
        if r[4] or r[5]
    ]

    genres: Counter[str] = Counter()
    moods: Counter[str] = Counter()
    for g, m in db.exec(
        select(Story.genres, Story.moods).where(Story.status == StoryStatus.published)
    ).all():
        genres.update(g or [])
        moods.update(m or [])

    recent_users = db.exec(_people().order_by(col(User.created_at).desc()).limit(6)).all()
    recent_published = db.exec(
        select(Story, User)
        .join(User, col(User.id) == col(Story.author_id))
        .where(Story.status == StoryStatus.published)
        .order_by(col(Story.published_at).desc().nulls_last())
        .limit(6)
    ).all()

    return Overview(
        cards=cards,
        growth=growth,
        funnel=funnel,
        top_writers=top_writers,
        genres=[CountItem(name=k, count=v) for k, v in genres.most_common()],
        moods=[CountItem(name=k, count=v) for k, v in moods.most_common()],
        recent_users=[RecentUser.model_validate(u, from_attributes=True) for u in recent_users],
        recent_stories=[
            RecentStory(
                id=s.id,
                title=s.title,
                author_name=u.pen_name or u.handle,
                is_official=u.is_system,
                published_at=s.published_at,
            )
            for s, u in recent_published
        ],
        recent_actions=_audit_entries(
            db, select(AdminAction).order_by(col(AdminAction.created_at).desc()).limit(8)
        ),
    )


@router.get("/overview/health", response_model=HealthReport)
def overview_health(db: Session = Depends(get_session), _: User = Depends(get_current_admin)):
    stories = db.exec(
        select(Story, User)
        .join(User, col(User.id) == col(Story.author_id))
        .where(Story.status == StoryStatus.published)
    ).all()
    ids = [s.id for s, _u in stories]
    nodes: dict[UUID, list[Node]] = {}
    edges: dict[UUID, list[tuple[UUID, UUID]]] = {}
    if ids:
        for sid, story_id, scene_type in db.exec(
            select(Scene.id, Scene.story_id, Scene.scene_type).where(col(Scene.story_id).in_(ids))
        ).all():
            nodes.setdefault(story_id, []).append(Node(sid, str(scene_type)))
        for story_id, src, dst in db.exec(
            select(Choice.story_id, Choice.from_scene_id, Choice.to_scene_id).where(
                col(Choice.story_id).in_(ids)
            )
        ).all():
            edges.setdefault(story_id, []).append((src, dst))

    rows: list[HealthRow] = []
    for story, author in stories:
        story_nodes = nodes.get(story.id, [])
        issues = (
            [Issue(level="error", message="The story has no scenes.")]
            if not story_nodes
            else [
                Issue(level=level, message=msg)
                for level, msg in analyze(story_nodes, edges.get(story.id, [])).issues
            ]
        )
        if issues:
            rows.append(
                HealthRow(
                    id=story.id,
                    title=story.title,
                    author_name=author.pen_name or author.handle,
                    is_official=author.is_system,
                    scene_count=len(story_nodes),
                    issues=issues,
                )
            )
    rows.sort(key=lambda r: (not any(i.level == "error" for i in r.issues), -len(r.issues)))
    return HealthReport(checked=len(stories), with_issues=len(rows), stories=rows)


@router.get("/reading-stats", response_model=ReadingStats)
def platform_reading_stats(
    days: int = Query(30, ge=7, le=90),
    db: Session = Depends(get_session),
    _: User = Depends(get_current_admin),
):
    return reading_stats(db, days=days)


@router.get("/users/{user_id}/reading-stats", response_model=ReadingStats)
def user_reading_stats(
    user_id: UUID, db: Session = Depends(get_session), _: User = Depends(get_current_admin)
):
    _get_person(db, user_id)
    return reading_stats(db, user_id=user_id)


@router.get("/stories/{story_id}/reading-stats", response_model=ReadingStats)
def story_reading_stats(
    story_id: UUID, db: Session = Depends(get_session), _: User = Depends(get_current_admin)
):
    _get_story(db, story_id)
    return reading_stats(db, story_id=story_id)


# ── Users ────────────────────────────────────────────────────────────────────


def _story_counts(db: Session, user_ids: list[UUID]) -> dict[UUID, tuple[int, int]]:
    if not user_ids:
        return {}
    rows = db.exec(
        select(
            Story.author_id,
            func.count(),
            func.count().filter(Story.status == StoryStatus.published),
        )
        .where(col(Story.author_id).in_(user_ids))
        .group_by(Story.author_id)
    ).all()
    return {uid: (total, pub) for uid, total, pub in rows}


def _user_row(user: User, counts: dict[UUID, tuple[int, int]]) -> AdminUserRow:
    total, pub = counts.get(user.id, (0, 0))
    return AdminUserRow(
        **user.model_dump(
            include={
                "id",
                "email",
                "handle",
                "pen_name",
                "avatar_tone",
                "is_active",
                "is_writer",
                "admin_role",
                "created_at",
                "writer_since",
            }
        ),
        story_count=total,
        published_count=pub,
    )


@router.get("/users", response_model=Page[AdminUserRow])
def list_users(
    q: str | None = Query(None, max_length=100),
    role: str | None = Query(None, pattern="^(reader|writer|admin)$"),
    status_filter: str | None = Query(None, alias="status", pattern="^(active|suspended)$"),
    sort: str = Query("newest", pattern="^(newest|oldest|stories)$"),
    page: int = 1,
    page_size: int = 25,
    db: Session = Depends(get_session),
    _: User = Depends(get_current_admin),
):
    page, page_size = _paging(page, page_size)
    query = _people()
    if q:
        pattern = _like(q)
        query = query.where(
            or_(
                col(User.email).ilike(pattern),
                col(User.handle).ilike(pattern),
                col(User.pen_name).ilike(pattern),
            )
        )
    if role == "reader":
        query = query.where(col(User.is_writer).is_(False), col(User.admin_role).is_(None))
    elif role == "writer":
        query = query.where(col(User.is_writer))
    elif role == "admin":
        query = query.where(col(User.admin_role).is_not(None))
    if status_filter:
        query = query.where(col(User.is_active).is_(status_filter == "active"))

    total = _count(db, query)
    if sort == "stories":
        story_total = (
            select(func.count())
            .where(col(Story.author_id) == col(User.id))
            .correlate(User)
            .scalar_subquery()
        )
        query = query.order_by(story_total.desc(), col(User.created_at).desc())
    else:
        created = col(User.created_at)
        query = query.order_by(created.asc() if sort == "oldest" else created.desc())
    users = list(db.exec(query.offset((page - 1) * page_size).limit(page_size)).all())
    counts = _story_counts(db, [u.id for u in users])
    return Page(
        items=[_user_row(u, counts) for u in users], total=total, page=page, page_size=page_size
    )


def _get_person(db: Session, user_id: UUID) -> User:
    user = db.get(User, user_id)
    if not user or user.is_system:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("/users/{user_id}", response_model=AdminUserDetail)
def get_user(
    user_id: UUID, db: Session = Depends(get_session), _: User = Depends(get_current_admin)
):
    user = _get_person(db, user_id)
    counts = _story_counts(db, [user.id])
    stories = db.exec(
        select(Story).where(Story.author_id == user.id).order_by(col(Story.updated_at).desc())
    ).all()
    return AdminUserDetail(
        **_user_row(user, counts).model_dump(),
        bio=user.bio,
        tagline=user.tagline,
        location=user.location,
        stories=_story_rows(db, list(stories)),
    )


@router.patch("/users/{user_id}", response_model=AdminUserRow)
def update_user(
    user_id: UUID,
    data: AdminUserUpdate,
    db: Session = Depends(get_session),
    admin: User = Depends(get_current_admin),
):
    user = _get_person(db, user_id)
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="You can't change your own account here")
    if is_admin(user):
        raise HTTPException(status_code=403, detail="Super admins can't be changed from the app")

    changes = data.model_dump(exclude_unset=True, exclude_none=True)
    if "is_writer" in changes and changes["is_writer"] and not user.pen_name:
        raise HTTPException(status_code=400, detail="This user has never set up a writer profile")
    for field, value in changes.items():
        if getattr(user, field) == value:
            continue
        setattr(user, field, value)
        action = {
            ("is_active", True): "user.reactivate",
            ("is_active", False): "user.suspend",
            ("is_writer", True): "user.restore_writer",
            ("is_writer", False): "user.revoke_writer",
        }[(field, value)]
        _audit(db, admin, action, "user", user.id, email=user.email)
    user.updated_at = _now()
    db.add(user)
    db.commit()
    db.refresh(user)
    return _user_row(user, _story_counts(db, [user.id]))


# ── Stories ──────────────────────────────────────────────────────────────────


def _story_rows(db: Session, stories: list[Story]) -> list[AdminStoryRow]:
    if not stories:
        return []
    ids = [s.id for s in stories]
    scene_counts = dict(
        db.exec(
            select(Scene.story_id, func.count())
            .where(col(Scene.story_id).in_(ids))
            .group_by(Scene.story_id)
        ).all()
    )
    authors = {
        u.id: u
        for u in db.exec(select(User).where(col(User.id).in_({s.author_id for s in stories}))).all()
    }
    rows = []
    for s in stories:
        author = authors.get(s.author_id)
        rows.append(
            AdminStoryRow(
                **s.model_dump(exclude={"scenes", "choices"}),
                author_name=(author.pen_name or author.handle) if author else None,
                author_handle=author.handle if author else None,
                author_tone=author.avatar_tone if author else None,
                is_official=bool(author and author.is_system),
                scene_count=scene_counts.get(s.id, 0),
            )
        )
    return rows


def _story_query(
    q: str | None,
    status_filter: StoryStatus | None,
    author: str | None,
    official: bool | None,
    featured: bool | None,
    genre: str | None,
    house_id: UUID,
):
    query = select(Story)
    if q:
        query = query.where(col(Story.title).ilike(_like(q)))
    if status_filter:
        query = query.where(Story.status == status_filter)
    if author:
        query = query.join(User, col(User.id) == col(Story.author_id)).where(
            col(User.handle) == author.strip().lower().lstrip("@")
        )
    if official is not None:
        query = query.where(
            (Story.author_id == house_id) if official else (Story.author_id != house_id)
        )
    if featured is not None:
        query = query.where(col(Story.is_featured).is_(featured))
    if genre:
        # genres is a JSON list; match the quoted canonical name.
        query = query.where(cast(Story.genres, String).ilike(_like(f'"{genre}"')))
    return query


_STORY_SORTS = {
    "updated": lambda: col(Story.updated_at).desc(),
    "newest": lambda: col(Story.created_at).desc(),
    "published": lambda: col(Story.published_at).desc().nulls_last(),
    "title": lambda: func.lower(Story.title).asc(),
    "featured": lambda: col(Story.featured_rank).asc().nulls_last(),
}


@router.get("/stories", response_model=Page[AdminStoryRow])
def list_stories(
    q: str | None = Query(None, max_length=100),
    status_filter: StoryStatus | None = Query(None, alias="status"),
    author: str | None = Query(None, max_length=40, description="Author handle"),
    official: bool | None = None,
    featured: bool | None = None,
    genre: str | None = Query(None, max_length=40),
    sort: str = Query("updated", pattern="^(updated|newest|published|title|featured)$"),
    page: int = 1,
    page_size: int = 25,
    db: Session = Depends(get_session),
    _: User = Depends(get_current_admin),
):
    page, page_size = _paging(page, page_size)
    house = get_house_account(db)
    query = _story_query(q, status_filter, author, official, featured, genre, house.id)
    total = _count(db, query)
    stories = db.exec(
        query.order_by(_STORY_SORTS[sort](), col(Story.updated_at).desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return Page(items=_story_rows(db, list(stories)), total=total, page=page, page_size=page_size)


def _get_story(db: Session, story_id: UUID) -> Story:
    story = db.get(Story, story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    return story


def _story_detail(db: Session, story: Story) -> AdminStoryDetail:
    scenes = db.exec(select(Scene).where(Scene.story_id == story.id)).all()
    choices = db.exec(select(Choice).where(Choice.story_id == story.id)).all()
    health = analyze(
        [Node(s.id, str(s.scene_type)) for s in scenes],
        [(c.from_scene_id, c.to_scene_id) for c in choices],
    )
    issues = (
        [Issue(level=level, message=msg) for level, msg in health.issues]
        if scenes
        else [Issue(level="error", message="The story has no scenes.")]
    )
    row = _story_rows(db, [story])[0]
    return AdminStoryDetail(
        **row.model_dump(),
        description=story.description,
        moods=story.moods or [],
        tags=story.tags or [],
        words=sum(len(s.content.split()) for s in scenes),
        choice_count=len(choices),
        issues=issues,
        scenes=[SceneRead.model_validate(s, from_attributes=True) for s in scenes],
        choices=[ChoiceRead.model_validate(c, from_attributes=True) for c in choices],
    )


def _require_publishable(db: Session, story: Story) -> None:
    """Same blocking checks as the editor's publish button (errors only; warnings are fine)."""
    scenes = db.exec(select(Scene.id, Scene.scene_type).where(Scene.story_id == story.id)).all()
    if not scenes:
        raise HTTPException(status_code=400, detail="Add at least one scene before publishing")
    edges = db.exec(
        select(Choice.from_scene_id, Choice.to_scene_id).where(Choice.story_id == story.id)
    ).all()
    health = analyze([Node(sid, str(t)) for sid, t in scenes], list(edges))
    errors = [msg for level, msg in health.issues if level == "error"]
    if errors:
        raise HTTPException(status_code=400, detail=f"Can't publish yet: {errors[0]}")


@router.get("/stories/{story_id}", response_model=AdminStoryDetail)
def get_story(
    story_id: UUID, db: Session = Depends(get_session), _: User = Depends(get_current_admin)
):
    return _story_detail(db, _get_story(db, story_id))


@router.patch("/stories/{story_id}", response_model=AdminStoryDetail)
def update_story(
    story_id: UUID,
    data: AdminStoryUpdate,
    db: Session = Depends(get_session),
    admin: User = Depends(get_current_admin),
):
    story = _get_story(db, story_id)
    author = db.get(User, story.author_id)
    official = bool(author and author.is_system)
    changes = data.model_dump(exclude_unset=True)
    now = _now()

    new_status = changes.get("status")
    if new_status and new_status != story.status:
        # Writers publish their own work; admins can only take it down or restore it to draft.
        if new_status == StoryStatus.published and not official:
            raise HTTPException(status_code=400, detail="Only the writer can publish their story")
        if new_status == StoryStatus.published:
            _require_publishable(db, story)
        _audit(
            db,
            admin,
            {
                StoryStatus.published: "story.publish",
                StoryStatus.draft: "story.unpublish",
                StoryStatus.archived: "story.archive",
            }[new_status],
            "story",
            story.id,
            title=story.title,
            previous=story.status,
        )
        story.status = new_status
        if new_status == StoryStatus.published and story.published_at is None:
            story.published_at = now
        if new_status != StoryStatus.published and story.is_featured:
            story.is_featured = False
            _audit(db, admin, "story.unfeature", "story", story.id, title=story.title)

    if "is_featured" in changes and changes["is_featured"] is not None:
        feature = changes["is_featured"]
        if feature and story.status != StoryStatus.published:
            raise HTTPException(status_code=400, detail="Only published stories can be featured")
        if feature != story.is_featured:
            story.is_featured = feature
            _audit(
                db,
                admin,
                "story.feature" if feature else "story.unfeature",
                "story",
                story.id,
                title=story.title,
            )
    if "featured_rank" in changes and changes["featured_rank"] != story.featured_rank:
        story.featured_rank = changes["featured_rank"]
        _audit(db, admin, "story.rank", "story", story.id, rank=story.featured_rank)

    story.updated_at = now
    db.add(story)
    db.commit()
    db.refresh(story)
    return _story_detail(db, story)


@router.delete("/stories/{story_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_story(
    story_id: UUID,
    db: Session = Depends(get_session),
    admin: User = Depends(get_current_admin),
):
    story = _get_story(db, story_id)
    author = db.get(User, story.author_id)
    _audit(
        db,
        admin,
        "story.delete",
        "story",
        story.id,
        title=story.title,
        author=(author.handle or author.email) if author else None,
        status=story.status,
    )
    db.delete(story)
    db.commit()


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")[:40] or "scene"


@router.get("/stories/{story_id}/export")
def export_story(
    story_id: UUID, db: Session = Depends(get_session), _: User = Depends(get_current_admin)
):
    story = _get_story(db, story_id)
    scenes = db.exec(
        select(Scene)
        .where(Scene.story_id == story.id)
        .order_by(col(Scene.position_y), col(Scene.position_x))
    ).all()
    choices = db.exec(
        select(Choice).where(Choice.story_id == story.id).order_by(col(Choice.display_order))
    ).all()
    scenes = sorted(scenes, key=lambda s: s.scene_type != "start")
    keys: dict[UUID, str] = {}
    used: set[str] = set()
    for s in scenes:
        base = "start" if s.scene_type == "start" and "start" not in used else _slug(s.title)
        key, n = base, 2
        while key in used:
            key, n = f"{base}-{n}", n + 1
        used.add(key)
        keys[s.id] = key

    by_source: dict[UUID, list[Choice]] = {}
    for c in choices:
        by_source.setdefault(c.from_scene_id, []).append(c)

    body = {
        "format": IMPORT_FORMAT,
        "version": IMPORT_VERSION,
        "stories": [
            {
                "title": story.title,
                "description": story.description,
                "genres": story.genres or [],
                "moods": story.moods or [],
                "content_rating": story.content_rating,
                "tags": story.tags or [],
                "status": "published" if story.status == StoryStatus.published else "draft",
                "scenes": [
                    {
                        "key": keys[s.id],
                        "type": str(s.scene_type),
                        "title": s.title,
                        "content": s.content,
                        "position": {"x": s.position_x, "y": s.position_y},
                        "choices": [
                            {"text": c.text, "to": keys[c.to_scene_id]}
                            for c in by_source.get(s.id, [])
                            if c.to_scene_id in keys
                        ],
                    }
                    for s in scenes
                ],
            }
        ],
    }
    filename = f"{_slug(story.title)}.narrive.json"
    return Response(
        content=json.dumps(body, indent=2, ensure_ascii=False),
        media_type="application/json",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ── Narrive Originals ────────────────────────────────────────────────────────


@router.get("/originals", response_model=list[AdminStoryRow])
def list_originals(db: Session = Depends(get_session), _: User = Depends(get_current_admin)):
    house = get_house_account(db)
    stories = db.exec(
        select(Story).where(Story.author_id == house.id).order_by(col(Story.updated_at).desc())
    ).all()
    return _story_rows(db, list(stories))


@router.post("/originals", response_model=AdminStoryRow, status_code=status.HTTP_201_CREATED)
def create_original(
    data: StoryCreate,
    db: Session = Depends(get_session),
    admin: User = Depends(get_current_admin),
):
    house = get_house_account(db)
    story = Story(**data.model_dump(), author_id=house.id)
    db.add(story)
    db.flush()
    _audit(db, admin, "original.create", "story", story.id, title=story.title)
    db.commit()
    db.refresh(story)
    return _story_rows(db, [story])[0]


# ── Bulk import ──────────────────────────────────────────────────────────────


def _limit_size(request: Request) -> None:
    length = request.headers.get("content-length")
    if length and length.isdigit() and int(length) > MAX_IMPORT_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"Import files can be at most {MAX_IMPORT_BYTES // 1024 // 1024} MB",
        )


@router.post("/imports/validate", response_model=ImportReport, dependencies=[Depends(_limit_size)])
def validate_stories(
    payload: Any = Body(...),
    db: Session = Depends(get_session),
    _: User = Depends(get_current_admin),
):
    report, _stories = validate_import(payload, db, get_house_account(db))
    return report


@router.post(
    "/imports",
    response_model=ImportResult,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(_limit_size)],
)
def import_stories(
    payload: Any = Body(...),
    db: Session = Depends(get_session),
    admin: User = Depends(get_current_admin),
):
    house = get_house_account(db)
    report, parsed = validate_import(payload, db, house)
    if not report.valid:
        raise HTTPException(status_code=422, detail=report.model_dump(mode="json"))
    batch, stories = commit_import(parsed, db, house, admin)
    _audit(
        db,
        admin,
        "import.commit",
        "import",
        batch.id,
        stories=batch.story_count,
        scenes=batch.scene_count,
    )
    db.commit()
    return ImportResult(
        import_id=str(batch.id),
        stories=[ImportResultStory(id=str(s.id), title=s.title, status=s.status) for s in stories],
        report=report,
    )


@router.get("/imports", response_model=list[ImportRow])
def list_imports(db: Session = Depends(get_session), _: User = Depends(get_current_admin)):
    batches = db.exec(
        select(StoryImport).order_by(col(StoryImport.created_at).desc()).limit(50)
    ).all()
    if not batches:
        return []
    ids = [b.id for b in batches]
    counts = {
        import_id: (total, pub)
        for import_id, total, pub in db.exec(
            select(
                Story.import_id,
                func.count(),
                func.count().filter(Story.status == StoryStatus.published),
            )
            .where(col(Story.import_id).in_(ids))
            .group_by(Story.import_id)
        ).all()
    }
    emails = dict(
        db.exec(
            select(User.id, User.email).where(col(User.id).in_({b.actor_id for b in batches}))
        ).all()
    )
    return [
        ImportRow(
            id=b.id,
            actor_id=b.actor_id,
            actor_email=emails.get(b.actor_id),
            story_count=b.story_count,
            scene_count=b.scene_count,
            remaining=counts.get(b.id, (0, 0))[0],
            published=counts.get(b.id, (0, 0))[1],
            created_at=b.created_at,
        )
        for b in batches
    ]


@router.delete("/imports/{import_id}", status_code=status.HTTP_204_NO_CONTENT)
def undo_import(
    import_id: UUID,
    force: bool = False,
    db: Session = Depends(get_session),
    admin: User = Depends(get_current_admin),
):
    batch = db.get(StoryImport, import_id)
    if not batch:
        raise HTTPException(status_code=404, detail="Import not found")
    stories = stories_in_import(db, batch.id)
    live = [s for s in stories if s.status == StoryStatus.published]
    if live and not force:
        raise HTTPException(
            status_code=409,
            detail=f"{len(live)} stor{'ies are' if len(live) > 1 else 'y is'} published. "
            "Undo anyway to delete them too.",
        )
    _audit(
        db,
        admin,
        "import.undo",
        "import",
        batch.id,
        deleted=len(stories),
        titles=[s.title for s in stories][:20],
    )
    for story in stories:
        db.delete(story)
    db.flush()
    db.delete(batch)
    db.commit()


# ── Audit log ────────────────────────────────────────────────────────────────


def _audit_entries(db: Session, query) -> list[AuditEntry]:
    rows = db.exec(query).all()
    emails = (
        dict(
            db.exec(
                select(User.id, User.email).where(col(User.id).in_({r.actor_id for r in rows}))
            ).all()
        )
        if rows
        else {}
    )
    return [AuditEntry(**r.model_dump(), actor_email=emails.get(r.actor_id)) for r in rows]


@router.get("/audit", response_model=Page[AuditEntry])
def audit_log(
    action: str | None = Query(
        None, max_length=40, description="Exact action or prefix like 'story.'"
    ),
    target_id: str | None = Query(None, max_length=64),
    actor: UUID | None = None,
    since: date | None = None,
    page: int = 1,
    page_size: int = 50,
    db: Session = Depends(get_session),
    _: User = Depends(get_current_admin),
):
    page, page_size = _paging(page, page_size)
    query = select(AdminAction)
    if action:
        query = query.where(
            col(AdminAction.action).startswith(action)
            if action.endswith(".")
            else AdminAction.action == action
        )
    if target_id:
        query = query.where(AdminAction.target_id == target_id)
    if actor:
        query = query.where(AdminAction.actor_id == actor)
    if since:
        start = datetime.combine(since, datetime.min.time(), tzinfo=UTC)
        query = query.where(AdminAction.created_at >= start)
    total = _count(db, query)
    items = _audit_entries(
        db,
        query.order_by(col(AdminAction.created_at).desc())
        .offset((page - 1) * page_size)
        .limit(page_size),
    )
    return Page(items=items, total=total, page=page, page_size=page_size)
