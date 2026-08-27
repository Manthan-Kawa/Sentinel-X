import { useState, useEffect } from 'react';
import { Sidebar, TopBar } from '@/components/Layout';
import { NAV_ITEMS, DEFAULT_ROUTE } from '@/config/navigation';
import { WelcomePage } from '@/pages/WelcomePage';
import { DashboardPage } from '@/pages/DashboardPage';
import { EmailAnalyzerPage } from '@/pages/EmailAnalyzerPage';
import { HeaderForensicsPage } from '@/pages/HeaderForensicsPage';
import { ThreatIntelligencePage } from '@/pages/ThreatIntelligencePage';
import { OriginInvestigationPage, AttackGraphPage } from '@/pages/OriginInvestigationPage';
import { CampaignsPage } from '@/pages/CampaignsPage';
import { ReportsPage } from '@/pages/ReportsPage';
import { AlertsPage } from '@/pages/AlertsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SubmitReportPage } from '@/pages/SubmitReportPage';
import { CheckStatusPage } from '@/pages/CheckStatusPage';
import { UserRequestsPage } from '@/pages/UserRequestsPage';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AnalysisProvider, useAnalysis } from '@/contexts/AnalysisContext';
import { CampaignProvider, useCampaigns } from '@/contexts/CampaignContext';
import { EvidenceProvider, useEvidence } from '@/contexts/EvidenceContext';
import { AuthProvider, useAuth, buildUser, type UserRole } from '@/contexts/AuthContext';
import { TicketProvider } from '@/contexts/TicketContext';
import { clearAllSentinelStorage, clearEphemeralStorage, KEY_AUTH, KEY_USER, KEY_USER_ROLE } from '@/utils/storageKeys';

function getInitialRoute(role: UserRole | null): string {
  const hash = window.location.hash.replace('#/', '');
  const valid = NAV_ITEMS.some((n) => n.id === hash);
  if (valid) return hash;
  if (role === 'user') return 'submit-report';
  return 'dashboard';
}

function AppShell() {
  const { currentUser, setCurrentUser, signOut } = useAuth();
  const role = currentUser?.role ?? null;

  const [showWelcome, setShowWelcome] = useState(true);
  const [route, setRoute] = useState<string>(() => getInitialRoute(role));
  const [demoMode, setDemoMode] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!showWelcome) {
      window.location.hash = `/${route}`;
    }
  }, [route, showWelcome]);

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash.replace('#/', '');
      if (NAV_ITEMS.some((n) => n.id === hash)) {
        setShowWelcome(false);
        setDemoMode(false);
        setRoute(hash);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  /** Unified navigation handler */
  function handleNavigate(id: string, opts?: { demoMode?: boolean; role?: UserRole }) {
    setShowWelcome(false);
    setRoute(id);
    setDemoMode(opts?.demoMode ?? false);

    const effectiveRole = opts?.role || (localStorage.getItem(KEY_USER_ROLE) as UserRole) || (localStorage.getItem(KEY_USER)?.includes('user') ? 'user' : 'analyst');
    const email = localStorage.getItem(KEY_USER) || (effectiveRole === 'analyst' ? 'analyst@gmail.com' : 'demouser1@gmail.com');
    setCurrentUser(buildUser(email, effectiveRole));
  }

  // Show fullscreen welcome page first
  if (showWelcome) {
    return <WelcomePage onNavigate={handleNavigate} />;
  }

  const activeNav = NAV_ITEMS.find((n) => n.id === route);

  function renderPage() {
    switch (route) {
      case 'dashboard':
        return <DashboardPage onNavigate={handleNavigate} />;
      case 'email-analyzer':
        return (
          <EmailAnalyzerPage
            demoMode={demoMode}
            onNavigate={handleNavigate}
          />
        );
      case 'header-forensics':    return <HeaderForensicsPage onNavigate={handleNavigate} />;
      case 'threat-intelligence': return <ThreatIntelligencePage onNavigate={handleNavigate} />;
      case 'origin-investigation': return <OriginInvestigationPage onNavigate={handleNavigate} />;
      case 'attack-graph':        return <AttackGraphPage onNavigate={handleNavigate} />;
      case 'campaigns':           return <CampaignsPage onNavigate={handleNavigate} />;
      case 'reports':             return <ReportsPage onNavigate={handleNavigate} />;
      case 'alerts':              return <AlertsPage onNavigate={handleNavigate} />;
      case 'settings':            return <SettingsPage onResetCache={handleResetCache} userRole={role} />;
      case 'submit-report':       return <SubmitReportPage onNavigate={handleNavigate} />;
      case 'check-status':        return <CheckStatusPage onNavigate={handleNavigate} />;
      case 'user-requests':       return <UserRequestsPage onNavigate={handleNavigate} />;
      default:                    return role === 'user'
        ? <SubmitReportPage onNavigate={handleNavigate} />
        : <DashboardPage onNavigate={handleNavigate} />;
    }
  }

  const { clearCases, resetActiveAnalysis } = useAnalysis();
  const { clearCampaigns } = useCampaigns();
  const { clearVault } = useEvidence();

  /**
   * Logout: preserves all persistent data.
   * Only clears auth keys and ephemeral forensic-session keys.
   */
  function handleSignOut() {
    resetActiveAnalysis();
    clearEphemeralStorage();
    try { localStorage.removeItem(KEY_AUTH); } catch { /* ignore */ }
    try { localStorage.removeItem(KEY_USER); } catch { /* ignore */ }
    try { localStorage.removeItem(KEY_USER_ROLE); } catch { /* ignore */ }
    signOut();
    setShowWelcome(true);
  }

  /**
   * Reset Cache (Settings → Data): wipes EVERYTHING including persistent tier.
   */
  function handleResetCache() {
    clearCases();
    clearCampaigns();
    clearVault();
    clearAllSentinelStorage();
    window.location.reload();
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#08090e' }}>
      <Sidebar
        activeId={route}
        onNavigate={(id) => handleNavigate(id)}
        onSignOut={handleSignOut}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar
          onMenuClick={() => setMobileOpen(true)}
          activeLabel={activeNav?.label ?? 'Dashboard'}
          onNavigate={(id) => handleNavigate(id)}
        />
        <main className="flex-1 overflow-y-auto scrollbar-thin p-4 lg:p-5" style={{ background: '#08090e' }}>
          <div className="max-w-[1600px] mx-auto animate-fade-in" key={route}>
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}

import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    try {
      localStorage.removeItem(KEY_ACTIVE_CASE);
    } catch { /* ignore */ }
    window.location.hash = '#/dashboard';
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#08090e] text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mb-4 text-red-400 text-2xl">
            ⚠️
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
          <p className="text-xs text-gray-400 max-w-md mb-6 font-mono">
            {this.state.error?.message || 'An unexpected rendering error occurred.'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg transition-all"
          >
            Reload Application
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <TicketProvider>
            <AnalysisProvider>
              <EvidenceProvider>
                <CampaignProvider>
                  <AppShell />
                </CampaignProvider>
              </EvidenceProvider>
            </AnalysisProvider>
          </TicketProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
