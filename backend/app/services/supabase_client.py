from app.config import settings

class SupabaseService:
    """
    Client interface for Supabase PostgreSQL database and Storage.
    """
    def __init__(self):
        self.supabase_url = settings.SUPABASE_URL
        self.service_role_key = settings.SUPABASE_SERVICE_ROLE_KEY
        self._client = None

    @property
    def client(self):
        if not self._client and self.supabase_url and self.service_role_key:
            try:
                from supabase import create_client
                self._client = create_client(self.supabase_url, self.service_role_key)
            except Exception as e:
                print(f"[Supabase] Warning: Could not initialize Supabase client: {e}")
        return self._client

supabase_service = SupabaseService()
