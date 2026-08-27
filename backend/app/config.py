from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Intelligent Land Record Digitization & Validation API"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001"
    
    # Sarvam AI Vision Model
    SARVAM_API_KEY: str = ""
    SARVAM_API_URL: str = "https://api.sarvam.ai/v1/vision"
    
    # Supabase Credentials
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""

    class Config:
        env_file = ".env"
        extra = "allow"

    @property
    def origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

settings = Settings()
