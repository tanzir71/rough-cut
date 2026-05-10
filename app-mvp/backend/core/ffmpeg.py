from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass


@dataclass(frozen=True)
class ProbeResult:
    duration_sec: float
    fps: float | None


def run(args: list[str]) -> None:
    p = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    if p.returncode != 0:
        raise RuntimeError(p.stdout[-4000:])


def ffprobe_duration_fps(input_path: str) -> ProbeResult:
    p = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=avg_frame_rate",
            "-show_entries",
            "format=duration",
            "-of",
            "json",
            input_path,
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    if p.returncode != 0:
        raise RuntimeError(p.stdout[-4000:])
    data = json.loads(p.stdout)
    duration = float(data.get("format", {}).get("duration") or 0)
    fps = None
    streams = data.get("streams") or []
    if streams:
        afr = (streams[0] or {}).get("avg_frame_rate")
        if afr and isinstance(afr, str) and "/" in afr:
            a, b = afr.split("/", 1)
            try:
                fps = float(a) / float(b)
            except Exception:
                fps = None
    return ProbeResult(duration_sec=duration, fps=fps)


def extract_audio(input_path: str, out_wav: str) -> None:
    run(["ffmpeg", "-y", "-i", input_path, "-vn", "-ac", "1", "-ar", "16000", out_wav])


def make_proxy(input_path: str, out_mp4: str) -> None:
    run(
        [
            "ffmpeg",
            "-y",
            "-i",
            input_path,
            "-vf",
            "scale=-2:720",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "23",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            out_mp4,
        ]
    )


def render_crossfade_sequence(
    segment_paths: list[str],
    segment_durations: list[float],
    out_mp4: str,
    transition_sec: float = 0.5,
    out_height: int = 1080,
) -> None:
    if not segment_paths:
        raise ValueError("No segments")
    if len(segment_paths) != len(segment_durations):
        raise ValueError("segment_paths and segment_durations length mismatch")

    inputs: list[str] = []
    for p in segment_paths:
        inputs.extend(["-i", p])

    fc: list[str] = []
    for i in range(len(segment_paths)):
        fc.append(f"[{i}:v]setpts=PTS-STARTPTS[v{i}]")
        fc.append(f"[{i}:a]asetpts=PTS-STARTPTS[a{i}]")

    v_prev = "v0"
    a_prev = "a0"
    t = float(segment_durations[0])
    for i in range(1, len(segment_paths)):
        offset = max(0.0, t - transition_sec)
        v_out = f"vxf{i}"
        a_out = f"axf{i}"
        fc.append(f"[{v_prev}][v{i}]xfade=transition=fade:duration={transition_sec}:offset={offset}[{v_out}]")
        fc.append(f"[{a_prev}][a{i}]acrossfade=d={transition_sec}[{a_out}]")
        v_prev = v_out
        a_prev = a_out
        t = t + float(segment_durations[i]) - transition_sec

    v_final = "vout"
    fc.append(f"[{v_prev}]scale=-2:{out_height},format=yuv420p[{v_final}]")

    run(
        [
            "ffmpeg",
            "-y",
            *inputs,
            "-filter_complex",
            ";".join(fc),
            "-map",
            f"[{v_final}]",
            "-map",
            f"[{a_prev}]",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "20",
            "-c:a",
            "aac",
            "-b:a",
            "160k",
            out_mp4,
        ]
    )

