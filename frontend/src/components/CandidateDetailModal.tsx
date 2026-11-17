import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  FileText,
  HelpCircle,
  Award,
  BookOpen,
  Briefcase,
  ExternalLink,
  Save,
  Sparkles,
  Calendar,
  Layers,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { Candidate } from '../types';

interface CandidateDetailModalProps {
  candidateId: string | null;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

export const CandidateDetailModal: React.FC<CandidateDetailModalProps> = ({
  candidateId,
  onClose,
  onStatusUpdated
}) => {
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewStatus, setReviewStatus] = useState<string>('Pending Review');
  const [recruiterNotes, setRecruiterNotes] = useState<string>('');
  const [savingNotes, setSavingNotes] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!candidateId) return;
    setLoading(true);
    api.getCandidate(candidateId)
      .then(c => {
        setCandidate(c);
        setReviewStatus(c.review_status);
        setRecruiterNotes(c.recruiter_notes || '');
      })
      .catch(err => alert(err.message))
      .finally(() => setLoading(false));
  }, [candidateId]);

  const handleSaveReview = async () => {
    if (!candidateId) return;
    setSavingNotes(true);
    try {
      await api.updateCandidateStatus(candidateId, reviewStatus, recruiterNotes);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
      if (onStatusUpdated) onStatusUpdated();
    } catch (err: any) {
      alert(err.message || 'Failed to update review status');
    } finally {
      setSavingNotes(false);
    }
  };

  if (!candidateId) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-sm shadow-sm">
              {candidate?.name.slice(0, 2).toUpperCase() || 'CA'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">{candidate?.name || 'Loading candidate...'}</h3>
                {candidate?.analysis && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    candidate.analysis.overall_score >= 85
                      ? 'bg-emerald-100 text-emerald-800'
                      : candidate.analysis.overall_score >= 70
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {candidate.analysis.overall_score.toFixed(1)}% Match
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-500 mt-0.5 flex items-center space-x-3">
                <span>{candidate?.email}</span>
                <span>•</span>
                <span>{candidate?.phone}</span>
                <span>•</span>
                <span>{candidate?.total_experience_years || 0} Years Exp</span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {candidate?.resume_file && (
              <a
                href={api.getResumeFileUrl(candidate.id)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <FileText className="w-3.5 h-3.5 mr-1 text-slate-500" />
                View Original PDF
                <ExternalLink className="w-3 h-3 ml-1 text-slate-400" />
              </a>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : candidate ? (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* Responsible AI Compliance Notice */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center space-x-2.5 text-xs text-slate-600">
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>
                <strong>Unbiased Decision Support:</strong> Evaluations are strictly restricted to job qualifications. Personal demographics and contact information are excluded from scoring signals.
              </span>
            </div>

            {/* Overall Score & Interpretation Banner */}
            {candidate.analysis && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-indigo-50 to-brand-50 p-4 rounded-xl border border-indigo-100 flex flex-col justify-between">
                  <span className="text-xs font-semibold text-slate-500">Overall Match Score</span>
                  <div className="my-2">
                    <span className="text-3xl font-extrabold text-brand-700">
                      {candidate.analysis.overall_score.toFixed(1)}%
                    </span>
                  </div>
                  <span className="text-xs font-medium text-slate-700">
                    {candidate.analysis.interpretation_band}
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <span className="text-xs font-semibold text-slate-500">Required Skills Coverage</span>
                  <div className="my-2">
                    <span className="text-3xl font-extrabold text-slate-800">
                      {candidate.analysis.required_skills_coverage.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-brand-600 h-1.5 rounded-full"
                      style={{ width: `${candidate.analysis.required_skills_coverage}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                  <span className="text-xs font-semibold text-slate-500">Evidence Quality</span>
                  <div className="my-2">
                    <span className="text-3xl font-extrabold text-slate-800">
                      {candidate.analysis.evidence_quality}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    Provider: {candidate.analysis.ai_provider === 'groq' ? 'Groq AI' : 'Rule-Based Engine'}
                  </span>
                </div>
              </div>
            )}

            {/* Professional Summary */}
            {candidate.summary && candidate.summary !== 'Not specified' && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Professional Summary
                </h4>
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                  {candidate.summary}
                </p>
              </div>
            )}

            {/* Criteria Score Breakdown */}
            {candidate.analysis?.score_breakdowns && candidate.analysis.score_breakdowns.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Evaluation Criteria & Transparent Evidence
                </h4>
                <div className="space-y-3">
                  {candidate.analysis.score_breakdowns.map((sb, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-800">{sb.criteria_name}</span>
                          <span className="text-slate-400 font-medium">({sb.weight_percentage}% weight)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-500 font-mono text-[11px]">Score: {sb.raw_score.toFixed(1)}/100</span>
                          <span className="font-bold text-brand-700">+{sb.weighted_score.toFixed(1)} pts</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600">{sb.explanation}</p>
                      {sb.evidence && (
                        <div className="text-[11px] bg-slate-50 p-2 rounded-lg text-slate-600 border border-slate-100 flex items-start space-x-2">
                          <BookOpen className="w-3.5 h-3.5 text-brand-500 flex-shrink-0 mt-0.5" />
                          <span>
                            <strong>Resume Evidence:</strong> "{sb.evidence}"
                            {sb.page_references?.length > 0 && (
                              <span className="ml-1 text-brand-600 font-semibold font-mono">
                                [Page {sb.page_references.join(', ')}]
                              </span>
                            )}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Skills Matching Grid */}
            {candidate.analysis?.skill_matches && candidate.analysis.skill_matches.length > 0 && (
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Skills Matching Matrix
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {candidate.analysis.skill_matches.map((sm, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                        sm.status === 'matched'
                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-900'
                          : sm.status === 'partial'
                          ? 'bg-amber-50/60 border-amber-200 text-amber-900'
                          : 'bg-red-50/60 border-red-200 text-red-900'
                      }`}
                    >
                      <div className="flex items-center space-x-2 truncate">
                        {sm.status === 'matched' ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        ) : sm.status === 'partial' ? (
                          <HelpCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        )}
                        <span className="font-semibold truncate">{sm.skill_name}</span>
                        <span className="text-[10px] uppercase font-bold text-slate-400">
                          ({sm.category})
                        </span>
                      </div>
                      {sm.page_number && (
                        <span className="text-[10px] font-mono bg-white/80 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">
                          p.{sm.page_number}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths & Missing Qualifications */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50/40 border border-emerald-100">
                <h5 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2 flex items-center">
                  <Award className="w-3.5 h-3.5 mr-1.5" />
                  Key Strengths
                </h5>
                <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
                  {candidate.analysis?.strengths?.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-amber-50/40 border border-amber-100">
                <h5 className="text-xs font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center">
                  <HelpCircle className="w-3.5 h-3.5 mr-1.5" />
                  Missing / Verification Gaps
                </h5>
                <ul className="text-xs text-slate-700 space-y-1.5 list-disc list-inside">
                  {candidate.analysis?.missing_qualifications?.map((m, idx) => (
                    <li key={idx}>{m}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Tailored Suggested Interview Questions */}
            {candidate.analysis?.suggested_interview_questions && (
              <div className="p-4 rounded-xl bg-brand-50/40 border border-brand-100">
                <h5 className="text-xs font-bold text-brand-900 uppercase tracking-wider mb-2.5 flex items-center">
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-brand-600" />
                  Suggested Interview Questions (Tailored to Profile)
                </h5>
                <div className="space-y-2">
                  {candidate.analysis.suggested_interview_questions.map((q, idx) => (
                    <div key={idx} className="text-xs text-slate-800 bg-white p-2.5 rounded-lg border border-brand-200/60 shadow-xs flex items-start space-x-2">
                      <span className="font-bold text-brand-600 font-mono text-[11px]">{idx + 1}.</span>
                      <span className="italic">"{q}"</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recruiter Notes & Decision Section */}
            <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Recruiter Evaluation & Next Steps
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Hiring Review Status
                  </label>
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white font-medium focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="Pending Review">Pending Review</option>
                    <option value="Recommended for Interview">Recommended for Interview</option>
                    <option value="Needs Further Review">Needs Further Review</option>
                    <option value="Not Progressing">Not Progressing</option>
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Recruiter Notes (Saved to History)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Enter confidential notes, interview observations, or feedback..."
                    value={recruiterNotes}
                    onChange={(e) => setRecruiterNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-2">
                {saveSuccess ? (
                  <span className="text-xs text-emerald-600 font-semibold flex items-center">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Review status saved successfully!
                  </span>
                ) : <span />}
                <button
                  onClick={handleSaveReview}
                  disabled={savingNotes}
                  className="inline-flex items-center px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs rounded-lg shadow-sm transition-colors"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  {savingNotes ? 'Saving...' : 'Save Decision & Notes'}
                </button>
              </div>
            </div>

          </div>
        ) : (
          <div className="p-8 text-center text-xs text-slate-500">Candidate not found.</div>
        )}
      </div>
    </div>
  );
};
