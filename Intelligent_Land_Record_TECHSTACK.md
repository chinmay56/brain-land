# TECHSTACK.md

# Intelligent Land Record Digitization & Validation System

**Problem Statement:** 26018  
**Organization:** Ministry of Rural Development, Government of India  
**Department:** Department of Land Resources (DoLR)

---

## 1. Technology Stack

The system will use a modern web application stack with **Next.js/React/TypeScript** for the frontend, **Python/FastAPI** for backend and AI-service integration, **Sarvam AI Vision** for document/image understanding, and **Supabase PostgreSQL** for persistent data storage.

### Core Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend Framework | **Next.js** | Web application framework and routing |
| UI Library | **React** | Component-based user interface |
| Language | **TypeScript** | Type-safe frontend development |
| Backend Language | **Python** | AI/document-processing backend |
| Backend Framework | **FastAPI** | REST APIs and backend service |
| AI / Vision | **Sarvam AI Vision Model** | Document/image understanding and information extraction |
| Database | **Supabase PostgreSQL** | Structured application and land-record data |
| Authentication | **Supabase Auth** | User and officer authentication |
| File Storage | **Supabase Storage** | Original uploaded land documents |
| GIS Database Support | **PostgreSQL / PostGIS** | Spatial land-record information where required |

---

# 2. Architecture Overview

```text
                    USER / OFFICER
                          |
                          v
                 Next.js + React
                    TypeScript
                          |
                          | HTTPS / API
                          v
                    FastAPI Backend
                          |
             +------------+------------+
             |                         |
             v                         v
      Supabase PostgreSQL       Sarvam AI Vision
             |                         |
             |                         v
             |                  Document Extraction
             |                         |
             +------------<------------+
                          |
                          v
                 Land Record Workflow
                          |
             +------------+-------------+
             |            |              |
             v            v              v
        Validation     Verification     Storage
        / Business       Officer       / History
          Rules         Workflow
```

The frontend should never contain AI processing logic directly.

The frontend communicates with the FastAPI backend, while the backend handles AI-service communication and application-level processing.

---

# 3. Frontend

## Next.js

Next.js will be the primary frontend framework.

Responsibilities:

- Application routing
- Page rendering
- Authentication-aware UI
- Server/client component structure where appropriate
- API communication
- UI state management
- Form handling
- File upload interface
- Land-owner workflow
- Officer workflow

Main application areas:

```text
/app
  /login
  /register

  /user
    /dashboard
    /upload
    /applications
    /records
    /records/[id]
    /corrections

  /officer
    /dashboard
    /verification
    /verification/[id]
    /records
    /gis
```

The exact folder structure can be adjusted during implementation, but the separation between user and officer workflows should remain clear.

---

# 4. React

React will be used to build reusable UI components.

Examples:

```text
GovernmentHeader
Sidebar
Dashboard
DataTable
StatusBadge
DocumentUploader
DocumentViewer
LandRecordForm
ConfidenceIndicator
ValidationAlert
VerificationPanel
ApprovalDialog
RejectionDialog
RecordTimeline
MapView
```

Components should be reusable across both modules where appropriate.

---

# 5. TypeScript

TypeScript will provide type safety across the frontend.

Important domain types should include:

```ts
User
Officer
Document
LandRecord
VerificationRequest
ValidationResult
ConfidenceScore
CorrectionRequest
AuditLog
```

Example:

```ts
type LandRecord = {
  id: string;
  ownerName: string;
  surveyNumber: string;
  khasraNumber?: string;
  khataNumber?: string;
  area?: number;
  areaUnit?: string;
  village?: string;
  tehsil?: string;
  district?: string;
  landClassification?: string;
  status: LandRecordStatus;
};
```

Use shared types wherever possible so frontend and backend contracts remain clear.

---

# 6. Backend

## Python

Python will be used for backend processing and AI integration.

Responsibilities:

- API implementation
- Document-processing orchestration
- AI-service integration
- Extraction response processing
- Data normalization
- Validation logic
- Confidence handling
- Duplicate detection logic
- Database interaction where appropriate

Python is preferred for the AI/document-processing layer because the future system may require additional document-processing and machine-learning components.

