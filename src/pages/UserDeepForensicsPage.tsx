import { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Download,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  Server,
  Globe,
  MapPin,
  Share2,
  FileCode,
  FileText,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Clock,
  Terminal,
  AlertOctagon,
  RefreshCw,
  Cpu,
  Eye,
  ChevronRight,
} from 'lucide-react';
import {
  EmailForensicsService,
  type DeepForensicsReport,
} from '@/services/emailForensicsService';
import { decodeMimeHeader, EmailIngestionService, DEFAULT_SEED_EMAILS } from '@/services/emailIngestionService';
import { useEmailIngestion } from '@/contexts/EmailIngestionContext';
import { GoogleAuthService } from '@/services/googleAuthService';
import { GmailIngestionService } from '@/services/gmailIngestionService';
import { exportReportAsPDF } from '@/utils/pdfExport';
import { DarkCyberMap } from '@/components/DarkCyberMap';
import { AttackGraphCanvas } from '@/components/AttackGraph';
import { GradientLiveProgressRing } from '@/components/GradientLiveProgressRing';
import { AttachmentForensicsSection } from '@/components/AttachmentForensicsSection';
import { ANALYSIS_STAGES, type AnalysisStage } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';

const ANALYSIS_STEPS = [
  { stage: 'Email',       label: 'Parsing email structure',              detail: 'Extracting headers, body, MIME parts, and attachments' },
  { stage: 'Detect',      label: 'Running detection engines',            detail: 'SPF/DKIM validation, URL reputation, homoglyph check' },
  { stage: 'Explain',     label: 'Generating risk explanation',          detail: 'Correlating signals into risk factors & confidence scores' },
  { stage: 'Trace',       label: 'Tracing origin infrastructure',        detail: 'Resolving sending IP, ASN & geo-location' },
  { stage: 'Correlate',   label: 'Correlating threat intelligence',       detail: 'Matching indicators against known campaign clusters' },
  { stage: 'Investigate', label: 'Building attack graph',                detail: 'Linking domain, IP, campaign, and recipient entities' },
  { stage: 'Preserve',    label: 'Preserving forensic evidence',         detail: 'Hashing payload SHA-256 and logging chain of custody' },
  { stage: 'Report',      label: 'Compiling forensic analysis report',   detail: 'Finalizing classification, risk score & summary' },
] as const;

interface UserDeepForensicsPageProps {
  emailId: string;
  onNavigate: (route: string, opts?: { role?: 'analyst' | 'user' }) => void;
}

