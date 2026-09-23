"""
GIS API — plotting land parcels from the land records themselves.

There is no external cadastral layer behind this. Every polygon it returns was
derived from measurements written on a document: a traverse of bearings and
distances, a tippan's chain-and-offset ladder, coordinates from a resurvey, or
the four-boundaries column solved across a whole village.

Upload documents, get geometry.
"""
from __future__ import annotations

import json
from typing import Any, Dict, List, Literal, Optional

from fastapi import APIRouter, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel, Field

from app.services import crs_india as crs
from app.services import survey_math as sm
from app.services import document_geometry as dg
from app.services.document_geometry import (
    ChainOffsetSource, ControlPoint, CoordinateSource, LandDocument,
    TraverseSource, build_geometry,
)
from app.services.village_assembler import assemble_village, build_adjacency

router = APIRouter(prefix="/gis", tags=["GIS & Cadastral Mapping"])


# ===========================================================================
# Request models — the shape the extraction stage should output
# ===========================================================================
class CoordinatesIn(BaseModel):
    points: List[List[float]] = Field(..., min_length=3,
                                      description="Boundary vertices, in order.")
    crs: str = Field("WGS84", description="'WGS84', 'UTM 43N', 'EPSG:32643', or a "
                                          "full India zone name.")
    order: Literal["xy", "yx"] = Field("xy", description="'yx' if written lat,long.")


class TraverseLegIn(BaseModel):
    bearing: str = Field(..., description="Whole circle (125-30-00) or quadrantal "
                                          "(N45-30-00-E).")
    distance: float = Field(..., gt=0)
    unit: Optional[str] = Field(None, description="links, chains, m, ft, karam…")
    from_station: Optional[str] = None
    to_station: Optional[str] = None


class TraverseIn(BaseModel):
    legs: List[TraverseLegIn] = Field(..., min_length=3)
    distance_unit: str = "m"
    magnetic_declination_deg: Optional[float] = Field(
        None, description="Only if the field book recorded magnetic bearings.")
    adjustment: Literal["bowditch", "transit", "none"] = "bowditch"


class OffsetIn(BaseModel):
    chainage: float = Field(
        ..., description="Distance along the base line from its starting station. "
                         "May be negative: a boundary point can sit behind the "
                         "start of the base line, and tippans record that.")
    offset: float = Field(..., ge=0, description="Perpendicular distance; `side` "
                                                 "carries the direction.")
    side: Literal["L", "R", "l", "r"] = "L"
    label: Optional[str] = None
    seq: Optional[int] = None
    unit: Optional[str] = None


class ChainOffsetIn(BaseModel):
    base_length: float = Field(..., gt=0)
    offsets: List[OffsetIn] = Field(..., min_length=1)
    unit: str = "links"
    base_bearing: Optional[float] = Field(
        None, description="True bearing of the base line, if the sketch states one.")


class ControlPointIn(BaseModel):
    local: Optional[List[float]] = Field(None, description="[x, y] in the document frame.")
    lon: Optional[float] = None
    lat: Optional[float] = None
    label: Optional[str] = None


