from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.core.database import get_session
from app.models.story import Choice, Scene, Story, StoryStatus
from app.schemas.story import ChoiceRead, SceneRead, StoryDetail, StoryRead

router = APIRouter(prefix="/public", tags=["public"])


def _story_read(story: Story, scene_count: int) -> StoryRead:
    return StoryRead(
        **story.model_dump(exclude={"scenes", "choices"}),
        scene_count=scene_count,
    )


@router.get("/stories", response_model=list[StoryRead])
def list_published_stories(db: Session = Depends(get_session)):
    stories = db.exec(select(Story).where(Story.status == StoryStatus.published)).all()
    result = []
    for story in stories:
        scenes = db.exec(select(Scene).where(Scene.story_id == story.id)).all()
        result.append(_story_read(story, len(scenes)))
    return result


@router.get("/stories/{story_id}", response_model=StoryDetail)
def get_published_story(story_id: UUID, db: Session = Depends(get_session)):
    story = db.get(Story, story_id)
    if not story or story.status != StoryStatus.published:
        raise HTTPException(status_code=404, detail="Story not found")
    scenes = db.exec(select(Scene).where(Scene.story_id == story_id)).all()
    choices = db.exec(select(Choice).where(Choice.story_id == story_id)).all()
    return StoryDetail(
        **story.model_dump(exclude={"scenes", "choices"}),
        scene_count=len(scenes),
        scenes=[SceneRead.model_validate(s, from_attributes=True) for s in scenes],
        choices=[ChoiceRead.model_validate(c, from_attributes=True) for c in choices],
    )
