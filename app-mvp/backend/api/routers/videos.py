from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.api.schemas import TranscriptSegmentOut, VideoOut
from backend.core.config import get_settings
from backend.core.db import get_db
from backend.core.storage import get_presigned_get_url
from backend.models.transcript_segment import TranscriptSegment
from backend.models.video_file import VideoFile


router = APIRouter(tags=["videos"])


@router.get("/projects/{project_id}/videos", response_model=list[VideoOut])
def list_videos(project_id: uuid.UUID, db: Session = Depends(get_db)):
    s = get_settings()
    videos = db.query(VideoFile).filter(VideoFile.project_id == project_id).order_by(VideoFile.created_at.desc()).all()
    out: list[VideoOut] = []
    for v in videos:
        proxy_url = None
        if v.proxy_key:
            proxy_url = get_presigned_get_url(s.s3_bucket_media, v.proxy_key)
        out.append(
            VideoOut(
                id=v.id,
                project_id=v.project_id,
                filename=v.filename,
                duration=v.duration,
                status=v.status,
                proxy_url=proxy_url,
            )
        )
    return out


@router.get("/videos/{video_id}/transcript", response_model=list[TranscriptSegmentOut])
def get_transcript(video_id: uuid.UUID, q: str | None = None, db: Session = Depends(get_db)):
    query = db.query(TranscriptSegment).filter(TranscriptSegment.video_id == video_id)
    if q:
        like = f"%{q.lower()}%"
        query = query.filter(TranscriptSegment.text.ilike(like))
    return query.order_by(TranscriptSegment.start_time.asc()).all()

