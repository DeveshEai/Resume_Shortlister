import React, { useState, useEffect } from 'react';
import {
  FileBarChart,
  FileText,
  FileSpreadsheet,
  Download,
  Users,
  CheckCircle2,
  Calendar,
  Layers,
  ChevronDown
} from 'lucide-react';
import { api } from '../services/api';
import { ScreeningSession } from '../types';

interface ReportsPageProps {
  selectedSessionId: string | null;
  onSelectSession: (id: string) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  selectedSessionId,
  onSelectSession
}) => {
  const [sessions, setSessions] = useState<ScreeningSession[]>([]);
  const [activeSession, setActiveSession] = useState<ScreeningSession | null>(null);

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

  useEffect(() => {
    if (selectedSessionId) {
      api.getSession(selectedSessionId)
        .then(setActiveSession)
        .catch(() => {});
    }
  }, [selectedSessionId]);

  return (
    <div className="space-y-6">
      {/* Header & Session Selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Screening Reports & Data Export</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Export decision-support documentation in professional PDF, Excel (.xlsx), or CSV format.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <label className="text-xs font-semibold text-slate-500">Position:</label>
          <div className="relative">
            <select
              value={selectedSessionId || ''}
              onChange={(e) => onSelectSession(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-brand-500 pr-8 cursor-pointer"
            >
              {sessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.job_description?.title || s.title}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>
      </div>

      {activeSession ? (
        <div className="space-y-6">
          {/* Active Position Summary Card */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase tracking-wider font-semibold text-brand-400">
                Selected Screening Session
              </span>
              <h3 className="text-xl font-bold mt-1">
                {activeSession.job_description?.title || activeSession.title}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Department: {activeSession.department || 'General'} • Date: {new Date(activeSession.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex items-center space-x-6 text-center">
              <div>
                <span className="text-2xl font-extrabold text-white">{activeSession.candidate_count || 0}</span>
                <span className="block text-[11px] text-slate-400">Total Resumes</span>
              </div>
              <div className="h-8 w-px bg-slate-800" />
              <div>
                <span className="text-2xl font-extrabold text-emerald-400">
                  {activeSession.highest_score ? `${activeSession.highest_score}%` : 'N/A'}
                </span>
                <span className="block text-[11px] text-slate-400">Top Match Score</span>
              </div>
            </div>
          </div>

          {/* Export Formats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* PDF Report Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Executive PDF Report</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Formatted formal report with session overview, candidate rankings table, detailed score breakdown, strengths, and suggested interview questions.
                  </p>
                </div>
                <div className="text-[11px] text-slate-400 space-y-1 pt-2">
                  <div>• Executive summary table</div>
                  <div>• Top candidate profiles</div>
                  <div>• Recruiter notes & status</div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100">
                <a
                  href={api.getReportDownloadUrl(activeSession.id, 'pdf')}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-xs shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF Report
                </a>
              </div>
            </div>

            {/* Excel (.xlsx) Report Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Excel Spreadsheet (.xlsx)</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Multi-tab workbook containing Candidate Rankings, full Skills Matrix with matched/missing markers, experience years, and candidate scores.
                  </p>
                </div>
                <div className="text-[11px] text-slate-400 space-y-1 pt-2">
                  <div>• Tab 1: Candidate Rankings & Scores</div>
                  <div>• Tab 2: Skills Matching Matrix</div>
                  <div>• Color-highlighted score bands</div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100">
                <a
                  href={api.getReportDownloadUrl(activeSession.id, 'excel')}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download Excel Workbook
                </a>
              </div>
            </div>

            {/* CSV Export Card */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                  <FileBarChart className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">Raw CSV Export</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Lightweight comma-separated data file for importing scores, skills coverage, and review statuses into external HRIS or ATS systems.
                  </p>
                </div>
                <div className="text-[11px] text-slate-400 space-y-1 pt-2">
                  <div>• Ranks, scores & bands</div>
                  <div>• Relevant & total experience</div>
                  <div>• Recruiter notes and statuses</div>
                </div>
              </div>

              <div className="pt-6 mt-6 border-t border-slate-100">
                <a
                  href={api.getReportDownloadUrl(activeSession.id, 'csv')}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs shadow-sm transition-colors"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download CSV File
                </a>
              </div>
            </div>

          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-xs text-slate-500">
          No screening sessions found to export. Please run a screening first.
        </div>
      )}
    </div>
  );
};