---

# 7. FastAPI

FastAPI will expose the backend API consumed by the Next.js application.

Responsibilities:

- REST API endpoints
- Authentication/authorization checks
- Document processing requests
- Land-record operations
- Verification workflow
- Validation workflow
- AI-service integration
- Database operations
- Error handling

Suggested API structure:

```text
/api/auth
/api/documents
/api/extraction
/api/land-records
/api/validation
/api/verification
/api/corrections
/api/gis
```

Example workflow:

```text
Next.js
   |
   | POST /api/documents
   v
FastAPI
   |
   v
Supabase Storage
   |
   v
FastAPI
   |
   | Send document/image for analysis
   v
Sarvam AI Vision
   |
   v
Extracted structured information
   |
   v
Validation / normalization
   |
   v
Supabase PostgreSQL
```

---

# 8. Sarvam AI Vision Model

Sarvam AI Vision will be used as the document/image understanding layer.

Its role in the system is to process uploaded land-record documents and help extract structured information from them.

Potential inputs:

- Scanned land records
- Document images
- PDF pages converted/handled as required by the backend
- Printed text
- Handwritten or mixed-content documents where supported by the selected model/API

Potential extracted information:

```text
Landowner details
Survey number
Khasra number
Khata number
Area
Village
Tehsil
District
Land classification
Ownership details
Mutation information
Registration information
```

The exact model/API capabilities and supported document formats should be verified during backend implementation and should not be hard-coded into the frontend.

---

# 9. AI Processing Boundary

The frontend should NOT call the vision model directly.

Use:

```text
Next.js
   |
   v
FastAPI
   |
   v
Sarvam AI Vision
```

This provides a controlled backend boundary for:

- API credentials
- Request validation
- File handling
- Prompt/instruction management
- Response normalization
- Error handling
- Logging
- Future model replacement

AI credentials must remain server-side.

They must never be exposed in browser/client code.

---

# 10. Extraction Pipeline

The eventual extraction pipeline will be:

```text
Uploaded Document
       |
       v
File Validation
       |
       v
Document/Image Processing
       |
       v
Sarvam AI Vision
       |
       v
Raw Extraction
       |
       v
Field Mapping
       |
       v
Normalization
       |
       v
Structured Land Record
       |
       v
Validation
       |
       v
Officer Verification
```

During UI development, this pipeline can be represented using mock extraction results.

---

# 11. Supabase

Supabase will provide the main application data platform.

Use:

- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage

The current stack does not require a separate PostgreSQL server.

---

# 12. Supabase PostgreSQL

PostgreSQL will store structured application data.

Suggested core tables:

```text
profiles
documents
land_records
extracted_fields
validation_results
verification_requests
verification_actions
correction_requests
audit_logs
```

Potential relationships:

```text
User
 |
 +---- Documents
 |
 +---- Land Records
 |
 +---- Correction Requests

Document
 |
 +---- Extracted Fields
 |
 +---- Land Record

Land Record
 |
 +---- Validation Results
 |
 +---- Verification Request
 |
 +---- Verification Actions
```

Keep the initial schema simple and evolve it as the AI and validation requirements become clearer.

---

# 13. Supabase Authentication

Supabase Auth will handle authentication.

Two primary access types:

```text
LAND OWNER
    |
    v
User Module

OFFICER
    |
    v
Officer Module
```

Authorization should ensure:

### Land Owner

Can access only their own:

- Documents
- Applications
- Land records
- Correction requests

### Officer

Can access records assigned/available to their authorized officer scope.

Do not rely only on frontend route protection.

Database-level authorization must also be enforced.

---

# 14. Supabase Storage

Supabase Storage will store original uploaded documents.

Example:

```text
documents/
  user/{userId}/
    {documentId}/
      original.pdf
      pages/
```

The exact storage structure can change during implementation.

Important principle:

> The original source document must be preserved and linked to the corresponding land record.

The application should never replace the original document with extracted data.

---

# 15. Database Security

Use PostgreSQL Row Level Security (RLS) through Supabase.

### Land Owner

Should only access records belonging to them.

### Officer

