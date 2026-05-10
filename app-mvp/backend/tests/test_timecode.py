from backend.core.timecode import sec_to_tc


def test_sec_to_tc_24fps_zero():
    assert sec_to_tc(0.0, 24) == "00:00:00:00"


def test_sec_to_tc_24fps_one_second():
    assert sec_to_tc(1.0, 24) == "00:00:01:00"


def test_sec_to_tc_rounding():
    assert sec_to_tc(0.5, 24) == "00:00:00:12"

