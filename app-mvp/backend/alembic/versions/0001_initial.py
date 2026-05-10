from __future__ import annotations

import sqlalchemy as sa
from alembic import op


revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";')

    op.create_table(
        "projects",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("name", sa.Text(), nullable=False),
        sa.Column("user_id", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "video_files",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("project_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("filename", sa.Text(), nullable=False),
        sa.Column("duration", sa.Float(), nullable=True),
        sa.Column("original_key", sa.Text(), nullable=False),
        sa.Column("proxy_key", sa.Text(), nullable=True),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_video_files_project_id", "video_files", ["project_id"])

    op.create_table(
        "transcript_segments",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("video_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("start_time", sa.Float(), nullable=False),
        sa.Column("end_time", sa.Float(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("speaker", sa.Text(), nullable=True),
        sa.Column("topics", sa.dialects.postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
    )
    op.create_index("idx_transcript_segments_video_id", "transcript_segments", ["video_id"])
    op.create_index("idx_transcript_segments_time", "transcript_segments", ["video_id", "start_time"])

    op.create_table(
        "timelines",
        sa.Column("project_id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("fps", sa.Float(), nullable=False, server_default=sa.text("24")),
        sa.Column("segments", sa.dialects.postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "jobs",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("project_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("type", sa.Text(), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("progress01", sa.Float(), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_jobs_project_id", "jobs", ["project_id"])
    op.create_index("idx_jobs_status", "jobs", ["status"])

    op.create_table(
        "exports",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("project_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("target", sa.dialects.postgresql.JSONB(), nullable=False),
        sa.Column("output_dir", sa.Text(), nullable=False),
        sa.Column("files", sa.dialects.postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column("package_key", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_exports_project_id", "exports", ["project_id"])

    op.create_table(
        "upload_sessions",
        sa.Column("id", sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True, server_default=sa.text("uuid_generate_v4()")),
        sa.Column("project_id", sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("filename", sa.Text(), nullable=False),
        sa.Column("total_size", sa.Integer(), nullable=False),
        sa.Column("chunk_size", sa.Integer(), nullable=False),
        sa.Column("received_bytes", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("status", sa.Text(), nullable=False),
        sa.Column("temp_dir", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_upload_sessions_project_id", "upload_sessions", ["project_id"])


def downgrade() -> None:
    op.drop_index("idx_upload_sessions_project_id", table_name="upload_sessions")
    op.drop_table("upload_sessions")
    op.drop_index("idx_exports_project_id", table_name="exports")
    op.drop_table("exports")
    op.drop_index("idx_jobs_status", table_name="jobs")
    op.drop_index("idx_jobs_project_id", table_name="jobs")
    op.drop_table("jobs")
    op.drop_table("timelines")
    op.drop_index("idx_transcript_segments_time", table_name="transcript_segments")
    op.drop_index("idx_transcript_segments_video_id", table_name="transcript_segments")
    op.drop_table("transcript_segments")
    op.drop_index("idx_video_files_project_id", table_name="video_files")
    op.drop_table("video_files")
    op.drop_table("projects")

