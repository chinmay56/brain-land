"""
Spatial validation engine for cadastral land records.

This is the piece that turns GIS from a map viewer into a second validator.
Every rule here catches a class of error that OCR confidence scores cannot see,
because the error only becomes visible when the textual record is compared
against the shape of the land on the ground.

Rules implemented
-----------------
R-GIS-01  Area reconciliation   register area  vs  mapped polygon area
R-GIS-02  Overlap detection     two parcels claiming the same ground
R-GIS-03  Boundary slivers      unclaimed strips between adjacent parcels
R-GIS-04  Containment           parcel must sit inside its own village
R-GIS-05  Subdivision sum       children must tile the parent parcel
R-GIS-06  Record/parcel join    orphan records and orphan polygons
R-GIS-07  Coverage              how much of the village is actually mapped

Geometry notes
--------------
Storage / interchange CRS is EPSG:4326 (WGS84 lon/lat), which is what GeoJSON
and every web map expects. All *metric* work (area, distance, buffering) is
done in EPSG:32643 (WGS84 / UTM zone 43N), the correct projected CRS for Pune.
Mixing the two up is the single most common GIS bug — degrees are not metres.

When this moves to PostGIS the rules map one-to-one:
    R-GIS-01 -> ST_Area(geom::geography)
    R-GIS-02 -> ST_Overlaps(a.geom, b.geom)
    R-GIS-03 -> ST_Distance(a.geom, b.geom)
    R-GIS-04 -> ST_Within(parcel.geom, village.geom)
    R-GIS-05 -> ST_Union(children) vs parent
"""
from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field, asdict
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from pyproj import Transformer
from shapely.geometry import shape, mapping
from shapely.geometry.base import BaseGeometry
from shapely.ops import transform as shapely_transform, unary_union

DATA_DIR = Path(__file__).resolve().parent.parent / "data"

# Interchange CRS (GeoJSON / web map) and metric CRS (Pune -> UTM 43N)
CRS_GEOGRAPHIC = "EPSG:4326"
CRS_METRIC = "EPSG:32643"

_to_metric = Transformer.from_crs(CRS_GEOGRAPHIC, CRS_METRIC, always_xy=True).transform
_to_geographic = Transformer.from_crs(CRS_METRIC, CRS_GEOGRAPHIC, always_xy=True).transform

# Tunables — a revenue department would set these in policy, not in code.
AREA_TOLERANCE = 0.05        # 5% between register area and mapped area
SLIVER_MAX_GAP_M = 15.0      # narrower than this between neighbours is a sliver, not a road
SUBDIVISION_TOLERANCE = 0.02 # 2% when children are summed against the parent
MIN_OVERLAP_M2 = 50.0        # ignore hairline overlaps from digitising noise

SEVERITY_ORDER = {"INFO": 0, "WARNING": 1, "CONFLICT": 2, "CRITICAL": 3}


def _slug(survey_no: str) -> str:
    """Survey numbers contain slashes; flag ids end up in URLs and DOM keys."""
    return survey_no.replace("/", "-").replace(" ", "")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def to_metric(geom: BaseGeometry) -> BaseGeometry:
    """WGS84 lon/lat -> UTM 43N metres."""
    return shapely_transform(_to_metric, geom)


def to_geographic(geom: BaseGeometry) -> BaseGeometry:
    """UTM 43N metres -> WGS84 lon/lat."""
    return shapely_transform(_to_geographic, geom)


def area_ha(geom: BaseGeometry) -> float:
    """Area of a WGS84 geometry, in hectares."""
    return round(to_metric(geom).area / 10_000.0, 4)


def derive_ulpin(geom: BaseGeometry, state_code: str = "27") -> str:
    """
    Demo derivation of a 14-character parcel identifier from the polygon centroid.

    NOTE: this is *not* the official ULPIN / Bhu-Aadhaar algorithm. The real
    identifier is issued by the state under DILRMP following ECCMA and OGC
    standards. This produces a stable, geometry-derived stand-in so the join
    and the UI can be demonstrated end to end.
    """
    c = geom.centroid
    seed = f"{c.y:.7f},{c.x:.7f}"
    digest = hashlib.sha256(seed.encode()).hexdigest().upper()
    return f"{state_code}{digest[:12]}"


