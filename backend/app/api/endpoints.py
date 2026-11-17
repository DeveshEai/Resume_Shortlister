import os
import shutil
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, Response
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.core.database import get_db
from app.core.config import settings
from app.models.models import (
    ScreeningSession, JobDescription, Candidate, ResumeFile, CandidateAnalysis
)
from app.schemas.schemas import (
    SessionCreate, ScreeningSessionOut,
    JobDescriptionCreate, JobDescriptionExtracted, JobDescriptionOut,
    CandidateOut, CandidateRankingItem, CandidateStatusUpdate,
    DashboardStats, ComparisonItem,
    SettingsOut, SettingsUpdate, ConnectionTestResponse,
    ResumeUploadResult, ScoringWeights
)
from app.services.screening_service import ScreeningService
from app.services.ai_provider import get_ai_provider, GroqProvider, RuleBasedProvider
from app.services.report_service import ReportService

router = APIRouter()

# =====================================================================
# SESSIONS
# =====================================================================

@router.post("/sessions", response_model=ScreeningSessionOut)
def create_session(data: SessionCreate, db: Session = Depends(get_db)):
    session = ScreeningService.create_session(
        db=db,
        title=data.title,
        department=data.department,
        weights=data.weights
    )
    return session

@router.get("/sessions", response_model=List[ScreeningSessionOut])
def list_sessions(db: Session = Depends(get_db)):
    sessions = db.query(ScreeningSession).order_by(desc(ScreeningSession.created_at)).all()
    results = []
    for s in sessions:
        candidates = s.candidates
        count = len(candidates)
        scores = [c.analysis.overall_score for c in candidates if c.analysis]
        highest = max(scores) if scores else 0.0
        avg = (sum(scores) / len(scores)) if scores else 0.0
        
        out = ScreeningSessionOut.model_validate(s)
        out.candidate_count = count
        out.highest_score = round(highest, 1)
        out.average_score = round(avg, 1)
        results.append(out)
    return results

