"""
Create the two accounts the demo needs.

Officer accounts cannot be self-registered: the signup trigger writes
role='CITIZEN' for everybody, deliberately, so that a citizen cannot hand
themselves an officer role at registration. Promotion happens here, with the
service-role key, which is the one credential that can do it.

    python scripts/seed_officer.py

Reads from backend/.env. Nothing in this file is a credential — the six DEMO_*
values live in .env and are never committed.
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip()
SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()

OFFICER = {
    "email": os.getenv("DEMO_OFFICER_EMAIL", "").strip(),
    "password": os.getenv("DEMO_OFFICER_PASSWORD", "").strip(),
    "name": os.getenv("DEMO_OFFICER_NAME", "Revenue Officer").strip(),
    "district": os.getenv("DEMO_OFFICER_DISTRICT", "Pune").strip(),
    "tehsil": os.getenv("DEMO_OFFICER_TEHSIL", "Haveli").strip(),
}
CITIZEN = {
    "email": os.getenv("DEMO_CITIZEN_EMAIL", "").strip(),
    "password": os.getenv("DEMO_CITIZEN_PASSWORD", "").strip(),
}


def fail(message: str) -> None:
    print(f"  !! {message}")
    sys.exit(1)


def find_or_create(client, email: str, password: str, full_name: str) -> str:
    """The auth user id for this email, creating the account if needed."""
    try:
        listed = client.auth.admin.list_users()
        users = listed if isinstance(listed, list) else getattr(listed, "users", []) or []
        for user in users:
            if (getattr(user, "email", "") or "").lower() == email.lower():
                print(f"  = {email} already exists")
                return user.id
    except Exception as exc:
        print(f"  .. could not list existing users ({exc}); attempting create")

    try:
        created = client.auth.admin.create_user({
            "email": email,
            "password": password,
            # Otherwise the account cannot sign in until somebody clicks a link
            # in an inbox that does not exist.
            "email_confirm": True,
            "user_metadata": {"full_name": full_name},
        })
        user = getattr(created, "user", None) or created
        print(f"  + created {email}")
        return user.id
    except Exception as exc:
        fail(f"Could not create {email}: {exc}")


def main() -> int:
    if not SUPABASE_URL or not SERVICE_KEY:
        fail("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in backend/.env")
    for label, entry in (("officer", OFFICER), ("citizen", CITIZEN)):
        if not entry["email"] or not entry["password"]:
            fail(f"DEMO_{label.upper()}_EMAIL and DEMO_{label.upper()}_PASSWORD "
                 f"must be set in backend/.env")

    from supabase import create_client
    client = create_client(SUPABASE_URL, SERVICE_KEY)

    print("Seeding demo accounts")

    officer_id = find_or_create(client, OFFICER["email"], OFFICER["password"], OFFICER["name"])
    # The trigger has already written a CITIZEN profile; this is the promotion.
    client.table("profiles").upsert({
        "id": officer_id,
        "role": "OFFICER",
        "full_name": OFFICER["name"],
        "designation": "Sub-Divisional Revenue Officer (SDO)",
        "employee_id": os.getenv("DEMO_OFFICER_EMPLOYEE_ID", "REV-MH-PN-4091").strip(),
        "district": OFFICER["district"],
        "tehsil": OFFICER["tehsil"],
    }).execute()
    print(f"  > {OFFICER['email']} promoted to OFFICER "
          f"({OFFICER['district']} / {OFFICER['tehsil']})")

    citizen_id = find_or_create(client, CITIZEN["email"], CITIZEN["password"], "Demo Citizen")
    print(f"  > {CITIZEN['email']} is a CITIZEN")

    check = client.table("profiles").select("id, role, full_name").in_(
        "id", [officer_id, citizen_id]).execute()
    print("\nProfiles now:")
    for row in check.data or []:
        print(f"  {row['role']:<8} {row.get('full_name')}")
    print("\nDone. Sign in through the UI with these accounts.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
