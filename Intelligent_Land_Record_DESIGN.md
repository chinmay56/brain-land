# DESIGN.md
# Intelligent Land Record Digitization & Validation System

**Problem Statement:** 26018  
**Organization:** Ministry of Rural Development, Government of India  
**Department:** Department of Land Resources (DoLR)  
**Product Type:** Government land-record digitization and verification platform

---

## 1. Design Objective

Create a **minimal, trustworthy, accessible and government-grade digital product** for the Department of Land Resources.

The interface should feel like a real Government of India digital service rather than a startup SaaS product or an AI showcase.

The design should communicate:

> **Trust • Simplicity • Transparency • Accessibility • Official Use**

The Department of Land Resources' stated mission includes transparent Land Records Management and an Integrated Land Information Management System, so the product should emphasize clarity, traceability and reliable information rather than visual novelty.

---

# 2. Design Reference

Use the visual language of existing Government of India / Department of Land Resources digital services as inspiration, but **do not copy the existing website layout**.

The current DoLR website uses a structured government-information hierarchy with clear departmental identity, navigation, content sections and service/program information.

Reference:

- Department of Land Resources: https://dolr.gov.in/
- Ministry of Rural Development: https://rural.gov.in/

The new product should be a **modern application interface** while retaining the visual seriousness and restraint expected from a government platform.

---

# 3. Product Scope

There are only **two application modules**.

## Module 1 — Land Owner

The land owner can:

- Login / register
- Upload land documents
- View extracted information
- Edit proposed extracted information
- View validation flags
- Submit verification requests
- Track request status
- View verified land records
- Request corrections

## Module 2 — Admin / Officer

The officer can:

- Login
- View verification dashboard
- View new verification requests
- Review uploaded documents
- View extracted land details
- View confidence information
- View validation flags
- Manually verify/correct fields
- Approve records
- Reject records
- Add remarks
- View record history
- View GIS information

Do **not** create separate Operator, Super Admin or other modules in the current product.

---

# 4. Current Development Scope

This phase focuses on **UI and user experience**.

### Use

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Supabase
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- PostGIS where required
- Leaflet / React-Leaflet
- Recharts
- Lucide React

### Mock for now

- OCR results
- AI extraction
- Confidence scores
- Validation results
- Duplicate detection
- Database verification
- GIS parcel data

### Do not implement yet

- OCR
- HTR
- NLP
- Computer vision
- AI models
- AI training
- Real validation engine
- Government APIs
- Production deployment
- Blockchain
- Complex microservices

The UI must be designed so these can be connected later.

---

# 5. Design Philosophy

## 5.1 Minimal Government Digital

The interface should be:

- Clean
- Formal
- Calm
- Information-first
- Easy to scan
- Accessible
- Consistent
- Professional

It should **not** look:

- Futuristic
- Flashy
- AI-heavy
- Consumer-oriented
- Gaming-inspired
- Like a generic SaaS admin template

---

# 6. Visual Identity

## Primary Color

Use a **deep government blue/navy** as the primary interface color.

Use it for:

- Primary navigation
- Main headings where appropriate
- Primary buttons
- Active navigation
- Links
- Focus states

Do not make the entire interface blue.

---

## Accent Color

Use a **restrained saffron/orange accent**.

Use it only for:

- Important highlights
- Selected indicators
- Attention states where appropriate

Do not use saffron as a large background color.

---

## Status Colors

### Verified

Green

Use for:

- Verified
- Approved
- Successful

### Pending / Review

Amber

Use for:

- Pending
- Needs review
- Low confidence

### Conflict / Rejected

Red

Use for:

- Conflict
- Rejected
- Failed

### Neutral

Gray

Use for:

- Draft
- Uploaded
- Processing
- Disabled

Always combine color with:

- Text
- Icon
- Status label

Never communicate status using color alone.

---

# 7. Backgrounds

Primary application background:

```text
#FFFFFF
```

Secondary background:

```text
#F7F8FA
```

Use light gray surfaces to separate sections.

Avoid:

- Dark dashboards
- Gradients
- Decorative backgrounds
- Textured backgrounds

---

# 8. Borders and Shadows

Use borders more than shadows.

Preferred:

```text
1px solid #E5E7EB
```

Cards should have:

- Thin border
- Very subtle shadow only where necessary
- Small/moderate radius

Avoid floating-card overload.

