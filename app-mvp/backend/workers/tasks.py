from __future__ import annotations

import json
import os
import shutil
from types import SimpleNamespace
import uuid

from celery import chain
from sqlalchemy.orm import Session

from backend.core.config import get_settings
from backend.core.db import SessionLocal
from backend.core.ffmpeg import extract_audio, ffprobe_duration_fps, make_proxy
from backend.core.speaker import assign_speakers
from backend.core.storage import download_to_file, put_file
from backend.core.topics import tag_topics
from backend.models.export_job import ExportJob
from backend.models.job import Job, JobStatus
from backend.models.timeline import Timeline
from backend.models.transcript_segment import TranscriptSegment
from backend.models.upload_session import UploadSession
from backend.models.video_file import VideoFile, VideoStatus
from backend.workers.celery_app import celery_app


def _db() -> Session:
    return SessionLocal()


def _job_update(db: Session, job_id: uuid.UUID, status: str, progress: float | None = None, message: str | None = None):
    job = db.query(Job).filter(Job.id == job_id).one()
    job.status = status
    job.progress01 = progress
    job.message = message
    db.add(job)
    db.commit()


@celery_app.task(name="ingest_pipeline")
def ingest_pipeline(job_id: str, upload_id: str):
    return chain(
        assemble_and_store.s(job_id, upload_id),
        transcribe_video.s(job_id),
        proxy_video.s(job_id),
    ).apply_async().id


@celery_app.task(name="assemble_and_store")
def assemble_and_store(job_id: str, upload_id: str):
    s = get_settings()
    db = _db()
    try:
        jid = uuid.UUID(job_id)
        _job_update(db, jid, JobStatus.RUNNING, 0.02, "Assembling upload")
        sess = db.query(UploadSession).filter(UploadSession.id == uuid.UUID(upload_id)).one()

        parts = sorted([p for p in os.listdir(sess.temp_dir) if p.endswith(".part")])
        if not parts:
            raise RuntimeError("No upload parts")
        assembled_dir = os.path.join(s.storage_tmp_dir, "assembled", str(sess.id))
        os.makedirs(assembled_dir, exist_ok=True)
        assembled_path = os.path.join(assembled_dir, sess.filename)
        with open(assembled_path, "wb") as out:
            for part in parts:
                with open(os.path.join(sess.temp_dir, part), "rb") as f:
                    shutil.copyfileobj(f, out)

        probe = ffprobe_duration_fps(assembled_path)
        vid = uuid.uuid4()
        key = f"projects/{sess.project_id}/original/{vid}/{sess.filename}"
        put_file(s.s3_bucket_media, key, assembled_path)

        video = VideoFile(
            id=vid,
            project_id=sess.project_id,
            filename=sess.filename,
            duration=probe.duration_sec or None,
            original_key=key,
            status=VideoStatus.PROCESSING,
        )
        db.add(video)
        db.commit()
        _job_update(db, jid, JobStatus.RUNNING, 0.08, "Stored media")
        return str(vid)
    except Exception as e:
        db.rollback()
        try:
            _job_update(db, uuid.UUID(job_id), JobStatus.FAILED, None, str(e))
        except Exception:
            pass
        raise
    finally:
        db.close()


