from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, field_validator, ConfigDict

# --- Job Description Schemas ---

class JobDescriptionCreate(BaseModel):
    title: str = Field(..., description="Job Title")
    department: Optional[str] = Field(None, description="Department or Business Unit")
    raw_text: str = Field(..., description="Full Job Description text")
    mandatory_skills: Optional[List[str]] = Field(default_factory=list)
    preferred_skills: Optional[List[str]] = Field(default_factory=list)
    experience_years_min: Optional[float] = Field(None)
    experience_requirements: Optional[str] = None
    education_requirements: Optional[str] = None
    additional_requirements: Optional[str] = None

class JobDescriptionExtracted(BaseModel):
    title: str
    department: Optional[str] = None
    responsibilities: List[str] = Field(default_factory=list)
    mandatory_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    technical_requirements: List[str] = Field(default_factory=list)
    experience_years_min: Optional[float] = None
    experience_requirements: Optional[str] = None
    education_requirements: Optional[str] = None
    domain_expertise: List[str] = Field(default_factory=list)
    important_qualifications: List[str] = Field(default_factory=list)

class JobDescriptionOut(BaseModel):
    id: str
    session_id: str
    raw_text: str
    title: str
    department: Optional[str] = None
    responsibilities: List[str]
    mandatory_skills: List[str]
    preferred_skills: List[str]
    technical_requirements: List[str]
    experience_years_min: Optional[float] = None
    experience_requirements: Optional[str] = None
    education_requirements: Optional[str] = None
    domain_expertise: List[str]
    additional_requirements: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

# --- Scoring Weights Schemas ---

class ScoringWeights(BaseModel):
    required_skills: float = Field(35.0, ge=0, le=100)
    relevant_experience: float = Field(25.0, ge=0, le=100)
    technical_domain: float = Field(15.0, ge=0, le=100)
    projects_achievements: float = Field(10.0, ge=0, le=100)
    education_certifications: float = Field(10.0, ge=0, le=100)
    preferred_skills: float = Field(5.0, ge=0, le=100)

    @field_validator('*', mode='before')
    def validate_weights(cls, v):
        try:
            return float(v)
        except (ValueError, TypeError):
            return 0.0

    def validate_total(self) -> bool:
        total = (
            self.required_skills +
            self.relevant_experience +
            self.technical_domain +
            self.projects_achievements +
            self.education_certifications +
            self.preferred_skills
        )
        return abs(total - 100.0) < 0.1

    def redistribute_active(self, active_keys: List[str]) -> "ScoringWeights":
        """Redistribute 100% proportionally among active criteria."""
        weights_dict = {
            "required_skills": self.required_skills,
            "relevant_experience": self.relevant_experience,
            "technical_domain": self.technical_domain,
            "projects_achievements": self.projects_achievements,
            "education_certifications": self.education_certifications,
            "preferred_skills": self.preferred_skills,
        }
        current_sum = sum(weights_dict[k] for k in active_keys if k in weights_dict)
        if current_sum <= 0:
            even = 100.0 / len(active_keys) if active_keys else 0.0
            return ScoringWeights(**{k: (even if k in active_keys else 0.0) for k in weights_dict})
        
        ratio = 100.0 / current_sum
        new_weights = {}
        for k in weights_dict:
            new_weights[k] = round(weights_dict[k] * ratio, 2) if k in active_keys else 0.0
        # Balance small rounding difference on the first active key
        diff = 100.0 - sum(new_weights.values())
        if active_keys and diff != 0:
            new_weights[active_keys[0]] = round(new_weights[active_keys[0]] + diff, 2)
        return ScoringWeights(**new_weights)

# --- Resume & Extraction Schemas ---

class ExtractedCandidateInfo(BaseModel):
    name: str = "Not specified"
    email: str = "Not specified"
    phone: str = "Not specified"
    summary: str = "Not specified"
    total_experience_years: float = 0.0
    relevant_experience_years: float = 0.0
    job_titles: List[str] = Field(default_factory=list)
    companies: List[str] = Field(default_factory=list)
    technical_skills: List[str] = Field(default_factory=list)
    soft_skills: List[str] = Field(default_factory=list)
    education: List[Dict[str, Any]] = Field(default_factory=list)
    certifications: List[str] = Field(default_factory=list)
    projects: List[Dict[str, Any]] = Field(default_factory=list)
    achievements: List[str] = Field(default_factory=list)
    industry_experience: List[str] = Field(default_factory=list)

class ResumeUploadResult(BaseModel):
    candidate_id: str
    original_filename: str
    file_size_bytes: int
    file_hash: str
    page_count: int
    is_scanned: bool
    upload_status: str
    error_message: Optional[str] = None

