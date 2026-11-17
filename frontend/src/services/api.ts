import {
  ScreeningSession,
  JobDescription,
  Candidate,
  CandidateRankingItem,
  DashboardStats,
  ComparisonItem,
  SystemSettings,
  ResumeFile,
  ScoringWeights
} from '../types';

const API_BASE = '/api';

export const api = {
  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await fetch(`${API_BASE}/dashboard/stats`);
    if (!res.ok) throw new Error('Failed to fetch dashboard statistics');
    return res.json();
  },

  // Sessions
  async getSessions(): Promise<ScreeningSession[]> {
    const res = await fetch(`${API_BASE}/sessions`);
    if (!res.ok) throw new Error('Failed to fetch screening sessions');
    return res.json();
  },

  async getSession(id: string): Promise<ScreeningSession> {
    const res = await fetch(`${API_BASE}/sessions/${id}`);
    if (!res.ok) throw new Error('Failed to fetch session details');
    return res.json();
  },

  async createSession(title: string, department?: string, weights?: ScoringWeights): Promise<ScreeningSession> {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, department, weights }),
    });
    if (!res.ok) throw new Error('Failed to create screening session');
    return res.json();
  },

  async deleteSession(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/sessions/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete session');
  },

  // Job Description
  async analyzeJobDescription(raw_text: string): Promise<any> {
    const res = await fetch(`${API_BASE}/job-description/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ raw_text }),
    });
    if (!res.ok) throw new Error('Failed to analyze job description');
    return res.json();
  },

  async saveJobDescription(sessionId: string, jd: Partial<JobDescription>): Promise<JobDescription> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/job-description`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(jd),
    });
    if (!res.ok) throw new Error('Failed to save job description');
    return res.json();
  },

  // Resumes
  async uploadResumes(sessionId: string, files: File[]): Promise<ResumeFile[]> {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));

    const res = await fetch(`${API_BASE}/sessions/${sessionId}/resumes`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Failed to upload resumes');
    return res.json();
  },

  async screenAllCandidates(sessionId: string): Promise<{ message: string; count: number }> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/screen`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to screen candidates');
    return res.json();
  },

  async screenCandidate(candidateId: string): Promise<Candidate> {
    const res = await fetch(`${API_BASE}/candidates/${candidateId}/screen`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to screen candidate');
    return res.json();
  },

  // Candidates & Rankings
  async getRankings(
    sessionId: string,
    sortBy: string = 'highest_score',
    filterBand?: string
  ): Promise<CandidateRankingItem[]> {
    const params = new URLSearchParams({ sort_by: sortBy });
    if (filterBand && filterBand !== 'all') {
      params.append('filter_band', filterBand);
    }
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/candidates?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch candidate rankings');
    return res.json();
  },

  async getCandidate(candidateId: string): Promise<Candidate> {
    const res = await fetch(`${API_BASE}/candidates/${candidateId}`);
    if (!res.ok) throw new Error('Failed to fetch candidate profile');
    return res.json();
  },

  async updateCandidateStatus(
    candidateId: string,
    reviewStatus: string,
    recruiterNotes?: string
  ): Promise<Candidate> {
    const res = await fetch(`${API_BASE}/candidates/${candidateId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ review_status: reviewStatus, recruiter_notes: recruiterNotes }),
    });
    if (!res.ok) throw new Error('Failed to update candidate status');
    return res.json();
  },

  getResumeFileUrl(candidateId: string): string {
    return `${API_BASE}/candidates/${candidateId}/resume-file`;
  },

  // Comparison
  async compareCandidates(sessionId: string, candidateIds: string[]): Promise<ComparisonItem[]> {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate_ids: candidateIds }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to compare candidates');
    }
    return res.json();
  },

  // Reports
  getReportDownloadUrl(sessionId: string, format: 'pdf' | 'excel' | 'csv'): string {
    return `${API_BASE}/sessions/${sessionId}/reports/${format}`;
  },

  // Settings
  async getSettings(): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(data: Partial<SystemSettings>): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },

  async testConnection(): Promise<{ success: boolean; provider: string; model: string; message: string }> {
    const res = await fetch(`${API_BASE}/settings/test-connection`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to test connection');
    return res.json();
  },

  // Demo Seed
  async seedDemo(): Promise<{ message: string; session_id: string; candidate_count: number }> {
    const res = await fetch(`${API_BASE}/demo/seed`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to generate sample session');
    return res.json();
  }
};
