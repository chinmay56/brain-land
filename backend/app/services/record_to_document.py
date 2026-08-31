"""
Adapter: OCR extraction output  ->  the geometry engine's DocumentIn contract.

The extraction stage and the geometry stage were built independently against
different shapes. This is the seam between them, and it lives here rather than
in either side so neither has to know about the other.

The hard part is area. A Maharashtra land record does not write area as one
decimal number. It writes:

    0-12-50            hectare - are - square metre (the 7/12 standard)
    2 acre 15 guntha   a compound of two units
    281.25 Sq. Meters  a plain number, but the unit name varies wildly
    1.80 Hectares

Their extraction schema asks Sarvam for "numeric value only", which silently
loses the second component of every compound area. This module recovers what it
can and flags what it cannot, because a wrong area is worse than a missing one:
it will quietly fail the area-reconciliation check on a perfectly good parcel.
"""
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

from . import survey_math as sm

# ---------------------------------------------------------------------------
# Unit name normalisation. The extraction schema lets Sarvam return free text
# ("Hectares", "Sq. Meters", "Acre-Guntha"), so map it onto the tokens
# survey_math.convert_area understands.
# ---------------------------------------------------------------------------
UNIT_ALIASES: Dict[str, str] = {
    "hectare": "hectare", "hectares": "hectare", "ha": "hectare",
    "hect": "hectare", "हेक्टर": "hectare",
    "acre": "acre", "acres": "acre", "एकर": "acre",
    "guntha": "guntha", "gunthas": "guntha", "gunta": "guntha", "गुंठे": "guntha",
    "are": "are", "आर": "are",
    "sqm": "sqm", "sq m": "sqm", "sq.m": "sqm", "sq. m": "sqm",
    "sqmeter": "sqm", "sq meter": "sqm", "sq meters": "sqm",
    "sq. meter": "sqm", "sq. meters": "sqm", "square meter": "sqm",
    "square meters": "sqm", "square metre": "sqm", "m2": "sqm",
    "चौरस मीटर": "sqm", "चौ.मी": "sqm",
    "sqft": "sqft", "sq ft": "sqft", "sq. ft": "sqft", "square feet": "sqft",
    "sqyd": "sqyd", "sq yd": "sqyd", "square yard": "sqyd",
    "bigha": "bigha", "बिघा": "bigha",
    "katha": "katha", "kattha": "katha",
    "kanal": "kanal", "marla": "marla", "cent": "cent", "ground": "ground",
}

# Compound units: "Acre-Guntha" means the value carries both, e.g. "2-15".
COMPOUND_UNITS: Dict[str, Tuple[str, ...]] = {
    "acre-guntha": ("acre", "guntha"),
    "acre guntha": ("acre", "guntha"),
    "h-r-p": ("hectare", "are", "sqm"),
    "hectare-are-sqm": ("hectare", "are", "sqm"),
}

# "2 acre 15 guntha" — a number followed by a unit word, repeated.
_INLINE_PAIR = re.compile(
    r"(\d+(?:\.\d+)?)\s*"
    r"(hectares?|ha\b|acres?|gunthas?|gunta|ares?|bighas?|kath?ha|kanal|marla|"
    r"cents?|grounds?|sq\.?\s*m(?:eters?|etres?)?|sq\.?\s*ft|square\s+\w+|"
    r"हेक्टर|एकर|गुंठे|आर|बिघा)",
    re.I,
)

# "0-12-50" or "0.12.50" — a positional triple with no unit words at all.
_POSITIONAL = re.compile(r"^\s*(\d+)\s*[-./]\s*(\d+)\s*[-./]\s*(\d+)\s*$")
_POSITIONAL_PAIR = re.compile(r"^\s*(\d+)\s*[-]\s*(\d+)\s*$")


def normalise_unit(unit: Optional[str]) -> Optional[str]:
    if not unit:
        return None
    key = str(unit).strip().lower().replace("_", " ")
    key = re.sub(r"\s+", " ", key)
    return UNIT_ALIASES.get(key) or UNIT_ALIASES.get(key.replace(".", "")) or None


