export interface ScoringWeights {
  required_skills: number;
  relevant_experience: number;
  technical_domain: number;
  projects_achievements: number;
  education_certifications: number;
  preferred_skills: number;
}

export interface ScoreBreakdown {
  id?: string;
  criteria_name: string;
  weight_percentage: number;
  raw_score: number;
  weighted_score: number;
  explanation: string;
  evidence?: string;
  missing_items: string[];
  page_references: number[];
}

export interface SkillMatch {
  id?: string;
  skill_name: string;
  category: "required" | "preferred";
  status: "matched" | "missing" | "partial";
  evidence?: string;
  page_number?: number;
}

export interface CandidateAnalysis {
  id: string;
  candidate_id: string;
  overall_score: number;
  interpretation_band: string;
  required_skills_coverage: number;
  preferred_skills_coverage: number;
  strengths: string[];
  missing_qualifications: string[];
  potential_gaps: string[];
  evidence_quality: string;
  suggested_interview_questions: string[];
  is_ai_generated: boolean;
  ai_provider: string;
  ai_model?: string;
  created_at: string;
  score_breakdowns: ScoreBreakdown[];
  skill_matches: SkillMatch[];
}

export interface ResumeFile {
  candidate_id: string;
  original_filename: string;
  file_size_bytes: number;
  file_hash: string;
  page_count: number;
  is_scanned: boolean;
  upload_status: "Uploaded" | "Extracting" | "Analysing" | "Completed" | "Failed";
  error_message?: string;
}

export interface Candidate {
  id: string;
  session_id: string;
  name: string;
  email: string;
  phone: string;
  summary: string;
  total_experience_years: number;
  relevant_experience_years: number;
  job_titles: string[];
  companies: string[];
  technical_skills: string[];
  soft_skills: string[];
  education: Array<{ degree?: string; institution?: string; year?: string }>;
  certifications: string[];
  projects: Array<{ title?: string; description?: string; technologies?: string[] }>;
  achievements: string[];
  industry_experience: string[];
  review_status: "Pending Review" | "Recommended for Interview" | "Needs Further Review" | "Not Progressing";
  recruiter_notes?: string;
  created_at: string;
  analysis?: CandidateAnalysis;
  resume_file?: ResumeFile;
}

export interface CandidateRankingItem {
  rank: number;
  candidate_id: string;
  candidate_name: string;
  original_filename: string;
  overall_score: number;
  interpretation_band: string;
  required_skills_coverage: number;
  preferred_skills_coverage: number;
  relevant_experience_years: number;
  total_experience_years: number;
  review_status: "Pending Review" | "Recommended for Interview" | "Needs Further Review" | "Not Progressing";
  evidence_quality: string;
  is_ai_generated: boolean;
  created_at: string;
}

export interface JobDescription {
  id?: string;
  session_id?: string;
  title: string;
  department?: string;
  raw_text: string;
  responsibilities?: string[];
  mandatory_skills: string[];
  preferred_skills: string[];
  technical_requirements?: string[];
  experience_years_min?: number;
  experience_requirements?: string;
  education_requirements?: string;
  domain_expertise?: string[];
  additional_requirements?: string;
}

export interface ScreeningSession {
  id: string;
  title: string;
  department?: string;
  status: string;
  weights?: Record<string, number>;
  thresholds?: Record<string, number>;
  created_at: string;
  updated_at: string;
  candidate_count?: number;
  highest_score?: number;
  average_score?: number;
  job_description?: JobDescription;
}

export interface DashboardStats {
  total_sessions: number;
  total_candidates: number;
  recommended_count: number;
  review_needed_count: number;
  average_score: number;
  recent_sessions: ScreeningSession[];
}

export interface ComparisonItem {
  candidate_id: string;
  name: string;
  overall_score: number;
  interpretation_band: string;
  required_skills_coverage: number;
  preferred_skills_coverage: number;
  relevant_experience_years: number;
  total_experience_years: number;
  matched_required_skills: string[];
  missing_required_skills: string[];
  matched_preferred_skills: string[];
  technical_skills: string[];
  education: any[];
  certifications: string[];
  projects_count: number;
  evidence_quality: string;
  strengths: string[];
  missing_qualifications: string[];
  review_status: string;
}

export interface SystemSettings {
  ai_provider: string;
  groq_api_key_configured: boolean;
  groq_api_key_masked: string;
  groq_model: string;
  gemini_supported: boolean;
  max_upload_size_mb: number;
  default_weights: Record<string, number>;
  thresholds: Record<string, number>;
}
