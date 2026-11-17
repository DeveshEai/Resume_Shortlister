import os
from pathlib import Path
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors

SAMPLE_DIR = Path(__file__).resolve().parent.parent.parent.parent / "sample_resumes"
SAMPLE_DIR.mkdir(parents=True, exist_ok=True)

CANDIDATE_DATA = [
    # 4 Strong Matches (85 - 98)
    {
        "filename": "Alex_Morgan_Senior_AI_Engineer.pdf",
        "name": "Alex Morgan",
        "email": "alex.morgan.demo@example.com",
        "phone": "+1 (555) 234-5678",
        "summary": "Accomplished Senior Full-Stack AI Engineer with 8 years of production experience building high-throughput web applications and integrating advanced LLMs and neural models.",
        "skills": "Python, FastAPI, React, TypeScript, Docker, Kubernetes, PostgreSQL, PyTorch, LangChain, AWS, Git, Tailwind CSS",
        "experience": [
            ("Principal AI Engineer - TechCorp Solutions (2021 - Present)", "Designed and deployed generative AI microservices using FastAPI and Groq/OpenAI APIs, serving 2M+ daily requests. Built interactive React/TypeScript recruiter dashboards."),
            ("Senior Full-Stack Developer - CloudWave Inc (2018 - 2021)", "Engineered distributed REST APIs in Python and backend SQL pipelines. Developed responsive React frontends with modern state management.")
        ],
        "education": "B.S. in Computer Science - University of California, Berkeley (2018)",
        "certifications": "AWS Certified Solutions Architect, Deep Learning Specialization",
        "projects": "ShortlistAI Open Source: Architected automated resume matching system with PyMuPDF and FastAPI."
    },
    {
        "filename": "Priya_Sharma_Lead_ML_Backend.pdf",
        "name": "Priya Sharma",
        "email": "priya.sharma.demo@example.com",
        "phone": "+1 (555) 345-6789",
        "summary": "Lead Machine Learning & Backend Engineer with 7+ years of experience in distributed systems, FastAPI, and conversational AI architecture.",
        "skills": "Python, FastAPI, React, TypeScript, Vector Databases, PostgreSQL, Docker, Redis, PyTorch, CI/CD, Microservices",
        "experience": [
            ("Lead Systems Architect - AI Dynamics (2020 - Present)", "Led 6 engineers building multi-tenant AI pipelines with Python, FastAPI, and React. Optimized inference latency by 45%."),
            ("Backend Software Engineer - FinScale (2017 - 2020)", "Developed high-frequency transaction verification APIs using Python and PostgreSQL.")
        ],
        "education": "M.S. in Software Engineering - Carnegie Mellon University (2017)",
        "certifications": "Google Cloud Professional Machine Learning Engineer",
        "projects": "NeuralRank: Vector search engine built with FastAPI and Qdrant."
    },
    {
        "filename": "Marcus_Vance_Staff_Software_Engineer.pdf",
        "name": "Marcus Vance",
        "email": "marcus.vance.demo@example.com",
        "phone": "+1 (555) 456-7890",
        "summary": "Staff Software Engineer with 9 years of full-stack excellence specializing in scalable Python backends, reactive TypeScript user interfaces, and GenAI applications.",
        "skills": "Python, TypeScript, React, FastAPI, System Architecture, Docker, AWS, GraphQL, SQL, Tailwind, LLM Orchestration",
        "experience": [
            ("Staff Engineer - Enterprise Data Systems (2019 - Present)", "Architected full-stack enterprise analytics platform serving Fortune 500 customers. Authored core Python FastAPI services and TypeScript frontends."),
            ("Senior Full-Stack Developer - Nova Apps (2015 - 2019)", "Built consumer web applications using React, Python, and relational databases.")
        ],
        "education": "B.S. in Computer Engineering - University of Texas at Austin (2015)",
        "certifications": "Certified Kubernetes Administrator (CKA)",
        "projects": "Enterprise Workflow AI: Automated pipeline orchestration tool."
    },
    {
        "filename": "Elena_Rostova_Senior_AI_App_Developer.pdf",
        "name": "Elena Rostova",
        "email": "elena.rostova.demo@example.com",
        "phone": "+1 (555) 567-8901",
        "summary": "Senior AI Application Developer with 6 years experience fusing Python API engineering, modern React/TypeScript frontends, and production LLMs.",
        "skills": "Python, FastAPI, React, TypeScript, LangChain, PyTorch, Docker, PostgreSQL, Next.js, REST APIs, Git",
        "experience": [
            ("Senior AI Developer - NeuralEdge (2021 - Present)", "Engineered end-to-end AI document processing portal with PyMuPDF, FastAPI backend and React frontend."),
            ("Software Engineer - Apex Software (2018 - 2021)", "Full-stack engineer building Python web microservices and responsive dashboards.")
        ],
        "education": "B.S. in Computer Science - University of Washington (2018)",
        "certifications": "TensorFlow Developer Certificate",
        "projects": "DocuAI: Document intelligence SaaS analyzing 50k PDFs monthly."
    },

    # 4 Good Potential Matches (70 - 84)
    {
        "filename": "David_Chen_FullStack_Engineer.pdf",
        "name": "David Chen",
        "email": "david.chen.demo@example.com",
        "phone": "+1 (555) 678-9012",
        "summary": "Full-Stack Software Engineer with 5 years experience specializing in modern React, TypeScript, Node.js, and working knowledge of Python APIs.",
        "skills": "React, TypeScript, JavaScript, Python, Node.js, PostgreSQL, Docker, REST APIs, Git, Tailwind CSS",
        "experience": [
            ("Full-Stack Engineer - WebFlow Tech (2020 - Present)", "Developed interactive SPAs with React, TypeScript, and Python REST services."),
            ("Junior Developer - AppForge (2019 - 2020)", "Created frontend components and integrated backend endpoints.")
        ],
        "education": "B.S. in Information Technology - San Jose State University (2019)",
        "certifications": "Meta Certified Front-End Developer",
        "projects": "Portfolio Dashboard: React/TypeScript analytical charts."
    },
    {
        "filename": "Sarah_Jenkins_Backend_Python_Developer.pdf",
        "name": "Sarah Jenkins",
        "email": "sarah.jenkins.demo@example.com",
        "phone": "+1 (555) 789-0123",
        "summary": "Backend Python Developer with 6 years of expertise in FastAPI, Django, PostgreSQL, and cloud deployments. Basic frontend familiarity.",
        "skills": "Python, FastAPI, Django, PostgreSQL, Docker, AWS, Redis, SQL, CI/CD, Git, Basic React",
        "experience": [
            ("Senior Backend Engineer - DataMesh (2020 - Present)", "Built scalable microservices in FastAPI with PostgreSQL backends."),
            ("Python Developer - CloudLogix (2018 - 2020)", "Maintained Django web APIs and background Celery tasks.")
        ],
        "education": "B.S. in Computer Science - University of Illinois (2018)",
        "certifications": "AWS Certified Developer Associate",
        "projects": "DataFlow API: High-throughput ingestion microservice."
    },
    {
        "filename": "Vikram_Patel_Frontend_FullStack_Dev.pdf",
        "name": "Vikram Patel",
        "email": "vikram.patel.demo@example.com",
        "phone": "+1 (555) 890-1234",
        "summary": "Frontend-Focused Full-Stack Engineer with 5 years crafting performant React and TypeScript applications with Python API integrations.",
        "skills": "React, TypeScript, Next.js, Tailwind CSS, Python, REST APIs, GraphQL, Git, Docker, Jest",
        "experience": [
            ("Senior UI Engineer - SaaSSphere (2021 - Present)", "Spearheaded design system in React/TypeScript. Connected to Python FastAPI endpoints."),
            ("Frontend Developer - PixelCraft (2019 - 2021)", "Delivered accessible web applications.")
        ],
        "education": "B.S. in Software Systems - Purdue University (2019)",
        "certifications": "Scrum Master Certification (CSM)",
        "projects": "DesignSystem-UI: Component library downloaded 10k times."
    },
    {
        "filename": "Chloe_Dubois_Data_AI_Integrator.pdf",
        "name": "Chloe Dubois",
        "email": "chloe.dubois.demo@example.com",
        "phone": "+1 (555) 901-2345",
        "summary": "Data & AI Solutions Developer with 4.5 years experience building data pipelines with Python, integrating LLM APIs, and creating web dashboards.",
        "skills": "Python, FastAPI, OpenAI API, SQL, Airflow, Pandas, React, Docker, Git, Data Modeling",
        "experience": [
            ("AI Solutions Engineer - InsightLab (2021 - Present)", "Created automated AI summarization workflows using Python and external LLM APIs."),
            ("Data Engineer - DataMatrix (2019 - 2021)", "Maintained ETL pipelines and database migrations.")
        ],
        "education": "B.S. in Data Science - University of Wisconsin (2019)",
        "certifications": "Databricks Certified Associate Developer",
        "projects": "PipelineSense: Automated telemetry alerts for ETL jobs."
    },

    # 4 Partial Matches (55 - 69)
    {
        "filename": "Jonathan_Reynolds_Junior_Python_Dev.pdf",
        "name": "Jonathan Reynolds",
        "email": "jonathan.reynolds.demo@example.com",
        "phone": "+1 (555) 012-3456",
        "summary": "Junior Python Developer with 2 years of experience building simple REST APIs with Flask and basic frontend templates.",
        "skills": "Python, Flask, SQLite, HTML, CSS, JavaScript, Git, Linux",
        "experience": [
            ("Junior Software Developer - LocalByte (2022 - Present)", "Assisted in building internal inventory management tool with Python Flask and SQLite."),
            ("Intern - DevHub (2021 - 2022)", "Wrote unit tests and fixed UI bugs.")
        ],
        "education": "B.S. in Computer Science - State University (2022)",
        "certifications": "Python Institute PCEP",
        "projects": "TaskTracker: Open-source Flask to-do web application."
    },
    {
        "filename": "Anita_Desai_Data_Analyst.pdf",
        "name": "Anita Desai",
        "email": "anita.desai.demo@example.com",
        "phone": "+1 (555) 123-4560",
        "summary": "Data Analyst with 4 years experience querying SQL databases, visualizing BI metrics in Tableau, and basic Python data manipulation.",
        "skills": "SQL, Tableau, Excel, Python, Pandas, Data Visualization, Statistical Analysis",
        "experience": [
            ("Senior Data Analyst - RetailInsights (2021 - Present)", "Built executive dashboards in Tableau. Created automated weekly reports using Pandas and SQL."),
            ("Business Analyst - MetroHealth (2019 - 2021)", "Analyzed operational metrics and generated departmental spreadsheets.")
        ],
        "education": "B.A. in Economics & Statistics - Boston College (2019)",
        "certifications": "Tableau Desktop Certified Associate",
        "projects": "SalesTrend: SQL analytics on 500k e-commerce records."
    },
    {
        "filename": "Kevin_OConnor_DevOps_Engineer.pdf",
        "name": "Kevin O'Connor",
        "email": "kevin.oconnor.demo@example.com",
        "phone": "+1 (555) 234-5671",
        "summary": "DevOps & Infrastructure Engineer with 6 years experience orchestrating Docker containers, Kubernetes clusters, and Terraform on AWS.",
        "skills": "Docker, Kubernetes, AWS, Terraform, CI/CD, Linux, Bash, Python scripting, Prometheus",
        "experience": [
            ("Senior DevOps Engineer - CloudStream (2020 - Present)", "Automated multi-region Kubernetes deployments and infrastructure as code."),
            ("Systems Administrator - NetOps (2017 - 2020)", "Maintained Linux servers and monitored uptime.")
        ],
        "education": "B.S. in Information Systems - University of Arizona (2017)",
        "certifications": "AWS Certified DevOps Engineer Professional",
        "projects": "InfraGuard: Automated Terraform compliance scanner."
    },
    {
        "filename": "Maria_Santos_UI_UX_Frontend_Designer.pdf",
        "name": "Maria Santos",
        "email": "maria.santos.demo@example.com",
        "phone": "+1 (555) 345-6782",
        "summary": "UI/UX Designer and Frontend Specialist with 4 years creating wireframes, Figma prototypes, and responsive CSS/React interfaces. No backend experience.",
        "skills": "Figma, React, HTML5, CSS3, Tailwind CSS, JavaScript, UI/UX Design, Prototyping",
        "experience": [
            ("UI/UX Designer - CreativeStudio (2021 - Present)", "Designed user flows in Figma and built front-end landing pages in React."),
            ("Junior Web Designer - DigitalEdge (2019 - 2021)", "Created website mockups and marketing assets.")
        ],
        "education": "B.F.A. in Digital Arts & Design - Pratt Institute (2019)",
        "certifications": "Google UX Design Professional Certificate",
        "projects": "DesignSystemX: Accessible design component library in Figma."
    },

    # 3 Lower Apparent Matches (< 55)
    {
        "filename": "Bradley_Miller_Network_Technician.pdf",
        "name": "Bradley Miller",
        "email": "bradley.miller.demo@example.com",
        "phone": "+1 (555) 456-7893",
        "summary": "Hardware and Network Technician with 3 years troubleshooting LAN/WAN networks, server racks, and enterprise desktop hardware.",
        "skills": "Cisco Routers, Switches, Cat6 Cabling, Hardware Diagnostics, Windows Server, PowerShell",
        "experience": [
            ("Network Support Technician - NetLink Services (2021 - Present)", "Configured office routers and installed server rack hardware."),
            ("Helpdesk Specialist - OfficeTech (2020 - 2021)", "Resolved desktop hardware and printer issues.")
        ],
        "education": "A.S. in Computer Networking - Technical Community College (2020)",
        "certifications": "CompTIA Network+, CompTIA A+",
        "projects": "Office Wire-Up: Managed 50-workstation network overhaul."
    },
    {
        "filename": "Samantha_Hayes_Marketing_Specialist.pdf",
        "name": "Samantha Hayes",
        "email": "samantha.hayes.demo@example.com",
        "phone": "+1 (555) 567-8904",
        "summary": "Digital Marketing & Content Strategy Specialist with 4 years leading social media campaigns, SEO optimization, and brand storytelling.",
        "skills": "SEO, Google Ads, Content Strategy, Copywriting, Social Media Marketing, WordPress, Canva",
        "experience": [
            ("Digital Marketing Lead - BrightBrand Agency (2021 - Present)", "Managed online advertising budgets and executed organic SEO campaigns."),
            ("Social Media Coordinator - SparkMedia (2019 - 2021)", "Grew audience engagement across Twitter, Instagram, and LinkedIn.")
        ],
        "education": "B.A. in Communications - Northwestern University (2019)",
        "certifications": "Google Analytics Individual Qualification, HubSpot Inbound Marketing",
        "projects": "BrandRelaunch: Achieved 120% growth in newsletter subscribers."
    },
    {
        "filename": "Robert_Taylor_Sales_Executive.pdf",
        "name": "Robert Taylor",
        "email": "robert.taylor.demo@example.com",
        "phone": "+1 (555) 678-9015",
        "summary": "B2B Sales Representative with 5 years exceeding software revenue quotas, conducting client discovery calls, and closing SaaS contracts.",
        "skills": "B2B Sales, Cold Outreach, Salesforce CRM, Contract Negotiation, Relationship Management, Pipeline Management",
        "experience": [
            ("Senior Account Executive - EnterpriseCloud (2020 - Present)", "Closed $1.8M in ARR across mid-market enterprise clients."),
            ("Sales Development Rep - FastGrowth SaaS (2018 - 2020)", "Prospected 200+ monthly leads and booked qualified sales demos.")
        ],
        "education": "B.S. in Business Administration - Ohio State University (2018)",
        "certifications": "Certified Sales Professional (CSP)",
        "projects": "MidMarket Playbook: Outlined 5-step sales closing framework."
    }
]

