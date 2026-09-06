import { useState, useMemo } from 'react';
import {
  Mail,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  RefreshCw,
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  Send,
  Sparkles,
  Inbox,
  Calendar,
  User,
  Shield,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useEmailIngestion } from '@/contexts/EmailIngestionContext';
import { EmailDetailDrawer } from '@/components/EmailDetailDrawer';
import { GoogleSetupModal } from '@/components/GoogleSetupModal';
import { GoogleAuthService } from '@/services/googleAuthService';
import { type IngestedEmail, type ThreatLevel, decodeMimeHeader, generateRealisticCleanScore } from '@/services/emailIngestionService';
import { useAuth } from '@/contexts/AuthContext';
import { useTickets } from '@/contexts/TicketContext';

interface EmailsPageProps {
  onNavigate: (route: string, opts?: { role?: 'analyst' | 'user' }) => void;
}

export function EmailsPage({ onNavigate }: EmailsPageProps) {
  const { currentUser } = useAuth();
  const {
    emails,
    isLoading,
    isSyncing,
    lastSyncedAt,
    selectedEmail,
    stats,
    filterState,
    isGoogleConnected,
    googleProfile,
    setFilterState,
    selectEmail,
    syncNow,
    connectGoogle,
  } = useEmailIngestion();
  const { tickets } = useTickets();

  const analyzedCaseIds = useMemo(
    () => new Set(tickets.filter((t) => t.status === 'analyzed').map((t) => t.id)),
    [tickets]
  );
  const analyzedEmailIds = useMemo(
    () => new Set(tickets.filter((t) => t.status === 'analyzed' && t.emailId).map((t) => t.emailId!)),
    [tickets]
  );

  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;
  const [syncNotice, setSyncNotice] = useState<string | null>(null);
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);

  const handleConnectGoogle = async () => {
    if (!GoogleAuthService.isConfigured()) {
      setIsGoogleModalOpen(true);
      return;
    }
    try {
      await connectGoogle();
    } catch (err: any) {
      console.error('Google connect error:', err);
      setSyncNotice(`Google connection failed: ${err?.message || 'Unknown error'}`);
      setTimeout(() => setSyncNotice(null), 5000);
    }
  };

  const handleGoogleModalSuccess = async () => {
    setIsGoogleModalOpen(false);
    try {
      await connectGoogle();
    } catch (err: any) {
      console.error('Failed to sign in after setting client ID', err);
      setSyncNotice(`Failed to authenticate with Google: ${err?.message || 'Unknown error'}`);
      setTimeout(() => setSyncNotice(null), 5000);
    }
  };

  const handleManualSync = async () => {
    setSyncNotice(null);
    try {
      const count = await syncNow();
      if (count > 0) {
        setSyncNotice(`Successfully ingested and analyzed ${count} new incoming email(s) from Gmail!`);
      } else {
        setSyncNotice('Mailbox is up to date.');
      }
      setTimeout(() => setSyncNotice(null), 5000);
    } catch (err: any) {
      console.error('Manual sync error:', err);
      setSyncNotice(`Sync notice: ${err?.message || 'Failed to sync with Gmail.'}`);
      setTimeout(() => setSyncNotice(null), 8000);
    }
  };

  // Filtered emails
  const filteredEmails = useMemo(() => {
    return emails.filter((item) => {
      // If Google account is connected, strictly exclude any old seed/mock emails
      if (isGoogleConnected && (item.id.startsWith('msg-seed-') || item.id.startsWith('msg-live-'))) {
        return false;
      }

      // Threat level filter
      if (filterState.threatLevel !== 'all') {
        if (item.analysis?.threat_level !== filterState.threatLevel) {
          return false;
        }
      }

      // Search query
      if (filterState.searchQuery.trim() !== '') {
        const q = filterState.searchQuery.toLowerCase();
        const matchSubject = item.subject.toLowerCase().includes(q);
        const matchSender = item.sender.toLowerCase().includes(q) || (item.sender_name && item.sender_name.toLowerCase().includes(q));
        const matchSnippet = item.snippet.toLowerCase().includes(q);
        const matchSummary = item.analysis?.summary.toLowerCase().includes(q);
        if (!matchSubject && !matchSender && !matchSnippet && !matchSummary) {
          return false;
        }
      }

      return true;
    });
  }, [emails, filterState]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredEmails.length / itemsPerPage) || 1;
  const paginatedEmails = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredEmails.slice(start, start + itemsPerPage);
  }, [filteredEmails, currentPage, itemsPerPage]);

  const renderRiskBadge = (level?: ThreatLevel, score?: number) => {
    const baseClasses = "w-[136px] h-7 inline-flex items-center justify-center gap-1.5 px-3 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all";
    if (level === 'malicious') {
      return (
        <span className={`${baseClasses} bg-red-500/15 text-red-400 border border-red-500/30`}>
          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
          <span>Malicious ({score ?? 90})</span>
        </span>
      );
    }
    if (level === 'suspicious') {
      return (
        <span className={`${baseClasses} bg-amber-500/15 text-amber-400 border border-amber-500/30`}>
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
          <span>Suspicious ({score ?? 50})</span>
        </span>
      );
    }
    return (
      <span className={`${baseClasses} bg-emerald-500/15 text-emerald-400 border border-emerald-500/30`}>
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        <span>Clean ({score ?? 0})</span>
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in text-white pb-16">
      {/* Top Banner & Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-1.5">
            <div className="p-2.5 rounded-2xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-500/10">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
                Automated Email Ingestion & Analysis
                <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                  Live Gemini Triage
                </span>
                {isGoogleConnected && (
                  <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Gmail Live
                  </span>
                )}
              </h1>

              {isGoogleConnected ? (
                <div className="flex items-center gap-2 flex-wrap text-xs text-gray-400 mt-1">
                  <span>Connected Account:</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-medium">
                    {googleProfile?.picture ? (
                      <img src={googleProfile.picture} alt="" className="w-3.5 h-3.5 rounded-full" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    )}
                    {googleProfile?.email || currentUser?.email}
                  </span>
                  <span className="text-gray-500">· Real-time Gemini security scoring & phishing detection</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap text-xs text-gray-400 mt-1">
                  <span>Connected Mailbox:</span>
                  <span className="text-gray-200 font-semibold">{currentUser?.email || 'user@company.corp'}</span>
                  <span className="text-gray-500">·</span>
                  <button
                    onClick={handleConnectGoogle}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-cyan-300 hover:text-cyan-200 font-medium text-[11px] transition-all"
                  >
                    <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    Connect Real Gmail
                  </button>
                  <span className="text-gray-500">· Real-time security scoring & phishing prevention</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sync Controls */}
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-[11px] text-gray-400 flex items-center gap-1.5 justify-end">
              <span className={`w-2 h-2 rounded-full ${isGoogleConnected ? 'bg-emerald-400' : 'bg-cyan-400'} animate-pulse`} />
              {isGoogleConnected ? 'Live Gmail (Auto-sync: 30s)' : 'Auto-sync: 30s'}
            </div>
            <div className="text-[10px] text-gray-500">
              Last Synced: {lastSyncedAt ? new Date(lastSyncedAt).toLocaleTimeString() : 'Never'}
            </div>
          </div>

          {!isGoogleConnected && (
            <button
              onClick={handleConnectGoogle}
              className="px-3.5 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/10 border border-white/15 hover:border-white/25 text-white text-xs font-semibold flex items-center gap-2 transition-all active:scale-95"
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              <span>Connect Gmail</span>
            </button>
          )}

          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold shadow-lg shadow-cyan-900/30 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : isGoogleConnected ? 'Sync Gmail' : 'Sync Now'}
          </button>
        </div>
      </div>

      {/* Sync Notification Banner */}
      {syncNotice && (
        <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/40 text-cyan-200 text-xs flex items-center gap-2.5 animate-slide-down">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{syncNotice}</span>
        </div>
      )}

      {/* Stat Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Scanned */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/8 hover:border-white/15 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-400">Total Scanned</span>
            <Inbox className="w-4 h-4 text-gray-400" />
          </div>
          <div className="text-2xl font-bold text-white">{stats.total}</div>
          <div className="text-[11px] text-gray-500 mt-1">Inbox messages monitored</div>
        </div>

        {/* Clean / Authentic */}
        <div className="p-4 rounded-2xl bg-emerald-950/15 border border-emerald-500/20 hover:border-emerald-500/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-emerald-400">Clean & Authentic</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-300">{stats.clean}</div>
          <div className="text-[11px] text-emerald-500 mt-1">Verified safe communications</div>
        </div>

        {/* Suspicious */}
        <div className="p-4 rounded-2xl bg-amber-950/15 border border-amber-500/20 hover:border-amber-500/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-amber-400">Suspicious Anomalies</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-300">{stats.suspicious}</div>
          <div className="text-[11px] text-amber-500 mt-1">Require user caution</div>
        </div>

        {/* Malicious */}
        <div className="p-4 rounded-2xl bg-red-950/15 border border-red-500/20 hover:border-red-500/40 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-red-400">Malicious Threats</span>
            <ShieldAlert className="w-4 h-4 text-red-400" />
          </div>
          <div className="text-2xl font-bold text-red-300">{stats.malicious}</div>
          <div className="text-[11px] text-red-500 mt-1">Phishing & fraud intercepted</div>
        </div>
      </div>

      {/* Filters and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#11121b] border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={filterState.searchQuery}
            onChange={(e) => {
              setFilterState((prev) => ({ ...prev, searchQuery: e.target.value }));
              setCurrentPage(1);
            }}
            placeholder="Search by sender, subject, or AI summary..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-gray-400 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Filter:
          </span>
          {(['all', 'malicious', 'suspicious', 'clean'] as const).map((lvl) => {
            const isActive = filterState.threatLevel === lvl;
            return (
              <button
                key={lvl}
                onClick={() => {
                  setFilterState((prev) => ({ ...prev, threatLevel: lvl }));
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                  isActive
                    ? lvl === 'malicious'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
                      : lvl === 'suspicious'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                      : lvl === 'clean'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                      : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'bg-white/[0.03] text-gray-400 hover:text-white border border-white/5'
                }`}
              >
                {lvl === 'all' ? 'All Emails' : lvl}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Paginated Data Table */}
      <div className="rounded-2xl border border-white/10 bg-[#11121b] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-gray-400 uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 w-44 whitespace-nowrap">Status / Risk</th>
                <th className="py-3.5 px-4 w-60">Sender</th>
                <th className="py-3.5 px-4">Subject</th>
                <th className="py-3.5 px-4 w-36">Received</th>
                <th className="py-3.5 px-4 w-28 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
                      <span>Ingesting email feed and running Gemini security triage...</span>
                    </div>
                  </td>
                </tr>
              ) : paginatedEmails.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Inbox className="w-8 h-8 text-gray-500" />
                      <span>
                        {isGoogleConnected
                          ? 'No live Gmail messages loaded yet. Click "Sync Gmail" above to fetch and triage your real inbox.'
                          : 'No emails match your current filter criteria.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedEmails.map((email) => {
                  const level = email.analysis?.threat_level || 'clean';
                  const rawScore = email.analysis?.threat_score;
                  const displayScore = (rawScore === 5 || rawScore === undefined) && level === 'clean'
                    ? generateRealisticCleanScore(`${email.id}:${email.sender}:${email.subject}`)
                    : (rawScore ?? 5);
                  const isRevertedBack =
                    email.analysis?.escalation_completed ||
                    (email.analysis?.soc_case_id && analyzedCaseIds.has(email.analysis.soc_case_id)) ||
                    analyzedEmailIds.has(email.id);
                  const showSocEscalated = email.analysis?.escalated_to_soc && !isRevertedBack;

                  return (
                    <tr
                      key={email.id}
                      onClick={() => selectEmail(email)}
                      className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                    >
                      {/* Risk Badge */}
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <div className="flex flex-col items-center justify-center gap-1 w-[136px]">
                          {renderRiskBadge(level, displayScore)}
                          {showSocEscalated && (
                            <span className="inline-flex items-center justify-center gap-1.5 text-[10.5px] leading-none text-purple-300 font-medium whitespace-nowrap tracking-wide">
                              <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse shrink-0" />
                              <span className="leading-none">SOC Escalated</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Sender */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="space-y-0.5 max-w-[220px]">
                          <div className="font-semibold text-white group-hover:text-cyan-300 transition-colors truncate text-xs">
                            {decodeMimeHeader(email.sender_name || email.sender)}
                          </div>
                          <div className="text-[11px] text-gray-400 truncate">
                            {email.sender}
                          </div>
                        </div>
                      </td>

                      {/* Subject & Preview */}
                      <td className="py-3.5 px-4 align-middle">
                        <div className="space-y-0.5 pr-4">
                          <div className="font-medium text-white group-hover:text-cyan-200 transition-colors line-clamp-1 text-xs">
                            {decodeMimeHeader(email.subject)}
                          </div>
                          {email.snippet && (
                            <div className="text-[11px] text-gray-400 line-clamp-1">
                              {decodeMimeHeader(email.snippet)}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-3.5 px-4 align-middle text-gray-400 text-[11px] whitespace-nowrap">
                        {new Date(email.received_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 align-middle text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              selectEmail(email);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/20 text-xs flex items-center gap-1.5 font-medium transition-all"
                            title="Inspect Details & Deep Forensics"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-white/10 flex items-center justify-between text-xs text-gray-400 bg-white/[0.01]">
          <div>
            Showing{' '}
            <span className="text-white font-semibold">
              {filteredEmails.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}
            </span>{' '}
            to{' '}
            <span className="text-white font-semibold">
              {Math.min(currentPage * itemsPerPage, filteredEmails.length)}
            </span>{' '}
            of <span className="text-white font-semibold">{filteredEmails.length}</span> emails
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs px-2">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Side Detail Drawer */}
      <EmailDetailDrawer
        email={selectedEmail}
        isOpen={Boolean(selectedEmail)}
        onClose={() => selectEmail(null)}
        onNavigate={onNavigate}
      />

      {/* Google OAuth 2.0 Setup Modal */}
      <GoogleSetupModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        onSuccessConnect={handleGoogleModalSuccess}
      />
    </div>
  );
}
