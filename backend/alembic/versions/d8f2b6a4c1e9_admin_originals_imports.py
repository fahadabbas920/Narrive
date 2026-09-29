"""super admin, narrive originals, bulk imports

Revision ID: d8f2b6a4c1e9
Revises: c4e9a1f2d7b3
Create Date: 2026-09-29 10:00:00.000000

"""

import secrets
import uuid
from collections.abc import Sequence
from datetime import UTC, datetime

import bcrypt
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "d8f2b6a4c1e9"
down_revision: str | None = "c4e9a1f2d7b3"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _has_table(name: str) -> bool:
    # The app's startup create_all may already have made the new tables (not the new columns).
    return sa.inspect(op.get_bind()).has_table(name)


def upgrade() -> None:
    op.add_column(
        "users", sa.Column("admin_role", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True)
    )
    op.add_column(
        "users",
        sa.Column("is_system", sa.Boolean(), nullable=False, server_default=sa.false()),
    )

    if not _has_table("imports"):
        op.create_table(
            "imports",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("actor_id", sa.Uuid(), nullable=False),
            sa.Column("story_count", sa.Integer(), nullable=False),
            sa.Column("scene_count", sa.Integer(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["actor_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
    if not _has_table("admin_actions"):
        op.create_table(
            "admin_actions",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("actor_id", sa.Uuid(), nullable=False),
            sa.Column("action", sqlmodel.sql.sqltypes.AutoString(length=40), nullable=False),
            sa.Column("target_type", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
            sa.Column("target_id", sqlmodel.sql.sqltypes.AutoString(length=64), nullable=True),
            sa.Column("details", postgresql.JSON(astext_type=sa.Text()), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["actor_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_admin_actions_actor_id", "admin_actions", ["actor_id"])
        op.create_index("ix_admin_actions_action", "admin_actions", ["action"])
        op.create_index("ix_admin_actions_target_id", "admin_actions", ["target_id"])
        op.create_index("ix_admin_actions_created_at", "admin_actions", ["created_at"])

    op.add_column("stories", sa.Column("published_at", sa.DateTime(), nullable=True))
    op.add_column(
        "stories",
        sa.Column("is_featured", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.add_column("stories", sa.Column("featured_rank", sa.Integer(), nullable=True))
    op.add_column("stories", sa.Column("import_id", sa.Uuid(), nullable=True))
    op.create_index("ix_stories_import_id", "stories", ["import_id"])
    op.create_foreign_key(
        "fk_stories_import_id", "stories", "imports", ["import_id"], ["id"], ondelete="SET NULL"
    )

    bind = op.get_bind()
    bind.execute(sa.text("UPDATE stories SET published_at = updated_at WHERE status = 'published'"))

    # The Narrive house account. Its password hash matches no password, so nobody can sign in.
    exists = bind.execute(sa.text("SELECT 1 FROM users WHERE handle = 'narrive'")).first()
    if not exists:
        now = datetime.now(UTC).replace(tzinfo=None)
        unusable = bcrypt.hashpw(secrets.token_bytes(32).hex().encode(), bcrypt.gensalt()).decode()
        bind.execute(
            sa.text(
                """
                INSERT INTO users (id, email, hashed_password, is_active, is_writer, is_system,
                    pen_name, handle, tagline, bio, genres, social_links, avatar_tone, cover_tone,
                    writer_since, created_at, updated_at)
                VALUES (:id, 'originals@narrive.system', :pw, true, true, true,
                    'Narrive Originals', 'narrive', 'Stories from the Narrive team',
                    'Hand-picked branching stories, written and curated by the Narrive team.',
                    '[]', '[]', 'butter', 'peach', :now, :now, :now)
                """
            ),
            {"id": uuid.uuid4(), "pw": unusable, "now": now},
        )


def downgrade() -> None:
    op.execute("DELETE FROM users WHERE is_system")
    op.drop_constraint("fk_stories_import_id", "stories", type_="foreignkey")
    op.drop_index("ix_stories_import_id", table_name="stories")
    for column in ("import_id", "featured_rank", "is_featured", "published_at"):
        op.drop_column("stories", column)
    op.drop_table("admin_actions")
    op.drop_table("imports")
    op.drop_column("users", "is_system")
    op.drop_column("users", "admin_role")