export function UserDeepForensicsPage({ emailId, onNavigate }: UserDeepForensicsPageProps) {
  const { currentUser } = useAuth();
  const { emails, selectedEmail } = useEmailIngestion();
  const [report, setReport] = useState<DeepForensicsReport | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [progressStep, setProgressStep] = useState(0);
  const [activeStage, setActiveStage] = useState<AnalysisStage>('Email');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'synthesis' | 'headers' | 'threat-intel' | 'origin' | 'attack-graph' | 'attachments'>('all');

  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let mounted = true;
    setIsAnalyzing(true);
    setLoadError(null);
    setProgressStep(0);
    setActiveStage('Email');

    // Run API call and step animation concurrently matching EmailAnalyzerPage speed (700ms per step)
    const STEP_MS = 700;
    const TOTAL_STEPS = ANALYSIS_STEPS.length;

    let resolveAnimation!: () => void;
    const animationDone = new Promise<void>((res) => { resolveAnimation = res; });

    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      if (step < TOTAL_STEPS - 1) {
        if (mounted) {
          setProgressStep(step);
          setActiveStage(ANALYSIS_STEPS[step].stage as AnalysisStage);
        }
      } else {
        if (mounted) {
          setProgressStep(TOTAL_STEPS - 1);
          setActiveStage('Report');
        }
        clearInterval(interval);
        resolveAnimation();
      }
    }, STEP_MS);

    async function fetchAndAnimate() {
      try {
        let decodedTargetId = emailId;
        try { decodedTargetId = decodeURIComponent(emailId); } catch { /* ignore */ }

        let activeEmail =
          (selectedEmail && (selectedEmail.id === emailId || selectedEmail.id === decodedTargetId || selectedEmail.gmail_message_id === emailId))
            ? selectedEmail
            : emails.find((e) => e.id === emailId || e.id === decodedTargetId || e.gmail_message_id === emailId)
            || DEFAULT_SEED_EMAILS.find((e) => e.id === emailId || e.id === decodedTargetId || e.gmail_message_id === emailId);

        if (!activeEmail) {
          try {
            const loaded = await EmailIngestionService.getEmails(currentUser?.email || 'user@gmail.com');
            activeEmail = loaded.find((e) => e.id === emailId || e.id === decodedTargetId || e.gmail_message_id === emailId);
          } catch {
            // ignore
          }
        }

        const [data] = await Promise.all([
          EmailForensicsService.getFullForensics(emailId, currentUser?.email || 'user@gmail.com', activeEmail),
          animationDone,
        ]);

        // Short pause on 100% before revealing results, identical to EmailAnalyzerPage (450ms)
        await new Promise((r) => setTimeout(r, 450));

        if (mounted) {
          if (!data) {
            setLoadError('Email message not found in local or synchronized mailboxes.');
          }
          setReport(data);
          setIsAnalyzing(false);
          // Once forensic analysis has completed, clear pending SOC escalation
          EmailIngestionService.removeEscalation(emailId);
        }
      } catch (err: any) {
        clearInterval(interval);
        console.error('Failed to load deep forensics report:', err);
        if (mounted) {
          setLoadError(err?.message || 'An unexpected error occurred during forensic compilation.');
          setIsAnalyzing(false);
        }
      }
    }

    fetchAndAnimate();

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [emailId, currentUser?.email, retryCount]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const handleExportPdf = () => {
    if (report?.rawAnalysisResult) {
      exportReportAsPDF(report.rawAnalysisResult, {
        reportType: 'forensic',
        deepReport: report,
      });
    }
  };

  const [isDownloadingAttachment, setIsDownloadingAttachment] = useState(false);

  const handleDownloadAttachment = async () => {
    if (!report?.attachmentForensics) return;
    setIsDownloadingAttachment(true);
    try {
      const filename = report.attachmentForensics.filename || 'attachment.pdf';
      const filetype = report.attachmentForensics.filetype || 'application/pdf';

      // Strategy 1: If pre-extracted base64 data exists in attachments (e.g. from EML)
      const attWithData = report.attachmentForensics.allAttachments?.find(
        (a) => a.data && (a.filename.toLowerCase() === filename.toLowerCase() || a.mimeType === filetype)
      ) || report.attachmentForensics.allAttachments?.find((a) => a.data);

      if (attWithData?.data) {
        const bytes = Uint8Array.from(atob(attWithData.data.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: attWithData.mimeType || filetype });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }

      // Strategy 2: Direct Gmail API download if accessToken & attachmentId exist
      const token = GoogleAuthService.getAccessToken();
      const msgId = report.email?.gmail_message_id || report.attachmentForensics.gmailMessageId;
      const attId = report.attachmentForensics.attachmentId
        || report.attachmentForensics.allAttachments?.find((a) => a.attachmentId)?.attachmentId;

      if (token && msgId && attId) {
        try {
          await GmailIngestionService.downloadAttachment(
            token,
            msgId,
            attId,
            filename,
            filetype
          );
          return;
        } catch (e) {
          console.warn('Direct Gmail download failed, attempting EML fallback:', e);
        }
      }

      // Strategy 3: Decode base64 attachment block from raw EML (exact parity with Analyst side!)
      const rawEml: string = report.rawAnalysisResult?.raw_email || report.email?.raw_email || '';
      const b64Match = rawEml.match(
        /Content-Transfer-Encoding\s*:\s*base64[\s\S]*?\r?\n\r?\n([\s\S]+?)(?=\r?\n--|\r?\n\r?\nContent-|$)/i
      );
      if (b64Match) {
        const b64 = b64Match[1].replace(/\s/g, '');
        const bytes = Uint8Array.from(atob(b64.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
        const blob = new Blob([bytes], { type: filetype });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }

      // Strategy 4: Re-fetch live from Gmail to discover attachmentId or data
      if (token && msgId) {
        const liveAtts = await GmailIngestionService.fetchAttachmentsForMessage(token, msgId);
        const att = liveAtts?.find((a) => a.filename.toLowerCase() === filename.toLowerCase()) || liveAtts?.[0];
        if (att?.attachmentId) {
          await GmailIngestionService.downloadAttachment(token, msgId, att.attachmentId, filename, filetype);
          return;
        } else if (att?.data) {
          const bytes = Uint8Array.from(atob(att.data.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
          const blob = new Blob([bytes], { type: filetype });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          return;
        }
      }

      alert('Could not download attachment data. Please reconnect Gmail or try again.');
    } catch (err: any) {
      console.error('Attachment download failed:', err);
      alert(`Download failed: ${err?.message || 'Could not download attachment'}`);
    } finally {
      setIsDownloadingAttachment(false);
    }
  };

  if (isAnalyzing) {
    const current = ANALYSIS_STEPS[Math.min(progressStep, ANALYSIS_STEPS.length - 1)];
    const progressPercent = Math.round(((progressStep + 1) / ANALYSIS_STEPS.length) * 100);

    return (
      <div className="space-y-6 text-white pb-20 animate-fade-in" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
        {/* ── Page Header ── */}
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight">Deep Forensics</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Automated multi-stage forensic analysis and threat intelligence pipeline
          </p>
        </div>

        {/* Workflow indicator */}
        <div
          className="rounded-2xl p-4"
          style={{
            background: 'linear-gradient(145deg, #0a0d15, #080b14)',
            border: '1px solid rgba(255,255,255,0.07)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
          }}
        >
          <div className="flex items-center justify-between gap-1 overflow-x-auto scrollbar-thin pb-1">
            {ANALYSIS_STAGES.map((stage, i) => {
              const isActive = stage === activeStage;
              const isDone = ANALYSIS_STAGES.indexOf(activeStage) > i;
              return (
                <div key={stage} className="flex items-center shrink-0">
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 ${
                      isActive ? 'text-purple-300' : isDone ? 'text-green-400' : 'text-gray-500'
                    }`}
                    style={
                      isActive
                        ? { background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)', boxShadow: '0 0 12px rgba(139,92,246,0.3)' }
                        : isDone
                        ? { background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.2)' }
                        : { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }
                    }
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-purple-400 animate-pulse' : isDone ? 'bg-green-400' : 'bg-gray-600'}`} />
                    {stage}
                  </div>
                  {i < ANALYSIS_STAGES.length - 1 && (
                    <ChevronRight className={`w-3.5 h-3.5 mx-1 ${isDone ? 'text-green-500' : 'text-gray-700'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Central Analyzing View */}
        <div
          className="rounded-2xl p-8 flex flex-col items-center justify-center py-12 text-center"
          style={{
            background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        >
          <div className="mb-6">
            <GradientLiveProgressRing
              progress={progressPercent}
              sublabel={`STAGE ${progressStep + 1}/${ANALYSIS_STEPS.length}`}
            />
          </div>

          <h3 className="text-lg font-bold text-white mb-1">{current.label}</h3>
          <p className="text-xs text-gray-400 mb-8 max-w-md">{current.detail}</p>

          <div className="w-full max-w-md space-y-2">
            {ANALYSIS_STEPS.map((s, i) => {
              const isDone = i < progressStep;
              const isActive = i === progressStep;
              return (
                <div
                  key={s.stage}
                  className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-300"
                  style={{
                    background: isActive ? 'rgba(139,92,246,0.12)' : isDone ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${isActive ? 'rgba(139,92,246,0.3)' : isDone ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.04)'}`,
                  }}
                >
                  <div
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: isDone ? 'rgba(34,197,94,0.2)' : isActive ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.05)' }}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                    ) : isActive ? (
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                    ) : (
                      <div className="w-2 h-2 bg-gray-600 rounded-full" />
                    )}
                  </div>
                  <span className={`text-xs ${isDone ? 'text-gray-400' : isActive ? 'text-white font-semibold' : 'text-gray-600'}`}>
                    {s.stage} — {s.label}
                  </span>
                </div>
              );
            })}
          </div>

          <p className="text-[11px] text-gray-600 mt-6 font-mono">Calling Claude AI… this may take 10-20 seconds</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-8 text-center text-white space-y-4 max-w-md mx-auto">
        <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
        <h2 className="text-lg font-bold">Email Forensic Dossier Not Found</h2>
        {loadError && (
          <p className="text-xs text-rose-400/90 font-mono bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5">
            {loadError}
          </p>
        )}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => {
              setReport(null);
              setIsAnalyzing(true);
              setLoadError(null);
              setRetryCount((c) => c + 1);
            }}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Retry Analysis
          </button>
          <button
            onClick={() => onNavigate('emails', { role: 'user' })}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors"
          >
            Back to Ingested Emails
          </button>
        </div>
      </div>
    );
  }

  const { email, threatLevel, threatScore, confidence, aiSynthesis, headerForensics, threatIntel, origin, attachmentForensics } = report;

  return (
    <div className="space-y-6 text-white pb-20 animate-fade-in">
      {/* ── Top Header Navigation Bar ────────────────────────────────────────── */}
      <div className="p-5 rounded-2xl bg-[#11121b] border border-white/10 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => {
              EmailIngestionService.removeEscalation(emailId);
              onNavigate('emails', { role: 'user' });
            }}
            className="p-2 rounded-xl bg-transparent hover:bg-white/10 text-gray-400 hover:text-white transition-colors shrink-0 flex items-center justify-center cursor-pointer"
            title="Back to Emails"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-white/10 text-cyan-300 border border-white/10">
                {report.caseId}
              </span>
              <span className="text-[11px] text-gray-400">
                {new Date(report.analyzedAt).toLocaleString()}
              </span>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Read-Only Forensic Report
              </span>
            </div>
            <h1 className="text-xl font-black text-white truncate max-w-2xl">
              {decodeMimeHeader(email.subject)}
            </h1>
            <p className="text-xs text-gray-400 truncate">
              From: <span className="text-gray-200">{decodeMimeHeader(email.sender_name ? `${email.sender_name} <${email.sender}>` : email.sender)}</span>
            </p>
          </div>
        </div>

        {/* Action buttons & threat badge */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="h-11 px-3.5 flex items-center gap-3 rounded-xl bg-black/50 border border-white/10">
            <div className="text-right">
              <div
                className={`text-base font-bold font-mono leading-none ${threatLevel === 'malicious'
                  ? 'text-red-400'
                  : threatLevel === 'suspicious'
                    ? 'text-amber-400'
                    : 'text-emerald-400'
                  }`}
              >
                {threatScore}/100
              </div>
              <div className="text-[8.5px] uppercase tracking-widest text-gray-400 font-mono mt-1 leading-none">
                THREAT SCORE
              </div>
            </div>
            <div className="w-px h-6 bg-white/15" />
            <div className="flex items-center gap-1.5 pl-0.5">
              {threatLevel === 'malicious' ? (
                <>
                  <ShieldAlert className="w-4 h-4 text-red-400" />
                  <span className="text-xs font-bold font-mono tracking-wider text-red-400 uppercase">
                    MALICIOUS
                  </span>
                </>
              ) : threatLevel === 'suspicious' ? (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold font-mono tracking-wider text-amber-400 uppercase">
                    SUSPICIOUS
                  </span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold font-mono tracking-wider text-emerald-400 uppercase">
                    CLEAN
                  </span>
                </>
              )}
            </div>
          </div>

          <button
            onClick={handleExportPdf}
            className="h-10 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-purple-900/30 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            title="Download complete forensic PDF dossier"
          >
            <Download className="w-4 h-4" />
            Export PDF
          </button>
        </div>
      </div>

      {/* ── Quick Navigation Tabs ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-3 scrollbar-none border-b border-white/10">
        {[
          { id: 'all', label: 'Complete Forensic Report', icon: Shield },
          { id: 'synthesis', label: 'AI Synthesis', icon: Sparkles },
          { id: 'headers', label: 'Header Forensics', icon: FileCode },
          { id: 'threat-intel', label: 'Threat Intelligence', icon: Globe },
          { id: 'origin', label: 'Origin GeoIP', icon: MapPin },
          { id: 'attack-graph', label: 'Attack Graph', icon: Share2 },
          { id: 'attachments', label: 'Attachment & Payload', icon: FileText },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${active
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'bg-white/[0.02] text-gray-400 hover:text-white hover:bg-white/[0.05] border border-white/5'
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1: AI SYNTHESIS & RISK NARRATIVE
      ══════════════════════════════════════════════════════════════════════ */}
      {(activeTab === 'all' || activeTab === 'synthesis') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              1. Final AI Synthesis & Plain-Language Risk Narrative
            </h2>
            <span className="text-xs text-gray-500">Confidence: {confidence}%</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Executive Summary & Narrative */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-[#11121b] border border-white/10 space-y-4">
              <div>
                <div className="text-[11px] text-cyan-400 uppercase tracking-wider font-semibold mb-1">
                  Executive AI Summary
                </div>
                <p className="text-sm text-gray-200 leading-relaxed font-sans font-medium">
                  {aiSynthesis.executiveSummary}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-black/40 border border-white/5 space-y-2">
                <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <Eye className="w-4 h-4" />
                  Plain-Language Risk Explanation
                </div>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {aiSynthesis.riskNarrative}
                </p>
              </div>
            </div>

            {/* Mitigation Checklist */}
            <div className="p-5 rounded-2xl bg-[#11121b] border border-white/10 space-y-3">
              <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                User Mitigation Checklist
              </div>
              <div className="space-y-2.5">
                {aiSynthesis.mitigationChecklist.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-white/[0.03] border border-white/5 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        {item.action}
                      </span>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${item.urgency === 'immediate'
                          ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                          : item.urgency === 'recommended'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                      >
                        {item.urgency}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 pl-5">{item.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2: HEADER FORENSICS & HOP RELAYS
      ══════════════════════════════════════════════════════════════════════ */}
      {(activeTab === 'all' || activeTab === 'headers') && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
            <FileCode className="w-4 h-4 text-cyan-400" />
            2. Header Forensics & Hop-by-Hop Authentication
          </h2>

          {/* Authentication Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {[
              { title: 'SPF Verification', val: headerForensics.spf.status, detail: headerForensics.spf.detail },
              { title: 'DKIM Signature', val: headerForensics.dkim.status, detail: headerForensics.dkim.detail },
              { title: 'DMARC Alignment', val: headerForensics.dmarc.status, detail: headerForensics.dmarc.detail },
              {
                title: 'Return-Path Alignment',
                val: headerForensics.isReturnPathAligned ? 'ALIGNED' : 'MISMATCH',
                detail: headerForensics.isReturnPathAligned ? 'Matches From domain' : `Diverts to: ${headerForensics.returnPath}`,
              },
            ].map((auth, i) => {
              const pass = auth.val === 'PASS' || auth.val === 'ALIGNED';
              return (
                <div key={i} className="p-4 rounded-2xl bg-[#11121b] border border-white/10 space-y-1.5">
                  <div className="text-xs text-gray-400">{auth.title}</div>
                  <div className="flex items-center gap-2">
                    {pass ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span
                      className={`text-sm font-black ${pass ? 'text-emerald-400' : 'text-red-400'
                        }`}
                    >
                      {auth.val}
                    </span>
                  </div>
                  <div className="text-[11px] text-gray-400 line-clamp-2">{auth.detail}</div>
                </div>
              );
            })}
          </div>

          {/* Hop-by-Hop Relay Route Table */}
          <div className="p-5 rounded-2xl bg-[#11121b] border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <Server className="w-4 h-4 text-purple-400" />
                SMTP Relay Route Hop Breakdown
              </h3>
              <span className="text-[11px] text-gray-500">{headerForensics.hops.length} Network Hops Traced</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-gray-400 uppercase text-[10px]">
                    <th className="py-2.5 px-3">Hop</th>
                    <th className="py-2.5 px-3">Server IP & Reverse DNS</th>
                    <th className="py-2.5 px-3">Location</th>
                    <th className="py-2.5 px-3">Latency</th>
                    <th className="py-2.5 px-3">Ingress Classification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {headerForensics.hops.map((hop) => (
                    <tr key={hop.hop} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-3 font-bold text-cyan-400">#{hop.hop}</td>
                      <td className="py-3 px-3">
                        <div className="font-mono text-white font-semibold">{hop.ip}</div>
                        <div className="text-[11px] text-gray-400 font-mono">{hop.reverseDns}</div>
                      </td>
                      <td className="py-3 px-3 text-gray-300 font-sans">{hop.location}</td>
                      <td className="py-3 px-3 text-gray-400">{hop.delay}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${hop.status === 'malicious'
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : hop.status === 'suspicious'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : hop.status === 'internal'
                                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                        >
                          {hop.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3: THREAT INTELLIGENCE & REPUTATION
      ══════════════════════════════════════════════════════════════════════ */}
      {(activeTab === 'all' || activeTab === 'threat-intel') && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            3. Threat Intelligence & External Blacklists
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Reputation Overview */}
            <div className="p-5 rounded-2xl bg-[#11121b] border border-white/10 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Entity Reputation Assessment
              </h3>

              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-gray-400">Sending IP Reputation</div>
                    <div className="text-xs font-mono font-bold text-white">{threatIntel.sendingIp}</div>
                  </div>
                  <span
                    className={`text-xs uppercase font-bold px-2.5 py-1 rounded ${threatIntel.ipReputation === 'malicious'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : threatIntel.ipReputation === 'suspicious'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                  >
                    {threatIntel.ipReputation}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                  <div>
                    <div className="text-[11px] text-gray-400">Sender Domain Age</div>
                    <div className="text-xs font-semibold text-white">{threatIntel.domain}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-cyan-300">
                      {threatIntel.domainAgeDays} days
                    </span>
                    <div className="text-[10px] text-gray-400">
                      {threatIntel.domainAgeDays < 30 ? 'High Risk (<30d)' : 'Established'}
                    </div>
                  </div>
                </div>
              </div>

              {threatIntel.threatTags.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <div className="text-[11px] text-gray-400">Threat Classification Tags:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {threatIntel.threatTags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-[10px] font-medium px-2 py-0.5 rounded bg-white/10 text-gray-200 border border-white/10"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Blacklists Grid */}
            <div className="lg:col-span-2 p-5 rounded-2xl bg-[#11121b] border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  6-Engine Reputation & Blacklist Scanner
                </h3>
                <span className="text-[10px] text-gray-500">Live Feeds Queried</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {threatIntel.blacklists.map((bl, i) => {
                  const isClean = bl.status === 'clean';
                  return (
                    <div
                      key={i}
                      className="p-3 rounded-xl bg-black/30 border border-white/5 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold text-white">{bl.engine}</div>
                        <div className="text-[11px] text-gray-400">{bl.detail}</div>
                      </div>
                      <span
                        className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded shrink-0 ${isClean
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : bl.status === 'warning'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-red-500/20 text-red-300 border border-red-500/30'
                          }`}
                      >
                        {bl.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4: ORIGIN INVESTIGATION & GEOIP MAP
      ══════════════════════════════════════════════════════════════════════ */}
      {(activeTab === 'all' || activeTab === 'origin') && (
        <div className="space-y-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-cyan-400" />
            4. Origin Investigation & Infrastructure Geolocation
          </h2>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Telemetry info */}
            <div className="p-5 rounded-2xl bg-[#11121b] border border-white/10 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Physical & Autonomous Origin
              </h3>

              <div className="space-y-3 text-xs">
                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <div className="text-[10px] text-gray-400 uppercase">Originating Public IP</div>
                  <div className="font-bold text-cyan-300 font-mono text-sm tracking-wide">
                    {origin.sendingIp}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <div className="text-[10px] text-gray-400 uppercase">Originating Location</div>
                  <div className="font-bold text-white text-sm">
                    {origin.city}, {origin.country}
                  </div>
                  <div className="text-[11px] font-mono text-cyan-400 mt-0.5">
                    Lat: {origin.latitude.toFixed(4)}, Lng: {origin.longitude.toFixed(4)}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <div className="text-[10px] text-gray-400 uppercase">Routing Autonomous System</div>
                  <div className="font-bold text-white truncate">{origin.asn}</div>
                </div>

                <div className="p-3 rounded-xl bg-black/40 border border-white/5">
                  <div className="text-[10px] text-gray-400 uppercase">Hosting Infrastructure</div>
                  <div className="font-bold text-white">{origin.hostingProvider}</div>
                </div>
              </div>
            </div>

            {/* Dark Cyber Map */}
            <div className="lg:col-span-2 rounded-2xl border border-white/10 overflow-hidden bg-[#0a0b10]">
              <DarkCyberMap
                markers={[origin.mapMarker]}
                height="320px"
                singlePointerMode={true}
              />
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 5: ATTACK GRAPH (INTERACTIVE & READ-ONLY)
      ══════════════════════════════════════════════════════════════════════ */}
      {(activeTab === 'all' || activeTab === 'attack-graph') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-cyan-400" />
              5. Interactive Attack Graph Topology (Read-Only)
            </h2>
            <span className="text-[11px] text-gray-500">Attacker → Relays → Gateway → Target</span>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0d0e16] overflow-hidden shadow-xl">
            <AttackGraphCanvas
              result={report.rawAnalysisResult}
              height={440}
              showHeader={false}
            />
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 6: ATTACHMENT & PAYLOAD FORENSICS
      ══════════════════════════════════════════════════════════════════════ */}
      {(activeTab === 'all' || activeTab === 'attachments') && (
        <AttachmentForensicsSection
          attachmentForensics={attachmentForensics}
          rawAnalysisResult={report?.rawAnalysisResult}
          email={email}
          sectionTitle="Attachment Forensics & Embedded Payload Analysis"
          sectionPrefix="6."
        />
      )}
    </div>
  );
}
