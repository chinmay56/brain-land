# Intelligent Land Record Digitization & Validation System

**Problem Statement ID:** 26018  
**Organization:** Ministry of Rural Development  
**Department:** Department of Land Resources (DoLR)  
**Theme:** Smart Automation  

AI-assisted digital platform for converting legacy land documents into structured land records and supporting a controlled verification workflow.

---

## Project Structure

```text
Sih 2026/
├── frontend/                     # Next.js 14, React, TypeScript, Tailwind CSS
│   ├── src/
│   │   ├── app/                  # Citizen & Officer portals, Auth & GIS routes
│   │   ├── components/           # DoLR government components & widgets
│   │   ├── context/              # Authentication & Role state management
│   │   ├── data/                 # Realistic DoLR mock datasets
│   │   └── types/                # Domain TypeScript contracts
│   └── package.json
│
├── backend/                      # Python, FastAPI, Sarvam AI Vision & Validation
│   ├── app/
│   │   ├── api/                  # Auth, Documents, Extraction, Records, Verification
│   │   ├── models/               # Pydantic schemas & data models
│   │   ├── services/             # Sarvam Vision, Validation Engine, Supabase
│   │   ├── config.py             # Settings & Environment variables
│   │   └── main.py               # FastAPI application entrypoint
│   └── requirements.txt
│
├── Intelligent_Land_Record_PRD.md
├── Intelligent_Land_Record_TECHSTACK.md
├── Intelligent_Land_Record_DESIGN.md
└── user flow handmade.jpeg
```

---

## Quick Start

### 1. Run Frontend (UI)
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

### 2. Run Backend (API)
```bash
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
Open `http://localhost:8000/docs` for interactive Swagger API documentation.