class DocumentIn(BaseModel):
    """One extracted land document. This is the contract the OCR stage targets."""
    survey_no: str = Field(..., examples=["124/2"])
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

    area_value: Optional[float] = Field(None, gt=0)
    area_unit: Optional[str] = Field(None, examples=["guntha", "acre", "hectare",
                                                     "bigha", "kanal"])

    coordinates: Optional[CoordinatesIn] = None
    traverse: Optional[TraverseIn] = None
    chain_offset: Optional[ChainOffsetIn] = None
    boundaries: Dict[str, str] = Field(
        default_factory=dict,
        description="north / south / east / west -> adjoining survey number, "
                    "or a road, nala or village name.")
    control_points: List[ControlPointIn] = Field(default_factory=list)
    village_map_sheet_no: Optional[str] = None

    def to_domain(self) -> LandDocument:
        return LandDocument(
            survey_no=self.survey_no, village=self.village, state=self.state,
            district=self.district, tehsil=self.tehsil,
            lgd_village_code=self.lgd_village_code,
            document_id=self.document_id, document_type=self.document_type,
            parent_survey_no=self.parent_survey_no, khasra_no=self.khasra_no,
            khata_no=self.khata_no, owner_name=self.owner_name,
            area_value=self.area_value, area_unit=self.area_unit,
            coordinates=(
                CoordinateSource(points=[(p[0], p[1]) for p in self.coordinates.points],
                                 crs=self.coordinates.crs, order=self.coordinates.order)
                if self.coordinates else None),
            traverse=(
                TraverseSource(
                    legs=[{"bearing": l.bearing, "distance": l.distance,
                           "unit": l.unit, "from": l.from_station, "to": l.to_station}
                          for l in self.traverse.legs],
                    distance_unit=self.traverse.distance_unit,
                    magnetic_declination_deg=self.traverse.magnetic_declination_deg,
                    adjustment=self.traverse.adjustment)
                if self.traverse else None),
            chain_offset=(
                ChainOffsetSource(
                    base_length=self.chain_offset.base_length,
                    offsets=[o.model_dump() for o in self.chain_offset.offsets],
                    unit=self.chain_offset.unit,
                    base_bearing=self.chain_offset.base_bearing)
                if self.chain_offset else None),
            boundaries=self.boundaries,
            control_points=[
                ControlPoint(local=(c.local[0], c.local[1]) if c.local else None,
                             lon=c.lon, lat=c.lat, label=c.label or "")
                for c in self.control_points],
            village_map_sheet_no=self.village_map_sheet_no,
        )


class PlotRequest(BaseModel):
    documents: List[DocumentIn] = Field(..., min_length=1)
    assemble: bool = Field(True, description="Solve the adjacency network so parcels "
                                             "with no coordinates of their own can be "
                                             "placed off their neighbours.")
    area_tolerance_pct: float = Field(2.0, gt=0, le=50)


# ===========================================================================
# Reference endpoints
# ===========================================================================
@router.get("/requirements", summary="What a document must contain to be plottable")
async def requirements() -> Dict[str, Any]:
    """
    The field spec for the extraction stage.

    A textual RoR — a 7/12 extract, a jamabandi row, a khatauni entry — contains
    no coordinates and cannot be plotted on its own. This lists, per source, what
    has to come off the page for geometry to be recoverable.
    """
    return DOCUMENT_REQUIREMENTS_RESPONSE


DOCUMENT_REQUIREMENTS_RESPONSE = {
    **dg.DOCUMENT_REQUIREMENTS,
    "accuracy_classes": [
        {"class": k, "meaning": v} for k, v in dg.ACCURACY_NOTES.items()
    ],
    "supported_linear_units": sorted(set(sm.LINEAR_UNITS_M)),
    "supported_area_units": sorted(set(sm.AREA_UNITS_M2)),
    "regional_area_units": {
        unit: {state: {"m2": u.m2, "basis": u.basis, "confidence": u.confidence}
               for state, u in table.items()}
        for unit, table in sm.REGIONAL_UNITS.items()
    },
}


@router.get("/crs", summary="Coordinate systems supported across India")
async def list_crs() -> Dict[str, Any]:
    return {
        "storage_crs": {"epsg": crs.CRS_WGS84, "note": "GeoJSON is defined on WGS84."},
        "national_projected": crs.describe(crs.CRS_INDIA_NSF),
        "utm_zones_covering_india": [
            {"zone": z, "epsg": e, "name": crs.describe(e)["name"]}
            for z, e in sorted(crs.UTM_ZONES_INDIA.items())
        ],
        "legacy_india_zones": [
            {"epsg": z.epsg, "name": z.name, "datum": z.datum, "zone": z.zone,
             "standard_parallel": z.lat_origin, "central_meridian": z.lon_origin,
             "bounds_wsen": list(z.bounds)}
            for z in crs.INDIA_ZONES
        ],
        "note": ("Legacy cadastral sheets are on Everest/Kalianpur datums, not WGS84. "
                 "Reading their eastings and northings as WGS84 misplaces a parcel by "
                 "hundreds of kilometres. The datum shift is always applied."),
    }