def parse_area(
    raw_value: Any,
    raw_unit: Optional[str],
    state: Optional[str] = None,
) -> Tuple[Optional[float], Optional[str], List[str]]:
    """
    Turn whatever the extractor produced into (value, unit_token) that the
    geometry engine can consume, plus any warnings worth surfacing.

    Returns (value_in_unit, unit_token, warnings). The engine converts to m2
    itself so that regional units still get the state-aware treatment.
    """
    warnings: List[str] = []
    if raw_value is None or str(raw_value).strip() == "":
        return None, None, ["Document states no area — geometry cannot be cross-checked."]

    text = str(raw_value).strip()
    unit_key = re.sub(r"\s+", " ", str(raw_unit or "").strip().lower())

    # --- Case 1: the unit itself declares a compound (H-R-P, Acre-Guntha) ----
    parts = COMPOUND_UNITS.get(unit_key)
    if parts:
        m = _POSITIONAL.match(text) or _POSITIONAL_PAIR.match(text)
        if m:
            nums = [float(g) for g in m.groups()]
            total = 0.0
            for n, u in zip(nums, parts):
                total += sm.convert_area(n, u, state)
            return round(total, 6), "sqm", warnings
        # unit says compound but value is a single number — ambiguous
        try:
            single = float(text)
        except ValueError:
            return None, None, [f"Could not read area {text!r} against unit {raw_unit!r}."]
        warnings.append(
            f"Unit is '{raw_unit}' (a compound) but the extracted value is a single "
            f"number ({single}). The second component was probably lost during "
            f"extraction — treating it as {parts[0]} only."
        )
        return single, parts[0], warnings

    # --- Case 2: inline compound, "2 acre 15 guntha" -------------------------
    pairs = _INLINE_PAIR.findall(text)
    if len(pairs) >= 2:
        total = 0.0
        used: List[str] = []
        for num, unit_word in pairs:
            token = normalise_unit(unit_word)
            if token is None:
                warnings.append(f"Unrecognised unit '{unit_word}' inside area {text!r}.")
                continue
            total += sm.convert_area(float(num), token, state)
            used.append(f"{num} {token}")
        if total > 0:
            warnings.append(f"Compound area parsed as {' + '.join(used)}.")
            return round(total, 6), "sqm", warnings

    # --- Case 3: positional triple with no unit, assume H-R-P ---------------
    m = _POSITIONAL.match(text)
    if m and not unit_key:
        h, a, p = (float(g) for g in m.groups())
        total = (sm.convert_area(h, "hectare") + sm.convert_area(a, "are")
                 + sm.convert_area(p, "sqm"))
        warnings.append(
            f"Area {text!r} read as hectare-are-square metre ({h}-{a}-{p}), the "
            f"Maharashtra 7/12 convention. Confirm before certifying."
        )
        return round(total, 6), "sqm", warnings

    # --- Case 4: plain number + a simple unit -------------------------------
    number = re.search(r"-?\d+(?:\.\d+)?", text)
    if not number:
        return None, None, [f"No numeric value found in area {text!r}."]
    value = float(number.group())

    token = normalise_unit(raw_unit)
    if token is None:
        inline = _INLINE_PAIR.search(text)
        token = normalise_unit(inline.group(2)) if inline else None
    if token is None:
        warnings.append(
            f"Area unit {raw_unit!r} not recognised; assuming square metres. "
            f"Confirm this before relying on the area check."
        )
        token = "sqm"

    return value, token, warnings


# ---------------------------------------------------------------------------
# Field unwrapping — extraction returns FieldConfidence objects, plain dicts
# (once serialised through the API) or bare strings depending on the path.
# ---------------------------------------------------------------------------
def field_value(field: Any) -> Optional[str]:
    if field is None:
        return None
    if isinstance(field, str):
        return field.strip() or None
    value = getattr(field, "value", None)
    if value is None and isinstance(field, dict):
        value = field.get("value")
    if value is None:
        return None
    text = str(value).strip()
    return text if text and text.lower() not in ("null", "none") else None


def field_confidence(field: Any) -> Optional[float]:
    if field is None or isinstance(field, str):
        return None
    conf = getattr(field, "confidence", None)
    if conf is None and isinstance(field, dict):
        conf = field.get("confidence")
    return float(conf) if conf is not None else None


DIRECTIONS = ("north", "south", "east", "west")
_DIR_ALIASES = {
    "उत्तर": "north", "दक्षिण": "south", "पूर्व": "east", "पश्चिम": "west",
    "n": "north", "s": "south", "e": "east", "w": "west",
}


