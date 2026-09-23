from typing import List, Dict, Any
from app.models.schemas import ValidationFlag, SeverityLevel

class LandRecordValidationEngine:
    """
    Business rules, consistency validation, and database reference
    cross-checking engine for Indian land records.
    """

    @staticmethod
    def validate_extracted_record(data: Dict[str, Any]) -> List[ValidationFlag]:
        flags: List[ValidationFlag] = []

        # Rule 1: Confidence threshold check (< 0.70 is low)
        mutation_field = data.get("mutation_number")
        if mutation_field and getattr(mutation_field, "confidence", 1.0) < 0.70:
            flags.append(
                ValidationFlag(
                    id="VF-01",
                    field="mutation_number",
                    severity=SeverityLevel.WARNING,
                    message=f"Mutation number extraction confidence is low ({int(mutation_field.confidence * 100)}%). Possible blurred numeral in source document.",
                    suggested_action="Verify against original mutation seal on Page 2."
                )
            )

        # Rule 2: Survey Number standard pattern check
        survey_field = data.get("survey_number")
        if survey_field and "/" not in survey_field.value and not survey_field.value.isdigit():
            flags.append(
                ValidationFlag(
                    id="VF-02",
                    field="survey_number",
                    severity=SeverityLevel.WARNING,
                    message="Survey number format does not match typical sub-division pattern (e.g. 124/2).",
                    suggested_action="Review survey sub-division index on source paper."
                )
            )

        # Reference-database discrepancies are a real lookup now — see
        # reference_check.check_reference, called from the extraction endpoint.
        return flags

validation_engine = LandRecordValidationEngine()
