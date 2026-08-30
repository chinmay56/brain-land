"""
Generates a realistic cadastral dataset for Village Hadapsar (Haveli, Pune).

Parcels are laid out on a local metric grid, then projected to WGS84 (EPSG:4326)
so the output is real geographic data that any GIS tool can read.

Deliberate defects are baked in so every spatial validation rule has something
to catch:
  - 124/2   : recorded area disagrees with mapped area (OCR digit error / encroachment)
  - 125/4/5 : two parcels physically overlap (double ownership claim)
  - 124/3 <-> 131/2 : a 20 m unclaimed strip between neighbours (sliver)
  - 98/B    : polygon lies outside the village boundary (wrong village code)
  - 131/2/A+B : subdivisions do not sum back to the parent parcel
  - 140/7   : polygon on the map with no textual record (unrecorded land)
  - 145/3   : textual record with no polygon (ghost entry / unmapped)
"""
import json
import math
from pathlib import Path

# Local grid origin, south-west corner of the village block
LAT0 = 18.50500
LON0 = 73.92100

M_PER_DEG_LAT = 110574.0
M_PER_DEG_LON = 111320.0 * math.cos(math.radians(LAT0))


def to_wgs84(x_m: float, y_m: float):
    """Local metric grid (metres east, metres north) -> [lon, lat]."""
    return [
        round(LON0 + x_m / M_PER_DEG_LON, 8),
        round(LAT0 + y_m / M_PER_DEG_LAT, 8),
    ]


def rect(x0, y0, x1, y1):
    """Axis-aligned rectangle as a closed GeoJSON ring."""
    return [[
        to_wgs84(x0, y0),
        to_wgs84(x1, y0),
        to_wgs84(x1, y1),
        to_wgs84(x0, y1),
        to_wgs84(x0, y0),
    ]]


def poly(coords_m):
    """Arbitrary polygon from a list of (x, y) metre pairs."""
    ring = [to_wgs84(x, y) for x, y in coords_m]
    ring.append(ring[0])
    return [ring]


# --------------------------------------------------------------------------
# Village administrative boundary: 700 m x 500 m = 35 ha
# --------------------------------------------------------------------------
VILLAGE = {
    "type": "Feature",
    "properties": {
        "village_name": "Hadapsar",
        "village_name_mr": "हडपसर",
        "lgd_village_code": "556489",
        "tehsil": "Haveli",
        "lgd_tehsil_code": "4184",
        "district": "Pune",
        "lgd_district_code": "521",
        "state": "Maharashtra",
        "lgd_state_code": "27",
        "cadastral_sheet": "14",
    },
    "geometry": {"type": "Polygon", "coordinates": rect(0, 0, 700, 500)},
}

# --------------------------------------------------------------------------
# Cadastral parcels
# --------------------------------------------------------------------------
PARCELS = [
    # ---- Northern block -------------------------------------------------
    dict(survey_no="124/1", geom=rect(20, 280, 180, 460),
         khasra="K-4820", land_class="Jirayat (Agricultural Dry)",
         note="clean"),
    dict(survey_no="124/2", geom=rect(180, 280, 340, 460),
         khasra="K-4821", land_class="Jirayat (Agricultural Dry)",
         note="area mismatch: register says 2.45 ha"),
    dict(survey_no="124/3", geom=rect(340, 280, 470, 460),
         khasra="K-4822", land_class="Jirayat (Agricultural Dry)",
         note="clean; 6 m digitising sliver to its east"),
    # 6 m unclaimed strip between x=470 and x=476  -> sliver
    dict(survey_no="131/2", geom=rect(476, 280, 660, 460),
         khasra="K-9012", land_class="Bagayat (Irrigated)",
         note="parent parcel of 131/2/A and 131/2/B"),

    # ---- Southern block -------------------------------------------------
    dict(survey_no="125/4", geom=rect(20, 60, 200, 240),
         khasra="K-7819", land_class="Bagayat (Irrigated)",
         note="overlaps 125/5 by 50 m; area mismatch"),
    dict(survey_no="125/5", geom=rect(150, 60, 330, 240),
         khasra="K-7820", land_class="Bagayat (Irrigated)",
         note="overlaps 125/4"),
    # separated from its neighbours by village roads (~60 m), not slivers
    dict(survey_no="128/1", geom=rect(390, 60, 485, 160),
         khasra="K-1102", land_class="Non-Agricultural (Commercial)",
         note="clean"),
    dict(survey_no="140/7", geom=rect(545, 60, 675, 200),
         khasra=None, land_class="Gairan (Village Common)",
         note="orphan parcel: on the map, no textual record"),

    # ---- Outside the village boundary -----------------------------------
    dict(survey_no="98/B", geom=rect(720, 100, 850, 250),
         khasra="K-0098", land_class="Jirayat (Agricultural Dry)",
         note="containment failure: falls outside Hadapsar boundary"),
]

# Subdivisions of 131/2 (parent spans x 476..660).
# Children cover only 476..606, leaving 54 m unaccounted -> sum check fails.
SUBDIVISIONS = [
    dict(survey_no="131/2/A", parent="131/2", geom=rect(476, 280, 556, 460),
         khasra="K-9012-A", land_class="Bagayat (Irrigated)"),
    dict(survey_no="131/2/B", parent="131/2", geom=rect(556, 280, 606, 460),
         khasra="K-9012-B", land_class="Bagayat (Irrigated)"),
]

