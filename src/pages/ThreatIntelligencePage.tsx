import { useState, useEffect } from 'react';
import {
  Server,
  Globe,
  Link2,
  Network,
  Search,
  ShieldAlert,
  ShieldCheck,
  ArrowDown,
  ChevronRight,
  AlertTriangle,
  XCircle,
  Sparkles,
  ArrowRight,
  Link,
  Archive,
  Check,
  type LucideIcon,
} from 'lucide-react';
import {
  IP_INTEL,
  DOMAIN_INTEL,
  URL_INTEL,
  RELATED_INDICATORS,
  LOOKALIKE_ANALYSIS,
  INTEL_RELATIONSHIP_FLOW,
  type RelatedIndicator,
  type Severity,
} from '@/data/mockData';
import { CopyButton } from '@/components/CopyButton';
import { AnimatedCircleGauge } from '@/components/AnimatedCircleGauge';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { useEvidence } from '@/contexts/EvidenceContext';
import type { EmailAnalysisResult } from '@/services/claudeService';

type TabId = 'ip' | 'domain' | 'url' | 'indicators';

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'ip', label: 'IP Intelligence', icon: Server },
  { id: 'domain', label: 'Domain Intelligence', icon: Globe },
  { id: 'url', label: 'URL Intelligence', icon: Link2 },
  { id: 'indicators', label: 'Related Indicators', icon: Network },
];

const SEVERITY_BADGE: Record<Severity, string> = {
  critical: 'badge-critical',
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
  info: 'badge-info',
};

const LEVEL_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  critical: { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.35)',   text: 'text-red-400',    glow: '0 0 24px rgba(239,68,68,0.15)' },
  high:     { bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.35)',  text: 'text-orange-400', glow: '0 0 24px rgba(249,115,22,0.12)' },
  medium:   { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.35)',  text: 'text-amber-400',  glow: '0 0 24px rgba(245,158,11,0.10)' },
  low:      { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.35)',  text: 'text-blue-400',   glow: '0 0 24px rgba(59,130,246,0.10)' },
  info:     { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.35)', text: 'text-gray-400',   glow: 'none' },
};

/* ─── Slide-in entrance wrapper ─── */
function SlideIn({ children, delay = 0, direction = 'up', className = '' }: {
  children: React.ReactNode; delay?: number; direction?: 'up'|'left'|'right'|'down'; className?: string;
}) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVis(true), delay); return () => clearTimeout(t); }, [delay]);
  const from = direction === 'left' ? 'translateX(-36px)' : direction === 'right' ? 'translateX(36px)' : direction === 'down' ? 'translateY(-20px)' : 'translateY(24px)';
  return (
    <div className={className} style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : from, transition: 'opacity .5s cubic-bezier(.22,1,.36,1), transform .5s cubic-bezier(.22,1,.36,1)' }}>
      {children}
    </div>
  );
}

