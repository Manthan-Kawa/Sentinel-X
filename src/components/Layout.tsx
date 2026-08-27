import {
  Menu,
  X,
  Bell,
  Search,
  LogOut,
  Settings,
  LayoutDashboard,
  MailSearch,
  FileSearch,
  Globe2,
  MapPin,
  Share2,
  Network,
  FileText,
  Lock,
  ArrowRight,
  Upload,
  ClipboardList,
  Inbox,
} from 'lucide-react';
import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { getNavItemsForRole, type NavRole } from '@/config/navigation';
import type { LucideIcon } from 'lucide-react';
import { TransparentLogo } from '@/components/TransparentLogo';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTickets } from '@/contexts/TicketContext';
import { resultToAlert } from '@/utils/alertUtils';
import { SECURITY_ALERTS, type SecurityAlert } from '@/data/mockData';

interface SearchableItem {
  id: string;
  title: string;
  category: 'Page' | 'Forensic Tool' | 'Telemetry' | 'Module';
  route: string;
  description: string;
  keywords: string[];
  icon: LucideIcon;
  badgeColor: string;
  roles: NavRole[];
}

const SEARCHABLE_ITEMS: SearchableItem[] = [
  {
    id: 'dashboard',
    title: 'Dashboard',
    category: 'Page',
    route: 'dashboard',
    description: 'Threat Operations Center, real-time KPI metrics & threat activity chart',
    keywords: ['dashboard', 'home', 'overview', 'kpi', 'metrics', 'threat activity', 'attack surface', 'live monitoring', 'stats'],
    icon: LayoutDashboard,
    badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    roles: ['analyst'],
  },
  {
    id: 'email-analyzer',
    title: 'Email Analyzer',
    category: 'Forensic Tool',
    route: 'email-analyzer',
    description: 'AI-assisted email analysis, raw EML parser, BEC & phishing detection',
    keywords: ['email analyzer', 'analyzer', 'eml', 'upload', 'paste', 'bec', 'phishing', 'spoofing', 'new analysis', 'scan email'],
    icon: MailSearch,
    badgeColor: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    roles: ['analyst'],
  },
  {
    id: 'header-forensics',
    title: 'Header Forensics',
    category: 'Forensic Tool',
    route: 'header-forensics',
    description: 'SMTP relay hops, RFC-5322 header inspection & SPF/DKIM/DMARC auth',
    keywords: ['header forensics', 'headers', 'smtp', 'relay', 'hops', 'spf', 'dkim', 'dmarc', 'received', 'authentication'],
    icon: FileSearch,
    badgeColor: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    roles: ['analyst'],
  },
  {
    id: 'threat-intelligence',
    title: 'Threat Intelligence',
    category: 'Telemetry',
    route: 'threat-intelligence',
    description: 'IP & domain reputation lookup, WHOIS records, DNS & homoglyph analysis',
    keywords: ['threat intelligence', 'intel', 'ip lookup', 'domain reputation', 'whois', 'dns', 'homoglyph', 'lookalike', 'ioc', 'reputation'],
    icon: Globe2,
    badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    roles: ['analyst'],
  },
  {
    id: 'origin-investigation',
    title: 'Origin Investigation',
    category: 'Telemetry',
    route: 'origin-investigation',
    description: 'Interactive global geolocation map, infrastructure nodes & originating IP trace',
    keywords: ['origin investigation', 'origin', 'geo', 'geolocation', 'map', 'infrastructure', 'ip location', 'trace', 'sending ip'],
    icon: MapPin,
    badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    roles: ['analyst'],
  },
  {
    id: 'attack-graph',
    title: 'Attack Graph',
    category: 'Forensic Tool',
    route: 'attack-graph',
    description: 'Interactive visual graph correlating emails, senders, domains, hashes & IPs',
    keywords: ['attack graph', 'graph', 'nodes', 'visualizer', 'correlations', 'flow', 'links', 'infrastructure graph'],
    icon: Share2,
    badgeColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/30',
    roles: ['analyst'],
  },
  {
    id: 'campaigns',
    title: 'Campaign Intelligence',
    category: 'Module',
    route: 'campaigns',
    description: 'Correlated threat clusters, multi-vector campaign tracking & attack grouping',
    keywords: ['campaigns', 'campaign intelligence', 'clusters', 'threat cluster', 'create campaign', 'active clusters'],
    icon: Network,
    badgeColor: 'text-pink-400 bg-pink-500/10 border-pink-500/30',
    roles: ['analyst'],
  },
  {
    id: 'reports',
    title: 'Forensic Reports & Export',
    category: 'Module',
    route: 'reports',
    description: 'Executive & technical dossiers, PDF export, printable incident records',
    keywords: ['reports', 'forensic reports', 'pdf export', 'export', 'dossier', 'download', 'print report', 'summary report'],
    icon: FileText,
    badgeColor: 'text-teal-400 bg-teal-500/10 border-teal-500/30',
    roles: ['analyst'],
  },
  {
    id: 'alerts',
    title: 'Security Alerts',
    category: 'Module',
    route: 'alerts',
    description: 'Real-time threat detection feed, SOC triage queue & alert status management',
    keywords: ['alerts', 'security alerts', 'notifications', 'soc triage', 'feed', 'new alerts', 'severity queue'],
    icon: Bell,
    badgeColor: 'text-red-400 bg-red-500/10 border-red-500/30',
    roles: ['analyst'],
  },
  {
    id: 'user-requests',
    title: 'User Requests',
    category: 'Module',
    route: 'user-requests',
    description: 'Review user-submitted report tickets, respond with investigation results',
    keywords: ['user requests', 'tickets', 'submissions', 'pending', 'review', 'respond'],
    icon: Inbox,
    badgeColor: 'text-violet-400 bg-violet-500/10 border-violet-500/30',
    roles: ['analyst'],
  },
  {
    id: 'submit-report',
    title: 'Submit Report',
    category: 'Page',
    route: 'submit-report',
    description: 'Upload a suspicious .eml file and submit it for analyst review',
    keywords: ['submit', 'report', 'upload', 'eml', 'ticket', 'suspicious email'],
    icon: Upload,
    badgeColor: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    roles: ['user'],
  },
  {
    id: 'check-status',
    title: 'Check Status',
    category: 'Page',
    route: 'check-status',
    description: 'View the status of your submitted report tickets and analyst responses',
    keywords: ['check status', 'status', 'pending', 'analyzed', 'response', 'my tickets'],
    icon: ClipboardList,
    badgeColor: 'text-green-400 bg-green-500/10 border-green-500/30',
    roles: ['user'],
  },
  {
    id: 'settings',
    title: 'Settings & Configuration',
    category: 'Page',
    route: 'settings',
    description: 'API keys, AI model preferences, detection engine & dark theme configuration',
    keywords: ['settings', 'config', 'api key', 'claude', 'gemini', 'engine', 'theme', 'model'],
    icon: Settings,
    badgeColor: 'text-gray-400 bg-gray-500/10 border-gray-500/30',
    roles: ['analyst', 'user'],
  },
];

