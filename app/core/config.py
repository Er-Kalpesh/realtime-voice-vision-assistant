from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    GEMINI_API_KEY: str = Field(default="", description="Google Gemini API Key")
    MODEL_NAME: str = Field("gemini-3.8-live", description="Gemini model to use for Live API")
    SYSTEM_INSTRUCTION: str = Field(
        "You are a helpful and concise voice and vision assistant. Keep your responses relatively short as this is a real-time conversation.",
        description="System prompt for the assistant"
    )

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
