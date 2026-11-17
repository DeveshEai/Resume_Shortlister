import React, { useState } from 'react';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { NewScreeningPage } from './pages/NewScreeningPage';
import { CandidatesPage } from './pages/CandidatesPage';
import { ScreeningHistoryPage } from './pages/ScreeningHistoryPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const handleNavigate = (tab: string, sessionId?: string) => {
    if (sessionId) {
      setSelectedSessionId(sessionId);
    }
    setCurrentTab(tab);
  };

  const handleScreeningComplete = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setCurrentTab('candidates');
  };

  return (
    <AppLayout
      currentTab={currentTab}
      setCurrentTab={setCurrentTab}
      selectedSessionId={selectedSessionId}
      setSelectedSessionId={setSelectedSessionId}
    >
      {currentTab === 'dashboard' && (
        <DashboardPage onNavigate={handleNavigate} />
      )}
      {currentTab === 'new-screening' && (
        <NewScreeningPage onScreeningComplete={handleScreeningComplete} />
      )}
      {currentTab === 'candidates' && (
        <CandidatesPage
          selectedSessionId={selectedSessionId}
          onSelectSession={setSelectedSessionId}
          onNavigate={handleNavigate}
        />
      )}
      {currentTab === 'history' && (
        <ScreeningHistoryPage
          onSelectSession={setSelectedSessionId}
          onNavigate={handleNavigate}
        />
      )}
      {currentTab === 'reports' && (
        <ReportsPage
          selectedSessionId={selectedSessionId}
          onSelectSession={setSelectedSessionId}
        />
      )}
      {currentTab === 'settings' && (
        <SettingsPage />
      )}
    </AppLayout>
  );
}

export default App;
