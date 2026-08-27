# Product Requirements Document (PRD)

# Intelligent Land Record Digitization & Validation System

**Problem Statement ID:** 26018  
**Organization:** Ministry of Rural Development  
**Department:** Department of Land Resources (DoLR)  
**Category:** Software  
**Theme:** Smart Automation

---

## 1. Product Overview

The Intelligent Land Record Digitization & Validation System is an AI-assisted digital platform for converting legacy land documents into structured land records and supporting a controlled verification workflow.

The system allows a **land owner** to upload land documents, review extracted information, correct proposed values, view validation flags, submit a verification request, track its status, and view verified land records.

An authorized **officer** receives verification requests, reviews the original document alongside extracted information, checks confidence and validation results, manually verifies or corrects information, and either approves or rejects the record.

After approval, the verified record is stored and can later be integrated with Land Records Management Systems (LRMS), DILRMP systems and GIS platforms.

### Core principle

> **Document → Extraction → Validation → Officer Verification → Verified Record → Integration**

---

# 2. Current Product Scope

The current implementation is focused on the **UI and application workflow**.

### Current technology

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
- Supabase PostgreSQL
- Supabase Auth
- Supabase Storage
- PostGIS where GIS data is required
- Leaflet / React-Leaflet
- Recharts
- Lucide React

### Current implementation approach

AI extraction and validation results should initially be represented with realistic mock data.

The UI must be designed so that real AI/validation services can be connected later without changing the core user workflow.

### Out of current scope

- OCR implementation
- Handwriting recognition
- NLP implementation
- Computer vision models
- PyTorch/Hugging Face model implementation
- AI training
- Real confidence-model implementation
- Production validation algorithms
- Government API integration
- Deployment infrastructure
- Docker/Kubernetes
- Blockchain
- Additional user modules such as separate operator/admin modules

---

# 3. Problem

Historical Indian land records exist in:

- Handwritten registers
- Scanned documents
- Photographs
- PDFs
- Legacy records
- Maps and cadastral records

These records can contain poor image quality, faded text, damaged pages, handwritten annotations, inconsistent formats, multiple regional languages, missing information, duplicate records and conflicting information.

Manual digitization and verification are slow and error-prone.

The proposed system aims to reduce manual effort while ensuring that uncertain information is reviewed by an authorized officer before becoming a verified record.

---

# 4. Product Objectives

The system should:

1. Allow land owners to submit land documents digitally.
2. Extract relevant land-record information.
3. Present extracted information in predefined fields.
4. Allow land owners to review extracted information.
5. Allow land owners to propose corrections before verification.
6. Validate extracted information using business rules and available reference data.
7. Generate understandable flags for missing, inconsistent, duplicate or low-confidence information.
8. Allow land owners to submit records for officer verification.
9. Allow officers to review original documents and extracted information together.
10. Allow officers to manually correct and verify information.
11. Allow officers to approve or reject records.
12. Store approved records securely.
13. Preserve original documents and metadata.
14. Maintain record history and audit information.
15. Provide a foundation for future LRMS, DILRMP and GIS integration.

---

# 5. User Roles

There are exactly **two primary application modules**.

## 5.1 Land Owner Module

The land owner can:

- Register/login
- Upload documents
- View extracted information
- Edit proposed extracted information
- View validation flags
- Submit verification requests
- Track request status
- View verified land records
- Submit correction requests

The land owner cannot:

- Approve a record
- Verify an official record
- Directly modify the authoritative verified record
- Resolve conflicts
- Change verification status

The land owner is responsible for:

> **Submit → Review → Correct → Request Verification → Track → View**

---

## 5.2 Admin / Officer Module

The authorized officer can:

- Login
- View dashboard
- View new verification requests
- View uploaded documents
- View extracted land details
- Review confidence scores
- Review validation flags
- Compare source documents with extracted information
- Edit/correct extracted fields
- Add remarks
- Approve records
- Reject records
- View record history
- View verified records on GIS

The officer is responsible for:

> **Receive → Review → Verify → Approve/Reject → Update Record**

For the current product, Admin/Officer is treated as one module. Do not create separate operator or administrator modules.

---

# 6. End-to-End Workflow

## Land Owner Workflow

