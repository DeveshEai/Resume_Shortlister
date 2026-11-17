import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Clock,
  Users,
  Trash2,
  ExternalLink,
  Download,
  AlertTriangle,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { ScreeningSession } from '../types';

interface ScreeningHistoryPageProps {
  onSelectSession: (id: string) => void;
  onNavigate: (tab: string, sessionId?: string) => void;
}

export const ScreeningHistoryPage: React.FC<ScreeningHistoryPageProps> = ({
  onSelectSession,
  onNavigate
}) => {
  const [sessions, setSessions] = useState<ScreeningSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      const data = await api.getSessions();
      setSessions(data);
    } catch (err: any) {
      alert(err.message || 'Failed to load screening history');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!window.confirm(`Are you sure you want to delete "${title}" and all its screened candidate records?`)) {
      return;
    }
    try {
      setDeletingId(id);
      await api.deleteSession(id);
      await fetchSessions();
    } catch (err: any) {
      alert(err.message || 'Failed to delete session');
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = sessions.filter(s =>
    (s.job_description?.title || s.title).toLowerCase().includes(search.toLowerCase()) ||
    (s.department || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Screening History & Saved Sessions</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            All screening runs, scores, and recruiter statuses persist indefinitely in SQLite / PostgreSQL.
          </p>
        </div>
        <div className="relative w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search saved job positions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500"
          />
        </div>
      </div>

      {/* History Grid */}
      {loading ? (
        <div className="flex items-center justify-center p-12">
          <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <div
              key={s.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm line-clamp-1">
                      {s.job_description?.title || s.title}
                    </h3>
                    <span className="text-xs text-slate-500 block mt-0.5">
                      {s.department || 'General Department'}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    (s.highest_score || 0) >= 85
                      ? 'bg-emerald-100 text-emerald-800'
                      : (s.highest_score || 0) >= 70
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    Top: {s.highest_score ? `${s.highest_score}%` : 'N/A'}
                  </span>
                </div>

                <div className="flex items-center space-x-4 text-xs text-slate-600 pt-1">
                  <span className="flex items-center">
                    <Users className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {s.candidate_count || 0} Candidates
                  </span>
                  <span className="flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {new Date(s.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleDelete(s.id, s.job_description?.title || s.title)}
                  disabled={deletingId === s.id}
                  className="text-xs text-slate-400 hover:text-red-600 p-1 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="space-x-2">
                  <button
                    onClick={() => onNavigate('reports', s.id)}
                    className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Reports
                  </button>
                  <button
                    onClick={() => {
                      onSelectSession(s.id);
                      onNavigate('candidates', s.id);
                    }}
                    className="px-3 py-1 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-colors"
                  >
                    Open Session
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500">
          No saved screening sessions found.
        </div>
      )}
    </div>
  );
};
