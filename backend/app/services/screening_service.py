import logging
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, asc
from app.models.models import (
    ScreeningSession,
    JobDescription,
    Candidate,
    ResumeFile,
    CandidateAnalysis,
    ScoreBreakdown,
    SkillMatch
)
from app.schemas.schemas import ScoringWeights
from app.services.ai_provider import get_ai_provider, GroqProvider, RuleBasedProvider
from app.services.pdf_service import process_pdf_file
from app.core.config import settings

logger = logging.getLogger(__name__)

class ScreeningService:
    @staticmethod
    def create_session(
        db: Session,
        title: str,
        department: Optional[str] = None,
        weights: Optional[ScoringWeights] = None
    ) -> ScreeningSession:
        effective_weights = (
            weights.model_dump() if weights else settings.DEFAULT_WEIGHTS
        )
        thresholds = {
            "strong_match": settings.STRONG_MATCH_THRESHOLD,
            "good_potential": settings.GOOD_POTENTIAL_THRESHOLD,
            "partial_match": settings.PARTIAL_MATCH_THRESHOLD
        }
        session = ScreeningSession(
            title=title,
            department=department,
            status="active",
            weights=effective_weights,
            thresholds=thresholds
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def save_job_description(
        db: Session,
        session_id: str,
        raw_text: str,
        title: str,
        department: Optional[str] = None,
        mandatory_skills: Optional[List[str]] = None,
        preferred_skills: Optional[List[str]] = None,
        experience_years_min: Optional[float] = None,
        experience_requirements: Optional[str] = None,
        education_requirements: Optional[str] = None,
        technical_requirements: Optional[List[str]] = None,
        domain_expertise: Optional[List[str]] = None,
        additional_requirements: Optional[str] = None
    ) -> JobDescription:
        # Check if JD already exists for this session
        existing = db.query(JobDescription).filter(JobDescription.session_id == session_id).first()
        if existing:
            existing.raw_text = raw_text
            existing.title = title
            existing.department = department
            existing.mandatory_skills = mandatory_skills or []
            existing.preferred_skills = preferred_skills or []
            existing.experience_years_min = experience_years_min
            existing.experience_requirements = experience_requirements
            existing.education_requirements = education_requirements
            existing.technical_requirements = technical_requirements or []
            existing.domain_expertise = domain_expertise or []
            existing.additional_requirements = additional_requirements
            db.commit()
            db.refresh(existing)
            return existing

        jd = JobDescription(
            session_id=session_id,
            raw_text=raw_text,
            title=title,
            department=department,
            mandatory_skills=mandatory_skills or [],
            preferred_skills=preferred_skills or [],
            experience_years_min=experience_years_min,
            experience_requirements=experience_requirements,
            education_requirements=education_requirements,
            technical_requirements=technical_requirements or [],
            domain_expertise=domain_expertise or [],
            additional_requirements=additional_requirements
        )
        db.add(jd)
        db.commit()
        db.refresh(jd)
        return jd

    @staticmethod
    def process_and_add_resume(
        db: Session,
        session_id: str,
        content: bytes,
        filename: str
    ) -> Dict[str, Any]:
        """
        Processes a single uploaded PDF resume:
        - Calculates hash & detects duplicates in this session
        - Extracts text page-by-page
        - Creates Candidate and ResumeFile records
        """
        # 1. Process PDF file
        proc_result = process_pdf_file(content, filename)
        
        # 2. Duplicate detection within the same session
        existing_duplicate = (
            db.query(ResumeFile)
            .join(Candidate)
            .filter(
                Candidate.session_id == session_id,
                ResumeFile.file_hash == proc_result.file_hash
            )
            .first()
        )
        if existing_duplicate:
            return {
                "success": False,
                "is_duplicate": True,
                "original_filename": filename,
                "error_message": f"Duplicate file detected. This resume is identical to '{existing_duplicate.original_filename}'."
            }

        # 3. Create Candidate placeholder
        candidate = Candidate(
            session_id=session_id,
            name=f"Candidate ({filename})",
            review_status="Pending Review"
        )
        db.add(candidate)
        db.flush()  # Generates candidate.id

        # 4. Create ResumeFile record
        resume_record = ResumeFile(
            candidate_id=candidate.id,
            original_filename=filename,
            stored_filename=proc_result.stored_filename,
            file_path=proc_result.file_path,
            file_size_bytes=proc_result.file_size_bytes,
            file_hash=proc_result.file_hash,
            page_count=proc_result.page_count,
            is_scanned=proc_result.is_scanned,
            upload_status=proc_result.upload_status,
            error_message=proc_result.error_message,
            extracted_text_by_page=proc_result.extracted_pages
        )
        db.add(resume_record)
        db.commit()
        db.refresh(candidate)

        return {
            "success": proc_result.success,
            "candidate_id": candidate.id,
            "original_filename": filename,
            "file_size_bytes": proc_result.file_size_bytes,
            "file_hash": proc_result.file_hash,
            "page_count": proc_result.page_count,
            "is_scanned": proc_result.is_scanned,
            "upload_status": proc_result.upload_status,
            "error_message": proc_result.error_message
        }

    @staticmethod
    def screen_single_candidate(
        db: Session,
        candidate_id: str,
        custom_weights: Optional[Dict[str, float]] = None
    ) -> Candidate:
        """
        Executes candidate information extraction and JD matching.
        Resilient: if AI fails, falls back gracefully to rule-based engine.
        """
        candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
        if not candidate:
            raise ValueError(f"Candidate {candidate_id} not found.")

        resume_file = candidate.resume_file
        if not resume_file or resume_file.upload_status == "Failed":
            logger.warning(f"Skipping screening for candidate {candidate_id}: file status {resume_file.upload_status if resume_file else 'None'}")
            return candidate

        # Fetch JD
        session = candidate.session
        jd = session.job_description
        if not jd:
            raise ValueError("Job Description must be defined before screening candidates.")

        weights = custom_weights or session.weights or settings.DEFAULT_WEIGHTS

        # Update status to Extracting
        resume_file.upload_status = "Extracting"
        db.commit()

        # Compile full text
        full_text = "\n\n".join(
            f"[Page {p.get('page', 1)}]\n{p.get('text', '')}"
            for p in (resume_file.extracted_text_by_page or [])
        )

        provider = get_ai_provider()
        is_ai = True
        ai_provider_name = settings.AI_PROVIDER
        ai_model_name = settings.GROQ_MODEL if ai_provider_name == "groq" else "default"

        # Step 1: Candidate Extraction
        cand_info = {}
        try:
            cand_info = provider.extract_candidate_info(full_text, resume_file.original_filename)
        except Exception as e:
            logger.warning(f"Primary AI extraction failed for {candidate_id}: {e}. Falling back to Rule-Based provider.")
            fallback = RuleBasedProvider()
            cand_info = fallback.extract_candidate_info(full_text, resume_file.original_filename)
            is_ai = False
            ai_provider_name = "rule_based"
            ai_model_name = "heuristic-fallback"

        # Update Candidate profile
        candidate.name = cand_info.get("name") or "Not specified"
        candidate.email = cand_info.get("email") or "Not specified"
        candidate.phone = cand_info.get("phone") or "Not specified"
        candidate.summary = cand_info.get("summary") or "Not specified"
        candidate.total_experience_years = float(cand_info.get("total_experience_years") or 0.0)
        candidate.relevant_experience_years = float(cand_info.get("relevant_experience_years") or 0.0)
        candidate.job_titles = cand_info.get("job_titles") or []
        candidate.companies = cand_info.get("companies") or []
        candidate.technical_skills = cand_info.get("technical_skills") or []
        candidate.soft_skills = cand_info.get("soft_skills") or []
        candidate.education = cand_info.get("education") or []
        candidate.certifications = cand_info.get("certifications") or []
        candidate.projects = cand_info.get("projects") or []
        candidate.achievements = cand_info.get("achievements") or []
        candidate.industry_experience = cand_info.get("industry_experience") or []

        # Step 2: Evaluation against JD
        resume_file.upload_status = "Analysing"
        db.commit()

        jd_dict = {
            "title": jd.title,
            "mandatory_skills": jd.mandatory_skills,
            "preferred_skills": jd.preferred_skills,
            "technical_requirements": jd.technical_requirements,
            "experience_years_min": jd.experience_years_min,
            "experience_requirements": jd.experience_requirements,
            "education_requirements": jd.education_requirements,
            "domain_expertise": jd.domain_expertise
        }

        eval_result = {}
        try:
            eval_result = provider.evaluate_resume_match(
                job_description=jd_dict,
                candidate_info=cand_info,
                extracted_pages=resume_file.extracted_text_by_page or [],
                weights=weights
            )
        except Exception as e:
            logger.warning(f"Primary AI evaluation failed for {candidate_id}: {e}. Using Rule-Based evaluation.")
            fallback = RuleBasedProvider()
            eval_result = fallback.evaluate_resume_match(
                job_description=jd_dict,
                candidate_info=cand_info,
                extracted_pages=resume_file.extracted_text_by_page or [],
                weights=weights
            )
            is_ai = False
            ai_provider_name = "rule_based"
            ai_model_name = "heuristic-fallback"

        # Delete existing analysis if re-running
        if candidate.analysis:
            db.delete(candidate.analysis)
            db.flush()

        # Create CandidateAnalysis
        analysis = CandidateAnalysis(
            candidate_id=candidate.id,
            overall_score=float(eval_result.get("overall_score") or 0.0),
            interpretation_band=eval_result.get("interpretation_band", "Needs Review"),
            required_skills_coverage=float(eval_result.get("required_skills_coverage") or 0.0),
            preferred_skills_coverage=float(eval_result.get("preferred_skills_coverage") or 0.0),
            strengths=eval_result.get("strengths") or [],
            missing_qualifications=eval_result.get("missing_qualifications") or [],
            potential_gaps=eval_result.get("potential_gaps") or [],
            evidence_quality=eval_result.get("evidence_quality", "Moderate"),
            suggested_interview_questions=eval_result.get("suggested_interview_questions") or [],
            is_ai_generated=is_ai,
            ai_provider=ai_provider_name,
            ai_model=ai_model_name
        )
        db.add(analysis)
        db.flush()

        # Add Score Breakdowns
        for sb in eval_result.get("score_breakdowns", []):
            breakdown = ScoreBreakdown(
                analysis_id=analysis.id,
                criteria_name=sb.get("criteria_name", "General"),
                weight_percentage=float(sb.get("weight_percentage") or 0.0),
                raw_score=float(sb.get("raw_score") or 0.0),
                weighted_score=float(sb.get("weighted_score") or 0.0),
                explanation=sb.get("explanation", ""),
                evidence=sb.get("evidence", ""),
                missing_items=sb.get("missing_items") or [],
                page_references=sb.get("page_references") or []
            )
            db.add(breakdown)

        # Add Skill Matches
        for sm in eval_result.get("skill_matches", []):
            skill_match = SkillMatch(
                analysis_id=analysis.id,
                skill_name=sm.get("skill_name", "Skill"),
                category=sm.get("category", "required"),
                status=sm.get("status", "missing"),
                evidence=sm.get("evidence", ""),
                page_number=sm.get("page_number")
            )
            db.add(skill_match)

        resume_file.upload_status = "Completed"
        db.commit()
        db.refresh(candidate)
        return candidate

    @staticmethod
    def screen_all_in_session(db: Session, session_id: str) -> List[Candidate]:
        from concurrent.futures import ThreadPoolExecutor, as_completed
        from app.core.database import SessionLocal

        candidate_ids = [
            c.id for c in db.query(Candidate.id).filter(Candidate.session_id == session_id).all()
        ]

        def _worker(c_id: str):
            thread_db = SessionLocal()
            try:
                cand = ScreeningService.screen_single_candidate(thread_db, c_id)
                return cand.id
            except Exception as e:
                logger.error(f"Error screening candidate {c_id}: {e}")
                return c_id
            finally:
                thread_db.close()

        # Run with 2 workers and pacing to respect token limits while remaining highly responsive
        with ThreadPoolExecutor(max_workers=2) as executor:
            futures = [executor.submit(_worker, cid) for cid in candidate_ids]
            for f in as_completed(futures):
                try:
                    f.result()
                except Exception as err:
                    logger.error(f"Worker task error: {err}")

        # Return refreshed candidates list
        return db.query(Candidate).filter(Candidate.session_id == session_id).all()

    @staticmethod
    def get_candidate_rankings(
        db: Session,
        session_id: str,
        sort_by: str = "highest_score",
        filter_band: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Retrieves ranked candidates with filtering and sorting.
        """
        candidates = (
            db.query(Candidate)
            .filter(Candidate.session_id == session_id)
            .all()
        )

        ranked_items = []
        for c in candidates:
            score = c.analysis.overall_score if c.analysis else 0.0
            band = c.analysis.interpretation_band if c.analysis else "Pending"
            req_cov = c.analysis.required_skills_coverage if c.analysis else 0.0
            pref_cov = c.analysis.preferred_skills_coverage if c.analysis else 0.0
            quality = c.analysis.evidence_quality if c.analysis else "N/A"
            is_ai = c.analysis.is_ai_generated if c.analysis else False
            orig_filename = c.resume_file.original_filename if c.resume_file else "Resume.pdf"

            item = {
                "candidate_id": c.id,
                "candidate_name": c.name,
                "original_filename": orig_filename,
                "overall_score": score,
                "interpretation_band": band,
                "required_skills_coverage": req_cov,
                "preferred_skills_coverage": pref_cov,
                "relevant_experience_years": c.relevant_experience_years,
                "total_experience_years": c.total_experience_years,
                "review_status": c.review_status,
                "evidence_quality": quality,
                "is_ai_generated": is_ai,
                "created_at": c.created_at
            }
            ranked_items.append(item)

        # Filtering by band
        if filter_band:
            if filter_band == "Strong Match":
                ranked_items = [i for i in ranked_items if i["overall_score"] >= settings.STRONG_MATCH_THRESHOLD]
            elif filter_band == "Good Potential":
                ranked_items = [i for i in ranked_items if settings.GOOD_POTENTIAL_THRESHOLD <= i["overall_score"] < settings.STRONG_MATCH_THRESHOLD]
            elif filter_band == "Partial Match":
                ranked_items = [i for i in ranked_items if settings.PARTIAL_MATCH_THRESHOLD <= i["overall_score"] < settings.GOOD_POTENTIAL_THRESHOLD]
            elif filter_band == "Needs Review":
                ranked_items = [i for i in ranked_items if i["overall_score"] < settings.PARTIAL_MATCH_THRESHOLD]

        # Sorting
        if sort_by == "highest_score":
            ranked_items.sort(key=lambda x: x["overall_score"], reverse=True)
        elif sort_by == "lowest_score":
            ranked_items.sort(key=lambda x: x["overall_score"], reverse=False)
        elif sort_by == "relevant_experience":
            ranked_items.sort(key=lambda x: x["relevant_experience_years"], reverse=True)
        elif sort_by == "skills_match":
            ranked_items.sort(key=lambda x: x["required_skills_coverage"], reverse=True)
        else:
            ranked_items.sort(key=lambda x: x["overall_score"], reverse=True)

        # Assign ranks
        for idx, item in enumerate(ranked_items):
            item["rank"] = idx + 1

        return ranked_items