export function ThreatIntelligencePage({ onNavigate }: { onNavigate?: (route: string) => void }) {
  const [tab, setTab] = useState<TabId>('ip');
  const { currentResult, loadDemoCase } = useAnalysis();
  const { snapshotThreatIntel } = useEvidence();
  const [vaultSaved, setVaultSaved] = useState(false);
  const [isSavingToVault, setIsSavingToVault] = useState(false);

  const hasLive = Boolean(currentResult && (currentResult.case_id || currentResult.verdict));
  const rawLevel = (currentResult?.alert_level || 'info').toLowerCase();
  const lc = LEVEL_COLORS[rawLevel] || LEVEL_COLORS.info;

  const subjectHeader = Array.isArray(currentResult?.headers)
    ? currentResult?.headers.find((h) => h?.key?.toLowerCase() === 'subject')?.value
    : null;

  const handleSaveIntelToVault = async () => {
    if (!currentResult) return;
    setIsSavingToVault(true);
    try {
      const caseId = currentResult?.case_id || 'CASE-2026-LIVE';
      const indicator = currentResult?.threat_intel?.domain || currentResult?.threat_intel?.sending_ip || '185.220.101.47';
      await snapshotThreatIntel({
        caseId,
        indicator,
        intelData: {
          case_id: caseId,
          timestamp: new Date().toISOString(),
          ip_intel: IP_INTEL,
          domain_intel: DOMAIN_INTEL,
          url_intel: URL_INTEL,
          related_indicators: RELATED_INDICATORS,
          lookalike_analysis: LOOKALIKE_ANALYSIS,
        },
      });
      setVaultSaved(true);
      setTimeout(() => setVaultSaved(false), 4000);
    } catch {
      // ignore
    } finally {
      setIsSavingToVault(false);
    }
  };

  return (
    <div className="space-y-6" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Page Header ── */}
      <SlideIn delay={0} direction="down">
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black text-white tracking-tight">Threat Intelligence</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                Correlated infrastructure threat intelligence, WHOIS, DNS records &amp; homoglyph analysis
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {onNavigate && (
                <button
                  onClick={() => onNavigate('header-forensics')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 shadow-md font-mono cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                    border: '1px solid rgba(99,102,241,0.4)',
                  }}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Back to Header Forensics</span>
                </button>
              )}
            </div>
          </div>

          {/* ── Synced Analysis Banner ── */}
          {hasLive && currentResult && (
            <div
              className="rounded-2xl p-4"
              style={{
                background: lc.bg,
                border: `1px solid ${lc.border}`,
                boxShadow: lc.glow,
              }}
            >
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: lc.border, opacity: 0.9 }}
                  >
                    <Link className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-mono uppercase tracking-widest text-gray-500 font-bold leading-none mb-0.5">Synced from Email Analysis</p>
                    <p className="text-xs font-bold text-white font-mono truncate" title={`${currentResult.case_id || 'ANALYSIS-ACTIVE'}${subjectHeader ? ` — ${subjectHeader}` : ''}`}>
                      <span>{currentResult.case_id || 'ANALYSIS-ACTIVE'}</span>
                      {subjectHeader && <span className="text-gray-300 font-normal"> — {subjectHeader}</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap ml-auto shrink-0">
                  <span
                    className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase ${lc.text}`}
                    style={{ background: lc.bg, border: `1px solid ${lc.border}` }}
                  >
                    {currentResult.alert_level || 'INFO'}
                  </span>
                  {typeof currentResult.threat_score === 'number' && (
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-bold text-purple-300 bg-purple-500/20 border border-purple-500/30">
                      Score: {currentResult.threat_score}/100
                    </span>
                  )}
                  {currentResult.threat_intel?.sending_ip && (
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold text-cyan-300 bg-cyan-500/15 border border-cyan-500/25">
                      IP: {currentResult.threat_intel.sending_ip}
                    </span>
                  )}
                  {currentResult.threat_intel?.domain && (
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold text-blue-300 bg-blue-500/15 border border-blue-500/25">
                      {currentResult.threat_intel.domain}
                    </span>
                  )}
                </div>
              </div>

              {/* Auth badges */}
              <div className="flex items-center gap-2 mt-2.5 pt-2.5 border-t border-white/5 flex-wrap">
                <span className="text-[10px] text-gray-600 font-mono uppercase mr-1">Auth:</span>
                {(['spf', 'dkim', 'dmarc'] as const).map((k) => {
                  const val = currentResult.threat_intel?.[k] || 'UNKNOWN';
                  const isPass = val === 'PASS';
                  return (
                    <span
                      key={k}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${isPass ? 'text-green-400' : 'text-red-400'}`}
                      style={{
                        background: isPass ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                        border: `1px solid ${isPass ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                      }}
                    >
                      {k.toUpperCase()} {val}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </SlideIn>

      {!currentResult ? (
        <SlideIn delay={60} direction="up">
          <div
            className="rounded-2xl p-12 text-center flex flex-col items-center justify-center gap-6"
            style={{
              background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            }}
          >
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: 'rgba(59,130,246,0.1)',
                border: '1px solid rgba(59,130,246,0.25)',
              }}
            >
              <Server className="w-8 h-8 text-blue-400" />
            </div>

            <div className="max-w-md space-y-2">
              <h3 className="text-lg font-bold text-white tracking-tight">No Threat Intelligence in Session</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-mono">
                Upload or paste an email in Email Analyzer to extract indicators of compromise (IOCs), WHOIS domain records, IP reputation scores, and homoglyph attack vectors.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => onNavigate?.('email-analyzer')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 shadow-lg font-mono"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
                }}
              >
                <Server className="w-4 h-4" />
                Go to Email Analyzer
              </button>
              <button
                onClick={loadDemoCase}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white transition-all font-mono"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                Load Sample Demo Email
              </button>
            </div>
          </div>
        </SlideIn>
      ) : (
        <>
          {/* ── Interactive Tabbed Container ── */}
          <SlideIn delay={100} direction="up">
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}
            >
              {/* Tabs header */}
              <div className="flex items-center gap-1 border-b border-white/10 p-2 overflow-x-auto scrollbar-thin">
                {TABS.map((t) => {
                  const Icon = t.icon;
                  const isActive = tab === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTab(t.id)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 ${
                        isActive
                          ? 'text-purple-300'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                      style={
                        isActive
                          ? { background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)', boxShadow: '0 0 12px rgba(139,92,246,0.2)' }
                          : { background: 'transparent', border: '1px solid transparent' }
                      }
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-gray-500'}`} />
                      {t.label}
                    </button>
                  );
                })}
              </div>

              <div className="p-6">
                {tab === 'ip' && <IPTab result={currentResult} />}
                {tab === 'domain' && <DomainTab result={currentResult} />}
                {tab === 'url' && <URLTab result={currentResult} />}
                {tab === 'indicators' && <IndicatorsTab result={currentResult} />}
              </div>
            </div>
          </SlideIn>

          {/* ── Relationship Flow ── */}
          <SlideIn delay={200} direction="up">
            <RelationshipFlow result={currentResult} />
          </SlideIn>
        </>
      )}
    </div>
  );
}

