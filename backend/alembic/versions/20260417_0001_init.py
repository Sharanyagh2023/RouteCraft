"""init tables

Revision ID: 20260417_0001
Revises:
Create Date: 2026-04-17
"""

from alembic import op
import sqlalchemy as sa

revision = "20260417_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "trips",
        sa.Column("id", sa.String(length=64), primary_key=True),
        sa.Column("user_id", sa.String(length=64), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("source", sa.String(length=255), nullable=False),
        sa.Column("destination", sa.String(length=255), nullable=False),
        sa.Column("selected_route", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "preferences",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.String(length=64), sa.ForeignKey("users.id"), nullable=False, unique=True),
        sa.Column("cost_weight", sa.Float(), nullable=False),
        sa.Column("time_weight", sa.Float(), nullable=False),
        sa.Column("transfer_weight", sa.Float(), nullable=False),
        sa.Column("walk_weight", sa.Float(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("preferences")
    op.drop_table("trips")
    op.drop_table("users")
