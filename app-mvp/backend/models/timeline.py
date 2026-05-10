from __future__ import annotations

import uuid

from sqlalchemy import DateTime, Float, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend.core.db import Base


class Timeline(Base):
    __tablename__ = "timelines"

    project_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    fps: Mapped[float] = mapped_column(Float, nullable=False, default=24)
    segments: Mapped[list[dict]] = mapped_column(JSONB, nullable=False, default=list)
    updated_at: Mapped[DateTime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

