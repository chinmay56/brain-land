"""
Coordinate reference systems for Indian cadastral work — the whole country.

Three things have to be right or every downstream number is wrong:

1. Degrees are not metres. Area, distance and buffering must happen in a
   projected CRS. Computing `.area` on raw lon/lat gives square degrees, which
   is meaningless and varies with latitude.

2. India spans UTM zones 42N to 47N. A single hard-coded zone is correct for one
   part of the country and progressively wrong everywhere else, so the zone is
   chosen per parcel from its own longitude.

3. Legacy cadastral records are not on WGS84. They are on Everest 1830 /
   Kalianpur, in the India zones (Lambert Conformal Conic, one per latitude
   band) laid down by the Survey of India. Reading those eastings and northings
   as if they were WGS84 puts a parcel hundreds of metres from where it is.
   The datum shift is real and it matters at cadastral scale.

Everything is resolved against pyproj's EPSG database at import rather than
hard-coded, so the registry cannot drift from the authority.
"""
from __future__ import annotations

import math
from dataclasses import dataclass
from functools import lru_cache
from typing import Dict, List, Optional, Sequence, Tuple

from pyproj import CRS, Transformer
from pyproj.database import query_crs_info

Point = Tuple[float, float]

# Storage / interchange CRS. GeoJSON is defined on WGS84 lon/lat (RFC 7946).
CRS_WGS84 = "EPSG:4326"

# The modern national projected CRS: WGS 84 / India NSF LCC. Covers the whole
# country including the islands, so it is the right frame for anything national
# — a state-wide or all-India mosaic, or a national progress dashboard.
CRS_INDIA_NSF = "EPSG:7755"

# Rough onshore + offshore envelope of India, used to catch a parcel that has
# been placed in the wrong hemisphere or had its lat/long swapped.
INDIA_BOUNDS = (68.0, 6.0, 97.5, 37.5)   # west, south, east, north

# UTM zones covering India. Zone number = floor((lon + 180) / 6) + 1.
UTM_ZONES_INDIA = {42: "EPSG:32642", 43: "EPSG:32643", 44: "EPSG:32644",
                   45: "EPSG:32645", 46: "EPSG:32646", 47: "EPSG:32647"}


class CRSError(ValueError):
    """Raised when a coordinate reference system cannot be resolved safely."""


# ===========================================================================
# Legacy India zones, built from the EPSG database at import
# ===========================================================================
@dataclass(frozen=True)
class IndiaZone:
    epsg: str
    name: str
    datum: str            # Kalianpur 1880 / 1937 / 1962 / 1975
    zone: str             # 0, I, IIa, IIb, IIIa, IVa
    lat_origin: float
    lon_origin: float
    bounds: Tuple[float, float, float, float]   # W, S, E, N

    def contains(self, lon: float, lat: float) -> bool:
        w, s, e, n = self.bounds
        return w <= lon <= e and s <= lat <= n


def _build_india_zone_registry() -> List[IndiaZone]:
    """
    Enumerate every 'India zone' projected CRS EPSG actually publishes.

    These are the Survey of India's Lambert Conformal Conic bands, one per
    latitude belt, on the Everest-derived Kalianpur datums. Their standard
    parallels are 39°30'N (zone 0), 32°30'N (I), 26°N (IIa/IIb), 19°N
    (IIIa/IIIb) and 12°N (IVa/IVb) — which is why an old sheet's zone can be
    inferred from where the land is.
    """
    zones: List[IndiaZone] = []
    for row in query_crs_info(auth_name="EPSG", pj_types=["PROJECTED_CRS"]):
        if "india zone" not in row.name.lower():
            continue
        crs = CRS.from_epsg(row.code)
        try:
            conv = crs.coordinate_operation
            params = {p.name.lower(): p.value for p in conv.params} if conv else {}
        except Exception:                                    # pragma: no cover
            params = {}

        lat0 = params.get("latitude of natural origin") \
            or params.get("latitude of false origin") or 0.0
        lon0 = params.get("longitude of natural origin") \
            or params.get("longitude of false origin") or 0.0

        datum, _, zone = row.name.partition(" / India zone ")
        b = row.area_of_use.bounds if row.area_of_use else (68.0, 6.0, 97.5, 37.5)

        zones.append(IndiaZone(
            epsg=f"EPSG:{row.code}",
            name=row.name,
            datum=datum.strip(),
            zone=zone.strip(),
            lat_origin=float(lat0),
            lon_origin=float(lon0),
            bounds=(b[0], b[1], b[2], b[3]),
        ))
    return sorted(zones, key=lambda z: (z.datum, z.zone))


INDIA_ZONES: List[IndiaZone] = _build_india_zone_registry()
INDIA_ZONES_BY_EPSG: Dict[str, IndiaZone] = {z.epsg: z for z in INDIA_ZONES}


