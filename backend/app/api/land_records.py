from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from app.models.schemas import LandRecordResponse, RecordStatus

router = APIRouter(prefix="/land-records", tags=["Land Records"])

# Live records in memory fallback
MOCK_RECORDS: List[dict] = []

@router.get("", response_model=List[LandRecordResponse])
async def list_land_records(
    status: Optional[RecordStatus] = None,
    search: Optional[str] = None,
    district: Optional[str] = None,
    tehsil: Optional[str] = None,
    village: Optional[str] = None,
    officer_id: Optional[str] = None
):
    results = MOCK_RECORDS
    if status:
        results = [r for r in results if r["status"] == status]
    if district:
        d = district.lower()
        results = [
            r for r in results 
            if r.get("district", {}).get("value", "").lower() == d or (r.get("assigned_district") and r.get("assigned_district").lower() == d)
        ]
    if tehsil:
        t = tehsil.lower()
        results = [
            r for r in results 
            if r.get("tehsil", {}).get("value", "").lower() == t or (r.get("assigned_tehsil") and r.get("assigned_tehsil").lower() == t)
        ]
    if village:
        v = village.lower()
        results = [
            r for r in results 
            if r.get("village", {}).get("value", "").lower() == v
        ]
    if search:
        s = search.lower()
        results = [
            r for r in results 
            if s in r["id"].lower() 
            or s in r.get("owner_name", {}).get("value", "").lower() 
            or s in r.get("survey_number", {}).get("value", "").lower()
            or s in r.get("village", {}).get("value", "").lower()
        ]
    return results

@router.get("/{record_id}", response_model=LandRecordResponse)
async def get_land_record(record_id: str):
    record = next((r for r in MOCK_RECORDS if r["id"] == record_id), None)
    if not record:
        raise HTTPException(status_code=404, detail="Land record not found")
    return record

@router.post("", response_model=LandRecordResponse)
async def create_land_record(record: LandRecordResponse):
    rec_dict = record.dict()
    # Auto-assign jurisdiction from document if not assigned
    doc_district = (rec_dict.get("district", {}).get("value") or "Pune").strip()
    doc_tehsil = (rec_dict.get("tehsil", {}).get("value") or "Haveli").strip()
    if not rec_dict.get("assigned_district"):
        rec_dict["assigned_district"] = doc_district
    if not rec_dict.get("assigned_tehsil"):
        rec_dict["assigned_tehsil"] = doc_tehsil
    if not rec_dict.get("assigned_officer"):
        rec_dict["assigned_officer"] = f"Shri Vikramaditya Joshi (SDO {doc_tehsil})"
    
    # Save to local in-memory records
    existing = [r for r in MOCK_RECORDS if r["id"] == rec_dict["id"]]
    if existing:
        MOCK_RECORDS.remove(existing[0])
    MOCK_RECORDS.insert(0, rec_dict)

    # Write record payload directly into Supabase PostgreSQL table (Triggers WebSocket Realtime!)
    try:
        from app.services.supabase_client import supabase_service
        from app.services.lgd_resolver import resolve_lgd_codes
        lgd_dist_code, lgd_t_code = resolve_lgd_codes(doc_district, doc_tehsil)
        doc_url = rec_dict.get("document_url") or rec_dict.get("documentUrl")
        db_payload = {
            "id": rec_dict["id"],
            "application_no": rec_dict.get("application_no"),
            "document_type": rec_dict.get("document_type", "7/12 Extract"),
            "state": rec_dict.get("state", "Maharashtra"),
            "district": doc_district,
            "tehsil": doc_tehsil,
            "lgd_district_code": lgd_dist_code,
            "lgd_tehsil_code": lgd_t_code,
            "village": rec_dict.get("village", {}).get("value") or "Hadapsar",
            "survey_number": rec_dict.get("survey_number", {}).get("value") or "124/2",
            "khasra_number": rec_dict.get("khasra_number", {}).get("value") if rec_dict.get("khasra_number") else None,
            "khata_number": rec_dict.get("khata_number", {}).get("value") if rec_dict.get("khata_number") else None,
            "owner_name": rec_dict.get("owner_name", {}).get("value") or "Land Owner",
            "co_owners": rec_dict.get("co_owners", []),
            "area": float(rec_dict.get("area", {}).get("value") or 2.45),
            "area_unit": rec_dict.get("area_unit", "Hectares"),
            "mutation_number": rec_dict.get("mutation_number", {}).get("value") if rec_dict.get("mutation_number") else None,
            "land_classification": rec_dict.get("land_classification", {}).get("value") if isinstance(rec_dict.get("land_classification"), dict) else rec_dict.get("land_classification"),
            "registration_info": rec_dict.get("registration_info") if rec_dict.get("registration_info") else {},
            "status": rec_dict.get("status", "UNDER_VERIFICATION"),
            "overall_confidence": float(rec_dict.get("overall_confidence", 0.95)),
            "assigned_officer": rec_dict.get("assigned_officer"),
        }
        if doc_url:
            db_payload["document_url"] = doc_url

        import uuid
        def clean_uuid(val: Any) -> Optional[str]:
            if not val or not isinstance(val, str):
                return None
            try:
                uuid.UUID(val)
                return val
            except ValueError:
                return None

        raw_user_id = rec_dict.get("created_by") or rec_dict.get("submitted_by_id") or rec_dict.get("createdBy") or rec_dict.get("submittedById")
        db_payload["created_by"] = clean_uuid(raw_user_id)
        supabase_service.insert_land_record_to_db(db_payload)
    except Exception as err:
        print(f"[Supabase] DB insertion notice: {err}")

    return rec_dict

