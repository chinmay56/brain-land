# Intelligent Land Record Digitization - Backend API

FastAPI backend service for legacy land record OCR processing, Sarvam AI Vision integration, business rules validation, and Supabase integration.

## Setup Instructions

1. **Create Virtual Environment:**
   ```bash
   python -m venv venv
   # On Windows PowerShell:
   .\venv\Scripts\Activate.ps1
   ```

2. **Install Dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   # Add your SARVAM_API_KEY and SUPABASE credentials in .env
   ```

4. **Apply the database schema (once per Supabase project):**
   Paste `migrations/001_rbac_and_secure_storage.sql` into the Supabase SQL
   editor and run it. It enables row-level security, makes the document bucket
   private, and stops signup from granting the OFFICER role.

5. **Create the demo accounts:**
   ```bash
   python scripts/seed_officer.py
   ```
   Officer accounts cannot be self-registered — every signup becomes a CITIZEN
   by design — so this script is the only way to get one. It reads the six
   `DEMO_*` values from `.env`. Without it nobody can sign in.

6. **Run Server:**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

7. **Interactive API Documentation:**
   - Swagger UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`
