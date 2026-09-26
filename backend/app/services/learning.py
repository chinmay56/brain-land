"""
The feedback loop: what humans keep correcting, fed back into the extractor.

This is deliberately not machine learning. It is the honest version of
"improves accuracy over time" that the available data actually supports: every
officer approval and citizen correction already records what the AI read beside
what a human replaced it with (see frontend/src/lib/auditLog.ts). Aggregate
those, find the fields that are wrong often enough to matter, and tell the
extractor about them in its own schema descriptions.

Two properties matter more than sophistication here:

  * It must never affect whether a document extracts. A statistics query is not
    allowed to break or delay reading a land record, so everything is cached,
    time-boxed, and swallows its own failures.

  * It must only speak from verified corrections. A hint is generated from what
    an officer actually changed and certified, not from a model's own guess at
    its weak spots.
"""
from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

# The same twelve the extractor targets, plus co_owners, which is corrected
# often enough to be worth watching.
LEARNING_FIELDS: Tuple[str, ...] = (
    "owner_name", "survey_number", "khasra_number", "khata_number", "area",
    "village", "tehsil", "district", "land_classification",
    "ownership_details", "mutation_number", "registration_info", "co_owners",
)

EXTRACTION_ACTION = "OCR_EXTRACTED"
CORRECTION_ACTIONS = ("CITIZEN_CORRECTION", "CERTIFIED_APPROVED", "REJECTED")
ALL_ACTIONS = (EXTRACTION_ACTION,) + CORRECTION_ACTIONS

# A field needs to be wrong repeatedly, and wrong often, before it is worth
# spending prompt space on. One bad scan is not a pattern.
MIN_CORRECTIONS_FOR_HINT = 3
MIN_CORRECTION_RATE_FOR_HINT = 0.20
MAX_HINTED_FIELDS = 3
MAX_PAIRS_PER_HINT = 3
MAX_VALUE_LEN = 60

_CACHE_TTL_S = 60.0
_cache: Dict[str, Any] = {"stats": None, "hints": None, "at": 0.0}


# ---------------------------------------------------------------------------
# Loading
# ---------------------------------------------------------------------------
def load_corrections() -> List[Dict[str, Any]]:
    """Audit rows that say something about extraction quality. [] if unavailable."""
    try:
        from app.services.supabase_client import supabase_service
        client = getattr(supabase_service, "client", None)
        if client is None:
            return []
        res = (client.table("audit_logs")
               .select("action, changes, created_at")
               .in_("action", list(ALL_ACTIONS))
               .order("created_at", desc=True)
               .limit(2000)
               .execute())
        return list(res.data or [])
    except Exception as exc:
        logger.warning("Correction history unavailable (%s); learning disabled.", exc)
        return []


def _human_value(entry: Any) -> Optional[str]:
    """The value a person put in place of the AI's reading, if they replaced it."""
    if not isinstance(entry, dict):
        return None
    for key in ("officer", "citizen"):
        if key in entry and entry[key] is not None:
            return str(entry[key])
    return None


def _ai_value(entry: Any) -> Optional[str]:
    if not isinstance(entry, dict):
        return None
    # OCR_EXTRACTED rows carry {value, confidence}; correction rows carry {ai, ...}.
    for key in ("ai", "value"):
        if key in entry and entry[key] is not None:
            return str(entry[key])
    return None


def _parsed_time(row: Dict[str, Any]) -> Optional[datetime]:
    raw = row.get("created_at")
    if not raw:
        return None
    try:
        return datetime.fromisoformat(str(raw).replace("Z", "+00:00"))
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# Statistics
# ---------------------------------------------------------------------------
def _accuracy(rows: List[Dict[str, Any]]) -> Optional[float]:
    """1 - (corrections / extractions) across every field, or None with no data."""
    extracted = corrected = 0
    for row in rows:
        changes = row.get("changes")
        if not isinstance(changes, dict):
            continue
        action = row.get("action")
        for field in LEARNING_FIELDS:
            entry = changes.get(field)
            if entry is None:
                continue
            if action == EXTRACTION_ACTION:
                extracted += 1
            elif action in CORRECTION_ACTIONS and _human_value(entry) is not None:
                if _human_value(entry) != _ai_value(entry):
                    corrected += 1
    if extracted == 0:
        return None
    return max(0.0, 1.0 - corrected / extracted)


