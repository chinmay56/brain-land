# Plotting land parcels from the documents themselves

No cadastral shapefile. No external GIS layer. Every polygon this produces is
computed from measurements written on a land record.

Open **`document_to_gis_demo.html`** to see it working — Leaflet is inlined, no
backend, no `npm install`.

---

## 1. The thing you have to know first

**A 7/12 extract cannot be plotted.** Neither can a jamabandi row, a khatauni
entry or a khata. They contain owner, survey number, area and land class — and
no coordinates whatsoever. No amount of OCR changes that.

Geometry lives in a *different document*: the **tippan** (Maharashtra, Karnataka)
or **Field Measurement Book / FMB** (Tamil Nadu, Telangana, Andhra), which is the
surveyor's field record for that same survey number. That is the document your
extraction stage has to target if anything is to appear on a map.

So the pipeline is not "OCR the RoR → plot it". It is:

```
7/12 / jamabandi  ──►  owner, area, four boundaries        ─┐
                                                            ├──►  parcel polygon
tippan / FMB      ──►  bearings, distances, offsets        ─┘
```

---

## 2. What must be extracted, exactly

### Always, from every document

| Field | Why |
|---|---|
| `survey_no` | The join key between the RoR and the tippan, and between neighbours |
| `village`, `tehsil`, `district`, `state` | Identity; the state also decides regional unit values |
| `area_value` + `area_unit` | The independent check on every reconstruction |
| `boundaries` (north/south/east/west) | The adjacency network — see §4 |

### Then whichever of these four the document carries

| Tier | Source | Extract | Gives you |
|---|---|---|---|
| **A** | **Coordinates** — resurvey/DGPS records, SVAMITVA cards, modern FMB | `points[]` + **which CRS** | Exact position, shape, area |
| **B** | **Traverse** — FMB, tippan, deed schedules | per leg: `bearing`, `distance`, `unit` | Exact shape and area, **plus a closure check**. Position needs an anchor |
| **C** | **Chain & offset** — the tippan "ladder", commonest thing in an old record | `base_length`, then per corner `chainage`, `offset`, `side` | Exact shape and area. No position, no orientation |
| **D** | **Four boundaries** — effectively every Indian land record | adjoining survey numbers | Nothing alone. Across a village, positions everything |

Worth capturing when present: `control_points` (any corner whose real position is
known — a trijunction pillar, or two corners an officer clicks on satellite
imagery), `parent_survey_no`, `village_map_sheet_no`, `survey_date` (needed to
apply the right magnetic declination to old compass bearings).

Full machine-readable spec: `GET /api/gis/requirements`.

---

## 3. Why the CRS field is not optional

Legacy Indian cadastral sheets are **not** on WGS84. They are on Everest 1830 /
Kalianpur, in the Survey of India's India zones — Lambert Conformal Conic bands
with standard parallels at 39°30′, 32°30′, 26°, 19° and 12° N.

Reading a Kalianpur easting/northing as if it were WGS84 puts a Pune parcel
**195 km** from where it is. The engine handles all 14 India zones EPSG publishes,
all six UTM zones covering India (42N–47N), and EPSG:7755 (WGS 84 / India NSF LCC)
for national work. Round-trip fidelity is sub-millimetre.

It picks the correct UTM zone per parcel from its own longitude, and can infer
which legacy India zone an undated sheet most likely used from where the land is.
It **refuses** an ambiguous CRS name rather than guessing: "India zone IIIa" exists
on both Kalianpur 1880 and 1975, and they are hundreds of metres apart.

---

## 4. How a village assembles itself

This is the part that makes "documents only" work.

- A tippan gives an exact **shape** but no position.
- A 7/12 gives an exact **area** and the four boundaries, but no shape.
- Neither is plottable alone.

Together, across a village, they are a constraint network. Every parcel's shape
comes from its own measurements; its position comes from who it touches. **One
anchored parcel places all of them.**

That anchor can be a single trijunction pillar, one modern record that already
carries coordinates, or an officer clicking two corners on satellite imagery.

The solver grows the mosaic outward from the anchor, then re-fits every parcel
against *all* its neighbours once they are placed — because a parcel fitted
against one neighbour can still slide along their shared edge.

### Measured accuracy

Tested against ground truth: a village is built, turned into documents, every
position but one thrown away, then reassembled and compared.

| Case | Placed | Worst centroid error |
|---|---|---|
| Regular grid, 6 parcels, 1 anchor | 6/6 | **0.025 m** |
| Irregular quadrilaterals, 8 parcels (2 rotation-unknown tippans), 1 anchor | 8/8 | **~16 m** |

Run it yourself: `python tests/test_assembly_truth.py`

That gap is real and it is inherent. When parcels tile regularly the network is
over-determined and the fit is centimetre-exact. Irregular parcels leave genuine
slack — several placements satisfy "touches on the right side" almost equally
well. **Shape and area stay exact in both cases; only position degrades.**

