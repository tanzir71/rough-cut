from __future__ import annotations

import xml.etree.ElementTree as ET

from backend.core.timecode import sec_to_tc


def build_fcp7_xml(
    sequence_name: str,
    fps: float,
    media_files: dict[str, dict],
    timeline_events: list[dict],
) -> str:
    root = ET.Element("xmeml", version="4")
    project = ET.SubElement(root, "project")
    name = ET.SubElement(project, "name")
    name.text = sequence_name
    seq = ET.SubElement(project, "sequence")
    ET.SubElement(seq, "name").text = sequence_name
    rate = ET.SubElement(seq, "rate")
    ET.SubElement(rate, "timebase").text = str(int(round(fps)))
    ET.SubElement(rate, "ntsc").text = "FALSE"

    media = ET.SubElement(seq, "media")
    video = ET.SubElement(media, "video")
    track = ET.SubElement(video, "track")

    for idx, ev in enumerate(timeline_events, start=1):
        clipitem = ET.SubElement(track, "clipitem", id=f"clipitem-{idx}")
        ET.SubElement(clipitem, "name").text = ev.get("name") or f"Segment {idx}"
        ET.SubElement(clipitem, "enabled").text = "TRUE"
        ET.SubElement(clipitem, "start").text = str(int(round(ev["rec_in"] * fps)))
        ET.SubElement(clipitem, "end").text = str(int(round(ev["rec_out"] * fps)))
        ET.SubElement(clipitem, "in").text = str(int(round(ev["src_in"] * fps)))
        ET.SubElement(clipitem, "out").text = str(int(round(ev["src_out"] * fps)))

        file_el = ET.SubElement(clipitem, "file", id=f"file-{idx}")
        ET.SubElement(file_el, "name").text = media_files[ev["file_id"]]["name"]
        pathurl = ET.SubElement(file_el, "pathurl")
        pathurl.text = f"file:///{media_files[ev['file_id']]['rel_path']}"
        f_rate = ET.SubElement(file_el, "rate")
        ET.SubElement(f_rate, "timebase").text = str(int(round(fps)))
        ET.SubElement(f_rate, "ntsc").text = "FALSE"

    xml = ET.tostring(root, encoding="utf-8")
    return xml.decode("utf-8")

