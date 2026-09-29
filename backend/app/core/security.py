from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

from app.core.config import settings

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/signin")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def create_access_token(
    subject: str | Any,
    expires_delta: timedelta | None = None,
    *,
    is_writer: bool = False,
    is_admin: bool = False,
) -> str:
    expire = datetime.now(UTC) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    # is_writer / is_admin are routing hints for the frontend proxy only; the API re-checks the DB.
    claims: dict[str, Any] = {"sub": str(subject), "exp": expire, "is_writer": is_writer}
    if is_admin:
        claims["is_admin"] = True
    return jwt.encode(
        claims,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM,
    )


def token_for(user: Any) -> str:
    return create_access_token(
        subject=str(user.id), is_writer=user.is_writer, is_admin=bool(user.admin_role)
    )


def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str | None = payload.get("sub")
        if user_id is None:
            raise credentials_exc
    except JWTError as err:
        raise credentials_exc from err
    return user_id