@router.get("/crs/suggest", summary="Which CRS to use at a given location")
async def suggest_crs(lon: float = Query(..., ge=-180, le=180),
                      lat: float = Query(..., ge=-90, le=90),
                      datum: str = "Kalianpur 1975") -> Dict[str, Any]:
    zone = crs.suggest_legacy_zone(lon, lat, datum)
    return {
        "lon": lon, "lat": lat,
        "in_india": crs.in_india(lon, lat),
        "validation": crs.validate_lonlat(lon, lat),
        "metric_crs": crs.describe(crs.pick_metric_crs(lon, lat)),
        "utm_zone": crs.utm_zone_for_longitude(lon),
        "likely_legacy_zone": (
            {"epsg": zone.epsg, "name": zone.name, "datum": zone.datum,
             "zone": zone.zone} if zone else None),
    }


@router.post("/units/convert", summary="Convert an area or length to SI")
async def convert_units(value: float, unit: str,
                        kind: Literal["area", "length"] = "area",
                        state: Optional[str] = None) -> Dict[str, Any]:
    try:
        if kind == "length":
            return {"value": value, "unit": unit, "metres": sm.convert_length(value, unit)}
        return {"value": value, "unit": unit, "state": state,
                "square_metres": sm.convert_area(value, unit, state),
                "hectares": sm.convert_area(value, unit, state) / 10_000,
                "caution": sm.area_unit_note(unit, state)}
    except sm.UnitError as exc:
        raise HTTPException(422, str(exc))


