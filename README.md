# 🎯 AI-Powered Resume Shortlisting System

An enterprise-grade, explainable talent screening web application built for modern HR recruiters. It parses 10–15 candidate resumes simultaneously, analyzes them against custom Job Descriptions using **Groq AI** (with a modular provider architecture and robust rule-based fallback), calculates transparent matching scores with configurable evaluation weights, detects duplicate and unreadable files, enables side-by-side candidate comparison, and exports comprehensive PDF, Excel, and CSV screening reports.

---

## 🌟 Key Features

1. **Job Description Intelligence**:
   - Paste raw JD text and automatically extract responsibilities, mandatory skills, preferred skills, required experience, and domain expertise.
   - Recruiter-controlled: modify and verify extracted criteria prior to screening.

2. **Multi-File PDF Resume Processing**:
   - Upload 10–15 PDF resumes at once via drag-and-drop.
   - Page-by-page text extraction with PyMuPDF preserving original page numbers for evidence verification.
   - SHA-256 duplicate file hash detection.
   - Corrupted, password-protected, empty, and scanned PDF detection (with OCR support where available).

3. **Responsible AI & Explainable Scoring**:
   - Evaluates strictly job-related qualifications. Demographic characteristics, names, and contact details are excluded from scoring.
   - Prompt injection resistance: resumes are treated as untrusted data; prompt override attempts are ignored.
   - Configurable evaluation weights summing to 100% (default: Required Skills 35%, Relevant Experience 25%, Technical Domain 15%, Projects 10%, Education 10%, Preferred Skills 5%).
   - Mark any criteria "N/A" with automatic proportional weight redistribution.
   - Explainable score breakdown (0–100) with supporting quotes and resume page references.
   - Tailored interview questions generated for each candidate's specific background and potential gaps.

4. **Candidate Rankings & Decision Support**:
   - Automatic ranking table sorted by matching score, experience, or skills coverage.
   - Filtering by score bands: Strong Match (85%+), Good Potential (70–84%), Partial Match (55–69%), Needs Review (<55%).
   - Manual recruiter review status workflow: *Pending Review*, *Recommended for Interview*, *Needs Further Review*, *Not Progressing*.
   - Recruiter notes saved persistently to database.
   - Embedded original PDF viewer for side-by-side resume verification.

5. **Side-by-Side Candidate Comparison**:
   - Compare 2 to 5 shortlisted candidates side-by-side.
   - Visual comparison charts and comprehensive criteria matrix.

6. **Comprehensive Multi-Format Reports**:
   - **Executive PDF Report**: Professional ReportLab document with ranking summary, top candidate profiles, and interview recommendations.
   - **Excel Workbook (.xlsx)**: Multi-tab spreadsheet with Candidate Rankings and full Skills Matching matrix with colored status highlights.
   - **CSV Export**: Clean data file for ATS/HRIS import.

7. **Modular AI Architecture**:
   - Primary: **Groq API** (`openai/gpt-oss-120b`, `openai/gpt-oss-20b`, `qwen/qwen3.8-27b`).
   - Prepared Adapter: **Google Gemini API** (ready for future activation).
   - Fallback: **Heuristic Rule-Based Engine** (ensures zero downtime if API is offline or quota exceeded).

---

## 🏗️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts |
| **Backend** | Python, FastAPI, Pydantic v2, SQLAlchemy ORM |
| **Database** | SQLite (default), PostgreSQL compatible |
| **AI Provider** | Groq Python SDK (active), Modular AIProviderInterface, Gemini adapter ready |
| **Document Processing** | PyMuPDF (`fitz`), hashlib SHA-256, pytesseract OCR fallback |
| **Reporting** | ReportLab (PDF), OpenPyXL (Excel), Python CSV |

---

## 📁 Project Structure

```
resume-shortlister/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── endpoints.py          # FastAPI REST endpoints
│   │   ├── core/
│   │   │   ├── config.py             # App settings & environment loader
│   │   │   └── database.py           # SQLAlchemy database session & engine
│   │   ├── models/
│   │   │   └── models.py             # SQLAlchemy ORM models
│   │   ├── schemas/
│   │   │   └── schemas.py            # Pydantic validation schemas
│   │   ├── services/
│   │   │   ├── ai_provider.py        # Groq, Gemini & Rule-based engines
│   │   │   ├── pdf_service.py        # PyMuPDF extraction & validation
│   │   │   ├── screening_service.py  # Scoring, weights & ranking logic
│   │   │   └── report_service.py     # PDF, Excel, and CSV generators
│   │   ├── utils/
│   │   │   └── sample_generator.py   # 15 sample test resumes generator
│   │   └── main.py                   # FastAPI application entrypoint
│   └── tests/                        # 15 automated pytest test cases
├── frontend/
│   ├── src/
│   │   ├── components/               # Modals & UI components
│   │   ├── layouts/                  # App layout & sidebar
│   │   ├── pages/                    # Dashboard, New Screening, Candidates, etc.
│   │   ├── services/                 # API client
│   │   └── types/                    # TypeScript interfaces
│   ├── package.json
│   ├── tailwind.config.js
│   └── vite.config.ts
├── sample_resumes/                   # 15 pre-generated demo PDF resumes
├── uploads/                          # Stored resume PDFs
├── reports/                          # Stored generated reports
├── .env.example                      # Sample configuration file
├── pytest.ini                        # Pytest configuration
└── README.md
```

---

## 🚀 Quickstart Guide

### 1. Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 2. Backend Setup
```bash
# Navigate to the workspace root
cd "Resume Shortlister"

# Install backend dependencies
python -m pip install -r requirements.txt
# (or: pip install fastapi uvicorn pydantic python-multipart sqlalchemy groq pymupdf reportlab openpyxl pytest httpx)

# Copy environment variables
copy .env.example .env
```

Edit `.env` to configure your Groq API credentials:
```env
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
DATABASE_URL=sqlite:///./resume_shortlister.db
MAX_UPLOAD_SIZE_MB=10
```

Start the FastAPI backend server:
```bash
python -m uvicorn app.main:app --app-dir backend --host 127.0.0.1 --port 8000 --reload
```
The API interactive documentation will be available at: `http://127.0.0.1:8000/docs`

### 3. Frontend Setup
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```
Open your browser at `http://127.0.0.1:5173`.

---

## 🧪 Automated Testing

Execute the automated test suite covering PDF parsing, duplicate detection, scoring weights, rule-based fallback, Groq responses, and report exports:

```bash
python -m pytest backend/tests -v
```

All 15 test suites validate the complete pipeline.

---

## ⚡ 1-Click Demo Testing

To quickly test the application with 15 real candidates across different relevance tiers:
1. Open the web UI at `http://127.0.0.1:5173`.
2. On the Dashboard, click **"1-Click Demo: 15 Sample Resumes"**.
3. The system will seed a screening session for a *Senior Full-Stack AI Engineer* role and evaluate all 15 demo resumes.
4. You will be redirected immediately to the Candidate Rankings table to view scores, filters, side-by-side comparison, and export reports.