def compute_stats(force: bool = False) -> Dict[str, Any]:
    """Per-field correction rates, overall accuracy, and a 7-day trend."""
    now = time.monotonic()
    if not force and _cache["stats"] is not None and (now - _cache["at"]) < _CACHE_TTL_S:
        return _cache["stats"]

    rows = load_corrections()

    fields: Dict[str, Dict[str, Any]] = {
        name: {"extracted": 0, "corrected": 0, "correction_rate": 0.0, "recent_pairs": []}
        for name in LEARNING_FIELDS
    }
    records_extracted = 0
    records_verified = 0

    for row in rows:
        action = row.get("action")
        if action == EXTRACTION_ACTION:
            records_extracted += 1
        elif action == "CERTIFIED_APPROVED":
            records_verified += 1

        changes = row.get("changes")
        if not isinstance(changes, dict):
            continue

        for field in LEARNING_FIELDS:
            entry = changes.get(field)
            if entry is None:
                continue
            bucket = fields[field]
            if action == EXTRACTION_ACTION:
                bucket["extracted"] += 1
                continue
            if action not in CORRECTION_ACTIONS:
                continue
            human = _human_value(entry)
            ai = _ai_value(entry)
            if human is None or human == ai:
                continue
            bucket["corrected"] += 1
            # Rows arrive newest-first, so the first five seen are the latest.
            if len(bucket["recent_pairs"]) < 5:
                bucket["recent_pairs"].append({
                    "ai": ai, "corrected": human, "when": row.get("created_at"),
                })

    total_extracted = total_corrected = 0
    for bucket in fields.values():
        if bucket["extracted"] > 0:
            bucket["correction_rate"] = round(bucket["corrected"] / bucket["extracted"], 4)
            total_extracted += bucket["extracted"]
            total_corrected += bucket["corrected"]

    field_accuracy = (round(max(0.0, 1.0 - total_corrected / total_extracted), 4)
                      if total_extracted else None)

    top_corrected = sorted(
        [name for name, b in fields.items()
         if b["corrected"] >= MIN_CORRECTIONS_FOR_HINT
         and b["correction_rate"] >= MIN_CORRECTION_RATE_FOR_HINT],
        key=lambda n: fields[n]["correction_rate"],
        reverse=True,
    )[:MAX_HINTED_FIELDS]

    # Trend: the last seven days against everything before them.
    cutoff = datetime.now(timezone.utc) - timedelta(days=7)
    recent_rows, older_rows = [], []
    for row in rows:
        stamp = _parsed_time(row)
        (recent_rows if stamp and stamp >= cutoff else older_rows).append(row)
    recent_acc = _accuracy(recent_rows)
    previous_acc = _accuracy(older_rows)

    stats = {
        "fields": fields,
        "overall": {
            "records_extracted": records_extracted,
            "records_verified": records_verified,
            "field_accuracy": field_accuracy,
            "top_corrected": top_corrected,
        },
        "trend": {
            "recent_7d": recent_acc,
            "previous": previous_acc,
            "delta": (round(recent_acc - previous_acc, 4)
                      if recent_acc is not None and previous_acc is not None else None),
        },
    }

    _cache["stats"] = stats
    _cache["hints"] = None          # recomputed lazily from the fresh stats
    _cache["at"] = now
    return stats


# ---------------------------------------------------------------------------
# Hints
# ---------------------------------------------------------------------------
def _clean(value: Any) -> Optional[str]:
    if value is None:
        return None
    text = " ".join(str(value).split())
    if not text or len(text) > MAX_VALUE_LEN:
        return None
    return text


def build_prompt_hints(force: bool = False) -> Dict[str, str]:
    """One sentence per frequently-corrected field, in that field's own words."""
    try:
        stats = compute_stats(force=force)
        if _cache["hints"] is not None and not force:
            return _cache["hints"]

        hints: Dict[str, str] = {}
        for field in stats["overall"]["top_corrected"]:
            examples = []
            for pair in stats["fields"][field]["recent_pairs"][:MAX_PAIRS_PER_HINT]:
                ai, corrected = _clean(pair.get("ai")), _clean(pair.get("corrected"))
                if ai and corrected:
                    examples.append(f"'{ai}' was corrected to '{corrected}'")
            if not examples:
                continue
            hints[field] = (
                "Verified corrections show this field is often misread: "
                + "; ".join(examples)
                + ". Read it with extra care and return null if unsure."
            )

        _cache["hints"] = hints
        return hints
    except Exception as exc:
        logger.warning("Prompt hints unavailable (%s); extracting without them.", exc)
        return {}
