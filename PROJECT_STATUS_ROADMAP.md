# Intelligent Land Record Digitization & Validation System
## Project Status, Capability Breakdown & Feature Roadmap (SIH 2026)

**Problem Statement ID:** 26018  
**Department:** Department of Land Resources (DoLR), Ministry of Rural Development  
**Team:** Brahmastra_1  
**Last Updated:** September 19, 2026  

---

## 🟢 1. Built and Demonstrable

### A. AI Document Intelligence & Multilingual OCR
- **Fail-Loud Extraction & Provenance**: With an API key configured, any Sarvam failure (HTTP 402, job failure, 120 s timeout) now raises `ExtractionError` and the endpoints return HTTP 502 with a human-readable reason instead of substituting fixture data; fixtures are served only when no key is set, every record carries `data_source` (`SARVAM_LIVE` / `DEMO_FALLBACK` / `MANUAL`), and the citizen and officer screens banner demo and manually-entered records so neither can be certified as a reading of the document.
- **Live Sarvam AI Integration**: Connected to Sarvam AI Doc AI Extract endpoint (`POST https://api.sarvam.ai/doc-ai/v1/job/extract`).
- **Verbatim Native Script Preservation**: Extracts names, village, tehsil, district, and survey numbers in their original script (Marathi Devanagari, Hindi, English, etc.) without forced translation (`श्री. चंदन रामचंद्र वाणी`, `मेहरूण`, `जळगाव`).
- **Strict Role Exclusion Prompting**: Enforces strict LLM schema definitions to exclude Sellers (*लिहून देणार*), Sub-Registrars, Advocates, Witnesses, and Officers from `owner_name` and `co_owners`.
- **Auto-Trimming for 10-Page Limit**: Integrates PyMuPDF to trim documents exceeding 10 pages before sending to Sarvam AI, adhering to API limits.
- **Extended Polling Engine**: 120-second polling timeout (60 attempts) ensuring complex multi-page VLM extraction jobs finish cleanly.
- **Correction Feedback Loop**: `learning.py` aggregates every officer and citizen correction already recorded in `audit_logs` into per-field correction rates and an officer-verified accuracy figure, and appends a hint built from real verified corrections ("'3594' was corrected to '3601'") to the schema description of any field corrected 3+ times at a 20%+ rate — surfaced on the officer analytics tab and recorded on the extraction's own audit row.
- **Multi-Document Record Merger**: Aggregates fields across 7/12 Extract, Sale Deed, and Mutation entries into a single unified land record.

### B. Citizen Portal Workflow
- **Document Upload**: Drag-and-drop file uploader supporting PDFs, PNGs, and JPEGs.
- **Live Extraction Preview & Full Field Editing**: Extracted fields (Owner Name, Co-Owners, Survey/Gut No, Khasra No, Khata No, Area, Land Classification, Registration Info) are editable by default before submission.
- **My Applications & Dashboard**: Dynamic dashboard tracking submitted applications with live status badges (`Submitted`, `Under Review`, `Approved`, `Rejected`).
- **Persistence Layer**: LocalStorage fallback state sync combined with Supabase REST API calls.

### C. Officer Verification Portal
- **Split-Screen Verification Interface**: Displays scanned original document PDF/image side-by-side with extracted AI fields.
- **Confidence Badging**: Visual field confidence indicators (High / Medium / Low / Flagged).
- **Per-Field Confidence Persistence**: Extractor confidence for all 12 fields plus co-owners is stored in `land_records.ocr_extracted_data` (alongside `validation_flags`) and drives each field's own badge and the officer queue's low-confidence filter (any field < 0.70), replacing the single record-level score shown on every field.
- **Officer Review Actions**: Allows officers to edit fields, append official verification notes, approve records, or reject applications with reason codes.
- **Audit Trail**: Logs timestamps, officer actions, and verification history.
- **Append-Only Provenance Writes**: Citizen submission (`OCR_EXTRACTED`, plus `CITIZEN_CORRECTION` when the preview was edited) and officer certification (`CERTIFIED_APPROVED` / `REJECTED`) each append a `public.audit_logs` row carrying the AI value beside the human's correction, rendered as a before/after table on the audit page and summarised in a History panel on the verification workspace.

