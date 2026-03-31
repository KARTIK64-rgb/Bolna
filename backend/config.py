import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    PORT: int = 8000
    BOLNA_API_KEY: str = ""
    CONFIRMBOT_AGENT_ID: str = ""
    FOLLOWUPBOT_AGENT_ID: str = ""
    FEEDBACKBOT_AGENT_ID: str = ""
    CLINIC_NAME: str = "HealthFirst Clinic"
    BACKEND_API_KEY: str = "medcall_secret_key_123"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
