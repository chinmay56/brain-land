from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/auth", tags=["Authentication"])

class CitizenLoginRequest(BaseModel):
    identifier: str  # Mobile or Aadhaar
    otp_or_password: str

class OfficerLoginRequest(BaseModel):
    employee_id: str
    password: str
    security_pin: str

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
            "state": "Maharashtra"
        }
    }

@router.post("/officer-login")
async def officer_login(req: OfficerLoginRequest):
    return {
        "success": True,
        "token": f"mock_officer_jwt_{req.employee_id}",
        "user": {
            "id": "off_rev_409",
            "name": "Shri Vikramaditya Joshi",
            "role": "OFFICER",
            "employeeId": req.employee_id,
            "designation": "Sub-Divisional Revenue Officer (SDO)",
            "district": "Pune Division"
        }
    }