@dataclass
class SpatialFlag:
    """One finding produced by the spatial validation engine."""
    id: str
    rule: str
    severity: str                       # INFO | WARNING | CONFLICT | CRITICAL
    survey_no: Optional[str]
    related_survey_no: Optional[str]
    message: str
    suggested_action: str
    measure: Dict[str, Any] = field(default_factory=dict)
    geometry: Optional[Dict[str, Any]] = None   # GeoJSON of the offending area

    def dict(self) -> Dict[str, Any]:
        return asdict(self)


# ---------------------------------------------------------------------------
# Data loading
# ---------------------------------------------------------------------------
@lru_cache(maxsize=8)
def _load_json(name: str) -> Dict[str, Any]:
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


def load_village(village_id: str = "hadapsar") -> Dict[str, Any]:
    fc = _load_json(f"{village_id}_village.geojson")
    return fc["features"][0]


def load_parcels(village_id: str = "hadapsar") -> List[Dict[str, Any]]:
    return _load_json(f"{village_id}_cadastral.geojson")["features"]


def load_records(village_id: str = "hadapsar") -> List[Dict[str, Any]]:
    return _load_json(f"{village_id}_records.json")["records"]


# ---------------------------------------------------------------------------
# R-GIS-06  Join textual records to parcel geometry
# ---------------------------------------------------------------------------
def join_records_to_parcels(
    parcels: List[Dict[str, Any]],
    records: List[Dict[str, Any]],
) -> Tuple[List[Dict[str, Any]], List[SpatialFlag]]:
    """
    Join on (LGD village code + survey number) — the only key that is stable
    across a register and a map sheet.

    Produces the joined view plus flags for the two failure modes that matter:
      * a record with no polygon  -> the parcel is unmapped, or the entry is a ghost
      * a polygon with no record  -> land on the map that nobody has title to
    """
    flags: List[SpatialFlag] = []
    by_survey = {r["survey_no"]: r for r in records}
    joined: List[Dict[str, Any]] = []
    seen: set[str] = set()

    for feat in parcels:
        survey_no = feat["properties"]["survey_no"]
        geom = shape(feat["geometry"])
        record = by_survey.get(survey_no)
        seen.add(survey_no)

        if record is None:
            flags.append(SpatialFlag(
                id=f"GIS-ORPH-P-{_slug(survey_no)}",
                rule="R-GIS-06",
                severity="WARNING",
                survey_no=survey_no,
                related_survey_no=None,
                message=(f"Parcel {survey_no} exists on cadastral sheet 14 "
                         f"({area_ha(geom)} ha) but has no matching entry in the "
                         f"Record of Rights."),
                suggested_action=("Check the mutation register for a missing entry, "
                                  "or classify as government / common land."),
                measure={"mapped_area_ha": area_ha(geom)},
                geometry=mapping(geom),
            ))

        joined.append({
            "survey_no": survey_no,
            "properties": feat["properties"],
            "geometry": feat["geometry"],
            "mapped_area_ha": area_ha(geom),
            "ulpin": derive_ulpin(geom),
            "record": record,
        })

    for survey_no, record in by_survey.items():
        if survey_no in seen:
            continue
        flags.append(SpatialFlag(
            id=f"GIS-ORPH-R-{_slug(survey_no)}",
            rule="R-GIS-06",
            severity="WARNING",
            survey_no=survey_no,
            related_survey_no=None,
            message=(f"Record {record['record_id']} claims survey no. {survey_no} "
                     f"({record['recorded_area_ha']} ha) but no such parcel exists "
                     f"on the cadastral sheet."),
            suggested_action=("Georeference the parcel from the tippan / FMB sketch, "
                              "or verify the survey number against the index register."),
            measure={"recorded_area_ha": record["recorded_area_ha"]},
        ))

    return joined, flags


