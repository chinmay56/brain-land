"""
Certification, decided on the server.

This used to mutate an in-memory list that nothing read, while the browser did
the real work by writing to the database directly. That put the decision, the
identity of the officer making it, and the record of what changed all under the
control of the client. Here the officer comes from the token, the pre-update
values are read before they are overwritten, and the audit row is written by
the same code that performed the update, so the trail cannot disagree with the
record.
"""
from datetime import datetime, timezone
from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException

from app.core.auth import require_officer
from app.models.schemas import OfficerVerificationAction

router = APIRouter(prefix="/verification", tags=["Officer Verification"])

# Only these may be rewritten by a certification. Anything else in the request
# is ignored rather than trusted — the client does not choose what is writable.
CORRECTABLE_FIELDS = (
    "owner_name", "survey_number", "khasra_number", "khata_number", "area",
    "area_unit", "village", "tehsil", "district", "land_classification",
    "ownership_details", "mutation_number", "registration_info",
)


@router.post("/process-decision")
async def process_verification_decision(
    action: OfficerVerificationAction,
    officer: Dict[str, Any] = Depends(require_officer),
):
    if action.action not in ("APPROVE", "REJECT"):
        raise HTTPException(status_code=400, detail="Invalid verification action")
    if action.action == "REJECT" and not action.reason:
        raise HTTPException(status_code=400, detail="Rejection reason is required")

    from app.services.supabase_client import supabase_service

    client = getattr(supabase_service, "client", None)
    if client is None:
        raise HTTPException(status_code=503, detail="Record store not configured")

    try:
        existing = (client.table("land_records").select("*")
                    .eq("id", action.record_id).single().execute()).data
    except Exception:
        existing = None
    if not existing:
        raise HTTPException(status_code=404, detail="Land record not found")

    approved = action.action == "APPROVE"
    remarks = (action.remarks if approved
               else f"REJECTED: {action.reason}. {action.remarks or ''}".strip())

    update: Dict[str, Any] = {
        "status": "VERIFIED" if approved else "REJECTED",
        "officer_remarks": remarks,
        "assigned_officer": officer["name"],
    }

    # What the officer typed over, against what was on the record beforehand.
    changes: Dict[str, Dict[str, Any]] = {}
    for field, new_value in (action.field_corrections or {}).items():
        if field not in CORRECTABLE_FIELDS:
            continue
        previous = existing.get(field)
        previous_text = "" if previous is None else str(previous)
        if str(new_value) == previous_text:
            continue
        update[field] = new_value
        changes[field] = {"ai": previous_text, "officer": str(new_value)}

    try:
        result = (client.table("land_records").update(update)
                  .eq("id", action.record_id).execute())
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Could not update the record: {exc}")

    # Written only now that the record itself has changed, and never from
    # anything the caller supplied about who they are.
    try:
        client.table("audit_logs").insert({
            "record_id": action.record_id,
            "action": "CERTIFIED_APPROVED" if approved else "REJECTED",
            "role": "OFFICER",
            "performed_by": officer["name"],
            "details": remarks or "",
            "changes": changes,
        }).execute()
    except Exception as exc:
        # The decision stands; the trail entry is what failed. Say so loudly in
        # the log rather than failing a certification that already happened.
        import logging
        logging.getLogger(__name__).error(
            "Audit row for %s could not be written: %s", action.record_id, exc)

    updated = (result.data or [None])[0] or {**existing, **update}
    return {
        "success": True,
        "record_id": action.record_id,
        "new_status": update["status"],
        "decided_by": officer["name"],
        "decided_at": datetime.now(timezone.utc).isoformat(),
        "reason": action.reason,
        "remarks": remarks,
        "fields_corrected": sorted(changes.keys()),
        "record": updated,
    }