interface SidebarProps {
  activeId: string;
  onNavigate: (id: string) => void;
  onSignOut: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export function Sidebar({ activeId, onNavigate, onSignOut, mobileOpen, onMobileClose }: SidebarProps) {
  const { currentUser } = useAuth();
  const { tickets } = useTickets();
  const role = currentUser?.role ?? 'analyst';

  const navList = getNavItemsForRole(role as NavRole);

  // Count pending tickets for analyst badge
  const pendingCount = role === 'analyst'
    ? tickets.filter((t) => t.status === 'pending').length
    : 0;

  return (
    <>
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={onMobileClose}
        />
      )}
      <aside
        className={`soc-sidebar fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        style={{ background: '#08090e', borderRight: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div
          className="relative h-16 flex items-center justify-start pl-[21px] pr-2 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
        >
          <TransparentLogo
            src="/Logo-SentinelX.png"
            alt="SENTINEL-X"
            className="h-10 max-w-[200px] w-auto object-contain drop-shadow-[0_0_14px_rgba(6,182,212,0.3)] transition-transform hover:scale-105"
          />
          <button
            onClick={onMobileClose}
            className="absolute right-4 lg:hidden text-base-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto scrollbar-thin py-4 px-3 space-y-0.5">
          {navList.map((item) => {
            const Icon = item.icon;
            const active = activeId === item.id;
            const showBadge = item.id === 'user-requests' && pendingCount > 0;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onMobileClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150 text-left ${active
                  ? 'text-white'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.04]'
                  }`}
                style={
                  active
                    ? {
                      background: 'rgba(59,130,246,0.12)',
                      border: '1px solid rgba(59,130,246,0.25)',
                      boxShadow: '0 0 16px rgba(59,130,246,0.15)',
                    }
                    : { border: '1px solid transparent' }
                }
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${active ? 'text-blue-400' : 'text-gray-400'
                    }`}
                />
                <span className="truncate">{item.label}</span>
                {showBadge && (
                  <span
                    className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center bg-violet-500/25 text-violet-300 border border-violet-500/40 shrink-0"
                  >
                    {pendingCount}
                  </span>
                )}
                {active && !showBadge && (
                  <span
                    className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0"
                    style={{ boxShadow: '0 0 6px #60a5fa' }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-white/[0.06] space-y-1">
          <button
            onClick={onSignOut}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-gray-500 hover:text-red-400 hover:bg-red-500/[0.06] transition-all duration-150 group"
          >
            <LogOut className="w-4 h-4 text-gray-500 group-hover:text-red-400 transition-colors shrink-0" />
            <span>Sign Out</span>
          </button>
        </div>

        <div className="border-t border-[#1a1a1a] p-4">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm shrink-0"
              style={{
                background: role === 'analyst'
                  ? 'linear-gradient(135deg, #1e3a5f, #0f2340)'
                  : 'linear-gradient(135deg, #1e3a2f, #0f2318)',
                border: role === 'analyst'
                  ? '1px solid rgba(59,130,246,0.4)'
                  : '1px solid rgba(34,197,94,0.4)',
              }}
            >
              {currentUser?.initials ?? 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-white font-medium truncate">{currentUser?.displayName ?? 'User'}</p>
              <p className="text-xs truncate" style={{ color: role === 'analyst' ? '#60a5fa' : '#4ade80' }}>
                {role === 'analyst' ? 'Cybersecurity Analyst' : 'Standard User'}
              </p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

interface TopBarProps {
  onMenuClick: () => void;
  activeLabel: string;
  onNavigate: (id: string) => void;
}

const ALERT_SEVERITY_STYLES: Record<string, { bg: string; border: string; text: string; dot: string; glow: string }> = {
  critical: { bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.35)',   text: '#f87171', dot: '#ef4444', glow: 'rgba(239,68,68,0.18)' },
  high:     { bg: 'rgba(249,115,22,0.1)',  border: 'rgba(249,115,22,0.35)',  text: '#fb923c', dot: '#f97316', glow: 'rgba(249,115,22,0.15)' },
  medium:   { bg: 'rgba(245,158,11,0.1)',  border: 'rgba(245,158,11,0.35)',  text: '#fbbf24', dot: '#f59e0b', glow: 'rgba(245,158,11,0.15)' },
  low:      { bg: 'rgba(59,130,246,0.1)',  border: 'rgba(59,130,246,0.35)',  text: '#60a5fa', dot: '#3b82f6', glow: 'rgba(59,130,246,0.12)' },
  info:     { bg: 'rgba(34,211,238,0.1)',  border: 'rgba(34,211,238,0.35)',  text: '#67e8f9', dot: '#22d3ee', glow: 'rgba(34,211,238,0.12)' },
};

export interface SystemNotification {
  id: string;
  title: string;
  msg: string;
  time: string;
  timestamp: number;
  sev: 'critical' | 'high' | 'medium' | 'info';
  category: 'alerts' | 'intel' | 'auth' | 'system' | 'ticket';
  route: string;
  read: boolean;
}

const NOW = Date.now();

const INITIAL_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'notif-1',
    title: 'Critical Threat Detected',
    msg: 'Critical BEC threat detected — CASE-2026-0471 (Risk: 96/100)',
    time: '2m ago',
    timestamp: NOW - 2 * 60 * 1000,
    sev: 'critical',
    category: 'alerts',
    route: 'alerts',
    read: false,
  },
  {
    id: 'notif-2',
    title: 'Campaign Correlation',
    msg: 'New campaign cluster identified — WIRE-FAUD-247 (AS55836)',
    time: '14m ago',
    timestamp: NOW - 14 * 60 * 1000,
    sev: 'high',
    category: 'intel',
    route: 'campaigns',
    read: false,
  },
  {
    id: 'notif-3',
    title: 'Authentication Failure',
    msg: 'DMARC & SPF policy enforcement updated for acme-corp.example',
    time: '1h ago',
    timestamp: NOW - 60 * 60 * 1000,
    sev: 'medium',
    category: 'auth',
    route: 'header-forensics',
    read: false,
  },
  {
    id: 'notif-4',
    title: 'Origin Telemetry Synced',
    msg: 'Infrastructure trace mapped to AS55836 (New Delhi, India)',
    time: '2h ago',
    timestamp: NOW - 2 * 60 * 60 * 1000,
    sev: 'info',
    category: 'intel',
    route: 'origin-investigation',
    read: true,
  },
  {
    id: 'notif-5',
    title: 'AI Engine Ready',
    msg: 'Gemini 3.6 Flash inference engine connected with JSON schema enforcement',
    time: '4h ago',
    timestamp: NOW - 4 * 60 * 60 * 1000,
    sev: 'info',
    category: 'system',
    route: 'settings',
    read: true,
  },
];

export function TopBar({ onMenuClick, onNavigate }: TopBarProps) {
  const { currentUser } = useAuth();
  const { tickets } = useTickets();
  const role = currentUser?.role ?? 'analyst';
  const isAnalyst = role === 'analyst';

  const { analyzedReports } = useAnalysis();
  const [notifOpen, setNotifOpen] = useState(false);
  const [alertIdx, setAlertIdx] = useState(0);
  const [slideState, setSlideState] = useState<'in' | 'out'>('in');

  // Track read notification IDs in localStorage so 'mark as read' persists across sync
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(`sentinel_read_notifs_${currentUser?.email || role}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveReadNotifs = (ids: string[]) => {
    setReadNotifIds(ids);
    try {
      localStorage.setItem(`sentinel_read_notifs_${currentUser?.email || role}`, JSON.stringify(ids));
    } catch { /* ignore */ }
  };

