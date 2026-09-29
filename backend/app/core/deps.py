from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlmodel import Session

from app.core.database import get_session
from app.core.security import get_current_user_id
from app.models.user import User


def get_current_user(
    user_id: str = Depends(get_current_user_id),
    db: Session = Depends(get_session),
) -> User:
    user = db.get(User, UUID(user_id))
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_current_writer_id(user: User = Depends(get_current_user)) -> str:
    if not user.is_writer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Writer profile required",
        )
    return str(user.id)


SUPERADMIN = "superadmin"


def is_admin(user: User) -> bool:
    return user.admin_role == SUPERADMIN


def get_current_admin(user: User = Depends(get_current_user)) -> User:
    """The role is re-read from the DB on every request; the token claim is never trusted."""
    if not is_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user


def get_current_editor(user: User = Depends(get_current_user)) -> User:
    """Writers edit their own stories; admins also edit Narrive Originals.
    Per-story ownership is checked in the stories router."""
    if not user.is_writer and not is_admin(user):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Writer profile required",
        )
    return user
