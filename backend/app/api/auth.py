from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Authentication"])

class CitizenLoginRequest(BaseModel):
    identifier: str  # Mobile or Aadhaar
    otp_or_password: str

from typing import Optional

class OfficerLoginRequest(BaseModel):
    employee_id: str
    password: str
    security_pin: str
    designation: Optional[str] = "Sub-Divisional Revenue Officer (SDO)"
    district: Optional[str] = "Pune"
    tehsil: Optional[str] = "Haveli"

@router.post("/citizen-login")
async def citizen_login(req: CitizenLoginRequest):
    return {
        "success": True,
        "token": f"mock_citizen_jwt_{req.identifier}",
        "user": {
            "id": "usr_cit_001",
            "name": "Ramesh Baliram Patil",
            "role": "CITIZEN",
            "phone": req.identifier,
            "district": "Pune",
            "tehsil": "Haveli",
            "village": "Hadapsar",
            "state": "Maharashtra"
        }
    }

@router.post("/officer-login")
async def officer_login(req: OfficerLoginRequest):
    dist = req.district or "Pune"
    teh = req.tehsil or "Haveli"
    desig = req.designation or "Sub-Divisional Revenue Officer (SDO)"
    return {
        "success": True,
        "token": f"mock_officer_jwt_{req.employee_id}",
        "user": {
            "id": f"off_rev_{req.employee_id.replace('-', '_').lower()}",
            "name": "Shri Vikramaditya Joshi",
            "role": "OFFICER",
            "employeeId": req.employee_id,
            "designation": desig,
            "district": dist,
            "tehsil": teh,
            "assignedDistrict": dist,
            "assignedTehsil": teh,
            "state": "Maharashtra"
        }
    }