def generate_pdf_resume(cand: dict, dest_path: Path):
    doc = SimpleDocTemplate(
        str(dest_path),
        pagesize=letter,
        rightMargin=40,
        leftMargin=40,
        topMargin=40,
        bottomMargin=40
    )
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CandName',
        parent=styles['Heading1'],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0F172A"),
        fontName="Helvetica-Bold",
        spaceAfter=2
    )
    contact_style = ParagraphStyle(
        'ContactLine',
        parent=styles['Normal'],
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#475569"),
        spaceAfter=10
    )
    h2_style = ParagraphStyle(
        'SectionH2',
        parent=styles['Heading2'],
        fontSize=11,
        leading=14,
        textColor=colors.HexColor("#1E293B"),
        fontName="Helvetica-Bold",
        spaceBefore=8,
        spaceAfter=4
    )
    body_style = ParagraphStyle(
        'ResumeBody',
        parent=styles['Normal'],
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#334155"),
        spaceAfter=6
    )

    story = []
    # Header
    story.append(Paragraph(cand["name"], title_style))
    story.append(Paragraph(f"Email: {cand['email']} | Phone: {cand['phone']} | Sample Demo Resume", contact_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#CBD5E1"), spaceAfter=8))

    # Summary
    story.append(Paragraph("Professional Summary", h2_style))
    story.append(Paragraph(cand["summary"], body_style))

    # Skills
    story.append(Paragraph("Technical Skills & Core Competencies", h2_style))
    story.append(Paragraph(cand["skills"], body_style))

    # Experience
    story.append(Paragraph("Professional Experience", h2_style))
    for title, desc in cand["experience"]:
        story.append(Paragraph(f"<b>{title}</b>", body_style))
        story.append(Paragraph(desc, body_style))

    # Education & Certifications
    story.append(Paragraph("Education & Credentials", h2_style))
    story.append(Paragraph(f"<b>Education:</b> {cand['education']}", body_style))
    if cand.get("certifications"):
        story.append(Paragraph(f"<b>Certifications:</b> {cand['certifications']}", body_style))

    # Projects
    if cand.get("projects"):
        story.append(Paragraph("Key Projects & Achievements", h2_style))
        story.append(Paragraph(cand["projects"], body_style))

    doc.build(story)

def create_all_samples():
    print(f"Generating 15 realistic sample resumes in {SAMPLE_DIR}...")
    for c in CANDIDATE_DATA:
        file_path = SAMPLE_DIR / c["filename"]
        generate_pdf_resume(c, file_path)
        print(f"Generated: {c['filename']}")
        
    # Also write a standard sample job description
    sample_jd = """JOB TITLE: Senior Full-Stack AI Engineer
DEPARTMENT: Core Product Engineering

ABOUT THE ROLE:
We are seeking an experienced Senior Full-Stack AI Engineer to lead the design and implementation of modern AI-powered applications. You will architect robust, production-grade microservices and collaborate on intuitive web interfaces for our enterprise screening software.

KEY RESPONSIBILITIES:
- Architect, build, and deploy high-performance REST APIs in Python using FastAPI.
- Develop interactive, responsive frontend user interfaces using React, TypeScript, and Tailwind CSS.
- Integrate modern LLMs, neural model APIs, and vector databases for automated document reasoning.
- Maintain production infrastructure using Docker, Kubernetes, and cloud platforms (AWS/GCP).
- Implement thorough automated unit and integration tests.
- Collaborate with product designers and HR domain specialists to ensure responsible AI practices.

MANDATORY / REQUIRED SKILLS:
- Python (FastAPI or Django)
- React.js and TypeScript
- Modern REST API architecture
- Experience integrating AI / LLM APIs (e.g. Groq, OpenAI, or PyTorch)
- Relational Databases (PostgreSQL or SQLite) and SQLAlchemy ORM
- Docker and containerized deployment workflows
- Git version control and CI/CD pipelines

PREFERRED / BONUS SKILLS:
- Vector databases (e.g. Qdrant, ChromaDB, Pinecone)
- Cloud architecture on AWS (ECS, Lambda, S3)
- PyMuPDF or Document OCR extraction
- Tailwind CSS and modern UI libraries (Lucide React, Recharts)
- Kubernetes cluster management

EXPERIENCE REQUIREMENTS:
- Minimum 5+ years of relevant software engineering experience.
- Demonstrated experience bringing AI features or document intelligence pipelines into production.

EDUCATION REQUIREMENTS:
- Bachelor's degree in Computer Science, Software Engineering, STEM field, or equivalent practical experience.
"""
    jd_file = SAMPLE_DIR / "sample_job_description.txt"
    with open(jd_file, "w", encoding="utf-8") as f:
        f.write(sample_jd)
    print(f"Generated sample job description at {jd_file}")

if __name__ == "__main__":
    create_all_samples()
