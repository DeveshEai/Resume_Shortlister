import React, { useState } from 'react';
import {
  FileText,
  Sliders,
  UploadCloud,
  Check,
  AlertCircle,
  Plus,
  X,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Trash2,
  FileCheck2,
  Loader2
} from 'lucide-react';
import { api } from '../services/api';
import { ScoringWeights, ResumeFile } from '../types';

interface NewScreeningPageProps {
  onScreeningComplete: (sessionId: string) => void;
}

const SAMPLE_JD_TEXT = `JOB TITLE: Senior Full-Stack AI Engineer
DEPARTMENT: Core Product Engineering

ABOUT THE ROLE:
We are looking for a Senior Full-Stack AI Engineer to architect our enterprise AI screening applications. You will deploy high-performance microservices and build clean recruiter web interfaces.

KEY RESPONSIBILITIES:
- Architect, build, and deploy production REST APIs in Python using FastAPI.
- Develop interactive, responsive frontend user interfaces using React, TypeScript, and Tailwind CSS.
- Integrate modern LLMs, neural model APIs, and vector databases.
- Maintain containerized cloud deployments using Docker and AWS.
- Implement robust automated unit and integration tests.

MANDATORY / REQUIRED SKILLS:
- Python (FastAPI or Django)
- React.js and TypeScript
- REST API Architecture
- AI/LLM API Integration (Groq, OpenAI, or PyTorch)
- Relational Databases (PostgreSQL or SQLite) and SQLAlchemy ORM
- Docker

PREFERRED / BONUS SKILLS:
- Vector databases (Qdrant, ChromaDB, Pinecone)
- Cloud deployment on AWS
- PyMuPDF or Document OCR extraction
- Tailwind CSS and Recharts

EXPERIENCE REQUIREMENTS:
- Minimum 5+ years of relevant software engineering experience.
- Production experience with generative AI workflows.

EDUCATION REQUIREMENTS:
- Bachelor's degree in Computer Science, STEM field, or equivalent practical experience.`;

