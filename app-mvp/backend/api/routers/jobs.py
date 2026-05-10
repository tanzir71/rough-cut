from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.api.schemas import JobOut
from backend.core.db import get_db
from backend.models.job import Job


router = APIRouter(tags=["jobs"])


@router.get("/jobs/{job_id}", response_model=JobOut)
def get_job(job_id: uuid.UUID, db: Session = Depends(get_db)):
    return db.query(Job).filter(Job.id == job_id).one()