The interface should feel like a **structured government application**, not a collection of floating SaaS cards.

---

# 9. Border Radius

Use moderate radius:

- Buttons: 6–8px
- Inputs: 6–8px
- Cards: 8–10px
- Modals: 10–12px

Avoid excessive pill-shaped components.

Pills should primarily be used for status badges.

---

# 10. Typography

Primary font:

**Noto Sans**

Reason:

The platform may eventually handle multiple Indian languages, so typography must support multilingual content.

Recommended hierarchy:

```text
Application title     28–32px
Page heading          24–28px
Section heading       18–20px
Body                  14–16px
Table text            13–14px
Metadata              12–13px
```

Typography should prioritize readability over visual style.

Use appropriate Noto Sans Indic fonts for supported regional languages.

---

# 11. Government Header

The header should be restrained.

Recommended structure:

```text
┌─────────────────────────────────────────────────────────────┐
│ Government of India                                        │
│ Ministry of Rural Development                              │
│ Department of Land Resources                    User ▾     │
└─────────────────────────────────────────────────────────────┘
```

Then application identity:

```text
Intelligent Land Record
Digitization & Validation System
```

Do not create a huge hero banner.

Do not invent an official government emblem if the correct asset is unavailable.

If the official emblem/logo is supplied, use it according to the provided asset/usage requirements.

---

# 12. Application Shell

## Officer Desktop

```text
┌──────────────────────────────────────────────────────────────┐
│ Government / Department Identity                 Officer ▾   │
├───────────────┬──────────────────────────────────────────────┤
│               │                                              │
│ Dashboard     │                                              │
│ Records       │                 Main Content                 │
│ Verification  │                                              │
│ GIS Map       │                                              │
│               │                                              │
│               │                                              │
└───────────────┴──────────────────────────────────────────────┘
```

The sidebar should be compact.

Use icons with labels.

Do not use icon-only navigation for primary functions.

---

# 13. Land Owner Navigation

Keep citizen navigation simple:

```text
Dashboard
My Applications
My Land Records
Upload Document
Help
```

Optional account menu:

```text
Profile
Language
Logout
```

The citizen should not see officer functions.

---

# 14. Officer Navigation

Use:

```text
Dashboard
Verification
Records
GIS Map
```

Optional:

```text
Profile
Help
Logout
```

Do not add unnecessary analytics or administrative navigation.

---

# 15. Land Owner Dashboard

The dashboard should answer:

> "What is happening with my land records?"

Top summary:

```text
My Land Records

Submitted       Under Verification       Verified
   03                   01                   02
```

Then:

### Recent Applications

```text
┌────────────────────────────────────────────────────────────┐
│ Record ID │ Document Type │ Date       │ Status           │
├────────────────────────────────────────────────────────────┤
│ LR-1024   │ Land Register │ 27 Aug     │ Under Review     │
│ LR-1023   │ Mutation      │ 25 Aug     │ Verified         │
└────────────────────────────────────────────────────────────┘
```

Avoid excessive charts for citizens.

---

# 16. Land Owner Upload Screen

The upload screen should be simple and reassuring.

```text
Upload Land Record

Upload your scanned land record, photograph or PDF.

┌────────────────────────────────────────────┐
│                                            │
│          Upload document                   │
│                                            │
│       Drag and drop or Browse              │
│                                            │
│       PDF, JPG, PNG                        │
│                                            │
└────────────────────────────────────────────┘

[Continue]
```

After upload:

```text
Document
land-record-124.pdf

File size
2.4 MB

Pages
8

Status
Uploaded
```

Do not expose technical AI terminology at this stage.

---

# 17. Land Owner Extraction Review

The land owner should see extracted information in a simple form.

```text
Review Land Information

Land Owner
Ramesh Patil

Survey Number
124/2

Khasra Number
K-4821

Khata Number
KH-1024

Area
2.45 Hectare

Village
ABC

Tehsil
XYZ

District
Pune
```

Allow:

```text
[Edit]
```

The UI should clearly state:

> "Please review the information before submitting for verification."

---

# 18. Land Owner Validation Screen

Show only information useful to the citizen.

Example:

```text
Review Results

✓ Required information available
✓ Survey number format valid
⚠ Mutation number requires verification

You can submit this record for officer verification.
```

Avoid exposing internal model terminology.

---

# 19. Verification Request