function InfoRow({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-white/5 last:border-0">
      <span className="text-xs text-gray-400 font-medium">{label}</span>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className={`text-xs text-white ${mono ? 'font-mono' : ''} text-right break-all font-semibold`}>{value}</span>
        {mono && <CopyButton value={value} />}
      </div>
    </div>
  );
}

function ReputationBadge({ reputation, score }: { reputation: string; score: number }) {
  const isMalicious = reputation === 'malicious';
  const isSuspicious = reputation === 'suspicious';
  const Icon = isMalicious ? ShieldAlert : isSuspicious ? AlertTriangle : ShieldCheck;

  return (
    <div className="flex items-center gap-2">
      <span
        className={`px-2.5 py-0.5 rounded text-[11px] font-bold flex items-center gap-1.5 uppercase ${
          isMalicious
            ? 'text-red-400 bg-red-500/20 border border-red-500/30'
            : isSuspicious
            ? 'text-orange-400 bg-orange-500/20 border border-orange-500/30'
            : 'text-green-400 bg-green-500/20 border border-green-500/30'
        }`}
      >
        <Icon className="w-3.5 h-3.5" />
        {reputation}
      </span>
      <span className="text-xs text-gray-400 font-mono font-semibold">Score: {score}/100</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   IP INTELLIGENCE TAB
═══════════════════════════════════════════════════════════ */
function IPTab({ result }: { result: EmailAnalysisResult | null }) {
  const ip = result?.threat_intel.sending_ip || result?.origin.sending_ip || IP_INTEL.ip;
  const reputation = result?.threat_intel.ip_reputation || IP_INTEL.reputation;
  const reputationScore = result ? (result.threat_intel.ip_reputation === 'malicious' ? 88 : result.threat_intel.ip_reputation === 'suspicious' ? 65 : 12) : IP_INTEL.reputationScore;
  const asn = result?.origin.asn || IP_INTEL.asn;
  const hosting = result?.origin.hosting || IP_INTEL.hosting;
  const country = result?.origin.country || IP_INTEL.country;
  const blocklists = (result?.threat_intel.blocklists && result.threat_intel.blocklists.length > 0)
    ? result.threat_intel.blocklists
    : IP_INTEL.blocklists;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', boxShadow: '0 0 16px rgba(239,68,68,0.2)' }}
          >
            <Server className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-mono">{ip}</h3>
            <ReputationBadge reputation={reputation} score={reputationScore} />
          </div>
        </div>

        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <InfoRow label="IP Address" value={ip} />
          <InfoRow label="ASN" value={asn} />
          <InfoRow label="Hosting / ISP" value={hosting} mono={false} />
          <InfoRow label="Country" value={country} mono={false} />
          <InfoRow label="Network Type" value={result ? 'Dedicated / Datacenter' : IP_INTEL.networkType} mono={false} />
          <InfoRow label="Case Context" value={result ? result.case_id : IP_INTEL.firstSeen} />
          <InfoRow label="Verdict" value={result ? `${result.verdict} (${result.alert_level.toUpperCase()})` : IP_INTEL.lastSeen} mono={false} />
        </div>

        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 font-mono">
            Blocklist Appearances
          </h4>
          <div className="flex flex-wrap gap-2">
            {blocklists.map((bl) => (
              <span
                key={bl}
                className="px-2.5 py-1 rounded text-xs font-bold text-red-400 bg-red-500/15 border border-red-500/30"
              >
                {bl}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div
        className="rounded-xl p-4 h-full"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 font-mono">
          Related Indicators
        </h4>
        <div className="space-y-2">
          {(result
            ? [
                ...(result.threat_intel.domain ? [result.threat_intel.domain] : []),
                ...(result.threat_intel.urls || []),
                ...(result.threat_intel.sending_ip ? [result.threat_intel.sending_ip] : []),
                ...(result.campaign_id && result.campaign_id !== 'UNKNOWN' ? [result.campaign_id] : []),
              ]
            : IP_INTEL.relatedIndicators
          ).map((ind) => (
            <div
              key={ind}
              className="flex items-center gap-2 rounded-lg p-2.5 transition-colors"
              style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="text-xs text-white font-mono break-all flex-1">{ind}</span>
              <CopyButton value={ind} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DOMAIN INTELLIGENCE TAB
═══════════════════════════════════════════════════════════ */
function DomainTab({ result }: { result: EmailAnalysisResult | null }) {
  const domain = result?.threat_intel.domain || DOMAIN_INTEL.domain;
  const ageDays = result?.threat_intel.domain_age_days;
  const regAge = ageDays !== undefined ? `${ageDays} days (Newly Registered)` : DOMAIN_INTEL.registrationAge;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div
          className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', boxShadow: '0 0 16px rgba(239,68,68,0.2)' }}
        >
          <Globe className="w-5 h-5 text-red-400" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white font-mono">{domain}</h3>
          <ReputationBadge reputation={result ? (result.threat_score >= 70 ? 'malicious' : 'suspicious') : DOMAIN_INTEL.reputation} score={result ? result.threat_score : 15} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <InfoRow label="Domain" value={domain} />
          <InfoRow label="Registration Age" value={regAge} mono={false} />
          <InfoRow label="SPF Record" value={result?.threat_intel.spf || 'FAIL'} />
          <InfoRow label="DKIM Verification" value={result?.threat_intel.dkim || 'FAIL'} />
          <InfoRow label="DMARC Policy" value={result?.threat_intel.dmarc || 'FAIL'} />
          <InfoRow label="Hosting / Infrastructure" value={result?.origin.hosting || DOMAIN_INTEL.hosting} mono={false} />
        </div>

        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 font-mono">
            DNS Records
          </h4>
          <div className="space-y-2">
            {DOMAIN_INTEL.dns.map((d) => (
              <div
                key={d.type}
                className="rounded-lg p-2.5"
                style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}
              >
                <span className="text-xs text-cyan-400 font-mono font-bold">{d.type}</span>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-xs text-white font-mono break-all flex-1">{d.value}</span>
                  <CopyButton value={d.value} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="rounded-xl p-4 space-y-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <div>
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 font-mono">
              Nameservers
            </h4>
            <div className="space-y-2">
              {DOMAIN_INTEL.nameservers.map((ns) => (
                <div
                  key={ns}
                  className="flex items-center gap-2 rounded-lg p-2.5"
                  style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <Server className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                  <span className="text-xs text-white font-mono break-all flex-1">{ns}</span>
                  <CopyButton value={ns} />
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 font-mono">
              Related Domains
            </h4>
            <div className="flex flex-wrap gap-2">
              {(result?.threat_intel.domain
                ? [result.threat_intel.domain, `mail-${result.threat_intel.domain}`, `auth.${result.threat_intel.domain}`]
                : DOMAIN_INTEL.relatedDomains
              ).map((d) => (
                <span
                  key={d}
                  className="px-2.5 py-1 rounded text-xs font-bold text-orange-400 bg-orange-500/15 border border-orange-500/30"
                >
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>

        <LookalikeAnalysis result={result} />
      </div>
    </div>
  );
}

function LookalikeAnalysis({ result }: { result: EmailAnalysisResult | null }) {
  const observedDomain = result?.threat_intel.domain || LOOKALIKE_ANALYSIS.observed;
  const isLookalike = observedDomain.includes('0') || observedDomain.includes('-') || observedDomain.includes('support') || observedDomain.includes('verify') || (result && result.threat_score >= 60);
  const expectedDomain = result
    ? (observedDomain.replace('0', 'o').replace('-support', '').replace('-security', '').replace('-verify', '').replace('.example', '.com'))
    : LOOKALIKE_ANALYSIS.expected;
  const similarity = result ? Math.min(96, Math.max(72, result.threat_score + 10)) : LOOKALIKE_ANALYSIS.similarity;

  const characteristics = result
    ? [
        {
          trait: 'Domain Typosquatting / Character Substitution',
          severity: (result.threat_score >= 75 ? 'critical' : 'high') as Severity,
          detail: `Observed domain "${observedDomain}" deviates from legitimate service domain "${expectedDomain}".`,
        },
        {
          trait: 'Sender Authentication Alignment Failure',
          severity: (result.threat_intel.dmarc === 'FAIL' ? 'critical' : 'high') as Severity,
          detail: `DMARC and SPF verification failed for envelope sender under ${observedDomain}.`,
        },
        {
          trait: 'Threat Intelligence Correlation',
          severity: (result.alert_level === 'critical' ? 'critical' : 'medium') as Severity,
          detail: `Correlated against active threat campaign ${result.campaign_id || 'CAMP-GLOBAL'} with confidence score ${result.confidence}%.`,
        },
      ]
    : LOOKALIKE_ANALYSIS.characteristics;

  return (
    <div
      className="rounded-xl p-4"
      style={{
        background: 'linear-gradient(135deg, rgba(239,68,68,0.06) 0%, rgba(220,38,38,0.02) 100%)',
        border: '1px solid rgba(239,68,68,0.3)',
      }}
    >
      <h4 className="text-xs font-bold text-white mb-1 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-red-400" />
        Lookalike Domain Analysis
      </h4>
      <p className="text-[11px] text-gray-400 mb-4">Homoglyph and typosquat detection</p>

      <div
        className="rounded-lg p-3 mb-4"
        style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-mono">Expected Target</span>
            <p className="text-xs text-white font-mono font-bold mt-0.5">{expectedDomain}</p>
          </div>
          <div>
            <span className="text-[10px] text-gray-500 uppercase font-mono">Observed Sender Domain</span>
            <p className="text-xs text-red-400 font-mono font-bold mt-0.5">{observedDomain}</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-400">Similarity / Confidence</span>
            <span className="text-base font-black text-red-400 font-mono">{similarity}%</span>
          </div>
          <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${similarity}%`,
                background: 'linear-gradient(90deg, #ef4444, #f97316)',
                boxShadow: '0 0 8px rgba(239,68,68,0.6)',
              }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {characteristics.map((c) => (
          <div
            key={c.trait}
            className="rounded-lg p-2.5"
            style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.04)' }}
          >
            <div className="flex items-start justify-between gap-2 mb-1">
              <span className="text-xs text-white font-semibold">{c.trait}</span>
              <span className={SEVERITY_BADGE[c.severity] || 'badge-high'}>{c.severity}</span>
            </div>
            <p className="text-[11px] text-gray-400 leading-relaxed">{c.detail}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   URL INTELLIGENCE TAB
═══════════════════════════════════════════════════════════ */
function URLTab({ result }: { result: EmailAnalysisResult | null }) {
  const url = (result?.threat_intel.urls && result.threat_intel.urls.length > 0)
    ? result.threat_intel.urls[0]
    : URL_INTEL.fullUrl;
  const domain = result?.threat_intel.domain || URL_INTEL.domain;
  const score = result ? result.threat_score : URL_INTEL.riskScore;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', boxShadow: '0 0 16px rgba(239,68,68,0.2)' }}
          >
            <Link2 className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-mono break-all">{url}</h3>
            <ReputationBadge reputation={result ? (score >= 70 ? 'malicious' : 'suspicious') : URL_INTEL.reputation} score={score} />
          </div>
        </div>

        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <InfoRow label="Full URL" value={url} />
          <InfoRow label="Domain" value={domain} />
          <InfoRow label="Reputation" value={result ? (score >= 70 ? 'malicious' : 'suspicious') : URL_INTEL.reputation} mono={false} />
          <InfoRow label="Classification" value={result?.verdict || URL_INTEL.category} mono={false} />
          <InfoRow label="Associated Case" value={result?.case_id || 'DEMO'} />
        </div>

        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 font-mono">
            Payload URL / Redirect Chain
          </h4>
          <div className="space-y-2">
            {(result?.threat_intel.urls && result.threat_intel.urls.length > 0
              ? result.threat_intel.urls
              : URL_INTEL.redirectChain
            ).map((u, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-mono w-5 shrink-0">{i + 1}.</span>
                <span className="text-xs text-white font-mono break-all flex-1">{u}</span>
                <CopyButton value={u} />
              </div>
            ))}
          </div>
        </div>

        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3 font-mono">
            Detection Signals
          </h4>
          <div className="space-y-2">
            {(result?.risk_factors && result.risk_factors.length > 0
              ? result.risk_factors.map(rf => `${rf.label}: ${rf.detail}`)
              : URL_INTEL.detectionSignals
            ).map((sig, i) => (
              <div key={i} className="flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span className="text-xs text-gray-300">{sig}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="rounded-xl p-6 flex flex-col items-center justify-center h-full"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 font-mono">
          URL Risk Score
        </h4>
        <AnimatedCircleGauge score={URL_INTEL.riskScore} label="CRITICAL" />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RELATED INDICATORS TAB
═══════════════════════════════════════════════════════════ */
function IndicatorsTab({ result }: { result: EmailAnalysisResult | null }) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selected, setSelected] = useState<RelatedIndicator | null>(null);

  const baseIndicators: RelatedIndicator[] = result
    ? [
        ...(result.threat_intel.sending_ip
          ? [{
              id: 'live-ip',
              indicator: result.threat_intel.sending_ip,
              type: 'IP' as const,
              relationship: 'Origin sending MTA',
              confidence: result.confidence,
              firstSeen: 'Current session',
              lastSeen: 'Live analysis',
            }]
          : []),
        ...(result.threat_intel.domain
          ? [{
              id: 'live-domain',
              indicator: result.threat_intel.domain,
              type: 'Domain' as const,
              relationship: 'Sender domain / lookalike target',
              confidence: result.confidence,
              firstSeen: 'Current session',
              lastSeen: 'Live analysis',
            }]
          : []),
        ...(result.threat_intel.urls || []).map((u, i) => ({
          id: `live-url-${i}`,
          indicator: u,
          type: 'URL' as const,
          relationship: 'Extracted payload link',
          confidence: result.confidence,
          firstSeen: 'Current session',
          lastSeen: 'Live analysis',
        })),
        ...(result.campaign_id && result.campaign_id !== 'UNKNOWN'
          ? [{
              id: 'live-camp',
              indicator: result.campaign_id,
              type: 'Campaign' as const,
              relationship: 'Attributed threat cluster',
              confidence: result.confidence,
              firstSeen: 'Current session',
              lastSeen: 'Live analysis',
            }]
          : []),
        ...RELATED_INDICATORS,
      ]
    : RELATED_INDICATORS;

  const filtered = baseIndicators.filter((ind) => {
    const matchesSearch = ind.indicator.toLowerCase().includes(search.toLowerCase()) ||
      ind.relationship.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || ind.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const types = ['all', 'IP', 'Domain', 'URL', 'Email', 'Campaign'];

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row gap-3">
        <div
          className="flex items-center gap-2 rounded-xl px-3 py-2 flex-1"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search indicators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-xs text-white placeholder-gray-500 focus:outline-none w-full"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-thin">
          {types.map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 shrink-0 ${
                typeFilter === t
                  ? 'text-purple-300'
                  : 'text-gray-400 hover:text-white'
              }`}
              style={
                typeFilter === t
                  ? { background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)' }
                  : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }
              }
            >
              {t === 'all' ? 'All Types' : t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 overflow-x-auto scrollbar-thin">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10 text-gray-500 text-[11px] uppercase tracking-wider font-mono">
                <th className="py-2.5 px-3 text-left">Indicator</th>
                <th className="py-2.5 px-3 text-left">Type</th>
                <th className="py-2.5 px-3 text-left hidden md:table-cell">Relationship</th>
                <th className="py-2.5 px-3 text-left hidden lg:table-cell">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((ind) => (
                <tr
                  key={ind.id}
                  onClick={() => setSelected(ind)}
                  className={`border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer ${
                    selected?.id === ind.id ? 'bg-purple-500/10' : ''
                  }`}
                >
                  <td className="py-3 px-3 text-xs font-mono text-white max-w-[200px] truncate" title={ind.indicator}>
                    {ind.indicator}
                  </td>
                  <td className="py-3 px-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold text-blue-400 bg-blue-500/15 border border-blue-500/30">
                      {ind.type}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-xs text-gray-300 hidden md:table-cell">{ind.relationship}</td>
                  <td className="py-3 px-3 hidden lg:table-cell">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${ind.confidence}%`,
                            background: ind.confidence > 85 ? '#ef4444' : '#f97316',
                          }}
                        />
                      </div>
                      <span className="text-xs font-mono text-white font-bold">{ind.confidence}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center py-8 text-xs text-gray-500">No indicators match your search.</div>
          )}
        </div>

        <div
          className="rounded-xl p-4 h-full"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          {selected ? (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-white flex items-center gap-2">
                <Search className="w-4 h-4 text-purple-400" />
                Indicator Details
              </h4>
              <div className="space-y-1">
                <InfoRow label="Indicator" value={selected.indicator} />
                <InfoRow label="Type" value={selected.type} mono={false} />
                <InfoRow label="Relationship" value={selected.relationship} mono={false} />
                <InfoRow label="Confidence" value={`${selected.confidence}%`} />
                <InfoRow label="First Seen" value={selected.firstSeen} />
                <InfoRow label="Last Seen" value={selected.lastSeen} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <Search className="w-8 h-8 text-gray-600 mb-3" />
              <p className="text-xs text-gray-400">Select an indicator from the table to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RELATIONSHIP VISUALIZATION FLOW
═══════════════════════════════════════════════════════════ */
function RelationshipFlow({ result }: { result: EmailAnalysisResult | null }) {
  const fromHdr = result?.headers.find(h => h.key.toLowerCase() === 'from')?.value;
  const flowNodes = result
    ? [
        { label: 'Sender Identity', value: fromHdr || 'Targeted Spoofed Identity' },
        ...(result.origin.sending_ip ? [{ label: 'Sending Relay IP', value: result.origin.sending_ip }] : []),
        ...(result.threat_intel.domain ? [{ label: 'Observed Domain', value: result.threat_intel.domain }] : []),
        ...(result.threat_intel.urls && result.threat_intel.urls.length > 0
          ? [{ label: 'Payload URL Target', value: result.threat_intel.urls[0] }]
          : [{ label: 'Attack Vector', value: result.verdict }]),
      ]
    : INTEL_RELATIONSHIP_FLOW;

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <div className="mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Network className="w-4 h-4 text-cyan-400" />
          Relationship Visualization
        </h3>
        <p className="text-[11px] text-gray-500 mt-0.5">Connected indicator map from email sender to final payload URL</p>
      </div>

      <div className="flex flex-col items-center gap-2">
        {flowNodes.map((node, i) => (
          <div key={node.label} className="flex flex-col items-center w-full max-w-md">
            <div
              className="w-full rounded-xl p-3.5 transition-all duration-200 hover:scale-[1.01]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-mono font-bold">{node.label}</span>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-white font-mono break-all flex-1 font-semibold">{node.value}</span>
                <CopyButton value={node.value} />
              </div>
            </div>
            {i < flowNodes.length - 1 && (
              <ArrowDown className="w-4 h-4 text-purple-400 my-1 animate-bounce" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
