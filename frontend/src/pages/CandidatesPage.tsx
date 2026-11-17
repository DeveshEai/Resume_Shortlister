import React, { useState, useEffect } from 'react';
import {
  Users,
  Search,
  Filter,
  ArrowUpDown,
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  Sparkles,
  Download,
  PlusCircle,
  RefreshCw
} from 'lucide-react';
import { api } from '../services/api';
import { CandidateRankingItem, ScreeningSession } from '../types';
import { CandidateDetailModal } from '../components/CandidateDetailModal';
import { CandidateComparisonModal } from '../components/CandidateComparisonModal';

interface CandidatesPageProps {
  selectedSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNavigate: (tab: string, sessionId?: string) => void;
}

export const CandidatesPage: React.FC<CandidatesPageProps> = ({
  selectedSessionId,
  onSelectSession,
  onNavigate
}) => {
  const [sessions, setSessions] = useState<ScreeningSession[]>([]);
  const [activeSession, setActiveSession] = useState<ScreeningSession | null>(null);
  const [candidates, setCandidates] = useState<CandidateRankingItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Sorting
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBand, setFilterBand] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('highest_score');

  // Modals & Selection
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Fetch all sessions to populate selector
  useEffect(() => {
    api.getSessions()
      .then(data => {
        setSessions(data);
        if (!selectedSessionId && data.length > 0) {
          onSelectSession(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch candidates whenever active session, filter or sort changes
  const fetchRankings = async (sessionId: string) => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getRankings(sessionId, sortBy, filterBand);
      setCandidates(data);
      const current = sessions.find(s => s.id === sessionId);
      if (current) setActiveSession(current);
    } catch (err: any) {
      setError(err.message || 'Failed to load candidates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSessionId) {
      fetchRankings(selectedSessionId);
    }
  }, [selectedSessionId, filterBand, sortBy]);

  // Handle status update directly in table
  const handleStatusChange = async (candidateId: string, newStatus: string) => {
    try {
      await api.updateCandidateStatus(candidateId, newStatus);
      if (selectedSessionId) fetchRankings(selectedSessionId);
    } catch (err: any) {
      alert(err.message || 'Failed to update candidate status');
    }
  };

  // Checkbox toggle for comparison
  const toggleSelectCandidate = (candidateId: string) => {
    if (selectedForCompare.includes(candidateId)) {
      setSelectedForCompare(selectedForCompare.filter(id => id !== candidateId));
    } else {
      if (selectedForCompare.length >= 5) {
        alert('You can compare a maximum of 5 candidates simultaneously.');
        return;
      }
      setSelectedForCompare([...selectedForCompare, candidateId]);
    }
  };

  // Filter candidates by search query locally
  const filteredCandidates = candidates.filter(c =>
    c.candidate_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.original_filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Top Session Selector Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Active Screening Session
            </span>
            <div className="flex items-center space-x-2">
              <select
                value={selectedSessionId || ''}
                onChange={(e) => onSelectSession(e.target.value)}
                className="font-bold text-slate-900 text-sm bg-transparent border-none p-0 focus:ring-0 cursor-pointer"
              >
                {sessions.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.job_description?.title || s.title} ({s.candidate_count || 0} candidates)
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {selectedForCompare.length >= 2 ? (
            <button
              onClick={() => setShowCompareModal(true)}
              className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              Compare Selected ({selectedForCompare.length})
            </button>
          ) : selectedForCompare.length === 1 ? (
            <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
              Select 1 more to compare
            </span>
          ) : null}

          {selectedSessionId && (
            <button
              onClick={() => onNavigate('reports', selectedSessionId)}
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              <Download className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Export Reports
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search candidate name or file..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>

        {/* Filter Bands */}
        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
          <span className="text-slate-400 text-[11px] font-semibold mr-1 flex items-center">
            <Filter className="w-3 h-3 mr-1" />
            Band:
          </span>
          {[
            { id: 'all', label: 'All Candidates' },
            { id: 'Strong Match', label: 'Strong (85%+)' },
            { id: 'Good Potential', label: 'Good (70-84%)' },
            { id: 'Partial Match', label: 'Partial (55-69%)' },
            { id: 'Needs Review', label: 'Review (<55%)' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterBand(f.id)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filterBand === f.id
                  ? 'bg-brand-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Sorting Dropdown */}
        <div className="flex items-center space-x-1.5 text-xs">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-2.5 py-1 text-xs rounded-lg border border-slate-300 bg-white font-medium focus:ring-1 focus:ring-brand-500 cursor-pointer"
          >
            <option value="highest_score">Sort: Highest Match Score</option>
            <option value="lowest_score">Sort: Lowest Match Score</option>
            <option value="relevant_experience">Sort: Relevant Experience</option>
            <option value="skills_match">Sort: Skills Match %</option>
          </select>
        </div>
      </div>

      {/* Candidate Ranking Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-8 h-8 text-brand-600 animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">Loading candidate rankings...</p>
          </div>
        ) : filteredCandidates.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3 text-center w-10">Select</th>
                  <th className="px-4 py-3 text-center w-12">Rank</th>
                  <th className="px-4 py-3">Candidate Profile</th>
                  <th className="px-4 py-3 text-center">Match Score</th>
                  <th className="px-4 py-3">Skills Coverage</th>
                  <th className="px-4 py-3 text-center">Relevant Exp</th>
                  <th className="px-4 py-3">Review Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCandidates.map((c) => {
                  const isChecked = selectedForCompare.includes(c.candidate_id);
                  return (
                    <tr
                      key={c.candidate_id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isChecked ? 'bg-indigo-50/30' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-4 py-3.5 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectCandidate(c.candidate_id)}
                          className="rounded border-slate-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                        />
                      </td>

                      {/* Rank */}
                      <td className="px-4 py-3.5 text-center font-bold text-slate-700">
                        #{c.rank}
                      </td>

                      {/* Name & File */}
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                          <span>{c.candidate_name}</span>
                          {c.is_ai_generated && (
                            <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-200 font-normal">
                              AI Evaluated
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center space-x-1 truncate max-w-xs">
                          <FileText className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate">{c.original_filename}</span>
                        </div>
                      </td>

                      {/* Score Badge */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="inline-flex flex-col items-center">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                              c.overall_score >= 85
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                : c.overall_score >= 70
                                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                : c.overall_score >= 55
                                ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                : 'bg-red-100 text-red-800 border border-red-200'
                            }`}
                          >
                            {c.overall_score.toFixed(1)}%
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5 font-medium">
                            {c.overall_score >= 85
                              ? 'Strong Match'
                              : c.overall_score >= 70
                              ? 'Good Potential'
                              : c.overall_score >= 55
                              ? 'Partial Match'
                              : 'Lower Match'}
                          </span>
                        </div>
                      </td>

                      {/* Skills Coverage Bar */}
                      <td className="px-4 py-3.5 w-44">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-medium text-slate-600">Req: {c.required_skills_coverage.toFixed(0)}%</span>
                          <span className="text-slate-400">Pref: {c.preferred_skills_coverage.toFixed(0)}%</span>
                        </div>
                        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-brand-600 h-1.5 rounded-full"
                            style={{ width: `${c.required_skills_coverage}%` }}
                          />
                        </div>
                      </td>

                      {/* Relevant Experience */}
                      <td className="px-4 py-3.5 text-center font-medium text-slate-700">
                        <div>{c.relevant_experience_years.toFixed(1)} yrs</div>
                        <span className="text-[10px] text-slate-400">Total: {c.total_experience_years.toFixed(1)}y</span>
                      </td>

                      {/* Review Status Selector */}
                      <td className="px-4 py-3.5">
                        <select
                          value={c.review_status}
                          onChange={(e) => handleStatusChange(c.candidate_id, e.target.value)}
                          className={`text-xs font-semibold px-2 py-1 rounded-lg border focus:ring-1 focus:ring-brand-500 cursor-pointer ${
                            c.review_status === 'Recommended for Interview'
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : c.review_status === 'Needs Further Review'
                              ? 'bg-amber-50 text-amber-800 border-amber-300'
                              : c.review_status === 'Not Progressing'
                              ? 'bg-red-50 text-red-800 border-red-300'
                              : 'bg-slate-50 text-slate-700 border-slate-300'
                          }`}
                        >
                          <option value="Pending Review">Pending Review</option>
                          <option value="Recommended for Interview">Recommended for Interview</option>
                          <option value="Needs Further Review">Needs Further Review</option>
                          <option value="Not Progressing">Not Progressing</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => setSelectedCandidateId(c.candidate_id)}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors"
                        >
                          View Profile
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-xs text-slate-500">
            No candidates matched the selected filters.
          </div>
        )}
      </div>

      {/* Candidate Profile Modal */}
      {selectedCandidateId && (
        <CandidateDetailModal
          candidateId={selectedCandidateId}
          onClose={() => setSelectedCandidateId(null)}
          onStatusUpdated={() => selectedSessionId && fetchRankings(selectedSessionId)}
        />
      )}

      {/* Candidate Comparison Modal */}
      {showCompareModal && selectedSessionId && (
        <CandidateComparisonModal
          sessionId={selectedSessionId}
          candidateIds={selectedForCompare}
          onClose={() => setShowCompareModal(false)}
        />
      )}
    </div>
  );
};
