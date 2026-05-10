from __future__ import annotations

import os
import uuid
import zipfile

from sqlalchemy.orm import Session

from backend.core.config import get_settings
from backend.core.ffmpeg import render_crossfade_sequence, run
from backend.core.exporters.edl import build_cmx3600_edl
from backend.core.exporters.fcp7xml import build_fcp7_xml
from backend.core.storage import download_to_file, put_file
from backend.models.export_job import ExportJob
from backend.models.job import JobStatus
from backend.models.timeline import Timeline
from backend.models.video_file import VideoFile


def _safe_filename(name: str) -> str:
    out = (name or "").strip()
    for ch in ["/", "\\", ":", "*", "?", '"', "<", ">", "|"]:
        out = out.replace(ch, "_")
    return out or "file"


def build_package(db: Session, export_job: ExportJob, job_id: uuid.UUID) -> dict:
    from backend.workers.tasks import _job_update

    s = get_settings()
    out_dir = export_job.output_dir
    os.makedirs(out_dir, exist_ok=True)
    work_dir = os.path.join(s.storage_tmp_dir, "exports", str(export_job.id))
    assets_dir = os.path.join(work_dir, "assets")
    os.makedirs(assets_dir, exist_ok=True)

    tl = db.query(Timeline).filter(Timeline.project_id == export_job.project_id).one_or_none()
    fps = float((tl.fps if tl else 24) or 24)
    segments = (tl.segments if tl else [])

    _job_update(db, job_id, JobStatus.RUNNING, 0.15, "Collecting assets")

    video_ids = {uuid.UUID(seg["videoId"]) for seg in segments}
    videos = {v.id: v for v in db.query(VideoFile).filter(VideoFile.id.in_(list(video_ids))).all()}

    media_files: dict[str, dict] = {}
    used_rel: set[str] = set()
    for v in videos.values():
        rel = _safe_filename(v.filename)
        if not rel.lower().endswith(".mp4"):
            rel = f"{rel}.mp4"
        if rel in used_rel:
            stem, ext = os.path.splitext(rel)
            rel = f"{stem}-{str(v.id)[:8]}{ext or '.mp4'}"
        used_rel.add(rel)
        local = os.path.join(assets_dir, rel)
        key = v.proxy_key or v.original_key
        download_to_file(s.s3_bucket_media, key, local)
        media_files[str(v.id)] = {"name": v.filename, "rel_path": f"assets/{rel}"}

    events: list[dict] = []
    t = 0.0
    for seg in segments:
        vid = str(seg["videoId"])
        src_in = float(seg["sourceIn"])
        src_out = float(seg["sourceOut"])
        dur = max(0.0, src_out - src_in)
        ev = {
            "reel": "AX",
            "file_id": vid,
            "name": seg.get("label") or f"{videos[uuid.UUID(vid)].filename}",
            "src_in": src_in,
            "src_out": src_out,
            "rec_in": t,
            "rec_out": t + dur,
        }
        events.append(ev)
        t += dur

    files: list[dict] = []
    target = export_job.target

    _job_update(db, job_id, JobStatus.RUNNING, 0.55, "Writing XML/EDL")

    if target.get("xml"):
        xml = build_fcp7_xml("Rough Cut", fps, media_files, events)
        xml_path = os.path.join(work_dir, "sequence.xml")
        with open(xml_path, "w", encoding="utf-8") as f:
            f.write(xml)
        files.append({"kind": "XML", "path": xml_path, "bytes": os.path.getsize(xml_path)})

    if target.get("edl"):
        edl = build_cmx3600_edl(events, fps)
        edl_path = os.path.join(work_dir, "sequence.edl")
        with open(edl_path, "w", encoding="utf-8") as f:
            f.write(edl)
        files.append({"kind": "EDL", "path": edl_path, "bytes": os.path.getsize(edl_path)})

    if target.get("mp4"):
        _job_update(db, job_id, JobStatus.RUNNING, 0.65, "Rendering MP4")
        clips_dir = os.path.join(work_dir, "clips")
        os.makedirs(clips_dir, exist_ok=True)
        clip_paths: list[str] = []
        clip_durs: list[float] = []
        for i, ev in enumerate(events):
            in_path = os.path.join(work_dir, media_files[ev["file_id"]]["rel_path"])
            clip_path = os.path.join(clips_dir, f"seg_{i:03d}.mp4")
            src_in = float(ev["src_in"])
            src_out = float(ev["src_out"])
            dur = max(0.0, src_out - src_in)
            run(
                [
                    "ffmpeg",
                    "-y",
                    "-ss",
                    str(src_in),
                    "-to",
                    str(src_out),
                    "-i",
                    in_path,
                    "-c:v",
                    "libx264",
                    "-preset",
                    "veryfast",
                    "-crf",
                    "20",
                    "-pix_fmt",
                    "yuv420p",
                    "-c:a",
                    "aac",
                    "-b:a",
                    "160k",
                    clip_path,
                ]
            )
            clip_paths.append(clip_path)
            clip_durs.append(dur)

        preview_path = os.path.join(work_dir, "preview.mp4")
        render_crossfade_sequence(clip_paths, clip_durs, preview_path, transition_sec=0.5, out_height=1080)
        files.append({"kind": "MP4", "path": preview_path, "bytes": os.path.getsize(preview_path)})

    _job_update(db, job_id, JobStatus.RUNNING, 0.78, "Packaging")

    zip_path = os.path.join(out_dir, f"export-{export_job.id}.zip")
    with zipfile.ZipFile(zip_path, "w", compression=zipfile.ZIP_DEFLATED) as z:
        for root, _, fnames in os.walk(work_dir):
            for fn in fnames:
                fp = os.path.join(root, fn)
                rel = os.path.relpath(fp, work_dir)
                z.write(fp, rel)

    package_key = f"projects/{export_job.project_id}/exports/{export_job.id}.zip"
    put_file(s.s3_bucket_exports, package_key, zip_path)

    export_job.status = JobStatus.SUCCEEDED
    export_job.files = files
    export_job.package_key = package_key
    db.add(export_job)
    db.commit()

    _job_update(db, job_id, JobStatus.SUCCEEDED, 1.0, "Export complete")
    return {"zip": zip_path}

