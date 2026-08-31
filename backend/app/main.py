import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.api import auth, documents, extraction, land_records, verification, gis

logger = logging.getLogger(__name__)

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Department of Land Resources (DoLR) Intelligent Land Record Digitization & Verification Backend API"
)

# ---------------------------------------------------------------------------
# CORS
#
# This API takes uploaded land records and hands back extracted owner names,
# survey numbers and geometry, so the allowed origin list has to be exact.
# It previously read `settings.origins_list + ["*"]`, which let any page on the
# internet call it with the browser's credentials attached — and also made
# ALLOWED_ORIGINS decorative, since the wildcard swallowed it.
#
#   ALLOWED_ORIGINS       comma-separated exact origins, e.g. the Vercel
#                         production URL. No trailing slash.
#   ALLOWED_ORIGIN_REGEX  optional pattern, anchored, for Vercel preview
#                         deployments — every push gets a fresh hostname, so
#                         listing them one by one is not workable:
#                         ^https://brain-land[a-z0-9-]*\.vercel\.app$
#                         Keep the project prefix. A bare `.*\.vercel\.app`
#                         would trust every project Vercel hosts.
# ---------------------------------------------------------------------------
_origins = settings.origins_list
_origin_regex = (settings.ALLOWED_ORIGIN_REGEX or "").strip() or None

if not _origins and not _origin_regex:
    logger.warning(
        "CORS: neither ALLOWED_ORIGINS nor ALLOWED_ORIGIN_REGEX is set. Every "
        "browser request to this API will be blocked. Set ALLOWED_ORIGINS to "
        "the frontend origin (e.g. https://your-app.vercel.app)."
    )
else:
    logger.info("CORS allow_origins=%s allow_origin_regex=%s", _origins, _origin_regex)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins,
    allow_origin_regex=_origin_regex,
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
        "environment": settings.ENVIRONMENT,
        # Whether real OCR is possible at all on this instance. False means every
        # extraction will fall back to built-in fixture data.
        "sarvam_configured": bool(settings.SARVAM_API_KEY),
        "docs_url": "/docs"
    }

@app.get("/health")
async def health():
    """Liveness probe. Also the endpoint the frontend pings on page load to wake
    a free-tier instance that has been idled out, so the cold start does not
    land on the first document upload."""
    return {"status": "ok"}
