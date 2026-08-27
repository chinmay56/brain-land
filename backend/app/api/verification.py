from fastapi import APIRouter, HTTPException
from app.models.schemas import OfficerVerificationAction
from datetime import datetime

router = APIRouter(prefix="/verification", tags=["Officer Verification"])

@router.post("/process-decision")
async def process_verification_decision(action: OfficerVerificationAction):
    if action.action == "APPROVE":
        return {
            "success": True,
            "record_id": action.record_id,
            "new_status": "VERIFIED",
            "certified_by": action.officer_id,
            "certified_at": datetime.now().isoformat(),
            "remarks": action.remarks,
            "message": f"Land Record {action.record_id} successfully verified and certified in DoLR registry."
        }
    elif action.action == "REJECT":
        if not action.reason:
            raise HTTPException(status_code=400, detail="Rejection reason is required")
        return {
            "success": True,
            "record_id": action.record_id,
            "new_status": "REJECTED",
            "rejected_by": action.officer_id,
            "rejected_at": datetime.now().isoformat(),
            "reason": action.reason,
            "remarks": action.remarks,
            "message": f"Land Record {action.record_id} rejected and returned to citizen for re-submission."
        }
    else:
        raise HTTPException(status_code=400, detail="Invalid verification action")
