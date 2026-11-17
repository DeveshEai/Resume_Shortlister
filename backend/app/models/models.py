import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, Text, DateTime, ForeignKey, JSON
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class ScreeningSession(Base):
    __tablename__ = "screening_sessions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    department = Column(String(255), nullable=True)
    status = Column(String(50), default="active", nullable=False)  # active, completed, archived
    weights = Column(JSON, nullable=True)  # custom scoring weights mapping
    thresholds = Column(JSON, nullable=True)  # score thresholds mapping
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    job_description = relationship("JobDescription", back_populates="session", uselist=False, cascade="all, delete-orphan")
    candidates = relationship("Candidate", back_populates="session", cascade="all, delete-orphan")

class JobDescription(Base):
    __tablename__ = "job_descriptions"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("screening_sessions.id", ondelete="CASCADE"), nullable=False)
    raw_text = Column(Text, nullable=False)
    title = Column(String(255), nullable=False)
    department = Column(String(255), nullable=True)
    responsibilities = Column(JSON, default=list)  # list of strings
    mandatory_skills = Column(JSON, default=list)  # list of strings
    preferred_skills = Column(JSON, default=list)  # list of strings
    technical_requirements = Column(JSON, default=list)  # list of strings
    experience_years_min = Column(Float, nullable=True)
    experience_requirements = Column(Text, nullable=True)
    education_requirements = Column(Text, nullable=True)
    domain_expertise = Column(JSON, default=list)  # list of strings
    additional_requirements = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    session = relationship("ScreeningSession", back_populates="job_description")

class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    session_id = Column(String(36), ForeignKey("screening_sessions.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), default="Not specified", nullable=False)
    email = Column(String(255), default="Not specified", nullable=False)
    phone = Column(String(100), default="Not specified", nullable=False)
    summary = Column(Text, default="Not specified", nullable=False)
    
    total_experience_years = Column(Float, default=0.0)
    relevant_experience_years = Column(Float, default=0.0)
    
    job_titles = Column(JSON, default=list)
    companies = Column(JSON, default=list)
    technical_skills = Column(JSON, default=list)
    soft_skills = Column(JSON, default=list)
    education = Column(JSON, default=list)
    certifications = Column(JSON, default=list)
    projects = Column(JSON, default=list)
    achievements = Column(JSON, default=list)
    industry_experience = Column(JSON, default=list)
    
    # Recruiter decisions & notes
    review_status = Column(
        String(50),
        default="Pending Review",
        nullable=False
    )  # "Pending Review", "Recommended for Interview", "Needs Further Review", "Not Progressing"
    recruiter_notes = Column(Text, default="", nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    session = relationship("ScreeningSession", back_populates="candidates")
    resume_file = relationship("ResumeFile", back_populates="candidate", uselist=False, cascade="all, delete-orphan")
    analysis = relationship("CandidateAnalysis", back_populates="candidate", uselist=False, cascade="all, delete-orphan")

class ResumeFile(Base):
    __tablename__ = "resume_files"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    candidate_id = Column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, nullable=False)
    file_hash = Column(String(64), nullable=False, index=True)  # SHA-256
    page_count = Column(Integer, default=1)
    is_scanned = Column(Boolean, default=False)
    upload_status = Column(
        String(50),
        default="Uploaded",
        nullable=False
    )  # "Uploaded", "Extracting", "Analysing", "Completed", "Failed"
    error_message = Column(Text, nullable=True)
    extracted_text_by_page = Column(JSON, default=list)  # [{"page": 1, "text": "..."}]
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    candidate = relationship("Candidate", back_populates="resume_file")

class CandidateAnalysis(Base):
    __tablename__ = "candidate_analyses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    candidate_id = Column(String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False)
    overall_score = Column(Float, nullable=False, default=0.0)
    interpretation_band = Column(String(100), nullable=False, default="Lower apparent match; additional review needed.")
    
    # Coverage metrics
    required_skills_coverage = Column(Float, default=0.0)  # % coverage
    preferred_skills_coverage = Column(Float, default=0.0)  # % coverage
    
    # Detailed highlights
    strengths = Column(JSON, default=list)
    missing_qualifications = Column(JSON, default=list)
    potential_gaps = Column(JSON, default=list)
    evidence_quality = Column(String(100), default="Moderate", nullable=False)  # High, Moderate, Low
    suggested_interview_questions = Column(JSON, default=list)
    
    # AI provenance
    is_ai_generated = Column(Boolean, default=True, nullable=False)
    ai_provider = Column(String(50), default="groq", nullable=False)  # groq, gemini, rule_based
    ai_model = Column(String(100), nullable=True)
    
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    candidate = relationship("Candidate", back_populates="analysis")
    score_breakdowns = relationship("ScoreBreakdown", back_populates="analysis", cascade="all, delete-orphan")
    skill_matches = relationship("SkillMatch", back_populates="analysis", cascade="all, delete-orphan")

class ScoreBreakdown(Base):
    __tablename__ = "score_breakdowns"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    analysis_id = Column(String(36), ForeignKey("candidate_analyses.id", ondelete="CASCADE"), nullable=False)
    criteria_name = Column(String(100), nullable=False)
    weight_percentage = Column(Float, nullable=False)
    raw_score = Column(Float, nullable=False)  # 0 to 100
    weighted_score = Column(Float, nullable=False)  # raw_score * (weight / 100)
    explanation = Column(Text, nullable=False)
    evidence = Column(Text, nullable=True)
    missing_items = Column(JSON, default=list)
    page_references = Column(JSON, default=list)

    analysis = relationship("CandidateAnalysis", back_populates="score_breakdowns")

class SkillMatch(Base):
    __tablename__ = "skill_matches"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    analysis_id = Column(String(36), ForeignKey("candidate_analyses.id", ondelete="CASCADE"), nullable=False)
    skill_name = Column(String(150), nullable=False)
    category = Column(String(50), nullable=False)  # "required" or "preferred"
    status = Column(String(50), nullable=False)  # "matched", "missing", "partial"
    evidence = Column(Text, nullable=True)
    page_number = Column(Integer, nullable=True)

    analysis = relationship("CandidateAnalysis", back_populates="skill_matches")
