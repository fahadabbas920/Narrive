"""reading progress and read later

Revision ID: e1a7c3b5d9f2
Revises: d8f2b6a4c1e9
Create Date: 2026-09-29 16:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "e1a7c3b5d9f2"
down_revision: str | None = "d8f2b6a4c1e9"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _has_table(name: str) -> bool:
    # The app's startup create_all may already have made these tables.
    return sa.inspect(op.get_bind()).has_table(name)


def upgrade() -> None:
    if not _has_table("reading_progress"):
        op.create_table(
            "reading_progress",
            sa.Column("id", sa.Uuid(), nullable=False),
            sa.Column("user_id", sa.Uuid(), nullable=False),
            sa.Column("story_id", sa.Uuid(), nullable=False),
            sa.Column("current_scene_id", sa.Uuid(), nullable=True),
            sa.Column("history", postgresql.JSON(astext_type=sa.Text()), nullable=True),
            sa.Column("scenes_seen", postgresql.JSON(astext_type=sa.Text()), nullable=True),
            sa.Column("endings_found", postgresql.JSON(astext_type=sa.Text()), nullable=True),
            sa.Column("runs_finished", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("run_finished", sa.Boolean(), nullable=False, server_default=sa.false()),
            sa.Column("started_at", sa.DateTime(), nullable=False),
            sa.Column("last_read_at", sa.DateTime(), nullable=False),
            sa.Column("first_finished_at", sa.DateTime(), nullable=True),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["story_id"], ["stories.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("user_id", "story_id", name="uq_reading_progress_user_story"),
        )
        op.create_index("ix_reading_progress_story_id", "reading_progress", ["story_id"])
        op.create_index(
            "ix_reading_progress_user_last_read", "reading_progress", ["user_id", "last_read_at"]
        )
    if not _has_table("saved_stories"):
        op.create_table(
            "saved_stories",
            sa.Column("user_id", sa.Uuid(), nullable=False),
            sa.Column("story_id", sa.Uuid(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
            sa.ForeignKeyConstraint(["story_id"], ["stories.id"], ondelete="CASCADE"),
            sa.PrimaryKeyConstraint("user_id", "story_id"),
        )
        op.create_index("ix_saved_stories_story_id", "saved_stories", ["story_id"])


def downgrade() -> None:
    op.drop_table("saved_stories")
    op.drop_table("reading_progress")