  // Build notifications dynamically from tickets, analyzedReports, and system alerts
  const notifications: SystemNotification[] = useMemo(() => {
    if (!isAnalyst) {
      if (!currentUser?.email) return [];
      const userMail = currentUser.email.toLowerCase().trim();
      const myTickets = tickets.filter((t) => t.userEmail.toLowerCase().trim() === userMail);
      const notifs: SystemNotification[] = [];

      myTickets.forEach((t) => {
        const subTime = new Date(t.submittedAt).getTime() || (Date.now() - 60000);
        const respTime = t.respondedAt ? new Date(t.respondedAt).getTime() : subTime + 1000;

        // If analyzed, add the completed review notification (with higher timestamp)
        if (t.status === 'analyzed') {
          const revId = `notif-rev-${t.id}`;
          notifs.push({
            id: revId,
            title: 'Report Review Complete',
            msg: `Analyst completed review for ${t.id}. Response and report are ready in Check Status.`,
            time: t.respondedAt ? new Date(t.respondedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Completed',
            timestamp: respTime,
            sev: 'high',
            category: 'ticket',
            route: 'check-status',
            read: readNotifIds.includes(revId),
          });
        }

        // Add the submitted ticket notification
        const subId = `notif-sub-${t.id}`;
        notifs.push({
          id: subId,
          title: 'Report Submitted',
          msg: `Case ${t.id} successfully submitted — queued for review`,
          time: new Date(t.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          timestamp: subTime,
          sev: 'info',
          category: 'ticket',
          route: 'check-status',
          read: readNotifIds.includes(subId),
        });
      });

      // Sort descending: newest (highest timestamp) strictly at the very top
      return notifs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    }

    // ── Analyst Notifications ──
    const analystNotifs: SystemNotification[] = [];

    // 1. User ticket requests
    tickets.forEach((t) => {
      const isPending = t.status === 'pending';
      const tickId = `notif-analyst-ticket-${t.id}-${t.status}`;
      const subTime = new Date(t.submittedAt).getTime() || (Date.now() - 60000);
      const respTime = t.respondedAt ? new Date(t.respondedAt).getTime() : subTime + 1000;

      analystNotifs.push({
        id: tickId,
        title: isPending ? 'New Report Request Received' : 'Report Analyzed & Sent',
        msg: isPending
          ? `${t.userEmail} submitted ${t.id} — awaiting review`
          : `Investigation for ${t.id} completed and sent to ${t.userEmail}`,
        time: isPending
          ? new Date(t.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : (t.respondedAt ? new Date(t.respondedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Analyzed'),
        timestamp: isPending ? subTime : respTime,
        sev: isPending ? 'high' : 'info',
        category: 'ticket',
        route: 'user-requests',
        read: readNotifIds.includes(tickId),
      });
    });

    // 2. Newly analyzed local SOC reports (threats only: score >= 40, never benign / authentic)
    analyzedReports
      .filter((r) => {
        const v = (r.verdict || '').toLowerCase();
        const s = r.threat_score ?? 0;
        return s >= 40 && !v.includes('benign') && !v.includes('authentic') && !v.includes('legitimate');
      })
      .forEach((r, idx) => {
        const isCrit = (r.threat_score ?? 0) >= 70;
        const repId = `notif-soc-rep-${r.case_id}`;
        analystNotifs.push({
          id: repId,
          title: isCrit ? 'Critical Threat Detected' : 'Threat Analyzed',
          msg: `${r.verdict} — ${r.case_id} (Score: ${r.threat_score}/100)`,
          time: 'Analyzed',
          timestamp: Date.now() - (idx + 1) * 30000,
          sev: isCrit ? 'critical' : 'high',
          category: 'alerts',
          route: 'alerts',
          read: readNotifIds.includes(repId),
        });
      });

    // 3. Baseline system notifications
    INITIAL_NOTIFICATIONS.forEach((n) => {
      analystNotifs.push({
        ...n,
        read: readNotifIds.includes(n.id) ? true : n.read,
      });
    });

    // Sort descending: newest on top
    return analystNotifs.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
  }, [isAnalyst, currentUser?.email, tickets, analyzedReports, readNotifIds]);

  const [notifCategory, setNotifCategory] = useState<'all' | 'requests' | 'alerts' | 'intel' | 'system' | 'ticket'>('all');
  const [activeToast, setActiveToast] = useState<SystemNotification | null>(null);
  const [toastVisible, setToastVisible] = useState(false);
  const prevReportsCountRef = useRef(analyzedReports.length);
  const prevTicketsCountRef = useRef(tickets.length);
  const prevUserTicketsCountRef = useRef(
    tickets.filter((t) => t.userEmail.toLowerCase() === currentUser?.email?.toLowerCase()).length
  );
  const prevAnalyzedTicketsRef = useRef(
    tickets.filter((t) => t.userEmail.toLowerCase() === currentUser?.email?.toLowerCase() && t.status === 'analyzed').length
  );
  const notifDropdownRef = useRef<HTMLDivElement>(null);

  // Analyst: toast when a new user ticket is submitted
  useEffect(() => {
    if (!isAnalyst) return;
    if (tickets.length > prevTicketsCountRef.current) {
      const newest = tickets[0];
      if (newest) {
        const n: SystemNotification = {
          id: `notif-ticket-${Date.now()}`,
          title: 'New Report Request Received',
          msg: `${newest.userEmail} submitted ${newest.id} — awaiting review`,
          time: 'Just now',
          sev: 'high',
          category: 'ticket',
          route: 'user-requests',
          read: false,
        };
        fireToast(n);
      }
    }
    prevTicketsCountRef.current = tickets.length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets.length, isAnalyst]);

  // Standard user: toast when they submit a ticket or analyst responds
  useEffect(() => {
    if (isAnalyst || !currentUser?.email) return;
    const userMail = currentUser.email.toLowerCase().trim();
    const myTickets = tickets.filter((t) => t.userEmail.toLowerCase().trim() === userMail);

    // Submission notification
    if (myTickets.length > prevUserTicketsCountRef.current) {
      const newest = myTickets[0];
      if (newest) {
        const n: SystemNotification = {
          id: `notif-sub-${Date.now()}`,
          title: 'Report Submitted',
          msg: `Case ${newest.id} successfully submitted — queued for review`,
          time: 'Just now',
          sev: 'info',
          category: 'ticket',
          route: 'check-status',
          read: false,
        };
        fireToast(n);
      }
    }
    prevUserTicketsCountRef.current = myTickets.length;

    // Review response notification
    const analyzedForMe = myTickets.filter((t) => t.status === 'analyzed').length;
    if (analyzedForMe > prevAnalyzedTicketsRef.current) {
      const latestAnalyzed = myTickets.find((t) => t.status === 'analyzed');
      const n: SystemNotification = {
        id: `notif-analyzed-${Date.now()}`,
        title: 'Report Review Complete',
        msg: `Analyst completed review for ${latestAnalyzed?.id ?? 'your case'}. View the report in Check Status.`,
        time: 'Just now',
        sev: 'high',
        category: 'ticket',
        route: 'check-status',
        read: false,
      };
      fireToast(n);
    }
    prevAnalyzedTicketsRef.current = analyzedForMe;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, currentUser?.email, isAnalyst]);

  // Analyst: new analysis report → notification + toast
  useEffect(() => {
    if (!isAnalyst) return;
    if (analyzedReports.length > prevReportsCountRef.current) {
      const latestReport = analyzedReports[0];
      if (latestReport) {
        const v = (latestReport.verdict || '').toLowerCase();
        const isThreat = (latestReport.threat_score ?? 0) >= 40 && !v.includes('benign') && !v.includes('authentic') && !v.includes('legitimate');
        if (isThreat) {
          const isCrit = (latestReport.threat_score ?? 0) >= 70;
          const newNotif: SystemNotification = {
            id: `notif-${Date.now()}`,
            title: isCrit ? 'Critical Threat Detected' : 'Threat Analyzed',
            msg: `${latestReport.verdict} — ${latestReport.case_id} (Score: ${latestReport.threat_score}/100)`,
            time: 'Just now',
            timestamp: Date.now(),
            sev: isCrit ? 'critical' : 'high',
            category: 'alerts',
            route: 'alerts',
            read: false,
          };
          fireToast(newNotif);
        }
      }
    }
    prevReportsCountRef.current = analyzedReports.length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyzedReports, isAnalyst]);

  function fireToast(n: SystemNotification) {
    setActiveToast(n);
    const showTimer = setTimeout(() => setToastVisible(true), 50);
    const hideTimer = setTimeout(() => {
      setToastVisible(false);
      setTimeout(() => setActiveToast(null), 450);
    }, 3800);
    return () => { clearTimeout(showTimer); clearTimeout(hideTimer); };
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutsideNotif = (e: MouseEvent) => {
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(e.target as Node)) {
        const btn = document.getElementById('topbar-notif-btn');
        if (btn && btn.contains(e.target as Node)) return;
        setNotifOpen(false);
      }
    };
    if (notifOpen) {
      document.addEventListener('mousedown', handleClickOutsideNotif);
      return () => document.removeEventListener('mousedown', handleClickOutsideNotif);
    }
  }, [notifOpen]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllRead = () => {
    const allIds = notifications.map((n) => n.id);
    saveReadNotifs([...new Set([...readNotifIds, ...allIds])]);
  };

  const handleNotificationClick = (n: SystemNotification) => {
    saveReadNotifs([...new Set([...readNotifIds, n.id])]);
    setNotifOpen(false);
    onNavigate(n.route);
  };

  const filteredNotifs = useMemo(() => {
    if (!isAnalyst) {
      return notifications.filter((n) => n.category === 'ticket');
    }
    if (notifCategory === 'all') return notifications;
    if (notifCategory === 'requests' || notifCategory === 'ticket') return notifications.filter((n) => n.category === 'ticket');
    if (notifCategory === 'alerts') return notifications.filter((n) => n.category === 'alerts');
    if (notifCategory === 'intel') return notifications.filter((n) => n.category === 'intel' || n.category === 'auth');
    if (notifCategory === 'system') return notifications.filter((n) => n.category === 'system');
    return notifications;
  }, [notifications, notifCategory, isAnalyst]);

  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedSearchIdx, setSelectedSearchIdx] = useState(0);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Derive live alerts from analyzed reports or fallback to baseline alerts (analyst only)
  const activeAlerts: SecurityAlert[] = useMemo(() => {
    if (!isAnalyst) return [];
    if (analyzedReports && analyzedReports.length > 0) {
      return analyzedReports.map(resultToAlert);
    }
    return SECURITY_ALERTS;
  }, [analyzedReports, isAnalyst]);

  // Rotate every 6 seconds on loop with smooth slide transition
  useEffect(() => {
    if (activeAlerts.length <= 1) return;
    const timer = setInterval(() => {
      setSlideState('out');
      setTimeout(() => {
        setAlertIdx((prev) => (prev + 1) % activeAlerts.length);
        setSlideState('in');
      }, 350);
    }, 6000);

    return () => clearInterval(timer);
  }, [activeAlerts.length]);

  const currentAlert = activeAlerts[alertIdx % (activeAlerts.length || 1)] || activeAlerts[0];
  const sevKey = (currentAlert?.severity || 'medium').toLowerCase();
  const sevStyle = ALERT_SEVERITY_STYLES[sevKey] || ALERT_SEVERITY_STYLES.medium;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredSearchItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const currentRole = (role === 'user' ? 'user' : 'analyst') as NavRole;
    const roleFiltered = SEARCHABLE_ITEMS.filter((item) =>
      item.roles.includes(currentRole) || item.roles.includes('all')
    );
    if (!q) return roleFiltered;
    return roleFiltered.filter((item) => {
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      const matchKeywords = item.keywords.some((k) => k.toLowerCase().includes(q));
      return matchTitle || matchDesc || matchCat || matchKeywords;
    });
  }, [searchQuery, role]);

  useEffect(() => {
    setSelectedSearchIdx(0);
  }, [filteredSearchItems]);

  const handleSelectSearchItem = (item: SearchableItem) => {
    onNavigate(item.route);
    setSearchOpen(false);
    setSearchQuery('');
    searchInputRef.current?.blur();
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSearchIdx((prev) => (prev + 1) % Math.max(1, filteredSearchItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSearchIdx((prev) => (prev - 1 + filteredSearchItems.length) % Math.max(1, filteredSearchItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredSearchItems[selectedSearchIdx]) {
        handleSelectSearchItem(filteredSearchItems[selectedSearchIdx]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setSearchOpen(false);
      searchInputRef.current?.blur();
    }
  };

  return (
    <header
      className="h-16 flex items-center justify-between gap-3 px-4 lg:px-5 sticky top-0 z-30 shrink-0"
      style={{
        background: '#0b0c11',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        boxShadow: '0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div className="flex items-center gap-3 relative" ref={searchContainerRef}>
        <button
          onClick={onMenuClick}
          className="lg:hidden text-gray-500 hover:text-white transition-colors shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl w-80 transition-all duration-200"
          style={{
            background: searchOpen ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)',
            border: searchOpen ? '1px solid rgba(139,92,246,0.5)' : '1px solid rgba(255,255,255,0.08)',
            boxShadow: searchOpen ? '0 0 20px rgba(139,92,246,0.15)' : 'none',
          }}
        >
          <Search className={`w-3.5 h-3.5 shrink-0 transition-colors ${searchOpen ? 'text-purple-400' : 'text-gray-500'}`} />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSearchOpen(true);
            }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Search pages, tools, telemetry..."
            className="bg-transparent text-xs text-gray-200 placeholder-gray-500 focus:outline-none w-full font-mono"
          />
          {searchQuery ? (
            <button
              onClick={() => {
                setSearchQuery('');
                searchInputRef.current?.focus();
              }}
              className="text-gray-500 hover:text-gray-300 p-0.5 text-[10px]"
            >
              ✕
            </button>
          ) : (
            <kbd
              className="shrink-0 flex items-center gap-0.5 text-[10px] text-gray-500 font-mono px-1.5 py-0.5 rounded"
              style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              ⌘K
            </kbd>
          )}
        </div>

        {searchOpen && (
          <div
            className="absolute top-12 left-0 w-96 rounded-2xl p-2 z-50 shadow-2xl backdrop-blur-xl animate-fade-in"
            style={{
              background: 'rgba(12, 15, 24, 0.96)',
              border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.8), 0 0 30px rgba(139,92,246,0.12)',
            }}
          >
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-white/5 mb-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-gray-400">
                {searchQuery.trim() ? `Search Results (${filteredSearchItems.length})` : 'Quick Navigation & Modules'}
              </span>
              <span className="text-[10px] font-mono text-gray-500 flex items-center gap-1">
                <span>↑↓ Navigate</span>
                <span>↵ Open</span>
              </span>
            </div>

            <div className="max-h-80 overflow-y-auto scrollbar-thin space-y-1">
              {filteredSearchItems.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500 font-mono">
                  No matching pages or modules found for "{searchQuery}".
                </div>
              ) : (
                filteredSearchItems.map((item, idx) => {
                  const Icon = item.icon;
                  const isSelected = idx === selectedSearchIdx;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelectSearchItem(item)}
                      onMouseEnter={() => setSelectedSearchIdx(idx)}
                      className={`flex items-start gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-150 ${
                        isSelected
                          ? 'bg-purple-500/15 border border-purple-500/35 shadow-sm'
                          : 'border border-transparent hover:bg-white/[0.04]'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                        style={{
                          background: isSelected ? 'rgba(168,85,247,0.25)' : 'rgba(255,255,255,0.05)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-purple-300' : 'text-gray-400'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-bold font-mono ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                            {item.title}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${item.badgeColor}`}>
                            {item.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5 leading-snug">
                          {item.description}
                        </p>
                      </div>
                      {isSelected && (
                        <ArrowRight className="w-3.5 h-3.5 text-purple-400 shrink-0 self-center" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <div className="ml-auto flex items-center gap-3 shrink-0">
        {/* Alerts ticker — analyst only */}
        {isAnalyst && currentAlert && (
          <div
            onClick={() => onNavigate('alerts')}
            className="hidden sm:flex items-center cursor-pointer transition-all duration-300 hover:scale-[1.03]"
            title="Click to view Security Alerts"
          >
            <div
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl border transition-all duration-350 ease-out ${
                slideState === 'in'
                  ? 'opacity-100 translate-y-0 scale-100'
                  : 'opacity-0 -translate-y-2 scale-95'
              }`}
              style={{
                background: sevStyle.bg,
                borderColor: sevStyle.border,
                boxShadow: `0 0 16px ${sevStyle.glow}`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
                style={{ background: sevStyle.dot, boxShadow: `0 0 6px ${sevStyle.dot}` }}
              />
              <span
                className="text-[11px] font-bold font-mono tracking-wide"
                style={{ color: sevStyle.text, letterSpacing: '0.04em' }}
              >
                {currentAlert.relatedCase || currentAlert.id}
              </span>
              <span className="text-gray-600 text-[11px]">·</span>
              <span className="text-[11px] text-gray-300 font-mono font-medium truncate max-w-[190px]">
                {currentAlert.type || currentAlert.summary}
              </span>
            </div>
          </div>
        )}

        {/* Settings Gear Icon */}
        <button
          onClick={() => onNavigate('settings')}
          title="Settings"
          className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 group hover:bg-white/10"
        >
          <Settings className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
        </button>

        {/* Bell */}
        <div className="relative">
          <button
            id="topbar-notif-btn"
            onClick={() => {
              if (!notifOpen) {
                markAllRead();
              }
              setNotifOpen(!notifOpen);
            }}
            className="relative w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 group"
            style={{ background: notifOpen ? 'rgba(255,255,255,0.08)' : 'transparent' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)'; }}
            onMouseLeave={e => { if (!notifOpen) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <Bell className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
            {unreadCount > 0 && (
              <span
                className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"
                style={{ boxShadow: '0 0 6px rgba(239,68,68,0.9)' }}
              />
            )}
          </button>

          {/* Notif dropdown */}
          {notifOpen && (
            <div
              ref={notifDropdownRef}
              className="absolute right-0 mt-2 w-84 sm:w-96 rounded-2xl shadow-2xl z-50 border overflow-hidden animate-fade-in"
              style={{
                background: 'linear-gradient(180deg, #0f121d 0%, #0a0c14 100%)',
                borderColor: 'rgba(255,255,255,0.1)',
                boxShadow: '0 25px 60px rgba(0,0,0,0.85), 0 0 30px rgba(168,85,247,0.1)',
              }}
            >
              {/* Header */}
              <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell className="w-3.5 h-3.5 text-purple-400" />
                  <p className="text-xs font-bold text-white uppercase tracking-wider font-mono">Notifications</p>
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                      {unreadCount} NEW
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-[10px] font-mono font-semibold text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
              </div>

              {/* Category Filter Tabs */}
              {isAnalyst ? (
                <div className="px-3 py-1.5 border-b border-white/5 flex items-center gap-1.5 bg-white/[0.02] overflow-x-auto scrollbar-thin">
                  {(['all', 'requests', 'alerts', 'intel', 'system'] as const).map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setNotifCategory(cat as any)}
                      className={`px-2.5 py-0.5 rounded-lg text-[10px] font-mono font-bold uppercase whitespace-nowrap transition-all ${
                        notifCategory === cat
                          ? 'bg-purple-500/25 text-purple-200 border border-purple-500/40 shadow-sm'
                          : 'text-gray-400 hover:text-white border border-transparent'
                      }`}
                    >
                      {cat === 'requests' ? 'USER REQUESTS' : cat}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-4 py-1.5 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                  <span className="text-[10px] font-mono font-bold uppercase text-gray-400">
                    Report Activity ({filteredNotifs.length})
                  </span>
                  <span className="text-[9px] font-mono text-emerald-400/90 font-semibold">
                    Submissions &amp; Reviews
                  </span>
                </div>
              )}

              {/* List */}
              <div className="max-h-72 overflow-y-auto scrollbar-thin divide-y divide-white/5">
                {filteredNotifs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-gray-500 font-mono">
                    {isAnalyst
                      ? 'No notifications in this category.'
                      : 'No report activity yet. Submit an email report to track review progress.'}
                  </div>
                ) : (
                  filteredNotifs.map((n) => {
                    const ns = ALERT_SEVERITY_STYLES[n.sev] || ALERT_SEVERITY_STYLES.medium;
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleNotificationClick(n)}
                        className={`px-4 py-3 flex items-start gap-3 cursor-pointer transition-all duration-150 ${
                          !n.read ? 'bg-white/[0.03] hover:bg-white/[0.07]' : 'hover:bg-white/[0.04]'
                        }`}
                      >
                        <div
                          className="w-2 h-2 rounded-full shrink-0 mt-1.5"
                          style={{
                            background: ns.dot,
                            boxShadow: !n.read ? `0 0 6px ${ns.dot}` : undefined,
                          }}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`text-xs font-bold font-mono truncate ${!n.read ? 'text-white' : 'text-gray-300'}`}>
                              {n.title}
                            </p>
                            <span className="text-[9px] text-gray-500 font-mono shrink-0">{n.time}</span>
                          </div>
                          <p className="text-[11px] text-gray-400 leading-snug mt-0.5 line-clamp-2">
                            {n.msg}
                          </p>
                          <div className="flex items-center gap-1 text-[9px] text-purple-400/80 font-mono font-medium mt-1">
                            <span>Open module</span>
                            <ArrowRight className="w-2.5 h-2.5" />
                          </div>
                        </div>
                        {!n.read && (
                          <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0 self-center" />
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="w-px h-5" style={{ background: 'rgba(255,255,255,0.08)' }} />

        {/* User chip */}
        <div
          className="hidden sm:flex items-center gap-2.5 cursor-pointer px-2 py-1 rounded-lg transition-all duration-150"
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
            style={{
              background: isAnalyst
                ? 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)'
                : 'linear-gradient(135deg, #0f2318 0%, #071a0f 100%)',
              border: isAnalyst
                ? '1px solid rgba(255,255,255,0.12)'
                : '1px solid rgba(34,197,94,0.25)',
            }}
          >
            {currentUser?.initials ?? 'U'}
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[12px] font-semibold text-white whitespace-nowrap leading-tight">{currentUser?.displayName ?? 'User'}</p>
            <p className="text-[10px] mt-1 whitespace-nowrap leading-none font-medium tracking-wide"
              style={{ color: isAnalyst ? '#9ca3af' : '#4ade80' }}>
              {isAnalyst ? 'Cybersecurity Analyst' : 'Standard User'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Slide Down / Slide Out Toast Banner ── */}
      {activeToast && (
        <div
          onClick={() => {
            handleNotificationClick(activeToast);
            setToastVisible(false);
            setTimeout(() => setActiveToast(null), 350);
          }}
          className={`fixed top-4 right-6 z-50 max-w-sm w-[90vw] sm:w-96 p-3.5 rounded-2xl cursor-pointer shadow-2xl transition-all duration-500 ease-out flex items-start gap-3 border ${
            toastVisible
              ? 'translate-y-0 opacity-100 scale-100 pointer-events-auto'
              : '-translate-y-8 opacity-0 scale-95 pointer-events-none'
          }`}
          style={{
            background: 'linear-gradient(135deg, rgba(15,18,28,0.98), rgba(9,11,18,0.98))',
            borderColor:
              activeToast.sev === 'critical'
                ? 'rgba(239,68,68,0.45)'
                : activeToast.sev === 'high'
                ? 'rgba(249,115,22,0.45)'
                : activeToast.category === 'ticket'
                ? 'rgba(139,92,246,0.45)'
                : 'rgba(168,85,247,0.45)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 24px rgba(139,92,246,0.18)',
            backdropFilter: 'blur(16px)',
          }}
        >
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
            style={{
              background:
                activeToast.sev === 'critical'
                  ? 'rgba(239,68,68,0.18)'
                  : activeToast.sev === 'high'
                  ? 'rgba(249,115,22,0.18)'
                  : 'rgba(139,92,246,0.18)',
              border: `1px solid ${
                activeToast.sev === 'critical'
                  ? 'rgba(239,68,68,0.35)'
                  : activeToast.sev === 'high'
                  ? 'rgba(249,115,22,0.35)'
                  : 'rgba(139,92,246,0.35)'
              }`,
            }}
          >
            <Bell
              className={`w-4 h-4 ${
                activeToast.sev === 'critical' ? 'text-red-400 animate-pulse' : 'text-orange-400'
              }`}
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                {activeToast.title}
              </span>
              <span className="text-[9px] text-gray-500 font-mono">Just now</span>
            </div>
            <p className="text-[11px] text-gray-300 mt-0.5 leading-snug font-mono line-clamp-2">
              {activeToast.msg}
            </p>
            <div className="flex items-center gap-1 text-[10px] text-purple-400 font-mono font-semibold mt-1">
              <span>Open in triage</span>
              <ArrowRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

interface PlaceholderPageProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function PlaceholderPage({ icon: Icon, title, description }: PlaceholderPageProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 flex items-center justify-center mb-6">
        <Icon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
      <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">{description}</p>
      <div className="badge-info">
        <span className="w-1.5 h-1.5 bg-severity-medium rounded-full" />
        Module pending — Phase 2
      </div>
    </div>
  );
}
