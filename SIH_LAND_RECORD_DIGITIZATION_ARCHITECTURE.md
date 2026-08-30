# AI-Powered Intelligent Land Record Digitization & Validation System
**Smart India Hackathon (SIH) • Problem Statement ID: 26018**  
**Ministry / Department:** Department of Land Resources (DoLR), Ministry of Rural Development, Government of India  
**Organization / Domain:** Land Governance, Digital India Land Records Modernization Programme (DILRMP)

---

## 1. Executive Summary & Problem Overview

Land administration in India spans centuries of physical registers, multilingual scripts (Devanagari, Marathi Modi, Urdu, Bengali, Tamil, etc.), legacy scanned PDFs, handwritten mutations, and cadastral maps. Physical records suffer from ink bleeds, fading paper, missing pages, and fragmentation across multiple documents (e.g., 7/12 Extracts, Sale Deeds, Khasra-Khatauni registers, and Form 6 Mutation Deeds).

This project implements an **end-to-end AI-powered intelligent digitization and validation platform** capable of:
1. Extracting structured key-value data from complex, low-quality, and multilingual Indian land records.
2. Formally classifying data into the **12 Core SIH Land Record Fields**.
3. Applying **strict schema-guided extraction rules** using **Sarvam AI Document Intelligence (`POST /doc-ai/v1/job/extract`)**.
4. Executing **multi-document smart merging and conflict detection** (e.g. 7/12 Extract + Sale Deed).
5. Providing **human-in-the-loop verification** with dual-pane comparison for Sub-Divisional Officers (SDO).
6. Enforcing **Department of Land Resources (DoLR) business validation rules** and maintaining an **immutable cryptographic audit trail**.

---

## 2. The 12 Core SIH Land Record Fields

In accordance with Problem Statement 26018 guidelines, the system extracts, classifies, and normalizes the following 12 fields:

| No | SIH Field Name | Technical Key | Description & Strict Operational Boundaries |
| :---: | :--- | :--- | :--- |
| **1** | **Landowner details** | `owner_name` | Primary title holder ONLY (Bhogwatadar/Kabjedar on 7/12, Purchaser/Buyer on Sale Deeds, Transferee on Mutation Deeds). Excludes sellers, tenants, and witnesses. |
| **2** | **Co-Owners** | `co_owners` | Array of joint co-sharers (सह-खातेदार) under the same Khata account. |
| **3** | **Survey number** | `survey_number` | Cadastral parcel identifier, Gut Number (गट क्र.), or CTS Number with sub-division hissa (e.g., `124/2`, `48/1A`). |
| **4** | **Khasra number** | `khasra_number` | Northern/Central Indian revenue plot number (खसरा क्र.) for UP, MP, Bihar, Rajasthan records. |
| **5** | **Khata number** | `khata_number` | Village ledger account number (खाते क्र. / खेवट) linking the parcel to the revenue ledger. |
| **6** | **Plot area** | `area` | Numeric land measurement (e.g., `2.45`, `1.80`), normalized from mixed regional notations. |
| **7** | **Area Unit** | `area_unit` | Measurement unit (`Hectares`, `Acre-Guntha`, `Bigha`, `Sq. Meters`). |
| **8** | **Village** | `village` | Revenue village or Mouje (गाव / मौजे) where the physical parcel is situated. |
| **9** | **Tehsil** | `tehsil` | Sub-divisional administrative Taluka or Tehsil (तालुका / तहसील). |
| **10** | **District** | `district` | Revenue district division (जिल्हा). |
| **11** | **Land classification** | `land_classification` | Land category: `Jirayat` (Dry), `Bagayat` (Irrigated), `Padik` (Fallow), or `Non-Agricultural (NA)`. |
| **12** | **Ownership details** | `ownership_details` | Legal tenure class: `Occupant Class 1 (भोगवटादार वर्ग-१ - Freehold)`, `Occupant Class 2 (Restricted)`, or fractional share. |
| **13** | **Mutation records** | `mutation_number` | Active mutation/Ferfar reference entry (फेरफार क्र., e.g., `5821`, `9420`). |
| **14** | **Registration information** | `registration_info` | Sale Deed / Registered deed info: Deed No, SRO Office, Volume, Stamp Duty, and Execution Year. |

