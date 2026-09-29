"""Narrive Originals are ordinary stories owned by the Narrive house account (is_system)."""

from fastapi import HTTPException
from sqlmodel import Session, select

from app.models.user import User

NARRIVE_HANDLE = "narrive"


def get_house_account(db: Session) -> User:
    user = db.exec(select(User).where(User.is_system, User.handle == NARRIVE_HANDLE)).first()
    if not user:
        # Created by migration d8f2b6a4c1e9; missing means migrations haven't run.
        raise HTTPException(status_code=500, detail="Narrive account missing — run migrations")
    return user