Primary action:

```text
[Submit for Verification]
```

After submission:

```text
Verification Request Submitted

Record ID
LR-1021

Status
Under Verification

Submitted
27 Aug 2026
```

---

# 20. Status Tracker

Use a simple horizontal/vertical timeline.

```text
Submitted
   ✓
   │
Processing
   ✓
   │
Validation
   ✓
   │
Officer Verification
   ●
   │
Verified
   ○
```

If rejected:

```text
Officer Verification
        ✕
        │
Rejected

Reason:
Document quality insufficient.
```

---

# 21. Officer Dashboard

The officer dashboard should be information-dense but restrained.

Top summary:

```text
Verification Overview

Pending Verification     128
Verified Today            46
Conflicts                  12
Low Confidence             19
```

Use simple bordered statistic blocks rather than colorful cards.

---

# 22. Verification Queue

Primary table:

```text
┌─────────┬──────────────┬───────────┬─────────────┬───────────┐
│ Record  │ Owner        │ Survey    │ Confidence │ Status    │
├─────────┼──────────────┼───────────┼─────────────┼───────────┤
│ LR-1021 │ Ramesh Patil │ 124/2     │ 71%        │ Review    │
│ LR-1022 │ Suresh Kumar │ 125/4     │ 58%        │ Conflict  │
│ LR-1023 │ Amit Sharma  │ 128/1     │ 94%        │ Review    │
└─────────┴──────────────┴───────────┴─────────────┴───────────┘
```

Filters:

```text
All
Pending
Low Confidence
Conflicts
Verified
Rejected
```

Search:

```text
Search record ID, owner, survey number...
```

---

# 23. Officer Verification Workspace

This is the **most important screen in the entire product**.

The visual hierarchy must make the verification process obvious.

```text
← Back to Verification Queue

Land Record LR-1021
Needs Verification

┌──────────────────────────┬─────────────────────────────────┐
│                          │ Extracted Information           │
│ ORIGINAL DOCUMENT        │                                 │
│                          │ Land Owner                      │
│ [Document Viewer]        │ Ramesh Patil            97%     │
│                          │                                 │
│ Page 1 of 8              │ Survey Number                   │
│                          │ 124/2                   99%     │
│                          │                                 │
│                          │ Area                            │
│                          │ 2.45 Hectare            91%     │
│                          │                                 │
│                          │ Mutation Number                 │
│                          │ 58?1                    58% ⚠   │
└──────────────────────────┴─────────────────────────────────┘
```

Below:

```text
Validation Results

✓ Survey number format valid
✓ Village consistency passed
⚠ Mutation number requires review
⚠ Existing record requires attention
```

Bottom actions:

```text
[Reject Record]                         [Approve Record]
```

---

# 24. Document Viewer

The original document is evidence.

The viewer should support:

- Page navigation
- Zoom
- Fit to width
- Full screen
- Page number
- Basic rotation if required

Keep controls minimal.

Do not clutter the viewer with AI decorations.

---

# 25. Field Confidence

Display confidence beside fields.

Example:

```text
Land Owner             Ramesh Patil       97%
Survey Number          124/2              99%
Area                   2.45 Ha            91%
Mutation Number        58?1               58% ⚠
```

Confidence should be visually secondary to the actual value.

The officer needs to read:

**Value first → confidence second → action third**

---

# 26. Validation Results

Validation messages must be understandable.

Bad:

```text
Validation Engine: FAILED
```

Good:

```text
⚠ Survey number mismatch

Extracted value:
124/2

Reference value:
124/7

Action:
Verify against the source document.
```

The interface should explain the reason for the warning.

---

# 27. Officer Editing

When editing an extracted value, show the change.

```text
Mutation Number

AI Extracted
58?1

Officer Correction
5821

Reason / Remark
Verified against original document.
```

Do not silently overwrite AI values.

---

# 28. Approval

Approval should be deliberate.

Button:

```text
Approve Record
```

Before approval, show a compact confirmation:

```text
Confirm Verification

You are approving this land record as verified.

[Cancel]     [Confirm Verification]
```

Do not use dramatic warning modals.

---

# 29. Rejection

Reject requires a reason.

```text
Reject Record

Reason
[ Select reason ]

Remarks
[________________________________]

[Cancel]      [Reject Record]
```

Possible reasons:

