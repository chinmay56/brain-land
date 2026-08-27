from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import auth, documents, extraction, land_records, verification, gis

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Department of Land Resources (DoLR) Intelligent Land Record Digitization & Verification Backend API"
)

# Configure CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list + ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(extraction.router, prefix="/api")
app.include_router(land_records.router, prefix="/api")
app.include_router(verification.router, prefix="/api")
app.include_router(gis.router, prefix="/api")

@app.get("/")
async def root():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs"
    }

@app.get("/health")
async def health():
    return {"status": "ok"}