def extract_boundaries(record: Dict[str, Any]) -> Dict[str, str]:
    """
    Pull the four boundaries (चतुःसीमा) out of the extraction, whichever shape
    they arrive in: a nested object, flat north/south/east/west keys, or
    boundary_north / hadd_north style names.
    """
    raw = record.get("boundaries")
    out: Dict[str, str] = {}

    if isinstance(raw, dict):
        for key, value in raw.items():
            token = str(key).strip().lower()
            token = _DIR_ALIASES.get(token, token)
            text = field_value(value)
            if token in DIRECTIONS and text:
                out[token] = text
        if out:
            return out

    for direction in DIRECTIONS:
        for candidate in (direction, f"boundary_{direction}", f"hadd_{direction}",
                          f"{direction}_boundary"):
            if candidate in record:
                text = field_value(record[candidate])
                if text:
                    out[direction] = text
                    break
    return out


# ---------------------------------------------------------------------------
# The adapter
# ---------------------------------------------------------------------------
def record_to_document(
    record: Dict[str, Any],
    fallback_state: Optional[str] = None,
    document_id: str = "",
    document_type: str = "",
) -> Tuple[Dict[str, Any], List[Dict[str, str]]]:
    """
    Map an extraction result onto the DocumentIn shape.

    Returns (document, notes). `notes` carries anything the officer should see
    about how the mapping was done — recovered compound areas, assumed units,
    missing boundaries. Nothing is silently guessed.
    """
    notes: List[Dict[str, str]] = []

    def note(code: str, severity: str, message: str) -> None:
        notes.append({"code": code, "severity": severity, "message": message})

    survey_no = field_value(record.get("survey_number")) \
        or field_value(record.get("survey_no")) \
        or field_value(record.get("khasra_number"))
    if not survey_no:
        note("SURVEY_NO_MISSING", "CRITICAL",
             "No survey / khasra number extracted. Without it the parcel cannot be "
             "joined to a cadastral map or to its neighbours.")
        survey_no = "UNKNOWN"

    state = field_value(record.get("state")) or fallback_state
    if not state:
        note("STATE_MISSING", "WARNING",
             "State not extracted. Regional area units (bigha, katha) cannot be "
             "converted without it.")

    area_value, area_unit, area_warnings = parse_area(
        field_value(record.get("area")), record.get("area_unit"), state
    )
    for message in area_warnings:
        note("AREA_PARSE", "WARNING", message)

    boundaries = extract_boundaries(record)
    if not boundaries:
        note("BOUNDARIES_MISSING", "WARNING",
             "No four-boundaries (चतुःसीमा) extracted. This is present on almost "
             "every Indian land record and is what lets a parcel be positioned "
             "against its neighbours. Add a 'boundaries' field to the extraction "
             "schema.")

    document: Dict[str, Any] = {
        "survey_no": survey_no,
        "village": field_value(record.get("village")) or "",
        "tehsil": field_value(record.get("tehsil")) or "",
        "district": field_value(record.get("district")) or "",
        "state": state or "",
        "lgd_village_code": field_value(record.get("lgd_village_code")) or "",
        "document_id": document_id or field_value(record.get("document_id")) or "",
        "document_type": document_type or field_value(record.get("document_type")) or "",
        "owner_name": field_value(record.get("owner_name")),
        "khasra_no": field_value(record.get("khasra_number")),
        "khata_no": field_value(record.get("khata_number")),
        "area_value": area_value,
        "area_unit": area_unit,
        "boundaries": boundaries,
    }

    # Geometry sources, if the extractor ever produces them.
    for key in ("coordinates", "traverse", "chain_offset", "control_points"):
        if record.get(key):
            document[key] = record[key]

    if not any(document.get(k) for k in ("coordinates", "traverse", "chain_offset")):
        note("NO_GEOMETRY_IN_DOCUMENT", "INFO",
             "This document carries no coordinates, traverse or chain-and-offset "
             "measurements — which is normal for a 7/12, jamabandi or sale deed. "
             "Position must come from a cadastral lookup, the parcel's tippan, or "
             "an officer tracing it.")

    return {k: v for k, v in document.items() if v not in (None, "")}, notes
