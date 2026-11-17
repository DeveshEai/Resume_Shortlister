import React, { useState, useEffect } from 'react';
import {
  Settings,
  Cpu,
  Key,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Lock,
  Sliders,
  Database
} from 'lucide-react';
import { api } from '../services/api';
import { SystemSettings } from '../types';

export const SettingsPage: React.FC = () => {
  const [settingsData, setSettingsData] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states
  const [aiProvider, setAiProvider] = useState('groq');
  const [groqApiKey, setGroqApiKey] = useState('');
  const [groqModel, setGroqModel] = useState('openai/gpt-oss-120b');
  const [maxUploadMb, setMaxUploadMb] = useState(10);

  // Connection Test
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await api.getSettings();
      setSettingsData(data);
      setAiProvider(data.ai_provider);
      setGroqModel(data.groq_model);
      setMaxUploadMb(data.max_upload_size_mb);
    } catch (err: any) {
      alert(err.message || 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await api.testConnection();
      setTestResult({ success: res.success, message: res.message });
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection test failed' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const updatePayload: any = {
        ai_provider: aiProvider,
        groq_model: groqModel,
        max_upload_size_mb: maxUploadMb
      };
      if (groqApiKey.trim()) {
        updatePayload.groq_api_key = groqApiKey.trim();
      }
      const updated = await api.updateSettings(updatePayload);
      setSettingsData(updated);
      setGroqApiKey('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (err: any) {
      alert(err.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-900">System & AI Provider Configuration</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Manage Groq AI models, security credentials, modular provider adapters, and upload restrictions.
        </p>
      </div>

      {/* AI Provider Architecture Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2.5">
            <Cpu className="w-4 h-4 text-brand-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Modular AI Provider Architecture
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            Groq Active
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Groq Card */}
          <div
            onClick={() => setAiProvider('groq')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              aiProvider === 'groq'
                ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900 text-xs">Groq API</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Ultra-fast inference provider. Powers structured JSON resume analysis and qualification matching.
            </p>
          </div>

          {/* Gemini Card (Modular Future Provider) */}
          <div
            className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 opacity-70 cursor-not-allowed"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-700 text-xs">Google Gemini</span>
              <span className="text-[10px] font-bold uppercase text-slate-600 bg-slate-200 px-1.5 py-0.5 rounded">
                Coming Soon
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Modular adapter prepared. Switchable in future updates without code modification.
            </p>
          </div>

          {/* Rule-Based Fallback Card */}
          <div
            onClick={() => setAiProvider('rule_based')}
            className={`p-4 rounded-xl border cursor-pointer transition-all ${
              aiProvider === 'rule_based'
                ? 'border-brand-600 bg-brand-50/50 ring-2 ring-brand-500/20'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-slate-900 text-xs">Rule-Based Mode</span>
              <span className="w-2 h-2 rounded-full bg-blue-500" />
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              100% offline heuristic parser. Used automatically if API keys are absent or rate limits are reached.
            </p>
          </div>
        </div>

        {/* Groq Details */}
        {aiProvider === 'groq' && (
          <div className="pt-4 border-t border-slate-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Active Groq Model
                </label>
                <select
                  value={groqModel}
                  onChange={(e) => setGroqModel(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:ring-1 focus:ring-brand-500 cursor-pointer"
                >
                  <option value="openai/gpt-oss-120b">openai/gpt-oss-120b (Recommended - High Accuracy)</option>
                  <option value="openai/gpt-oss-20b">openai/gpt-oss-20b (Ultra Fast Inference)</option>
                  <option value="qwen/qwen3.8-27b">qwen/qwen3.8-27b (High Capacity)</option>
                  <option value="allam-2-7b">allam-2-7b (Fast Lightweight)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Groq API Key {settingsData?.groq_api_key_configured && (
                    <span className="text-[11px] text-emerald-600 font-normal">
                      (Configured: {settingsData.groq_api_key_masked})
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Key className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="password"
                    placeholder="Enter new key to update (leave blank to keep current)"
                    value={groqApiKey}
                    onChange={(e) => setGroqApiKey(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-brand-500 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Test Connection Button & Indicator */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={handleTestConnection}
                disabled={testingConnection}
                className="inline-flex items-center px-3.5 py-1.5 rounded-lg border border-slate-300 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${testingConnection ? 'animate-spin' : ''}`} />
                {testingConnection ? 'Testing Connection...' : 'Test Connection'}
              </button>

              {testResult && (
                <div className={`text-xs flex items-center space-x-1.5 ${
                  testResult.success ? 'text-emerald-700 font-semibold' : 'text-red-700'
                }`}>
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-red-600" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Upload & Storage Limits */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center">
          <Database className="w-4 h-4 mr-2 text-brand-600" />
          File Upload & Storage Governance
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Maximum Resume PDF Size (MB)
            </label>
            <input
              type="number"
              min={1}
              max={50}
              value={maxUploadMb}
              onChange={(e) => setMaxUploadMb(parseInt(e.target.value) || 10)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Duplicate Detection
            </label>
            <div className="px-3 py-2 text-xs rounded-lg bg-slate-50 border border-slate-200 text-slate-600">
              Enabled (SHA-256 Content Hashing)
            </div>
          </div>
        </div>
      </div>

      {/* Save Settings Action Bar */}
      <div className="flex items-center justify-between pt-2">
        {saveSuccess ? (
          <span className="text-xs font-semibold text-emerald-600 flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            Settings saved successfully!
          </span>
        ) : <span />}

        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="inline-flex items-center px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4 mr-1.5" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};