@router.get("/sessions/{session_id}", response_model=ScreeningSessionOut)
def get_session(session_id: str, db: Session = Depends(get_db)):
    s = db.query(ScreeningSession).filter(ScreeningSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Screening session not found.")
    
    candidates = s.candidates
    count = len(candidates)
    scores = [c.analysis.overall_score for c in candidates if c.analysis]
    highest = max(scores) if scores else 0.0
    avg = (sum(scores) / len(scores)) if scores else 0.0
    
    out = ScreeningSessionOut.model_validate(s)
    out.candidate_count = count
    out.highest_score = round(highest, 1)
    out.average_score = round(avg, 1)
    return out

@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db)):
    s = db.query(ScreeningSession).filter(ScreeningSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Screening session not found.")
    
    # Clean up stored files
    for c in s.candidates:
        if c.resume_file and c.resume_file.file_path and os.path.exists(c.resume_file.file_path):
            try:
                os.remove(c.resume_file.file_path)
            except Exception:
                pass
                
    db.delete(s)
    db.commit()
    return {"message": "Session and all associated candidate data deleted successfully."}

# =====================================================================
# JOB DESCRIPTION & AI ANALYSIS
# =====================================================================

@router.post("/job-description/analyze", response_model=JobDescriptionExtracted)
def analyze_jd_text(payload: Dict[str, str]):
    raw_text = payload.get("raw_text", "").strip()
    if not raw_text:
        raise HTTPException(status_code=400, detail="Job description text cannot be empty.")
    
    provider = get_ai_provider()
    try:
        extracted = provider.analyze_job_description(raw_text)
        return JobDescriptionExtracted(**extracted)
    except Exception as e:
        # Graceful fallback to rule-based parser
        fallback = RuleBasedProvider()
        extracted = fallback.analyze_job_description(raw_text)
        return JobDescriptionExtracted(**extracted)

@router.post("/sessions/{session_id}/job-description", response_model=JobDescriptionOut)
def save_job_description(session_id: str, data: JobDescriptionCreate, db: Session = Depends(get_db)):
    s = db.query(ScreeningSession).filter(ScreeningSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found.")
    
    jd = ScreeningService.save_job_description(
        db=db,
        session_id=session_id,
        raw_text=data.raw_text,
        title=data.title,
        department=data.department,
        mandatory_skills=data.mandatory_skills,
        preferred_skills=data.preferred_skills,
        experience_years_min=data.experience_years_min,
        experience_requirements=data.experience_requirements,
        education_requirements=data.education_requirements,
        additional_requirements=data.additional_requirements
    )
    return jd

# =====================================================================
# RESUME UPLOAD & SCREENING
# =====================================================================

@router.post("/sessions/{session_id}/resumes", response_model=List[ResumeUploadResult])
async def upload_resumes(
    session_id: str,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db)
):
    s = db.query(ScreeningSession).filter(ScreeningSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found.")
    
    results = []
    for file in files:
        if not file.filename.lower().endswith(".pdf"):
            results.append(ResumeUploadResult(
                candidate_id="",
                original_filename=file.filename,
                file_size_bytes=0,
                file_hash="",
                page_count=0,
                is_scanned=False,
                upload_status="Failed",
                error_message="Only PDF files are supported."
            ))
            continue
            
        content = await file.read()
        res = ScreeningService.process_and_add_resume(
            db=db,
            session_id=session_id,
            content=content,
            filename=file.filename
        )
        if res.get("is_duplicate"):
            results.append(ResumeUploadResult(
                candidate_id="",
                original_filename=file.filename,
                file_size_bytes=0,
                file_hash="",
                page_count=0,
                is_scanned=False,
                upload_status="Failed",
                error_message=res.get("error_message")
            ))
        else:
            results.append(ResumeUploadResult(
                candidate_id=res["candidate_id"],
                original_filename=res["original_filename"],
                file_size_bytes=res["file_size_bytes"],
                file_hash=res["file_hash"],
                page_count=res["page_count"],
                is_scanned=res["is_scanned"],
                upload_status=res["upload_status"],
                error_message=res["error_message"]
            ))
            
    return results

@router.post("/sessions/{session_id}/screen")
def run_session_screening(session_id: str, db: Session = Depends(get_db)):
    s = db.query(ScreeningSession).filter(ScreeningSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found.")
    if not s.job_description:
        raise HTTPException(status_code=400, detail="Job Description must be configured before screening.")
        
    candidates = ScreeningService.screen_all_in_session(db, session_id)
    return {"message": f"Screened {len(candidates)} candidates.", "count": len(candidates)}

@router.post("/candidates/{candidate_id}/screen", response_model=CandidateOut)
def screen_candidate(candidate_id: str, db: Session = Depends(get_db)):
    cand = ScreeningService.screen_single_candidate(db, candidate_id)
    return cand

# =====================================================================
# CANDIDATE RANKINGS & DETAILS
# =====================================================================

@router.get("/sessions/{session_id}/candidates", response_model=List[CandidateRankingItem])
def get_rankings(
    session_id: str,
    sort_by: str = Query("highest_score", pattern="^(highest_score|lowest_score|relevant_experience|skills_match)$"),
    filter_band: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    rankings = ScreeningService.get_candidate_rankings(
        db=db,
        session_id=session_id,
        sort_by=sort_by,
        filter_band=filter_band
    )
    return rankings

@router.get("/candidates/{candidate_id}", response_model=CandidateOut)
def get_candidate(candidate_id: str, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    return c

@router.patch("/candidates/{candidate_id}", response_model=CandidateOut)
def update_candidate_status(
    candidate_id: str,
    payload: CandidateStatusUpdate,
    db: Session = Depends(get_db)
):
    c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not c:
        raise HTTPException(status_code=404, detail="Candidate not found.")
    
    c.review_status = payload.review_status
    if payload.recruiter_notes is not None:
        c.recruiter_notes = payload.recruiter_notes
    db.commit()
    db.refresh(c)
    return c

@router.get("/candidates/{candidate_id}/resume-file")
def view_resume_file(candidate_id: str, db: Session = Depends(get_db)):
    c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not c or not c.resume_file or not os.path.exists(c.resume_file.file_path):
        raise HTTPException(status_code=404, detail="Resume file not found.")
    
    return FileResponse(
        path=c.resume_file.file_path,
        media_type="application/pdf",
        filename=c.resume_file.original_filename
    )

# =====================================================================
# CANDIDATE COMPARISON (2-5 CANDIDATES)
# =====================================================================

@router.post("/sessions/{session_id}/compare", response_model=List[ComparisonItem])
def compare_candidates(
    session_id: str,
    payload: Dict[str, List[str]],
    db: Session = Depends(get_db)
):
    candidate_ids = payload.get("candidate_ids", [])
    if len(candidate_ids) < 2 or len(candidate_ids) > 5:
        raise HTTPException(status_code=400, detail="Please select between 2 and 5 candidates for comparison.")
        
    candidates = (
        db.query(Candidate)
        .filter(Candidate.id.in_(candidate_ids), Candidate.session_id == session_id)
        .all()
    )
    
    items = []
    for c in candidates:
        analysis = c.analysis
        score = analysis.overall_score if analysis else 0.0
        band = analysis.interpretation_band if analysis else "Pending"
        req_cov = analysis.required_skills_coverage if analysis else 0.0
        pref_cov = analysis.preferred_skills_coverage if analysis else 0.0
        quality = analysis.evidence_quality if analysis else "N/A"
        
        matched_req = []
        missing_req = []
        matched_pref = []
        
        if analysis and analysis.skill_matches:
            for sm in analysis.skill_matches:
                if sm.category == "required":
                    if sm.status == "matched":
                        matched_req.append(sm.skill_name)
                    else:
                        missing_req.append(sm.skill_name)
                elif sm.category == "preferred":
                    if sm.status == "matched":
                        matched_pref.append(sm.skill_name)

        items.append(ComparisonItem(
            candidate_id=c.id,
            name=c.name,
            overall_score=score,
            interpretation_band=band,
            required_skills_coverage=req_cov,
            preferred_skills_coverage=pref_cov,
            relevant_experience_years=c.relevant_experience_years,
            total_experience_years=c.total_experience_years,
            matched_required_skills=matched_req,
            missing_required_skills=missing_req,
            matched_preferred_skills=matched_pref,
            technical_skills=c.technical_skills or [],
            education=c.education or [],
            certifications=c.certifications or [],
            projects_count=len(c.projects or []),
            evidence_quality=quality,
            strengths=analysis.strengths if analysis else [],
            missing_qualifications=analysis.missing_qualifications if analysis else [],
            review_status=c.review_status
        ))
        
    return items

# =====================================================================
# REPORT EXPORTS
# =====================================================================

@router.get("/sessions/{session_id}/reports/pdf")
def export_pdf_report(session_id: str, db: Session = Depends(get_db)):
    s = db.query(ScreeningSession).filter(ScreeningSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found.")
    
    pdf_bytes = ReportService.generate_pdf_report(s)
    clean_title = (s.job_description.title if s.job_description else s.title).replace(" ", "_")
    filename = f"Screening_Report_{clean_title}_{s.created_at.strftime('%Y%m%d')}.pdf"
    
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/sessions/{session_id}/reports/excel")
def export_excel_report(session_id: str, db: Session = Depends(get_db)):
    s = db.query(ScreeningSession).filter(ScreeningSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found.")
    
    excel_bytes = ReportService.generate_excel_report(s)
    clean_title = (s.job_description.title if s.job_description else s.title).replace(" ", "_")
    filename = f"Screening_Report_{clean_title}_{s.created_at.strftime('%Y%m%d')}.xlsx"
    
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/sessions/{session_id}/reports/csv")
def export_csv_report(session_id: str, db: Session = Depends(get_db)):
    s = db.query(ScreeningSession).filter(ScreeningSession.id == session_id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Session not found.")
    
    csv_text = ReportService.generate_csv_ranking(s)
    clean_title = (s.job_description.title if s.job_description else s.title).replace(" ", "_")
    filename = f"Candidate_Rankings_{clean_title}_{s.created_at.strftime('%Y%m%d')}.csv"
    
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# =====================================================================
# DASHBOARD STATS
# =====================================================================

@router.get("/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(db: Session = Depends(get_db)):
    sessions = db.query(ScreeningSession).order_by(desc(ScreeningSession.created_at)).all()
    candidates = db.query(Candidate).all()
    
    total_sessions = len(sessions)
    total_candidates = len(candidates)
    
    recommended = sum(1 for c in candidates if c.review_status == "Recommended for Interview")
    needs_review = sum(1 for c in candidates if c.review_status in ["Needs Further Review", "Pending Review"])
    
    scores = [c.analysis.overall_score for c in candidates if c.analysis]
    avg_score = (sum(scores) / len(scores)) if scores else 0.0
    
    recent_sessions_out = []
    for s in sessions[:5]:
        c_list = s.candidates
        c_scores = [c.analysis.overall_score for c in c_list if c.analysis]
        high = max(c_scores) if c_scores else 0.0
        avg = (sum(c_scores) / len(c_scores)) if c_scores else 0.0
        
        item = ScreeningSessionOut.model_validate(s)
        item.candidate_count = len(c_list)
        item.highest_score = round(high, 1)
        item.average_score = round(avg, 1)
        recent_sessions_out.append(item)
        
    return DashboardStats(
        total_sessions=total_sessions,
        total_candidates=total_candidates,
        recommended_count=recommended,
        review_needed_count=needs_review,
        average_score=round(avg_score, 1),
        recent_sessions=recent_sessions_out
    )

# =====================================================================
# SETTINGS & CONNECTION TEST
# =====================================================================

@router.get("/settings", response_model=SettingsOut)
def get_system_settings():
    masked = ""
    if settings.GROQ_API_KEY:
        masked = f"{settings.GROQ_API_KEY[:4]}...{settings.GROQ_API_KEY[-4:]}"
        
    return SettingsOut(
        ai_provider=settings.AI_PROVIDER,
        groq_api_key_configured=bool(settings.GROQ_API_KEY),
        groq_api_key_masked=masked,
        groq_model=settings.GROQ_MODEL,
        gemini_supported=False,  # Coming soon
        max_upload_size_mb=settings.MAX_UPLOAD_SIZE_MB,
        default_weights=settings.DEFAULT_WEIGHTS,
        thresholds={
            "strong_match": settings.STRONG_MATCH_THRESHOLD,
            "good_potential": settings.GOOD_POTENTIAL_THRESHOLD,
            "partial_match": settings.PARTIAL_MATCH_THRESHOLD
        }
    )

@router.patch("/settings", response_model=SettingsOut)
def update_system_settings(payload: SettingsUpdate):
    if payload.ai_provider:
        settings.AI_PROVIDER = payload.ai_provider
    if payload.groq_api_key:
        settings.GROQ_API_KEY = payload.groq_api_key
    if payload.groq_model:
        settings.GROQ_MODEL = payload.groq_model
    if payload.max_upload_size_mb:
        settings.MAX_UPLOAD_SIZE_MB = payload.max_upload_size_mb
        settings.MAX_UPLOAD_SIZE_BYTES = payload.max_upload_size_mb * 1024 * 1024
    if payload.default_weights:
        settings.DEFAULT_WEIGHTS = payload.default_weights.model_dump()
        
    return get_system_settings()

@router.post("/settings/test-connection", response_model=ConnectionTestResponse)
def test_ai_connection():
    provider = get_ai_provider()
    res = provider.test_connection()
    return ConnectionTestResponse(
        success=res.get("success", False),
        provider=res.get("provider", "unknown"),
        model=res.get("model", "unknown"),
        message=res.get("message", "")
    )

# =====================================================================
# 1-CLICK DEMO SEEDER
# =====================================================================

@router.post("/demo/seed")
def seed_demo_session(db: Session = Depends(get_db)):
    """Creates a sample screening session loaded with the 15 sample resumes."""
    sample_dir = settings.SAMPLE_DIR
    sample_jd_path = sample_dir / "sample_job_description.txt"
    if not sample_jd_path.exists():
        raise HTTPException(status_code=500, detail="Sample job description not found.")

    with open(sample_jd_path, "r", encoding="utf-8") as f:
        jd_text = f.read()

    # 1. Create Session
    session = ScreeningService.create_session(
        db=db,
        title="Senior Full-Stack AI Engineer",
        department="Core Product Engineering"
    )

    # 2. Extract JD requirements (or rule-based if fast)
    provider = get_ai_provider()
    try:
        jd_info = provider.analyze_job_description(jd_text)
    except Exception:
        fallback = RuleBasedProvider()
        jd_info = fallback.analyze_job_description(jd_text)

    ScreeningService.save_job_description(
        db=db,
        session_id=session.id,
        raw_text=jd_text,
        title=jd_info.get("title", "Senior Full-Stack AI Engineer"),
        department=jd_info.get("department", "Core Product Engineering"),
        mandatory_skills=jd_info.get("mandatory_skills", []),
        preferred_skills=jd_info.get("preferred_skills", []),
        experience_years_min=jd_info.get("experience_years_min", 5.0),
        experience_requirements=jd_info.get("experience_requirements", "5+ years"),
        education_requirements=jd_info.get("education_requirements", "B.S. in CS or equivalent"),
        additional_requirements=jd_info.get("additional_requirements")
    )

    # 3. Add all 15 PDF resumes
    pdf_files = list(sample_dir.glob("*.pdf"))
    for pdf_file in pdf_files:
        with open(pdf_file, "rb") as pf:
            content = pf.read()
        ScreeningService.process_and_add_resume(
            db=db,
            session_id=session.id,
            content=content,
            filename=pdf_file.name
        )

    return {
        "message": f"Successfully created demo session with {len(pdf_files)} resumes.",
        "session_id": session.id,
        "candidate_count": len(pdf_files)
    }

