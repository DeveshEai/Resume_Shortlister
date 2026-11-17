import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.utils.sample_generator import SAMPLE_DIR

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_session_lifecycle_and_seeding():
    # 1. Create Session
    create_res = client.post("/api/sessions", json={
        "title": "Lead Software Engineer",
        "department": "Engineering"
    })
    assert create_res.status_code == 200
    session_id = create_res.json()["id"]

    # 2. Add Job Description
    jd_res = client.post(f"/api/sessions/{session_id}/job-description", json={
        "title": "Lead Software Engineer",
        "department": "Engineering",
        "raw_text": "We need a Senior Engineer with Python and React skills. 5+ years experience required.",
        "mandatory_skills": ["Python", "React"],
        "preferred_skills": ["Docker"],
        "experience_years_min": 5.0
    })
    assert jd_res.status_code == 200
    assert jd_res.json()["session_id"] == session_id

    # 3. Upload a sample resume
    sample_files = list(SAMPLE_DIR.glob("*.pdf"))
    assert len(sample_files) > 0
    with open(sample_files[0], "rb") as f:
        file_bytes = f.read()

    upload_res = client.post(
        f"/api/sessions/{session_id}/resumes",
        files=[("files", (sample_files[0].name, file_bytes, "application/pdf"))]
    )
    assert upload_res.status_code == 200
    uploaded_data = upload_res.json()
    assert len(uploaded_data) == 1
    assert uploaded_data[0]["upload_status"] == "Completed"
    cand_id = uploaded_data[0]["candidate_id"]

    # 4. Duplicate upload test
    dup_res = client.post(
        f"/api/sessions/{session_id}/resumes",
        files=[("files", (sample_files[0].name, file_bytes, "application/pdf"))]
    )
    assert dup_res.status_code == 200
    dup_data = dup_res.json()
    assert "Duplicate file detected" in dup_data[0]["error_message"]

    # 5. Screen candidate
    screen_res = client.post(f"/api/candidates/{cand_id}/screen")
    assert screen_res.status_code == 200
    screened_cand = screen_res.json()
    assert screened_cand["analysis"] is not None
    assert screened_cand["analysis"]["overall_score"] >= 0

    # 6. Check Rankings
    rankings_res = client.get(f"/api/sessions/{session_id}/candidates")
    assert rankings_res.status_code == 200
    rank_list = rankings_res.json()
    assert len(rank_list) >= 1
    assert rank_list[0]["rank"] == 1

    # 7. Update status
    update_res = client.patch(f"/api/candidates/{cand_id}", json={
        "review_status": "Recommended for Interview",
        "recruiter_notes": "Candidate exhibits strong background in Python."
    })
    assert update_res.status_code == 200
    assert update_res.json()["review_status"] == "Recommended for Interview"

    # 8. Test Reports
    csv_res = client.get(f"/api/sessions/{session_id}/reports/csv")
    assert csv_res.status_code == 200
    assert "AI-Powered Resume Shortlisting Report" in csv_res.text

    excel_res = client.get(f"/api/sessions/{session_id}/reports/excel")
    assert excel_res.status_code == 200
    assert len(excel_res.content) > 1000

    pdf_res = client.get(f"/api/sessions/{session_id}/reports/pdf")
    assert pdf_res.status_code == 200
    assert pdf_res.content.startswith(b"%PDF-")

    # 9. Clean up
    del_res = client.delete(f"/api/sessions/{session_id}")
    assert del_res.status_code == 200
