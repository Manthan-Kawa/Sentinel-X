import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search,
  Network,
  Mail,
  Globe,
  Server,
  Link2,
  FolderSearch,
  ArrowDown,
  ArrowLeft,
  Activity,
  ChevronRight,
  Crosshair,
  Sparkles,
  Zap,
  ShieldAlert,
  Clock,
  User,
  FileText,
  Lock,
  Plus,
  StickyNote,
  Pencil,
  RefreshCw,
  ChevronDown,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import {
  INVESTIGATION_CASES,
  type Campaign,
  type CampaignStatus,
  type Severity,
  type ThreatType,
  type CaseStatus,
  type InvestigationCase,
} from '@/data/mockData';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { useCampaigns } from '@/contexts/CampaignContext';
import type { EmailAnalysisResult } from '@/services/claudeService';
import { CopyButton } from '@/components/CopyButton';

/* ─── Slide-in entrance wrapper ─── */
function SlideIn({
  children,
  delay = 0,
  direction = 'up',
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  direction?: 'up' | 'left' | 'right' | 'down';
  className?: string;
}) {
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVis(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  const from =
    direction === 'left'
      ? 'translateX(-36px)'
      : direction === 'right'
      ? 'translateX(36px)'
      : direction === 'down'
      ? 'translateY(-20px)'
      : 'translateY(24px)';
  return (
    <div
      className={className}
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? 'none' : from,
        transition: 'opacity .5s cubic-bezier(.22,1,.36,1), transform .5s cubic-bezier(.22,1,.36,1)',
      }}
    >
      {children}
    </div>
  );
}

/* ─── Severity config ─── */
const SEVERITY_STYLES: Record<Severity, { border: string; bg: string; text: string; dot: string; glow: string }> = {
  critical: { border: 'rgba(239,68,68,0.4)', bg: 'rgba(239,68,68,0.1)', text: '#f87171', dot: '#ef4444', glow: 'rgba(239,68,68,0.25)' },
  high: { border: 'rgba(249,115,22,0.4)', bg: 'rgba(249,115,22,0.1)', text: '#fb923c', dot: '#f97316', glow: 'rgba(249,115,22,0.2)' },
  medium: { border: 'rgba(245,158,11,0.35)', bg: 'rgba(245,158,11,0.08)', text: '#fbbf24', dot: '#f59e0b', glow: 'rgba(245,158,11,0.15)' },
  low: { border: 'rgba(59,130,246,0.35)', bg: 'rgba(59,130,246,0.08)', text: '#60a5fa', dot: '#3b82f6', glow: 'rgba(59,130,246,0.15)' },
  info: { border: 'rgba(156,163,175,0.25)', bg: 'rgba(156,163,175,0.06)', text: '#9ca3af', dot: '#6b7280', glow: 'rgba(156,163,175,0.1)' },
};

const STATUS_CONFIG: Record<CampaignStatus, { color: string; bg: string; border: string; label: string; pulse?: string }> = {
  active: { color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', label: 'Active', pulse: '#ef4444' },
  dormant: { color: '#9ca3af', bg: 'rgba(156,163,175,0.08)', border: 'rgba(156,163,175,0.2)', label: 'Dormant' },
  disrupted: { color: '#4ade80', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.35)', label: 'Disrupted', pulse: '#22c55e' },
  monitoring: { color: '#60a5fa', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', label: 'Monitoring', pulse: '#3b82f6' },
};

const CASE_STATUS_CONFIG: Record<CaseStatus, { color: string; bg: string; border: string; label: string; pulse?: string }> = {
  open: { color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.35)', label: 'Open', pulse: '#ef4444' },
  investigating: { color: '#fb923c', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.35)', label: 'Investigating', pulse: '#f97316' },
  contained: { color: '#60a5fa', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', label: 'Contained' },
  resolved: { color: '#4ade80', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.35)', label: 'Resolved' },
};

/* ─── Map alert level to severity ─── */
function alertToSeverity(level: string): Severity {
  if (level === 'critical' || level === 'high' || level === 'medium' || level === 'low' || level === 'info') {
    return level as Severity;
  }
  return 'info';
}

/* ─── Build dynamic InvestigationCase from analyzed email ─── */
function buildCaseFromAnalysis(r: EmailAnalysisResult): InvestigationCase {
  const subjectHdr = r.headers.find((h) => h.key.toLowerCase() === 'subject')?.value ?? r.case_id;
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const status: CaseStatus =
    r.alert_level === 'critical'
      ? 'investigating'
      : r.alert_level === 'high' || r.alert_level === 'medium'
      ? 'open'
      : 'resolved';

  return {
    id: r.case_id,
    title: subjectHdr,
    severity: alertToSeverity(r.alert_level),
    status,
    created: now,
    assignedAnalyst: 'SENTINEL-X Engine',
    threatType: (r.verdict?.split(' ')[0] ?? 'BEC') as any,
    relatedCampaign: r.campaign_id ?? 'UNKNOWN',
    lastUpdated: now,
    summary: r.summary ?? `Forensic analysis concluded for ${r.case_id}.`,
    timeline:
      r.recommended_actions?.length > 0
        ? r.recommended_actions.map((a) => ({
            time: now,
            event: `[${a.priority.toUpperCase()}] ${a.action}: ${a.detail}`,
            actor: 'SENTINEL-X Engine',
          }))
        : [{ time: now, event: `Analysis completed — threat score ${r.threat_score}/100`, actor: 'SENTINEL-X Engine' }],
    analystNotes: r.ai_inferences.slice(0, 3).map((inf) => ({
      author: 'AI Engine',
      timestamp: now,
      note: `${inf.inference} — ${inf.confidence}% confidence. Basis: ${inf.basis}`,
    })),
    activityHistory: [
      { time: now, action: 'Case generated via live email analysis', actor: 'SENTINEL-X Engine' },
    ],
    relatedEvidence: r.evidence?.map((e) => e.id) ?? [],
  };
}

/* ─── Severity Pill ─── */
function SeverityPill({ severity }: { severity: Severity }) {
  const s = SEVERITY_STYLES[severity];
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider font-mono"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {severity}
    </span>
  );
}

/* ─── Campaign Status Pill ─── */
function StatusPill({ status }: { status: CampaignStatus }) {
  const s = STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
    >
      <span className="relative flex h-2 w-2">
        {s.pulse && (
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: s.pulse }}
          />
        )}
        <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: s.pulse ?? '#6b7280' }} />
      </span>
      {s.label}
    </span>
  );
}

