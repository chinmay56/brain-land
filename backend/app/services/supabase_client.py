import logging
from app.config import settings
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class SupabaseService:
    """
    Client interface for Supabase PostgreSQL database and Storage.
    """
    def __init__(self):
        self.supabase_url = settings.SUPABASE_URL
        self.api_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_ANON_KEY
        self.bucket_name = "land-record-documents"
        self._client = None

    @property
    def client(self):
        if not self._client and self.supabase_url and self.api_key:
            try:
                from supabase import create_client
                self._client = create_client(self.supabase_url, self.api_key)
            except Exception as e:
                logger.warning(f"[Supabase] Could not initialize Supabase client: {e}")
        return self._client

    def upload_document_to_bucket(
        self, 
        file_bytes: bytes, 
        file_name: str, 
        district: str, 
        tehsil: str, 
        application_no: str,
        user_id: str = "anonymous",
        content_type: str = "application/pdf"
    ) -> Optional[str]:
        """
        Uploads document file bytes to user-isolated Supabase Storage Bucket:
        Path format: {user_id}/{district}/{tehsil}/{application_no}/{file_name}

        Returns the storage PATH, not a URL. The bucket is private, so a URL
        is only valid for as long as it is signed for; callers ask for one at
        read time via get_signed_url.
        """
        clean_user = (user_id or "anonymous").strip()
        clean_district = (district or "Pune").strip().replace(" ", "_")
        clean_tehsil = (tehsil or "Haveli").strip().replace(" ", "_")
        storage_path = f"{clean_user}/{clean_district}/{clean_tehsil}/{application_no}/{file_name}"

        if not self.client:
            logger.info("Supabase client offline. Using local object URL reference.")
            return f"/uploads/{storage_path}"

        try:
            # Create bucket if it doesn't exist
            try:
                # Private: a land document must not be fetchable by URL alone.
                self.client.storage.create_bucket(self.bucket_name, options={"public": False})
            except Exception:
                pass # Bucket already exists

            # Upload file bytes to bucket
            res = self.client.storage.from_(self.bucket_name).upload(
                path=storage_path,
                file=file_bytes,
                file_options={"content-type": content_type, "upsert": "true"}
            )
            
            logger.info(f"Successfully uploaded {file_name} to Supabase Storage at {storage_path}")
            return storage_path
        except Exception as e:
            # No fabricated URL on failure. The previous fallback returned a
            # hardcoded public link to a project this code may not even be
            # talking to, which read as success to every caller.
            logger.error(f"Error uploading {file_name} to Supabase storage: {e}")
            return None

    def get_signed_url(self, storage_path: str, expires: int = 3600) -> Optional[str]:
        """A time-limited URL for one private object, or None."""
        if not self.client or not storage_path:
            return None
        try:
            res = self.client.storage.from_(self.bucket_name).create_signed_url(storage_path, expires)
            if isinstance(res, dict):
                return res.get("signedURL") or res.get("signed_url") or res.get("signedUrl")
            return getattr(res, "signed_url", None)
        except Exception as e:
            logger.error(f"Could not sign {storage_path}: {e}")
            return None

    def insert_land_record_to_db(self, record_payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Inserts land record application payload directly into Supabase public.land_records table.
        This triggers Supabase Realtime WebSocket INSERT events to online officers!
        """
        if not self.client:
            logger.info("Supabase client offline. Record handled in local state.")
            return record_payload

        try:
            res = self.client.table("land_records").upsert(record_payload).execute()
            if res.data:
                logger.info(f"Successfully upserted land record {record_payload.get('id')} to Supabase DB.")
                return res.data[0]
            return record_payload
        except Exception as e:
            logger.error(f"Error upserting record to Supabase DB: {e}")
            return record_payload

supabase_service = SupabaseService()
