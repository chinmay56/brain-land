"""
Cross-database verification and duplicate detection.

Two questions an officer would otherwise have to answer by hand:

  1. Does this document agree with what the department already holds? The
     reference master is the RoR extract; a mismatch in owner or area on a
     matched survey number is the single most useful thing to put in front of
     a verifier, because it is where fraud and transcription error both show.

  2. Has this parcel already been submitted? The same survey number arriving
     twice is either a resubmission or a competing claim, and the difference
     is whether the owner name also changed.

Neither check may ever break extraction. A land record still extracts fine
with no reference master reachable — it just cannot be cross-verified, which
is a fact about the deployment, not a failure of the document. Every entry
point here therefore swallows its own errors and returns no flags.
"""
from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.models.schemas import SeverityLevel, ValidationFlag

logger = logging.getLogger(__name__)

_REFERENCE_PATH = Path(__file__).resolve().parent.parent / "data" / "reference_records.json"

# Cached so a demo does not re-read the file (or re-query Supabase) per upload.
_reference_cache: Optional[List[Dict[str, Any]]] = None

# Area disagreement bands. Below the first, the two are treated as the same
# parcel measured twice; survey and transcription noise lives in here.
_AREA_TOLERANCE_PCT = 5.0
_AREA_CONFLICT_PCT = 15.0

_DEVANAGARI_DIGITS = str.maketrans("०१२३४५६७८९", "0123456789")
_HONORIFICS = ("श्री.", "श्री", "श्रीमती", "सौ.", "सौ", "shri", "sri", "smt.", "smt", "mr.", "mr", "mrs.", "mrs")


# ---------------------------------------------------------------------------
# Normalisation
# ---------------------------------------------------------------------------
def normalise_survey(s: Any) -> str:
    """'१२४ / २' and '124/2' are the same survey number written two ways."""
    if s is None:
        return ""
    text = str(s).translate(_DEVANAGARI_DIGITS)
    text = re.sub(r"\s+", "", text)
    return text.upper()


def village_forms(v: Any) -> List[str]:
    """
    ['mehrun', 'मेहरुण'] for 'मेहरुण (Mehrun)'.

    Extraction writes village names bilingually and the master holds one form
    or the other, so a straight string compare misses constantly. Same
    bracket-splitting idea as village_locator._name_forms, lower-cased here
    because these are only ever compared, never displayed.
    """
    if v is None:
        return []
    text = str(v).strip()
    if not text:
        return []
    inner = [m.strip() for m in re.findall(r"\(([^)]*)\)", text) if m.strip()]
    outer = re.sub(r"\([^)]*\)", "", text).strip()
    forms = [*inner, outer, text]
    seen: set = set()
    out: List[str] = []
    for f in forms:
        key = re.sub(r"\s+", " ", f).strip().lower()
        if key and key not in seen:
            seen.add(key)
            out.append(key)
    return out


def _normalise_owner(name: Any) -> str:
    """Compare people, not titles: 'श्री. चंदन' and 'चंदन' are one person."""
    if name is None:
        return ""
    text = re.sub(r"\s+", " ", str(name)).strip().lower()
    for honorific in _HONORIFICS:
        if text.startswith(honorific + " ") or text.startswith(honorific):
            stripped = text[len(honorific):].strip()
            if stripped:
                text = stripped
                break
    return text


def _field_value(field: Any) -> Optional[str]:
    """Extraction hands back FieldConfidence objects, dicts, or bare strings."""
    if field is None:
        return None
    if isinstance(field, (str, int, float)):
        return str(field)
    value = getattr(field, "value", None)
    if value is None and isinstance(field, dict):
        value = field.get("value")
    return None if value is None else str(value)


