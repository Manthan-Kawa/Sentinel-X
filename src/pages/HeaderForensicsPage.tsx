import { useState, useEffect } from 'react';
import {
  Mail,
  ArrowRight,
  ShieldX,
  ChevronDown,
  ChevronRight,
  Server,
  Clock,
  Eye,
  Brain,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Info,
  Network,
  MapPin,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Link,
  Archive,
  Check,
  Download,
} from 'lucide-react';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { useEvidence } from '@/contexts/EvidenceContext';
import type { EmailAnalysisResult } from '@/services/claudeService';

import {
  DEMO_EMAIL,
  SMTP_RELAYS,
  EXTENDED_HEADERS,
  HEADER_FACTS,
  HEADER_INFERENCES,
  type ExtendedHeader,
  type HeaderFact,
} from '@/data/mockData';
import { CopyButton } from '@/components/CopyButton';

const AUTH_CARDS = [
  { name: 'SPF', result: 'FAIL', detail: 'Sending IP 185.220.101.47 not designated by domain SPF record' },
  { name: 'DKIM', result: 'FAIL', detail: 'Signature present but verification returned permerror' },
  { name: 'DMARC', result: 'FAIL', detail: 'Neither SPF nor DKIM aligned with From domain' },
];

const FACT_ICON: Record<HeaderFact['status'], typeof CheckCircle2> = {
  fail: XCircle,
  warn: AlertTriangle,
  info: Info,
};

const FACT_COLOR: Record<HeaderFact['status'], string> = {
  fail: 'text-red-400',
  warn: 'text-amber-400',
  info: 'text-gray-400',
};

const HEADER_CATEGORY_COLOR: Record<ExtendedHeader['category'], string> = {
  routing: 'text-cyan-400',
  auth: 'text-red-400',
  identity: 'text-purple-400',
  content: 'text-gray-300',
  metadata: 'text-gray-500',
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

const LEVEL_COLORS: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  critical: { bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.35)',   text: 'text-red-400',    glow: '0 0 24px rgba(239,68,68,0.15)' },
  high:     { bg: 'rgba(249,115,22,0.08)',  border: 'rgba(249,115,22,0.35)',  text: 'text-orange-400', glow: '0 0 24px rgba(249,115,22,0.12)' },
  medium:   { bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.35)',  text: 'text-amber-400',  glow: '0 0 24px rgba(245,158,11,0.10)' },
  low:      { bg: 'rgba(59,130,246,0.08)',  border: 'rgba(59,130,246,0.35)',  text: 'text-blue-400',   glow: '0 0 24px rgba(59,130,246,0.10)' },
  info:     { bg: 'rgba(107,114,128,0.08)', border: 'rgba(107,114,128,0.35)', text: 'text-gray-400',   glow: 'none' },
};

