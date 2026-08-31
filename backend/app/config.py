from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Intelligent Land Record Digitization & Validation API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    HOST: str = "0.0.0.0"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001"
    # Anchored regex for hostnames that change on every deploy (Vercel previews).
    # Empty in development; set on the server, e.g.
    #   ^https://brain-land[a-z0-9-]*\.vercel\.app$
    ALLOWED_ORIGIN_REGEX: str = ""
    CORS_ORIGINS: str = '["http://localhost:3000"]'
    
    # Sarvam AI Document Intelligence & Vision
    SARVAM_API_KEY: str = ""
    SARVAM_BASE_URL: str = "https://api.sarvam.ai"
    SARVAM_DIGITISE_URL: str = "https://api.sarvam.ai/doc-ai/v1/job/digitise"
    SARVAM_EXTRACT_URL: str = "https://api.sarvam.ai/doc-ai/v1/job/extract"
    SARVAM_API_URL: str = "https://api.sarvam.ai/doc-ai/v1/job/digitise"
    SARVAM_OCR_URL: str = "https://api.sarvam.ai/doc-ai/v1/job/digitise"
    
    # Supabase Credentials
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_ANON_KEY: str = ""

    class Config:
        env_file = ".env"
        extra = "allow"

    @property
    def origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

settings = Settings()