# --- Scoring & Analysis Schemas ---

class SkillMatchOut(BaseModel):
    id: Optional[str] = None
    skill_name: str
    category: str  # "required" or "preferred"
    status: str  # "matched", "missing", "partial"
    evidence: Optional[str] = None
    page_number: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)

class ScoreBreakdownOut(BaseModel):
    id: Optional[str] = None
    criteria_name: str
    weight_percentage: float
    raw_score: float
    weighted_score: float
    explanation: str
    evidence: Optional[str] = None
    missing_items: List[str] = Field(default_factory=list)
    page_references: List[int] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

class CandidateAnalysisOut(BaseModel):
    id: str
    candidate_id: str
    overall_score: float
    interpretation_band: str
    required_skills_coverage: float
    preferred_skills_coverage: float
    strengths: List[str]
    missing_qualifications: List[str]
    potential_gaps: List[str]
    evidence_quality: str
    suggested_interview_questions: List[str]
    is_ai_generated: bool
    ai_provider: str
    ai_model: Optional[str] = None
    created_at: datetime
    score_breakdowns: List[ScoreBreakdownOut] = Field(default_factory=list)
    skill_matches: List[SkillMatchOut] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

# --- Candidate Schemas ---

class CandidateOut(BaseModel):
    id: str
    session_id: str
    name: str
    email: str
    phone: str
    summary: str
    total_experience_years: float
    relevant_experience_years: float
    job_titles: List[str]
    companies: List[str]
    technical_skills: List[str]
    soft_skills: List[str]
    education: List[Any]
    certifications: List[str]
    projects: List[Any]
    achievements: List[str]
    industry_experience: List[str]
    review_status: str
    recruiter_notes: Optional[str] = ""
    created_at: datetime
    analysis: Optional[CandidateAnalysisOut] = None
    resume_file: Optional[ResumeUploadResult] = None

    model_config = ConfigDict(from_attributes=True)

class CandidateRankingItem(BaseModel):
    rank: int
    candidate_id: str
    candidate_name: str
    original_filename: str
    overall_score: float
    interpretation_band: str
    required_skills_coverage: float
    preferred_skills_coverage: float
    relevant_experience_years: float
    total_experience_years: float
    review_status: str
    evidence_quality: str
    is_ai_generated: bool
    created_at: datetime

class CandidateStatusUpdate(BaseModel):
    review_status: str = Field(..., description="Pending Review, Recommended for Interview, Needs Further Review, Not Progressing")
    recruiter_notes: Optional[str] = None

# --- Session Schemas ---

class SessionCreate(BaseModel):
    title: str
    department: Optional[str] = None
    weights: Optional[ScoringWeights] = None

class ScreeningSessionOut(BaseModel):
    id: str
    title: str
    department: Optional[str] = None
    status: str
    weights: Optional[Dict[str, float]] = None
    thresholds: Optional[Dict[str, float]] = None
    created_at: datetime
    updated_at: datetime
    candidate_count: Optional[int] = 0
    highest_score: Optional[float] = 0.0
    average_score: Optional[float] = 0.0
    job_description: Optional[JobDescriptionOut] = None

    model_config = ConfigDict(from_attributes=True)

# --- Dashboard & Comparison Schemas ---

class DashboardStats(BaseModel):
    total_sessions: int
    total_candidates: int
    recommended_count: int
    review_needed_count: int
    average_score: float
    recent_sessions: List[ScreeningSessionOut]

class ComparisonItem(BaseModel):
    candidate_id: str
    name: str
    overall_score: float
    interpretation_band: str
    required_skills_coverage: float
    preferred_skills_coverage: float
    relevant_experience_years: float
    total_experience_years: float
    matched_required_skills: List[str]
    missing_required_skills: List[str]
    matched_preferred_skills: List[str]
    technical_skills: List[str]
    education: List[Any]
    certifications: List[str]
    projects_count: int
    evidence_quality: str
    strengths: List[str]
    missing_qualifications: List[str]
    review_status: str

# --- Settings & AI Config Schemas ---

class SettingsUpdate(BaseModel):
    ai_provider: Optional[str] = None
    groq_api_key: Optional[str] = None
    groq_model: Optional[str] = None
    max_upload_size_mb: Optional[int] = None
    default_weights: Optional[ScoringWeights] = None

class SettingsOut(BaseModel):
    ai_provider: str
    groq_api_key_configured: bool
    groq_api_key_masked: str
    groq_model: str
    gemini_supported: bool
    max_upload_size_mb: int
    default_weights: Dict[str, float]
    thresholds: Dict[str, float]

class ConnectionTestResponse(BaseModel):
    success: bool
    provider: str
    model: str
    message: str
