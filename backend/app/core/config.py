import os
from pathlib import Path
from typing import Dict, Any
from pydantic import BaseModel, Field
from dotenv import load_dotenv

# Root directory of the project
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent

# Load local .env if present
load_dotenv(BASE_DIR / ".env")

class Settings(BaseModel):
    PROJECT_NAME: str = "AI-Powered Resume Shortlister"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_PREFIX: str = "/api"
    
    # AI Configuration
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "openai/gpt-oss-20b")
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "groq")  # groq, gemini, rule_based
    
    # Future Gemini configuration
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-1.5-pro")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'resume_shortlister.db'}")
    
    # Storage
    MAX_UPLOAD_SIZE_MB: int = int(os.getenv("MAX_UPLOAD_SIZE_MB", "10"))
    MAX_UPLOAD_SIZE_BYTES: int = 10 * 1024 * 1024
    UPLOAD_DIR: Path = BASE_DIR / "uploads"
    REPORT_DIR: Path = BASE_DIR / "reports"
    SAMPLE_DIR: Path = BASE_DIR / "sample_resumes"
    
    # Default Scoring Weights (%)
    DEFAULT_WEIGHTS: Dict[str, float] = {
        "required_skills": 35.0,
        "relevant_experience": 25.0,
        "technical_domain": 15.0,
        "projects_achievements": 10.0,
        "education_certifications": 10.0,
        "preferred_skills": 5.0
    }
    
    # Score Thresholds
    STRONG_MATCH_THRESHOLD: float = 85.0
    GOOD_POTENTIAL_THRESHOLD: float = 70.0
    PARTIAL_MATCH_THRESHOLD: float = 55.0

settings = Settings()

# Ensure directories exist
settings.UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
settings.REPORT_DIR.mkdir(parents=True, exist_ok=True)
settings.SAMPLE_DIR.mkdir(parents=True, exist_ok=True)