```text
Login / Register
      ↓
Upload Document
      ↓
Information Extraction
      ↓
Preview Extracted Information
      ↓
Edit Details if Required
      ↓
Business Rules & Validation
      ↓
Generate Flags
      ↓
Submit Verification Request
      ↓
Track Request Status
      ↓
View My Land Records
```

## Officer Workflow

```text
Officer Login
      ↓
Dashboard
      ↓
New Verification Request
      ↓
View Uploaded Document
      +
View Extracted Land Details
      ↓
Review Confidence + Validation Flags
      ↓
Manual Verification if Required
      ↓
      ┌───────────────┐
      ↓               ↓
   Approve         Reject
      ↓               ↓
Update/Store      Add Remarks
Land Record       ↓
      ↓           Send Back
Land Record       to Land Owner
Database
```

---

# 7. Land Owner Functional Requirements

## FR-01 — Registration and Login

The land owner shall be able to register and authenticate.

The system shall provide:

- Registration
- Login
- Logout
- Session handling
- Basic profile

Authentication should use Supabase Auth.

---

## FR-02 — Land Owner Dashboard

The dashboard shall show:

- Number of submitted records
- Number under verification
- Number verified
- Recent requests
- Current request status

Example:

| Submitted | Under Verification | Verified |
|---:|---:|---:|
| 3 | 1 | 2 |

The dashboard should prioritize status visibility rather than excessive analytics.

---

## FR-03 — Document Upload

The land owner shall be able to upload:

- PDF
- JPG
- PNG

The upload interface shall show:

- File name
- File size
- File type
- Upload status
- Submission date

Uploaded files shall be stored using Supabase Storage.

---

## FR-04 — Extraction Preview

After document processing, the system shall display extracted land information.

Example fields:

- Land owner
- Survey number
- Khasra number
- Khata number
- Plot/land area
- Village
- Tehsil
- District
- Land classification
- Ownership details
- Mutation details
- Registration information

During the UI phase, extraction results shall use mock data.

---

## FR-05 — Proposed Corrections

The land owner shall be able to edit extracted information before submitting a verification request.

Example:

```text
Extracted Survey Number:
124/7

Land Owner Correction:
124/2
```

These changes are **proposed values** and must not directly alter the authoritative land record.

---

## FR-06 — Validation Results

The system shall display validation results after extraction/editing.

Possible results:

- Valid
- Missing information
- Inconsistency
- Low confidence
- Duplicate
- Conflict

The UI must explain the reason for a flag.

Example:

> Survey number does not match the available reference information.

---

## FR-07 — Submit Verification Request

The land owner shall be able to submit the record after reviewing the extracted information.

Once submitted:

**Status = Under Verification**

The request becomes available to the officer.

---

## FR-08 — Track Request

The land owner shall be able to view the request lifecycle:

```text
Submitted
   ↓
Processing
   ↓
Validation
   ↓
Under Verification
   ↓
Verified / Rejected
```

If rejected, the land owner shall be able to view the officer's reason and remarks.

---

## FR-09 — View Verified Land Records

After approval, the land owner shall be able to view:

- Record ID
- Owner
- Survey number
- Khasra number
- Khata number
- Area
- Village
- Tehsil
- District
- Land classification
- Verification status
- Verification date

The verified record shall not be directly editable.

---

## FR-10 — Correction Request

The land owner shall be able to request a correction to a verified record.

The request shall include:

- Field
- Existing value
- Requested value
- Reason
- Optional supporting document

Status:

```text
Submitted
   ↓
Under Review
   ↓
Resolved / Rejected
```

---

# 8. Officer Functional Requirements

## FR-11 — Officer Authentication

The officer shall authenticate through the officer login.

Only authorized officers should access the officer module.

---

## FR-12 — Officer Dashboard

The dashboard shall show:

- Pending verification
- Verified today
- Conflicts
- Low-confidence records

Example:

```text
Pending Verification       128
Verified Today              46
Conflicts                    12
Low Confidence               19
```

---

## FR-13 — Verification Queue

The officer shall see records requiring attention.

Columns should include:

- Record ID
- Owner
- Survey number
- Confidence
- Issue
- Status
- Action

Filters:

- All
- Pending
- Low Confidence
- Conflicts
- Verified
- Rejected

Search:

- Record ID
- Owner
- Survey number
- Village

---

# 9. Verification Workspace

