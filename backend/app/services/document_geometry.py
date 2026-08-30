"""
Turning a land document into a parcel polygon.

This module answers one question: given what is actually written on an Indian
land record, what geometry can be recovered, and how good is it?

The honest starting point is that a 7/12 extract, a jamabandi entry or a khatauni
row contains NO coordinates. You cannot plot one on its own. What Indian land
records do contain, in descending order of quality, is:

  A. COORDINATES        Present in post-resurvey records, SVAMITVA property
                        cards, DGPS/ETS field books and modern deed schedules.
                        Gives an exact position. Rare in legacy material.

  B. TRAVERSE           A bearing and a distance for every boundary leg, from
                        the Field Measurement Book. Gives an exact shape and an
                        exact area, and a closure check for free. No position.

  C. CHAIN AND OFFSET   The tippan "ladder": one base line across the field with
                        perpendicular offsets to each boundary point. This is
                        the classic Indian cadastral method and the most common
                        thing in an old record. Exact shape, no position, and
                        the base line's orientation is usually unstated.

  D. AREA + ADJACENCY   "East: survey 125, West: 123, North: road, South: nala,
                        area 2 acres 15 guntha." Almost every Indian land
                        document has this and many have nothing else. On its own
                        it fixes neither shape nor position — but across a whole
                        village it is a constraint network, and that is what
                        village_assembler.py solves.

The output always carries how the geometry was obtained and how much it can be
trusted. A parcel derived from adjacency is not the same thing as a parcel
measured with a total station, and the system must never let those look alike.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional, Sequence, Tuple

from . import crs_india as crs
from . import survey_math as sm
from .survey_math import Offset, Point, TraverseLeg

# ===========================================================================
# What a document must carry to be plottable — served by the API so the
# extraction stage knows exactly what to target.
# ===========================================================================
DOCUMENT_REQUIREMENTS: Dict[str, Any] = {
    "always_required": {
        "purpose": "Identity, and the area figure every geometry is checked against.",
        "fields": [
            {"field": "survey_no", "note": "Survey / khasra / khewat number, with the "
                                           "sub-division (hissa) if any. The join key."},
            {"field": "village", "note": "Village name; the LGD village code if the "
                                         "document or the office can supply it."},
            {"field": "tehsil / taluka"}, {"field": "district"}, {"field": "state"},
            {"field": "area_value + area_unit",
             "note": "The independent check on every reconstruction. Regional units "
                     "(bigha, katha) also need the state — their value differs and "
                     "this system refuses to guess."},
        ],
    },
    "geometry_sources": [
        {
            "tier": "A", "id": "coordinates", "accuracy": "surveyed",
            "found_in": ["Resurvey / DGPS records", "SVAMITVA property cards",
                         "Modern FMB sketches", "Deed schedules with coordinates"],
            "fields": [
                {"field": "points[]", "note": "Boundary vertices in order."},
                {"field": "crs", "note": "WGS84 lat/long, a UTM zone, or an India "
                                         "zone. Must be stated — reading Kalianpur "
                                         "eastings as WGS84 misplaces a parcel by "
                                         "hundreds of kilometres."},
            ],
            "produces": "Exact position, shape and area.",
        },
        {
            "tier": "B", "id": "traverse", "accuracy": "reconstructed",
            "found_in": ["Field Measurement Book (FMB)", "Tippan", "Survey field books",
                         "Deed schedules given as bearings and distances"],
            "fields": [
                {"field": "legs[].bearing", "note": "Whole circle (125-30-00) or "
                                                    "quadrantal (N45-30-00-E)."},
                {"field": "legs[].distance + unit", "note": "Links and chains are the "
                                                            "usual units in old books."},
                {"field": "magnetic_declination",
                 "note": "Only if the bearings are magnetic rather than true."},
            ],
            "produces": "Exact shape and area, plus a closure check that catches "
                        "transcription errors. Position requires an anchor.",
        },
        {
            "tier": "C", "id": "chain_offset", "accuracy": "reconstructed",
            "found_in": ["Tippan (Maharashtra, Karnataka)", "FMB (Tamil Nadu, Telangana)",
                         "Village measurement books"],
            "fields": [
                {"field": "base_line_length + unit"},
                {"field": "offsets[].chainage", "note": "Distance along the base line."},
                {"field": "offsets[].offset", "note": "Perpendicular distance."},
                {"field": "offsets[].side", "note": "L or R of the base line."},
                {"field": "offsets[].seq", "note": "Point order, if the sketch numbers "
                                                   "its corners."},
            ],
            "produces": "Exact shape and area. Neither position nor orientation.",
        },
        {
            "tier": "D", "id": "boundaries", "accuracy": "inferred",
            "found_in": ["Effectively every Indian land record — the chatushima / "
                         "four boundaries / hadd column"],
            "fields": [
                {"field": "boundaries.north / south / east / west",
                 "note": "The adjoining survey number, or a road, nala, canal or "
                         "village name."},
            ],
            "produces": "No geometry alone. Across a village it is a constraint "
                        "network that positions parcels relative to each other, and "
                        "one anchored parcel then places the whole mosaic.",
        },
    ],
    "optional_but_valuable": [
        {"field": "control_points[]",
         "note": "Any boundary corner whose real position is known — a trijunction "
                 "pillar, a GTS benchmark, or two corners an officer clicks on "
                 "satellite imagery. Two of them fix position, rotation and scale."},
        {"field": "village_map_sheet_no", "note": "Which cadastral sheet this came from."},
        {"field": "parent_survey_no", "note": "Enables the subdivision-sum check."},
        {"field": "survey_date", "note": "Needed to apply the right magnetic "
                                         "declination to old magnetic bearings."},
    ],
}

AccuracyClass = Literal[
    "surveyed",                  # coordinates straight from the document
    "reconstructed_anchored",    # measurements + control points -> real position
    "reconstructed_floating",    # measurements only -> exact shape, no position
    "inferred",                  # from the adjacency network
    "none",                      # nothing plottable
]

ACCURACY_NOTES: Dict[str, str] = {
    "surveyed": "Position taken directly from coordinates in the document.",
    "reconstructed_anchored": "Shape rebuilt from the recorded measurements and "
                              "placed using control points. Position is as good as "
                              "those control points.",
    "reconstructed_floating": "Shape and area rebuilt exactly from the recorded "
                              "measurements. Not yet placed on the ground — it needs "
                              "an anchor, or a mapped neighbour to attach to.",
    "inferred": "Position estimated from adjoining parcels and the declared area. "
                "Indicative only; requires field verification before any use.",
    "none": "The document carries nothing from which geometry can be derived.",
}


# ===========================================================================
# Input model
# ===========================================================================
@dataclass
class CoordinateSource:
    points: List[Point]                 # (x, y) or (lon, lat) in `crs`
    crs: str = "WGS84"
    order: Literal["xy", "yx"] = "xy"   # 'yx' when written as lat,long


@dataclass
class TraverseSource:
    legs: List[Dict[str, Any]]          # {bearing, distance, unit, from, to}
    distance_unit: str = "m"
    magnetic_declination_deg: Optional[float] = None
    adjustment: Literal["bowditch", "transit", "none"] = "bowditch"


@dataclass
class ChainOffsetSource:
    base_length: float
    offsets: List[Dict[str, Any]]       # {chainage, offset, side, label, seq}
    unit: str = "links"
    base_bearing: Optional[float] = None  # true bearing of the base line, if stated


@dataclass
class ControlPoint:
    local: Optional[Point] = None       # position in the document's own frame
    lon: Optional[float] = None
    lat: Optional[float] = None
    label: str = ""


@dataclass
class LandDocument:
    survey_no: str
    village: str
    state: str
    district: str = ""
    tehsil: str = ""
    lgd_village_code: str = ""
    document_id: str = ""
    document_type: str = ""
    parent_survey_no: Optional[str] = None
    khasra_no: Optional[str] = None
    khata_no: Optional[str] = None
    owner_name: Optional[str] = None

    area_value: Optional[float] = None
    area_unit: Optional[str] = None

    coordinates: Optional[CoordinateSource] = None
    traverse: Optional[TraverseSource] = None
    chain_offset: Optional[ChainOffsetSource] = None
    boundaries: Dict[str, str] = field(default_factory=dict)   # north/south/east/west

    control_points: List[ControlPoint] = field(default_factory=list)
    village_map_sheet_no: Optional[str] = None


# ===========================================================================
# Output model
# ===========================================================================
@dataclass
class GeometryFlag:
    code: str
    severity: Literal["INFO", "WARNING", "CONFLICT", "CRITICAL"]
    message: str
    action: str = ""


@dataclass
class GeometryResult:
    survey_no: str
    method: str                          # coordinates / traverse / chain_offset / none
    accuracy_class: AccuracyClass
    accuracy_note: str

    ring_wgs84: Optional[List[Point]] = None     # placed on Earth, (lon, lat)
    ring_local: Optional[List[Point]] = None     # local metric frame, unplaced
    crs_used: Optional[str] = None

    declared_area_m2: Optional[float] = None
    computed_area_m2: Optional[float] = None
    area_check: Optional[Dict[str, Any]] = None
    closure: Optional[Dict[str, Any]] = None

    boundaries: Dict[str, str] = field(default_factory=dict)
    flags: List[GeometryFlag] = field(default_factory=list)
    provenance: Dict[str, Any] = field(default_factory=dict)

    @property
    def is_placed(self) -> bool:
        return self.ring_wgs84 is not None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "survey_no": self.survey_no,
            "method": self.method,
            "accuracy_class": self.accuracy_class,
            "accuracy_note": self.accuracy_note,
            "is_placed": self.is_placed,
            "crs_used": self.crs_used,
            "declared_area_m2": self.declared_area_m2,
            "computed_area_m2": self.computed_area_m2,
            "area_check": self.area_check,
            "closure": self.closure,
            "boundaries": self.boundaries,
            "geometry": (
                {"type": "Polygon",
                 "coordinates": [[list(p) for p in _closed(self.ring_wgs84)]]}
                if self.ring_wgs84 else None
            ),
            "local_ring": [list(p) for p in self.ring_local] if self.ring_local else None,
            "flags": [vars(f) for f in self.flags],
            "provenance": self.provenance,
        }


def _closed(ring: Sequence[Point]) -> List[Point]:
    r = list(ring)
    if r and r[0] != r[-1]:
        r.append(r[0])
    return r


# ===========================================================================
# Declared area
# ===========================================================================
def resolve_declared_area(doc: LandDocument) -> Tuple[Optional[float], List[GeometryFlag]]:
    flags: List[GeometryFlag] = []
    if doc.area_value is None or not doc.area_unit:
        flags.append(GeometryFlag(
            "AREA_MISSING", "WARNING",
            "The document states no area, so the reconstructed geometry cannot be "
            "cross-checked against it.",
            "Capture the area field during extraction — it is the only independent "
            "check on the measurements.",
        ))
        return None, flags

    try:
        m2 = sm.convert_area(doc.area_value, doc.area_unit, doc.state)
    except sm.UnitError as exc:
        flags.append(GeometryFlag(
            "AREA_UNIT_UNRESOLVED", "CONFLICT", str(exc),
            "Add this unit's value for the state from its revenue manual. The "
            "converter will not substitute another state's figure.",
        ))
        return None, flags

    note = sm.area_unit_note(doc.area_unit, doc.state)
    if note:
        flags.append(GeometryFlag(
            "AREA_UNIT_REGIONAL", "WARNING", note,
            "Confirm the conversion factor before certifying this record.",
        ))
    return m2, flags


# ===========================================================================
# Source builders
# ===========================================================================
def _from_coordinates(doc: LandDocument, src: CoordinateSource
                      ) -> Tuple[GeometryResult, List[GeometryFlag]]:
    flags: List[GeometryFlag] = []
    if len(src.points) < 3:
        raise ValueError(f"Only {len(src.points)} coordinates supplied; a polygon needs 3.")

    epsg = crs.resolve_crs(src.crs)
    pts = [(float(b), float(a)) for a, b in src.points] if src.order == "yx" \
        else [(float(a), float(b)) for a, b in src.points]

    ring_geo = pts if epsg == crs.CRS_WGS84 else crs.transform_ring(pts, epsg, crs.CRS_WGS84)

    for lon, lat in ring_geo[:1]:
        for problem in crs.validate_lonlat(lon, lat):
            flags.append(GeometryFlag(
                "COORD_OUT_OF_BOUNDS", "CRITICAL", problem,
                "Check the stated CRS and the coordinate order before plotting.",
            ))

    lon0, lat0 = ring_geo[0]
    metric = crs.pick_metric_crs(lon0, lat0)
    ring_local = crs.transform_ring(ring_geo, crs.CRS_WGS84, metric)

    if crs.INDIA_ZONES_BY_EPSG.get(epsg):
        flags.append(GeometryFlag(
            "LEGACY_DATUM", "INFO",
            f"Source coordinates are on {crs.describe(epsg)['datum']} "
            f"({crs.INDIA_ZONES_BY_EPSG[epsg].name}). The datum shift to WGS84 has "
            f"been applied.",
            "",
        ))

    result = GeometryResult(
        survey_no=doc.survey_no,
        method="coordinates",
        accuracy_class="surveyed",
        accuracy_note=ACCURACY_NOTES["surveyed"],
        ring_wgs84=sm.ensure_ccw(ring_geo),
        ring_local=ring_local,
        crs_used=metric,
        provenance={"source_crs": epsg, "source_crs_name": crs.describe(epsg)["name"],
                    "vertex_count": len(ring_geo), "coordinate_order": src.order},
    )
    return result, flags


def _from_traverse(doc: LandDocument, src: TraverseSource
                   ) -> Tuple[GeometryResult, List[GeometryFlag]]:
    flags: List[GeometryFlag] = []
    legs: List[TraverseLeg] = []

    for i, raw in enumerate(src.legs):
        wcb = sm.parse_bearing(raw.get("bearing"))
        if src.magnetic_declination_deg is not None:
            wcb = sm.apply_declination(wcb, src.magnetic_declination_deg)
        unit = raw.get("unit") or src.distance_unit
        legs.append(TraverseLeg(
            bearing_wcb=wcb,
            length_m=sm.convert_length(float(raw["distance"]), unit),
            from_station=str(raw.get("from", raw.get("from_station", f"P{i}"))),
            to_station=str(raw.get("to", raw.get("to_station", f"P{i + 1}"))),
        ))

    ring_local, closure = sm.compute_traverse(legs, adjust=src.adjustment)

    if closure.grade in ("poor", "failed"):
        flags.append(GeometryFlag(
            "TRAVERSE_MISCLOSURE",
            "CONFLICT" if closure.grade == "poor" else "CRITICAL",
            f"The boundary walk fails to close by {closure.misclosure_m:.3f} m over a "
            f"{closure.perimeter_m:.2f} m perimeter — a relative precision of "
            f"{closure.precision_text}, graded {closure.grade}.",
            "A misclosure this large usually means a digit was dropped from one leg's "
            "bearing or distance. Re-read the field book before trusting the shape.",
        ))
    if src.magnetic_declination_deg is None and src.legs:
        flags.append(GeometryFlag(
            "DECLINATION_UNSTATED", "INFO",
            "Bearings were taken as true. If the field book recorded magnetic "
            "bearings, the whole parcel is rotated by the declination of that "
            "place and date.",
            "Supply magnetic_declination_deg if the source is a compass survey.",
        ))

    result = GeometryResult(
        survey_no=doc.survey_no,
        method="traverse",
        accuracy_class="reconstructed_floating",
        accuracy_note=ACCURACY_NOTES["reconstructed_floating"],
        ring_local=sm.ensure_ccw(ring_local),
        closure=vars(closure) | {"precision_text": closure.precision_text},
        provenance={"legs": len(legs), "adjustment": closure.method or "none",
                    "declination_applied": src.magnetic_declination_deg},
    )
    return result, flags


def _from_chain_offset(doc: LandDocument, src: ChainOffsetSource
                       ) -> Tuple[GeometryResult, List[GeometryFlag]]:
    flags: List[GeometryFlag] = []
    # `o.get("unit", src.unit)` would be wrong here: a serialised offset carries
    # the key with an explicit null, so .get returns None rather than the
    # default and the unit conversion blows up. Fall back on falsiness instead.
    offsets = [
        Offset(
            chainage_m=sm.convert_length(float(o["chainage"]), o.get("unit") or src.unit),
            offset_m=sm.convert_length(float(o["offset"]), o.get("unit") or src.unit),
            side=str(o.get("side") or "L").upper()[:1],  # type: ignore[arg-type]
            label=str(o.get("label") or ""),
            seq=o.get("seq"),
        )
        for o in src.offsets
    ]
    base_m = sm.convert_length(float(src.base_length), src.unit)
    ring_local = sm.chain_offset_to_ring(base_m, offsets)

    if src.base_bearing is None:
        flags.append(GeometryFlag(
            "BASE_BEARING_UNSTATED", "WARNING",
            "The tippan gives no bearing for its base line, so the parcel's shape is "
            "exact but its orientation is unknown.",
            "Two control points will fix rotation, or the parcel can be rotated to fit "
            "a mapped neighbour.",
        ))
    else:
        # Rotate so the base line points along its true bearing. In the local
        # frame the base line runs along +x; a bearing is measured from north.
        ring_local = sm.transform_ring(
            ring_local, rotation_deg=(90.0 - src.base_bearing), about=(0.0, 0.0)
        )

    result = GeometryResult(
        survey_no=doc.survey_no,
        method="chain_offset",
        accuracy_class="reconstructed_floating",
        accuracy_note=ACCURACY_NOTES["reconstructed_floating"],
        ring_local=sm.ensure_ccw(ring_local),
        provenance={"base_length_m": round(base_m, 4), "offsets": len(offsets),
                    "unit": src.unit, "base_bearing": src.base_bearing,
                    "explicit_sequence": all(o.seq is not None for o in offsets)},
    )
    return result, flags


# ===========================================================================
# Placement
# ===========================================================================
def _place(result: GeometryResult, doc: LandDocument) -> List[GeometryFlag]:
    """Move a floating local ring onto the Earth using the document's control points."""
    flags: List[GeometryFlag] = []
    usable = [c for c in doc.control_points
              if c.lon is not None and c.lat is not None and c.local is not None]

    if not usable or result.ring_local is None:
        return flags

    if len(usable) >= 2:
        a, b = usable[0], usable[1]
        metric = crs.pick_metric_crs(a.lon, a.lat)          # type: ignore[arg-type]
        world_a = crs.transform_point(a.lon, a.lat, crs.CRS_WGS84, metric)  # type: ignore[arg-type]
        world_b = crs.transform_point(b.lon, b.lat, crs.CRS_WGS84, metric)  # type: ignore[arg-type]

        placed, rot, scale = sm.fit_by_two_points(
            result.ring_local, a.local, b.local, world_a, world_b   # type: ignore[arg-type]
        )
        result.ring_wgs84 = sm.ensure_ccw(crs.transform_ring(placed, metric, crs.CRS_WGS84))
        result.crs_used = metric
        result.accuracy_class = "reconstructed_anchored"
        result.accuracy_note = ACCURACY_NOTES["reconstructed_anchored"]
        result.provenance |= {"placement": "two control points (Helmert)",
                              "rotation_deg": rot, "scale_factor": scale,
                              "control_points": [a.label or "A", b.label or "B"]}

        if abs(scale - 1.0) > 0.02:
            flags.append(GeometryFlag(
                "SCALE_MISMATCH", "CONFLICT",
                f"Fitting to the control points required a scale factor of {scale:.4f}. "
                f"The measurements and the control points disagree about size by "
                f"{abs(scale - 1) * 100:.1f}%.",
                "Check the distance unit on the field book — links read as metres is "
                "the usual cause.",
            ))
        return flags

    # A single control point fixes position but not rotation.
    c = usable[0]
    placed, metric = crs.local_frame_to_wgs84(
        result.ring_local, c.lon, c.lat, c.local      # type: ignore[arg-type]
    )
    result.ring_wgs84 = sm.ensure_ccw(placed)
    result.crs_used = metric
    result.accuracy_class = "reconstructed_anchored"
    result.accuracy_note = ACCURACY_NOTES["reconstructed_anchored"]
    result.provenance |= {"placement": "one control point, orientation assumed true north",
                          "control_points": [c.label or "A"]}
    flags.append(GeometryFlag(
        "SINGLE_CONTROL_POINT", "WARNING",
        "Only one control point was available. Position is fixed but the parcel's "
        "rotation is assumed to be true north.",
        "Add a second control point to fix rotation and scale.",
    ))
    return flags


