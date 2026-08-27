from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.models.schemas import LandRecordResponse, RecordStatus

router = APIRouter(prefix="/land-records", tags=["Land Records"])

# Initial mock records in memory
MOCK_RECORDS = [
    {
        "id": "LR-2026-1021",
        "application_no": "APP-MH-2026-00481",
        "document_type": "7/12 Extract (Record of Rights)",
        "owner_name": {"value": "Ramesh Baliram Patil", "confidence": 0.97},
        "survey_number": {"value": "124/2", "confidence": 0.99},
        "khasra_number": {"value": "K-4821", "confidence": 0.92},
        "khata_number": {"value": "KH-1024", "confidence": 0.89},
        "area": {"value": "2.45", "confidence": 0.91},
        "area_unit": "Hectares",
        "village": {"value": "Hadapsar", "confidence": 0.98},
        "tehsil": {"value": "Haveli", "confidence": 0.96},
        "district": {"value": "Pune", "confidence": 0.99},
        "state": "Maharashtra",
        "land_classification": {"value": "Jirayat (Agricultural Dry)", "confidence": 0.94},
        "mutation_number": {"value": "58?1", "confidence": 0.58, "is_flagged": True},
        "overall_confidence": 0.71,
        "status": "UNDER_VERIFICATION",
        "submission_date": "2026-08-25",
        "validation_flags": [
            {
                "id": "VF-01",
                "field": "mutation_number",
                "severity": "WARNING",
                "message": "Mutation number extraction confidence is low (58%). Possible blurred numeral in source document.",
                "suggested_action": "Verify against original mutation seal on Page 2."
            }
        ],
        "document_pages": 4
    },
    {
        "id": "LR-2026-1022",
        "application_no": "APP-MH-2026-00482",
        "document_type": "Sale Deed & Mutation Register",
        "owner_name": {"value": "Suresh Chandra Kumar", "confidence": 0.95},
        "survey_number": {"value": "125/4", "confidence": 0.88, "is_flagged": True},
        "khasra_number": {"value": "K-7819", "confidence": 0.85},
        "khata_number": {"value": "KH-2091", "confidence": 0.90},
        "area": {"value": "1.80", "confidence": 0.92},
        "area_unit": "Hectares",
        "village": {"value": "Manjri", "confidence": 0.94},
        "tehsil": {"value": "Haveli", "confidence": 0.96},
        "district": {"value": "Pune", "confidence": 0.99},
        "state": "Maharashtra",
        "mutation_number": {"value": "9420", "confidence": 0.91},
        "overall_confidence": 0.58,
        "status": "UNDER_VERIFICATION",
        "submission_date": "2026-08-26",
        "validation_flags": [
            {
                "id": "VF-03",
                "field": "survey_number",
                "severity": "CONFLICT",
                "message": "Survey number 125/4 shows discrepancy with Department Reference Database (listed as 125/7 in 2024 resurvey).",
                "suggested_action": "Check cadastral boundary map and previous mutation history."
            }
        ],
        "document_pages": 8
    }
]

@router.get("", response_model=List[LandRecordResponse])
async def list_land_records(
    status: Optional[RecordStatus] = None,
    search: Optional[str] = None
):
    results = MOCK_RECORDS
    if status:
        results = [r for r in results if r["status"] == status]
    if search:
        s = search.lower()
        results = [
            r for r in results 
            if s in r["id"].lower() or s in r["owner_name"]["value"].lower() or s in r["survey_number"]["value"].lower()
        ]
    return results

@router.get("/{record_id}", response_model=LandRecordResponse)
async def get_land_record(record_id: str):
    record = next((r for r in MOCK_RECORDS if r["id"] == record_id), None)
    if not record:
        raise HTTPException(status_code=404, detail="Land record not found")
    return record