# ===========================================================================
# Resolution
# ===========================================================================
_ALIASES: Dict[str, str] = {
    "wgs84": CRS_WGS84, "wgs 84": CRS_WGS84, "epsg:4326": CRS_WGS84,
    "4326": CRS_WGS84, "latlong": CRS_WGS84, "lat/long": CRS_WGS84,
    "geographic": CRS_WGS84, "gps": CRS_WGS84,
    "india nsf": CRS_INDIA_NSF, "nsf": CRS_INDIA_NSF,
    "india nsf lcc": CRS_INDIA_NSF, "national": CRS_INDIA_NSF,
    "indian 1975": "EPSG:4240", "indian 1954": "EPSG:4239",
    "indian 1960": "EPSG:4131",
    "kalianpur 1880": "EPSG:4243", "kalianpur 1937": "EPSG:4144",
    "kalianpur 1962": "EPSG:4145", "kalianpur 1975": "EPSG:4146",
    "everest": "EPSG:4240", "everest 1830": "EPSG:4240",
}


@lru_cache(maxsize=256)
def resolve_crs(spec: str) -> str:
    """
    Turn whatever a document says about its coordinate system into an EPSG code.

    Accepts 'WGS84', 'EPSG:32643', '32643', 'UTM 43N', 'utm43', 'India zone
    IIIa', 'Kalianpur 1975 / India zone IIIa', 'Everest 1830' and similar.
    Raises rather than silently defaulting — a wrong CRS is a wrong location,
    and it will not announce itself.
    """
    if not spec or not str(spec).strip():
        raise CRSError("No coordinate reference system given.")

    raw = str(spec).strip()
    key = raw.lower().replace("_", " ").strip()

    if key in _ALIASES:
        return _ALIASES[key]

    if key.startswith("epsg:"):
        code = key.split(":", 1)[1].strip()
        return _validated_epsg(code, raw)

    if key.isdigit():
        return _validated_epsg(key, raw)

    # UTM: 'UTM 43N', 'utm43n', 'utm zone 43'
    utm = key.replace("utm", " ").replace("zone", " ").replace("n", " ").strip()
    if key.startswith("utm") and utm.split():
        head = utm.split()[0]
        if head.isdigit():
            zone = int(head)
            if zone in UTM_ZONES_INDIA:
                return UTM_ZONES_INDIA[zone]
            if 1 <= zone <= 60:
                return f"EPSG:{32600 + zone}"
            raise CRSError(f"UTM zone {zone} is not a valid zone number.")

    # India zone by name, exact or partial
    for zone in INDIA_ZONES:
        if key == zone.name.lower():
            return zone.epsg
    matches = [z for z in INDIA_ZONES if key.endswith(f"india zone {z.zone.lower()}")
               or key == f"india zone {z.zone.lower()}"]
    if len(matches) == 1:
        return matches[0].epsg
    if len(matches) > 1:
        raise CRSError(
            f"{raw!r} matches {len(matches)} India zones on different datums "
            f"({', '.join(m.name for m in matches)}). Name the datum too — the "
            f"difference between Kalianpur 1880 and 1975 is hundreds of metres."
        )

    raise CRSError(
        f"Could not resolve coordinate system {raw!r}. Give an EPSG code, "
        f"'WGS84', a UTM zone ('UTM 43N'), or a full India zone name."
    )


def _validated_epsg(code: str, original: str) -> str:
    try:
        CRS.from_epsg(int(code))
    except Exception as exc:
        raise CRSError(f"EPSG:{code} (from {original!r}) is not a known CRS: {exc}")
    return f"EPSG:{code}"


# ===========================================================================
# Picking the right CRS for a location
# ===========================================================================
def utm_zone_for_longitude(lon: float) -> int:
    return int(math.floor((lon + 180.0) / 6.0)) + 1


def pick_metric_crs(lon: float, lat: float) -> str:
    """
    The projected CRS to do metric work in for a parcel at this location.

    UTM inside India, because at parcel scale it is essentially distortion-free
    within its own zone. Anything outside the Indian envelope falls back to the
    global UTM zone so the function never silently returns something wrong.
    """
    zone = utm_zone_for_longitude(lon)
    if zone in UTM_ZONES_INDIA and in_india(lon, lat):
        return UTM_ZONES_INDIA[zone]
    hemisphere = 32600 if lat >= 0 else 32700
    return f"EPSG:{hemisphere + zone}"


