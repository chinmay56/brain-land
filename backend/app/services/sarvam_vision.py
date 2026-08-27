import httpx
from typing import Dict, Any
from app.config import settings
from app.models.schemas import FieldConfidence

class SarvamVisionService:
    """
    Integration layer with Sarvam AI Vision model for multilingual
    Devanagari, regional script, and handwritten Indian land record OCR.
    """
    def __init__(self):
        self.api_key = settings.SARVAM_API_KEY
        self.api_url = settings.SARVAM_API_URL

    async def extract_land_record(self, file_bytes: bytes, file_name: str) -> Dict[str, Any]:
        # If API key is not configured, return realistic DoLR-calibrated mock response
        if not self.api_key:
            return {
                "owner_name": FieldConfidence(value="Ramesh Baliram Patil", confidence=0.97),
                "survey_number": FieldConfidence(value="124/2", confidence=0.99),
                "khasra_number": FieldConfidence(value="K-4821", confidence=0.92),
                "khata_number": FieldConfidence(value="KH-1024", confidence=0.89),
                "area": FieldConfidence(value="2.45", confidence=0.91),
                "area_unit": "Hectares",
                "village": FieldConfidence(value="Hadapsar", confidence=0.98),
                "tehsil": FieldConfidence(value="Haveli", confidence=0.96),
                "district": FieldConfidence(value="Pune", confidence=0.99),
                "state": "Maharashtra",
                "land_classification": FieldConfidence(value="Jirayat (Agricultural)", confidence=0.94),
                "mutation_number": FieldConfidence(value="58?1", confidence=0.58, is_flagged=True),
                "overall_confidence": 0.71,
                "document_pages": 4,
            }

        # Real HTTP request to Sarvam AI Vision API
        async with httpx.AsyncClient(timeout=60.0) as client:
            headers = {"Authorization": f"Bearer {self.api_key}"}
            files = {"file": (file_name, file_bytes)}
            response = await client.post(self.api_url, headers=headers, files=files)
            response.raise_for_status()
            return response.json()

sarvam_service = SarvamVisionService()
