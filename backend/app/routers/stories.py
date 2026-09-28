from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from app.core.database import get_session
from app.core.deps import get_current_writer_id
from app.models.story import Choice, Scene, Story
from app.schemas.story import (
    ChoiceCreate,
    ChoiceRead,
    ChoiceUpdate,
    SceneCreate,
    SceneRead,
    SceneUpdate,
    StoryCreate,
    StoryDetail,
    StoryRead,
    StoryUpdate,
)

router = APIRouter(prefix="/stories", tags=["stories"])


def _story_read(story: Story) -> StoryRead:
    return StoryRead(
        **story.model_dump(exclude={"scenes", "choices"}),
        scene_count=len(story.scenes) if story.scenes else 0,
    )


def _get_story_owned(story_id: UUID, user_id: str, db: Session) -> Story:
    story = db.get(Story, story_id)
    if not story:
        raise HTTPException(status_code=404, detail="Story not found")
    if str(story.author_id) != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return story


def _check_choice_link(story_id: UUID, from_id: UUID, to_id: UUID, db: Session) -> None:
    """Both ends of a choice must be scenes in this story, and a choice can't loop to itself."""
    if from_id == to_id:
        raise HTTPException(status_code=422, detail="A choice can't lead back to its own scene")
    for scene_id in (from_id, to_id):
        scene = db.get(Scene, scene_id)
        if not scene or scene.story_id != story_id:
            raise HTTPException(status_code=422, detail="Scene not found in this story")


# ── Stories ─────────────────────────────────────────────────────────────────


@router.get("", response_model=list[StoryRead])
def list_stories(
    db: Session = Depends(get_session),
    user_id: str = Depends(get_current_writer_id),
):
    stories = db.exec(select(Story).where(Story.author_id == UUID(user_id))).all()
    return [_story_read(s) for s in stories]


@router.post("", response_model=StoryRead, status_code=status.HTTP_201_CREATED)
def create_story(
    data: StoryCreate,
    db: Session = Depends(get_session),
    user_id: str = Depends(get_current_writer_id),
):
    story = Story(**data.model_dump(), author_id=UUID(user_id))
    db.add(story)
    db.commit()
    db.refresh(story)
    return _story_read(story)


@router.get("/{story_id}", response_model=StoryDetail)
def get_story(
    story_id: UUID,
    db: Session = Depends(get_session),
    user_id: str = Depends(get_current_writer_id),
):
    story = _get_story_owned(story_id, user_id, db)
    scenes = db.exec(select(Scene).where(Scene.story_id == story_id)).all()
    choices = db.exec(select(Choice).where(Choice.story_id == story_id)).all()
    return StoryDetail(
        **story.model_dump(exclude={"scenes", "choices"}),
        scene_count=len(scenes),
        scenes=[SceneRead.model_validate(s, from_attributes=True) for s in scenes],
        choices=[ChoiceRead.model_validate(c, from_attributes=True) for c in choices],
    )


@router.patch("/{story_id}", response_model=StoryRead)
def update_story(
    story_id: UUID,
    data: StoryUpdate,
    db: Session = Depends(get_session),
    user_id: str = Depends(get_current_writer_id),
):
    story = _get_story_owned(story_id, user_id, db)
    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(story, key, value)
    story.updated_at = datetime.now(UTC)
    db.add(story)
    db.commit()
    db.refresh(story)
    return _story_read(story)


@router.delete("/{story_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_story(
    story_id: UUID,
    db: Session = Depends(get_session),
    user_id: str = Depends(get_current_writer_id),
):
    story = _get_story_owned(story_id, user_id, db)
    db.delete(story)
    db.commit()


# ── Scenes ───────────────────────────────────────────────────────────────────


@router.post("/{story_id}/scenes", response_model=SceneRead, status_code=status.HTTP_201_CREATED)
def create_scene(
    story_id: UUID,
    data: SceneCreate,
    db: Session = Depends(get_session),
    user_id: str = Depends(get_current_writer_id),
):
    _get_story_owned(story_id, user_id, db)
    scene = Scene(**data.model_dump(), story_id=story_id)
    db.add(scene)
    db.commit()
    db.refresh(scene)
    return scene


@router.patch("/{story_id}/scenes/{scene_id}", response_model=SceneRead)
def update_scene(
    story_id: UUID,
    scene_id: UUID,
    data: SceneUpdate,
    db: Session = Depends(get_session),
    user_id: str = Depends(get_current_writer_id),
):
    _get_story_owned(story_id, user_id, db)
    scene = db.get(Scene, scene_id)
    if not scene or scene.story_id != story_id:
        raise HTTPException(status_code=404, detail="Scene not found")
    updates = data.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(scene, key, value)
    scene.updated_at = datetime.now(UTC)
    db.add(scene)
    db.commit()
    db.refresh(scene)
    return scene


@router.delete("/{story_id}/scenes/{scene_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_scene(
    story_id: UUID,
    scene_id: UUID,
    db: Session = Depends(get_session),
    user_id: str = Depends(get_current_writer_id),
):
    _get_story_owned(story_id, user_id, db)
    scene = db.get(Scene, scene_id)
    if not scene or scene.story_id != story_id:
        raise HTTPException(status_code=404, detail="Scene not found")
    # Also delete choices referencing this scene
    choices = db.exec(
        select(Choice).where((Choice.from_scene_id == scene_id) | (Choice.to_scene_id == scene_id))
    ).all()
    for c in choices:
        db.delete(c)
    db.delete(scene)
    db.commit()


# ── Choices ──────────────────────────────────────────────────────────────────


@router.post("/{story_id}/choices", response_model=ChoiceRead, status_code=status.HTTP_201_CREATED)
def create_choice(
    story_id: UUID,
    data: ChoiceCreate,
    db: Session = Depends(get_session),
    user_id: str = Depends(get_current_writer_id),
):
    _get_story_owned(story_id, user_id, db)
    _check_choice_link(story_id, data.from_scene_id, data.to_scene_id, db)
    choice = Choice(**data.model_dump(), story_id=story_id)
    db.add(choice)
    db.commit()
    db.refresh(choice)
    return choice


@router.patch("/{story_id}/choices/{choice_id}", response_model=ChoiceRead)
def update_choice(
    story_id: UUID,
    choice_id: UUID,
    data: ChoiceUpdate,
    db: Session = Depends(get_session),
    user_id: str = Depends(get_current_writer_id),
):
    _get_story_owned(story_id, user_id, db)
    choice = db.get(Choice, choice_id)
    if not choice or choice.story_id != story_id:
        raise HTTPException(status_code=404, detail="Choice not found")
    updates = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if "from_scene_id" in updates or "to_scene_id" in updates:
        _check_choice_link(
            story_id,
            updates.get("from_scene_id", choice.from_scene_id),
            updates.get("to_scene_id", choice.to_scene_id),
            db,
        )
    for key, value in updates.items():
        setattr(choice, key, value)
    choice.updated_at = datetime.now(UTC)
    db.add(choice)
    db.commit()
    db.refresh(choice)
    return choice


@router.delete("/{story_id}/choices/{choice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_choice(
    story_id: UUID,
    choice_id: UUID,
    db: Session = Depends(get_session),
    user_id: str = Depends(get_current_writer_id),
):
    _get_story_owned(story_id, user_id, db)
    choice = db.get(Choice, choice_id)
    if not choice or choice.story_id != story_id:
        raise HTTPException(status_code=404, detail="Choice not found")
    db.delete(choice)
    db.commit()