---

## 3. Sarvam AI Doc AI Schema Extraction Pipeline

Instead of using raw OCR or generic OCR text digitizers, the system leverages **Sarvam AI's schema-guided VLM extraction endpoint**:

- **Endpoint**: `POST https://api.sarvam.ai/doc-ai/v1/job/extract`
- **Authentication**: `api-subscription-key: <SARVAM_API_KEY>`
- **Workflow**:
  ```mermaid
  sequenceDiagram
    participant Frontend as Next.js Frontend
    participant Backend as FastAPI Backend
    participant Sarvam as Sarvam Doc AI (/job/extract)
    participant DB as PostgreSQL / Supabase
    
    Frontend->>Backend: POST /api/extraction/process (Multipart Form: File)
    Backend->>Sarvam: POST /doc-ai/v1/job/extract (File + 12-Field JSON Schema)
    Sarvam-->>Backend: HTTP 201 Created (job_id)
    loop Poll Job Status
      Backend->>Sarvam: GET /doc-ai/v1/job/{job_id}/status
      Sarvam-->>Backend: status: "pending" | "completed"
    end
    Backend->>Sarvam: GET /doc-ai/v1/job/{job_id}/results
    Sarvam-->>Backend: Extracted JSON (result + annotations + confidence)
    Backend->>Backend: Run Business Rules & Conflict Engine
    Backend-->>Frontend: 12 Fields + Confidence Scores + Validation Flags
  ```

### Strict Schema Specification Passed to Sarvam AI:
```json
{
  "type": "object",
  "properties": {
    "owner_name": {
      "type": "string",
      "description": "Primary land title holder. On 7/12 Extract: extract the main occupant name under Bhogwatadar / Kabjedar (भोगवटादार / खातेदार). On Sale Deed: extract the Purchaser / Buyer (खरेदीदार). On Mutation: extract the Transferee. Do NOT extract Sellers, Tenants, or Witnesses. Return null if absent."
    },
    "co_owners": {
      "type": "array",
      "items": {
        "type": "string",
        "description": "Name of a secondary joint co-owner or co-sharer."
      },
      "description": "Array of joint co-owners under the same Khata number. Return empty array if none."
    },
    "survey_number": {
      "type": "string",
      "description": "Cadastral Survey Number, Gut Number (गट क्रमांक), or CTS Number (e.g. 124/2, 48/1A). Include sub-division index. Return null if absent."
    },
    "khasra_number": {
      "type": "string",
      "description": "Khasra plot number (खसरा क्र.) for northern/central Indian land records. Return null if absent."
    },
    "khata_number": {
      "type": "string",
      "description": "Village revenue ledger account number (खाते क्रमांक / खेवट). Return null if absent."
    },
    "area": {
      "type": "string",
      "description": "Numeric land area value only (e.g. 2.45, 1.80). Do not include text units. Return null if absent."
    },
    "area_unit": {
      "type": "string",
      "description": "Unit of area measurement: Hectares, Acre-Guntha, Bigha, or Sq. Meters. Return null if absent."
    },
    "village": {
      "type": "string",
      "description": "Revenue village or Mouje (गाव / मौजे) name where the land is located. Return null if absent."
    },
    "tehsil": {
      "type": "string",
      "description": "Sub-divisional administrative Taluka or Tehsil (तालुका / तहसील). Return null if absent."
    },
    "district": {
      "type": "string",
      "description": "District revenue division (जिल्हा). Return null if absent."
    },
    "land_classification": {
      "type": "string",
      "description": "Land tenure/crop classification: Jirayat (जिरायत), Bagayat (बागायत), Padik (पडीक), or Non-Agricultural (NA). Return null if not specified."
    },
    "ownership_details": {
      "type": "string",
      "description": "Tenure class: Occupant Class 1 (भोगवटादार वर्ग-१ - Freehold), Occupant Class 2, or share fraction (e.g. 1/2 share). Return null if absent."
    },
    "mutation_number": {
      "type": "string",
      "description": "Mutation / Ferfar entry number (फेरफार क्रमांक) mentioned in pencil, brackets, or mutation column (e.g. 5821, 9420). Return null if absent."
    },
    "registration_info": {
      "type": "string",
      "description": "Deed registration details for Sale Deeds only: Deed Registration No, SRO Office, Volume/Book, Stamp Duty, and Execution Year. Return null on 7/12 extracts."
    }
  }
}
```