# ---------------------------------------------------------------------------
# Loading the master
# ---------------------------------------------------------------------------
def load_reference(force_reload: bool = False) -> List[Dict[str, Any]]:
    """
    The reference master, from Supabase when it is configured and reachable,
    otherwise the copy bundled beside this module. Returns [] if neither is
    available — the caller then simply raises no flags.
    """
    global _reference_cache
    if _reference_cache is not None and not force_reload:
        return _reference_cache

    records: List[Dict[str, Any]] = []

    try:
        from app.services.supabase_client import supabase_service
        client = getattr(supabase_service, "client", None)
        if client is not None:
            res = client.table("reference_records").select("*").execute()
            if res.data:
                records = list(res.data)
    except Exception as exc:
        logger.warning("Reference master unavailable from Supabase (%s); using bundled copy.", exc)

    if not records:
        try:
            payload = json.loads(_REFERENCE_PATH.read_text(encoding="utf-8"))
            records = payload.get("records", []) if isinstance(payload, dict) else list(payload)
        except Exception as exc:
            logger.warning("Bundled reference master unreadable (%s); cross-verification disabled.", exc)
            records = []

    _reference_cache = records
    return records


def _match_reference(village: Any, survey: Any) -> Optional[Dict[str, Any]]:
    survey_key = normalise_survey(survey)
    if not survey_key:
        return None
    village_keys = set(village_forms(village))

    for row in load_reference():
        if normalise_survey(row.get("survey_number")) != survey_key:
            continue
        # A survey number is only unique within its village.
        if village_keys and not (village_keys & set(village_forms(row.get("village")))):
            continue
        return row
    return None


# ---------------------------------------------------------------------------
# Area comparison
# ---------------------------------------------------------------------------
def _to_sqm(raw_value: Any, raw_unit: Any, state: Optional[str]) -> Optional[float]:
    """Both sides converted the same way, so the comparison means something."""
    try:
        from app.services import survey_math as sm
        from app.services.record_to_document import parse_area

        value, unit, _ = parse_area(raw_value, str(raw_unit or "") or None, state)
        if value is None or unit is None:
            return None
        return float(sm.convert_area(value, unit, state))
    except Exception as exc:
        logger.warning("Area could not be converted for cross-check (%s).", exc)
        return None


# ---------------------------------------------------------------------------
# Public checks
# ---------------------------------------------------------------------------
def check_reference(extracted: Dict[str, Any]) -> List[ValidationFlag]:
    """Compare an extraction against the department's own record of the parcel."""
    flags: List[ValidationFlag] = []
    try:
        village = _field_value(extracted.get("village"))
        survey = _field_value(extracted.get("survey_number"))
        if not survey:
            return flags

        row = _match_reference(village, survey)
        if row is None:
            flags.append(ValidationFlag(
                id="REF_NOT_FOUND",
                field="survey_number",
                severity=SeverityLevel.INFO,
                message=(
                    f"Survey number {survey} in village {village or 'unknown'} was not found "
                    f"in the reference master. This is expected for a newly surveyed or "
                    f"recently sub-divided parcel."
                ),
                suggested_action="Confirm against the village register before certifying.",
            ))
            return flags

        matched = True
        state = extracted.get("state") or row.get("state") or "Maharashtra"

        # --- owner ---------------------------------------------------------
        doc_owner = _field_value(extracted.get("owner_name")) or ""
        ref_owner = row.get("owner_name") or ""
        if doc_owner and ref_owner and _normalise_owner(doc_owner) != _normalise_owner(ref_owner):
            matched = False
            flags.append(ValidationFlag(
                id="REF_OWNER_MISMATCH",
                field="owner_name",
                severity=SeverityLevel.CONFLICT,
                message=(
                    f"Owner on the document is \"{doc_owner}\" but the reference master "
                    f"records \"{ref_owner}\" for survey number {survey}."
                ),
                suggested_action="Check the mutation history — an unrecorded transfer looks exactly like this.",
            ))

        # --- area ----------------------------------------------------------
        doc_sqm = _to_sqm(_field_value(extracted.get("area")), extracted.get("area_unit"), state)
        ref_sqm = _to_sqm(row.get("area"), row.get("area_unit"), state)
        if doc_sqm and ref_sqm and ref_sqm > 0:
            delta_pct = abs(doc_sqm - ref_sqm) / ref_sqm * 100.0
            if delta_pct > _AREA_TOLERANCE_PCT:
                matched = False
                severity = (SeverityLevel.CONFLICT if delta_pct > _AREA_CONFLICT_PCT
                            else SeverityLevel.WARNING)
                flags.append(ValidationFlag(
                    id="REF_AREA_MISMATCH",
                    field="area",
                    severity=severity,
                    message=(
                        f"Area on the document is {_field_value(extracted.get('area'))} "
                        f"{extracted.get('area_unit') or ''}".strip()
                        + f" ({doc_sqm:.2f} sq m) but the reference master records "
                          f"{row.get('area')} {row.get('area_unit') or ''}".rstrip()
                        + f" ({ref_sqm:.2f} sq m) — a difference of {delta_pct:.1f}%."
                    ),
                    suggested_action=(
                        "Re-measure against the tippan before certifying."
                        if severity == SeverityLevel.CONFLICT
                        else "Confirm the area figure against the village register."
                    ),
                ))

        if matched:
            flags.append(ValidationFlag(
                id="REF_MATCH",
                field="survey_number",
                severity=SeverityLevel.INFO,
                message=(
                    f"Matches reference master: survey number {survey}, owner and area "
                    f"agree with the {row.get('source') or 'RoR master'} entry."
                ),
                suggested_action="",
            ))
    except Exception as exc:
        logger.warning("Reference cross-check skipped (%s).", exc)
    return flags


