"""index for paging the public catalogue

Revision ID: f3b8d2a6c4e1
Revises: e1a7c3b5d9f2
Create Date: 2026-09-29 18:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "f3b8d2a6c4e1"
down_revision: str | None = "e1a7c3b5d9f2"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Matches the catalogue's ORDER BY, so each "load more" page is an index range scan.
    op.create_index(
        "ix_stories_catalogue_order",
        "stories",
        ["status", sa.text("coalesce(published_at, created_at) DESC"), sa.text("id DESC")],
    )


def downgrade() -> None:
    op.drop_index("ix_stories_catalogue_order", table_name="stories")
