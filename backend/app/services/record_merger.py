from typing import Dict, Any, List
from app.models.schemas import ValidationFlag, SeverityLevel

class LandRecordMerger:
    """
    Multi-Document Coalescing Engine:
    - Merges extracted fields from supporting documents (e.g. 7/12 + Sale Deed + Map).
    - Fills empty/null fields from new documents without overwriting verified values.
    - Generates CONFLICT validation flags if documents contradict each other.
    """

    @staticmethod
    def merge_documents(
        base_record: Dict[str, Any], 
        new_extracted_doc: Dict[str, Any], 
        new_doc_name: str
    ) -> Dict[str, Any]:
        merged = dict(base_record)
        validation_flags = merged.get("validation_flags", [])
        
        # Track list of uploaded supporting documents
        docs = merged.get("supporting_documents", [])
        if new_doc_name not in docs:
            docs.append(new_doc_name)
        merged["supporting_documents"] = docs

        for field_name, new_val in new_extracted_doc.items():
            if field_name in ["overall_confidence", "document_pages", "validation_flags", "supporting_documents"]:
                continue

            # Extract raw string value from FieldConfidence or string
            new_str_val = getattr(new_val, "value", new_val) if new_val is not None else ""
            if not new_str_val or str(new_str_val).strip() in ["", "null", "None"]:
                continue

            existing_val = merged.get(field_name)
            existing_str_val = getattr(existing_val, "value", existing_val) if existing_val is not None else ""

            # Case 1: Existing was empty/null -> Fill directly
            if not existing_str_val or str(existing_str_val).strip() in ["", "null", "None"]:
                merged[field_name] = new_val

            # Case 2: Values disagree -> Generate CONFLICT flag for Revenue Officer
            elif str(existing_str_val).strip().lower() != str(new_str_val).strip().lower():
                validation_flags.append(
                    ValidationFlag(
                        id=f"CONFLICT-{field_name.upper()}",
                        field=field_name,
                        severity=SeverityLevel.CONFLICT,
                        message=f"Discrepancy detected: '{existing_str_val}' vs '{new_str_val}' in {new_doc_name}.",
                        suggested_action="Review physical document seals in the Verification Studio."
                    )
                )
                # Keep the value with higher confidence
                new_conf = getattr(new_val, "confidence", 0.0)
                exist_conf = getattr(existing_val, "confidence", 0.0)
                if new_conf > exist_conf:
                    merged[field_name] = new_val

        merged["validation_flags"] = validation_flags
        return merged

record_merger = LandRecordMerger()