Should only access records permitted by their role/scope.

### Sensitive operations

Approval, rejection and record modification should be protected by authenticated backend workflows and authorization checks.

Do not depend solely on hidden UI buttons for security.

---

# 16. API Communication

The normal application flow should be:

```text
React / Next.js
      |
      | HTTPS
      v
FastAPI
      |
      +---- Supabase
      |
      +---- Sarvam AI Vision
```

The frontend should consume stable application-level API responses rather than depending directly on raw AI responses.

---

# 17. Data Contract Principle

The AI model response should be normalized before reaching the UI.

Avoid:

```text
Frontend → Raw AI Response
```

Prefer:

```text
Frontend
   ↓
FastAPI
   ↓
AI Response
   ↓
Normalization
   ↓
Application Data Model
   ↓
Frontend
```

This ensures that the frontend remains independent of the specific AI model.

If the AI provider changes later, the UI should not need to be redesigned.

---

# 18. Land Record Data Model

A simplified application-level record can look like:

```text
Land Record
├── id
├── ownerName
├── surveyNumber
├── khasraNumber
├── khataNumber
├── area
├── areaUnit
├── village
├── tehsil
├── district
├── landClassification
├── ownershipDetails
├── mutationDetails
├── registrationDetails
├── status
├── createdAt
└── updatedAt
```

Extraction metadata can be stored separately where appropriate.

---

# 19. Verification Data Model

The verification workflow should preserve the distinction between:

```text
Source Value
     ↓
AI Extracted Value
     ↓
Officer Corrected Value
     ↓
Verified Value
```

Do not silently overwrite values.

A verification action should capture:

```text
recordId
officerId
field
previousValue
newValue
reason
timestamp
```

This supports traceability and auditability.

---

# 20. Application Status Model

Recommended states:

```text
UPLOADED
    ↓
PROCESSING
    ↓
EXTRACTED
    ↓
VALIDATION
    ↓
PENDING_VERIFICATION
    ↓
UNDER_REVIEW
    ├──→ VERIFIED
    │
    └──→ REJECTED
```

A rejected record may later return to the workflow if the land owner submits corrected information.

---

# 21. GIS

GIS is a supporting part of the application.

Use:

- PostgreSQL/PostGIS where spatial storage is required
- Leaflet / React-Leaflet for visualization

The GIS layer should eventually support:

- Survey/parcel visualization
- Location lookup
- Village/tehsil/district context
- Verified land-record mapping

For the initial UI, use sample map/parcel data.

---

# 22. Frontend-to-Backend Responsibilities

## Next.js / React / TypeScript

Responsible for:

- UI
- Navigation
- Forms
- Tables
- Document upload interface
- Officer verification interface
- Status display
- Map interface
- Client-side interaction

## FastAPI / Python

Responsible for:

- API
- Application workflow
- AI integration
- Extraction processing
- Validation
- Normalization
- Authorization-sensitive operations
- Database interaction

## Sarvam AI Vision

Responsible for:

- Document/image understanding
- Information extraction

## Supabase

Responsible for:

- Authentication
- Persistent relational data
- Document storage
- Authorization policies

---

# 23. Current UI Phase

The UI can use mock responses for:

```text
AI Extraction
Confidence
Validation
Duplicate Detection
Reference Database Checks
```

Example mock response:

```json
{
  "ownerName": {
    "value": "Ramesh Patil",
    "confidence": 0.97
  },
  "surveyNumber": {
    "value": "124/2",
    "confidence": 0.99
  },
  "area": {
    "value": "2.45",
    "unit": "Hectare",
    "confidence": 0.91
  },
  "mutationNumber": {
    "value": "58?1",
    "confidence": 0.58
  }
}
```

The UI should behave exactly as it would with real backend data.

Later, replace the mock service with FastAPI endpoints.

---

# 24. Environment Variables

Secrets must remain server-side.

Potential variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY

SUPABASE_SERVICE_ROLE_KEY

SARVAM_API_KEY

