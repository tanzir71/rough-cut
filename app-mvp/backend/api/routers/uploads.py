from __future__ import annotations

import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from backend.api.schemas import UploadChunkOut, UploadCompleteOut, UploadInitIn, UploadInitOut
from backend.core.config import get_settings
from backend.core.db import get_db
from backend.models.job import Job, JobStatus, JobType
from backend.models.upload_session import UploadSession, UploadStatus
from backend.workers.tasks import ingest_pipeline


router = APIRouter(tags=["uploads"])


@router.post("/projects/{project_id}/uploads/init", response_model=UploadInitOut)
def init_upload(project_id: uuid.UUID, payload: UploadInitIn, db: Session = Depends(get_db)):
    s = get_settings()
    upload_id = uuid.uuid4()
    tmp_dir = os.path.join(s.storage_tmp_dir, "uploads", str(upload_id))
    os.makedirs(tmp_dir, exist_ok=True)
    sess = UploadSession(
        id=upload_id,
        project_id=project_id,
        filename=payload.filename,
        total_size=payload.total_size,
        chunk_size=payload.chunk_size,
        received_bytes=0,
        status=UploadStatus.UPLOADING,
        temp_dir=tmp_dir,
    )
    db.add(sess)
    db.commit()
    return UploadInitOut(upload_id=upload_id)


@router.post("/uploads/{upload_id}/chunk", response_model=UploadChunkOut)
def upload_chunk(
    upload_id: uuid.UUID,
    chunk_index: int,
    chunk: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    sess = db.query(UploadSession).filter(UploadSession.id == upload_id).one_or_none()
    if not sess:
        raise HTTPException(status_code=404, detail="Upload not found")
    if sess.status not in [UploadStatus.UPLOADING]:
        raise HTTPException(status_code=409, detail="Upload not active")
    out_path = os.path.join(sess.temp_dir, f"{chunk_index:08d}.part")
    with open(out_path, "wb") as f:
        f.write(chunk.file.read())
    sess.received_bytes = min(sess.total_size, sess.received_bytes + os.path.getsize(out_path))
    db.add(sess)
    db.commit()
    return UploadChunkOut(received_bytes=sess.received_bytes, total_size=sess.total_size)


@router.post("/uploads/{upload_id}/complete", response_model=UploadCompleteOut)
def complete_upload(upload_id: uuid.UUID, db: Session = Depends(get_db)):
    sess = db.query(UploadSession).filter(UploadSession.id == upload_id).one_or_none()
    if not sess:
        raise HTTPException(status_code=404, detail="Upload not found")
    if sess.status != UploadStatus.UPLOADING:
        raise HTTPException(status_code=409, detail="Upload not active")
    sess.status = UploadStatus.COMPLETE
    db.add(sess)

    job = Job(project_id=sess.project_id, type=JobType.INGEST, status=JobStatus.QUEUED)
    db.add(job)
    db.commit()
    db.refresh(job)

    ingest_pipeline.delay(str(job.id), str(sess.id))
    return UploadCompleteOut(video_id=None, job_id=job.id)

