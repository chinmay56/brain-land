"""
A starting point for the map, not an authoritative position.

Every geometry this system plots is derived from the document itself and says
so honestly — see document_geometry.py. This module is different on purpose:
it exists only to save the officer from hunting across a blank map for a
village before they trace or pin the actual parcel. What it returns must
never be confused with a surveyed or officer-confirmed position, so it is
kept out of the geometry pipeline entirely and labelled as a suggestion
everywhere it surfaces.

Source: OpenStreetMap Nominatim, a community-maintained free geocoder. It is
not Survey of India, Census, or Bhuvan cadastral data — those require a
formal data-sharing request to the state Land Records Department and are not
available as a public API. Nominatim is what is actually reachable without
that, and for locating a named village it is usually good enough to zoom the
map to roughly the right place.
"""
from __future__ import annotations

import asyncio
import re
import time
from typing import Any, Dict, List, Optional

import httpx

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"

# Nominatim's usage policy caps unauthenticated use at ~1 request/second and
# requires an identifying User-Agent. A real village name is looked up once
# and then always comes from the extraction, so this cache also means a
# given village is only ever geocoded once per process lifetime.
_CACHE: Dict[str, Optional[Dict[str, Any]]] = {}
_last_call = 0.0
_MIN_INTERVAL_S = 1.0


# Extraction writes place names bilingually — "मेहरुण (Mehrun)", "जळगाव (Jalgaon)".
# Nominatim matches neither that combined form nor a trailing bracket, but it
# does index both the Latin and the Devanagari name on their own.
_BRACKETED = re.compile(r"\(([^)]*)\)")


def _name_forms(text: str) -> List[str]:
    """['Mehrun', 'मेहरुण'] for 'मेहरुण (Mehrun)' — best-matching form first."""
    text = (text or "").strip()
    if not text:
        return []
    inner = [m.strip() for m in _BRACKETED.findall(text) if m.strip()]
    outer = _BRACKETED.sub("", text).strip()
    forms = [*inner, outer, text]
    seen, out = set(), []
    for f in forms:
        if f and f.lower() not in seen:
            seen.add(f.lower())
            out.append(f)
    return out


def _queries(village: str, tehsil: str, district: str, state: str) -> List[str]:
    """Query candidates, most specific and most matchable first."""
    villages = _name_forms(village)
    tehsils = _name_forms(tehsil) or [""]
    districts = _name_forms(district) or [""]
    out: List[str] = []
    for v in villages:
        for admin in ((districts[0], tehsils[0]), ("", "")):
            parts = [v, admin[1], admin[0], state, "India"]
            q = ", ".join(p for p in parts if p)
            if q not in out:
                out.append(q)
    return out


async def _throttle() -> None:
    global _last_call
    wait = _MIN_INTERVAL_S - (time.monotonic() - _last_call)
    if wait > 0:
        await asyncio.sleep(wait)
    _last_call = time.monotonic()


async def suggest_location(
    village: str, tehsil: str = "", district: str = "", state: str = "Maharashtra",
) -> Optional[Dict[str, Any]]:
    """
    Best-effort geocode of a village name, for zooming the map only.

    Returns None on any failure — a missing suggestion must never block the
    officer from tracing or pinning the parcel by hand, which works with no
    network call at all.
    """
    candidates = _queries(village, tehsil, district, state)
    if not candidates:
        return None

    cache_key = candidates[0].lower()
    if cache_key in _CACHE:
        return _CACHE[cache_key]

    result: Optional[Dict[str, Any]] = None
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            for query in candidates:
                await _throttle()
                resp = await client.get(
                    NOMINATIM_URL,
                    params={"q": query, "format": "jsonv2", "limit": 1,
                            "countrycodes": "in"},
                    headers={"User-Agent": "brain-land-sih-prototype/1.0 "
                                           "(land record digitization demo)"},
                )
                resp.raise_for_status()
                hits = resp.json()
                if hits:
                    hit = hits[0]
                    result = {
                        "lon": float(hit["lon"]),
                        "lat": float(hit["lat"]),
                        "display_name": hit.get("display_name", query),
                        "matched_query": query,
                        "source": "OpenStreetMap Nominatim",
                        "note": ("An unconfirmed starting point, not a cadastral "
                                 "centroid. Confirm the real position by tracing the "
                                 "parcel or dropping a pin."),
                    }
                    break
    except Exception:                                          # pragma: no cover
        # Geocoding is a convenience. Any failure (network, rate limit,
        # malformed response) just means no suggestion — never an error the
        # officer has to deal with.
        result = None

    _CACHE[cache_key] = result
    return result
