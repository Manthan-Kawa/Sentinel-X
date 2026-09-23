import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react';
import {
  Upload,
  FileText,
  Mail,
  MailSearch,
  ShieldAlert,
  ShieldCheck,
  ChevronRight,
  AlertTriangle,
  Eye,
  Brain,
  CheckCircle2,
  XCircle,
  Info,
  Clock,
  Server,
  FileSearch,
  ArrowRight,
  Sparkles,
  Zap,
  RefreshCw,
  Settings,
  Target,
  MapPin,
  Share2,
  Lock,
  AlertOctagon,
  FileDown,
  Printer,
  Database,
  Archive,
} from 'lucide-react';
import {
  ANALYSIS_STAGES,
  DEMO_EMAIL,
  type AnalysisStage,
} from '@/data/mockData';
import { AnimatedCircleGauge } from '@/components/AnimatedCircleGauge';
import { GradientLiveProgressRing } from '@/components/GradientLiveProgressRing';
import {
  analyzeEmail,
  type EmailAnalysisResult,
  type AlertLevel,
  CLAUDE_KEY_STORAGE,
} from '@/services/claudeService';
import { useAnalysis } from '@/contexts/AnalysisContext';
import { useEvidence } from '@/contexts/EvidenceContext';
import { useCampaigns } from '@/contexts/CampaignContext';
import { exportReportAsPDF, downloadTextReport } from '@/utils/pdfExport';

type AnalyzerState = 'idle' | 'analyzing' | 'results' | 'error';

// ─── Severity colours ─────────────────────────────────────────────────────────
const SEVERITY_BADGE: Record<AlertLevel, string> = {
  critical: 'badge-critical',
  high: 'badge-high',
  medium: 'badge-medium',
  low: 'badge-low',
  info: 'badge-info',
};

const FACT_ICON = {
  fail: XCircle,
  pass: CheckCircle2,
  warn: AlertTriangle,
  info: Info,
} as const;

const FACT_COLOR = {
  fail: 'text-red-400',
  pass: 'text-green-400',
  warn: 'text-amber-400',
  info: 'text-gray-400',
} as const;

const ALERT_COLORS: Record<AlertLevel, { bg: string; border: string; text: string; glow: string }> = {
  critical: { bg: 'rgba(239,68,68,0.08)',    border: 'rgba(239,68,68,0.3)',    text: 'text-red-400',    glow: 'rgba(239,68,68,0.15)' },
  high:     { bg: 'rgba(249,115,22,0.08)',   border: 'rgba(249,115,22,0.3)',   text: 'text-orange-400', glow: 'rgba(249,115,22,0.1)' },
  medium:   { bg: 'rgba(245,158,11,0.08)',   border: 'rgba(245,158,11,0.3)',   text: 'text-amber-400',  glow: 'rgba(245,158,11,0.08)' },
  low:      { bg: 'rgba(59,130,246,0.08)',   border: 'rgba(59,130,246,0.3)',   text: 'text-blue-400',   glow: 'rgba(59,130,246,0.08)' },
  info:     { bg: 'rgba(107,114,128,0.08)',  border: 'rgba(107,114,128,0.3)',  text: 'text-gray-400',   glow: 'rgba(107,114,128,0.05)' },
};

// Gauge gradient colours keyed by alert level
const GAUGE_COLORS: Record<AlertLevel, [string, string, string]> = {
  critical: ['#f87171', '#ef4444', '#b91c1c'],
  high:     ['#fb923c', '#f97316', '#c2410c'],
  medium:   ['#fcd34d', '#f59e0b', '#b45309'],
  low:      ['#60a5fa', '#3b82f6', '#1d4ed8'],
  info:     ['#9ca3af', '#6b7280', '#4b5563'],
};

const GAUGE_LABEL: Record<AlertLevel, string> = {
  critical: 'CRITICAL RISK',
  high:     'HIGH RISK',
  medium:   'MEDIUM RISK',
  low:      'LOW RISK',
  info:     'INFO',
};

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

// ─── Build a raw text string from the DEMO_EMAIL mock object ─────────────────
function buildDemoRawEmail(): string {
  const hdrs = DEMO_EMAIL.headers.map((h) => `${h.key}: ${h.value}`).join('\n');
  return `${hdrs}\n\n${DEMO_EMAIL.bodyPreview}`;
}