@celery_app.task(name="transcribe_video")
def transcribe_video(video_id: str, job_id: str):
    s = get_settings()
    db = _db()
    try:
        jid = uuid.UUID(job_id)
        vid = uuid.UUID(video_id)
        _job_update(db, jid, JobStatus.RUNNING, 0.12, "Downloading for transcription")
        video = db.query(VideoFile).filter(VideoFile.id == vid).one()
        local_dir = os.path.join(s.storage_tmp_dir, "work", str(vid))
        os.makedirs(local_dir, exist_ok=True)
        local_video = os.path.join(local_dir, "input")
        download_to_file(s.s3_bucket_media, video.original_key, local_video)

        wav_path = os.path.join(local_dir, "audio.wav")
        extract_audio(local_video, wav_path)

        _job_update(db, jid, JobStatus.RUNNING, 0.22, "Running faster-whisper")
        from faster_whisper import WhisperModel

        model = WhisperModel(
            s.whisper_model,
            device=s.whisper_device,
            compute_type=s.whisper_compute_type,
            download_root=s.whisper_cache_dir,
        )
        seg_list: list[tuple[float, float, str]] = []
        info = SimpleNamespace(language=None)
        try:
            segments, info = model.transcribe(wav_path, vad_filter=True)
            seg_list = [(float(seg.start), float(seg.end), str(seg.text).strip()) for seg in segments]
        except Exception as exc:
            if "max() arg is an empty sequence" not in str(exc):
                raise
        starts = [x[0] for x in seg_list]
        ends = [x[1] for x in seg_list]
        speakers = assign_speakers(starts, ends)
        topics = tag_topics([x[2] for x in seg_list])

        db.query(TranscriptSegment).filter(TranscriptSegment.video_id == vid).delete()
        for i, (st, et, text) in enumerate(seg_list):
            db.add(
                TranscriptSegment(
                    video_id=vid,
                    start_time=st,
                    end_time=et,
                    text=text,
                    speaker=speakers[i] if i < len(speakers) else None,
                    topics=topics.segment_topics[i] if i < len(topics.segment_topics) else [],
                )
            )
        db.commit()
        _job_update(db, jid, JobStatus.RUNNING, 0.62, f"Transcript ready ({getattr(info,'language',None)})")
        return video_id
    except Exception as e:
        db.rollback()
        try:
            _job_update(db, uuid.UUID(job_id), JobStatus.FAILED, None, str(e))
        except Exception:
            pass
        raise
    finally:
        db.close()


@celery_app.task(name="proxy_video")
def proxy_video(video_id: str, job_id: str):
    s = get_settings()
    db = _db()
    try:
        jid = uuid.UUID(job_id)
        vid = uuid.UUID(video_id)
        _job_update(db, jid, JobStatus.RUNNING, 0.68, "Generating proxy")
        video = db.query(VideoFile).filter(VideoFile.id == vid).one()
        local_dir = os.path.join(s.storage_tmp_dir, "work", str(vid))
        os.makedirs(local_dir, exist_ok=True)
        local_video = os.path.join(local_dir, "input")
        if not os.path.exists(local_video):
            download_to_file(s.s3_bucket_media, video.original_key, local_video)
        proxy_path = os.path.join(local_dir, "proxy.mp4")
        make_proxy(local_video, proxy_path)
        proxy_key = f"projects/{video.project_id}/proxy/{vid}.mp4"
        put_file(s.s3_bucket_media, proxy_key, proxy_path)
        video.proxy_key = proxy_key
        video.status = VideoStatus.READY
        db.add(video)
        db.commit()
        _job_update(db, jid, JobStatus.SUCCEEDED, 1.0, "Ready")
        return video_id
    except Exception as e:
        db.rollback()
        try:
            _job_update(db, uuid.UUID(job_id), JobStatus.FAILED, None, str(e))
        except Exception:
            pass
        raise
    finally:
        db.close()


@celery_app.task(name="export_pipeline")
def export_pipeline(job_id: str, export_id: str):
    return chain(build_export_package.s(job_id, export_id)).apply_async().id


@celery_app.task(name="build_export_package")
def build_export_package(job_id: str, export_id: str):
    from backend.core.exporters import build_package

    db = _db()
    try:
        jid = uuid.UUID(job_id)
        eid = uuid.UUID(export_id)
        _job_update(db, jid, JobStatus.RUNNING, 0.05, "Preparing export")
        exp = db.query(ExportJob).filter(ExportJob.id == eid).one()
        result = build_package(db, exp, jid)
        return result
    finally:
        db.close()