SARVAM_API_URL
```

Only variables explicitly intended for the browser should use the `NEXT_PUBLIC_` prefix.

Never expose:

```text
SARVAM_API_KEY
SUPABASE_SERVICE_ROLE_KEY
```

to the client.

---

# 25. Error Handling

The system should handle:

### Upload errors

```text
Unable to upload document.
Please try again.
```

### AI processing errors

```text
We couldn't process this document.
Please try again or submit the record for manual review.
```

### Database errors

```text
We couldn't save the record.
Please try again.
```

### Validation errors

Show field-specific explanations rather than generic errors.

---

# 26. Security Principles

The application handles sensitive land and ownership information.

Minimum principles:

- Server-side secret management
- Supabase RLS
- Authenticated API requests
- Role-based authorization
- Secure document access
- Audit logging for important actions
- No AI API keys in frontend code
- No direct browser access to privileged backend operations
- Validate uploaded files
- Restrict unauthorized record access

---

# 27. Development Architecture

Recommended project separation:

```text
project/
│
├── frontend/
│   ├── Next.js
│   ├── React
│   └── TypeScript
│
├── backend/
│   ├── FastAPI
│   ├── Python
│   ├── AI integration
│   ├── Validation
│   └── API
│
└── database/
    └── Supabase PostgreSQL
```

A monorepo can also be used if preferred.

The important requirement is clear separation between frontend and backend responsibilities.

---

# 28. Why This Stack

## Next.js + React + TypeScript

Provides:

- Modern component-based UI
- Strong routing
- Type safety
- Good developer experience
- Suitable structure for the two user modules

## Python + FastAPI

Provides:

- Clean API layer
- Strong ecosystem for AI/document processing
- Easy integration with AI services
- Clear separation from the frontend

## Sarvam AI Vision

Provides the planned AI/vision capability for Indian document processing and extraction.

The implementation should be based on the model/API capabilities available to the project at integration time.

## Supabase PostgreSQL

Provides:

- PostgreSQL database
- Authentication
- Storage
- Row Level Security
- Rapid development

This reduces infrastructure complexity while retaining PostgreSQL as the core relational database.

---

# 29. Architecture Principle

Keep the system modular:

```text
                 FRONTEND
          Next.js / React / TS
                    |
                    v
                 FASTAPI
                    |
        +-----------+-----------+
        |                       |
        v                       v
   SUPABASE              SARVAM AI VISION
        |
        +---- PostgreSQL
        |
        +---- Storage
        |
        +---- Auth
```

The AI provider must remain behind the FastAPI service.

The database must remain independent of the AI provider.

The frontend must remain independent of the AI provider.

This makes the system easier to maintain and replace/upgrade later.

---

# 30. Final Technology Stack

```text
Frontend
├── Next.js
├── React
└── TypeScript

Backend
├── Python
└── FastAPI

AI
└── Sarvam AI Vision Model

Database / Backend Platform
└── Supabase
    ├── PostgreSQL
    ├── Auth
    └── Storage

GIS
├── PostGIS
└── Leaflet / React-Leaflet
```

The stack is intentionally focused on the actual product requirements and avoids unnecessary infrastructure.

---

# 31. Current Implementation Priority

### Phase 1 — UI

```text
Next.js
React
TypeScript
```

Build:

- Land Owner module
- Officer module
- Upload UI
- Extraction review UI
- Verification queue
- Verification workspace
- Record history
- GIS interface

Use mock data.

### Phase 2 — Backend

```text
Python
FastAPI
Supabase
```

Build:

- Authentication integration
- Document APIs
- Land-record APIs
- Verification APIs
- Database persistence
- File storage

### Phase 3 — AI

```text
FastAPI
   ↓
Sarvam AI Vision
   ↓
Extraction
   ↓
Normalization
   ↓
Validation
   ↓
Officer Verification
```

This allows the UI team to progress independently while keeping a clean path to the real AI pipeline.

---

# 32. Technology Decision

The final selected stack is:

> **Next.js + React + TypeScript + Python + FastAPI + Sarvam AI Vision + Supabase PostgreSQL**

This stack is suitable for the proposed land-record application because it separates:

**User Experience → Backend/API → AI Processing → Persistent Government-oriented Data**

while keeping the initial implementation manageable for the project team.
