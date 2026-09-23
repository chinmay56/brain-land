"""
Identity endpoint.

Sign-in itself is done by the client against Supabase Auth; this service never
sees a password. What it offers is the other half: given a session token, who
does the server believe you are. That answer comes from public.profiles, not
from the token's own claims, so it is the same answer every guard uses.

The previous mock endpoints here issued a token to anybody who posted any
employee id and any password, and are gone.
"""
from fastapi import APIRouter, Depends, Request

from app.core.auth import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/me")
async def me(user: dict = Depends(get_current_user)):
    """The caller, as the server sees them. 401 without a valid session."""
    return {
        "success": True,
        "user": {
            "id": user["id"],
            "email": user.get("email"),
            "name": user.get("name"),
            "role": user.get("role"),
            "district": user.get("district"),
            "tehsil": user.get("tehsil"),
            "employee_id": user.get("employee_id"),
        },
    }