/* ─── Case Status Pill ─── */
function CaseStatusPill({ status, animate = false }: { status: CaseStatus; animate?: boolean }) {
  const s = CASE_STATUS_CONFIG[status];
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider font-mono"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
    >
      <span className="relative flex h-2 w-2">
        {animate && (
          <span
            className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
            style={{ background: s.pulse }}
          />
        )}
        <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: s.pulse ?? '#6b7280' }} />
      </span>
      {s.label}
    </span>
  );
}

/* ─── Real-time "Last Refreshed" badge ─── */
function LiveRefreshBadge({ lastRefreshed }: { lastRefreshed: Date }) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 10_000);
    return () => clearInterval(t);
  }, []);

  const secs = Math.floor((Date.now() - lastRefreshed.getTime()) / 1000);
  const label = secs < 60 ? `${secs}s ago` : `${Math.floor(secs / 60)}m ago`;

  return (
    <div
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium whitespace-nowrap shrink-0"
      style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#86efac' }}
    >
      <RefreshCw className="w-2.5 h-2.5 animate-spin" style={{ animationDuration: '3s' }} />
      <span>Live · {label}</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN PAGE
════════════════════════════════════════════════════════════ */
export function CampaignsPage({ onNavigate }: { onNavigate?: (id: string) => void } = {}) {
  const { analyzedReports } = useAnalysis();
  const { campaigns, stats, addCampaign, updateCampaign, deleteCampaign, activeCampaignsCount, lastRefreshed } = useCampaigns();

  const allCampaigns = campaigns;

  // Merge static investigation cases with dynamic ones from analyzed reports
  const allCases = useMemo((): InvestigationCase[] => {
    const staticIds = new Set(INVESTIGATION_CASES.map((c) => c.id));
    const dynamicCases = analyzedReports
      .filter((r) => !staticIds.has(r.case_id))
      .map(buildCaseFromAnalysis);
    return [...INVESTIGATION_CASES, ...dynamicCases];
  }, [analyzedReports]);

  const [selected, setSelected] = useState<Campaign | null>(null);
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);

  // Keep selected campaign in sync with context updates (e.g. real-time tick)
  useEffect(() => {
    if (selected) {
      const updated = campaigns.find((c) => c.id === selected.id);
      if (updated) setSelected(updated);
    }
  }, [campaigns]);

  if (selected) {
    return (
      <CampaignDetail
        campaign={selected}
        allCases={allCases}
        onBack={() => setSelected(null)}
        onEdit={() => setEditingCampaign(selected)}
      />
    );
  }

  const filtered = allCampaigns.filter((c) => {
    const caseId = c.relatedCases?.[0] ?? '';
    const matchesSearch =
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      caseId.toLowerCase().includes(search.toLowerCase()) ||
      c.threatType.toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = severityFilter === 'all' || c.severity === severityFilter;
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesSeverity && matchesStatus;
  });

  const activeCount = activeCampaignsCount;

  const STAT_CARDS = [
    { label: 'Emails Observed', value: stats.emailsObserved, icon: Mail, color: '#f87171', glow: 'rgba(239,68,68,0.15)' },
    { label: 'Unique Domains', value: stats.uniqueDomains, icon: Globe, color: '#2dd4bf', glow: 'rgba(45,212,191,0.15)' },
    { label: 'Unique IPs', value: stats.uniqueIPs, icon: Server, color: '#fb923c', glow: 'rgba(251,146,60,0.15)' },
    { label: 'Suspicious URLs', value: stats.suspiciousURLs, icon: Link2, color: '#fbbf24', glow: 'rgba(251,191,36,0.15)' },
    { label: 'Active Cases', value: stats.activeCases, icon: FolderSearch, color: '#c084fc', glow: 'rgba(192,132,252,0.15)' },
  ];

  return (
    <div className="space-y-6" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* ── Header ── */}
      <SlideIn delay={0} direction="down">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-black text-white tracking-tight">Campaign Intelligence</h2>
            <p className="text-sm text-gray-400 mt-0.5">
              Correlated threat clusters — multi-vector attack tracking, case intelligence &amp; real-time indicator grouping
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
            {/* Real-time refresh badge */}
            <LiveRefreshBadge lastRefreshed={lastRefreshed} />

            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg shrink-0 whitespace-nowrap"
              style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)' }}
            >
              <Sparkles className="w-3 h-3 text-purple-400" />
              <span className="text-[11px] font-semibold text-purple-300 font-mono">
                {activeCount} ACTIVE CLUSTER{activeCount !== 1 ? 'S' : ''}
              </span>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold text-white transition-all font-mono shadow-md shrink-0 whitespace-nowrap hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #a855f7 0%, #7c3aed 100%)',
                boxShadow: '0 0 12px rgba(168,85,247,0.3)',
              }}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Campaign</span>
            </button>
          </div>
        </div>
      </SlideIn>

      {/* ── Stat Cards ── */}
      <SlideIn delay={60} direction="up">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
          {STAT_CARDS.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="rounded-2xl p-4 transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  boxShadow: `0 0 20px ${stat.glow}`,
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] text-gray-500 font-mono uppercase tracking-wider">{stat.label}</span>
                  <Icon className="w-3.5 h-3.5" style={{ color: stat.color }} />
                </div>
                <div className="text-2xl font-black" style={{ color: stat.color }}>
                  {stat.value.toLocaleString()}
                </div>
              </div>
            );
          })}
        </div>
      </SlideIn>

      {/* ── Filters ── */}
      <SlideIn delay={120} direction="up">
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <div
              className="flex items-center gap-2 flex-1 rounded-xl px-3 py-2.5"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <Search className="w-4 h-4 text-gray-500 shrink-0" />
              <input
                type="text"
                placeholder="Search by campaign ID, cluster name, case ID, or threat type..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none w-full font-mono"
              />
            </div>
            {/* Severity Dropdown */}
            <div className="relative shrink-0">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value as any)}
                className="appearance-none px-3.5 py-2.5 pr-8 rounded-xl text-xs font-mono font-bold text-gray-200 bg-white/5 border border-white/10 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer transition-all shrink-0"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                }}
              >
                <option value="all" className="bg-[#0b0e17] text-gray-300">All Severity</option>
                <option value="critical" className="bg-[#0b0e17] text-red-400">Critical</option>
                <option value="high" className="bg-[#0b0e17] text-orange-400">High</option>
                <option value="medium" className="bg-[#0b0e17] text-amber-400">Medium</option>
                <option value="low" className="bg-[#0b0e17] text-green-400">Low</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            {/* Status Dropdown */}
            <div className="relative shrink-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="appearance-none px-3.5 py-2.5 pr-8 rounded-xl text-xs font-mono font-bold text-gray-200 bg-white/5 border border-white/10 hover:border-white/20 focus:outline-none focus:ring-2 focus:ring-purple-500/40 cursor-pointer transition-all shrink-0"
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                }}
              >
                <option value="all" className="bg-[#0b0e17] text-gray-300">All Status</option>
                <option value="active" className="bg-[#0b0e17] text-red-400">Active</option>
                <option value="dormant" className="bg-[#0b0e17] text-gray-400">Dormant</option>
                <option value="disrupted" className="bg-[#0b0e17] text-green-400">Disrupted</option>
                <option value="monitoring" className="bg-[#0b0e17] text-cyan-400">Monitoring</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>
      </SlideIn>

      {/* ── Campaigns Table ── */}
      <SlideIn delay={180} direction="up">
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          {/* Table Header */}
          <div
            className="grid grid-cols-12 gap-2 px-5 py-3 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}
          >
            <div className="col-span-2">Campaign ID</div>
            <div className="col-span-2">Case ID</div>
            <div className="col-span-3">Cluster Name</div>
            <div className="col-span-1 hidden md:block">Threat Type</div>
            <div className="col-span-1 hidden md:block">Severity</div>
            <div className="col-span-2">Status</div>
            <div className="col-span-1 hidden xl:block text-right">Confidence</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-white/5">
            {filtered.map((c) => {
              const primaryCaseId = c.relatedCases[0] ?? null;
              const casesForCampaign = allCases.filter((cs) => c.relatedCases.includes(cs.id));
              const hasLiveCase = casesForCampaign.some(
                (cs) => !INVESTIGATION_CASES.find((ic) => ic.id === cs.id)
              );

              return (
                <div
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className="grid grid-cols-12 gap-2 px-5 py-3.5 cursor-pointer transition-all duration-150 hover:bg-white/[0.03] group items-center"
                >
                  {/* Campaign ID */}
                  <div className="col-span-2 flex items-center gap-2">
                    <Crosshair className="w-3 h-3 text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    <span className="text-xs font-mono font-bold text-purple-400">{c.id}</span>
                    {c.status === 'active' && (
                      <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    )}
                  </div>

                  {/* Exactly 1 Single Case ID per Campaign */}
                  <div className="col-span-2 flex items-center">
                    {primaryCaseId ? (
                      <span
                        className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold px-2.5 py-1 rounded transition-colors"
                        style={{
                          background: 'rgba(6,182,212,0.12)',
                          border: '1px solid rgba(6,182,212,0.3)',
                          color: '#22d3ee',
                        }}
                      >
                        <Lock className="w-3 h-3 opacity-75" />
                        {primaryCaseId}
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-600 font-mono italic">None</span>
                    )}
                  </div>

                  {/* Cluster Name */}
                  <div className="col-span-3 flex items-center gap-1.5">
                    <span className="text-xs text-white font-medium truncate block">{c.name}</span>
                    {hasLiveCase && (
                      <span
                        className="shrink-0 w-2 h-2 rounded-full bg-green-400 animate-pulse"
                        title="Live email analysis linked"
                      />
                    )}
                  </div>

                  {/* Threat Type */}
                  <div className="col-span-1 hidden md:flex items-center">
                    <span className="text-xs text-gray-300 font-mono truncate">{c.threatType}</span>
                  </div>

                  {/* Severity */}
                  <div className="col-span-1 hidden md:flex items-center">
                    <SeverityPill severity={c.severity} />
                  </div>

                  {/* Status */}
                  <div className="col-span-2 flex items-center">
                    <StatusPill status={c.status} />
                  </div>

                  {/* Confidence & Actions */}
                  <div className="col-span-1 hidden xl:flex items-center justify-end gap-2">
                    <div className="w-10 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${c.confidence}%`,
                          background: c.confidence > 80 ? '#ef4444' : '#f97316',
                          boxShadow: `0 0 6px ${
                            c.confidence > 80 ? 'rgba(239,68,68,0.5)' : 'rgba(249,115,22,0.5)'
                          }`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-mono text-white font-bold">{c.confidence}%</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingCampaign(c);
                      }}
                      className="p-1 rounded-lg text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors cursor-pointer"
                      title="Edit Campaign"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete campaign ${c.id}?`)) {
                          deleteCampaign(c.id);
                        }
                      }}
                      className="p-1 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/15 transition-colors cursor-pointer"
                      title="Delete Campaign"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-red-400" />
                    </button>
                    <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16 px-4">
              {allCampaigns.length === 0 ? (
                <div className="max-w-md mx-auto space-y-4">
                  <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-purple-500/10 border border-purple-500/20 text-purple-400">
                    <Network className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono">No Campaigns Recorded</h3>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                      No campaign threat clusters exist yet. Ingest and analyze emails in Email Analyzer or manually create a correlated campaign cluster.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => setShowCreateModal(true)}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition-all font-mono flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Create Campaign
                    </button>
                    {onNavigate && (
                      <button
                        onClick={() => onNavigate('email-analyzer')}
                        className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-300 bg-white/5 border border-white/10 hover:text-white transition-all font-mono flex items-center gap-1.5"
                      >
                        <Mail className="w-3.5 h-3.5 text-blue-400" />
                        Analyze Email
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <>
                  <Search className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 font-mono">No campaign clusters match your filters</p>
                  <button
                    onClick={() => {
                      setSearch('');
                      setSeverityFilter('all');
                      setStatusFilter('all');
                    }}
                    className="mt-2 text-xs text-purple-400 font-mono hover:underline"
                  >
                    Reset filters
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </SlideIn>

      {/* Create Campaign Modal */}
      {showCreateModal && (
        <CampaignFormModal
          mode="create"
          onClose={() => setShowCreateModal(false)}
          onSaved={(newCamp) => {
            setShowCreateModal(false);
            setSelected(newCamp);
          }}
        />
      )}

      {/* Edit Campaign Modal */}
      {editingCampaign && (
        <CampaignFormModal
          mode="edit"
          initialData={editingCampaign}
          onClose={() => setEditingCampaign(null)}
          onSaved={(updated) => {
            updateCampaign(updated.id, updated);
            setEditingCampaign(null);
            setSelected(updated);
          }}
        />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   CAMPAIGN FORM MODAL (Create + Edit)
════════════════════════════════════════════════════════════ */
function CampaignFormModal({
  mode,
  initialData,
  onClose,
  onSaved,
}: {
  mode: 'create' | 'edit';
  initialData?: Campaign;
  onClose: () => void;
  onSaved: (camp: Campaign) => void;
}) {
  const { addCampaign, updateCampaign } = useCampaigns();
  const [name, setName] = useState(initialData?.name ?? '');
  const [threatType, setThreatType] = useState<ThreatType>(initialData?.threatType ?? 'BEC');
  const [severity, setSeverity] = useState<Severity>(initialData?.severity ?? 'high');
  const [status, setStatus] = useState<CampaignStatus>(initialData?.status ?? 'active');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [domains, setDomains] = useState(initialData?.relatedDomains?.join(', ') ?? '');
  const [ips, setIps] = useState(initialData?.relatedIPs?.join(', ') ?? '');
  const [urls, setUrls] = useState(initialData?.relatedURLs?.join(', ') ?? '');
  const [confidence, setConfidence] = useState(initialData?.confidence ?? 85);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const domainList = domains.split(',').map((s) => s.trim()).filter(Boolean);
    const ipList = ips.split(',').map((s) => s.trim()).filter(Boolean);
    const urlList = urls.split(',').map((s) => s.trim()).filter(Boolean);

    if (mode === 'create') {
      const created = addCampaign({
        name: name.trim(),
        threatType,
        severity,
        status,
        confidence,
        description: description.trim() || `User-created threat campaign cluster: ${name}`,
        relatedDomains: domainList,
        relatedIPs: ipList,
        relatedURLs: urlList,
      });
      onSaved(created);
    } else if (initialData) {
      const updated: Campaign = {
        ...initialData,
        name: name.trim(),
        threatType,
        severity,
        status,
        confidence,
        description: description.trim(),
        relatedDomains: domainList,
        relatedIPs: ipList,
        relatedURLs: urlList,
        lastSeen: new Date().toISOString().slice(0, 10),
      };
      updateCampaign(updated.id, updated);
      onSaved(updated);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div
        className="w-full max-w-xl rounded-2xl p-6 relative space-y-5 max-h-[90vh] overflow-y-auto"
        style={{
          background: 'linear-gradient(145deg, #0d111d 0%, #080a12 100%)',
          border: '1px solid rgba(168,85,247,0.3)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8), 0 0 30px rgba(168,85,247,0.15)',
        }}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400">
              {mode === 'edit' ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono">
                {mode === 'edit' ? 'Edit Campaign Cluster' : 'Create Threat Campaign Cluster'}
              </h3>
              <p className="text-xs text-gray-400">
                {mode === 'edit' ? 'Update campaign intelligence dossier' : 'Add a correlated campaign intelligence dossier'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-sm font-mono p-1">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-mono font-semibold text-gray-300 block mb-1">
              Campaign Cluster Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Executive Wire-Transfer Phishing Ring"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-sm text-white bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none font-mono placeholder:text-gray-600"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-mono font-semibold text-gray-300 block mb-1">Threat Type</label>
              <select
                value={threatType}
                onChange={(e) => setThreatType(e.target.value as ThreatType)}
                className="w-full px-3 py-2 rounded-xl text-xs text-white bg-[#0f1422] border border-white/10 focus:outline-none font-mono"
              >
                <option value="BEC">BEC</option>
                <option value="Phishing">Phishing</option>
                <option value="Malware">Malware</option>
                <option value="Spoofing">Spoofing</option>
                <option value="Credential Harvesting">Credential Harvesting</option>
                <option value="Ransomware">Ransomware</option>
                <option value="C2">C2</option>
                <option value="Spam">Spam</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono font-semibold text-gray-300 block mb-1">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as Severity)}
                className="w-full px-3 py-2 rounded-xl text-xs text-white bg-[#0f1422] border border-white/10 focus:outline-none font-mono"
              >
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-mono font-semibold text-gray-300 block mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CampaignStatus)}
                className="w-full px-3 py-2 rounded-xl text-xs text-white bg-[#0f1422] border border-white/10 focus:outline-none font-mono"
              >
                <option value="active">Active</option>
                <option value="monitoring">Monitoring</option>
                <option value="dormant">Dormant</option>
                <option value="disrupted">Disrupted</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-mono font-semibold text-gray-300 block mb-1">
              Confidence Score: <span className="text-purple-400">{confidence}%</span>
            </label>
            <input
              type="range"
              min={10}
              max={100}
              value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="w-full accent-purple-500"
            />
          </div>

          <div>
            <label className="text-xs font-mono font-semibold text-gray-300 block mb-1">
              Description &amp; Threat Context
            </label>
            <textarea
              rows={2}
              placeholder="Describe attack methodology, targeted roles, impersonated brands..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl text-xs text-white bg-white/5 border border-white/10 focus:border-purple-500 focus:outline-none font-mono placeholder:text-gray-600"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-mono font-semibold text-gray-300 block mb-1">
                Related Domains <span className="text-gray-600">(comma-separated)</span>
              </label>
              <input
                type="text"
                placeholder="malicious-domain.com, spoof-bank.net"
                value={domains}
                onChange={(e) => setDomains(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs text-white bg-white/5 border border-white/10 focus:outline-none font-mono placeholder:text-gray-600"
              />
            </div>
            <div>
              <label className="text-xs font-mono font-semibold text-gray-300 block mb-1">
                Related IPs <span className="text-gray-600">(comma-separated)</span>
              </label>
              <input
                type="text"
                placeholder="185.220.101.47, 91.240.118.52"
                value={ips}
                onChange={(e) => setIps(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs text-white bg-white/5 border border-white/10 focus:outline-none font-mono placeholder:text-gray-600"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-mono font-semibold text-gray-300 block mb-1">
              Suspicious URLs <span className="text-gray-600">(comma-separated)</span>
            </label>
            <input
              type="text"
              placeholder="https://phish-site.example/verify, https://cred-capture.example/login"
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              className="w-full px-3 py-2 rounded-xl text-xs text-white bg-white/5 border border-white/10 focus:outline-none font-mono placeholder:text-gray-600"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-400 hover:text-white bg-white/5 border border-white/10 font-mono"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition-all font-mono shadow-md"
            >
              {mode === 'edit' ? 'Save Changes' : 'Save Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   CAMPAIGN DETAIL — Merged with Investigation Cases
════════════════════════════════════════════════════════════ */
function CampaignDetail({
  campaign,
  allCases,
  onBack,
  onEdit,
}: {
  campaign: Campaign;
  allCases: InvestigationCase[];
  onBack: () => void;
  onEdit: () => void;
}) {
  const { getCaseStatus, deleteCampaign } = useCampaigns();
  const sev = SEVERITY_STYLES[campaign.severity];
  const [selectedCase, setSelectedCase] = useState<InvestigationCase | null>(null);

  const casesForCampaign = allCases
    .filter((c) => campaign.relatedCases.includes(c.id))
    .map((c) => ({ ...c, status: getCaseStatus(c.id, c.status) }));

  if (selectedCase) {
    return (
      <CaseDetail
        caseData={{ ...selectedCase, status: getCaseStatus(selectedCase.id, selectedCase.status) }}
        onBack={() => setSelectedCase(null)}
        onBackLabel={`Back to ${campaign.id}`}
      />
    );
  }

  return (
    <div className="space-y-6" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Back button + Meta */}
      <SlideIn delay={0} direction="down">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-all cursor-pointer"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Campaigns
            </button>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-purple-400 font-bold">{campaign.id}</span>
              <SeverityPill severity={campaign.severity} />
              <StatusPill status={campaign.status} />
            </div>
          </div>
          {/* Action buttons: Edit Campaign & Delete Campaign (Red) */}
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-300 hover:text-white transition-all cursor-pointer hover:bg-purple-500/20"
              style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)' }}
            >
              <Pencil className="w-3.5 h-3.5 text-purple-400" />
              Edit Campaign
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Are you sure you want to delete campaign cluster ${campaign.id}?`)) {
                  deleteCampaign(campaign.id);
                  onBack();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-red-400 hover:text-white transition-all hover:bg-red-500/25 border border-red-500/30 cursor-pointer"
              style={{ background: 'rgba(239,68,68,0.12)' }}
              title="Delete Campaign"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              Delete Campaign
            </button>
          </div>
        </div>
      </SlideIn>

      {/* Cluster summary card */}
      <SlideIn delay={60} direction="up">
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
            border: `1px solid ${sev.border}`,
            boxShadow: `0 0 30px ${sev.glow}`,
          }}
        >
          <h2 className="text-xl font-black text-white mb-2">{campaign.name}</h2>
          <p className="text-sm text-gray-400 leading-relaxed mb-4">{campaign.description}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Threat Type', val: campaign.threatType, icon: Zap, color: '#c084fc' },
              { label: 'First Seen', val: campaign.firstSeen, icon: Activity, color: '#2dd4bf' },
              { label: 'Last Seen', val: campaign.lastSeen, icon: Activity, color: '#fb923c' },
              {
                label: 'Observed Volume',
                val: `${campaign.emails} emails / ${campaign.indicators} IOCs`,
                icon: Mail,
                color: '#f87171',
              },
            ].map((box) => {
              const Icon = box.icon;
              return (
                <div
                  key={box.label}
                  className="rounded-xl p-3.5"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                >
                  <span className="flex items-center gap-1.5 text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1">
                    <Icon className="w-3 h-3" style={{ color: box.color }} />
                    {box.label}
                  </span>
                  <p className="text-xs font-bold text-white font-mono">{box.val}</p>
                </div>
              );
            })}
          </div>
        </div>
      </SlideIn>

      {/* ── Linked Investigation Cases (Merged from Investigations Page) ── */}
      <SlideIn delay={120} direction="up">
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FolderSearch className="w-4 h-4 text-purple-400" />
              Linked Investigation Cases
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded"
                style={{
                  background: 'rgba(139,92,246,0.15)',
                  border: '1px solid rgba(139,92,246,0.3)',
                  color: '#c084fc',
                }}
              >
                {casesForCampaign.length}
              </span>
            </h3>
            <span className="text-[11px] text-gray-500 font-mono">
              Click any case to inspect timeline &amp; analyst notes
            </span>
          </div>

          {casesForCampaign.length === 0 ? (
            <div className="text-center py-8">
              <ShieldAlert className="w-8 h-8 text-gray-700 mx-auto mb-2" />
              <p className="text-xs text-gray-600 font-mono">No cases linked to this campaign yet</p>
              <p className="text-[11px] text-gray-700 mt-1">
                Analyze an email that references this campaign cluster to automatically attach it here.
              </p>
            </div>
          ) : (
            <>
              {/* Table header */}
              <div
                className="grid grid-cols-12 gap-2 px-4 py-2.5 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider mb-1"
                style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '10px' }}
              >
                <div className="col-span-3">Case ID</div>
                <div className="col-span-4">Title / Subject</div>
                <div className="col-span-2">Severity</div>
                <div className="col-span-2">Status</div>
                <div className="col-span-1">Threat Type</div>
              </div>

              {/* Rows */}
              <div className="space-y-1.5">
                {casesForCampaign.map((c) => {
                  const isStaticCase = !!INVESTIGATION_CASES.find((ic) => ic.id === c.id);
                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCase(c)}
                      className="grid grid-cols-12 gap-2 px-4 py-3 rounded-xl cursor-pointer transition-all duration-150 hover:scale-[1.005] group items-center"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div className="col-span-3 flex items-center gap-1.5">
                        <Crosshair className="w-3 h-3 text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                        <span className="text-xs font-mono font-bold text-cyan-400">{c.id}</span>
                        {!isStaticCase && (
                          <span
                            className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold"
                            style={{
                              background: 'rgba(34,197,94,0.15)',
                              border: '1px solid rgba(34,197,94,0.3)',
                              color: '#4ade80',
                            }}
                          >
                            LIVE
                          </span>
                        )}
                      </div>
                      <div className="col-span-4">
                        <span className="text-xs text-white font-medium truncate block">{c.title}</span>
                      </div>
                      <div className="col-span-2">
                        <SeverityPill severity={c.severity} />
                      </div>
                      <div className="col-span-2">
                        <CaseStatusPill
                          status={c.status}
                          animate={c.status === 'open' || c.status === 'investigating'}
                        />
                      </div>
                      <div className="col-span-1 flex items-center justify-between">
                        <span className="text-[10px] text-gray-400 font-mono truncate">{c.threatType}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-cyan-400 transition-all shrink-0" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </SlideIn>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Campaign Timeline */}
        <SlideIn delay={180} direction="left">
          <div
            className="rounded-2xl p-5 h-full"
            style={{
              background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Activity className="w-4 h-4 text-purple-400" />
              Campaign Timeline
            </h3>
            <div className="relative pl-2">
              <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-white/10" />
              <div className="space-y-4">
                {campaign.timeline.map((t, i) => (
                  <div key={i} className="relative flex gap-4 items-start">
                    <div
                      className="relative z-10 w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border"
                      style={{
                        background: 'rgba(168,85,247,0.15)',
                        borderColor: 'rgba(168,85,247,0.3)',
                        color: '#c084fc',
                      }}
                    >
                      <span className="text-xs font-bold font-mono">{i + 1}</span>
                    </div>
                    <div
                      className="flex-1 rounded-xl p-3"
                      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                    >
                      <span className="text-xs text-white font-medium">{t.event}</span>
                      <div className="text-[10px] text-gray-500 font-mono mt-1">{t.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SlideIn>

        {/* Campaign Relationships */}
        <SlideIn delay={200} direction="right">
          <div
            className="rounded-2xl p-5 h-full"
            style={{
              background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
              <Network className="w-4 h-4 text-cyan-400" />
              Campaign Relationships
            </h3>
            <div className="flex flex-col items-center gap-1">
              <FlowNode label="Emails" values={campaign.relatedEmails} icon={Mail} />
              <ArrowDown className="w-4 h-4 text-gray-600 my-0.5" />
              <FlowNode label="Domains" values={campaign.relatedDomains} icon={Globe} />
              <ArrowDown className="w-4 h-4 text-gray-600 my-0.5" />
              <FlowNode label="IPs" values={campaign.relatedIPs} icon={Server} />
              <ArrowDown className="w-4 h-4 text-gray-600 my-0.5" />
              <FlowNode label="URLs" values={campaign.relatedURLs} icon={Link2} />
              <ArrowDown className="w-4 h-4 text-gray-600 my-0.5" />
              <div
                className="w-full rounded-xl p-3 text-center"
                style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.3)' }}
              >
                <span className="text-[10px] text-purple-300 font-mono uppercase tracking-wider font-bold">
                  Campaign Cluster
                </span>
                <p className="text-sm text-white font-mono font-bold">{campaign.id}</p>
              </div>
              <ArrowDown className="w-4 h-4 text-gray-600 my-0.5" />
              <FlowNode label="Cases" values={campaign.relatedCases} icon={FolderSearch} />
            </div>
          </div>
        </SlideIn>
      </div>

      {/* Indicator grids */}
      <SlideIn delay={260} direction="up">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <IndicatorPanel label="Related Emails" items={campaign.relatedEmails} icon={Mail} color="text-red-400" />
          <IndicatorPanel label="Related Domains" items={campaign.relatedDomains} icon={Globe} color="text-teal-400" />
          <IndicatorPanel label="Related IPs" items={campaign.relatedIPs} icon={Server} color="text-orange-400" />
          <IndicatorPanel label="Related URLs" items={campaign.relatedURLs} icon={Link2} color="text-amber-400" />
        </div>
      </SlideIn>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   CASE DETAIL VIEW (Full investigation case view)
════════════════════════════════════════════════════════════ */
function CaseDetail({
  caseData,
  onBack,
  onBackLabel,
}: {
  caseData: InvestigationCase;
  onBack: () => void;
  onBackLabel: string;
}) {
  const { setCaseStatus, getCaseStatus } = useCampaigns();
  const sev = SEVERITY_STYLES[caseData.severity];
  const [caseStatus, _setCaseStatus] = useState<CaseStatus>(getCaseStatus(caseData.id, caseData.status));
  const [notes, setNotes] = useState(caseData.analystNotes);
  const [newNote, setNewNote] = useState('');

  const handleSetStatus = useCallback(
    (s: CaseStatus) => {
      _setCaseStatus(s);
      setCaseStatus(caseData.id, s); // Persist to context/localStorage
    },
    [caseData.id, setCaseStatus]
  );

  const addNote = () => {
    if (!newNote.trim()) return;
    setNotes([
      ...notes,
      {
        author: 'Analyst',
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC',
        note: newNote.trim(),
      },
    ]);
    setNewNote('');
  };

  const STATUS_ORDER: CaseStatus[] = ['open', 'investigating', 'contained', 'resolved'];

  return (
    <div className="space-y-6" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Back + Header */}
      <SlideIn delay={0} direction="down">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-400 hover:text-white transition-all"
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {onBackLabel}
          </button>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-cyan-400 font-bold">{caseData.id}</span>
            <SeverityPill severity={caseData.severity} />
            <CaseStatusPill status={caseStatus} animate={caseStatus === 'open' || caseStatus === 'investigating'} />
            {/* Persist indicator */}
            <span
              className="text-[10px] font-mono px-2 py-0.5 rounded"
              style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)', color: '#4ade80' }}
            >
              ✓ Saved
            </span>
          </div>
        </div>
      </SlideIn>

      {/* Case Title Card */}
      <SlideIn delay={60} direction="up">
        <div
          className="rounded-2xl p-5"
          style={{
            background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
            border: `1px solid ${sev.border}`,
            boxShadow: `0 0 30px ${sev.glow}`,
          }}
        >
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
            <div className="flex-1">
              <h2 className="text-xl font-black text-white mb-2">{caseData.title}</h2>
              <p className="text-sm text-gray-400 leading-relaxed">{caseData.summary}</p>
            </div>
            {/* Status Control */}
            <div
              className="rounded-xl p-4 shrink-0 min-w-[160px]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-3">Status Control</p>
              <div className="flex flex-col gap-1.5">
                {STATUS_ORDER.map((s) => {
                  const cfg = CASE_STATUS_CONFIG[s];
                  const active = caseStatus === s;
                  return (
                    <button
                      key={s}
                      onClick={() => handleSetStatus(s)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all font-mono"
                      style={
                        active
                          ? { background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }
                          : {
                              background: 'rgba(255,255,255,0.02)',
                              border: '1px solid rgba(255,255,255,0.04)',
                              color: '#4b5563',
                            }
                      }
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ background: active ? cfg.pulse ?? '#4b5563' : '#374151' }}
                      />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </SlideIn>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column */}
        <div className="space-y-5">
          {/* Case Metadata */}
          <SlideIn delay={140} direction="left">
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                <ShieldAlert className="w-4 h-4 text-cyan-400" />
                Case Metadata
              </h3>
              <div className="space-y-0">
                <MetaRow icon={FileText} label="Case ID" value={caseData.id} />
                <MetaRow icon={Clock} label="Created" value={caseData.created} />
                <MetaRow icon={User} label="Assigned" value={caseData.assignedAnalyst} mono={false} />
                <MetaRow icon={Network} label="Threat Type" value={caseData.threatType} mono={false} />
                <MetaRow icon={Zap} label="Campaign" value={caseData.relatedCampaign} />
                <MetaRow icon={Clock} label="Last Updated" value={caseData.lastUpdated} />
                {caseData.relatedEvidence.length > 0 && (
                  <MetaRow icon={Lock} label="Evidence" value={caseData.relatedEvidence.join(', ')} mono={false} />
                )}
              </div>
            </div>
          </SlideIn>

          {/* Activity History */}
          <SlideIn delay={200} direction="left">
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                <Activity className="w-4 h-4 text-purple-400" />
                Activity History
              </h3>
              <div className="space-y-3">
                {caseData.activityHistory.map((a, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="relative mt-1.5 shrink-0">
                      <span
                        className="w-2 h-2 rounded-full block"
                        style={{ background: '#a855f7', boxShadow: '0 0 6px rgba(168,85,247,0.5)' }}
                      />
                    </div>
                    <div>
                      <span className="text-xs text-white font-medium">{a.action}</span>
                      <span className="text-xs text-gray-500"> — {a.actor}</span>
                      <div className="text-[10px] text-gray-600 font-mono mt-0.5">{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </SlideIn>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Investigation Timeline */}
          <SlideIn delay={160} direction="right">
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-cyan-400" />
                Investigation Timeline
              </h3>
              <div className="relative pl-2">
                <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-white/10" />
                <div className="space-y-4">
                  {caseData.timeline.map((t, i) => (
                    <div key={i} className="relative flex gap-4 items-start">
                      <div
                        className="relative z-10 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-transform hover:scale-110"
                        style={
                          i === 0
                            ? {
                                background: 'rgba(239,68,68,0.2)',
                                borderColor: '#ef4444',
                                color: '#f87171',
                                boxShadow: '0 0 12px rgba(239,68,68,0.4)',
                              }
                            : i === caseData.timeline.length - 1
                            ? {
                                background: 'rgba(34,197,94,0.2)',
                                borderColor: '#22c55e',
                                color: '#4ade80',
                                boxShadow: '0 0 12px rgba(34,197,94,0.4)',
                              }
                            : {
                                background: 'rgba(255,255,255,0.05)',
                                borderColor: 'rgba(255,255,255,0.12)',
                                color: '#6b7280',
                              }
                        }
                      >
                        <span className="text-xs font-bold font-mono">{i + 1}</span>
                      </div>
                      <div
                        className="flex-1 rounded-xl p-3.5 transition-all hover:scale-[1.005]"
                        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                      >
                        <span className="text-xs text-white font-medium">{t.event}</span>
                        <div className="text-[10px] text-gray-500 font-mono mt-1">
                          {t.time}
                          {'actor' in t && (t as any).actor ? (
                            <>
                              {' '}
                              — <span className="text-gray-400">{(t as any).actor}</span>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </SlideIn>

          {/* Analyst Notes */}
          <SlideIn delay={240} direction="right">
            <div
              className="rounded-2xl p-5"
              style={{
                background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-4">
                <StickyNote className="w-4 h-4 text-amber-400" />
                Analyst Notes
              </h3>
              <div className="space-y-3 mb-4">
                {notes.length === 0 && (
                  <p className="text-xs text-gray-600 font-mono text-center py-4">
                    No analyst notes yet. Add one below.
                  </p>
                )}
                {notes.map((n, i) => (
                  <div
                    key={i}
                    className="rounded-xl p-3.5 transition-all hover:scale-[1.005]"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-white font-bold">{n.author}</span>
                      <span className="text-[10px] text-gray-600 font-mono">{n.timestamp}</span>
                    </div>
                    <p className="text-xs text-gray-400 leading-relaxed">{n.note}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addNote()}
                  placeholder="Add a note…"
                  className="flex-1 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none font-mono"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                />
                <button
                  onClick={addNote}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 font-mono flex items-center gap-1.5"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(99,102,241,0.3))',
                    border: '1px solid rgba(99,102,241,0.4)',
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>
            </div>
          </SlideIn>
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ─── */
function MetaRow({
  icon: Icon,
  label,
  value,
  mono = true,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div
      className="flex items-center justify-between gap-3 py-2.5"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      <span className="flex items-center gap-1.5 text-xs text-gray-500 shrink-0">
        <Icon className="w-3.5 h-3.5 text-purple-400" />
        {label}
      </span>
      <span className={`text-xs text-white text-right break-all ${mono ? 'font-mono' : 'font-medium'}`}>{value}</span>
    </div>
  );
}

function IndicatorPanel({
  label,
  items,
  icon: Icon,
  color,
}: {
  label: string;
  items: string[];
  icon: LucideIcon;
  color: string;
}) {
  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <h3 className={`text-sm font-bold text-white flex items-center gap-2 mb-3`}>
        <Icon className={`w-4 h-4 ${color}`} />
        {label}
      </h3>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-xs text-gray-600 font-mono py-2 text-center">None observed</p>
        ) : (
          items.map((item) => (
            <div
              key={item}
              className="flex items-center gap-2 rounded-xl p-3 transition-colors"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <Icon className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="text-xs text-white font-mono break-all flex-1">{item}</span>
              <CopyButton value={item} />
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function FlowNode({ label, values, icon: Icon }: { label: string; values: string[]; icon: LucideIcon }) {
  return (
    <div
      className="w-full rounded-xl p-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Icon className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-[10px] text-gray-500 uppercase tracking-wider font-mono font-bold">{label}</span>
      </div>
      {values.length > 0 ? (
        <div className="space-y-1">
          {values.map((v) => (
            <div key={v} className="flex items-center gap-1">
              <span className="text-xs text-white font-mono break-all flex-1 font-semibold">{v}</span>
              <CopyButton value={v} />
            </div>
          ))}
        </div>
      ) : (
        <span className="text-xs text-gray-600 font-mono italic">None</span>
      )}
    </div>
  );
}
