from pydantic import BaseModel, Field, ConfigDict
from pydantic.alias_generators import to_camel
from typing import Optional, List, Dict, Any
from enum import Enum

class UserRole(str, Enum):
    CITIZEN = "CITIZEN"
    OFFICER = "OFFICER"

class RecordStatus(str, Enum):
    DRAFT = "DRAFT"
    PROCESSING = "PROCESSING"
    VALIDATED = "VALIDATED"
    UNDER_VERIFICATION = "UNDER_VERIFICATION"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    CORRECTION_REQUESTED = "CORRECTION_REQUESTED"

class SeverityLevel(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    CONFLICT = "CONFLICT"
    CRITICAL = "CRITICAL"

class FieldConfidence(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    value: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    is_flagged: bool = False
    source_doc: Optional[str] = None

class ValidationFlag(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    id: str
    field: str
    severity: SeverityLevel
    message: str
    suggested_action: Optional[str] = None

# The 12 Land Record Fields
class LandRecordBase(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    document_type: str = "7/12 Extract (Record of Rights)"
    owner_name: FieldConfidence
    co_owners: Optional[List[str]] = []
    survey_number: FieldConfidence
    khasra_number: Optional[FieldConfidence] = None
    khata_number: Optional[FieldConfidence] = None
    area: FieldConfidence
    area_unit: str = "Hectares"
    village: FieldConfidence
    tehsil: FieldConfidence
    district: FieldConfidence
    state: str = "Maharashtra"
    land_classification: Optional[FieldConfidence] = None
    ownership_details: Optional[FieldConfidence] = None
    mutation_number: Optional[FieldConfidence] = None
    registration_info: Optional[FieldConfidence] = None

class LandRecordCreate(LandRecordBase):
    pass

class LandRecordResponse(LandRecordBase):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)
    id: str
    application_no: str
    overall_confidence: float
    status: RecordStatus
    submission_date: str
    verified_date: Optional[str] = None
    assigned_officer: Optional[str] = None
    assigned_district: Optional[str] = None
    assigned_tehsil: Optional[str] = None
    officer_remarks: Optional[str] = None
    validation_flags: List[ValidationFlag] = []
    document_url: Optional[str] = None
    document_pages: int = 1
    supporting_documents: List[Any] = []
    created_by: Optional[str] = None
    submitted_by_id: Optional[str] = None

class OfficerVerificationAction(BaseModel):
    record_id: str
    officer_id: str
    action: str  # "APPROVE" or "REJECT"
    field_corrections: Optional[Dict[str, str]] = None
    remarks: str
    reason: Optional[str] = None
