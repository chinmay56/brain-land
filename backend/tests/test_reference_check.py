"""
Cross-verification tests.

These cover the normalisation that decides whether two records describe the
same parcel or the same person, because that is where a false CONFLICT
(annoying, erodes trust in the flags) or a missed one (a competing claim
certified by mistake) actually comes from.
"""
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.models.schemas import RecordStatus, SeverityLevel  # noqa: E402
from app.services.reference_check import (  # noqa: E402
    _normalise_owner,
    check_duplicates,
    check_reference,
    normalise_survey,
    village_forms,
)


def _flags(result):
    return {f.id: f for f in result}


# ---------------------------------------------------------------- owner names
def test_honorific_is_stripped_before_comparing():
    assert _normalise_owner("श्री. चंदन रामचंद्र वाणी") == _normalise_owner("चंदन रामचंद्र वाणी")
    assert _normalise_owner("Shri Ramesh Patil") == _normalise_owner("ramesh   patil")


def test_pan_suffix_is_stripped_before_comparing():
    """The fixture carries a PAN beside the name; it is not a different owner."""
    assert (_normalise_owner("श्री. चंदन रामचंद्र वाणी (PAN: ABPPW 6957 L)")
            == _normalise_owner("चंदन रामचंद्र वाणी"))


def test_genuinely_different_owners_still_differ():
    assert _normalise_owner("Ramesh Baliram Patil") != _normalise_owner("Suresh Chandra Kumar")


# ------------------------------------------------------------- survey numbers
def test_devanagari_digits_match_ascii():
    assert normalise_survey("१२४ / २") == "124/2"
    assert normalise_survey(" 124 / 2 ") == normalise_survey("१२४/२")


# -------------------------------------------------------------------- village
def test_bilingual_village_matches_either_form():
    forms = village_forms("मेहरुण (Mehrun)")
    assert "mehrun" in forms and "मेहरुण" in forms


# ------------------------------------------------------- reference comparison
def _hadapsar_doc(area: str):
    return {
        "village": {"value": "Hadapsar"},
        "survey_number": {"value": "124/2"},
        "owner_name": {"value": "Ramesh Baliram Patil"},
        "area": {"value": area},
        "area_unit": "Hectares",
        "state": "Maharashtra",
    }


def test_small_area_gap_is_a_warning():
    """Master holds 2.61 Ha; 2.45 is ~6.1% off — worth a look, not a conflict."""
    flags = _flags(check_reference(_hadapsar_doc("2.45")))
    assert "REF_AREA_MISMATCH" in flags
    assert flags["REF_AREA_MISMATCH"].severity == SeverityLevel.WARNING


def test_large_area_gap_is_a_conflict():
    """2.09 Ha against a master of 2.61 is ~20% — that is a different parcel."""
    flags = _flags(check_reference(_hadapsar_doc("2.09")))
    assert "REF_AREA_MISMATCH" in flags
    assert flags["REF_AREA_MISMATCH"].severity == SeverityLevel.CONFLICT


def test_jalgaon_fixture_matches_the_master_despite_pan_and_script():
    flags = _flags(check_reference({
        "village": {"value": "मेहरुण (Mehrun)"},
        "survey_number": {"value": "486/1"},
        "owner_name": {"value": "श्री. चंदन रामचंद्र वाणी (PAN: ABPPW 6957 L)"},
        "area": {"value": "289.25"},
        "area_unit": "Sq. Meters",
        "state": "Maharashtra",
    }))
    assert set(flags) == {"REF_MATCH"}


def test_unknown_survey_number_is_info_only():
    flags = _flags(check_reference({
        "village": {"value": "Hadapsar"},
        "survey_number": {"value": "999/9"},
        "area": {"value": "1"},
        "area_unit": "Hectares",
    }))
    assert set(flags) == {"REF_NOT_FOUND"}
    assert flags["REF_NOT_FOUND"].severity == SeverityLevel.INFO


# ------------------------------------------------------------------ duplicates
@pytest.fixture
def one_submitted_record(monkeypatch):
    from app.api import land_records
    records = [{
        "id": "LR-2026-0001",
        "village": {"value": "Hadapsar"},
        "survey_number": {"value": "124/2"},
        "owner_name": {"value": "Ramesh Baliram Patil"},
        "status": RecordStatus.UNDER_VERIFICATION,
        "submission_date": "2026-09-23",
    }]
    monkeypatch.setattr(land_records, "MOCK_RECORDS", records, raising=True)
    return records


def test_duplicate_with_a_different_owner_reads_as_a_competing_claim(one_submitted_record):
    flags = check_duplicates({
        "village": {"value": "Hadapsar"},
        "survey_number": {"value": "१२४ / २"},        # same parcel, other script
        "owner_name": {"value": "Different Claimant"},
    })
    assert len(flags) == 1
    flag = flags[0]
    assert flag.id == "DUPLICATE_RECORD"
    assert flag.severity == SeverityLevel.CONFLICT
    assert "LR-2026-0001" in flag.message
    assert "claiming the same parcel" in flag.message
    assert "competing claim" in flag.suggested_action


def test_duplicate_by_the_same_owner_is_not_called_a_competing_claim(one_submitted_record):
    flags = check_duplicates({
        "village": {"value": "Hadapsar"},
        "survey_number": {"value": "124/2"},
        "owner_name": {"value": "Ramesh Baliram Patil"},
    })
    assert len(flags) == 1
    assert "claiming the same parcel" not in flags[0].message


def test_rejected_records_are_not_live_claims(one_submitted_record):
    one_submitted_record[0]["status"] = RecordStatus.REJECTED
    assert check_duplicates({
        "village": {"value": "Hadapsar"},
        "survey_number": {"value": "124/2"},
        "owner_name": {"value": "Ramesh Baliram Patil"},
    }) == []
