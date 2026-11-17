import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  History,
  Users,
  FileBarChart,
  Settings,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Cpu
} from 'lucide-react';
import { api } from '../services/api';
import { SystemSettings } from '../types';

interface AppLayoutProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  selectedSessionId: string | null;
  setSelectedSessionId: (id: string | null) => void;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  currentTab,
  setCurrentTab,
  selectedSessionId,
  setSelectedSessionId,
  children
}) => {
  const [settingsData, setSettingsData] = useState<SystemSettings | null>(null);

  useEffect(() => {
    api.getSettings()
      .then(setSettingsData)
      .catch(() => {});
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'new-screening', label: 'New Screening', icon: PlusCircle },
    { id: 'history', label: 'Screening History', icon: History },
    { id: 'candidates', label: 'Candidates', icon: Users },
    { id: 'reports', label: 'Reports', icon: FileBarChart },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col z-20 select-none">
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-violet-500 flex items-center justify-center shadow-lg shadow-brand-500/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-white tracking-tight text-lg">Shortlist<span className="text-brand-400">AI</span></span>
              <span className="block text-[10px] uppercase font-semibold tracking-wider text-slate-400">Talent Screening</span>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                }`}
              >
                <Icon className={`w-4 h-4 mr-3 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Responsible AI & Provider Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="flex items-center">
              <Cpu className="w-3.5 h-3.5 mr-1.5 text-brand-400" />
              Engine:
            </span>
            <span className="font-mono text-emerald-400 font-semibold text-[11px] bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/50">
              {settingsData?.ai_provider === 'groq' ? 'Groq AI' : 'Rule-Based'}
            </span>
          </div>
          <div className="flex items-center text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            <span>Unbiased & Protected AI</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200/80 flex items-center justify-between px-8 z-10 shadow-sm">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Recruiter Portal</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <h1 className="text-base font-semibold text-slate-900 capitalize">
              {currentTab.replace('-', ' ')}
            </h1>
          </div>

          <div className="flex items-center space-x-3">
            {selectedSessionId && (
              <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200 font-medium">
                Active Session Loaded
              </span>
            )}
            <button
              onClick={() => setCurrentTab('new-screening')}
              className="inline-flex items-center px-3.5 py-1.5 rounded-lg text-xs font-medium text-white bg-brand-600 hover:bg-brand-700 shadow-sm transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1.5" />
              New Screening
            </button>
          </div>
        </header>

        {/* Page Content Container */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