The verification workspace is the **central screen of the application**.

It shall provide a side-by-side comparison:

```text
┌─────────────────────────┬──────────────────────────────┐
│ Original Document       │ Extracted Information       │
│                         │                              │
│ Document Viewer         │ Owner: Ramesh Patil   97%   │
│                         │ Survey: 124/2         99%   │
│                         │ Area: 2.45 Ha         91%   │
│                         │ Mutation: 58?1         58% ⚠│
└─────────────────────────┴──────────────────────────────┘
```

The officer shall be able to:

- View original document
- View extracted information
- View confidence
- View validation results
- View flags
- Edit fields
- Add remarks
- Approve
- Reject

---

# 10. Confidence Display

The UI should support field-level confidence.

Example:

```text
Owner             Ramesh Patil       97%
Survey Number     124/2              99%
Area              2.45 Ha            91%
Mutation Number   58?1               58% ⚠
```

Initial UI thresholds:

- High: ≥ 90%
- Medium: 70–89%
- Low: < 70%

These are only UI thresholds for the prototype and must eventually be calibrated using evaluation data.

---

# 11. Validation Flags

The officer should see clear validation results.

Examples:

### Passed

> ✓ Survey number format is valid.

### Warning

> ⚠ Mutation number has low extraction confidence.

### Conflict

> ⚠ Survey number does not match reference data.

### Duplicate

> ⚠ A potentially matching record already exists.

The system must never hide important conflicts.

---

# 12. Manual Verification

The officer shall be able to correct extracted information.

Example:

```text
AI Extracted:
58?1

Officer Verified:
5821
```

The system shall preserve:

- Original AI value
- Officer-corrected value
- Officer identity
- Timestamp
- Remarks

The AI value must not be silently overwritten.

---

# 13. Approval

When the officer confirms the information:

```text
[Approve Record]
```

The system shall:

1. Change status to Verified.
2. Store the verified record.
3. Store the officer action.
4. Preserve the document.
5. Preserve verification history.
6. Make the record available to the land owner.
7. Make the record available to future integration layers.

---

# 14. Rejection

When the officer rejects a record:

```text
[Reject Record]
```

The officer must provide a reason or remark.

Example:

```text
Reason:
Insufficient document quality

Remarks:
Please upload a clearer copy of page 2.
```

The record shall be returned to the land owner with the appropriate status.

---

# 15. Land Record Database

The database shall store structured verified land information.

Core information includes:

```text
Record ID
Owner
Survey Number
Khasra Number
Khata Number
Area
Village
Tehsil
District
Land Classification
Ownership
Mutation
Registration
Verification Status
Verification Date
```

Suggested Supabase tables:

```text
profiles
documents
land_records
verification_requests
verification_actions
correction_requests
audit_logs
```

Keep the database schema simple during the UI-focused phase.

---

# 16. Document Storage

Original documents shall be retained.

Storage should contain:

- Original file
- File metadata
- Upload information
- Related record ID
- Verification information

The original source document must remain available for verification and provenance.

---

# 17. Record History

The system should display a timeline.

Example:

```text
26 Aug 2026
Document uploaded

26 Aug 2026
Information extracted

26 Aug 2026
Validation completed

26 Aug 2026
Verification requested

27 Aug 2026
Officer corrected mutation number

27 Aug 2026
Record verified
```

---

# 18. GIS Module

GIS is part of the eventual verified-record workflow.

The system shall provide a map interface using sample data during the UI phase.

The map may display:

- Survey number
- Parcel
- Village
- Area
- Record status

Example:

```text
Verified Record
      ↓
Survey / Location
      ↓
GIS Map
      ↓
Parcel Information
```

Actual authoritative cadastral geometry and government GIS integration are future scope.

---

# 19. Integration Layer

The architecture shall leave room for future integration with:

### LRMS
Land Records Management System

### DILRMP
Digital India Land Records Modernization Programme

### GIS platforms

The current UI shall use mock/local data where required.

Do not claim live government integration unless authorized APIs are actually available.

---

# 20. Record Lifecycle

```text
UPLOADED
    ↓
EXTRACTED
    ↓
REVIEWED BY LAND OWNER
    ↓
VALIDATED
    ↓
VERIFICATION REQUESTED
    ↓
OFFICER REVIEW
    │
    ├───────────────┐
    ↓               ↓
APPROVED         REJECTED
    ↓               ↓
VERIFIED        SENT BACK TO
    ↓            LAND OWNER
DATABASE
    ↓
FUTURE INTEGRATION
```