export const NewScreeningPage: React.FC<NewScreeningPageProps> = ({ onScreeningComplete }) => {
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);

  // Step 1: JD State
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [rawJdText, setRawJdText] = useState('');
  const [analyzingJd, setAnalyzingJd] = useState(false);
  const [mandatorySkills, setMandatorySkills] = useState<string[]>([]);
  const [preferredSkills, setPreferredSkills] = useState<string[]>([]);
  const [minExpYears, setMinExpYears] = useState<number>(3);
  const [eduReqs, setEduReqs] = useState<string>('');
  const [newMandatoryInput, setNewMandatoryInput] = useState('');
  const [newPreferredInput, setNewPreferredInput] = useState('');

  // Step 2: Scoring Weights State
  const [weights, setWeights] = useState<ScoringWeights>({
    required_skills: 35,
    relevant_experience: 25,
    technical_domain: 15,
    projects_achievements: 10,
    education_certifications: 10,
    preferred_skills: 5
  });

  // Step 3: Files & Screening State
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [createdSessionId, setCreatedSessionId] = useState<string | null>(null);
  const [uploadResults, setUploadResults] = useState<ResumeFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isScreening, setIsScreening] = useState(false);
  const [screeningProgress, setScreeningProgress] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Compute total weights
  const totalWeight = Object.values(weights).reduce((a, b) => a + Number(b || 0), 0);
  const isWeightValid = Math.abs(totalWeight - 100) < 0.1;

  // Handler: Analyze JD with AI
  const handleAnalyzeJd = async () => {
    if (!rawJdText.trim()) {
      setErrorMsg('Please paste the Job Description text first.');
      return;
    }
    setErrorMsg(null);
    setAnalyzingJd(true);
    try {
      const extracted = await api.analyzeJobDescription(rawJdText);
      if (extracted.title && !jobTitle) setJobTitle(extracted.title);
      if (extracted.department && !department) setDepartment(extracted.department);
      if (extracted.mandatory_skills?.length) setMandatorySkills(extracted.mandatory_skills);
      if (extracted.preferred_skills?.length) setPreferredSkills(extracted.preferred_skills);
      if (extracted.experience_years_min) setMinExpYears(extracted.experience_years_min);
      if (extracted.education_requirements) setEduReqs(extracted.education_requirements);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to extract requirements from JD.');
    } finally {
      setAnalyzingJd(false);
    }
  };

  const loadSampleJd = () => {
    setJobTitle('Senior Full-Stack AI Engineer');
    setDepartment('Core Product Engineering');
    setRawJdText(SAMPLE_JD_TEXT);
    setMandatorySkills(['Python', 'FastAPI', 'React.js', 'TypeScript', 'REST APIs', 'Docker', 'Relational Databases']);
    setPreferredSkills(['Vector databases', 'AWS', 'PyMuPDF / OCR', 'Tailwind CSS']);
    setMinExpYears(5);
    setEduReqs("Bachelor's degree in Computer Science, STEM field, or equivalent experience.");
  };

  // Add/Remove Skills
  const addMandatorySkill = () => {
    if (newMandatoryInput.trim() && !mandatorySkills.includes(newMandatoryInput.trim())) {
      setMandatorySkills([...mandatorySkills, newMandatoryInput.trim()]);
      setNewMandatoryInput('');
    }
  };

  const removeMandatorySkill = (s: string) => {
    setMandatorySkills(mandatorySkills.filter(x => x !== s));
  };

  const addPreferredSkill = () => {
    if (newPreferredInput.trim() && !preferredSkills.includes(newPreferredInput.trim())) {
      setPreferredSkills([...preferredSkills, newPreferredInput.trim()]);
      setNewPreferredInput('');
    }
  };

  const removePreferredSkill = (s: string) => {
    setPreferredSkills(preferredSkills.filter(x => x !== s));
  };

  // Redistribute non-applicable criteria
  const handleToggleNA = (key: keyof ScoringWeights) => {
    const currentKeys = Object.keys(weights) as Array<keyof ScoringWeights>;
    const activeKeys = currentKeys.filter(k => k !== key && weights[k] > 0);
    const sumActive = activeKeys.reduce((acc, k) => acc + weights[k], 0);

    if (sumActive === 0) return;
    const ratio = 100 / sumActive;
    const newWeights = { ...weights, [key]: 0 };
    activeKeys.forEach(k => {
      newWeights[k] = Math.round(weights[k] * ratio * 10) / 10;
    });
    // Adjust rounding difference
    const diff = 100 - Object.values(newWeights).reduce((a, b) => a + b, 0);
    if (activeKeys.length > 0 && Math.abs(diff) > 0.001) {
      newWeights[activeKeys[0]] = Math.round((newWeights[activeKeys[0]] + diff) * 10) / 10;
    }
    setWeights(newWeights);
  };

  // Step 1 -> Step 2 validation
  const goToStep2 = () => {
    if (!jobTitle.trim()) {
      setErrorMsg('Please specify the Job Title.');
      return;
    }
    if (!rawJdText.trim()) {
      setErrorMsg('Please paste the complete Job Description.');
      return;
    }
    setErrorMsg(null);
    setCurrentStep(2);
  };

  // Step 2 -> Step 3: Create Session & Save JD
  const goToStep3 = async () => {
    if (!isWeightValid) {
      setErrorMsg('Evaluation weights must sum to exactly 100%.');
      return;
    }
    setErrorMsg(null);
    try {
      // 1. Create Session
      const session = await api.createSession(jobTitle, department, weights);
      setCreatedSessionId(session.id);

      // 2. Save JD
      await api.saveJobDescription(session.id, {
        title: jobTitle,
        department,
        raw_text: rawJdText,
        mandatory_skills: mandatorySkills,
        preferred_skills: preferredSkills,
        experience_years_min: minExpYears,
        education_requirements: eduReqs
      });

      setCurrentStep(3);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save screening session.');
    }
  };

  // File Handlers
  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const pdfs = Array.from(e.dataTransfer.files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
      if (pdfs.length === 0) {
        alert('Only PDF resume files are accepted.');
        return;
      }
      setSelectedFiles(prev => [...prev, ...pdfs]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const pdfs = Array.from(e.target.files).filter(f => f.name.toLowerCase().endsWith('.pdf'));
      setSelectedFiles(prev => [...prev, ...pdfs]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Start Upload & Screening
  const handleStartScreening = async () => {
    if (!createdSessionId) return;
    if (selectedFiles.length === 0) {
      setErrorMsg('Please upload at least 1 PDF resume before screening.');
      return;
    }
    setErrorMsg(null);
    setIsUploading(true);
    setScreeningProgress('Uploading resumes & checking for duplicates...');

    try {
      // 1. Upload files
      const uploaded = await api.uploadResumes(createdSessionId, selectedFiles);
      setUploadResults(uploaded);
      setIsUploading(false);

      // 2. Trigger AI screening candidate by candidate for real-time recruiter visibility
      setIsScreening(true);
      const validUploads = uploaded.filter(u => u.candidate_id && u.upload_status !== 'Failed');
      for (let i = 0; i < validUploads.length; i++) {
        const u = validUploads[i];
        setScreeningProgress(`Evaluating candidate ${i + 1} of ${validUploads.length}: ${u.original_filename}...`);
        try {
          await api.screenCandidate(u.candidate_id);
        } catch (candErr) {
          console.warn(`Screening note for ${u.original_filename}:`, candErr);
        }
      }

      setScreeningProgress('All candidates screened successfully! Redirecting to rankings...');
      setTimeout(() => {
        onScreeningComplete(createdSessionId);
      }, 600);
    } catch (err: any) {
      setErrorMsg(err.message || 'Screening process encountered an error.');
      setIsUploading(false);
      setIsScreening(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Step Indicator Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              currentStep === 1 ? 'bg-brand-600 text-white shadow-md' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {currentStep > 1 ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900">Job Description</div>
              <div className="text-[11px] text-slate-500">Enter & extract criteria</div>
            </div>
          </div>

          <div className="h-0.5 w-12 bg-slate-200" />

          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              currentStep === 2 ? 'bg-brand-600 text-white shadow-md' : (currentStep > 2 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500')
            }`}>
              {currentStep > 2 ? <Check className="w-4 h-4" /> : '2'}
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900">Scoring Weights</div>
              <div className="text-[11px] text-slate-500">Configure evaluation criteria</div>
            </div>
          </div>

          <div className="h-0.5 w-12 bg-slate-200" />

          <div className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              currentStep === 3 ? 'bg-brand-600 text-white shadow-md' : 'bg-slate-100 text-slate-500'
            }`}>
              3
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900">Upload & Screen</div>
              <div className="text-[11px] text-slate-500">PDFs & AI Processing</div>
            </div>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 1: JOB DESCRIPTION */}
      {currentStep === 1 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Step 1: Job Description & Requirements</h2>
              <p className="text-xs text-slate-500 mt-0.5">Paste your raw JD or use our sample to automatically extract evaluation criteria.</p>
            </div>
            <button
              onClick={loadSampleJd}
              className="text-xs font-medium text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors flex items-center"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-brand-500" />
              Load Sample AI Engineer JD
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Job Title *</label>
              <input
                type="text"
                placeholder="e.g. Senior Full-Stack AI Engineer"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department / Business Unit</label>
              <input
                type="text"
                placeholder="e.g. Core Product Engineering"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">Paste Full Job Description *</label>
              <button
                onClick={handleAnalyzeJd}
                disabled={analyzingJd || !rawJdText.trim()}
                className="inline-flex items-center text-xs font-semibold text-brand-600 hover:text-brand-700 disabled:opacity-40"
              >
                {analyzingJd ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    Analyzing JD with AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 mr-1.5 text-brand-500" />
                    Extract Requirements with AI
                  </>
                )}
              </button>
            </div>
            <textarea
              rows={8}
              placeholder="Paste responsibilities, required qualifications, technical skills, and experience guidelines here..."
              value={rawJdText}
              onChange={(e) => setRawJdText(e.target.value)}
              className="w-full p-3.5 rounded-lg border border-slate-300 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
            />
          </div>

          {/* Extracted Interactive Requirements */}
          <div className="border-t border-slate-100 pt-5 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Approved Screening Criteria (Recruiter Verified)
            </h3>

            {/* Mandatory Skills */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mandatory / Required Skills ({mandatorySkills.length})
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {mandatorySkills.map((s, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200"
                  >
                    {s}
                    <button
                      onClick={() => removeMandatorySkill(s)}
                      className="ml-1.5 text-indigo-400 hover:text-indigo-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex max-w-sm space-x-2">
                <input
                  type="text"
                  placeholder="Add required skill (e.g. Python)"
                  value={newMandatoryInput}
                  onChange={(e) => setNewMandatoryInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addMandatorySkill())}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <button
                  onClick={addMandatorySkill}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Preferred Skills */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Preferred / Nice-to-Have Skills ({preferredSkills.length})
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {preferredSkills.map((s, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"
                  >
                    {s}
                    <button
                      onClick={() => removePreferredSkill(s)}
                      className="ml-1.5 text-emerald-400 hover:text-emerald-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex max-w-sm space-x-2">
                <input
                  type="text"
                  placeholder="Add bonus skill (e.g. AWS)"
                  value={newPreferredInput}
                  onChange={(e) => setNewPreferredInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addPreferredSkill())}
                  className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
                <button
                  onClick={addPreferredSkill}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Minimum Experience */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Minimum Relevant Experience (Years)
                </label>
                <input
                  type="number"
                  min={0}
                  max={25}
                  value={minExpYears}
                  onChange={(e) => setMinExpYears(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Required Education
                </label>
                <input
                  type="text"
                  placeholder="e.g. Bachelor's in CS or equivalent STEM"
                  value={eduReqs}
                  onChange={(e) => setEduReqs(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <button
              onClick={goToStep2}
              className="inline-flex items-center px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs rounded-xl shadow-md transition-all"
            >
              Continue to Scoring Weights
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: SCORING WEIGHTS */}
      {currentStep === 2 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Step 2: Configurable Scoring Weights</h2>
              <p className="text-xs text-slate-500 mt-0.5">Customize weights according to your hiring priorities. Must total 100%.</p>
            </div>
            <div className="flex items-center space-x-3">
              <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                isWeightValid ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                Total: {totalWeight.toFixed(1)}% / 100%
              </span>
              <button
                onClick={() => setWeights({
                  required_skills: 35,
                  relevant_experience: 25,
                  technical_domain: 15,
                  projects_achievements: 10,
                  education_certifications: 10,
                  preferred_skills: 5
                })}
                className="text-xs text-slate-600 hover:text-slate-900 underline"
              >
                Reset Defaults
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {[
              { key: 'required_skills', label: 'Required skills match', desc: 'Core mandatory competencies explicitly required in JD' },
              { key: 'relevant_experience', label: 'Relevant work experience', desc: 'Years and depth in comparable engineering roles' },
              { key: 'technical_domain', label: 'Technical / domain expertise', desc: 'Specialized architectures, frameworks and system knowledge' },
              { key: 'projects_achievements', label: 'Relevant projects & achievements', desc: 'Concrete demonstrated systems, metrics and accomplishments' },
              { key: 'education_certifications', label: 'Education & certifications', desc: 'Degree alignment and accredited industry certifications' },
              { key: 'preferred_skills', label: 'Preferred skills (bonus)', desc: 'Nice-to-have capabilities giving extra edge' },
            ].map((item) => {
              const k = item.key as keyof ScoringWeights;
              const val = weights[k];
              return (
                <div key={k} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div className="max-w-md">
                    <div className="text-xs font-semibold text-slate-900">{item.label}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">{item.desc}</div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => handleToggleNA(k)}
                      className={`text-[11px] font-medium px-2 py-1 rounded border transition-colors ${
                        val === 0 ? 'bg-slate-200 text-slate-600 border-slate-300' : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                      }`}
                    >
                      {val === 0 ? 'Marked N/A' : 'Set N/A'}
                    </button>
                    <div className="flex items-center space-x-1.5 w-24">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={val}
                        onChange={(e) => setWeights({ ...weights, [k]: parseFloat(e.target.value) || 0 })}
                        className="w-16 px-2.5 py-1 text-xs font-semibold text-right rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      />
                      <span className="text-xs font-bold text-slate-600">%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(1)}
              className="inline-flex items-center px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Job Description
            </button>
            <button
              onClick={goToStep3}
              disabled={!isWeightValid}
              className="inline-flex items-center px-5 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-md transition-all"
            >
              Confirm Weights & Proceed to Upload
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: RESUME UPLOAD & SCREENING */}
      {currentStep === 3 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Step 3: Upload Resumes & AI Screening</h2>
              <p className="text-xs text-slate-500 mt-0.5">Upload 10–15 candidate resumes in PDF format. Corrupted or encrypted files will be safely flagged.</p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              Max 10MB per file
            </span>
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
              isDragging ? 'border-brand-500 bg-brand-50/50' : 'border-slate-300 hover:border-slate-400 bg-slate-50/40'
            }`}
          >
            <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-600 mx-auto flex items-center justify-center mb-3">
              <UploadCloud className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">
              Drag & Drop PDF Resumes Here
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Select 10–15 candidate resumes simultaneously. Formats accepted: <span className="font-semibold text-slate-700">PDF</span>.
            </p>
            <div className="mt-4">
              <label className="inline-flex items-center px-4 py-2 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer shadow-sm">
                <span>Browse Files</span>
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={handleFileInput}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Uploaded Files Table */}
          {selectedFiles.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Selected Files ({selectedFiles.length})
                </span>
                <button
                  onClick={() => setSelectedFiles([])}
                  className="text-xs text-red-600 hover:text-red-700"
                >
                  Clear all
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-xl">
                {selectedFiles.map((file, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between hover:bg-slate-50/70 text-xs">
                    <div className="flex items-center space-x-3 truncate">
                      <FileText className="w-4 h-4 text-brand-500 flex-shrink-0" />
                      <span className="font-medium text-slate-800 truncate">{file.name}</span>
                      <span className="text-slate-400 text-[11px] flex-shrink-0">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      onClick={() => removeFile(idx)}
                      disabled={isUploading || isScreening}
                      className="text-slate-400 hover:text-red-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Screening Progress Status */}
          {(isUploading || isScreening) && (
            <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center space-x-3">
              <Loader2 className="w-5 h-5 text-brand-600 animate-spin flex-shrink-0" />
              <div>
                <div className="text-xs font-semibold text-slate-900">
                  {isUploading ? 'Uploading & Parsing Resumes' : 'Analyzing Candidates with Groq AI'}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">{screeningProgress}</div>
              </div>
            </div>
          )}

          <div className="flex justify-between pt-4 border-t border-slate-100">
            <button
              onClick={() => setCurrentStep(2)}
              disabled={isUploading || isScreening}
              className="inline-flex items-center px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back to Weights
            </button>
            <button
              onClick={handleStartScreening}
              disabled={selectedFiles.length === 0 || isUploading || isScreening}
              className="inline-flex items-center px-6 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-md transition-all"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {isScreening ? 'Screening Candidates...' : `Start AI Screening (${selectedFiles.length} Resumes)`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
