"""What readers can see: the public story list and author details, shared by the public and
reading routes."""

from uuid import UUID

from sqlmodel import Session, col, func, select

from app.models.story import Scene, Story, StoryStatus
from app.models.user import User
from app.schemas.story import PublicAuthor, PublicStoryRead


def author_details(db: Session, author_ids: set[UUID]) -> dict[UUID, PublicAuthor]:
    if not author_ids:
        return {}
    rows = db.exec(
        select(User.id, User.pen_name, User.handle, User.avatar_tone, User.is_system).where(
            col(User.id).in_(author_ids)
        )
    ).all()
    return {
        uid: PublicAuthor(
            author_name=pen_name or handle,
            author_handle=handle,
            author_tone=tone,
            is_official=is_system,
        )
        for uid, pen_name, handle, tone, is_system in rows
    }


def visible_stories(*columns):
    """Published stories whose author is still an active writer. Suspending an account or
    revoking writer access takes their stories out of the catalogue without deleting them.
    Pass columns to select just those instead of whole stories."""
    return (
        select(*columns or (Story,))
        .join(User, col(User.id) == col(Story.author_id))
        .where(Story.status == StoryStatus.published, col(User.is_active), col(User.is_writer))
    )


def scene_counts(db: Session, story_ids: list[UUID]) -> dict[UUID, int]:
    if not story_ids:
        return {}
    return dict(
        db.exec(
            select(Scene.story_id, func.count())
            .where(col(Scene.story_id).in_(story_ids))
            .group_by(Scene.story_id)
        ).all()
    )


def story_list(db: Session, stories: list[Story]) -> list[PublicStoryRead]:
    counts = scene_counts(db, [s.id for s in stories])
    authors = author_details(db, {s.author_id for s in stories})
    return [
        PublicStoryRead(
            **story.model_dump(exclude={"scenes", "choices"}),
            **(authors.get(story.author_id) or PublicAuthor()).model_dump(),
            scene_count=counts.get(story.id, 0),
        )
        for story in stories
    ]
