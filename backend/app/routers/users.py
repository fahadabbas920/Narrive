from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session

from app.core.database import get_session
from app.core.deps import get_current_user
from app.core.handles import handle_taken, unique_handle, validate_handle
from app.core.security import token_for
from app.models.user import User
from app.schemas.auth import (
    BecomeWriter,
    HandleAvailability,
    ProfileUpdate,
    UserRead,
    WriterUpgrade,
)

router = APIRouter(prefix="/users", tags=["users"])

# Fields a writer can't clear once set; an explicit null is ignored for these.
_REQUIRED_ON_PROFILE = {"pen_name", "handle", "avatar_tone", "cover_tone", "genres", "social_links"}


@router.post("/me/become-writer", response_model=WriterUpgrade)
def become_writer(
    data: BecomeWriter,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    now = datetime.now(UTC)
    user.pen_name = data.pen_name
    user.bio = data.bio or None
    user.genres = data.genres
    if not user.handle:
        user.handle = unique_handle(db, data.pen_name)
    if not user.is_writer:
        user.is_writer = True
        user.writer_since = now
    user.updated_at = now
    db.add(user)
    db.commit()
    db.refresh(user)
    return WriterUpgrade(
        access_token=token_for(user),
        user=UserRead.model_validate(user, from_attributes=True),
    )


def _require_writer(user: User) -> None:
    if not user.is_writer:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Writer profile required")


@router.patch("/me/profile", response_model=UserRead)
def update_profile(
    data: ProfileUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    _require_writer(user)
    updates = data.model_dump(exclude_unset=True)
    for field in _REQUIRED_ON_PROFILE:
        if field in updates and updates[field] is None:
            del updates[field]

    if "handle" in updates and handle_taken(db, updates["handle"], exclude_user=user):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="That handle is already taken"
        )

    for key, value in updates.items():
        setattr(user, key, value)
    user.updated_at = datetime.now(UTC)
    db.add(user)
    try:
        db.commit()
    except IntegrityError as err:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="That handle is already taken"
        ) from err
    db.refresh(user)
    return user


@router.get("/handle-available", response_model=HandleAvailability)
def handle_available(
    handle: str = Query(..., max_length=60),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_session),
):
    try:
        clean = validate_handle(handle)
    except ValueError as err:
        return HandleAvailability(handle=handle, available=False, reason=str(err))
    if clean == user.handle:
        return HandleAvailability(handle=clean, available=True)
    if handle_taken(db, clean, exclude_user=user):
        return HandleAvailability(
            handle=clean, available=False, reason="That handle is already taken"
        )
    return HandleAvailability(handle=clean, available=True)
