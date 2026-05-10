from __future__ import annotations


def sec_to_tc(sec: float, fps: float) -> str:
    if sec < 0:
        sec = 0
    total_frames = int(round(sec * fps))
    frames = total_frames % int(fps)
    total_seconds = total_frames // int(fps)
    s = total_seconds % 60
    m = (total_seconds // 60) % 60
    h = total_seconds // 3600
    return f"{h:02d}:{m:02d}:{s:02d}:{frames:02d}"