Every inferred parcel therefore carries a `position_uncertainty_m`, propagated
along the inference chain the way error accumulates in any survey network, and
deliberately conservative (validated so it over- rather than under-reports). The
map draws it as a circle to scale. An error bar that is confidently too small is
worse than none.

---

## 5. Checks the text pipeline cannot do

| Check | Catches |
|---|---|
| **Traverse misclosure** | A dropped digit. Changing one leg from 500 to 560 links turns a 1:∞ closure into 1:26, graded *failed* — instantly, before anything is plotted |
| **Area reconciliation** | The register and the measurements are two independent statements about one parcel. Disagreement means one is wrong |
| **Scale factor on fit** | Fitting to control points needing scale 2.67 means links were read as metres |
| **Mosaic overlap** | Two parcels assembled onto the same ground |
| **Regional unit refusal** | See below |

### The bigha refusal

`bigha` and `katha` have no single value. Published sources disagree even within
one state — the UP bigha is quoted as both 27,225 and 27,900 sq ft.

So `convert_area()` **raises** rather than guessing when a regional unit arrives
without a state, and raises again if that state is not in the table. A silently
wrong bigha corrupts an area by 60% and nothing downstream would ever catch it.
Values carry their basis and a confidence of `established` / `commonly_cited` /
`disputed`; anything not `established` produces a warning flag.

---

## 6. Running it

```bash
cd backend
pip install -r requirements.txt          # adds shapely + pyproj
uvicorn app.main:app --reload --port 8000
# http://localhost:8000/docs

cd frontend
npm install                              # adds leaflet + react-leaflet
npm run dev
# http://localhost:3000/officer/gis
```

`frontend/.env.local` needs `NEXT_PUBLIC_API_URL=http://localhost:8000`.

### Upload path — works today, no OCR needed

The GIS side never has to wait for the text side. Click **Upload extracted
documents** on the page, or:

```bash
curl -X POST 'http://localhost:8000/api/gis/upload?assemble=true' \
  -F 'file=@extracted.json'
```

Get a working example to copy the format from:

```bash
curl -X POST 'http://localhost:8000/api/gis/sample?village=irregular' > extracted.json
```

When OCR lands, map its output to the same shape and nothing else changes.

### Endpoints

| Method | Path | |
|---|---|---|
| POST | `/api/gis/plot` | Documents in, GeoJSON + findings out |
| POST | `/api/gis/upload` | Same, from a JSON file |
| POST | `/api/gis/parcel` | One document in full detail — closure report, local ring, every flag |
| POST | `/api/gis/sample` | A worked example in the exact input format |
| GET | `/api/gis/requirements` | The field spec for the extraction stage |
| GET | `/api/gis/crs` | Every CRS supported across India |
| GET | `/api/gis/crs/suggest` | Which CRS to use at a given lon/lat |
| POST | `/api/gis/units/convert` | Any Indian land unit to SI |

---

## 7. Files

| File | |
|---|---|
| `backend/app/services/survey_math.py` | Bearings (whole-circle & quadrantal), units, traverse, **Bowditch adjustment**, chain-and-offset, Helmert placement |
| `backend/app/services/crs_india.py` | All Indian CRSs, built from the EPSG database at import |
| `backend/app/services/document_geometry.py` | Document → polygon, with accuracy class and provenance |
| `backend/app/services/village_assembler.py` | The adjacency solver |
| `backend/app/services/sample_documents.py` | Worked examples of the input format |
| `backend/app/api/gis.py` | The API |
| `backend/tests/test_assembly_truth.py` | Ground-truth test |
| `frontend/src/components/gis/CadastralMap.tsx` | Map, coloured by how the geometry was obtained |
| `frontend/src/app/officer/gis/page.tsx` | Upload, map, provenance inspector, adjacency table |
| `document_to_gis_demo.html` | Self-contained demo |

Everything runs on `shapely` + `pyproj`. No PostGIS needed yet; when the parcel
table moves there, `ST_Overlaps` / `ST_Within` / `ST_Area(geom::geography)` replace
the in-process equivalents one-for-one.

---

## 8. Two things to be straight about

**The sample villages are worked examples of the input format, not real land
records.** The documents contain only bearings, distances, offsets, areas and
boundaries — and every polygon on the map is genuinely computed from those by the
same code that will process real extractions. Nothing is a pre-drawn map. But the
numbers were authored, not lifted from a record room, so don't present them as a
real village.

**Nothing here changes a legal record.** Indian land title is *presumptive*, not
conclusive. An inferred position is a hypothesis for an officer to verify, never a
statement about who owns what. The accuracy class and the uncertainty travel with
every parcel through the API and onto the map precisely so those two things can
never be confused.