# ---------------------------------------------------------------------------
# R-GIS-01  Area reconciliation
# ---------------------------------------------------------------------------
def check_area_reconciliation(
    joined: List[Dict[str, Any]],
    tolerance: float = AREA_TOLERANCE,
) -> List[SpatialFlag]:
    """
    Compare the area written in the register against the area of the polygon.

    This is the single highest-value rule in the system. A disagreement means
    one of three things, all of which a revenue officer needs to see:
      1. the OCR misread a digit (2.45 read as 24.5)
      2. the boundary on the ground has moved  -> encroachment
      3. the register was never updated after a subdivision
    """
    flags: List[SpatialFlag] = []

    for p in joined:
        record = p["record"]
        if not record:
            continue

        recorded = float(record["recorded_area_ha"])
        mapped = p["mapped_area_ha"]
        if recorded <= 0:
            continue

        delta = mapped - recorded
        pct = abs(delta) / recorded

        if pct <= tolerance:
            continue

        severity = "CONFLICT" if pct > 0.15 else "WARNING"
        direction = "larger than" if delta > 0 else "smaller than"

        flags.append(SpatialFlag(
            id=f"GIS-AREA-{_slug(p['survey_no'])}",
            rule="R-GIS-01",
            severity=severity,
            survey_no=p["survey_no"],
            related_survey_no=None,
            message=(f"Mapped parcel area ({mapped} ha) is {pct * 100:.1f}% "
                     f"{direction} the area recorded in the register "
                     f"({recorded} ha) — a difference of {abs(delta):.4f} ha."),
            suggested_action=("Re-read the area field on the source page; if the "
                              "register is correct, raise a boundary / encroachment "
                              "inspection."),
            measure={
                "recorded_area_ha": recorded,
                "mapped_area_ha": mapped,
                "delta_ha": round(delta, 4),
                "delta_pct": round(pct * 100, 2),
                "tolerance_pct": tolerance * 100,
            },
            geometry=p["geometry"],
        ))

    return flags


# ---------------------------------------------------------------------------
# R-GIS-02  Overlapping parcels
# ---------------------------------------------------------------------------
def detect_overlaps(
    joined: List[Dict[str, Any]],
    min_area_m2: float = MIN_OVERLAP_M2,
) -> List[SpatialFlag]:
    """
    Two parcels covering the same ground means two people hold title to the
    same land. This is a live boundary dispute waiting to happen, and it is
    completely invisible to any text-only validation.

    Parent/child pairs (131/2 vs 131/2/A) are expected to overlap and are skipped.
    """
    flags: List[SpatialFlag] = []
    geoms = {p["survey_no"]: to_metric(shape(p["geometry"])) for p in joined}
    parents = {p["survey_no"]: p["properties"].get("parent_survey_no") for p in joined}
    owners = {
        p["survey_no"]: (p["record"] or {}).get("owner_name", "— no record —")
        for p in joined
    }
    keys = sorted(geoms)

    for i, a in enumerate(keys):
        for b in keys[i + 1:]:
            # a subdivision legitimately sits inside its parent
            if parents.get(a) == b or parents.get(b) == a:
                continue

            ga, gb = geoms[a], geoms[b]
            if not ga.intersects(gb):
                continue

            inter = ga.intersection(gb)
            if inter.area < min_area_m2:
                continue

            overlap_ha = round(inter.area / 10_000.0, 4)
            pct_of_smaller = inter.area / min(ga.area, gb.area) * 100

            flags.append(SpatialFlag(
                id=f"GIS-OVL-{_slug(a)}-{_slug(b)}",
                rule="R-GIS-02",
                severity="CRITICAL",
                survey_no=a,
                related_survey_no=b,
                message=(f"Parcels {a} and {b} physically overlap by {overlap_ha} ha "
                         f"({pct_of_smaller:.1f}% of the smaller parcel). "
                         f"{owners[a]} and {owners[b]} both hold title to this ground."),
                suggested_action=("Halt mutation on both records. Order a joint "
                                  "measurement (panchnama) before either is certified."),
                measure={
                    "overlap_ha": overlap_ha,
                    "overlap_pct_of_smaller": round(pct_of_smaller, 2),
                    "owner_a": owners[a],
                    "owner_b": owners[b],
                },
                geometry=mapping(to_geographic(inter)),
            ))

    return flags


