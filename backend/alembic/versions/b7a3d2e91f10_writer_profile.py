"""writer profile fields on users

Revision ID: b7a3d2e91f10
Revises: 4c1e7f77790b
Create Date: 2026-09-28 12:00:00.000000

"""

from collections.abc import Sequence

import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "b7a3d2e91f10"
down_revision: str | None = "4c1e7f77790b"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "users", sa.Column("is_writer", sa.Boolean(), nullable=False, server_default=sa.false())
    )
    op.add_column(
        "users", sa.Column("pen_name", sqlmodel.sql.sqltypes.AutoString(length=60), nullable=True)
    )
    op.add_column("users", sa.Column("bio", sa.Text(), nullable=True))
    op.add_column(
        "users", sa.Column("genres", postgresql.JSON(astext_type=sa.Text()), nullable=True)
    )
    op.add_column("users", sa.Column("writer_since", sa.DateTime(), nullable=True))
    # Anyone who already authored a story is a writer.
    op.execute(
        "UPDATE users SET is_writer = true, writer_since = created_at "
        "WHERE id IN (SELECT DISTINCT author_id FROM stories)"
    )


def downgrade() -> None:
    op.drop_column("users", "writer_since")
    op.drop_column("users", "genres")
    op.drop_column("users", "bio")
    op.drop_column("users", "pen_name")
    op.drop_column("users", "is_writer")