# ===========================================================================
# Entry point
# ===========================================================================
def build_geometry(doc: LandDocument, area_tolerance_pct: float = 2.0) -> GeometryResult:
    """
    Recover the best geometry the document supports, and say plainly how good it is.

    Sources are tried best-first. Whatever is produced is reconciled against the
    area written on the document, because those are two independent statements
    about the same parcel and a disagreement means something on the page is wrong.
    """
    declared_m2, flags = resolve_declared_area(doc)

    result: Optional[GeometryResult] = None
    for source, builder in (
        (doc.coordinates, _from_coordinates),
        (doc.traverse, _from_traverse),
        (doc.chain_offset, _from_chain_offset),
    ):
        if source is None:
            continue
        try:
            result, more = builder(doc, source)     # type: ignore[operator]
            flags += more
            break
        except Exception as exc:
            flags.append(GeometryFlag(
                f"{builder.__name__.strip('_').upper()}_FAILED", "CONFLICT",
                f"{type(exc).__name__}: {exc}",
                "Correct this source in the extraction output, or fall back to the "
                "next one available.",
            ))

    if result is None:
        result = GeometryResult(
            survey_no=doc.survey_no,
            method="none",
            accuracy_class="none",
            accuracy_note=ACCURACY_NOTES["none"],
            provenance={"has_boundaries": bool(doc.boundaries)},
        )
        if doc.boundaries:
            result.accuracy_class = "inferred"
            result.accuracy_note = ACCURACY_NOTES["inferred"]
            flags.append(GeometryFlag(
                "ADJACENCY_ONLY", "INFO",
                "No measurements in this document, but its four boundaries name "
                f"{len([v for v in doc.boundaries.values() if v])} neighbours. Position "
                "can be estimated once those neighbours are mapped.",
                "Process the whole village together so the adjacency network can be "
                "solved.",
            ))
        else:
            flags.append(GeometryFlag(
                "NO_GEOMETRY_SOURCE", "CRITICAL",
                "The document carries no coordinates, no traverse, no chain-and-offset "
                "measurements and no boundary description. Nothing can be plotted.",
                "Locate the tippan / Field Measurement Book for this survey number — "
                "the textual extract alone never contains geometry.",
            ))

    result.boundaries = {k: v for k, v in (doc.boundaries or {}).items() if v}
    result.declared_area_m2 = declared_m2

    # Place BEFORE reconciling area. A Helmert fit can rescale the ring, so an
    # area computed from the unplaced local ring would describe a parcel that no
    # longer exists.
    if result.ring_local is not None and result.ring_wgs84 is None:
        flags += _place(result, doc)

    if result.ring_wgs84 is not None:
        metric = result.crs_used or crs.pick_metric_crs(*result.ring_wgs84[0])
        measured_on = crs.transform_ring(result.ring_wgs84, crs.CRS_WGS84, metric)
        basis = "the plotted boundary"
    elif result.ring_local is not None:
        measured_on = list(result.ring_local)
        basis = "the recorded measurements"
    else:
        measured_on = []
        basis = ""

    if measured_on:
        check = sm.check_area(measured_on, declared_m2, area_tolerance_pct)
        result.computed_area_m2 = check.computed_m2
        result.area_check = vars(check)
        if check.within_tolerance is False:
            flags.append(GeometryFlag(
                "AREA_MISMATCH",
                "CRITICAL" if (check.delta_pct or 0) > 10 else "CONFLICT",
                f"{basis.capitalize()} encloses {check.computed_m2:,.2f} m² but the "
                f"document declares {check.declared_m2:,.2f} m² — a difference of "
                f"{check.delta_pct:.2f}%.",
                "Two independent statements about the same parcel disagree. Re-read "
                "the area field and the measurements before accepting either.",
            ))

    if result.ring_wgs84 is None and result.ring_local is not None:
        flags.append(GeometryFlag(
            "UNPLACED", "WARNING",
            "The parcel's shape and area are exact, but the document gives nothing "
            "that fixes where on Earth it sits.",
            "Supply two control points, or process the village as a batch so this "
            "parcel can attach to a mapped neighbour.",
        ))

    result.flags += flags
    return result
