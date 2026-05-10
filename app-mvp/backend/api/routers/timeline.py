from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from backend.api.schemas import TimelineOut, TimelineUpdateIn
from backend.core.db import get_db
from backend.models.timeline import Timeline


router = APIRouter(tags=["timeline"])


@router.get("/projects/{project_id}/timeline", response_model=TimelineOut)
def get_timeline(project_id: uuid.UUID, db: Session = Depends(get_db)):
    tl = db.query(Timeline).filter(Timeline.project_id == project_id).one_or_none()
    if not tl:
        tl = Timeline(project_id=project_id, fps=24, segments=[])
        db.add(tl)
        db.commit()
        db.refresh(tl)
    return tl


@router.put("/projects/{project_id}/timeline", response_model=TimelineOut)
def update_timeline(project_id: uuid.UUID, payload: TimelineUpdateIn, db: Session = Depends(get_db)):
    tl = db.query(Timeline).filter(Timeline.project_id == project_id).one_or_none()
    if not tl:
        tl = Timeline(project_id=project_id, fps=payload.fps, segments=payload.segments)
        db.add(tl)
    else:
        tl.fps = payload.fps
        tl.segments = payload.segments
        db.add(tl)
    db.commit()
    db.refresh(tl)
    return tl

