from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.sarvam_vision import sarvam_service
from app.services.validation_engine import validation_engine

router = APIRouter(prefix="/extraction", tags=["AI Extraction"])

@router.post("/process")
async def extract_from_document(file: UploadFile = File(...)):
    file_bytes = await file.read()
    extracted_data = await sarvam_service.extract_land_record(file_bytes, file.filename or "record.pdf")
    validation_flags = validation_engine.validate_extracted_record(extracted_data)

    return {
        "success": True,
        "extracted_data": extracted_data,
        "validation_flags": validation_flags,
        "processing_pipeline": "Sarvam Vision OCR -> Normalization -> Business Rules Engine"
    }
