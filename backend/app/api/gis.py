from fastapi import APIRouter
from typing import List, Dict, Any

router = APIRouter(prefix="/gis", tags=["GIS & Cadastral Mapping"])

@router.get("/parcels/{village_id}")
async def get_cadastral_parcels(village_id: str = "hadapsar_14"):
    return {
        "village_id": village_id,
        "village_name": "Hadapsar",
        "tehsil": "Haveli",
        "district": "Pune",
        "crs": "EPSG:4326",
        "parcels": [
            {"survey_no": "124/1", "area_ha": 1.20, "owner": "Vikram Joshi", "status": "VERIFIED"},
            {"survey_no": "124/2", "area_ha": 2.45, "owner": "Ramesh Patil", "status": "UNDER_VERIFICATION"},
            {"survey_no": "125/4", "area_ha": 1.80, "owner": "Suresh Kumar", "status": "CONFLICT"},
            {"survey_no": "128/1", "area_ha": 0.95, "owner": "Amit Sharma", "status": "VERIFIED"}
        ]
    }
