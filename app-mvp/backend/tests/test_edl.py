from backend.core.exporters.edl import build_cmx3600_edl


def test_edl_basic():
    edl = build_cmx3600_edl(
        [
            {"reel": "AX", "src_in": 0.0, "src_out": 1.0, "rec_in": 0.0, "rec_out": 1.0},
            {"reel": "AX", "src_in": 5.0, "src_out": 6.0, "rec_in": 1.0, "rec_out": 2.0},
        ],
        fps=24,
    )
    assert "TITLE:" in edl
    assert "001" in edl
    assert "002" in edl