---

# 21. Data Ownership and Authority

This rule must be reflected throughout the product.

### Land Owner

**Submit and propose corrections**

### Automated System

**Extract, normalize, validate and flag**

### Officer

**Review, correct, verify, approve or reject**

### Verified Database

**Stores the approved application record**

A land owner must never be able to directly modify an authoritative verified record.

---

# 22. UI Design Requirements

The application belongs to the **Ministry of Rural Development / Department of Land Resources**.

The visual design must therefore be:

> **Minimalist, official, accessible, trustworthy and information-first.**

### Visual language

Use:

- White/light-gray backgrounds
- Deep navy/government blue
- Very restrained saffron/orange accent
- Green for verified
- Amber for review
- Red for conflict/rejection
- Noto Sans typography
- Simple borders
- Minimal shadows
- Moderate corner radius

Avoid:

- Gradients
- Glassmorphism
- Neon colors
- Excessive animations
- Futuristic AI graphics
- Excessive cards
- Generic startup SaaS styling
- Overloaded dashboards

The product should feel like a realistic government digital service.

---

# 23. Main User Screens

## Land Owner

1. Login
2. Registration
3. Dashboard
4. Upload Document
5. Extraction Preview
6. Edit Extracted Information
7. Validation Results
8. Submit Verification
9. Application Status
10. My Land Records
11. Land Record Details
12. Correction Request

## Officer

1. Officer Login
2. Dashboard
3. Verification Queue
4. Verification Workspace
5. Record Details
6. Record History
7. GIS Map

---

# 24. Current UI Mock Data

The UI should include realistic examples covering different states.

At minimum:

### Record 1 — High confidence

```text
Owner: Amit Sharma
Survey: 128/1
Confidence: 96%
Status: Pending Verification
```

### Record 2 — Low confidence

```text
Owner: Ramesh Patil
Survey: 124/2
Mutation: 58?1
Confidence: 58%
Status: Needs Review
```

### Record 3 — Conflict

```text
Survey: 125/4
Reference: 125/7
Status: Conflict
```

### Record 4 — Verified

```text
Owner: Suresh Kumar
Survey: 131/2
Status: Verified
```

### Record 5 — Rejected

```text
Status: Rejected
Reason: Insufficient document quality
```

This allows the UI to demonstrate the complete workflow.

---

# 25. Non-Functional Requirements

## Usability

The system should be:

- Easy to understand
- Consistent
- Accessible
- Responsive
- Suitable for users with varying technical literacy

## Performance

UI pages should load quickly and avoid unnecessary network requests.

## Security

Use Supabase Auth and Row Level Security appropriately.

Users must only access records they are authorized to see.

## Auditability

Important verification and correction actions should be recorded.

## Maintainability

Use reusable components and clear separation between:

- UI
- data access
- mock services
- business workflow

---

# 26. MVP Acceptance Criteria

The prototype is successful when the following complete journey works:

## Land Owner

```text
Login
 ↓
Upload document
 ↓
View extracted information
 ↓
Edit proposed information
 ↓
View validation flags
 ↓
Submit verification request
 ↓
Track status
```

## Officer

```text
Login
 ↓
Receive verification request
 ↓
Open record
 ↓
View original document
 ↓
View extracted information
 ↓
View confidence
 ↓
View validation flags
 ↓
Correct if required
 ↓
Approve OR Reject
```

## After Approval

```text
Verified Record
 ↓
Land Record Database
 ↓
Land Owner can view record
 ↓
GIS / external integration foundation
```

---

# 27. Success Criteria

The UI should demonstrate that the system can clearly communicate:

1. What document the land owner submitted.
2. What information was extracted.
3. What information may be uncertain.
4. What validation issues were detected.
5. Why officer verification is required.
6. What the officer changed.
7. Whether the record was approved or rejected.
8. What the final verified record contains.
9. How the record can eventually connect to GIS and government systems.

The most important screen is the **Officer Verification Workspace**, because it demonstrates the central value proposition:

> **Original document → Extracted information → Confidence → Validation → Human verification → Trusted land record.**