---

## 4. Multi-Document Smart Merging & Cross-Verification

Land parcels are rarely documented in a single paper. Often, a **7/12 Extract** contains the cadastral and village survey details, while the **Sale Deed** contains the legal registration number, SRO office, and consideration amount.

Our **`LandRecordMerger`** (`backend/app/services/record_merger.py`) solves this through intelligent multi-document coalescing:
1. **Field Coalescing**: When a primary document (7/12) is uploaded, fields absent in the 7/12 (such as `registration_info`) receive a clean badge (`— Awaiting Sale Deed`).
2. **Supporting Deed Merge**: When the citizen uploads a secondary document (e.g. Sale Deed or 8A Extract), the merger automatically fills empty fields and updates the **Record Completeness Bar** to **100%**.
3. **Cross-Document Discrepancy Detection**: If Document A lists `survey_number = "124/2"` and Document B lists `survey_number = "125/4"`, the merger automatically flags this as a **`CONFLICT` severity flag** and routes the record to the Revenue Officer for physical map inspection.

---

## 5. UI/UX Design & Zero-Null Display Philosophy

- **Zero Raw `null`s**: The frontend never renders `null`, `undefined`, or empty input boxes. Fields awaiting secondary documents display informative badges (e.g. `— Awaiting Sale Deed` or `— Single Owner Holding`).
- **5 Grouped Semantic Cards**:
  1. *Landowner Details & Co-Owners*
  2. *Cadastral & Spatial Identifiers (GIS Ready)*
  3. *Administrative Location (Village, Tehsil, District)*
  4. *Land Characteristics & Area Measurement*
  5. *Legal Rights, Mutation & Registration Information*
- **Visual Confidence Pills**:
  - Green Badge (`>= 90%`): High AI certainty.
  - Amber Badge (`70% - 89%`): Moderate certainty.
  - Red Flagged Badge (`< 70%`): Faint ink or low confidence, flagged for officer review.
- **Completeness Meter**: Real-time progress bar (e.g. `10/12 Fields Digitized • 83% Complete`).

---

## 6. Database Schema & Security (`backend/supabase_schema.sql`)

The database is built on PostgreSQL with Row-Level Security (RLS):
- **`public.profiles`**: Citizen and Revenue Officer accounts.
- **`public.land_records`**: Structured 12 SIH columns + JSONB metadata (`ownership_details`, `registration_info`, `supporting_documents`, `validation_flags`).
- **`public.audit_logs`**: Immutable, append-only audit trail logging every OCR extraction, citizen correction proposal, and officer certification approval.

---

## 7. How to Run Locally

### 1. Backend Server (FastAPI)
```bash
cd backend
py -3.11 -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
- API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

### 2. Frontend Server (Next.js 14)
```bash
cd frontend
npm install
npm run dev
```
- Upload Wizard: `http://localhost:3000/citizen/upload`
- Citizen Dashboard: `http://localhost:3000/citizen/dashboard`
- Officer Workspace: `http://localhost:3000/officer/dashboard`
