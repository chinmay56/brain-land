"""
Who is calling, and are they allowed to.

Every protected endpoint resolves the caller here. The token is verified by
Supabase itself rather than decoded locally: a signature check against a shared
secret would still trust whatever role the token claimed, and the role is the
thing being decided on. The authoritative role lives in public.profiles, which
a user cannot write to, and is read with the service-role client so the lookup
is not itself subject to RLS.

A short cache exists because the alternative is two network round trips on
every request, but it is keyed on the raw token: a revoked session stops
working within the TTL at worst, and any change of role takes effect then too.
"""
from __future__ import annotations

import logging
import time
from typing import Any, Dict, Optional

from fastapi import HTTPException, Request

logger = logging.getLogger(__name__)

_CACHE_TTL_S = 300.0
_cache: Dict[str, tuple] = {}          # token -> (expires_at, user dict)


def _unauthorised(detail: str) -> HTTPException:
    return HTTPException(status_code=401, detail=detail)


def _bearer_token(request: Request) -> str:
    header = request.headers.get("authorization") or request.headers.get("Authorization")
    if not header:
        raise _unauthorised("Missing Authorization header.")
    parts = header.split(None, 1)
    if len(parts) != 2 or parts[0].lower() != "bearer" or not parts[1].strip():
        raise _unauthorised("Authorization header must be 'Bearer <token>'.")
    return parts[1].strip()


def _profile_for(client: Any, user_id: str) -> Dict[str, Any]:
    """The caller's authoritative role and jurisdiction."""
    try:
        res = (client.table("profiles")
               .select("role, full_name, district, tehsil, employee_id")
               .eq("id", user_id)
               .single()
               .execute())
        return res.data or {}
    except Exception as exc:
        logger.warning("Profile lookup failed for %s: %s", user_id, exc)
        return {}


async def get_current_user(request: Request) -> Dict[str, Any]:
    """The authenticated caller, or 401. 503 when auth is not configured."""
    from app.config import settings
    from app.services.supabase_client import supabase_service

    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        # Refusing is the only safe answer: without a way to verify tokens this
        # process cannot tell an officer from an anonymous caller.
        raise HTTPException(status_code=503, detail="Authentication not configured")

    token = _bearer_token(request)

    cached = _cache.get(token)
    if cached and cached[0] > time.monotonic():
        return cached[1]

    client = getattr(supabase_service, "client", None)
    if client is None:
        raise HTTPException(status_code=503, detail="Authentication not configured")

    try:
        result = client.auth.get_user(token)
    except Exception as exc:
        logger.info("Token rejected: %s", exc)
        raise _unauthorised("Invalid or expired session.")

    auth_user = getattr(result, "user", None)
    if auth_user is None or not getattr(auth_user, "id", None):
        raise _unauthorised("Invalid or expired session.")

    profile = _profile_for(client, auth_user.id)
    user = {
        "id": auth_user.id,
        "email": getattr(auth_user, "email", None),
        # Absent profile means absent privileges, never assumed ones.
        "role": (profile.get("role") or "CITIZEN").upper(),
        "name": profile.get("full_name") or getattr(auth_user, "email", "") or "User",
        "district": profile.get("district"),
        "tehsil": profile.get("tehsil"),
        "employee_id": profile.get("employee_id"),
    }

    _cache[token] = (time.monotonic() + _CACHE_TTL_S, user)
    if len(_cache) > 512:                       # bounded; tokens are short-lived
        now = time.monotonic()
        for key, (expires, _) in list(_cache.items()):
            if expires <= now:
                _cache.pop(key, None)
    return user


async def require_officer(request: Request) -> Dict[str, Any]:
    """An authenticated caller who is a revenue officer, or 403."""
    user = await get_current_user(request)
    if user.get("role") != "OFFICER":
        raise HTTPException(
            status_code=403,
            detail="This action is restricted to revenue officers.",
        )
    return user


def invalidate_cached_token(token: Optional[str]) -> None:
    """Drop a token from the cache, e.g. on sign-out."""
    if token:
        _cache.pop(token, None)
