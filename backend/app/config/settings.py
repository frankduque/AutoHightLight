from pydantic_settings import BaseSettings
from typing import Optional
import os
from pathlib import Path

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/autohighlights"
    
    # API
    API_V1_STR: str = "/api"
    PROJECT_NAME: str = "AutoHighlights API"
    API_PORT: int = 8001
    BACKEND_PORT: int = 8001
    
    # YouTube
    YOUTUBE_API_KEY: Optional[str] = None
    
    # OpenAI
    OPENAI_API_KEY: Optional[str] = None
    
    # Anthropic
    ANTHROPIC_API_KEY: Optional[str] = None
    
    # Storage
    STORAGE_PATH: str = "./storage"
    DOWNLOADS_PATH: str = "./storage/downloads"
    VIDEOS_PATH: str = "./storage/videos"
    TRANSCRIPTS_PATH: str = "./storage/transcripts"
    CLIPS_PATH: str = "./storage/clips"
    
    # CORS
    BACKEND_CORS_ORIGINS: list = ["http://localhost:3000", "http://localhost:3001"]
    
    class Config:
        env_file = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"

settings = Settings()
