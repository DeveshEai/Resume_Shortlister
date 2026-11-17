import pytest
from app.services.ai_provider import (
    RuleBasedProvider, clean_json_response, get_ai_provider
)

def test_clean_json_response_utility():
    raw_markdown = """```json
{
    "status": "success",
    "score": 92.5
}
```"""
    cleaned = clean_json_response(raw_markdown)
    assert cleaned.startswith("{")
    assert cleaned.endswith("}")
    assert '"status": "success"' in cleaned

def test_rule_based_jd_analysis():
    provider = RuleBasedProvider()
    sample_jd = """
    Senior Python Developer needed.
    Requirements:
    Must have 4+ years of experience with Python, FastAPI, and PostgreSQL.
    Preferred: Docker and React knowledge.
    Bachelor degree in Computer Science required.
    """
    res = provider.analyze_job_description(sample_jd)
    assert res is not None
    assert "mandatory_skills" in res
    assert "preferred_skills" in res
    assert res["experience_years_min"] == 4.0

def test_rule_based_candidate_extraction_and_missing_info():
    provider = RuleBasedProvider()
    minimal_text = """
    John Doe
    Software Engineer with Python and Docker background.
    """
    res = provider.extract_candidate_info(minimal_text, "resume.pdf")
    # Email and phone should gracefully default to "Not specified"
    assert res["email"] == "Not specified"
    assert res["phone"] == "Not specified"
    assert "Python" in res["technical_skills"]

def test_rule_based_matching_evaluation():
    provider = RuleBasedProvider()
    jd = {
        "title": "Senior Python Engineer",
        "mandatory_skills": ["Python", "FastAPI", "PostgreSQL"],
        "preferred_skills": ["Docker", "AWS"],
        "experience_years_min": 4.0
    }
    candidate = {
        "technical_skills": ["Python", "FastAPI", "PostgreSQL", "Docker"],
        "relevant_experience_years": 5.0,
        "education": [{"degree": "B.S. CS"}],
        "projects": [{"title": "Web API"}]
    }
    extracted_pages = [{"page": 1, "text": "Python FastAPI PostgreSQL Docker experience 5 years"}]
    weights = {
        "required_skills": 35.0,
        "relevant_experience": 25.0,
        "technical_domain": 15.0,
        "projects_achievements": 10.0,
        "education_certifications": 10.0,
        "preferred_skills": 5.0
    }
    
    match = provider.evaluate_resume_match(jd, candidate, extracted_pages, weights)
    assert match["overall_score"] > 80.0
    assert match["required_skills_coverage"] == 100.0
    assert len(match["score_breakdowns"]) == 6
    assert len(match["skill_matches"]) >= 3
    assert len(match["suggested_interview_questions"]) > 0
