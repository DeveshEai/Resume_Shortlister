import React, { useEffect, useState } from 'react';
import {
  Users,
  CheckCircle2,
  AlertCircle,
  TrendingUp,
  PlusCircle,
  FileText,
  ArrowRight,
  Sparkles,
  Layers,
  Clock
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { api } from '../services/api';
import { DashboardStats, ScreeningSession } from '../types';

interface DashboardPageProps {
  onNavigate: (tab: string, sessionId?: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  'Recommended for Interview': '#10B981',
  'Needs Further Review': '#F59E0B',
  'Pending Review': '#6366F1',
  'Not Progressing': '#EF4444',
};

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const handleSeedDemo = async () => {
    try {
      setSeedingDemo(true);
      const res = await api.seedDemo();
      await fetchStats();
      onNavigate('candidates', res.session_id);
    } catch (err: any) {
      alert(err.message || 'Failed to seed demo');
    } finally {
      setSeedingDemo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Loading recruiter dashboard...</p>
        </div>
      </div>
    );
  }

  const kpis = [
    {
      label: 'Screening Sessions',
      value: stats?.total_sessions || 0,
      icon: Layers,
      color: 'text-indigo-600',
      bg: 'bg-indigo-50 border-indigo-100',
    },
    {
      label: 'Candidates Screened',
      value: stats?.total_candidates || 0,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50 border-blue-100',
    },
    {
      label: 'Recommended for Interview',
      value: stats?.recommended_count || 0,
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50 border-emerald-100',
    },
    {
      label: 'Review Needed',
      value: stats?.review_needed_count || 0,
      icon: AlertCircle,
      color: 'text-amber-600',
      bg: 'bg-amber-50 border-amber-100',
    },
    {
      label: 'Average Match Score',
      value: `${stats?.average_score.toFixed(1) || '0.0'}%`,
      icon: TrendingUp,
      color: 'text-purple-600',
      bg: 'bg-purple-50 border-purple-100',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 shadow-xl">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-400/30 text-brand-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI-Powered Talent Decision Support</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            Intelligent, Unbiased Resume Screening & Ranking
          </h2>
          <p className="text-sm text-slate-300 leading-relaxed">
            Extract candidate qualifications, analyze job description alignment with explainable scoring weights, and shortlist top talent in seconds with Groq AI.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => onNavigate('new-screening')}
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs shadow-lg shadow-brand-600/30 transition-all"
            >
              <PlusCircle className="w-4 h-4 mr-2" />
              Start New Screening
            </button>
            <button
              onClick={handleSeedDemo}
              disabled={seedingDemo}
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-xs transition-all disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 mr-2 text-brand-400" />
              {seedingDemo ? 'Loading 15 Demo Resumes...' : '1-Click Demo: 15 Sample Resumes'}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-slate-500">{kpi.label}</span>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${kpi.bg}`}>
                  <Icon className={`w-4 h-4 ${kpi.color}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900 tracking-tight">{kpi.value}</div>
            </div>
          );
        })}
      </div>

      {/* Recent Screening Sessions Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Recent Screening Sessions</h3>
            <p className="text-xs text-slate-500 mt-0.5">Manage and view candidate results from recent job roles</p>
          </div>
          <button
            onClick={() => onNavigate('history')}
            className="text-xs font-medium text-brand-600 hover:text-brand-700 flex items-center"
          >
            View all history <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </button>
        </div>

        {stats?.recent_sessions && stats.recent_sessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3">Job Title & Position</th>
                  <th className="px-6 py-3">Department</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3 text-center">Candidates</th>
                  <th className="px-6 py-3 text-center">Top Score</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.recent_sessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3.5 font-medium text-slate-900">
                      {s.job_description?.title || s.title}
                    </td>
                    <td className="px-6 py-3.5 text-slate-600">
                      {s.department || 'Not specified'}
                    </td>
                    <td className="px-6 py-3.5 text-slate-500 flex items-center space-x-1.5">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{new Date(s.created_at).toLocaleDateString()}</span>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700">
                        {s.candidate_count || 0} resumes
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          (s.highest_score || 0) >= 85
                            ? 'bg-emerald-100 text-emerald-800'
                            : (s.highest_score || 0) >= 70
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {s.highest_score ? `${s.highest_score}%` : 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right space-x-2">
                      <button
                        onClick={() => onNavigate('candidates', s.id)}
                        className="px-3 py-1 rounded-lg text-xs font-medium text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors"
                      >
                        View Candidates
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <h4 className="text-sm font-semibold text-slate-700">No screening sessions yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Create your first screening session or load our 15 pre-configured demo resumes to see the AI matching in action.
            </p>
            <button
              onClick={() => onNavigate('new-screening')}
              className="inline-flex items-center px-4 py-2 rounded-lg bg-brand-600 text-white text-xs font-medium shadow-sm hover:bg-brand-700"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
              Create First Screening
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