/* ════════════════════════════════════════════════════════════
   MAIN PAGE COMPONENT
════════════════════════════════════════════════════════════ */
export function EmailAnalyzerPage({ onNavigate }: { onNavigate?: (route: string) => void }) {
  const { currentResult, addAnalysisResult, resetActiveAnalysis } = useAnalysis();
  const { clearVault } = useEvidence();
  const { clearCampaigns } = useCampaigns();

  const [state, setState] = useState<AnalyzerState>(() => (currentResult ? 'results' : 'idle'));
  const [userRequestedIdle, setUserRequestedIdle] = useState(false);
  const [activeStage, setActiveStage] = useState<AnalysisStage>('Email');
  const [progressStep, setProgressStep] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(() => {
    if (!currentResult) return null;
    const subj = currentResult.headers.find(h => h.key.toLowerCase() === 'subject')?.value;
    return subj ? `${subj}.eml` : `${currentResult.case_id}.eml`;
  });
  const [pastedEmail, setPastedEmail] = useState('');
  const [activeTab, setActiveTab] = useState<'facts' | 'inference' | 'headers' | 'raw'>('facts');
  const [result, setResult] = useState<EmailAnalysisResult | null>(() => currentResult ?? null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [tabIndicatorStyle, setTabIndicatorStyle] = useState<{
    left: number;
    width: number;
    opacity: number;
  }>({ left: 0, width: 0, opacity: 0 });

  useLayoutEffect(() => {
    const updateIndicator = () => {
      const currentTabEl = tabRefs.current[activeTab];
      if (currentTabEl) {
        setTabIndicatorStyle({
          left: currentTabEl.offsetLeft,
          width: currentTabEl.offsetWidth,
          opacity: 1,
        });
      } else {
        setTabIndicatorStyle((prev) => ({ ...prev, opacity: 0 }));
      }
    };
    updateIndicator();
    const rafId = requestAnimationFrame(updateIndicator);
    window.addEventListener('resize', updateIndicator);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', updateIndicator);
    };
  }, [activeTab]);

  // Keep state synced with currentResult from AnalysisContext across navigation
  useEffect(() => {
    if (currentResult && !userRequestedIdle) {
      setResult(currentResult);
      setState('results');
      setFileName((prev) => {
        if (prev) return prev;
        const subj = currentResult.headers.find(h => h.key.toLowerCase() === 'subject')?.value;
        return subj ? `${subj}.eml` : `${currentResult.case_id}.eml`;
      });
    }
  }, [currentResult, userRequestedIdle]);


  // ── Run analysis: drives the progress animation while API call happens ─────
  const runAnalysis = useCallback(async (rawText: string) => {
    if (!rawText.trim()) return;

    // Clear the "user requested idle" flag so context sync works again after analysis
    setUserRequestedIdle(false);
    setState('analyzing');
    setActiveStage('Email');
    setProgressStep(0);
    setError(null);
    setResult(null);

    // Run API call and step animation concurrently.
    // The animation always runs the full step sequence (~1400ms × 8 steps ≈ 11s).
    // If the API finishes early we wait for the last animation step before showing results.
    const STEP_MS = 700;
    const TOTAL_STEPS = ANALYSIS_STEPS.length;

    // Promise that resolves after the full animation has completed
    let resolveAnimation!: () => void;
    const animationDone = new Promise<void>((res) => { resolveAnimation = res; });

    let step = 0;
    const interval = setInterval(() => {
      step += 1;
      if (step < TOTAL_STEPS - 1) {
        setProgressStep(step);
        setActiveStage(ANALYSIS_STEPS[step].stage as AnalysisStage);
      } else {
        // Reached last step
        setProgressStep(TOTAL_STEPS - 1);
        setActiveStage('Report');
        clearInterval(interval);
        resolveAnimation();
      }
    }, STEP_MS);

    try {
      const [analysisResult] = await Promise.all([
        analyzeEmail(rawText),
        animationDone,
      ]);

      // Short pause on 100% before revealing results
      await new Promise((r) => setTimeout(r, 450));

      setResult(analysisResult);
      addAnalysisResult(analysisResult);
      setState('results');
    } catch (err) {
      clearInterval(interval);
      const msg = (err as Error).message ?? 'Unknown error';
      setError(msg);
      setState('error');
    }
  }, [addAnalysisResult]);



  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) ?? '';
      runAnalysis(text);
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  };

  const handleDemo = () => {
    setFileName('demo-bec-email.eml');
    setPastedEmail(buildDemoRawEmail());
  };

  const reset = () => {
    // Mark that the user deliberately wants the idle/upload view.
    // This prevents the context-sync effect from immediately flipping back to results.
    setUserRequestedIdle(true);
    setState('idle');
    setFileName(null);
    setPastedEmail('');
    setActiveStage('Email');
    setProgressStep(0);
    setActiveTab('facts');
    setResult(null);
    setError(null);
    resetActiveAnalysis();
    clearVault();
    clearCampaigns();
  };

  return (
    <div className="space-y-6" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Page Header ── */}
      <SlideIn delay={0} direction="down">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Email Analyzer</h2>
          <p className="text-sm text-slate-600 dark:text-gray-400 mt-0.5">
            Upload, paste, or load a demo email to begin forensic analysis
          </p>
        </div>
      </SlideIn>

      {/* Workflow indicator */}
      {state !== 'idle' && state !== 'error' && (
        <SlideIn delay={100} direction="down">
          <div
            className="rounded-2xl p-4 bg-white dark:bg-[#090b12] border border-slate-200 dark:border-white/[0.07] shadow-sm dark:shadow-[0_4px_24px_rgba(0,0,0,0.5)]"
          >
            <div className="flex items-center justify-between gap-1 overflow-x-auto scrollbar-none no-scrollbar touch-scroll pb-1">
              {ANALYSIS_STAGES.map((stage, i) => {
                const isActive = stage === activeStage;
                const isDone = state === 'results' || (state === 'analyzing' && ANALYSIS_STAGES.indexOf(activeStage) > i);
                return (
                  <div key={stage} className="flex items-center shrink-0">
                    <div
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-300 ${
                        isActive
                          ? 'text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-500/20 border border-purple-300 dark:border-purple-500/40 shadow-sm dark:shadow-[0_0_12px_rgba(139,92,246,0.3)]'
                          : isDone
                          ? 'text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20'
                          : 'text-slate-500 dark:text-gray-500 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.05]'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-purple-600 dark:bg-purple-400 animate-pulse' : isDone ? 'bg-green-600 dark:bg-green-400' : 'bg-slate-300 dark:bg-gray-600'}`} />
                      {stage}
                    </div>
                    {i < ANALYSIS_STAGES.length - 1 && (
                      <ChevronRight className={`w-3.5 h-3.5 mx-1 ${isDone ? 'text-green-600 dark:text-green-500' : 'text-slate-300 dark:text-gray-700'}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </SlideIn>
      )}

      {/* ── State Views ── */}
      {(state === 'idle' || (state === 'results' && !result)) && (
        <IdleView
          dragOver={dragOver}
          setDragOver={setDragOver}
          handleDrop={handleDrop}
          fileInputRef={fileInputRef}
          handleFile={handleFile}
          onDemo={handleDemo}
          pastedEmail={pastedEmail}
          setPastedEmail={setPastedEmail}
          onAnalyzePasted={() => runAnalysis(pastedEmail)}
        />
      )}

      {state === 'analyzing' && <AnalyzingView step={progressStep} />}

      {state === 'error' && (
        <ErrorView
          error={error ?? 'Unknown error'}
          onRetry={reset}
          onSettings={() => onNavigate?.('settings')}
        />
      )}

      {state === 'results' && result && (
        <ResultsView
          result={result}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          fileName={fileName}
          onReset={reset}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   IDLE VIEW
═══════════════════════════════════════════════════════════ */
function IdleView({
  dragOver, setDragOver, handleDrop, fileInputRef, handleFile,
  onDemo, pastedEmail, setPastedEmail, onAnalyzePasted,
}: {
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  handleDrop: (e: React.DragEvent) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFile: (f: File) => void;
  onDemo: () => void;
  pastedEmail: string;
  setPastedEmail: (s: string) => void;
  onAnalyzePasted: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* ── Drag & Drop Area ── */}
      <SlideIn delay={100} direction="up">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative rounded-2xl py-8 sm:py-14 px-4 sm:px-6 text-center cursor-pointer transition-all duration-300 group border-2 border-dashed ${
            dragOver
              ? 'bg-purple-500/10 border-purple-500 shadow-[0_0_30px_rgba(139,92,246,0.2)]'
              : 'bg-white dark:bg-[#090b12] border-slate-300 dark:border-white/10 shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] hover:border-purple-400 dark:hover:border-purple-500/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".eml,.msg,.txt,.EML,.MSG,.TXT,message/rfc822,text/plain"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <div
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 transition-all duration-300 group-hover:scale-110"
            style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.25) 0%, rgba(91,33,182,0.15) 100%)',
              border: '1px solid rgba(139,92,246,0.4)',
              boxShadow: '0 0 20px rgba(124,58,237,0.25)',
            }}
          >
            <Upload className="w-6 h-6 sm:w-7 sm:h-7 text-purple-600 dark:text-purple-400" />
          </div>
          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white mb-1">Drag & drop .EML file here</h3>
          <p className="text-xs text-slate-600 dark:text-gray-500 font-medium">or click to browse — or paste raw email below</p>
        </div>
      </SlideIn>

      {/* ── Action Buttons Row ── */}
      <SlideIn delay={180} direction="up">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <button
            onClick={onDemo}
            className="flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl text-xs font-bold text-purple-700 dark:text-purple-200 bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-500/45 transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-md active:scale-[0.98] cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            Load Demo BEC Email
          </button>

          <button
            onClick={onAnalyzePasted}
            disabled={!pastedEmail.trim()}
            className="flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl text-xs font-bold text-slate-700 dark:text-gray-300 hover:text-black dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-white/5 border border-slate-200 dark:border-white/10 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <Zap className="w-4 h-4 text-slate-500 dark:text-gray-400" />
            Analyze Pasted Email
          </button>
        </div>
      </SlideIn>

      {/* ── Paste Raw Email Section ── */}
      <SlideIn delay={260} direction="up">
        <div className="space-y-2">
          <p className="text-[11px] font-mono text-slate-600 dark:text-gray-500 uppercase tracking-widest font-semibold">
            PASTE RAW EMAIL
          </p>
          <div
            className="rounded-2xl p-1 overflow-hidden bg-white dark:bg-[#090b12] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          >
            <textarea
              value={pastedEmail}
              onChange={(e) => setPastedEmail(e.target.value)}
              placeholder="Paste raw email headers and body here..."
              rows={8}
              className="w-full bg-transparent p-4 text-xs text-slate-900 dark:text-gray-200 placeholder-slate-400 dark:placeholder-gray-600 focus:outline-none resize-none scrollbar-thin"
            />
          </div>
        </div>
      </SlideIn>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ANALYZING VIEW
═══════════════════════════════════════════════════════════ */
function AnalyzingView({ step }: { step: number }) {
  const current = ANALYSIS_STEPS[Math.min(step, ANALYSIS_STEPS.length - 1)];
  const progressPercent = Math.round(((step + 1) / ANALYSIS_STEPS.length) * 100);

  return (
    <div
      className="rounded-2xl p-8 flex flex-col items-center justify-center py-12 text-center bg-white dark:bg-[#090b12] border border-slate-200 dark:border-transparent shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
    >
      <div className="mb-6">
        <GradientLiveProgressRing
          progress={progressPercent}
          sublabel={`STAGE ${step + 1}/${ANALYSIS_STEPS.length}`}
        />
      </div>

      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{current.label}</h3>
      <p className="text-xs text-slate-600 dark:text-gray-400 mb-8 max-w-md">{current.detail}</p>

      <div className="w-full max-w-md space-y-2">
        {ANALYSIS_STEPS.map((s, i) => {
          const isDone = i < step;
          const isActive = i === step;
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
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 dark:text-green-400" />
                ) : isActive ? (
                  <div className="w-2 h-2 bg-purple-500 dark:bg-purple-400 rounded-full animate-pulse" />
                ) : (
                  <div className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full" />
                )}
              </div>
              <span className={`text-xs ${isDone ? 'text-slate-500 dark:text-gray-400' : isActive ? 'text-slate-900 dark:text-white font-semibold' : 'text-slate-400 dark:text-gray-600'}`}>
                {s.stage} — {s.label}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-500 dark:text-gray-600 mt-6 font-mono">Calling Claude AI… this may take 10-20 seconds</p>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   ERROR VIEW
═══════════════════════════════════════════════════════════ */
function ErrorView({ error, onRetry }: { error: string; onRetry: () => void; onSettings: () => void }) {
  const isMissingKey = error === 'GEMINI_KEY_MISSING';
  const displayMsg = isMissingKey
    ? 'Gemini API key is not configured. Add VITE_GEMINI_API_KEY to your .env file and restart the dev server.'
    : error;

  return (
    <div
      className="rounded-2xl p-8 flex flex-col items-center text-center gap-5 bg-white dark:bg-[#090b12] border border-red-200 dark:border-red-500/20 shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
    >
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)' }}
      >
        <ShieldAlert className="w-8 h-8 text-red-500 dark:text-red-400" />
      </div>

      <div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2">Analysis Failed</h3>
        <p className="text-xs text-slate-600 dark:text-gray-400 max-w-md leading-relaxed font-mono whitespace-pre-wrap">{displayMsg}</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105"
          style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)' }}
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white transition-all"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          ← New Email
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   RESULTS VIEW
═══════════════════════════════════════════════════════════ */
function ResultsView({
  result, activeTab, setActiveTab, fileName, onReset, onNavigate,
}: {
  result: EmailAnalysisResult;
  activeTab: 'facts' | 'inference' | 'headers' | 'raw';
  setActiveTab: (t: 'facts' | 'inference' | 'headers' | 'raw') => void;
  fileName: string | null;
  onReset: () => void;
  onNavigate?: (route: string) => void;
}) {
  const ac = ALERT_COLORS[result.alert_level];
  const gaugeColors = GAUGE_COLORS[result.alert_level];
  const gaugeLabel = GAUGE_LABEL[result.alert_level];

  return (
    <div className="space-y-6">

      {/* ── Risk Summary Banner ── */}
      <SlideIn delay={80} direction="up">
        <div
          className="rounded-2xl overflow-hidden bg-white dark:bg-[#090b12] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
        >
          <div className="grid grid-cols-1 lg:grid-cols-4">

            {/* Score Gauge */}
            <div
              className="lg:col-span-1 p-6 flex flex-col items-center justify-center border-b lg:border-b-0 lg:border-r border-slate-200 dark:border-white/10 bg-slate-50/60 dark:bg-transparent"
            >
              <AnimatedCircleGauge
                score={result.threat_score}
                label={gaugeLabel}
                gradientColors={gaugeColors}
              />
            </div>

            {/* Email info */}
            <div className="lg:col-span-2 p-6 space-y-3">
              {/* Meta pills */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold uppercase ${ac.text}`}
                  style={{ background: ac.bg, border: `1px solid ${ac.border}` }}>
                  {result.alert_level}
                </span>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold text-orange-700 dark:text-orange-400 bg-orange-500/10 dark:bg-orange-500/20 border border-orange-500/30">
                  {result.verdict}
                </span>
                <span className="px-2.5 py-0.5 rounded text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/30">
                  Confidence: {result.confidence}%
                </span>
              </div>

              {/* Case / Campaign IDs */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-[11px] font-mono text-slate-500 dark:text-gray-500 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> {result.case_id}
                </span>
                <span className="text-[11px] font-mono text-slate-500 dark:text-gray-500 flex items-center gap-1">
                  <Target className="w-3 h-3" /> {result.campaign_id}
                </span>
              </div>

              {/* Summary */}
              <p className="text-xs text-slate-700 dark:text-gray-300 leading-relaxed font-sans">{result.summary}</p>

              {/* Threat intel quick stats */}
              <div className="flex flex-wrap items-center gap-4 text-xs pt-1">
                {result.threat_intel?.sending_ip && (
                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-gray-500 font-mono">
                    <Server className="w-3.5 h-3.5" /> {result.threat_intel.sending_ip}
                  </span>
                )}
                {result.threat_intel?.domain && (
                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-gray-500 font-mono">
                    <MapPin className="w-3.5 h-3.5" /> {result.threat_intel.domain}
                  </span>
                )}
                {fileName && (
                  <span className="flex items-center gap-1.5 text-slate-500 dark:text-gray-500">
                    <FileText className="w-3.5 h-3.5" /> {fileName}
                  </span>
                )}
              </div>

              {/* Auth badges */}
              <div className="flex items-center gap-2 pt-1">
                {(['spf','dkim','dmarc'] as const).map((k) => {
                  const val = result.threat_intel?.[k] || 'UNKNOWN';
                  const isPass = val === 'PASS';
                  return (
                    <span
                      key={k}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${isPass ? 'text-green-700 dark:text-green-400 bg-green-500/10 border border-green-500/25' : 'text-red-700 dark:text-red-400 bg-red-500/10 border border-red-500/25'}`}
                    >
                      {k.toUpperCase()} {val}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Actions */}
            <div
              className="lg:col-span-1 p-6 flex flex-col gap-2.5 justify-center border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-white/10"
            >
              <button
                onClick={() => onNavigate?.('reports')}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white transition-transform duration-150 ease-out active:scale-95 shadow-xl cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #6366f1 100%)',
                  border: '1px solid rgba(192, 132, 252, 0.6)',
                  boxShadow: '0 4px 20px rgba(147, 51, 234, 0.4)',
                }}
              >
                <Printer className="w-4 h-4 text-purple-200" />
                View Report
              </button>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('header-forensics')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 dark:text-gray-300 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 transition-transform duration-150 ease-out active:scale-95 cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  Header Forensics
                </button>
              )}
              <button
                onClick={onReset}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white transition-transform duration-150 ease-out active:scale-95 shadow-md cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  boxShadow: '0 4px 16px rgba(59, 130, 246, 0.3)',
                  border: '1px solid rgba(99, 102, 241, 0.4)',
                }}
              >
                <MailSearch className="w-4 h-4" />
                New Analysis
              </button>
            </div>
          </div>
        </div>
      </SlideIn>

      {/* ── Risk Factors Grid ── */}
      {(result.risk_factors || []).length > 0 && (
        <SlideIn delay={160} direction="up">
          <div
            className="rounded-2xl p-5 bg-white dark:bg-[#090b12] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          >
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500 dark:text-orange-400" />
                Risk Factors
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-gray-500 mt-0.5">Key indicators contributing to the risk score</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {(result.risk_factors || []).map((rf, i) => (
                <div
                  key={i}
                  className="rounded-xl p-3.5 transition-all duration-200 hover:scale-[1.01] bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]"
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{rf.label}</span>
                    <span className={SEVERITY_BADGE[rf.severity] || 'badge-info'}>{rf.severity}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-gray-400 leading-relaxed">{rf.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </SlideIn>
      )}

      {/* ── Recommended Actions ── */}
      {(result.recommended_actions || []).length > 0 && (
        <SlideIn delay={220} direction="up">
          <div
            className="rounded-2xl p-5 bg-white dark:bg-[#090b12] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          >
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Recommended Actions
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-gray-500 mt-0.5">Prioritized response actions based on threat analysis</p>
            </div>
            <div className="space-y-2">
              {(result.recommended_actions || []).map((a, i) => {
                const colors: Record<string, { bg: string; border: string; text: string }> = {
                  immediate: { bg: 'bg-red-50 dark:bg-red-500/[0.08]', border: 'border-red-200 dark:border-red-500/30', text: 'text-red-700 dark:text-red-400' },
                  high:      { bg: 'bg-orange-50 dark:bg-orange-500/[0.08]', border: 'border-orange-200 dark:border-orange-500/30', text: 'text-orange-700 dark:text-orange-400' },
                  medium:    { bg: 'bg-amber-50 dark:bg-amber-500/[0.08]', border: 'border-amber-200 dark:border-amber-500/30', text: 'text-amber-700 dark:text-amber-400' },
                  low:       { bg: 'bg-slate-50 dark:bg-gray-500/[0.08]', border: 'border-slate-200 dark:border-gray-500/20', text: 'text-slate-700 dark:text-gray-400' },
                };
                const c = colors[a.priority] ?? colors.low;
                return (
                  <div
                    key={i}
                    className={`rounded-xl p-3.5 flex items-start gap-3 ${c.bg} border ${c.border}`}
                  >
                    <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded mt-0.5 shrink-0 ${c.text} bg-white dark:bg-black/30 border border-current/20 shadow-xs`}>
                      {a.priority}
                    </span>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-white">{a.action}</p>
                      <p className="text-[11px] text-slate-600 dark:text-gray-400 mt-0.5 leading-relaxed">{a.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </SlideIn>
      )}

      {/* ── Origin / Relay Hops ── */}
      {(result.origin?.relay_hops || []).length > 0 && (
        <SlideIn delay={280} direction="up">
          <div
            className="rounded-2xl p-5 bg-white dark:bg-[#090b12] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          >
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Share2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                Origin &amp; SMTP Relay Chain
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-gray-500 mt-0.5 font-mono">
                {result.origin?.hosting} · {result.origin?.country} · {result.origin?.asn}
              </p>
            </div>
            <div className="space-y-2">
              {(result.origin?.relay_hops || []).map((hop) => (
                <div
                  key={hop.hop}
                  className="flex items-start gap-3 rounded-xl px-4 py-3 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.05]"
                >
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-500/10 border border-teal-200 dark:border-teal-500/20 shrink-0"
                  >
                    {hop.hop}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-slate-900 dark:text-white font-semibold">{hop.ip}</span>
                      {hop.hostname && <span className="text-[11px] text-slate-500 dark:text-gray-500 font-mono">{hop.hostname}</span>}
                      <span className="text-[10px] text-slate-500 dark:text-gray-600">{hop.country}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-gray-400 mt-0.5 font-sans">{hop.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SlideIn>
      )}

      {/* ── Evidence ── */}
      {(result.evidence || []).length > 0 && (
        <SlideIn delay={340} direction="up">
          <div
            className="rounded-2xl p-5 bg-white dark:bg-[#090b12] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
          >
            <div className="mb-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSearch className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Evidence Items
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-gray-500 mt-0.5">Forensic artifacts extracted from this email</p>
            </div>
            <div className="space-y-2">
              {(result.evidence || []).map((ev) => (
                <div
                  key={ev.id}
                  className="rounded-xl px-4 py-2.5 flex items-start gap-3 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.05]"
                >
                  <span className="text-[10px] font-mono font-bold text-blue-600 dark:text-blue-400 uppercase w-24 shrink-0 mt-0.5">{ev.type}</span>
                  <span className="text-xs font-mono text-slate-800 dark:text-gray-300 break-all flex-1">{ev.value}</span>
                  {ev.hash && <span className="text-[10px] text-slate-500 dark:text-gray-600 font-mono shrink-0 hidden xl:block">{ev.hash.slice(0, 16)}…</span>}
                </div>
              ))}
            </div>
          </div>
        </SlideIn>
      )}

      {/* ── Interactive Tabs ── */}
      <SlideIn delay={400} direction="up">
        <div
          className="rounded-2xl p-5 bg-white dark:bg-[#090b12] border border-slate-200 dark:border-white/10 shadow-sm dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        >
          <div
            className="relative isolate flex items-center gap-1 border-b border-slate-200 dark:border-white/10 mb-5 overflow-x-auto overflow-y-hidden scrollbar-none select-none touch-pan-x"
            style={{
              touchAction: 'pan-x',
              WebkitOverflowScrolling: 'touch',
              overscrollBehaviorY: 'none',
              overscrollBehaviorX: 'contain',
            }}
          >
            {/* Smooth sliding indicator (slides left/right only, Y locked to 0) */}
            <div
              className="absolute z-0 pointer-events-none rounded-t-xl bg-purple-500/15 dark:bg-purple-500/20 border-b-2 border-purple-600 dark:border-purple-500 shadow-sm"
              style={{
                transform: `translate3d(${tabIndicatorStyle.left}px, 0, 0)`,
                width: tabIndicatorStyle.width,
                height: '100%',
                bottom: 0,
                opacity: tabIndicatorStyle.opacity,
                transition: 'transform 300ms cubic-bezier(0.25, 1, 0.5, 1), width 300ms cubic-bezier(0.25, 1, 0.5, 1), opacity 150ms ease',
                left: 0,
                zIndex: 0,
              }}
            />

            {[
              { id: 'facts',     label: 'Observed Facts', icon: Eye },
              { id: 'inference', label: 'AI Inference',   icon: Brain },
              { id: 'headers',   label: 'Headers',        icon: FileSearch },
              { id: 'raw',       label: 'Raw Email',      icon: FileText },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={(el) => { tabRefs.current[tab.id] = el; }}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  style={{ zIndex: 10 }}
                  className={`relative z-10 flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-colors duration-200 shrink-0 cursor-pointer ${
                    isActive ? 'text-purple-900 dark:text-purple-300' : 'text-slate-500 dark:text-gray-500 hover:text-slate-800 dark:hover:text-gray-300'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeTab === 'facts'     && <ObservedFactsTab facts={result.observed_facts || []} />}
          {activeTab === 'inference' && <AIInferenceTab inferences={result.ai_inferences || []} />}
          {activeTab === 'headers'   && <HeadersTab headers={result.headers || []} />}
          {activeTab === 'raw'       && <RawEmailTab raw={result.raw_email || ''} />}
        </div>
      </SlideIn>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TAB COMPONENTS — all driven by live data
═══════════════════════════════════════════════════════════ */
function ObservedFactsTab({ facts = [] }: { facts?: EmailAnalysisResult['observed_facts'] }) {
  const safeFacts = facts || [];
  const categories = [...new Set(safeFacts.map((f) => f.category))];
  if (safeFacts.length === 0) return <EmptyTabPlaceholder message="No observed facts extracted." />;
  return (
    <div className="space-y-5">
      <div
        className="flex items-start gap-2.5 rounded-xl p-3.5 bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20"
      >
        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-700 dark:text-gray-300 leading-relaxed font-sans">
          <span className="text-slate-900 dark:text-white font-semibold">Observed Facts</span> are verifiable signals extracted directly from the email message.
          These are objective data points — not predictions or interpretations.
        </p>
      </div>
      {categories.map((cat) => (
        <div key={cat}>
          <h4 className="text-[10px] font-bold text-slate-500 dark:text-gray-500 uppercase tracking-widest mb-2 font-mono">{cat}</h4>
          <div className="space-y-1.5">
            {safeFacts.filter((f) => f.category === cat).map((fact) => {
              const Icon = FACT_ICON[fact.status] || Info;
              const color = FACT_COLOR[fact.status] || 'text-gray-400';
              return (
                <div
                  key={fact.id}
                  className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 transition-colors duration-150 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.05]"
                >
                  <Icon className={`w-4 h-4 shrink-0 ${color}`} />
                  <span className="text-xs text-slate-600 dark:text-gray-400 w-36 shrink-0 font-medium">{fact.field}</span>
                  <span className="text-xs text-slate-900 dark:text-white font-mono flex-1 break-all">{fact.value}</span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function AIInferenceTab({ inferences = [] }: { inferences?: EmailAnalysisResult['ai_inferences'] }) {
  const safeInferences = inferences || [];
  if (safeInferences.length === 0) return <EmptyTabPlaceholder message="No AI inferences generated." />;
  return (
    <div className="space-y-4">
      <div
        className="flex items-start gap-2.5 rounded-xl p-3.5 bg-purple-50 dark:bg-purple-500/10 border border-purple-200 dark:border-purple-500/20"
      >
        <Brain className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
        <p className="text-xs text-slate-700 dark:text-gray-300 leading-relaxed font-sans">
          <span className="text-slate-900 dark:text-white font-semibold">AI Inference</span> represents analytical interpretation based on observed facts.
          These are probabilistic assessments — each inference is labeled with a confidence score and its evidentiary basis.
        </p>
      </div>
      {safeInferences.map((inf) => (
        <div
          key={inf.id}
          className="rounded-xl p-4 transition-all duration-200 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06]"
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <p className="text-xs font-semibold text-slate-900 dark:text-white flex-1">{inf.inference}</p>
            <div className="shrink-0 flex items-center gap-2">
              <div className="w-20 h-1.5 rounded-full overflow-hidden bg-slate-200 dark:bg-white/10">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${inf.confidence}%`,
                    background: inf.confidence > 85 ? '#ef4444' : inf.confidence > 70 ? '#f97316' : '#f59e0b',
                    boxShadow: `0 0 6px ${inf.confidence > 85 ? 'rgba(239,68,68,0.5)' : 'rgba(249,115,22,0.5)'}`,
                  }}
                />
              </div>
              <span className="text-xs font-mono text-slate-900 dark:text-white font-bold">{inf.confidence}%</span>
            </div>
          </div>
          <div className="flex items-start gap-2 mt-2 pt-2 border-t border-slate-200 dark:border-white/5">
            <span className="text-[10px] text-slate-500 dark:text-gray-500 font-mono uppercase tracking-wider shrink-0 mt-0.5">BASIS</span>
            <p className="text-xs text-slate-600 dark:text-gray-400 leading-relaxed font-sans">{inf.basis}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function HeadersTab({ headers = [] }: { headers?: EmailAnalysisResult['headers'] }) {
  const safeHeaders = headers || [];
  if (safeHeaders.length === 0) return <EmptyTabPlaceholder message="No headers parsed from this email." />;
  return (
    <div
      className="rounded-xl overflow-hidden font-mono text-xs bg-slate-50 dark:bg-black/40 border border-slate-200 dark:border-white/[0.06]"
    >
      {safeHeaders.map((h, i) => (
        <div key={i} className="flex border-b border-slate-200 dark:border-white/5 last:border-0 hover:bg-slate-100 dark:hover:bg-white/[0.03] transition-colors">
          <div className="w-44 shrink-0 px-3.5 py-2.5 text-teal-700 dark:text-teal-400 font-bold border-r border-slate-200 dark:border-white/5 break-all">{h.key}</div>
          <div className="px-3.5 py-2.5 text-slate-800 dark:text-gray-300 break-all">{h.value}</div>
        </div>
      ))}
    </div>
  );
}

function RawEmailTab({ raw }: { raw: string }) {
  return (
    <div
      className="rounded-xl p-4 overflow-x-auto scrollbar-thin font-mono text-xs text-slate-800 dark:text-gray-300 leading-relaxed bg-slate-50 dark:bg-[#06070a] border border-slate-200 dark:border-white/[0.06]"
    >
      <pre className="whitespace-pre-wrap">{raw || '(no raw email content stored)'}</pre>
    </div>
  );
}

function EmptyTabPlaceholder({ message }: { message: string }) {
  return (
    <div className="py-10 text-center text-xs text-gray-500 font-mono">{message}</div>
  );
}

// Keep legacy named exports for import compatibility
export default EmailAnalyzerPage;

// Unused import suppressor
const _unused = { Mail, Clock, ShieldAlert, ChevronRight, Sparkles };
void _unused;
