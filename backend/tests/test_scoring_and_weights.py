import pytest
from app.schemas.schemas import ScoringWeights

def test_default_weights_sum_to_100():
    weights = ScoringWeights()
    assert weights.validate_total() is True
    assert weights.required_skills == 35.0
    assert weights.relevant_experience == 25.0
    assert weights.technical_domain == 15.0
    assert weights.projects_achievements == 10.0
    assert weights.education_certifications == 10.0
    assert weights.preferred_skills == 5.0

def test_invalid_weights_validation():
    invalid = ScoringWeights(
        required_skills=50.0,
        relevant_experience=50.0,
        technical_domain=20.0, # sums to 140
        projects_achievements=10.0,
        education_certifications=5.0,
        preferred_skills=5.0
    )
    assert invalid.validate_total() is False

def test_weight_redistribution_when_criteria_na():
    # Suppose education_certifications and preferred_skills are not applicable
    weights = ScoringWeights()
    active_keys = ["required_skills", "relevant_experience", "technical_domain", "projects_achievements"]
    
    redistributed = weights.redistribute_active(active_keys)
    assert redistributed.validate_total() is True
    assert redistributed.education_certifications == 0.0
    assert redistributed.preferred_skills == 0.0
    # The remaining criteria should scale up proportionally
    assert redistributed.required_skills > 35.0
    assert redistributed.relevant_experience > 25.0
