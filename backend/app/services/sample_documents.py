"""
Worked examples of the document input format.

These are not pre-drawn maps. Each entry contains only what a real land record
carries — bearings and distances from a field book, a tippan's chain-and-offset
ladder, a declared area, and the four boundaries. Every polygon you see on the
map is computed from those numbers by the same engine that will process real
extractions.

Exactly one parcel per village carries coordinates. That is the anchor. Everything
else is placed by solving the adjacency network.

Use them to exercise the upload path before OCR exists:
    GET  /api/gis/sample?village=grid   -> save the response
    POST /api/gis/upload                -> plot it
"""
from __future__ import annotations

import math
from typing import Any, Dict, List, Tuple

from . import crs_india as crs
from . import survey_math as sm

Ring = List[Tuple[float, float]]


def _legs_from_ring(ring: Ring) -> List[Dict[str, Any]]:
    """A closed ring -> the bearings and distances a field book would record."""
    legs = []
    n = len(ring)
    for i in range(n):
        x1, y1 = ring[i]
        x2, y2 = ring[(i + 1) % n]
        dx, dy = x2 - x1, y2 - y1
        wcb = math.degrees(math.atan2(dx, dy)) % 360.0
        legs.append({
            "bearing": sm.to_quadrantal(wcb),
            "distance": round(math.hypot(dx, dy) / sm.LINEAR_UNITS_M["link"], 2),
            "unit": "links",
            "from_station": f"P{i + 1}",
            "to_station": f"P{(i + 1) % n + 1}",
        })
    return legs


def _ladder_from_ring(ring: Ring) -> Dict[str, Any]:
    """A closed ring -> the chain-and-offset ladder a tippan would show."""
    (x0, y0), (x1, y1) = ring[0], ring[1]
    base = math.hypot(x1 - x0, y1 - y0)
    ux, uy = (x1 - x0) / base, (y1 - y0) / base
    offsets = []
    for i, (px, py) in enumerate(ring):
        dx, dy = px - x0, py - y0
        chainage = dx * ux + dy * uy
        offset = -dx * uy + dy * ux
        offsets.append({
            "chainage": round(chainage / sm.LINEAR_UNITS_M["link"], 2),
            "offset": round(abs(offset) / sm.LINEAR_UNITS_M["link"], 2),
            "side": "L" if offset >= 0 else "R",
            "seq": i,
            "label": chr(ord("A") + i),
        })
    return {"base_length": round(base / sm.LINEAR_UNITS_M["link"], 2),
            "offsets": offsets, "unit": "links"}


# ---------------------------------------------------------------------------
# Two villages, described only in local metres. Nothing here is a map — these
# are the shapes a surveyor's measurements would encode.
# ---------------------------------------------------------------------------
GRID = {
    "anchor": (73.92590, 18.50890),
    "village": "Hadapsar", "tehsil": "Haveli", "district": "Pune",
    "state": "Maharashtra", "lgd_village_code": "556489", "sheet": "14",
    "rings": {
        "124/1": [(0, 0), (100, 0), (100, 80), (0, 80)],
        "124/2": [(100, 0), (220, 0), (220, 80), (100, 80)],
        "124/3": [(220, 0), (300, 0), (300, 80), (220, 80)],
        "124/4": [(0, 80), (100, 80), (100, 180), (0, 180)],
        "124/5": [(100, 80), (220, 80), (220, 180), (100, 180)],
        "124/6": [(220, 80), (300, 80), (300, 180), (220, 180)],
    },
    "boundaries": {
        "124/1": {"east": "Survey No. 124/2", "north": "Survey No. 124/4",
                  "west": "Village road", "south": "Nala"},
        "124/2": {"east": "Survey No. 124/3", "west": "Survey No. 124/1",
                  "north": "Survey No. 124/5", "south": "Nala"},
        "124/3": {"west": "Survey No. 124/2", "north": "Survey No. 124/6",
                  "east": "Village road", "south": "Nala"},
        "124/4": {"east": "Survey No. 124/5", "south": "Survey No. 124/1",
                  "west": "Village road", "north": "Gairan (village common)"},
        "124/5": {"east": "Survey No. 124/6", "west": "Survey No. 124/4",
                  "south": "Survey No. 124/2", "north": "Gairan (village common)"},
        "124/6": {"west": "Survey No. 124/5", "south": "Survey No. 124/3",
                  "east": "Village road", "north": "Gairan (village common)"},
    },
    "owners": {
        "124/1": "Ramesh Baliram Patil", "124/2": "Sunita Devi Deshmukh",
        "124/3": "Ganesh Maruti Shinde", "124/4": "Vikram Ananta Joshi",
        "124/5": "Amit Sharma", "124/6": "Kavita Sunil Deshmukh",
    },
    "tippans": set(),
    "area_unit": "guntha",
}

