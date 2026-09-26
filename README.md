<div align="center">

# Intelligent Land Record Digitization & Validation System

**AI-assisted digitization of legacy Indian land records, with human-in-the-loop verification, cross-database validation, an append-only audit trail, and document-derived cadastral geometry.**

Smart India Hackathon 2026 · Problem Statement **26018** · Department of Land Resources (DoLR), Ministry of Rural Development

[![Frontend](https://img.shields.io/badge/frontend-Next.js%2014%20%C2%B7%20TypeScript-000000)](frontend/)
[![Backend](https://img.shields.io/badge/backend-FastAPI%20%C2%B7%20Python%203.12-009688)](backend/)
[![Database](https://img.shields.io/badge/database-Supabase%20PostgreSQL-3ECF8E)](backend/migrations/)
[![OCR](https://img.shields.io/badge/document%20AI-Sarvam%20Doc%20AI-FF6F00)](backend/app/services/sarvam_vision.py)
[![GIS](https://img.shields.io/badge/GIS-Leaflet%20%C2%B7%20Shapely%20%C2%B7%20PyProj-199900)](GIS_README.md)
[![Status](https://img.shields.io/badge/status-prototype%20%C2%B7%20demonstrable-blue)](PROJECT_STATUS_ROADMAP.md)

[Quick start](#quick-start) · [Architecture](#architecture) · [Features](#what-it-does) · [API](#api) · [Security model](#security-model) · [GIS engine](#gis-engine) · [Limitations](#known-limitations) · [Roadmap](#roadmap)

</div>

---

## Why this exists

A large share of India's land records still live as handwritten registers, scanned PDFs, sale deeds, mutation entries and tippan sketches. Digitizing them by hand is slow, expensive and inconsistent, and a wrong survey number or area figure in a digital record is worse than no record at all.

This system reads those documents with a multilingual document-AI model, classifies what it finds into the twelve standard land-record fields, checks the result against the department's own master data and against every other record already on file, scores its own confidence field by field, and hands anything uncertain to a revenue officer in a split-screen workspace. Every correction the officer makes is preserved beside the AI's original reading and fed back to the extractor. Nothing is certified without a human decision, and every decision is logged.

## What it does

| Problem-statement requirement | How it is met | Where |
|---|---|---|
| Multilingual recognition, printed and handwritten | Sarvam Doc AI schema-guided extraction; values kept in the source script (Devanagari, Latin, mixed) | [`sarvam_vision.py`](backend/app/services/sarvam_vision.py) |
| Extraction from scanned PDFs and images | PDF, PNG, JPEG; page counting with `pypdf`, 10-page trim with `pymupdf` | same |
| Twelve predefined fields | owner, co-owners, survey, khasra, khata, area + unit, village, tehsil, district, land class, ownership, mutation, registration | [`schemas.py`](backend/app/models/schemas.py) |
| Business-rule validation | Format rules on survey numbers, low-confidence detection, area/unit sanity, seven spatial rules on the GIS side | [`validation_engine.py`](backend/app/services/validation_engine.py), [`gis_engine.py`](backend/app/services/gis_engine.py) |
| Cross-database verification | Every extraction is matched to `reference_records` (an RoR master) on village + survey number; owner and area discrepancies are flagged with severity bands | [`reference_check.py`](backend/app/services/reference_check.py) |
| Duplicate detection | Same village + survey number already on file, with escalation when the owner differs (competing claim) | same |
| Confidence scoring | Per-field confidence from the extractor, persisted in `ocr_extracted_data`, thresholds 0.70 / 0.90 | [`land_records.py`](backend/app/api/land_records.py) |
| Human-assisted verification | Officer workspace: original document beside AI values, per-field edit, approve or reject with reason, decided server-side | [`verification.py`](backend/app/api/verification.py), [`officer/verification/[id]`](frontend/src/app/officer/verification/[id]/page.tsx) |
| Learning over time | Officer and citizen corrections are aggregated per field; frequently-corrected fields get correction examples injected into the extractor's schema on the next run | [`learning.py`](backend/app/services/learning.py) |
| GIS and cadastral maps | Parcels are reconstructed from measurements on the documents themselves (traverse, chain-and-offset, coordinates) and assembled across a village from the four-boundaries column | [`GIS_README.md`](GIS_README.md) |
| Secure repository, metadata, audit trail | Private storage bucket with signed URLs; `land_records` + `audit_logs` (append-only, AI value kept beside every correction) | [`migrations/`](backend/migrations/) |
| Dashboards | Documents processed, pending, validation status, error statistics, district-wise progress, officer-verified field accuracy, correction rates | [`officer/dashboard`](frontend/src/app/officer/dashboard/page.tsx) |
| APIs | REST, OpenAPI at `/docs`, bearer-token protected | [API](#api) |
| Role-based access control | Supabase Auth + `profiles.role`; RLS with no anonymous grants; officer-only routes return 403 | [Security model](#security-model) |

## Architecture

```
                 ┌────────────────────────────────────────────────┐
                 │                 Next.js 14 (frontend/)          │
                 │  Land-owner portal        Officer console       │
                 │  upload · preview · track  queue · workspace ·  │
                 │                            audit · GIS · stats  │
                 └───────────────┬───────────────────┬────────────┘
        Supabase JS (auth, RLS-scoped reads)         │ Bearer token
                                 │                   ▼
                                 │   ┌───────────────────────────────┐
                                 │   │        FastAPI (backend/)      │
                                 │   │  /auth  /extraction  /land-records
                                 │   │  /verification  /documents  /gis
                                 │   └──────┬──────────┬─────────────┘
                                 │          │          │
                                 ▼          ▼          ▼
                     ┌──────────────┐ ┌───────────┐ ┌──────────────────┐
                     │  Supabase    │ │ Sarvam    │ │ Geometry engine  │
                     │  Postgres    │ │ Doc AI    │ │ shapely · pyproj │
                     │  Auth        │ │ /doc-ai/  │ │ survey_math      │
                     │  Storage     │ │ v1/job/   │ │ village_assembler│
                     │  (private)   │ │ extract   │ │ crs_india        │
                     └──────────────┘ └───────────┘ └──────────────────┘
```

**Request flow for one document**

1. Citizen uploads a scan. The browser sends it to `POST /api/extraction/process` with the session token.
2. The backend submits it to Sarvam Doc AI with the twelve-field JSON schema, plus any learned hints, and polls the job.
3. The result is normalised into `FieldConfidence` objects, then run through business rules, the reference-master check and the duplicate check.
4. The citizen reviews, optionally edits, and submits. The record lands in `land_records` with per-field confidence, flags and `data_source`; an `OCR_EXTRACTED` audit row (and a `CITIZEN_CORRECTION` row if anything was edited) is written.
5. An officer opens the record, sees the original document from the private bucket via a signed URL beside the AI values, corrects fields, and approves or rejects. `POST /api/verification/process-decision` performs the update with the officer's identity taken from the token and writes the `CERTIFIED_APPROVED` or `REJECTED` audit row with `{field: {ai, officer}}` for every change.
6. Correction statistics are recomputed; fields corrected often enough get hints on the next extraction.

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind, Leaflet / react-leaflet, react-pdf | App-router pages for two roles, typed contracts shared with the API |
| Backend | Python 3.12, FastAPI, Pydantic v2, httpx | Async polling of a long-running document-AI job; Python for the geometry math |
| Document AI | Sarvam Doc AI (`/doc-ai/v1/job/extract`) | Indian-language VLM with schema-guided extraction; Indian provider |
| Data | Supabase PostgreSQL, Auth, Storage | Postgres with row-level security, JWT auth, private object storage |
| Geometry | shapely, pyproj (EPSG database) | In-process cadastral maths; every rule maps one-to-one onto PostGIS when the parcel table moves there |
| Hosting | Render (API, `render.yaml`), Vercel (frontend) | Free tiers sufficient for a prototype |

Sarvam replaces the OpenCV / spaCy / HuggingFace stack suggested in the problem statement. The trade-off: no model hosting or training for the team, native handling of Marathi and Hindi script, one vendor dependency. Image preprocessing is delegated to the model.

## Repository layout

```
brain-land/
├── frontend/                    Next.js application
│   └── src/
│       ├── app/
│       │   ├── citizen/         dashboard · upload · applications · records
│       │   ├── officer/         dashboard · verification/[id] · audit · gis · history · conflicts
│       │   ├── login/  register/  officer-login/
│       ├── components/          gis/CadastralMap · common/PdfDocumentViewer · badges · header
│       ├── context/AuthContext  Supabase session, role from profiles
│       └── lib/                 apiFetch (bearer) · auditLog · supabaseClient · lgdMaster
├── backend/
│   ├── app/
│   │   ├── api/                 auth · documents · extraction · land_records · verification · gis
│   │   ├── core/auth.py         token verification, require_officer
│   │   ├── services/
│   │   │   ├── sarvam_vision.py      extraction, ExtractionError, fixtures when no key
│   │   │   ├── reference_check.py    RoR master match + duplicate detection
│   │   │   ├── learning.py           correction stats → schema hints
│   │   │   ├── validation_engine.py  business rules
│   │   │   ├── record_to_document.py extraction → geometry contract (area parsing)
│   │   │   ├── survey_math.py        bearings, units, traverse, Bowditch, chain-offset
│   │   │   ├── crs_india.py          20 Indian CRSs from EPSG
│   │   │   ├── document_geometry.py  document → polygon with accuracy class
│   │   │   ├── village_assembler.py  adjacency solver
│   │   │   └── gis_engine.py         seven spatial validation rules
│   │   ├── data/                reference_records.json · sample cadastral GeoJSON
│   │   └── models/schemas.py    FieldConfidence, LandRecord, ValidationFlag
│   ├── migrations/
│   │   ├── 000_fresh_project_setup.sql   one-file setup for a new Supabase project
│   │   └── 001_rbac_and_secure_storage.sql
│   ├── scripts/seed_officer.py  creates the demo officer and citizen accounts
│   ├── tests/                   reference/duplicate rules · ground-truth village assembly
│   └── supabase_schema.sql      cumulative schema (kept in step with migrations)
├── docs/                        Document-to-GIS technical report
├── GIS_README.md                the geometry layer, in depth
├── PROJECT_STATUS_ROADMAP.md    what is built, partial, remaining
├── SIH_LAND_RECORD_DIGITIZATION_ARCHITECTURE.md
└── render.yaml                  Render blueprint for the API
```

## Quick start

### Prerequisites

- Node.js 18+, Python 3.11+ (3.12 recommended)
- A Supabase project (free tier works)
- A Sarvam AI API key with Doc AI enabled and credit on the account. Without a key the backend serves clearly-labelled fixture data; with a key that fails, it refuses loudly rather than substituting fixtures.

### 1. Database

In the Supabase SQL editor, run [`backend/migrations/000_fresh_project_setup.sql`](backend/migrations/000_fresh_project_setup.sql) once. It creates `profiles`, `land_records`, `audit_logs`, `reference_records`, the `is_officer()` helper, all row-level-security policies, the private `land-record-documents` bucket policy, and seeds the reference master.

### 2. Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate            # Windows   |   source .venv/bin/activate on macOS/Linux
pip install -r requirements.txt
copy .env.example .env            # then fill in the values below
python scripts/seed_officer.py    # creates the demo officer + citizen from .env
uvicorn app.main:app --reload --port 8000
```

OpenAPI docs: <http://localhost:8000/docs>. Health: <http://localhost:8000/> returns `sarvam_configured: true|false`.

### 3. Frontend

```bash
cd frontend
npm install
copy .env.example .env.local      # fill in the values below
npm run dev
```

Open <http://localhost:3000>. Land-owner login at `/login`, officer login at `/officer-login`.

> If pages ever render without JavaScript (blank captcha, form submits as a GET to `/login?`), the Next.js dev cache is stale: stop `npm run dev`, delete `frontend/.next`, start again.

### Environment variables

**`backend/.env`**

| Variable | Purpose |
|---|---|
| `SARVAM_API_KEY` | Sarvam Doc AI subscription key. Server-side only. |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service-role key. Bypasses RLS; used only to verify tokens, read `profiles`, and perform officer decisions. Never ship to the browser. |
| `ALLOWED_ORIGINS` | Comma-separated exact frontend origins for CORS |
| `ALLOWED_ORIGIN_REGEX` | Optional anchored pattern for preview deployments |
| `DEMO_OFFICER_*`, `DEMO_CITIZEN_*` | Accounts created by `seed_officer.py`. Officer accounts cannot be self-registered. |

**`frontend/.env.local`**

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Same project as the backend |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key; RLS governs what it can read |
| `NEXT_PUBLIC_API_URL` | Backend origin, e.g. `http://localhost:8000` |

## API

All routes are under `/api`. Protected routes require `Authorization: Bearer <supabase access token>`; the backend verifies the token with Supabase and reads the role from `profiles`. Unauthenticated calls return `401`, citizens calling officer routes return `403`, both as JSON.

| Method | Route | Access | Purpose |
|---|---|---|---|
| GET | `/auth/me` | any user | Caller identity and role |
| POST | `/extraction/process` | any user | Extract, validate, cross-check one document. `502` with a reason if the extractor fails. |
| GET | `/extraction/correction-stats` | officer | Per-field correction rates, accuracy, active hints |
| GET / POST | `/land-records` | any user | List (citizens see their own) / create (owner from token) |
| GET | `/land-records/{id}` | any user | One record; `404` for another citizen's record |
| POST | `/verification/process-decision` | officer | Approve or reject, apply corrections, write audit row |
| POST | `/documents/upload` | any user | Store in the private bucket under the caller's folder |
| GET | `/documents/signed-url` | any user | Fresh signed link, ownership checked server-side |
| POST | `/gis/plot-document` | officer | Scan in, GeoJSON out, with `trace` / `pin` for shapeless documents |
| POST | `/gis/plot`, `/gis/upload`, `/gis/parcel` | officer | Geometry from already-extracted documents |
| GET | `/gis/requirements`, `/gis/crs`, `/gis/crs/suggest` | public | Contract and reference data for the extraction stage |
| POST | `/gis/units/convert`, `/gis/sample` | public | Indian land units to SI; worked example inputs |

Response provenance is explicit: every extraction and every record carries `data_source` ∈ `SARVAM_LIVE | DEMO_FALLBACK | MANUAL`, and the UI banners anything that is not a live reading.

## Security model

- **Authentication** is Supabase Auth. The backend never decodes tokens locally; it asks Supabase, then reads the authoritative role from `public.profiles`, which users cannot write.
- **Authorization** is enforced twice: in FastAPI dependencies (`get_current_user`, `require_officer`) and in PostgreSQL row-level security. No policy grants anything to the `anon` role.
- **Registration** always yields `CITIZEN`. The `handle_new_user` trigger ignores any role in signup metadata. Officers are created only by `scripts/seed_officer.py` with the service-role key.
- **Documents** live in a private bucket, path-prefixed by the uploader's user id, and are served through one-hour signed URLs. The signing endpoint checks ownership before signing.
- **Decisions** are made server-side. The officer's identity on a certification comes from the token, never from the request body. Only a fixed set of fields is correctable.
- **Audit trail** is append-only. Every row records who, what action, and a `changes` map with the AI value beside the human value. Nothing is hashed or chained; the doc says "append-only", not "cryptographic".
- **Secrets** stay server-side. The service-role key and the Sarvam key are never sent to the browser. CORS is an exact origin list.

## GIS engine

A 7/12 extract, jamabandi or sale deed contains no coordinates and cannot be plotted. Geometry lives in a different document for the same survey number: the tippan or Field Measurement Book. The engine therefore reconstructs parcel shape from what is written on those sheets (bearings and distances, chain-and-offset ladders, or coordinates in any of 20 Indian CRSs), reconciles the computed area against the register, checks traverse closure, and places parcels across a village from the four-boundaries column with a single anchored parcel. Position uncertainty is propagated and drawn to scale. Documents with no measurements at all can be placed by an officer with a single pin or a traced boundary, and are labelled as such.

Full treatment, accuracy figures and the input contract: [`GIS_README.md`](GIS_README.md). Ground-truth test: `python backend/tests/test_assembly_truth.py`.

## Testing

```bash
cd backend
python -m pytest tests -q            # reference/duplicate rules, village assembly
cd ../frontend
npx tsc --noEmit                     # type check
```

Manual end-to-end script, both roles, in [`PROJECT_STATUS_ROADMAP.md`](PROJECT_STATUS_ROADMAP.md).

## Deployment

- **API**: [`render.yaml`](render.yaml) is a Render blueprint. Secrets are `sync: false` and entered in the dashboard. Health check at `/health`.
- **Frontend**: Vercel. Set the three `NEXT_PUBLIC_*` variables; add the Vercel origin to `ALLOWED_ORIGINS` on the API.
- **Database**: run `000_fresh_project_setup.sql` on the target Supabase project, then `seed_officer.py` against it.

## Known limitations

Stated plainly, because a judge or a department will find them anyway.

- **Reference master is seeded, not federated.** `reference_records` is loaded from a JSON/SQL seed. Connecting it to a state LRMS or the DILRMP database needs a data-sharing agreement that a hackathon team does not have.
- **No LRMS / DILRMP export contract yet.** The integration point is the API and the `land_records` schema; there is no export endpoint in a state-specific format.
- **Single-file ingestion.** Batch upload of whole registers is not implemented.
- **No image preprocessing.** Deskew, denoise and contrast are delegated to the document-AI model.
- **Handwriting** has not been evaluated on a handwritten register; the sample corpus is printed Marathi with handwritten annotations.
- **State coverage** is Maharashtra in the LGD resolver, unit tables and dashboards. The schema is state-agnostic; the seed data is not.
- **Geometry** runs in-process with shapely; PostGIS is the intended target and each rule maps directly, but the parcel table is not there yet.
- **Sarvam is a single vendor dependency.** A bad key or an empty balance stops live extraction; the system says so rather than faking it.

Open bugs and their fixes are tracked in [`PROJECT_STATUS_ROADMAP.md`](PROJECT_STATUS_ROADMAP.md).

## Roadmap

1. Batch ingestion with a per-register progress view
2. LGD-coded export endpoint as the LRMS / DILRMP integration contract
3. Parcel table on PostGIS; spatial rules as SQL
4. OpenCV preprocessing pass behind a flag, with before/after comparison on poor scans
5. Multi-document conflict resolver in the officer workspace
6. Verified-record certificate PDF

## Team

Team **Brahmastra_1**, Smart India Hackathon 2026.

## License

Prototype built for SIH 2026. Not licensed for production use on real land records without a governing department's authorisation and a security review.
