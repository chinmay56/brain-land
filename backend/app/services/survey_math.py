"""
Cadastral survey mathematics — the layer that turns measurements written in a
land document into a polygon.

Nothing here needs a map, a shapefile, or an internet connection. It works from
the numbers on the page, which is the whole point: an Indian tippan / Field
Measurement Book records a parcel completely, in links and bearings, and has done
since the 1800s. That record is sufficient to reconstruct the parcel's exact
shape and area. What it does not carry is a position on Earth — that is handled
separately in village_assembler.py.

What a document actually gives you, in descending order of quality:

  A. Coordinates          lat/long, UTM or India-zone eastings/northings
  B. Traverse             a bearing and a distance for each boundary leg
  C. Chain and offset     the "ladder" diagram: a base line with perpendicular
                          offsets to each boundary point. This is the classic
                          Indian cadastral method and by far the most common
                          thing found in an old tippan.
  D. Area + adjacency     "East: 125, West: 123, area 2 acres 15 guntha".
                          Nearly every Indian land record has this and nothing
                          more. Handled by the constraint solver, not here.

Everything is in a local planar frame in metres. Placing that frame on Earth is
georeferencing, and is a separate problem.
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass
from typing import Dict, Iterable, List, Literal, Optional, Sequence, Tuple

Point = Tuple[float, float]


# ===========================================================================
# Units
# ===========================================================================
# Linear units, exact conversions to metres.
#
# Gunter's chain is the unit of the Indian cadastral survey: 1 chain = 100
# links = 66 international feet. Old tippans are overwhelmingly in links.
LINEAR_UNITS_M: Dict[str, float] = {
    "m": 1.0,
    "metre": 1.0,
    "meter": 1.0,
    "cm": 0.01,
    "km": 1000.0,
    "ft": 0.3048,
    "foot": 0.3048,
    "feet": 0.3048,
    "yd": 0.9144,
    "yard": 0.9144,
    "gaz": 0.9144,          # north Indian revenue yard
    "link": 0.201168,       # Gunter's link = 66/100 ft
    "links": 0.201168,
    "chain": 20.1168,       # Gunter's chain = 66 ft
    "chains": 20.1168,
    "karam": 1.6764,        # 5.5 ft — Punjab / Haryana revenue unit
    "kadi": 1.6764,
}

# Area units, exact conversions to square metres.
AREA_UNITS_M2: Dict[str, float] = {
    "sqm": 1.0,
    "sq_m": 1.0,
    "m2": 1.0,
    "sqft": 0.09290304,
    "sq_ft": 0.09290304,
    "sqyd": 0.83612736,
    "sq_yd": 0.83612736,
    "are": 100.0,
    "hectare": 10_000.0,
    "ha": 10_000.0,
    "acre": 4046.8564224,
    "guntha": 101.17141056,   # 1/40 acre — Maharashtra, Karnataka
    "gunta": 101.17141056,
    "cent": 40.468564224,     # 1/100 acre — Tamil Nadu, Kerala
    "ground": 222.96768,      # 2400 sq ft — Tamil Nadu
    "kanal": 505.85705280,    # 1/8 acre — Punjab, Haryana, HP, J&K
    "marla": 25.29285264,     # 1/20 kanal
    "sarsahi": 2.81031696,    # 1/9 marla
    "ankanam": 6.68901888,    # 8 sq yd — Andhra, Telangana
}

# ---------------------------------------------------------------------------
# Bigha and katha are NOT fixed units. They vary by state, and in several states
# by district, and published sources disagree with each other — search results
# for the UP bigha alone return both 27,225 and 27,900 square feet.
#
# So this table is explicitly keyed by state, every entry carries its basis, and
# convert_area() REFUSES to convert a bigha without a state rather than guessing.
# A silently wrong bigha corrupts an area by 60% and no downstream check will
# ever catch it.
#
# Confirm each value against the state's own revenue manual before relying on
# it in production. These are the commonly cited figures, not statute.
# ---------------------------------------------------------------------------
@dataclass(frozen=True)
class RegionalUnit:
    m2: float
    basis: str
    confidence: Literal["established", "commonly_cited", "disputed"]


BIGHA_BY_STATE: Dict[str, RegionalUnit] = {
    "WEST BENGAL": RegionalUnit(1337.80, "1600 sq yd = 14,400 sq ft", "established"),
    "ASSAM":       RegionalUnit(1337.80, "14,400 sq ft", "established"),
    "TRIPURA":     RegionalUnit(1337.80, "14,400 sq ft", "established"),
    "BIHAR":       RegionalUnit(2529.29, "3025 sq yd = 27,225 sq ft", "commonly_cited"),
    "JHARKHAND":   RegionalUnit(2529.29, "3025 sq yd = 27,225 sq ft", "commonly_cited"),
    "UTTAR PRADESH": RegionalUnit(
        2529.29, "3025 sq yd (pucca). Sources also cite 27,900 sq ft "
                 "= 2592 m2; district practice varies", "disputed"),
    "UTTARAKHAND": RegionalUnit(
        2529.29, "pucca bigha, hill districts differ", "disputed"),
    "RAJASTHAN":   RegionalUnit(
        2529.29, "pucca bigha = 3025 sq yd; kachcha bigha = 1618.7 m2 "
                 "is also in active use", "disputed"),
    "MADHYA PRADESH": RegionalUnit(1200.00, "12,000 sq ft approx", "disputed"),
    "GUJARAT":     RegionalUnit(1618.74, "17,424 sq ft", "commonly_cited"),
    "HIMACHAL PRADESH": RegionalUnit(809.371, "1/5 acre", "established"),
    "PUNJAB":      RegionalUnit(2529.29, "4 kanal (varies by district)", "disputed"),
    "HARYANA":     RegionalUnit(2529.29, "4 kanal (varies by district)", "disputed"),
}

KATHA_BY_STATE: Dict[str, RegionalUnit] = {
    "WEST BENGAL": RegionalUnit(66.89, "1/20 bigha", "established"),
    "ASSAM":       RegionalUnit(267.56, "1/5 bigha", "established"),
    "BIHAR":       RegionalUnit(126.46, "1/20 bigha", "commonly_cited"),
    "JHARKHAND":   RegionalUnit(126.46, "1/20 bigha", "commonly_cited"),
}

REGIONAL_UNITS: Dict[str, Dict[str, RegionalUnit]] = {
    "bigha": BIGHA_BY_STATE,
    "katha": KATHA_BY_STATE,
    "kattha": KATHA_BY_STATE,
}


class UnitError(ValueError):
    """Raised when a unit cannot be converted safely rather than guessed at."""


def convert_length(value: float, unit: str) -> float:
    """Any linear unit found in a land document -> metres."""
    key = str(unit).strip().lower().replace(" ", "_")
    if key not in LINEAR_UNITS_M:
        raise UnitError(
            f"Unknown linear unit {unit!r}. Known: {sorted(set(LINEAR_UNITS_M))}"
        )
    return float(value) * LINEAR_UNITS_M[key]


def convert_area(value: float, unit: str, state: Optional[str] = None) -> float:
    """
    Any area unit found in a land document -> square metres.

    Regional units (bigha, katha) require an explicit state. This is deliberate:
    guessing a bigha is the single easiest way to silently destroy an area
    figure, and nothing downstream would catch it.
    """
    key = str(unit).strip().lower().replace(" ", "_")

    if key in AREA_UNITS_M2:
        return float(value) * AREA_UNITS_M2[key]

    if key in REGIONAL_UNITS:
        table = REGIONAL_UNITS[key]
        if not state:
            raise UnitError(
                f"'{unit}' is a regional unit whose value differs by state. "
                f"Supply the state (one of {sorted(table)}) — this converter "
                f"will not guess."
            )
        skey = state.strip().upper()
        if skey not in table:
            raise UnitError(
                f"No '{unit}' value on file for state {state!r}. "
                f"Available: {sorted(table)}. Add it from that state's revenue "
                f"manual rather than substituting another state's value."
            )
        return float(value) * table[skey].m2

    raise UnitError(f"Unknown area unit {unit!r}.")


def area_unit_note(unit: str, state: Optional[str]) -> Optional[str]:
    """A warning to surface in the UI when a conversion is not beyond dispute."""
    key = str(unit).strip().lower()
    if key not in REGIONAL_UNITS or not state:
        return None
    entry = REGIONAL_UNITS[key].get(state.strip().upper())
    if entry is None:
        return None
    if entry.confidence == "established":
        return None
    return (
        f"1 {key} taken as {entry.m2} m2 for {state} ({entry.basis}); "
        f"this value is {entry.confidence.replace('_', ' ')} and should be "
        f"confirmed against the state revenue manual."
    )


# ===========================================================================
# Bearings
# ===========================================================================
_NUMBER_RE = re.compile(r"\d+(?:\.\d+)?")
_CARDINAL = {"N": 0.0, "NORTH": 0.0, "E": 90.0, "EAST": 90.0,
             "S": 180.0, "SOUTH": 180.0, "W": 270.0, "WEST": 270.0}


def _dms_to_deg(parts: Sequence[str]) -> float:
    """
    Degrees-minutes-seconds from however many numbers were written.

    Real documents separate them with anything at all — °, ', ", d, m, s,
    hyphens, colons, or plain spaces — and often omit the trailing components.
    Rather than try to match every punctuation combination, pull the numbers out
    in order: the first is degrees, the second minutes, the third seconds.
    """
    if not parts:
        raise ValueError("No numeric component in bearing.")
    if len(parts) > 3:
        raise ValueError(f"Too many numeric components ({len(parts)}) for a bearing.")
    deg = float(parts[0])
    minutes = float(parts[1]) if len(parts) > 1 else 0.0
    seconds = float(parts[2]) if len(parts) > 2 else 0.0
    if not 0 <= minutes < 60 or not 0 <= seconds < 60:
        raise ValueError(f"Minutes/seconds out of range in {parts}.")
    return deg + minutes / 60.0 + seconds / 3600.0


def parse_bearing(raw: object) -> float:
    """
    Parse any bearing notation used in Indian survey records into a Whole
    Circle Bearing in decimal degrees, measured clockwise from north.

    Accepts:
      Whole circle    125,  125.5,  "125-30-00",  "125°30'45\""
      Quadrantal      "N45°30'E",  "S 12 30 W",  "n45.5e"

    Quadrantal (also called reduced bearing) is what most tippans and older
    field books use, so it must round-trip exactly.
    """
    if isinstance(raw, (int, float)):
        return float(raw) % 360.0

    text = str(raw).strip().upper()
    if not text:
        raise ValueError("Empty bearing.")

    # Plain cardinal directions, which is how the four boundaries are written.
    if text in _CARDINAL:
        return _CARDINAL[text]

    numbers = _NUMBER_RE.findall(text)

    # Quadrantal / reduced bearing: starts N or S, ends E or W.
    if len(text) >= 3 and text[0] in "NS" and text[-1] in "EW":
        angle = _dms_to_deg(numbers)
        if not 0.0 <= angle <= 90.0:
            raise ValueError(
                f"Quadrantal bearing angle {angle}° in {raw!r} must be 0–90°."
            )
        ns, ew = text[0], text[-1]
        if ns == "N":
            return angle if ew == "E" else (360.0 - angle) % 360.0
        return (180.0 - angle) if ew == "E" else (180.0 + angle)

    # Otherwise a whole circle bearing.
    if numbers and not re.search(r"[A-DF-MO-RT-VX-Z]", text):
        return _dms_to_deg(numbers) % 360.0

    raise ValueError(
        f"Could not parse bearing {raw!r}. Use a whole circle bearing "
        f"(125.5, \"125-30-00\", \"125°30'45\\\"\") or a quadrantal bearing "
        f"(\"N45°30'E\", \"S 12 30 W\")."
    )


def apply_declination(wcb: float, declination_deg: float) -> float:
    """
    Magnetic bearing -> true bearing.

    Old field books record magnetic bearings. India's declination runs roughly
    from about 1°W in the east to about 3°E in the west, and it drifts over
    decades, so the value for the survey's date and place must come from the
    document or an officer. East declination is positive.
    """
    return (wcb + declination_deg) % 360.0


def to_quadrantal(wcb: float) -> str:
    """Whole circle bearing -> the quadrantal string a surveyor expects to read."""
    wcb %= 360.0
    # Exact cardinals read as words, not as a 90° quadrantal angle.
    for name, value in (("N", 0.0), ("E", 90.0), ("S", 180.0), ("W", 270.0)):
        if abs(wcb - value) < 1e-9:
            return name

    if wcb < 90:
        ns, ew, a = "N", "E", wcb
    elif wcb < 180:
        ns, ew, a = "S", "E", 180 - wcb
    elif wcb < 270:
        ns, ew, a = "S", "W", wcb - 180
    else:
        ns, ew, a = "N", "W", 360 - wcb

    # Round to tenths of a second FIRST, then split — otherwise 0.0999...°
    # formats as 0°05'60.0" instead of 0°06'00.0".
    total_tenths = round(a * 36000)
    deg, rem = divmod(total_tenths, 36000)
    mm, rem = divmod(rem, 600)
    ss = rem / 10.0
    return f"{ns}{deg}°{mm:02d}'{ss:04.1f}\"{ew}"


# ===========================================================================
# Traverse (source B)
# ===========================================================================
@dataclass
class TraverseLeg:
    bearing_wcb: float          # degrees, clockwise from north
    length_m: float
    from_station: str = ""
    to_station: str = ""


@dataclass
class ClosureReport:
    """
    How well the boundary walk closed back on itself.

    Misclosure is the surveyor's own quality metric and it is the single best
    signal that a measurement was transcribed wrongly — a digit dropped from one
    leg shows up immediately as a large misclosure. This is a check the text
    pipeline cannot perform at all.
    """
    perimeter_m: float
    misclosure_m: float
    misclosure_e_m: float
    misclosure_n_m: float
    relative_precision: Optional[float]   # the N in 1:N
    grade: str                            # survey-grade / cadastral / poor / failed
    adjusted: bool
    method: str

    @property
    def precision_text(self) -> str:
        if self.relative_precision is None:
            return "1:∞ (exact closure)"
        return f"1:{self.relative_precision:,.0f}"


def _grade_closure(rel: Optional[float]) -> str:
    if rel is None or rel >= 5000:
        return "survey-grade"
    if rel >= 1000:
        return "cadastral"
    if rel >= 200:
        return "poor"
    return "failed"


def compute_traverse(
    legs: Sequence[TraverseLeg],
    start: Point = (0.0, 0.0),
    adjust: Literal["bowditch", "transit", "none"] = "bowditch",
) -> Tuple[List[Point], ClosureReport]:
    """
    Walk a closed traverse and return the boundary ring in a local metric frame,
    with the misclosure distributed by the standard rule.

    Bowditch (the compass rule) spreads the closing error over the legs in
    proportion to their length — the correct choice when angles and distances
    are of similar reliability, which is the normal case for a chain-and-compass
    cadastral survey. The transit rule spreads it in proportion to each leg's
    latitude/departure instead, and suits a theodolite traverse where the angles
    are much better than the distances.
    """
    if len(legs) < 3:
        raise ValueError("A traverse needs at least 3 legs to enclose an area.")

    deltas: List[Point] = []
    for leg in legs:
        rad = math.radians(leg.bearing_wcb)
        deltas.append((leg.length_m * math.sin(rad),   # easting
                       leg.length_m * math.cos(rad)))  # northing

    sum_e = sum(d[0] for d in deltas)
    sum_n = sum(d[1] for d in deltas)
    perimeter = sum(leg.length_m for leg in legs)
    misclosure = math.hypot(sum_e, sum_n)
    rel = (perimeter / misclosure) if misclosure > 1e-9 else None

    method = "none"
    if adjust != "none" and misclosure > 1e-9:
        if adjust == "bowditch":
            method = "Bowditch (compass) rule"
            deltas = [
                (de - sum_e * (leg.length_m / perimeter),
                 dn - sum_n * (leg.length_m / perimeter))
                for (de, dn), leg in zip(deltas, legs)
            ]
        else:
            method = "Transit rule"
            abs_e = sum(abs(d[0]) for d in deltas) or 1.0
            abs_n = sum(abs(d[1]) for d in deltas) or 1.0
            deltas = [
                (de - sum_e * (abs(de) / abs_e), dn - sum_n * (abs(dn) / abs_n))
                for de, dn in deltas
            ]

    ring: List[Point] = [start]
    for de, dn in deltas:
        x, y = ring[-1]
        ring.append((x + de, y + dn))

    # After adjustment the last point equals the first; drop the duplicate and
    # let the caller close the ring explicitly.
    ring = ring[:-1]

    report = ClosureReport(
        perimeter_m=round(perimeter, 4),
        misclosure_m=round(misclosure, 4),
        misclosure_e_m=round(sum_e, 4),
        misclosure_n_m=round(sum_n, 4),
        relative_precision=round(rel, 1) if rel else None,
        grade=_grade_closure(rel),
        adjusted=method != "none",
        method=method,
    )
    return ring, report


# ===========================================================================
# Chain and offset — the tippan "ladder" (source C)
# ===========================================================================
@dataclass
class Offset:
    """One rung of the ladder: a perpendicular from the base line to a boundary point."""
    chainage_m: float                 # distance along the base line from its start
    offset_m: float                   # perpendicular distance, always positive
    side: Literal["L", "R"]           # which side of the base line
    label: str = ""
    seq: Optional[int] = None         # explicit ordering, if the document gives one


def chain_offset_to_ring(
    base_length_m: float,
    offsets: Sequence[Offset],
    include_base_endpoints: bool = True,
) -> List[Point]:
    """
    Rebuild a parcel boundary from a base line and its perpendicular offsets.

    This is the "ladder to map" method: the surveyor runs one line across the
    field, records how far along it each boundary point sits, and how far to the
    side. The base line becomes the local x axis, offsets the local y.

    Points are ordered up the left side and back down the right so the ring
    traces the boundary once without self-intersecting. If the document numbers
    its points, pass `seq` on each offset and that order is used instead.
    """
    if not offsets:
        raise ValueError("Chain-and-offset reconstruction needs at least one offset.")
    if base_length_m <= 0:
        raise ValueError("Base line length must be positive.")

    if all(o.seq is not None for o in offsets):
        ordered = sorted(offsets, key=lambda o: o.seq)  # type: ignore[arg-type]
        return [(o.chainage_m, o.offset_m if o.side.upper() == "L" else -o.offset_m)
                for o in ordered]

    left = sorted((o for o in offsets if o.side.upper() == "L"),
                  key=lambda o: o.chainage_m)
    right = sorted((o for o in offsets if o.side.upper() == "R"),
                   key=lambda o: o.chainage_m, reverse=True)

    ring: List[Point] = []
    if include_base_endpoints and (not left or not right):
        # Offsets on one side only: the base line itself is a boundary.
        ring.append((0.0, 0.0))

    ring += [(o.chainage_m, o.offset_m) for o in left]

    if include_base_endpoints and (not left or not right):
        ring.append((base_length_m, 0.0))

    ring += [(o.chainage_m, -o.offset_m) for o in right]

    if len(ring) < 3:
        raise ValueError(
            f"Only {len(ring)} boundary points could be built; a polygon needs 3."
        )
    return ring


# ===========================================================================
# Ring geometry
# ===========================================================================
def shoelace_area(ring: Sequence[Point]) -> float:
    """Signed area of a planar ring. Positive means counter-clockwise."""
    n = len(ring)
    if n < 3:
        return 0.0
    total = 0.0
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        total += x1 * y2 - x2 * y1
    return total / 2.0


def ring_area_m2(ring: Sequence[Point]) -> float:
    return abs(shoelace_area(ring))


def ring_perimeter_m(ring: Sequence[Point]) -> float:
    n = len(ring)
    return sum(math.dist(ring[i], ring[(i + 1) % n]) for i in range(n))


def ensure_ccw(ring: Sequence[Point]) -> List[Point]:
    """GeoJSON exterior rings should wind counter-clockwise (RFC 7946)."""
    return list(ring) if shoelace_area(ring) >= 0 else list(reversed(ring))


def centroid(ring: Sequence[Point]) -> Point:
    a = shoelace_area(ring)
    if abs(a) < 1e-12:
        n = len(ring) or 1
        return (sum(p[0] for p in ring) / n, sum(p[1] for p in ring) / n)
    cx = cy = 0.0
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        cross = x1 * y2 - x2 * y1
        cx += (x1 + x2) * cross
        cy += (y1 + y2) * cross
    return (cx / (6 * a), cy / (6 * a))


@dataclass
class AreaCheck:
    """
    Reconciles the area the measurements produce against the area the document
    declares. These are two independent statements about the same parcel and
    they should agree; when they don't, something on the page is wrong.
    """
    declared_m2: Optional[float]
    computed_m2: float
    delta_m2: Optional[float]
    delta_pct: Optional[float]
    within_tolerance: Optional[bool]
    tolerance_pct: float
    note: Optional[str] = None


def check_area(
    ring: Sequence[Point],
    declared_m2: Optional[float],
    tolerance_pct: float = 2.0,
    note: Optional[str] = None,
) -> AreaCheck:
    computed = ring_area_m2(ring)
    if declared_m2 is None or declared_m2 <= 0:
        return AreaCheck(None, round(computed, 4), None, None, None, tolerance_pct, note)
    delta = computed - declared_m2
    pct = abs(delta) / declared_m2 * 100.0
    return AreaCheck(
        declared_m2=round(declared_m2, 4),
        computed_m2=round(computed, 4),
        delta_m2=round(delta, 4),
        delta_pct=round(pct, 3),
        within_tolerance=pct <= tolerance_pct,
        tolerance_pct=tolerance_pct,
        note=note,
    )


def scale_ring_to_area(ring: Sequence[Point], target_m2: float) -> List[Point]:
    """
    Uniformly scale a ring about its centroid so its area matches the declared
    figure exactly.

    Use sparingly and only when the shape is trusted more than the scale — for
    example a tippan drawn to a stated scale where the ratio is uncertain. It
    preserves shape and adjacency but silently overrides the measurements, so
    any parcel this touches must be marked as adjusted.
    """
    current = ring_area_m2(ring)
    if current <= 0 or target_m2 <= 0:
        return list(ring)
    factor = math.sqrt(target_m2 / current)
    cx, cy = centroid(ring)
    return [(cx + (x - cx) * factor, cy + (y - cy) * factor) for x, y in ring]


# ===========================================================================
# Rigid placement — used when a shape must be fitted onto known ground
# ===========================================================================
def transform_ring(
    ring: Sequence[Point],
    dx: float = 0.0,
    dy: float = 0.0,
    rotation_deg: float = 0.0,
    scale: float = 1.0,
    about: Optional[Point] = None,
) -> List[Point]:
    """Rotate about a pivot, scale, then translate. Shape is preserved."""
    ox, oy = about if about is not None else centroid(ring)
    r = math.radians(rotation_deg)
    cos_r, sin_r = math.cos(r), math.sin(r)
    out: List[Point] = []
    for x, y in ring:
        px, py = (x - ox) * scale, (y - oy) * scale
        out.append((ox + px * cos_r - py * sin_r + dx,
                    oy + px * sin_r + py * cos_r + dy))
    return out


def fit_by_two_points(
    ring: Sequence[Point],
    local_a: Point, local_b: Point,
    world_a: Point, world_b: Point,
) -> Tuple[List[Point], float, float]:
    """
    Place a locally-measured ring onto real ground given two points whose
    position is known in both frames — a Helmert (similarity) transform.

    Two control points is the minimum that fixes position, rotation and scale,
    and it is what an officer can realistically supply: pick two boundary
    corners on a satellite image and click them.

    Returns the placed ring, the rotation applied, and the scale factor. A scale
    far from 1.0 means the document's units or its stated scale are wrong.
    """
    lax, lay = local_a
    lbx, lby = local_b
    wax, way = world_a
    wbx, wby = world_b

    local_len = math.hypot(lbx - lax, lby - lay)
    world_len = math.hypot(wbx - wax, wby - way)
    if local_len < 1e-9:
        raise ValueError("The two local control points are coincident.")

    scale = world_len / local_len
    rot = math.degrees(
        math.atan2(wby - way, wbx - wax) - math.atan2(lby - lay, lbx - lax)
    )

    placed = transform_ring(ring, rotation_deg=rot, scale=scale, about=local_a)
    # transform_ring rotates about local_a and leaves it fixed; move it onto world_a.
    dx, dy = wax - local_a[0], way - local_a[1]
    placed = [(x + dx, y + dy) for x, y in placed]
    return placed, round(rot, 6), round(scale, 9)
