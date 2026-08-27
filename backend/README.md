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

4. **Run Server:**
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

5. **Interactive API Documentation:**
   - Swagger UI: `http://localhost:8000/docs`
   - ReDoc: `http://localhost:8000/redoc`
