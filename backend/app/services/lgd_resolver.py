"""
LGD (Local Government Directory) Resolver Module
Maps district and tehsil names in English or Marathi to canonical LGD codes.
"""

from typing import Dict, Any, Optional, Tuple

# Official LGD Master Dictionary for Maharashtra Districts & Tehsils
LGD_MASTER: Dict[str, Dict[str, Any]] = {
    # Jalgaon District
    "jalgaon": {
        "district_code": "496",
        "district_en": "Jalgaon",
        "district_mr": "जळगाव",
        "tehsils": {
            "jalgaon": {"code": "4172", "en": "Jalgaon", "mr": "जळगाव"},
            "जळगाव": {"code": "4172", "en": "Jalgaon", "mr": "जळगाव"},
            "bhusawal": {"code": "4173", "en": "Bhusawal", "mr": "भुसावळ"},
            "भुसावळ": {"code": "4173", "en": "Bhusawal", "mr": "भुसावळ"},
            "chalisgaon": {"code": "4174", "en": "Chalisgaon", "mr": "चाळीसगाव"},
            "चाळीसगाव": {"code": "4174", "en": "Chalisgaon", "mr": "चाळीसगाव"},
            "amalner": {"code": "4175", "en": "Amalner", "mr": "अमळनेर"},
            "अमळनेर": {"code": "4175", "en": "Amalner", "mr": "अमळनेर"},
        }
    },
    "जळगाव": {
        "district_code": "496",
        "district_en": "Jalgaon",
        "district_mr": "जळगाव",
        "tehsils": {
            "jalgaon": {"code": "4172", "en": "Jalgaon", "mr": "जळगाव"},
            "जळगाव": {"code": "4172", "en": "Jalgaon", "mr": "जळगाव"},
            "bhusawal": {"code": "4173", "en": "Bhusawal", "mr": "भुसावळ"},
            "भुसावळ": {"code": "4173", "en": "Bhusawal", "mr": "भुसावळ"},
            "chalisgaon": {"code": "4174", "en": "Chalisgaon", "mr": "चाळीसगाव"},
            "चाळीसगाव": {"code": "4174", "en": "Chalisgaon", "mr": "चाळीसगाव"},
        }
    },
    # Pune District
    "pune": {
        "district_code": "521",
        "district_en": "Pune",
        "district_mr": "पुणे",
        "tehsils": {
            "haveli": {"code": "4156", "en": "Haveli", "mr": "हवेली"},
            "हवेली": {"code": "4156", "en": "Haveli", "mr": "हवेली"},
            "baramati": {"code": "4157", "en": "Baramati", "mr": "बारामती"},
            "बारामती": {"code": "4157", "en": "Baramati", "mr": "बारामती"},
            "khed": {"code": "4158", "en": "Khed", "mr": "खेड"},
            "खेड": {"code": "4158", "en": "Khed", "mr": "खेड"},
            "shirur": {"code": "4159", "en": "Shirur", "mr": "शिरूर"},
            "शिरूर": {"code": "4159", "en": "Shirur", "mr": "शिरूर"},
            "maval": {"code": "4160", "en": "Maval", "mr": "मावळ"},
            "मावळ": {"code": "4160", "en": "Maval", "mr": "मावळ"},
        }
    },
    "पुणे": {
        "district_code": "521",
        "district_en": "Pune",
        "district_mr": "पुणे",
        "tehsils": {
            "haveli": {"code": "4156", "en": "Haveli", "mr": "हवेली"},
            "हवेली": {"code": "4156", "en": "Haveli", "mr": "हवेली"},
            "baramati": {"code": "4157", "en": "Baramati", "mr": "बारामती"},
            "बारामती": {"code": "4157", "en": "Baramati", "mr": "बारामती"},
        }
    },
    # Nashik District
    "nashik": {
        "district_code": "516",
        "district_en": "Nashik",
        "district_mr": "नाशिक",
        "tehsils": {
            "nashik city": {"code": "4140", "en": "Nashik City", "mr": "नाशिक शहर"},
            "nashik": {"code": "4140", "en": "Nashik City", "mr": "नाशिक शहर"},
            "नाशिक": {"code": "4140", "en": "Nashik City", "mr": "नाशिक शहर"},
            "niphad": {"code": "4141", "en": "Niphad", "mr": "निफाड"},
            "निफाड": {"code": "4141", "en": "Niphad", "mr": "निफाड"},
        }
    },
    "नाशिक": {
        "district_code": "516",
        "district_en": "Nashik",
        "district_mr": "नाशिक",
        "tehsils": {
            "nashik": {"code": "4140", "en": "Nashik City", "mr": "नाशिक शहर"},
            "नाशिक": {"code": "4140", "en": "Nashik City", "mr": "नाशिक शहर"},
        }
    }
}

def resolve_lgd_codes(district: Optional[str], tehsil: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    """
    Resolves district and tehsil text inputs into official LGD codes (lgd_district_code, lgd_tehsil_code).
    Handles both English and Marathi script inputs.
    """
    if not district:
        return None, None
    
    clean_dist = district.strip().lower()
    dist_info = LGD_MASTER.get(clean_dist)
    
    if not dist_info:
        # Fallback fuzzy match
        for k, v in LGD_MASTER.items():
            if k in clean_dist or clean_dist in k:
                dist_info = v
                break

    if not dist_info:
        return None, None

    dist_code = dist_info.get("district_code")
    tehsil_code = None

    if tehsil:
        clean_tehsil = tehsil.strip().lower()
        tehsils_map = dist_info.get("tehsils", {})
        t_info = tehsils_map.get(clean_tehsil)
        
        if not t_info:
            for k, v in tehsils_map.items():
                if k in clean_tehsil or clean_tehsil in k:
                    t_info = v
                    break
        
        if t_info:
            tehsil_code = t_info.get("code")

    # Default fallback if tehsil matches district name
    if not tehsil_code and (clean_dist == "jalgaon" or clean_dist == "जळगाव"):
        tehsil_code = "4172"
    elif not tehsil_code and (clean_dist == "pune" or clean_dist == "पुणे"):
        tehsil_code = "4156"

    return dist_code, tehsil_code
