import React, { useState, useEffect } from 'react';
import {
  X,
  Users,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Award,
  Layers,
  ArrowRight
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { api } from '../services/api';
import { ComparisonItem } from '../types';

interface CandidateComparisonModalProps {
  sessionId: string;
  candidateIds: string[];
  onClose: () => void;
}

export const CandidateComparisonModal: React.FC<CandidateComparisonModalProps> = ({
  sessionId,
  candidateIds,
  onClose
}) => {
  const [items, setItems] = useState<ComparisonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (candidateIds.length < 2) return;
    setLoading(true);
    api.compareCandidates(sessionId, candidateIds)
      .then(setItems)
      .catch(err => setError(err.message || 'Failed to compare candidates'))
      .finally(() => setLoading(false));
  }, [sessionId, candidateIds]);

  const chartData = items.map(c => ({
    name: c.name.split(' ')[0] || c.name,
    'Match Score': c.overall_score,
    'Required Skills': c.required_skills_coverage,
    'Preferred Skills': c.preferred_skills_coverage,
  }));

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-sm shadow-sm">
              <Users className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Side-by-Side Candidate Comparison ({items.length} Candidates)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Compare job-related qualifications, score metrics, and identified gaps
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600 text-xs">{error}</div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            {/* Visual Metric Chart */}
            <div className="bg-slate-50/70 p-5 rounded-xl border border-slate-200">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Score & Skills Coverage Comparison
              </h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                    <Bar dataKey="Match Score" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Required Skills" fill="#10B981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Preferred Skills" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Side-by-Side Comparison Matrix */}
            <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs">
              <table className="w-full text-left text-xs divide-y divide-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 w-40 bg-slate-200/70">Criteria</th>
                    {items.map(c => (
                      <th key={c.candidate_id} className="px-4 py-3 font-bold text-slate-900">
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {/* Overall Score */}
                  <tr className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-600 bg-slate-50">Match Score</td>
                    {items.map(c => (
                      <td key={c.candidate_id} className="px-4 py-3 font-extrabold text-sm text-brand-700">
                        {c.overall_score.toFixed(1)}%
                        <span className="block text-[11px] font-medium text-slate-500">{c.interpretation_band}</span>
                      </td>
                    ))}
                  </tr>

                  {/* Required Skills Coverage */}
                  <tr className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-600 bg-slate-50">Required Skills %</td>
                    {items.map(c => (
                      <td key={c.candidate_id} className="px-4 py-3 font-bold text-slate-800">
                        {c.required_skills_coverage.toFixed(0)}%
                      </td>
                    ))}
                  </tr>

                  {/* Relevant Experience */}
                  <tr className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-600 bg-slate-50">Relevant Experience</td>
                    {items.map(c => (
                      <td key={c.candidate_id} className="px-4 py-3 font-medium text-slate-700">
                        {c.relevant_experience_years.toFixed(1)} years (Total: {c.total_experience_years.toFixed(1)}y)
                      </td>
                    ))}
                  </tr>

                  {/* Matched Required Skills */}
                  <tr className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-600 bg-slate-50">Matched Core Skills</td>
                    {items.map(c => (
                      <td key={c.candidate_id} className="px-4 py-3 text-slate-700">
                        <div className="flex flex-wrap gap-1">
                          {c.matched_required_skills.map((s, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-800 font-medium">
                              {s}
                            </span>
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Missing Skills */}
                  <tr className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-600 bg-slate-50">Missing Skills</td>
                    {items.map(c => (
                      <td key={c.candidate_id} className="px-4 py-3 text-slate-700">
                        <div className="flex flex-wrap gap-1">
                          {c.missing_required_skills.length > 0 ? (
                            c.missing_required_skills.map((s, i) => (
                              <span key={i} className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-800 font-medium">
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 italic">None noted</span>
                          )}
                        </div>
                      </td>
                    ))}
                  </tr>

                  {/* Key Strengths */}
                  <tr className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-600 bg-slate-50">Primary Strengths</td>
                    {items.map(c => (
                      <td key={c.candidate_id} className="px-4 py-3 text-slate-700">
                        <ul className="list-disc list-inside space-y-1">
                          {c.strengths.slice(0, 2).map((s, i) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </td>
                    ))}
                  </tr>

                  {/* Education */}
                  <tr className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-600 bg-slate-50">Education</td>
                    {items.map(c => (
                      <td key={c.candidate_id} className="px-4 py-3 text-slate-700">
                        {c.education?.[0]?.degree || 'Not specified'}
                      </td>
                    ))}
                  </tr>

                  {/* Review Status */}
                  <tr className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-semibold text-slate-600 bg-slate-50">Review Status</td>
                    {items.map(c => (
                      <td key={c.candidate_id} className="px-4 py-3 font-bold">
                        <span className="px-2 py-1 rounded-full text-[11px] bg-slate-100 text-slate-800">
                          {c.review_status}
                        </span>
                      </td>
                    ))}
                  </tr>

                </tbody>
              </table>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};
