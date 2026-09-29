"""Grant or revoke the super admin role. This is the only way to create an admin.

    python -m app.scripts.make_admin you@example.com
    python -m app.scripts.make_admin you@example.com --revoke

Point SQLALCHEMY_DATABASE_URI at production (Neon's unpooled URL) to run it there. The user
must sign out and back in to pick up the new routing hint in their token.
"""

import argparse
import sys

from sqlmodel import Session, func, select

from app.core.database import engine
from app.core.deps import SUPERADMIN
from app.models.user import User


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("email")
    parser.add_argument("--revoke", action="store_true", help="remove the role instead")
    args = parser.parse_args()

    with Session(engine) as db:
        user = db.exec(select(User).where(func.lower(User.email) == args.email.lower())).first()
        if not user or user.is_system:
            print(f"No account with the email {args.email}", file=sys.stderr)
            return 1
        user.admin_role = None if args.revoke else SUPERADMIN
        db.add(user)
        db.commit()
    verb = "Revoked super admin from" if args.revoke else "Granted super admin to"
    print(f"{verb} {args.email}. Sign out and back in to see the change.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
