from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, col, func, select

from app.core.database import get_session
from app.models.story import Choice, Scene, Story, StoryStatus
from app.models.user import User
from app.schemas.story import (
    ChoiceRead,
    PublicAuthor,
    PublicStoryDetail,
    PublicStoryRead,
    SceneRead,
)
from app.schemas.writer import PublicWriter, WriterStats

router = APIRouter(prefix="/public", tags=["public"])


def _authors(db: Session, author_ids: set[UUID]) -> dict[UUID, PublicAuthor]:
    if not author_ids:
        return {}
    rows = db.exec(
        select(User.id, User.pen_name, User.handle, User.avatar_tone).where(
            col(User.id).in_(author_ids)
        )
    ).all()
    return {
        uid: PublicAuthor(author_name=pen_name or handle, author_handle=handle, author_tone=tone)
        for uid, pen_name, handle, tone in rows
    }


def _scene_counts(db: Session, story_ids: list[UUID]) -> dict[UUID, int]:
    if not story_ids:
        return {}
    return dict(
        db.exec(
            select(Scene.story_id, func.count())
            .where(col(Scene.story_id).in_(story_ids))
            .group_by(Scene.story_id)
        ).all()
    )


def _story_list(db: Session, stories: list[Story]) -> list[PublicStoryRead]:
    counts = _scene_counts(db, [s.id for s in stories])
    authors = _authors(db, {s.author_id for s in stories})
    return [
        PublicStoryRead(
            **story.model_dump(exclude={"scenes", "choices"}),
            **(authors.get(story.author_id) or PublicAuthor()).model_dump(),
            scene_count=counts.get(story.id, 0),
        )
        for story in stories
    ]


@router.get("/stories", response_model=list[PublicStoryRead])
def list_published_stories(db: Session = Depends(get_session)):
    stories = db.exec(select(Story).where(Story.status == StoryStatus.published)).all()
    return _story_list(db, list(stories))


@router.get("/stories/{story_id}", response_model=PublicStoryDetail)
def get_published_story(story_id: UUID, db: Session = Depends(get_session)):
    story = db.get(Story, story_id)
    if not story or story.status != StoryStatus.published:
        raise HTTPException(status_code=404, detail="Story not found")
    scenes = db.exec(select(Scene).where(Scene.story_id == story_id)).all()
    choices = db.exec(select(Choice).where(Choice.story_id == story_id)).all()
    author = _authors(db, {story.author_id}).get(story.author_id) or PublicAuthor()
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
    story_list = _story_list(db, stories)
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
            scenes=sum(s.scene_count for s in story_list),
            choices=choice_count,
        ),
        stories=story_list,
    )
