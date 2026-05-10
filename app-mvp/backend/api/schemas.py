from __future__ import annotations

import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ProjectCreate(BaseModel):
    name: str
    user_id: str = "local"


class ProjectOut(BaseModel):
    id: uuid.UUID
    name: str
    user_id: str
    created_at: datetime


class UploadInitIn(BaseModel):
    filename: str
    total_size: int
    chunk_size: int = 8 * 1024 * 1024


class UploadInitOut(BaseModel):
    upload_id: uuid.UUID


class UploadChunkOut(BaseModel):
    received_bytes: int
    total_size: int


class UploadCompleteOut(BaseModel):
    video_id: uuid.UUID | None = None
    job_id: uuid.UUID


class VideoOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    filename: str
    duration: float | None
    status: str
    proxy_url: str | None


class TranscriptSegmentOut(BaseModel):
    id: uuid.UUID
    video_id: uuid.UUID
    start_time: float
    end_time: float
    text: str
    speaker: str | None
    topics: list[str]


class TimelineOut(BaseModel):
    project_id: uuid.UUID
    fps: float
    segments: list[dict]
    updated_at: datetime


class TimelineUpdateIn(BaseModel):
    fps: float = 24
    segments: list[dict] = Field(default_factory=list)


class ExportRequest(BaseModel):
    output_dir: str
    fps: float = 24
    xml: bool = True
    edl: bool = True
    mp4: bool = True


class ExportOut(BaseModel):
    export_id: uuid.UUID
    job_id: uuid.UUID


class ExportStatusOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    status: str
    files: list[dict]
    download_url: str | None = None


class JobOut(BaseModel):
    id: uuid.UUID
    project_id: uuid.UUID
    type: str
    status: str
    progress01: float | None
    message: str | None
    created_at: datetime
    updated_at: datetime


class SuggestIn(BaseModel):
    mode: str = "LOCAL_ONLY"
    video_id: uuid.UUID | None = None
    topic: str
    target_seconds: float = 30


class SuggestOut(BaseModel):
    selected_ids: list[uuid.UUID]
    reason: str

