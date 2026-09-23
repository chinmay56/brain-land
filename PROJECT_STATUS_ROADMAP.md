# Intelligent Land Record Digitization & Validation System
## Project Status, Capability Breakdown & Feature Roadmap (SIH 2026)

**Problem Statement ID:** 26018  
**Department:** Department of Land Resources (DoLR), Ministry of Rural Development  
**Team:** Brahmastra_1  
**Last Updated:** September 19, 2026  

---

## 🟢 1. Fully Built & Production-Ready Capabilities

### A. AI Document Intelligence & Multilingual OCR
- **Live Sarvam AI Integration**: Connected to Sarvam AI Doc AI Extract endpoint (`POST https://api.sarvam.ai/doc-ai/v1/job/extract`).
- **Verbatim Native Script Preservation**: Extracts names, village, tehsil, district, and survey numbers in their original script (Marathi Devanagari, Hindi, English, etc.) without forced translation (`श्री. चंदन रामचंद्र वाणी`, `मेहरूण`, `जळगाव`).
- **Strict Role Exclusion Prompting**: Enforces strict LLM schema definitions to exclude Sellers (*लिहून देणार*), Sub-Registrars, Advocates, Witnesses, and Officers from `owner_name` and `co_owners`.
- **Auto-Trimming for 10-Page Limit**: Integrates PyMuPDF to trim documents exceeding 10 pages before sending to Sarvam AI, adhering to API limits.
- **Extended Polling Engine**: 120-second polling timeout (60 attempts) ensuring complex multi-page VLM extraction jobs finish cleanly.
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

### D. Backend Architecture & Data Schema
- **FastAPI Core**: Pydantic models configured with camelCase alias generation for seamless Next.js frontend binding.
- **Validation Engine**: Business rules engine detecting anomalies (missing survey numbers, low confidence scores, area unit mismatches).
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
| **1. Direct Supabase Real-time Sync** | Connect citizen submission directly to Officer Queue DB table so submissions appear live instantly without page reload. | Backend API & Supabase Realtime |
| **2. Multi-Document Conflict Resolver** | UI card highlighting discrepancies (e.g., Area mismatch between 7/12 Extract vs. Sale Deed) for officer review. | Frontend Officer Verification UI |
| **3. PostGIS Spatial Parcel Linking** | Query PostGIS spatial database using `survey_number` to highlight the exact land parcel on the GIS map. | Backend PostGIS + Leaflet GIS |
| **4. Digitized Certificate PDF Export** | Export official government-branded "Verified Land Record Certificate" (PDF download) upon approval. | Frontend Citizen / Officer Dashboard |

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