export function HeaderForensicsPage({ onNavigate }: { onNavigate?: (route: string) => void }) {
  const { currentResult, loadDemoCase } = useAnalysis();
  const { snapshotHeaderForensics } = useEvidence();
  const [vaultSaved, setVaultSaved] = useState(false);
  const [isSavingToVault, setIsSavingToVault] = useState(false);

  const hasLive = Boolean(currentResult && (currentResult.case_id || currentResult.verdict));
  const rawLevel = (currentResult?.alert_level || 'info').toLowerCase();
  const lc = LEVEL_COLORS[rawLevel] || LEVEL_COLORS.info;

  const subjectHeader = Array.isArray(currentResult?.headers)
    ? currentResult?.headers.find((h) => h?.key?.toLowerCase() === 'subject')?.value
    : null;

  const handleSaveHeadersToVault = async () => {
    if (!currentResult) return;
    setIsSavingToVault(true);
    try {
      const raw = currentResult?.headers?.map((h) => `${h.key}: ${h.value}`).join('\n') || '';
      const caseId = currentResult?.case_id || 'CASE-2026-LIVE';
      await snapshotHeaderForensics({
        caseId,
        rawHeaders: raw,
        summary: `RFC-5322 header snapshot for case ${caseId} with SPF/DKIM/DMARC signatures.`,
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
              <h2 className="text-2xl font-black text-white tracking-tight">Header Forensics</h2>
              <p className="text-sm text-gray-400 mt-0.5">
                Deep forensic parsing of SMTP relay hops, email authentication, and header anomalies
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {onNavigate && (
                <button
                  onClick={() => onNavigate('email-analyzer')}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 shadow-md font-mono cursor-pointer"
                  style={{
                    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                    border: '1px solid rgba(99,102,241,0.4)',
                  }}
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  <span>Back to Email Analyzer</span>
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
                  {typeof currentResult.confidence === 'number' && (
                    <span className="px-2.5 py-0.5 rounded text-[11px] font-bold text-green-300 bg-green-500/15 border border-green-500/25">
                      Confidence: {currentResult.confidence}%
                    </span>
                  )}
                </div>
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
              <Mail className="w-8 h-8 text-blue-400" />
            </div>

            <div className="max-w-md space-y-2">
              <h3 className="text-lg font-bold text-white tracking-tight">No Email Analyzed in Session</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-mono">
                Upload or paste an email in Email Analyzer to inspect raw RFC-5322 headers, cryptographic SPF/DKIM/DMARC verdicts, and SMTP relay hop telemetry.
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
                <Mail className="w-4 h-4" />
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
          <SlideIn delay={80} direction="up">
            <EmailSummary result={currentResult} />
          </SlideIn>

          <SlideIn delay={160} direction="up">
            <AuthCards result={currentResult} />
          </SlideIn>

          <SlideIn delay={240} direction="up">
            <SmtpRelayTimeline result={currentResult} />
          </SlideIn>

          <SlideIn delay={320} direction="up">
            <ExpandableHeaders result={currentResult} />
          </SlideIn>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <SlideIn delay={400} direction="left">
              <ObservedFactsPanel result={currentResult} />
            </SlideIn>
            <SlideIn delay={440} direction="right">
              <AIInferencePanel result={currentResult} />
            </SlideIn>
          </div>
        </>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   EMAIL SUMMARY
═══════════════════════════════════════════════════════════ */
function EmailSummary({ result }: { result: EmailAnalysisResult | null }) {
  const getHeader = (key: string) => {
    if (!result || !Array.isArray(result.headers)) return '';
    return result.headers.find((h) => h?.key?.toLowerCase() === key.toLowerCase())?.value ?? '';
  };

  const domain = result?.threat_intel?.domain || 'unknown';
  const caseId = result?.case_id || 'case';

  const fields = result
    ? [
        { label: 'From',        value: getHeader('from') || DEMO_EMAIL.from,     icon: Mail,      highlight: true },
        { label: 'Reply-To',    value: getHeader('reply-to') || DEMO_EMAIL.replyTo, icon: ArrowRight, highlight: true },
        { label: 'Return-Path', value: getHeader('return-path') || `<noreply@${domain}>`, icon: Mail },
        { label: 'Message-ID',  value: getHeader('message-id') || `<${caseId}@${domain}>`, icon: Mail },
        { label: 'Subject',     value: getHeader('subject') || '(no subject)',    icon: Mail },
        { label: 'Date',        value: getHeader('date') || DEMO_EMAIL.date,      icon: Clock },
      ]
    : [
        { label: 'From',        value: DEMO_EMAIL.from,    icon: Mail,      highlight: true },
        { label: 'Reply-To',    value: DEMO_EMAIL.replyTo, icon: ArrowRight, highlight: true },
        { label: 'Return-Path', value: '<finance@micros0ft-support.example>', icon: Mail },
        { label: 'Message-ID',  value: '<a7f2c8e1@mail-micros0ft-support.example>', icon: Mail },
        { label: 'Subject',     value: DEMO_EMAIL.subject, icon: Mail },
        { label: 'Date',        value: DEMO_EMAIL.date,    icon: Clock },
      ];

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
          <Mail className="w-4 h-4 text-purple-400" />
          Email Summary
        </h3>
        <p className="text-[11px] text-gray-500 mt-0.5">Key identity and routing fields extracted from the email</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {fields.map((f) => {
          const Icon = f.icon;
          return (
            <div
              key={f.label}
              className="rounded-xl p-3.5 transition-all duration-200 hover:scale-[1.01]"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1 font-medium">
                <Icon className="w-3.5 h-3.5 text-purple-400" />
                {f.label}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-mono break-all font-semibold ${f.highlight ? 'text-orange-400' : 'text-white'}`}>
                  {f.value}
                </span>
                <CopyButton value={f.value} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   AUTH CARDS (SPF / DKIM / DMARC)
═══════════════════════════════════════════════════════════ */
function AuthCards({ result }: { result: EmailAnalysisResult | null }) {
  const spf = result?.threat_intel?.spf || 'FAIL';
  const dkim = result?.threat_intel?.dkim || 'FAIL';
  const dmarc = result?.threat_intel?.dmarc || 'FAIL';
  const sendingIp = result?.threat_intel?.sending_ip || result?.origin?.sending_ip || '185.220.101.47';

  const authData = result
    ? [
        {
          name: 'SPF',
          result: spf,
          detail: spf === 'PASS'
            ? `Sending IP ${sendingIp} is authorized by the domain SPF record`
            : `Sending IP ${sendingIp} is not designated by domain SPF record`,
        },
        {
          name: 'DKIM',
          result: dkim,
          detail: dkim === 'PASS'
            ? 'DKIM signature present and verification passed'
            : 'Signature present but verification returned permerror or missing',
        },
        {
          name: 'DMARC',
          result: dmarc,
          detail: dmarc === 'PASS'
            ? 'DMARC policy aligned — sender domain is authenticated'
            : 'Neither SPF nor DKIM aligned with the From domain under DMARC policy',
        },
      ]
    : AUTH_CARDS;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {authData.map((auth) => {
        const isPass = auth.result === 'PASS';
        const isNeutral = auth.result === 'NEUTRAL' || auth.result === 'NONE';
        const Icon = isPass ? ShieldCheck : isNeutral ? ShieldAlert : ShieldX;
        const colorClass = isPass ? 'text-green-400' : isNeutral ? 'text-amber-400' : 'text-red-400';
        const bgStyle = isPass
          ? { background: 'linear-gradient(135deg, rgba(34,197,94,0.08) 0%, rgba(22,163,74,0.02) 100%)', border: '1px solid rgba(34,197,94,0.3)', boxShadow: '0 0 20px rgba(34,197,94,0.08)' }
          : isNeutral
          ? { background: 'linear-gradient(135deg, rgba(245,158,11,0.08) 0%, rgba(217,119,6,0.02) 100%)', border: '1px solid rgba(245,158,11,0.3)', boxShadow: '0 0 20px rgba(245,158,11,0.08)' }
          : { background: 'linear-gradient(135deg, rgba(239,68,68,0.08) 0%, rgba(220,38,38,0.02) 100%)', border: '1px solid rgba(239,68,68,0.3)', boxShadow: '0 0 20px rgba(239,68,68,0.08)' };
        const badgeClass = isPass
          ? 'text-green-400 bg-green-500/20 border border-green-500/30'
          : isNeutral
          ? 'text-amber-400 bg-amber-500/20 border border-amber-500/30'
          : 'text-red-400 bg-red-500/20 border border-red-500/30';
        const StatusIcon = isPass ? CheckCircle2 : isNeutral ? AlertTriangle : XCircle;
        const statusLabel = isPass ? 'Authentication passed' : isNeutral ? 'No result / neutral' : 'Authentication failed';

        return (
          <div key={auth.name} className="rounded-2xl p-5 transition-all duration-200 hover:scale-[1.01]" style={bgStyle}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold text-white tracking-wider font-mono">{auth.name}</span>
              <div className="flex items-center gap-1.5">
                <Icon className={`w-4 h-4 ${colorClass}`} />
                <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${badgeClass}`}>
                  {auth.result}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed mb-3">{auth.detail}</p>
            <div className={`flex items-center gap-1.5 text-xs ${colorClass} font-semibold`}>
              <StatusIcon className="w-3.5 h-3.5" />
              {statusLabel}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   SMTP RELAY TIMELINE
═══════════════════════════════════════════════════════════ */
function SmtpRelayTimeline({ result }: { result: EmailAnalysisResult | null }) {
  const hasHops = Array.isArray(result?.origin?.relay_hops) && result!.origin.relay_hops.length > 0;
  const relayList = hasHops
    ? result!.origin.relay_hops.map((hop, idx) => ({
        id: `hop-${idx}`,
        hop: hop?.hop ?? (idx + 1),
        hostname: hop?.hostname || 'relay.node.internal',
        ip: hop?.ip || '0.0.0.0',
        country: hop?.country || result?.origin?.country || 'Global',
        asn: result?.origin?.asn || 'AS-Unknown',
        asnOrg: result?.origin?.hosting || 'Unknown',
        timestamp: '--',
        confidence: 90,
        note: hop?.note || 'Relay node identified in Received headers',
      }))
    : SMTP_RELAYS;

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
          SMTP Relay Timeline
        </h3>
        <p className="text-[11px] text-gray-500 mt-0.5">Reconstructed mail routing path across intermediate relays</p>
      </div>
      <div className="relative pl-2">
        <div className="absolute left-[19px] top-3 bottom-3 w-0.5 bg-white/10" />
        <div className="space-y-4">
          {relayList.map((relay, i) => (
            <div key={relay.id} className="relative flex gap-4 items-start">
              <div
                className="relative z-10 w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border transition-transform hover:scale-110"
                style={
                  i === 0
                    ? { background: 'rgba(239,68,68,0.2)', borderColor: '#ef4444', color: '#f87171', boxShadow: '0 0 12px rgba(239,68,68,0.4)' }
                    : i === relayList.length - 1
                    ? { background: 'rgba(34,197,94,0.2)', borderColor: '#22c55e', color: '#4ade80', boxShadow: '0 0 12px rgba(34,197,94,0.4)' }
                    : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)', color: '#9ca3af' }
                }
              >
                <span className="text-xs font-bold font-mono">{relay.hop}</span>
              </div>
              <div
                className="flex-1 rounded-xl p-4 transition-all duration-200 hover:scale-[1.005]"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Server className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                    <span className="text-xs font-mono text-white font-bold truncate">{relay.hostname}</span>
                    <CopyButton value={relay.hostname} />
                  </div>
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold font-mono"
                    style={{
                      background: relay.confidence >= 90 ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                      color: relay.confidence >= 90 ? '#4ade80' : '#fbbf24',
                      border: `1px solid ${relay.confidence >= 90 ? 'rgba(34,197,94,0.3)' : 'rgba(245,158,11,0.3)'}`,
                    }}
                  >
                    {relay.confidence}% confidence
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mt-3 pt-3 border-t border-white/5">
                  <div>
                    <span className="text-gray-500 text-[10px] font-mono uppercase">IP Address</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="text-white font-mono font-semibold">{relay.ip}</span>
                      <CopyButton value={relay.ip} />
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] font-mono uppercase">Country</span>
                    <div className="flex items-center gap-1 text-gray-300 mt-0.5">
                      <MapPin className="w-3 h-3 text-cyan-400" /> {relay.country}
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] font-mono uppercase">ASN</span>
                    <div className="text-gray-300 font-mono mt-0.5">{relay.asn}</div>
                  </div>
                  <div>
                    <span className="text-gray-500 text-[10px] font-mono uppercase">Timestamp</span>
                    <div className="text-gray-300 font-mono text-[11px] mt-0.5">{relay.timestamp}</div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2.5 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-gray-400">ASN Org: <span className="text-white font-medium">{relay.asnOrg}</span></span>
                </div>
                <div className="mt-2 flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                  <span className="text-xs text-gray-400">{relay.note}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   DETAILED HEADERS (EXPANDABLE)
═══════════════════════════════════════════════════════════ */
function ExpandableHeaders({ result }: { result: EmailAnalysisResult | null }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['From']));
  const [allExpanded, setAllExpanded] = useState(false);

  const liveHeaders = Array.isArray(result?.headers) && result!.headers.length > 0
    ? result!.headers.map((h, idx) => ({
        key: h?.key || `Header-${idx}`,
        value: h?.value || '',
        category: (
          ['from','reply-to','to','return-path','sender'].includes((h?.key || '').toLowerCase()) ? 'identity'
          : ['received','x-originating-ip'].includes((h?.key || '').toLowerCase()) ? 'routing'
          : ['dkim-signature','authentication-results','received-spf','dmarc'].some(k => (h?.key || '').toLowerCase().includes(k)) ? 'auth'
          : ['content-type','content-transfer-encoding','mime-version'].includes((h?.key || '').toLowerCase()) ? 'content'
          : 'metadata'
        ) as ExtendedHeader['category'],
        id: `live-${idx}`,
      }))
    : EXTENDED_HEADERS;

  const toggle = (key: string) => {
    const next = new Set(expanded);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpanded(next);
  };

  const toggleAll = () => {
    if (allExpanded) {
      setExpanded(new Set());
      setAllExpanded(false);
    } else {
      setExpanded(new Set(liveHeaders.map((h) => h.key)));
      setAllExpanded(true);
    }
  };

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Server className="w-4 h-4 text-purple-400" />
            Detailed Headers
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">Full raw header analysis with category tagging and copy features</p>
        </div>
        <button
          onClick={toggleAll}
          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-gray-300 hover:text-white transition-colors"
          style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {allExpanded ? 'Collapse All' : 'Expand All'}
        </button>
      </div>
      <div className="space-y-1.5">
        {liveHeaders.map((h) => {
          const isOpen = expanded.has(h.key);
          const isLong = (h.value || '').length > 60;
          return (
            <div
              key={h.key}
              className="rounded-xl overflow-hidden transition-all duration-150"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <button
                onClick={() => toggle(h.key)}
                className="w-full flex items-center gap-2 px-3.5 py-2.5 hover:bg-white/5 transition-colors text-left"
              >
                {isOpen ? <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />}
                <span className={`text-xs font-mono font-bold ${HEADER_CATEGORY_COLOR[h.category] || 'text-gray-300'}`}>{h.key}</span>
                {!isLong && !isOpen && (
                  <span className="text-xs text-gray-400 font-mono truncate ml-2">{h.value}</span>
                )}
                <span className="ml-auto text-[10px] font-mono text-gray-500 uppercase tracking-wider px-2 py-0.5 rounded bg-white/5">
                  {h.category}
                </span>
              </button>
              {isOpen && (
                <div className="px-3.5 pb-3.5 pt-1">
                  <div className="flex items-start gap-2 rounded-xl p-3" style={{ background: '#06070a', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="text-xs font-mono text-gray-300 break-all flex-1 leading-relaxed">{h.value}</span>
                    <CopyButton value={h.value} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   OBSERVED FACTS PANEL
═══════════════════════════════════════════════════════════ */
function ObservedFactsPanel({ result }: { result: EmailAnalysisResult | null }) {
  const hasFacts = Array.isArray(result?.observed_facts) && result!.observed_facts.length > 0;
  const factList = hasFacts
    ? result!.observed_facts.map(f => ({
        id: f?.id || Math.random().toString(),
        fact: f?.field || 'Signal Observed',
        detail: f?.value || '',
        status: (f?.status || 'info') as 'fail' | 'warn' | 'info' | 'pass',
      }))
    : HEADER_FACTS;

  return (
    <div
      className="rounded-2xl p-5 h-full"
      style={{
        background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <div className="mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Eye className="w-4 h-4 text-purple-400" />
          Observed Facts
        </h3>
        <p className="text-[11px] text-gray-500 mt-0.5">Verifiable header signals extracted directly from SMTP parameters</p>
      </div>
      <div className="space-y-2">
        {factList.map((fact) => {
          const Icon = FACT_ICON[fact.status as keyof typeof FACT_ICON] || Info;
          const color = FACT_COLOR[fact.status as keyof typeof FACT_COLOR] || 'text-gray-400';
          return (
            <div
              key={fact.id}
              className="rounded-xl p-3.5 transition-all duration-200 hover:scale-[1.01]"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div className="flex items-start gap-2.5">
                <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${color}`} />
                <div>
                  <p className="text-xs font-bold text-white">{fact.fact}</p>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{fact.detail}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   AI INFERENCE PANEL
═══════════════════════════════════════════════════════════ */
function AIInferencePanel({ result }: { result: EmailAnalysisResult | null }) {
  const hasInferences = Array.isArray(result?.ai_inferences) && result!.ai_inferences.length > 0;
  const infList = hasInferences
    ? result!.ai_inferences
    : HEADER_INFERENCES;

  return (
    <div
      className="rounded-2xl p-5 h-full"
      style={{
        background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      }}
    >
      <div className="mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Brain className="w-4 h-4 text-cyan-400" />
          AI Inference
        </h3>
        <p className="text-[11px] text-gray-500 mt-0.5">Analytical interpretation based on header anomalies</p>
      </div>

      <div
        className="flex items-start gap-2.5 rounded-xl p-3 mb-4"
        style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
      >
        <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-gray-300">
          Inferences are probabilistic threat assessments — <span className="text-amber-400 font-semibold">not confirmed findings</span>.
        </p>
      </div>

      <div className="space-y-3">
        {infList.map((inf) => (
          <div
            key={inf.id || inf.inference}
            className="rounded-xl p-3.5 transition-all duration-200 hover:scale-[1.01]"
            style={{
              background: 'rgba(255,255,255,0.03)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <p className="text-xs font-bold text-white flex-1">{inf.inference}</p>
              <span className="text-xs font-mono text-white font-bold shrink-0">{inf.confidence || 0}%</span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden mb-2">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${inf.confidence || 0}%`,
                  background: (inf.confidence || 0) > 85 ? '#ef4444' : '#f97316',
                  boxShadow: `0 0 6px ${(inf.confidence || 0) > 85 ? 'rgba(239,68,68,0.5)' : 'rgba(249,115,22,0.5)'}`,
                }}
              />
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              <span className="text-gray-500 uppercase text-[10px] font-mono font-bold tracking-wider">Basis: </span>
              {inf.basis || 'Analytical correlation'}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