- Insufficient document quality
- Information mismatch
- Missing information
- Duplicate record
- Unable to verify
- Other

---

# 30. Record History

Use a clean timeline.

```text
27 Aug 2026
Document uploaded

27 Aug 2026
Information extracted

27 Aug 2026
Validation completed

27 Aug 2026
Verification requested

28 Aug 2026
Officer correction made

28 Aug 2026
Record verified
```

History should be easy to scan.

---

# 31. GIS Design

GIS should remain visually minimal.

Layout:

```text
┌──────────────────────────────────────────────────────────┐
│ Search survey number / village                           │
├──────────────────────────────────────────────────────────┤
│                                                          │
│                         MAP                              │
│                                                          │
│                 ┌────────────┐                           │
│                 │   124/1    │                           │
│          ┌──────┴────────────┴─────┐                     │
│          │         124/2           │                     │
│          └──────────────────────────┘                     │
│                                                          │
├──────────────────────────────────────────────────────────┤
│ Selected Parcel                                          │
│ Survey No. 124/2                                        │
│ Owner: Ramesh Patil                                     │
│ Area: 2.45 Hectare                                      │
│ Status: Verified                                        │
└──────────────────────────────────────────────────────────┘
```

Use sample geometry during prototype development.

Do not represent sample geometry as authoritative cadastral data.

---

# 32. Tables

Tables are a major component of the officer experience.

Rules:

- Strong column headers
- Thin row separators
- Comfortable row height
- Minimal color
- Sticky header for long tables
- Pagination where required
- Search/filter above the table
- Clear empty states

Avoid putting every piece of information into a table.

Use detail pages for complex records.

---

# 33. Forms

Forms should be simple and structured.

Each field should have:

```text
Label
Input
Optional helper text
Error / validation message
```

Never use placeholder text as the only label.

Use clear language such as:

- Land Owner Name
- Survey Number
- Area
- Village
- Tehsil
- District

---

# 34. Status Badges

Use compact status badges.

Examples:

```text
✓ Verified
⚠ Needs Review
! Conflict
○ Pending
× Rejected
```

Status badges should use subtle backgrounds and readable text.

Avoid bright saturated pills.

---

# 35. Buttons

Primary button:

- Deep blue
- White text

Secondary button:

- White/light background
- Border
- Dark text

Danger:

- Restrained red

Example:

```text
[Approve Record]     Primary

[Edit Record]        Secondary

[Reject Record]      Danger
```

Avoid multiple competing primary buttons on one screen.

---

# 36. Icons

Use **Lucide React**.

Icons should support the text rather than replace it.

Recommended:

- Upload
- FileText
- Search
- Map
- CheckCircle
- AlertTriangle
- XCircle
- Clock
- User
- History
- ShieldCheck

Do not use icons decoratively everywhere.

---

# 37. Accessibility

Accessibility is a first-class requirement.

The interface should:

- Support keyboard navigation
- Use visible focus states
- Maintain adequate contrast
- Not rely on color alone
- Provide labels for inputs
- Provide accessible table headings
- Support screen readers
- Use meaningful button labels
- Maintain readable font sizes
- Avoid excessive motion

---

# 38. Responsive Behavior

## Desktop

Primary target for officer workflows.

The verification workspace should remain side-by-side on large screens.

## Tablet

Allow the document viewer and extracted information panel to stack when required.

## Mobile

Prioritize the land owner experience.

Officer verification should remain usable but can become a vertically stacked workflow.

---

# 39. Empty States

Use simple informative empty states.

Example:

```text
No verification requests

There are currently no land records
waiting for your verification.
```

Avoid illustrations unless they add genuine value.

---

# 40. Loading States

Use skeletons for:

- Tables
- Record details
- Dashboard statistics
- GIS information

Avoid large loading spinners covering the entire application.

---

# 41. Error States

Errors should be actionable.

Bad:

```text
Something went wrong.
```

Good:

```text
We couldn't load this record.

Please try again.

[Retry]
```

---

# 42. Notifications

Use restrained toast notifications.

Examples:

```text
Document uploaded successfully.
```

```text
Verification request submitted.
```

```text
Record approved successfully.
```

Avoid excessive notifications.

---

# 43. Component System

Build reusable components:

```text
AppShell
GovernmentHeader
Sidebar
PageHeader
StatusBadge
StatBlock
DataTable
SearchBar
FilterBar
DocumentUploader
DocumentViewer
LandRecordForm
LandRecordSummary
ConfidenceIndicator
ValidationAlert
VerificationPanel
ApprovalDialog
RejectionDialog
Timeline
MapView
CorrectionRequestForm
EmptyState
LoadingState
ErrorState
```

Components should be reusable across the two modules.

---

# 44. Design Tokens

Create a small design-token system.

```text
Primary
Government Blue

Accent
Saffron

Success
Green

Warning
Amber

Danger
Red

Background
White / Light Gray

Border
Neutral Gray

Text
Dark Navy / Neutral Gray
```

Do not create dozens of colors.

The interface should have a controlled visual language.

---

# 45. Spacing

Use a consistent spacing system.

Prefer:

```text
4px
8px
12px
16px
24px
32px
48px
```

Use larger spacing between major sections and smaller spacing inside components.

Avoid cramped layouts.

---

# 46. Page Width

For application pages:

```text
max-width: 1440px
```

Use a centered content area with comfortable horizontal padding.

Do not stretch forms and record details across the entire screen unnecessarily.

---

# 47. Design for Trust

The following distinctions must always be visually clear:

```text
Source Document
      ≠
AI Extracted Value
      ≠
Officer Corrected Value
      ≠
Verified Record
```

This is one of the most important design principles of the product.

The UI should make the record's provenance understandable.

---

# 48. Design for the Government Workflow

The product should prioritize:

### Land Owner

**Simple submission and status tracking**

### Officer

**Efficient verification and decision making**

The two experiences should not be identical.

The land owner interface should be:

> Simple + guided

The officer interface should be:

> Dense + precise + evidence-driven

---

# 49. Stitch / UI Generation Instructions

When generating screens with Stitch or another UI generation tool, follow these rules:

### Always

- Use the design system defined in this document.
- Keep the layout minimal.
- Use realistic Indian land-record data.
- Use Noto Sans or a comparable neutral sans-serif.
- Use government blue as the primary color.
- Use saffron sparingly.
- Use white/light-gray backgrounds.
- Use tables for administrative data.
- Use subtle status colors.
- Keep spacing generous.
- Make accessibility visible.
- Keep the government identity restrained.

### Never

- Generate a generic SaaS dashboard.
- Use purple AI gradients.
- Use neon colors.
- Use glassmorphism.
- Use giant rounded cards.
- Use excessive illustrations.
- Use AI robots or futuristic imagery.
- Use huge hero sections inside authenticated application screens.
- Fill every area with charts.
- Invent government seals/logos.
- Add extra modules not specified in this document.

---

# 50. Screen Generation Priority

Generate screens in this order:

## 1. Land Owner Login

Simple government identity + login.

## 2. Land Owner Dashboard

Status-focused.

## 3. Upload Document

Simple upload flow.

## 4. Extraction Review

Structured land-record form.

## 5. Validation Review

Flags + clear explanations.

## 6. Verification Status

Timeline.

## 7. My Land Records

Simple record table.

## 8. Officer Login

Separate officer entry point.

## 9. Officer Dashboard

Verification workload.

## 10. Verification Queue

Administrative data table.

## 11. Verification Workspace

**Highest priority screen.**

Original document + extracted information + confidence + validation + actions.

## 12. Record History

Evidence and audit timeline.

## 13. GIS Map

Minimal map + record information.

---

# 51. Most Important Screen

The **Officer Verification Workspace** must receive the highest design attention.

It should communicate the complete product value in one screen:

```text
Original Document
        ↓
Extracted Information
        ↓
Confidence
        ↓
Validation Flags
        ↓
Officer Review
        ↓
Approve / Reject
        ↓
Verified Land Record
```

The officer should never have to guess:

- What came from the document?
- What did the system extract?
- What is uncertain?
- Why is the record flagged?
- What does the officer need to do?
- What will happen after approval?

---

# 52. Final Design Direction

The final product should feel like:

> **A modern Government of India land-record service designed for real administrative use.**

Not:

> A colorful AI startup dashboard.

The ideal visual balance is:

```text
Government seriousness
        +
Modern usability
        +
Minimal visual design
        +
Strong information hierarchy
        +
Clear evidence/provenance
```

The interface should be calm enough for government officials to work with for long periods, simple enough for citizens to understand, and polished enough to demonstrate the SIH solution professionally.
