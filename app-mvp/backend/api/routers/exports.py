from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.api.schemas import ExportOut, ExportRequest, ExportStatusOut
from backend.core.config import get_settings
from backend.core.storage import get_presigned_get_url
from backend.core.db import get_db
from backend.models.export_job import ExportJob
from backend.models.job import Job, JobStatus, JobType
from backend.workers.tasks import export_pipeline


router = APIRouter(tags=["exports"])


@router.post("/projects/{project_id}/export", response_model=ExportOut)
def start_export(project_id: uuid.UUID, payload: ExportRequest, db: Session = Depends(get_db)):
    job = Job(project_id=project_id, type=JobType.EXPORT, status=JobStatus.QUEUED)
    db.add(job)
    exp = ExportJob(project_id=project_id, status=JobStatus.QUEUED, target=payload.model_dump(), output_dir=payload.output_dir, files=[])
    db.add(exp)
    db.commit()
    db.refresh(job)
    db.refresh(exp)

    export_pipeline.delay(str(job.id), str(exp.id))
    return ExportOut(export_id=exp.id, job_id=job.id)


@router.get("/exports/{export_id}", response_model=ExportStatusOut)
def get_export(export_id: uuid.UUID, db: Session = Depends(get_db)):
    s = get_settings()
    exp = db.query(ExportJob).filter(ExportJob.id == export_id).one()
    url = None
    if exp.package_key:
        url = get_presigned_get_url(s.s3_bucket_exports, exp.package_key)
    return ExportStatusOut(id=exp.id, project_id=exp.project_id, status=exp.status, files=exp.files, download_url=url)

