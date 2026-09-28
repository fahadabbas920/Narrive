"""writer public profile fields

Revision ID: c4e9a1f2d7b3
Revises: b7a3d2e91f10
Create Date: 2026-09-28 18:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

from alembic import op
from app.core.handles import MAX_LEN, RESERVED, slugify

revision: str = "c4e9a1f2d7b3"
down_revision: str | None = "b7a3d2e91f10"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users", sa.Column("handle", sqlmodel.sql.sqltypes.AutoString(length=30), nullable=True)
    )
    op.add_column(
        "users", sa.Column("tagline", sqlmodel.sql.sqltypes.AutoString(length=80), nullable=True)
    )
    op.add_column(
        "users", sa.Column("location", sqlmodel.sql.sqltypes.AutoString(length=60), nullable=True)
    )
    op.add_column(
        "users", sa.Column("website", sqlmodel.sql.sqltypes.AutoString(length=200), nullable=True)
    )
    op.add_column(
        "users", sa.Column("social_links", postgresql.JSON(astext_type=sa.Text()), nullable=True)
    )
    op.add_column(
        "users",
        sa.Column(
            "avatar_tone",
            sqlmodel.sql.sqltypes.AutoString(length=20),
            nullable=False,
            server_default="lavender",
        ),
    )
    op.add_column(
        "users",
        sa.Column(
            "cover_tone",
            sqlmodel.sql.sqltypes.AutoString(length=20),
            nullable=False,
            server_default="lavender",
        ),
    )

    # Every existing writer gets a unique handle from their pen name (or email name).
    bind = op.get_bind()
    writers = bind.execute(
        sa.text("SELECT id, pen_name, email FROM users WHERE is_writer ORDER BY created_at")
    ).fetchall()
    taken: set[str] = set(RESERVED)
    for uid, pen_name, email in writers:
        base = slugify(pen_name or email.split("@")[0])
        candidate, n = base, 2
        while candidate in taken:
            suffix = f"-{n}"
            candidate = f"{base[: MAX_LEN - len(suffix)]}{suffix}"
            n += 1
        taken.add(candidate)
        bind.execute(
            sa.text("UPDATE users SET handle = :h WHERE id = :id"), {"h": candidate, "id": uid}
        )

    op.create_index(op.f("ix_users_handle"), "users", ["handle"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_users_handle"), table_name="users")
    for column in (
        "cover_tone",
        "avatar_tone",
        "social_links",
        "website",
        "location",
        "tagline",
        "handle",
    ):
        op.drop_column("users", column)