# ===========================================================================
# The main path: documents in, geometry out
# ===========================================================================
def _run(documents: List[DocumentIn], assemble: bool,
         tolerance: float) -> Dict[str, Any]:
    domain = [d.to_domain() for d in documents]
    results = [build_geometry(d, area_tolerance_pct=tolerance) for d in domain]

    by_sn = {d.survey_no: d for d in domain}
    village = next((d.village for d in domain if d.village), "")

    report = None
    if assemble and len(results) > 1:
        report = assemble_village(results, village=village)
    else:
        graph = build_adjacency(results)

    features = []
    for r in results:
        if not r.ring_wgs84:
            continue
        d = by_sn[r.survey_no]
        features.append({
            "type": "Feature",
            "geometry": {"type": "Polygon",
                         "coordinates": [[list(p) for p in _closed(r.ring_wgs84)]]},
            "properties": {
                "survey_no": r.survey_no,
                "owner_name": d.owner_name,
                "khasra_no": d.khasra_no, "khata_no": d.khata_no,
                "village": d.village, "tehsil": d.tehsil,
                "district": d.district, "state": d.state,
                "lgd_village_code": d.lgd_village_code,
                "document_id": d.document_id, "document_type": d.document_type,
                "method": r.method,
                "accuracy_class": r.accuracy_class,
                "accuracy_note": r.accuracy_note,
                "declared_area_m2": r.declared_area_m2,
                "computed_area_m2": r.computed_area_m2,
                "declared_area_ha": (round(r.declared_area_m2 / 10_000, 4)
                                     if r.declared_area_m2 else None),
                "computed_area_ha": (round(r.computed_area_m2 / 10_000, 4)
                                     if r.computed_area_m2 else None),
                "area_delta_pct": (r.area_check or {}).get("delta_pct"),
                "area_within_tolerance": (r.area_check or {}).get("within_tolerance"),
                "closure_precision": (r.closure or {}).get("precision_text"),
                "closure_grade": (r.closure or {}).get("grade"),
                "position_uncertainty_m": r.provenance.get("position_uncertainty_m"),
                "fit_quality": r.provenance.get("fit_quality"),
                "boundaries": r.boundaries,
                "provenance": r.provenance,
                "flag_count": len(r.flags),
                "worst_severity": _worst([f.severity for f in r.flags]),
            },
        })

    unplaced = [
        {"survey_no": r.survey_no, "method": r.method,
         "accuracy_class": r.accuracy_class,
         "computed_area_m2": r.computed_area_m2,
         "reason": ("shape reconstructed but nothing anchors it"
                    if r.ring_local else "no geometry could be derived"),
         "flags": [vars(f) for f in r.flags]}
        for r in results if not r.ring_wgs84
    ]

    all_flags = [
        {**vars(f), "survey_no": r.survey_no}
        for r in results for f in r.flags
    ]
    if report:
        all_flags += report.flags

    return {
        "village": village,
        "documents_received": len(documents),
        "parcels": {
            "type": "FeatureCollection",
            "name": "parcels_derived_from_documents",
            "crs": {"type": "name",
                    "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}},
            "features": features,
        },
        "unplaced": unplaced,
        "assembly": (
            {"anchored": report.anchored, "inferred": report.inferred,
             "unplaceable": report.unplaceable, "passes": report.passes,
             "graph": report.graph, "stats": report.stats}
            if report else None
        ),
        "flags": sorted(all_flags,
                        key=lambda f: -_SEV.get(f.get("severity", "INFO"), 0)),
        "summary": {
            "plotted": len(features),
            "unplaced": len(unplaced),
            "by_accuracy": _count([r.accuracy_class for r in results]),
            "by_method": _count([r.method for r in results]),
            "critical_flags": sum(1 for f in all_flags
                                  if f.get("severity") == "CRITICAL"),
            "conflict_flags": sum(1 for f in all_flags
                                  if f.get("severity") == "CONFLICT"),
        },
    }


_SEV = {"INFO": 0, "WARNING": 1, "CONFLICT": 2, "CRITICAL": 3}


def _worst(severities: List[str]) -> str:
    return max(severities, key=lambda s: _SEV.get(s, 0)) if severities else "INFO"


def _count(values: List[str]) -> Dict[str, int]:
    out: Dict[str, int] = {}
    for v in values:
        out[v] = out.get(v, 0) + 1
    return out


def _closed(ring):
    r = [tuple(p) for p in ring]
    if r and r[0] != r[-1]:
        r.append(r[0])
    return r


@router.post("/plot", summary="Plot parcels from extracted land documents")
async def plot(request: PlotRequest) -> Dict[str, Any]:
    """
    The main entry point. Give it extracted documents, get GeoJSON back.

    Each document is reduced to geometry by the best source it carries, then —
    if more than one is supplied — the adjacency network is solved so parcels
    with no coordinates of their own are placed off their neighbours.

    One anchored parcel is enough to place a whole village.
    """
    try:
        return _run(request.documents, request.assemble, request.area_tolerance_pct)
    except (sm.UnitError, crs.CRSError) as exc:
        raise HTTPException(422, str(exc))


@router.post("/upload", summary="Upload a documents JSON file and plot it")
async def upload(
    file: UploadFile = File(..., description="JSON: a list of documents, or "
                                             '{"documents": [...]}'),
    assemble: bool = Query(True),
    area_tolerance_pct: float = Query(2.0, gt=0, le=50),
) -> Dict[str, Any]:
    """
    File-upload flavour, so the front end can offer a drop zone while the OCR
    stage is still being built. Drop in the extraction output and the parcels
    plot immediately.
    """
    raw = await file.read()
    try:
        parsed = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise HTTPException(400, f"{file.filename} is not valid JSON: {exc}")

    payload = parsed.get("documents") if isinstance(parsed, dict) else parsed
    if isinstance(parsed, dict) and payload is None:
        payload = [parsed]                       # a single document object
    if not isinstance(payload, list) or not payload:
        raise HTTPException(
            400, 'Expected a JSON list of documents, or {"documents": [...]}.')

    try:
        documents = [DocumentIn(**d) for d in payload]
    except Exception as exc:
        raise HTTPException(
            422, f"Document failed validation: {exc}. "
                 f"GET /api/gis/requirements lists the expected fields.")

    try:
        result = _run(documents, assemble, area_tolerance_pct)
    except (sm.UnitError, crs.CRSError) as exc:
        raise HTTPException(422, str(exc))
    result["source_file"] = file.filename
    return result


@router.post("/parcel", summary="Geometry for one document, in full detail")
async def one_parcel(document: DocumentIn,
                     area_tolerance_pct: float = Query(2.0, gt=0, le=50)
                     ) -> Dict[str, Any]:
    """Everything the engine derived from a single document, including the local
    ring, the closure report and every flag — useful for debugging an extraction."""
    try:
        result = build_geometry(document.to_domain(), area_tolerance_pct)
    except (sm.UnitError, crs.CRSError) as exc:
        raise HTTPException(422, str(exc))
    return result.to_dict()


@router.get("/suggest-location", summary="Best-effort map starting point for a village name")
async def suggest_location(
    village: str = Query(..., description="Village name as extracted from the document."),
    tehsil: str = Query("", description="Tehsil / taluka, improves match accuracy."),
    district: str = Query("", description="District, improves match accuracy."),
    state: str = Query("Maharashtra"),
) -> Dict[str, Any]:
    """
    Geocodes a village name via OpenStreetMap Nominatim, purely so the map can
    open zoomed to roughly the right place instead of a blank view of India.

    This is NOT a cadastral centroid and is never fed into the geometry
    pipeline — `found: false` is a completely normal answer (an unmatched or
    misspelt village name, or no network) and the officer traces or pins the
    parcel exactly as before. See village_locator.py for why this exists
    separately from the surveyed/reconstructed geometry in document_geometry.py.
    """
    from app.services.village_locator import suggest_location as geocode

    hit = await geocode(village, tehsil, district, state)
    if hit is None:
        return {"found": False}
    return {"found": True, **hit}


@router.post("/sample", summary="A worked example you can plot immediately")
async def sample(village: Literal["grid", "irregular"] = "grid") -> Dict[str, Any]:
    """
    Returns a ready-made set of documents in the exact input format, so the
    upload path can be exercised before any OCR exists. Save the response and
    POST it back to /upload.
    """
    from app.services.sample_documents import sample_documents
    return {"documents": sample_documents(village)}


# ===========================================================================
# The live path: a scanned document in, a plotted parcel out
# ===========================================================================
@router.post("/plot-document", summary="Upload a scanned land record — OCR it and plot it")
async def plot_document(
    file: UploadFile = File(..., description="Scanned land record: PDF, PNG or JPEG."),
    state: Optional[str] = Query(
        None, description="Fallback state if the document does not name one. "
                          "Needed to convert regional units such as bigha."),
    trace: Optional[str] = Form(
        None, description='Officer-traced corners as JSON: [[lon,lat],[lon,lat],…]. '
                          'Supply on the second call, after the officer has drawn '
                          'the parcel on imagery.'),
    pin: Optional[str] = Form(
        None, description='A single officer-placed anchor point as JSON [lon,lat]. '
                          'Use when the officer can point at roughly where the parcel '
                          'is but cannot yet trace its full boundary. If the document '
                          'also carries a reconstructed shape (traverse or chain-offset), '
                          'this one point is enough to place that shape on the ground '
                          '(rotation is then assumed true north). If the document has '
                          'no shape at all, the pin is returned as `officer_pin` so it '
                          'can still be shown on the map as an approximate location. '
                          'Ignored if `trace` is also supplied.'),
    area_tolerance_pct: float = Query(2.0, gt=0, le=50),
) -> Dict[str, Any]:
    """
    The end-to-end path. Runs the real extraction stage on an uploaded scan,
    adapts its output to the geometry contract, and plots whatever the document
    supports.

    A 7/12, jamabandi or sale deed carries no geometry, so the first call comes
    back with the fields extracted and `needs_position` set — that is correct,
    not a failure. Call again with `trace` once the officer has marked the parcel
    corners on imagery, and the parcel plots with its declared area cross-checking
    the trace. If a full trace is not available yet, `pin` accepts a single
    officer-placed point instead — enough to anchor a reconstructed shape, or to
    at least mark the approximate location on the map.

    The response always reports `data_source`, so a demo can never silently show
    fixture data as though it were a live extraction.
    """
    from app.services.record_to_document import record_to_document
    from app.services.sarvam_vision import sarvam_service

    raw = await file.read()
    if not raw:
        raise HTTPException(400, "Uploaded file is empty.")

    from app.services.sarvam_vision import ExtractionError

    try:
        extracted = await sarvam_service.extract_land_record(raw, file.filename or "record.pdf")
    except ExtractionError as exc:
        raise HTTPException(502, {
            "success": False,
            "error": "EXTRACTION_FAILED",
            "reason": exc.reason,
            "retryable": exc.retryable,
            "http_status": exc.http_status,
        })
    except Exception as exc:                                  # pragma: no cover
        raise HTTPException(502, {
            "success": False,
            "error": "EXTRACTION_FAILED",
            "reason": f"Extraction stage failed: {type(exc).__name__}: {exc}",
            "retryable": True,
            "http_status": None,
        })

    data_source = extracted.get("data_source", "UNKNOWN")

    document, notes = record_to_document(
        extracted,
        fallback_state=state,
        document_id=file.filename or "",
        document_type=str(extracted.get("document_type") or ""),
    )

    # An officer-drawn polygon becomes an ordinary coordinates source.
    traced_points: Optional[List[List[float]]] = None
    if trace:
        try:
            traced_points = json.loads(trace)
        except json.JSONDecodeError as exc:
            raise HTTPException(400, f"`trace` is not valid JSON: {exc}")
        if not isinstance(traced_points, list) or len(traced_points) < 3:
            raise HTTPException(400, "A traced parcel needs at least 3 corners.")
        document["coordinates"] = {"points": traced_points, "crs": "WGS84", "order": "xy"}

    # A single officer-placed pin. Only used when there is no full trace: a
    # trace is a real boundary and always wins over one approximate point.
    pin_point: Optional[List[float]] = None
    if pin and not traced_points:
        try:
            pin_point = json.loads(pin)
        except json.JSONDecodeError as exc:
            raise HTTPException(400, f"`pin` is not valid JSON: {exc}")
        if not isinstance(pin_point, list) or len(pin_point) != 2:
            raise HTTPException(400, "`pin` must be [lon, lat].")
        lon, lat = float(pin_point[0]), float(pin_point[1])
        problems = crs.validate_lonlat(lon, lat)
        if problems:
            raise HTTPException(400, "; ".join(problems))
        # local=[0,0]: with no shape reconstructed yet the local frame is
        # arbitrary, so the origin is as good a place as any to hang the pin.
        # Once a traverse/chain-offset shape exists, _place() uses this single
        # control point to fix its position (rotation assumed true north).
        document["control_points"] = [
            {"lon": lon, "lat": lat, "local": [0.0, 0.0], "label": "officer-pin"}
        ]

    try:
        doc_in = DocumentIn(**document)
    except Exception as exc:
        raise HTTPException(
            422,
            f"Extracted fields did not satisfy the geometry contract: {exc}. "
            f"See GET /api/gis/requirements.",
        )

    try:
        result = _run([doc_in], assemble=False, tolerance=area_tolerance_pct)
    except (sm.UnitError, crs.CRSError) as exc:
        raise HTTPException(422, str(exc))

    result["source_file"] = file.filename
    result["data_source"] = data_source
    result["data_source_note"] = (
        "Live extraction from the document." if data_source == "SARVAM_LIVE"
        else "NOT a live extraction — the extraction stage returned built-in "
             "fixture data because no working API key was configured. Nothing on "
             "screen came from the uploaded file."
    )
    result["extraction"] = {
        "fields": {
            key: {"value": _plain(value), "confidence": _conf(value)}
            for key, value in extracted.items()
            # Geometry is nested structure, not a text field — stringifying it
            # into the fields panel would print a dict at the officer.
            if key not in ("overall_confidence", "document_pages", "data_source",
                           "co_owners", "boundaries", "chain_offset", "traverse")
        },
        "co_owners": extracted.get("co_owners") or [],
        "boundaries": document.get("boundaries", {}),
        "geometry_source": _geometry_summary(extracted),
        "overall_confidence": extracted.get("overall_confidence"),
        "pages": extracted.get("document_pages"),
    }
    result["adapter_notes"] = notes
    result["needs_position"] = result["summary"]["plotted"] == 0

    # A tippan that only lacks an anchor is a completely different situation
    # from a 7/12 that has no measurements at all, and the officer is asked to
    # do a different thing in each case: one pin places an exact boundary,
    # whereas a shapeless record needs its corners traced by hand.
    has_shape = any(u.get("accuracy_class") == "reconstructed_floating"
                    for u in result["unplaced"])
    result["has_reconstructed_shape"] = has_shape

    if result["summary"]["plotted"]:
        result["next_step"] = None
    elif has_shape:
        result["next_step"] = (
            "The measurements on this document give its exact shape and area — only "
            "its position on the ground is missing. Drop a single pin on the parcel "
            "and the boundary will be placed there."
        )
    elif pin_point:
        # The pin didn't anchor anything because there was no reconstructed
        # shape to place — most 7/12s. Hand it back anyway so the map can show
        # where the officer says the parcel is, honestly labelled as a pin and
        # not a surveyed boundary.
        result["officer_pin"] = {"lon": pin_point[0], "lat": pin_point[1]}
        result["next_step"] = (
            "This document carries no reconstructable shape (no traverse or "
            "chain-offset ladder), so the pin is shown as an approximate location "
            "only. Trace the parcel corners on imagery for a real boundary."
        )
    else:
        result["next_step"] = (
            "This document type carries no geometry. Ask the officer to trace the "
            "parcel corners on imagery, or drop a single pin for an approximate "
            "position, then POST again with `trace` or `pin`."
        )
    return result


def _geometry_summary(extracted: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    """
    What measurements, if any, the extraction found — so the officer can see at
    a glance whether this document carried a real boundary or only text.
    """
    ladder = extracted.get("chain_offset")
    if isinstance(ladder, dict):
        return {
            "kind": "chain_offset",
            "label": "Tippan ladder (chain & offset)",
            "detail": (f"{len(ladder.get('offsets') or [])} offsets along a "
                       f"{ladder.get('base_length')} {ladder.get('unit', 'links')} base line"
                       + ("" if ladder.get("base_bearing") is None
                          else f", bearing {ladder['base_bearing']}°")),
        }
    traverse = extracted.get("traverse")
    if isinstance(traverse, dict):
        return {
            "kind": "traverse",
            "label": "Traverse (bearings & distances)",
            "detail": (f"{len(traverse.get('legs') or [])} legs in "
                       f"{traverse.get('distance_unit', 'm')}"),
        }
    return None


def _plain(field: Any) -> Optional[str]:
    """Unwrap a FieldConfidence (object or dict) to its plain value."""
    if field is None or isinstance(field, (str, int, float)):
        return str(field) if field is not None else None
    value = getattr(field, "value", None)
    if value is None and isinstance(field, dict):
        value = field.get("value")
    return str(value) if value is not None else None


def _conf(field: Any) -> Optional[float]:
    if field is None or isinstance(field, (str, int, float)):
        return None
    conf = getattr(field, "confidence", None)
    if conf is None and isinstance(field, dict):
        conf = field.get("confidence")
    return float(conf) if conf is not None else None