# ---------------------------------------------------------------------------
# R-GIS-03  Slivers between adjacent parcels
# ---------------------------------------------------------------------------
def detect_boundary_gaps(
    joined: List[Dict[str, Any]],
    max_gap_m: float = SLIVER_MAX_GAP_M,
) -> List[SpatialFlag]:
    """
    A narrow strip between two parcels that belongs to neither.

    In practice these are digitising errors, or land that quietly fell out of
    the record during a past subdivision. Either way it is unaccounted land
    sitting inside a village, and it is exactly what a resurvey is supposed
    to find.
    """
    flags: List[SpatialFlag] = []
    geoms = {p["survey_no"]: to_metric(shape(p["geometry"])) for p in joined}
    parents = {p["survey_no"]: p["properties"].get("parent_survey_no") for p in joined}
    present = set(geoms)

    # A sub-division sits inside its parent, so it shares the parent's outer
    # edges. Testing both would report the same strip twice — keep the parent.
    keys = sorted(
        sn for sn in geoms
        if not (parents.get(sn) and parents[sn] in present)
    )

    for i, a in enumerate(keys):
        for b in keys[i + 1:]:
            ga, gb = geoms[a], geoms[b]
            gap = ga.distance(gb)
            if gap <= 0.01 or gap > max_gap_m:
                continue

            # Reconstruct the strip: expand both by half the gap and intersect.
            pad = gap / 2 + 0.5
            strip = ga.buffer(pad).intersection(gb.buffer(pad))
            strip_ha = round(strip.area / 10_000.0, 4)

            flags.append(SpatialFlag(
                id=f"GIS-GAP-{a.replace('/', '-')}-{b.replace('/', '-')}",
                rule="R-GIS-03",
                severity="WARNING",
                survey_no=a,
                related_survey_no=b,
                message=(f"A {gap:.1f} m strip of roughly {strip_ha} ha lies between "
                         f"parcels {a} and {b} and is claimed by neither."),
                suggested_action=("Check the tippan for a missing sub-division, or "
                                  "record the strip as government / road land."),
                measure={"gap_width_m": round(gap, 2), "approx_area_ha": strip_ha},
                geometry=mapping(to_geographic(strip)),
            ))

    return flags


# ---------------------------------------------------------------------------
# R-GIS-04  Containment inside the village boundary
# ---------------------------------------------------------------------------
def check_containment(
    joined: List[Dict[str, Any]],
    village_feature: Dict[str, Any],
) -> List[SpatialFlag]:
    """
    Every parcel of Hadapsar must plot inside Hadapsar. If it does not, either
    the village code on the record is wrong, or the map sheet was georeferenced
    against the wrong control points. Both are silent, systematic errors.
    """
    flags: List[SpatialFlag] = []
    village = to_metric(shape(village_feature["geometry"]))
    village_name = village_feature["properties"]["village_name"]

    for p in joined:
        geom = to_metric(shape(p["geometry"]))
        if village.contains(geom):
            continue

        outside = geom.difference(village)
        outside_ha = round(outside.area / 10_000.0, 4)
        pct = outside.area / geom.area * 100

        flags.append(SpatialFlag(
            id=f"GIS-OUT-{_slug(p['survey_no'])}",
            rule="R-GIS-04",
            severity="CRITICAL" if pct > 50 else "CONFLICT",
            survey_no=p["survey_no"],
            related_survey_no=None,
            message=(f"Parcel {p['survey_no']} falls {pct:.0f}% outside the "
                     f"{village_name} village boundary ({outside_ha} ha outside)."),
            suggested_action=("Verify the LGD village code on the record, and "
                              "re-check the ground control points used to "
                              "georeference this map sheet."),
            measure={
                "outside_area_ha": outside_ha,
                "outside_pct": round(pct, 2),
                "village": village_name,
            },
            geometry=mapping(to_geographic(outside)),
        ))

    return flags


