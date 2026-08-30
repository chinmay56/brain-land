"""
Ground-truth test for village assembly.

Build a village whose true layout we know. Turn each parcel into the kind of
document a record room actually holds — a traverse of bearings and distances,
a declared area, and the four boundaries — then throw away every position except
a single anchor.

If the assembler is right, it puts every parcel back where it started using
nothing but the documents.
"""
from __future__ import annotations

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import warnings
warnings.filterwarnings("ignore")

from app.services import crs_india as crs                    # noqa: E402
from app.services import survey_math as sm                   # noqa: E402
from app.services.document_geometry import (                 # noqa: E402
    ChainOffsetSource, ControlPoint, CoordinateSource, LandDocument,
    TraverseSource, build_geometry,
)
from app.services.village_assembler import assemble_village  # noqa: E402

ANCHOR_LON, ANCHOR_LAT = 73.9259, 18.5089

# ---------------------------------------------------------------------------
# The truth: a 3 x 2 block of parcels, in metres, local frame.
# ---------------------------------------------------------------------------
TRUE_PARCELS = {
    "101/1": [(0, 0), (100, 0), (100, 80), (0, 80)],
    "101/2": [(100, 0), (220, 0), (220, 80), (100, 80)],
    "101/3": [(220, 0), (300, 0), (300, 80), (220, 80)],
    "101/4": [(0, 80), (100, 80), (100, 180), (0, 180)],
    "101/5": [(100, 80), (220, 80), (220, 180), (100, 180)],
    "101/6": [(220, 80), (300, 80), (300, 180), (220, 180)],
}

BOUNDARIES = {
    "101/1": {"east": "Survey 101/2", "north": "Survey 101/4",
              "west": "Village road", "south": "Nala"},
    "101/2": {"east": "Survey 101/3", "west": "Survey 101/1",
              "north": "Survey 101/5", "south": "Nala"},
    "101/3": {"west": "Survey 101/2", "north": "Survey 101/6",
              "east": "Village road", "south": "Nala"},
    "101/4": {"east": "Survey 101/5", "south": "Survey 101/1",
              "west": "Village road", "north": "Government land"},
    "101/5": {"east": "Survey 101/6", "west": "Survey 101/4",
              "south": "Survey 101/2", "north": "Government land"},
    "101/6": {"west": "Survey 101/5", "south": "Survey 101/3",
              "east": "Village road", "north": "Government land"},
}

OWNERS = {
    "101/1": "Ramesh Baliram Patil", "101/2": "Sunita Devi Deshmukh",
    "101/3": "Ganesh Maruti Shinde", "101/4": "Vikram Ananta Joshi",
    "101/5": "Amit Sharma", "101/6": "Kavita Sunil Deshmukh",
}


def ring_to_traverse_legs(ring):
    """A closed ring -> the bearings and distances a field book would record."""
    legs = []
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        dx, dy = x2 - x1, y2 - y1
        wcb = math.degrees(math.atan2(dx, dy)) % 360.0   # clockwise from north
        legs.append({
            "bearing": sm.to_quadrantal(wcb),            # written as a surveyor would
            "distance": round(math.hypot(dx, dy), 3),
            "unit": "m",
            "from": f"P{i + 1}", "to": f"P{(i + 1) % n + 1}",
        })
    return legs


def build_documents():
    """One document per parcel. Only 101/1 carries coordinates."""
    docs = []
    for survey_no, ring in TRUE_PARCELS.items():
        area_m2 = sm.ring_area_m2(ring)
        doc = LandDocument(
            survey_no=survey_no,
            village="Testganj", state="Maharashtra",
            district="Pune", tehsil="Haveli",
            lgd_village_code="999001",
            owner_name=OWNERS[survey_no],
            document_type="7/12 Extract + Tippan",
            area_value=round(area_m2 / 101.17141056, 4),
            area_unit="guntha",
            boundaries=BOUNDARIES[survey_no],
            traverse=TraverseSource(legs=ring_to_traverse_legs(ring),
                                    distance_unit="m"),
        )
        if survey_no == "101/1":
            # The single anchor: this one parcel has been surveyed with GPS.
            geo, _ = crs.local_frame_to_wgs84(ring, ANCHOR_LON, ANCHOR_LAT,
                                              anchor_local=(0.0, 0.0))
            doc.traverse = None
            doc.coordinates = CoordinateSource(points=geo, crs="WGS84")
        docs.append(doc)
    return docs


def truth_in_wgs84():
    out = {}
    for survey_no, ring in TRUE_PARCELS.items():
        geo, _ = crs.local_frame_to_wgs84(ring, ANCHOR_LON, ANCHOR_LAT, (0.0, 0.0))
        out[survey_no] = geo
    return out


def main() -> int:
    print("=" * 78)
    print("GROUND-TRUTH TEST — can a village rebuild itself from its documents?")
    print("=" * 78)

    docs = build_documents()
    results = [build_geometry(d) for d in docs]

    print("\nStep 1 — geometry from each document on its own")
    for r in results:
        print(f"  {r.survey_no:8} {r.method:12} {r.accuracy_class:24} "
              f"placed={str(r.is_placed):5} area={r.computed_area_m2:>9,.1f} m²")

    placed_before = sum(1 for r in results if r.is_placed)
    print(f"\n  {placed_before} of {len(results)} plottable. The rest have exact "
          f"shapes and no position — which is the real situation in a record room.")

    print("\nStep 2 — assemble the village from the adjacency network")
    report = assemble_village(results, village="Testganj")
    for key, value in report.stats.items():
        print(f"  {key:16} {value}")

    print("\nStep 3 — compare every assembled parcel against the truth")
    truth = truth_in_wgs84()
    metric = report.stats["metric_crs"]
    worst = 0.0
    rows = []
    for r in results:
        if not r.is_placed:
            rows.append((r.survey_no, None, None, "NOT PLACED"))
            continue
        t = crs.transform_ring(truth[r.survey_no], crs.CRS_WGS84, metric)
        g = crs.transform_ring(r.ring_wgs84, crs.CRS_WGS84, metric)
        err = math.dist(sm.centroid(t), sm.centroid(g))
        area_err = abs(sm.ring_area_m2(g) - sm.ring_area_m2(t))
        worst = max(worst, err)
        rows.append((r.survey_no, err, area_err, r.accuracy_class))

    print(f"  {'parcel':9}{'centroid error':>16}{'area error':>14}   source")
    for survey_no, err, area_err, cls in rows:
        if err is None:
            print(f"  {survey_no:9}{'—':>16}{'—':>14}   {cls}")
        else:
            print(f"  {survey_no:9}{err:>13.3f} m{area_err:>11.3f} m²   {cls}")

    print(f"\n  worst centroid error across the village: {worst:.4f} m")

    ok = worst < 1.0 and len(report.unplaceable) == 0
    conflicts = [f for f in report.flags if f["severity"] in ("CRITICAL", "CONFLICT")]
    if conflicts:
        print("\n  assembly conflicts:")
        for f in conflicts:
            print(f"    [{f['severity']}] {f['code']}: {f['message'][:88]}")

    print("\n" + "=" * 78)
    print(f"RESULT: {'PASS' if ok and not conflicts else 'FAIL'} — "
          f"{report.stats['placed']}/{report.stats['parcels']} parcels placed from "
          f"1 anchor, worst error {worst:.3f} m")
    print("=" * 78)
    return 0 if (ok and not conflicts) else 1


if __name__ == "__main__":
    raise SystemExit(main())
