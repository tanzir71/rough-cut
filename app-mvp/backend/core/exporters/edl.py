from __future__ import annotations

from backend.core.timecode import sec_to_tc


def build_cmx3600_edl(events: list[dict], fps: float) -> str:
    lines: list[str] = []
    lines.append("TITLE: APP_MVP")
    lines.append("FCM: NON-DROP FRAME")
    for i, ev in enumerate(events, start=1):
        reel = (ev.get("reel") or "AX").upper()[:8]
        src_in = sec_to_tc(float(ev["src_in"]), fps)
        src_out = sec_to_tc(float(ev["src_out"]), fps)
        rec_in = sec_to_tc(float(ev["rec_in"]), fps)
        rec_out = sec_to_tc(float(ev["rec_out"]), fps)
        lines.append(f"{i:03d}  {reel:<8}  V     C        {src_in} {src_out} {rec_in} {rec_out}")
    lines.append("")
    return "\n".join(lines)

