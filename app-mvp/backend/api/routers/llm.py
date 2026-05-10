from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.orm import Session

from backend.api.schemas import SuggestIn, SuggestOut
from backend.core.db import get_db
from backend.core.llm import build_select_segments_prompt, get_provider
from backend.models.transcript_segment import TranscriptSegment
from backend.models.video_file import VideoFile


router = APIRouter(tags=["llm"])


@router.post("/projects/{project_id}/suggest", response_model=SuggestOut)
async def suggest_segments(
    project_id: uuid.UUID,
    payload: SuggestIn,
    db: Session = Depends(get_db),
    openrouter_key: str | None = Header(default=None, alias="X-OpenRouter-Key"),
):
    query = (
        db.query(TranscriptSegment)
        .join(VideoFile, VideoFile.id == TranscriptSegment.video_id)
        .filter(VideoFile.project_id == project_id)
        .order_by(TranscriptSegment.start_time.asc())
    )
    if payload.video_id:
        query = query.filter(TranscriptSegment.video_id == payload.video_id)
    segs = query.limit(400).all()
    if not segs:
        raise HTTPException(status_code=400, detail="No transcript segments available")

    candidates = [
        {
            "id": str(s.id),
            "video_id": str(s.video_id),
            "start": s.start_time,
            "end": s.end_time,
            "speaker": s.speaker,
            "topics": s.topics,
            "text": s.text,
        }
        for s in segs
    ]
    messages = build_select_segments_prompt(payload.topic, candidates)
    provider = get_provider(payload.mode, openrouter_api_key=openrouter_key)
    raw = await provider.complete(messages)

    try:
        data = json.loads(raw)
        ids = [uuid.UUID(x) for x in (data.get("selected_ids") or [])]
        reason = str(data.get("reason") or "")
        return SuggestOut(selected_ids=ids, reason=reason)
    except Exception:
        raise HTTPException(status_code=500, detail=f"LLM returned invalid JSON: {raw[:2000]}")

