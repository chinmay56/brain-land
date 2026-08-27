from fastapi import APIRouter, UploadFile, File, Form, HTTPException
import uuid

router = APIRouter(prefix="/documents", tags=["Documents"])

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    document_type: str = Form("7/12 Extract"),
    user_id: str = Form("usr_cit_001")
):
    doc_id = f"DOC-{uuid.uuid4().hex[:8].upper()}"
    return {
        "success": True,
        "document_id": doc_id,
        "file_name": file.filename,
        "file_size": file.size or 2400000,
        "document_type": document_type,
        "storage_path": f"documents/{user_id}/{doc_id}/{file.filename}",
        "status": "UPLOADED"
    }