def suggest_legacy_zone(lon: float, lat: float,
                        datum: str = "Kalianpur 1975") -> Optional[IndiaZone]:
    """
    Which India zone an old cadastral sheet for this location was most likely
    drawn on. Useful when a document gives eastings and northings but does not
    say which system they are in — which is the normal case.
    """
    candidates = [z for z in INDIA_ZONES
                  if z.datum.lower() == datum.lower() and z.contains(lon, lat)]
    if not candidates:
        candidates = [z for z in INDIA_ZONES if z.contains(lon, lat)]
    if not candidates:
        return None
    # Prefer the zone whose standard parallel is nearest the parcel.
    return min(candidates, key=lambda z: abs(z.lat_origin - lat))


def in_india(lon: float, lat: float) -> bool:
    w, s, e, n = INDIA_BOUNDS
    return w <= lon <= e and s <= lat <= n


def validate_lonlat(lon: float, lat: float) -> List[str]:
    """
    Sanity checks that catch the two mistakes that actually happen: coordinates
    written in the wrong order, and a decimal point in the wrong place.
    """
    problems: List[str] = []
    if not -180 <= lon <= 180:
        problems.append(f"Longitude {lon} is outside -180..180.")
    if not -90 <= lat <= 90:
        problems.append(f"Latitude {lat} is outside -90..90.")
    if problems:
        return problems

    if not in_india(lon, lat):
        swapped = in_india(lat, lon)
        problems.append(
            f"({lat:.5f}, {lon:.5f}) is outside India"
            + (". The values look transposed — lat and long may be swapped."
               if swapped else ".")
        )
    return problems


# ===========================================================================
# Transformation
# ===========================================================================
@lru_cache(maxsize=512)
def _transformer(src: str, dst: str) -> Transformer:
    # always_xy keeps everything in (x, y) = (lon, lat) order, which removes the
    # single most common source of transposed-coordinate bugs.
    return Transformer.from_crs(src, dst, always_xy=True)


def transform_point(x: float, y: float, src: str, dst: str) -> Point:
    if src == dst:
        return (x, y)
    return _transformer(src, dst).transform(x, y)


def transform_ring(ring: Sequence[Point], src: str, dst: str) -> List[Point]:
    """Reproject a ring. Handles the datum shift, not just the projection."""
    if src == dst:
        return list(ring)
    tr = _transformer(src, dst)
    xs, ys = zip(*ring)
    out_x, out_y = tr.transform(xs, ys)
    result = list(zip(out_x, out_y))
    if any(not math.isfinite(v) for pair in result for v in pair):
        raise CRSError(
            f"Transforming from {src} to {dst} produced non-finite coordinates. "
            f"The input is probably not actually in {src}."
        )
    return result


def describe(epsg: str) -> Dict[str, object]:
    """Human-readable summary of a CRS, for showing provenance in the UI."""
    crs = CRS.from_user_input(epsg)
    zone = INDIA_ZONES_BY_EPSG.get(epsg)
    return {
        "epsg": epsg,
        "name": crs.name,
        "is_projected": crs.is_projected,
        "is_geographic": crs.is_geographic,
        "units": (crs.axis_info[0].unit_name if crs.axis_info else None),
        "datum": crs.datum.name if crs.datum else None,
        "area_of_use": crs.area_of_use.name if crs.area_of_use else None,
        "india_zone": (
            {"zone": zone.zone, "datum": zone.datum,
             "standard_parallel": zone.lat_origin, "central_meridian": zone.lon_origin}
            if zone else None
        ),
        "legacy_datum_warning": (
            "This is a pre-WGS84 Indian datum. Coordinates on it are offset from "
            "GPS positions by a few hundred metres; the shift is applied on "
            "transform, never ignored."
            if zone or (crs.datum and "kalianpur" in crs.datum.name.lower()
                        or crs.datum and "indian" in (crs.datum.name or "").lower())
            else None
        ),
    }


def local_frame_to_wgs84(
    ring: Sequence[Point],
    anchor_lon: float,
    anchor_lat: float,
    anchor_local: Point = (0.0, 0.0),
) -> Tuple[List[Point], str]:
    """
    Place a ring measured in a local metric frame onto the Earth by pinning one
    of its points to a known longitude and latitude.

    The local frame is treated as metres east and metres north, which is what a
    traverse or a chain-and-offset reconstruction produces. The parcel's own UTM
    zone is used as the intermediate frame so the metres stay metres.

    This fixes position but NOT rotation: the local frame's north is assumed to
    be true north. For a traverse with true bearings that holds. For a tippan
    ladder whose base line is at an unknown orientation it does not, and the
    caller must supply a second control point instead.
    """
    problems = validate_lonlat(anchor_lon, anchor_lat)
    if problems:
        raise CRSError("; ".join(problems))

    metric = pick_metric_crs(anchor_lon, anchor_lat)
    ax, ay = transform_point(anchor_lon, anchor_lat, CRS_WGS84, metric)
    lx, ly = anchor_local

    shifted = [(ax + (x - lx), ay + (y - ly)) for x, y in ring]
    return transform_ring(shifted, metric, CRS_WGS84), metric