# ---------------------------------------------------------------------------
# R-GIS-05  Subdivisions must sum back to the parent
# ---------------------------------------------------------------------------
def check_subdivision_sums(
    joined: List[Dict[str, Any]],
    tolerance: float = SUBDIVISION_TOLERANCE,
) -> List[SpatialFlag]:
    """
    When 131/2 is partitioned into 131/2/A and 131/2/B, the children must tile
    the parent exactly. Land that goes missing in a partition is one of the
    most common sources of family land litigation in India.
    """
    flags: List[SpatialFlag] = []
    by_survey = {p["survey_no"]: p for p in joined}

    children: Dict[str, List[Dict[str, Any]]] = {}
    for p in joined:
        parent = p["properties"].get("parent_survey_no")
        if parent:
            children.setdefault(parent, []).append(p)

    for parent_no, kids in children.items():
        parent = by_survey.get(parent_no)
        if not parent:
            continue

        parent_geom = to_metric(shape(parent["geometry"]))
        union = unary_union([to_metric(shape(k["geometry"])) for k in kids])

        uncovered = parent_geom.difference(union)
        spill = union.difference(parent_geom)

        parent_ha = round(parent_geom.area / 10_000.0, 4)
        union_ha = round(union.area / 10_000.0, 4)
        diff_pct = abs(parent_geom.area - union.area) / parent_geom.area

        if diff_pct <= tolerance and spill.area < MIN_OVERLAP_M2:
            continue

        flags.append(SpatialFlag(
            id=f"GIS-SUB-{_slug(parent_no)}",
            rule="R-GIS-05",
            severity="CONFLICT",
            survey_no=parent_no,
            related_survey_no=", ".join(k["survey_no"] for k in kids),
            message=(f"Sub-divisions of {parent_no} cover {union_ha} ha but the "
                     f"parent parcel is {parent_ha} ha — "
                     f"{round(uncovered.area / 10_000.0, 4)} ha is unaccounted for."),
            suggested_action=("Re-open the partition deed. Every square metre of "
                              "the parent must be allocated to a sub-division."),
            measure={
                "parent_area_ha": parent_ha,
                "children_union_ha": union_ha,
                "uncovered_ha": round(uncovered.area / 10_000.0, 4),
                "spill_ha": round(spill.area / 10_000.0, 4),
                "children": [k["survey_no"] for k in kids],
            },
            geometry=mapping(to_geographic(uncovered)) if not uncovered.is_empty else None,
        ))

    return flags


# ---------------------------------------------------------------------------
# R-GIS-07  Cadastral coverage of the village
# ---------------------------------------------------------------------------
def coverage_stats(
    joined: List[Dict[str, Any]],
    village_feature: Dict[str, Any],
) -> Dict[str, Any]:
    """
    What share of the village actually has parcel geometry?

    This is the number DILRMP tracks nationally — cadastral map digitisation
    sits far behind textual RoR computerisation, and it is the gap this
    pipeline is meant to close. It is also the denominator that makes a
    district-wise progress dashboard possible at all.
    """
    village = to_metric(shape(village_feature["geometry"]))

    inside = []
    for p in joined:
        g = to_metric(shape(p["geometry"]))
        clipped = g.intersection(village)
        if not clipped.is_empty:
            inside.append(clipped)

    mapped = unary_union(inside) if inside else None
    mapped_area = mapped.area if mapped else 0.0
    unmapped = village.area - mapped_area

    return {
        "village_area_ha": round(village.area / 10_000.0, 4),
        "mapped_area_ha": round(mapped_area / 10_000.0, 4),
        "unmapped_area_ha": round(unmapped / 10_000.0, 4),
        "coverage_pct": round(mapped_area / village.area * 100, 2),
        "parcel_count": len(joined),
    }