### D. Backend Architecture & Data Schema
- **FastAPI Core**: Pydantic models configured with camelCase alias generation for seamless Next.js frontend binding.
- **Validation Engine**: Business rules engine detecting anomalies (missing survey numbers, low confidence scores, area unit mismatches).
- **Cross-Database Verification & Duplicate Detection**: Every extraction is checked against the `public.reference_records` RoR master (owner and area discrepancies raised as `REF_OWNER_MISMATCH` / `REF_AREA_MISMATCH`, banded 5–15% warning vs >15% conflict) and against already-submitted records for the same village and survey number (`DUPLICATE_RECORD`, escalated to a competing claim when the owner differs), both degrading to a bundled JSON master and no flags when Supabase is unreachable.
- **Role-Based Access Control & Private Storage**: Every protected endpoint resolves the caller from a Supabase bearer token and reads the authoritative role from `public.profiles`, so officer-only actions (certification, the GIS editor, correction statistics) return 403 to a citizen and 401 to an anonymous caller; row-level security no longer grants anything to `anon`, signup can no longer award itself the OFFICER role, certification is decided server-side with the officer taken from the token, and land documents live in a private bucket served through expiring signed URLs instead of public links.
- **Supabase PostgreSQL & Storage**: Configured for storing document assets and land record data.

---

## 🟡 2. Partially Implemented Features (Mocked / Hybrid)

1. **GIS Parcel Map Visualizer (`/officer/gis`)**:
   - Leaflet map UI is built, but parcel boundaries currently render sample coordinates rather than dynamically fetching PostGIS polygon geometries based on the extracted `survey_number`.
2. **Citizen ➔ Officer Live Queue Sync**:
   - Currently uses a hybrid state sync (`localStorage` + Supabase REST). Works offline, but real-time database pushes need direct WebSocket / Server-Sent Event updates.

---

## 🔴 3. Remaining Capabilities to Reach Full End-to-End Vision

| Feature / Requirement | Description | Target Component |
| :--- | :--- | :--- |
| **1. Multi-Document Conflict Resolver** | UI card highlighting discrepancies (e.g., Area mismatch between 7/12 Extract vs. Sale Deed) for officer review. | Frontend Officer Verification UI |
| **2. PostGIS Spatial Parcel Linking** | Query PostGIS spatial database using `survey_number` to highlight the exact land parcel on the GIS map. | Backend PostGIS + Leaflet GIS |
| **3. Digitized Certificate PDF Export** | Export official government-branded "Verified Land Record Certificate" (PDF download) upon approval. | Frontend Citizen / Officer Dashboard |

---

## 📊 Summary Feature Matrix

| Feature | Built Status | Implementation Technology |
| :--- | :---: | :--- |
| **Multilingual AI Vision OCR** | 🟢 Complete | Sarvam Doc AI API |
| **Strict Schema & Role Exclusion** | 🟢 Complete | Sarvam VLM Schema Prompting |
| **10-Page PDF Auto-Trimming** | 🟢 Complete | PyMuPDF |
| **Citizen Upload & Editable Preview** | 🟢 Complete | Next.js, React Input |
| **Officer Split-Screen Review** | 🟢 Complete | Next.js, PDF Viewer |
| **Audit Trail & Decision Logging** | 🟢 Complete | FastAPI + PostgreSQL |
| **Live Citizen ➔ Officer DB Sync** | 🟡 In Progress | Supabase REST API |
| **PostGIS Parcel Boundary Map** | 🔴 Remaining | PostGIS + Leaflet GIS |
| **Verified Title PDF Certificate** | 🔴 Remaining | jsPDF / HTML Canvas |