IRREGULAR = {
    "anchor": (76.63940, 12.29580),
    "village": "Hosahalli", "tehsil": "Mysuru", "district": "Mysuru",
    "state": "Karnataka", "lgd_village_code": "613204", "sheet": "27",
    "rings": {
        "201/1": [(0, 0), (120, 0), (130, 90), (0, 80)],
        "201/2": [(120, 0), (240, 10), (245, 95), (130, 90)],
        "201/3": [(240, 10), (340, 0), (350, 100), (245, 95)],
        "201/4": [(0, 80), (130, 90), (120, 190), (0, 175)],
        "201/5": [(130, 90), (245, 95), (250, 200), (120, 190)],
        "201/6": [(245, 95), (350, 100), (355, 205), (250, 200)],
        "201/7": [(0, 175), (120, 190), (115, 280), (0, 270)],
        "201/8": [(120, 190), (250, 200), (245, 300), (115, 280)],
    },
    "boundaries": {
        "201/1": {"east": "Survey No. 201/2", "north": "Survey No. 201/4",
                  "west": "Village road", "south": "Kaluva"},
        "201/2": {"east": "Survey No. 201/3", "west": "Survey No. 201/1",
                  "north": "Survey No. 201/5", "south": "Kaluva"},
        "201/3": {"west": "Survey No. 201/2", "north": "Survey No. 201/6",
                  "east": "Village road", "south": "Kaluva"},
        "201/4": {"east": "Survey No. 201/5", "south": "Survey No. 201/1",
                  "north": "Survey No. 201/7", "west": "Village road"},
        "201/5": {"east": "Survey No. 201/6", "west": "Survey No. 201/4",
                  "south": "Survey No. 201/2", "north": "Survey No. 201/8"},
        "201/6": {"west": "Survey No. 201/5", "south": "Survey No. 201/3",
                  "east": "Village road", "north": "Government land"},
        "201/7": {"east": "Survey No. 201/8", "south": "Survey No. 201/4",
                  "west": "Village road", "north": "Government land"},
        "201/8": {"west": "Survey No. 201/7", "south": "Survey No. 201/5",
                  "east": "Village road", "north": "Government land"},
    },
    "owners": {
        "201/1": "Basavaraj Shivappa Gowda", "201/2": "Lakshmi Devamma",
        "201/3": "Mahadeva Naik", "201/4": "Chennamma Rangappa",
        "201/5": "Siddaraju H M", "201/6": "Nanjundaswamy K",
        "201/7": "Puttaraju Bore Gowda", "201/8": "Savithramma Krishnappa",
    },
    # These two came off a tippan whose base line has no stated bearing, so
    # their orientation has to be solved during assembly.
    "tippans": {"201/5", "201/8"},
    "area_unit": "guntha",
}

VILLAGES = {"grid": GRID, "irregular": IRREGULAR}


def sample_documents(which: str = "grid") -> List[Dict[str, Any]]:
    spec = VILLAGES.get(which)
    if spec is None:
        raise KeyError(f"Unknown sample village {which!r}. "
                       f"Available: {sorted(VILLAGES)}")

    lon, lat = spec["anchor"]
    unit_m2 = sm.AREA_UNITS_M2[spec["area_unit"]]
    anchor_sn = next(iter(spec["rings"]))
    documents: List[Dict[str, Any]] = []

    for survey_no, ring in spec["rings"].items():
        doc: Dict[str, Any] = {
            "survey_no": survey_no,
            "village": spec["village"], "tehsil": spec["tehsil"],
            "district": spec["district"], "state": spec["state"],
            "lgd_village_code": spec["lgd_village_code"],
            "village_map_sheet_no": spec["sheet"],
            "document_id": f"DOC-{survey_no.replace('/', '-')}",
            "owner_name": spec["owners"][survey_no],
            "area_value": round(sm.ring_area_m2(ring) / unit_m2, 3),
            "area_unit": spec["area_unit"],
            "boundaries": spec["boundaries"][survey_no],
        }

        if survey_no == anchor_sn:
            # The one anchor: this parcel was resurveyed with GPS, so its
            # document carries coordinates. Everything else hangs off it.
            geo, _ = crs.local_frame_to_wgs84(ring, lon, lat, (0.0, 0.0))
            doc["document_type"] = "Resurvey record (DGPS) + 7/12 extract"
            doc["coordinates"] = {"points": [[round(x, 8), round(y, 8)] for x, y in geo],
                                  "crs": "WGS84", "order": "xy"}
        elif survey_no in spec["tippans"]:
            doc["document_type"] = "Tippan (chain and offset) + 7/12 extract"
            doc["chain_offset"] = _ladder_from_ring(ring)
        else:
            doc["document_type"] = "Field Measurement Book + 7/12 extract"
            doc["traverse"] = {"legs": _legs_from_ring(ring),
                               "distance_unit": "links",
                               "adjustment": "bowditch"}

        documents.append(doc)

    return documents
