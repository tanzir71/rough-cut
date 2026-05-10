from __future__ import annotations


def assign_speakers(starts: list[float], ends: list[float], max_speakers: int = 2) -> list[str]:
    if not starts:
        return []
    speakers: list[str] = []
    current = 1
    speakers.append(f"Speaker {current}")
    for i in range(1, len(starts)):
        gap = max(0.0, starts[i] - ends[i - 1])
        if gap >= 1.2:
            current = (current % max_speakers) + 1
        speakers.append(f"Speaker {current}")
    return speakers