# ---------------------------------------------------------------------------
# Orchestration
# ---------------------------------------------------------------------------
def validate_village(village_id: str = "hadapsar") -> Dict[str, Any]:
    """
    Run every spatial rule and return the full picture: the joined parcels,
    a per-parcel spatial status, the flags, and the village-level statistics.
    """
    village_feature = load_village(village_id)
    parcels = load_parcels(village_id)
    records = load_records(village_id)

    joined, flags = join_records_to_parcels(parcels, records)

    flags += check_area_reconciliation(joined)
    flags += detect_overlaps(joined)
    flags += detect_boundary_gaps(joined)
    flags += check_containment(joined, village_feature)
    flags += check_subdivision_sums(joined)

    flags.sort(key=lambda f: -SEVERITY_ORDER.get(f.severity, 0))

    # Roll the worst flag on each parcel up into a single spatial status.
    worst: Dict[str, str] = {}
    for f in flags:
        for sn in (f.survey_no, f.related_survey_no):
            if not sn:
                continue
            for part in str(sn).split(", "):
                cur = worst.get(part)
                if cur is None or SEVERITY_ORDER[f.severity] > SEVERITY_ORDER[cur]:
                    worst[part] = f.severity

    def status_for(survey_no: str) -> str:
        sev = worst.get(survey_no)
        if sev in ("CRITICAL", "CONFLICT"):
            return "CONFLICT"
        if sev == "WARNING":
            return "REVIEW"
        return "VERIFIED"

    for p in joined:
        p["spatial_status"] = status_for(p["survey_no"])
        p["flag_ids"] = [
            f.id for f in flags
            if p["survey_no"] in (f.survey_no, f.related_survey_no)
            or (f.related_survey_no and p["survey_no"] in str(f.related_survey_no))
        ]

    stats = coverage_stats(joined, village_feature)
    stats.update({
        "flags_total": len(flags),
        "flags_critical": sum(1 for f in flags if f.severity == "CRITICAL"),
        "flags_conflict": sum(1 for f in flags if f.severity == "CONFLICT"),
        "flags_warning": sum(1 for f in flags if f.severity == "WARNING"),
        "parcels_verified": sum(1 for p in joined if p["spatial_status"] == "VERIFIED"),
        "parcels_review": sum(1 for p in joined if p["spatial_status"] == "REVIEW"),
        "parcels_conflict": sum(1 for p in joined if p["spatial_status"] == "CONFLICT"),
        "records_total": len(records),
        "records_matched": sum(1 for p in joined if p["record"]),
    })

    return {
        "village": village_feature["properties"],
        "village_boundary": village_feature["geometry"],
        "parcels": joined,
        "flags": [f.dict() for f in flags],
        "stats": stats,
    }


def parcels_as_geojson(result: Dict[str, Any]) -> Dict[str, Any]:
    """Package the validated parcels as a GeoJSON FeatureCollection for the map."""
    features = []
    for p in result["parcels"]:
        record = p["record"] or {}
        features.append({
            "type": "Feature",
            "geometry": p["geometry"],
            "properties": {
                **p["properties"],
                "ulpin": p["ulpin"],
                "mapped_area_ha": p["mapped_area_ha"],
                "recorded_area_ha": record.get("recorded_area_ha"),
                "owner_name": record.get("owner_name"),
                "record_id": record.get("record_id"),
                "khata_no": record.get("khata"),
                "mutation_no": record.get("mutation_no"),
                "document_type": record.get("document_type"),
                "extraction_confidence": record.get("extraction_confidence"),
                "spatial_status": p["spatial_status"],
                "flag_ids": p["flag_ids"],
            },
        })
    return {
        "type": "FeatureCollection",
        "name": "validated_cadastral_parcels",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": features,
    }


def validate_uploaded_records(
    records: List[Dict[str, Any]],
    village_id: str = "hadapsar",
) -> Dict[str, Any]:
    """
    Same engine, but driven by records handed in from outside instead of the
    bundled file. This is the seam where the OCR / extraction stage plugs in:
    give it whatever the extractor produced and it is validated against the
    cadastral geometry immediately.
    """
    village_feature = load_village(village_id)
    parcels = load_parcels(village_id)

    joined, flags = join_records_to_parcels(parcels, records)
    flags += check_area_reconciliation(joined)
    flags += detect_overlaps(joined)
    flags += detect_boundary_gaps(joined)
    flags += check_containment(joined, village_feature)
    flags += check_subdivision_sums(joined)
    flags.sort(key=lambda f: -SEVERITY_ORDER.get(f.severity, 0))

    return {
        "village": village_feature["properties"],
        "records_received": len(records),
        "parcels_matched": sum(1 for p in joined if p["record"]),
        "flags": [f.dict() for f in flags],
        "stats": coverage_stats(joined, village_feature),
    }
