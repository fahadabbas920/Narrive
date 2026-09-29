"""verify reading runs before crediting endings

Revision ID: a4c9e2f7b1d3
Revises: f3b8d2a6c4e1
Create Date: 2026-09-29 20:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "a4c9e2f7b1d3"
down_revision: str | None = "f3b8d2a6c4e1"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "reading_progress",
        sa.Column("run_verified", sa.Boolean(), nullable=False, server_default=sa.true()),
    )


def downgrade() -> None:
    op.drop_column("reading_progress", "run_verified")