def _existing_records() -> List[Dict[str, Any]]:
    """Submitted records, from Supabase when configured, else the in-memory list."""
    try:
        from app.services.supabase_client import supabase_service
        client = getattr(supabase_service, "client", None)
        if client is not None:
            res = client.table("land_records").select(
                "id, village, survey_number, owner_name, status, created_at"
            ).execute()
            if res.data:
                return list(res.data)
    except Exception as exc:
        logger.warning("Duplicate check could not query Supabase (%s); using local records.", exc)

    try:
        from app.api.land_records import MOCK_RECORDS
        return list(MOCK_RECORDS)
    except Exception as exc:
        logger.warning("Duplicate check found no local records (%s).", exc)
        return []


def check_duplicates(extracted: Dict[str, Any], exclude_id: Optional[str] = None) -> List[ValidationFlag]:
    """Has this survey number already been submitted by someone?"""
    flags: List[ValidationFlag] = []
    try:
        survey_key = normalise_survey(_field_value(extracted.get("survey_number")))
        if not survey_key:
            return flags
        village_keys = set(village_forms(_field_value(extracted.get("village"))))
        doc_owner = _normalise_owner(_field_value(extracted.get("owner_name")))

        for row in _existing_records():
            row_id = row.get("id")
            if exclude_id and row_id == exclude_id:
                continue
            if normalise_survey(_field_value(row.get("survey_number"))) != survey_key:
                continue
            if village_keys and not (village_keys & set(village_forms(_field_value(row.get("village"))))):
                continue

            # Supabase hands back a plain string, the in-memory list a
            # RecordStatus enum whose str() is "RecordStatus.REJECTED" — which
            # would quietly defeat the exclusion below and read badly in the
            # message, so unwrap to the value either way.
            raw_status = row.get("status")
            status = str(getattr(raw_status, "value", raw_status) or "").upper()
            # A rejected application is not a live claim on the parcel.
            if status == "REJECTED":
                continue

            existing_owner = _field_value(row.get("owner_name")) or "unknown owner"
            submitted = row.get("created_at") or row.get("submission_date") or "an earlier date"
            message = (
                f"Survey number {_field_value(extracted.get('survey_number'))} is already on file as "
                f"record {row_id}, submitted by \"{existing_owner}\" on {str(submitted)[:10]} "
                f"(status {status or 'UNKNOWN'})."
            )
            action = "Confirm whether this is a resubmission of the same application."
            if doc_owner and _normalise_owner(existing_owner) != doc_owner:
                message += (
                    f" The owner named here is \"{_field_value(extracted.get('owner_name'))}\", which "
                    f"differs — two parties are claiming the same parcel."
                )
                action = "Treat as a competing claim: do not certify until ownership is resolved."

            flags.append(ValidationFlag(
                id="DUPLICATE_RECORD",
                field="survey_number",
                severity=SeverityLevel.CONFLICT,
                message=message,
                suggested_action=action,
            ))
            break  # One flag is enough; the officer needs to look either way.
    except Exception as exc:
        logger.warning("Duplicate check skipped (%s).", exc)
    return flags
