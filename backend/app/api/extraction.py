from fastapi import APIRouter, UploadFile, File, HTTPException
from app.services.sarvam_vision import sarvam_service
from app.services.validation_engine import validation_engine

router = APIRouter(prefix="/extraction", tags=["AI Extraction"])

@router.post("/process")
async def extract_from_document(file: UploadFile = File(...)):
    file_bytes = await file.read()
    extracted_data = await sarvam_service.extract_land_record(file_bytes, file.filename or "record.pdf")
    validation_flags = validation_engine.validate_extracted_record(extracted_data)

    # Where the fields below actually came from. sarvam_vision falls back to
    # built-in fixture data whenever the API key is missing, the key is
    # rejected, or the job does not finish inside the poll window — and until
    # now that fallback was visible only in the server log, which nobody is
    # reading during a demo. Surfacing it in the response lets the UI say so
    # out loud instead of presenting a fixture as a reading of the document.
    data_source = extracted_data.get("data_source", "UNKNOWN")
    is_live = data_source == "SARVAM_LIVE"

    return {
        "success": True,
        "data_source": data_source,           # SARVAM_LIVE | DEMO_FALLBACK | UNKNOWN
        "is_live_extraction": is_live,
        "extraction_notice": None if is_live else (
            "These values were NOT read from the uploaded document. The Sarvam "
            "extraction did not complete, so built-in sample data is being shown."
        ),
        "extracted_data": extracted_data,
        "validation_flags": validation_flags,
        "processing_pipeline": "Sarvam Vision OCR -> Normalization -> Business Rules Engine"
    }
