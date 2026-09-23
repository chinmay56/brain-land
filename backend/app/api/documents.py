"""
Document upload and retrieval.

The upload endpoint used to invent a document id and a storage path and return
them without storing anything, so a citizen's land document was never actually
kept. It is stored now, under a folder named for the uploader's user id, which
is what the storage policy checks — and it comes from the token, not from a
form field the caller fills in.

Reads are signed on demand and expire, so a leaked link stops working.
"""
import logging
import uuid
from typing import Any, Dict

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile

from app.core.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/documents", tags=["Documents"])

SIGNED_URL_TTL_S = 3600


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form("7/12 Extract"),
    district: str = Form("Pune"),
    tehsil: str = Form("Haveli"),
    application_no: str = Form(""),
    user: Dict[str, Any] = Depends(get_current_user),
):
    from app.services.supabase_client import supabase_service

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    doc_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
    safe_name = (file.filename or "document.pdf").replace("/", "_").replace("\\", "_")

    storage_path = supabase_service.upload_document_to_bucket(
        file_bytes=raw,
        file_name=safe_name,
        district=district,
        tehsil=tehsil,
        application_no=application_no or doc_id,
        # The folder the storage policy checks. Never taken from the request.
        user_id=user["id"],
        content_type=file.content_type or "application/pdf",
    )
    if not storage_path:
        raise HTTPException(status_code=502, detail="Document could not be stored.")

    return {
        "success": True,
        "document_id": doc_id,
        "file_name": safe_name,
        "file_size": len(raw),
        "document_type": document_type,
        "storage_path": storage_path,
        "signed_url": supabase_service.get_signed_url(storage_path, SIGNED_URL_TTL_S),
        "status": "UPLOADED",
    }


@router.get("/signed-url")
async def signed_url(
    path: str = Query(..., description="Storage path returned by /upload."),
    user: Dict[str, Any] = Depends(get_current_user),
):
    """
    A fresh link to one document. Checked here as well as by the storage
    policy: this service holds a service-role key, so it would otherwise
    happily sign somebody else's document on request.
    """
    from app.services.supabase_client import supabase_service

    owner_folder = path.split("/", 1)[0] if "/" in path else ""
    if user.get("role") != "OFFICER" and owner_folder != user["id"]:
        raise HTTPException(status_code=403, detail="This document belongs to another user.")

    url = supabase_service.get_signed_url(path, SIGNED_URL_TTL_S)
    if not url:
        raise HTTPException(status_code=404, detail="Document not found.")
    return {"success": True, "path": path, "signed_url": url, "expires_in": SIGNED_URL_TTL_S}
