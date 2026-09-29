"""Create a user account from the command line (optionally a super admin).

    python -m app.scripts.create_user someone@example.com
    python -m app.scripts.create_user someone@example.com --admin
    python -m app.scripts.create_user someone@example.com --reset-password

The password is asked for twice at a hidden prompt, so it never lands in your shell history.
Pass --password only for non-interactive use.

To run it against production, point it at Neon's unpooled URL (migrations must be applied):

    SQLALCHEMY_DATABASE_URI="postgresql://…?sslmode=require" python -m app.scripts.create_user …
"""

import argparse
import getpass
import sys

from pydantic import ValidationError
from sqlmodel import Session, func, select

from app.core.config import settings
from app.core.database import engine
from app.core.deps import SUPERADMIN
from app.core.security import hash_password
from app.models.user import User
from app.schemas.auth import UserCreate

MIN_PASSWORD = 8


def _ask_password() -> str:
    first = getpass.getpass("Password: ")
    second = getpass.getpass("Repeat password: ")
    if first != second:
        raise SystemExit("Passwords don't match.")
    return first


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("email")
    parser.add_argument("--password", help="skip the prompt (visible in shell history)")
    parser.add_argument("--admin", action="store_true", help="also grant super admin")
    parser.add_argument(
        "--reset-password",
        action="store_true",
        help="if the account exists, set a new password instead of failing",
    )
    args = parser.parse_args()

    host = settings.SQLALCHEMY_DATABASE_URI.split("@")[-1].split("/")[0].split("?")[0]
    print(f"Database: {host}")

    password = args.password or _ask_password()
    if len(password) < MIN_PASSWORD:
        print(f"Password must be at least {MIN_PASSWORD} characters.", file=sys.stderr)
        return 1
    try:
        # Same validation as the sign-up/sign-in API, so the account can actually sign in.
        email = UserCreate(email=args.email.strip(), password=password).email
    except ValidationError:
        print(f"{args.email} isn't a valid email address.", file=sys.stderr)
        return 1

    with Session(engine) as db:
        user = db.exec(select(User).where(func.lower(User.email) == email.lower())).first()
        if user and user.is_system:
            print("That's the Narrive system account; it can't be signed in to.", file=sys.stderr)
            return 1
        if user and not args.reset_password:
            print(
                f"{email} already exists. Use --reset-password to set a new password.",
                file=sys.stderr,
            )
            return 1

        created = user is None
        if created:
            user = User(email=email, hashed_password=hash_password(password))
        else:
            user.hashed_password = hash_password(password)
            user.is_active = True
        if args.admin:
            user.admin_role = SUPERADMIN
        db.add(user)
        db.commit()
        db.refresh(user)

    role = "super admin" if user.admin_role else ("writer" if user.is_writer else "reader")
    print(f"{'Created' if created else 'Updated'} {email} ({role}). They can sign in now.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