# --------------------------------------------------------------------------
# Textual records — this is what the OCR / extraction stage would produce.
# Areas here are what is WRITTEN IN THE REGISTER, not what the map says.
# --------------------------------------------------------------------------
RECORDS = [
    dict(record_id="LR-2026-1020", survey_no="124/1", owner_name="Vikram Ananta Joshi",
         recorded_area_ha=2.88, area_unit="Hectares", khata="KH-1023",
         mutation_no="5810", extraction_confidence=0.96,
         document_type="7/12 Extract (Record of Rights)"),

    dict(record_id="LR-2026-1021", survey_no="124/2", owner_name="Ramesh Baliram Patil",
         recorded_area_ha=2.45, area_unit="Hectares", khata="KH-1024",
         mutation_no="58?1", extraction_confidence=0.71,
         document_type="7/12 Extract (Record of Rights)"),

    dict(record_id="LR-2026-1024", survey_no="124/3", owner_name="Sunita Devi Deshmukh",
         recorded_area_ha=2.34, area_unit="Hectares", khata="KH-1025",
         mutation_no="5812", extraction_confidence=0.94,
         document_type="7/12 Extract (Record of Rights)"),

    dict(record_id="LR-2026-1019", survey_no="131/2", owner_name="Sunita Devi Deshmukh",
         recorded_area_ha=3.12, area_unit="Hectares", khata="KH-3140",
         mutation_no="5820", extraction_confidence=0.98,
         document_type="Partition Deed (Hissa Register)"),

    dict(record_id="LR-2026-1025", survey_no="131/2/A", owner_name="Anil Sunil Deshmukh",
         recorded_area_ha=1.44, area_unit="Hectares", khata="KH-3141",
         mutation_no="5821", extraction_confidence=0.93,
         document_type="Partition Deed (Hissa Register)"),

    dict(record_id="LR-2026-1026", survey_no="131/2/B", owner_name="Kavita Sunil Deshmukh",
         recorded_area_ha=0.90, area_unit="Hectares", khata="KH-3142",
         mutation_no="5822", extraction_confidence=0.91,
         document_type="Partition Deed (Hissa Register)"),

    dict(record_id="LR-2026-1022", survey_no="125/4", owner_name="Suresh Chandra Kumar",
         recorded_area_ha=1.80, area_unit="Hectares", khata="KH-2091",
         mutation_no="9420", extraction_confidence=0.58,
         document_type="Sale Deed & Mutation Register"),

    dict(record_id="LR-2026-1027", survey_no="125/5", owner_name="Ganesh Maruti Shinde",
         recorded_area_ha=3.24, area_unit="Hectares", khata="KH-2092",
         mutation_no="9421", extraction_confidence=0.89,
         document_type="Sale Deed & Mutation Register"),

    dict(record_id="LR-2026-1023", survey_no="128/1", owner_name="Amit Sharma",
         recorded_area_ha=0.95, area_unit="Hectares", khata="KH-0492",
         mutation_no="1042", extraction_confidence=0.96,
         document_type="Khatoni & Khasra Extract"),

    dict(record_id="LR-2026-1018", survey_no="98/B", owner_name="Ganpat Rao Shinde",
         recorded_area_ha=1.95, area_unit="Hectares", khata="KH-0098",
         mutation_no="0871", extraction_confidence=0.42,
         document_type="Legacy Handwritten Patta"),

    # No polygon exists for this one -> orphan record
    dict(record_id="LR-2026-1028", survey_no="145/3", owner_name="Baburao Tukaram Kale",
         recorded_area_ha=1.55, area_unit="Hectares", khata="KH-4501",
         mutation_no="6630", extraction_confidence=0.88,
         document_type="Legacy Handwritten Patta"),
]


def build():
    features = []
    for p in PARCELS + SUBDIVISIONS:
        props = {
            "survey_no": p["survey_no"],
            "khasra_no": p.get("khasra"),
            "land_classification": p.get("land_class"),
            "parent_survey_no": p.get("parent"),
            "lgd_village_code": "556489",
            "village": "Hadapsar",
            "tehsil": "Haveli",
            "district": "Pune",
            "state": "Maharashtra",
            "source": "Cadastral sheet 14, georeferenced 2026-08",
            "_note": p.get("note", ""),
        }
        features.append({
            "type": "Feature",
            "properties": props,
            "geometry": {"type": "Polygon", "coordinates": p["geom"]},
        })

    parcels_fc = {
        "type": "FeatureCollection",
        "name": "hadapsar_cadastral_parcels",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": features,
    }

    village_fc = {
        "type": "FeatureCollection",
        "name": "hadapsar_village_boundary",
        "crs": {"type": "name", "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
        "features": [VILLAGE],
    }

    out = Path(__file__).resolve().parent.parent / "app" / "data"
    out.mkdir(parents=True, exist_ok=True)

    (out / "hadapsar_cadastral.geojson").write_text(
        json.dumps(parcels_fc, indent=2, ensure_ascii=False), encoding="utf-8")
    (out / "hadapsar_village.geojson").write_text(
        json.dumps(village_fc, indent=2, ensure_ascii=False), encoding="utf-8")
    (out / "hadapsar_records.json").write_text(
        json.dumps({
            "village": "Hadapsar",
            "lgd_village_code": "556489",
            "source": "Extraction output (stands in for the OCR stage)",
            "records": RECORDS,
        }, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"parcels : {len(features)}")
    print(f"records : {len(RECORDS)}")
    print(f"written : {out}")


if __name__ == "__main__":
    build()
