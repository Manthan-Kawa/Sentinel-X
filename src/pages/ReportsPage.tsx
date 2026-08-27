import { useState, useEffect, useMemo, useRef } from 'react';
import {
  FileText,
  Download,
  Eye,
  Shield,
  AlertTriangle,
  Brain,
  Clock,
  Server,
  CheckCircle2,
  Send,
  Sparkles,
  Zap,
  Printer,
  ChevronDown,
  MailSearch,
  RefreshCw,
  Trash2,
  Plus,
  ShieldAlert,
  ArrowRight,
  Check,
  Globe,
  MapPin,
  Link2,
  Network,
  Lock,
  XCircle,
  Info,
  Layers,
  Activity,
  UserCheck,
  Search,
  X,
  Filter,
  type LucideIcon,
} from 'lucide-react';
import {
  REPORT_TYPES,
  type ReportType,
  type ReportData,
  SMTP_RELAYS,
  type InfraLocation,
  type AttackGraphNode as AGNode,
  type GraphNodeType,
} from '@/data/mockData';
import { CopyButton } from '@/components/CopyButton';
import { DarkCyberMap } from '@/components/DarkCyberMap';
import { AttackGraphCanvas, getCaseLayoutStyle, renderAttackGraphToSvg, type LayoutStyle } from '@/components/AttackGraph';
import { useAnalysis } from '@/contexts/AnalysisContext';
import {
  askSentinelAssistant,
  type EmailAnalysisResult,
  type AssistantChatMessage,
} from '@/services/claudeService';

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

export type ReportContentTab = 'all' | 'overview' | 'headers' | 'threat_intel' | 'origin_map' | 'attack_graph' | 'actions';

export function ReportsPage({ onNavigate }: { onNavigate?: (route: string) => void }) {
  const {
    analyzedReports,
    currentResult,
    currentReportData,
    selectCase,
    deleteCase,
    loadDemoCase,
  } = useAnalysis();

  const [reportType, setReportType] = useState<ReportType>('forensic');
  const [showPreview, setShowPreview] = useState(true);
  const [activePreviewTab, setActivePreviewTab] = useState<ReportContentTab>('all');
  const [caseSearch, setCaseSearch] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  const searchContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setSearchFocused(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const matchingCases = useMemo(() => {
    if (!caseSearch.trim()) return analyzedReports;
    const q = caseSearch.toLowerCase().trim();
    return analyzedReports.filter((r) => {
      const matchesCaseId = r.case_id.toLowerCase().includes(q);
      const matchesSubject = r.headers
        .find((h) => h.key.toLowerCase() === 'subject')
        ?.value?.toLowerCase().includes(q);
      const matchesVerdict = r.verdict?.toLowerCase().includes(q);
      const matchesFrom = r.headers
        .find((h) => h.key.toLowerCase() === 'from')
        ?.value?.toLowerCase().includes(q);
      const matchesIp = r.threat_intel?.sending_ip?.toLowerCase().includes(q) || r.origin?.sending_ip?.toLowerCase().includes(q);
      const matchesDomain = r.threat_intel?.domain?.toLowerCase().includes(q);
      return matchesCaseId || matchesSubject || matchesVerdict || matchesFrom || matchesIp || matchesDomain;
    });
  }, [caseSearch, analyzedReports]);

  const filteredReports = matchingCases;

  const reportData = currentReportData;

  const handleExportText = () => {
    if (!reportData) return;
    const reportContent = generateReportText(reportType, reportData, currentResult);
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SENTINEL-X_${reportData.caseId}_${reportType}_report.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSaveAsPDF = () => {
    if (!reportData) return;
    const printWindow = window.open('', '_blank', 'width=1100,height=950');
    if (!printWindow) {
      alert('Please allow popups for Sentinel-X to generate and print the PDF report.');
      return;
    }

    const html = generateFormattedPdfHtml(reportType, reportData, currentResult);
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
  };

  return (
    <div className="space-y-6" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <SlideIn delay={0} direction="down">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-black text-white tracking-tight">Reports & Export</h2>
              {currentResult && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
                  Synced with Analyzer
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-0.5">
              Complete forensic analysis, threat intelligence, and interactive attack graphs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate?.('email-analyzer')}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 shadow-md cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                border: '1px solid rgba(99,102,241,0.4)',
              }}
            >
              <MailSearch className="w-3.5 h-3.5" />
              Analyze New Email
            </button>
          </div>
        </div>
      </SlideIn>

      {/* ── If no emails have been analyzed yet ── */}
      {analyzedReports.length === 0 ? (
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
              <FileText className="w-8 h-8 text-blue-400" />
            </div>

            <div className="max-w-md space-y-2">
              <h3 className="text-lg font-bold text-white tracking-tight">No Analyzed Emails in Session</h3>
              <p className="text-xs text-gray-400 leading-relaxed font-mono">
                Upload or paste an email in the Email Analyzer. Once analyzed, reports with map location and attack graphs will automatically sync here.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                onClick={() => onNavigate?.('email-analyzer')}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 shadow-lg"
                style={{
                  background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                  boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
                }}
              >
                <MailSearch className="w-4 h-4" />
                Go to Email Analyzer
              </button>
              <button
                onClick={loadDemoCase}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white transition-all"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <Sparkles className="w-4 h-4 text-purple-400" />
                Load Sample BEC Report
              </button>
            </div>
          </div>
        </SlideIn>
      ) : (
        <>
          {/* ── Case Selector Bar ── */}
          <SlideIn delay={30} direction="up">
            <div
              className="rounded-2xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3"
              style={{
                background: 'linear-gradient(145deg, #0b0e17 0%, #090c14 100%)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
                <span className="text-xs font-mono font-bold text-gray-400 flex items-center gap-1.5 shrink-0">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  ACTIVE CASE:
                </span>

                {/* Integrated Case Search & Selector */}
                <div className="relative flex-1 min-w-[280px] max-w-xl" ref={searchContainerRef}>
                  <div className="relative flex items-center">
                    <Search className="w-3.5 h-3.5 text-purple-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      placeholder={
                        currentResult
                          ? `${currentResult.case_id} — ${currentResult.headers.find((h) => h.key.toLowerCase() === 'subject')?.value || currentResult.verdict}`
                          : 'Search case ID, subject, IOC...'
                      }
                      value={caseSearch}
                      onFocus={() => setSearchFocused(true)}
                      onChange={(e) => {
                        setCaseSearch(e.target.value);
                        setSearchFocused(true);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape') {
                          setSearchFocused(false);
                        } else if (e.key === 'Enter' && matchingCases.length > 0) {
                          selectCase(matchingCases[0].case_id);
                          setCaseSearch('');
                          setSearchFocused(false);
                        }
                      }}
                      className="w-full rounded-xl pl-8 pr-8 py-1.5 text-xs font-mono text-gray-200 bg-white/5 border border-white/10 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500/40 transition-all truncate cursor-text"
                    />
                    {caseSearch ? (
                      <button
                        onClick={() => {
                          setCaseSearch('');
                          setSearchFocused(false);
                        }}
                        className="absolute right-2.5 p-0.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    ) : (
                      <button
                        onClick={() => setSearchFocused(!searchFocused)}
                        className="absolute right-2.5 p-0.5 text-gray-400 hover:text-white transition-colors cursor-pointer"
                      >
                        <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${searchFocused ? 'rotate-180' : ''}`} />
                      </button>
                    )}
                  </div>

                  {/* Suggestions Dropdown */}
                  {searchFocused && (
                    <div
                      className="absolute left-0 mt-2 w-full min-w-[320px] max-w-[560px] rounded-2xl p-2.5 z-50 shadow-2xl border backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
                      style={{
                        background: 'rgba(10, 13, 22, 0.97)',
                        borderColor: 'rgba(168, 85, 247, 0.35)',
                        boxShadow: '0 12px 40px rgba(0, 0, 0, 0.8), 0 0 25px rgba(168, 85, 247, 0.18)',
                      }}
                    >
                      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/10 text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">
                        <span className="flex items-center gap-1.5">
                          <Search className="w-3 h-3 text-purple-400" />
                          Analyzed Cases ({matchingCases.length})
                        </span>
                        {caseSearch && (
                          <span className="text-purple-400 font-normal truncate max-w-[150px]">
                            "{caseSearch}"
                          </span>
                        )}
                      </div>

                      <div className="max-h-72 overflow-y-auto scrollbar-thin space-y-1.5 mt-2">
                        {matchingCases.length > 0 ? (
                          matchingCases.map((c) => {
                            const isSelected = c.case_id === currentResult?.case_id;
                            const scoreColor =
                              c.threat_score >= 80
                                ? 'text-red-400 bg-red-500/15 border-red-500/30'
                                : c.threat_score >= 50
                                  ? 'text-orange-400 bg-orange-500/15 border-orange-500/30'
                                  : 'text-green-400 bg-green-500/15 border-green-500/30';
                            const subj = c.headers.find((h) => h.key.toLowerCase() === 'subject')?.value;
                            const fromVal = c.headers.find((h) => h.key.toLowerCase() === 'from')?.value;

                            return (
                              <div
                                key={c.case_id}
                                onClick={() => {
                                  selectCase(c.case_id);
                                  setCaseSearch('');
                                  setSearchFocused(false);
                                }}
                                className={`flex items-center justify-between gap-2 p-2.5 rounded-xl cursor-pointer transition-all ${
                                  isSelected
                                    ? 'bg-purple-500/25 border border-purple-500/40 text-white'
                                    : 'hover:bg-white/10 text-gray-300 border border-transparent'
                                }`}
                              >
                                <div className="min-w-0 flex-1 flex flex-col gap-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                                      <Shield className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                      {c.case_id}
                                    </span>
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold border ${scoreColor}`}>
                                      {c.threat_score}/100 ({c.alert_level.toUpperCase()})
                                    </span>
                                  </div>

                                  <p className="text-[11px] text-gray-200 truncate font-sans font-medium" title={subj || c.verdict}>
                                    {subj || c.verdict}
                                  </p>

                                  {fromVal && (
                                    <p className="text-[10px] text-gray-400 font-mono truncate">
                                      From: {fromVal}
                                    </p>
                                  )}
                                </div>

                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteCase(c.case_id);
                                  }}
                                  className="p-1 text-gray-500 hover:text-red-400 transition-colors ml-1 shrink-0"
                                  title="Remove case"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })
                        ) : (
                          <div className="p-4 text-center text-xs font-mono text-gray-400">
                            No cases found matching "{caseSearch}"
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Live indicator badge */}
                {currentResult && (
                  <span
                    className={`px-2.5 py-1 rounded-xl text-xs font-mono font-bold shrink-0 ${
                      currentResult.threat_score >= 80
                        ? 'text-red-400 bg-red-500/10 border border-red-500/25'
                        : currentResult.threat_score >= 50
                          ? 'text-orange-400 bg-orange-500/10 border border-orange-500/25'
                          : 'text-green-400 bg-green-500/10 border border-green-500/25'
                    }`}
                  >
                    {currentResult.alert_level.toUpperCase()} ({currentResult.threat_score}/100)
                  </span>
                )}
              </div>
            </div>
          </SlideIn>

          {/* ── Report Control & Action Bar ── */}
          {reportData && (
            <SlideIn delay={60} direction="up">
              <div
                className="rounded-2xl p-5"
                style={{
                  background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
                }}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <FileText className="w-4 h-4 text-cyan-400" />
                      SOC Forensic Intelligence Dossier
                    </h3>
                    <p className="text-xs text-gray-400 mt-1 font-mono">
                      {reportData.caseId} — <span className="text-white font-semibold">
                        {currentResult?.headers.find((h) => h.key.toLowerCase() === 'subject')?.value || reportData.caseTitle.replace(/^[^:]+:\s*/, '')}
                      </span>
                    </p>
                  </div>

                  {/* Type selector */}
<div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono text-gray-400">
                      {reportType === 'executive'
                        ? 'Executive Report'
                        : reportType === 'technical'
                        ? 'Technical Report'
                        : ''}
                    </span>
                  </div>
                </div>

                {/* Main Action Buttons */}
                <div className="flex flex-wrap items-center gap-3 pt-4">
                  {/* Save as PDF Button (Prominently Highlighted) */}
                  <button
                    id="save-pdf-btn"
                    onClick={handleSaveAsPDF}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 shadow-xl cursor-pointer"
                    style={{
                      background: 'linear-gradient(135deg, #7c3aed 0%, #9333ea 50%, #6366f1 100%)',
                      border: '1px solid rgba(192,132,252,0.6)',
                      boxShadow: '0 4px 20px rgba(147,51,234,0.4)',
                    }}
                    title="Generate complete formatted PDF report with email forensics, headers, threat intel, map location, and attack graph"
                  >
                    <Printer className="w-4 h-4 text-purple-200" />
                    <span>Save PDF / Print Report</span>
                  </button>

                  {/* Export Text Report */}
                  <button
                    onClick={handleExportText}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:scale-105 shadow-md"
                    style={{
                      background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                      border: '1px solid rgba(56,189,248,0.5)',
                    }}
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export Raw Text
                  </button>

                  {/* Toggle Preview Button */}
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-300 hover:text-white transition-all hover:scale-105"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <Eye className="w-3.5 h-3.5 text-cyan-400" />
                    {showPreview ? 'Hide Report Preview' : 'Show Report Preview'}
                  </button>
                </div>
              </div>
            </SlideIn>
          )}

          {/* ── Report Preview ── */}
          {showPreview && reportData && (
            <SlideIn delay={120} direction="up">
              <FullReportPreview
                type={reportType}
                data={reportData}
                result={currentResult}
                activeTab={activePreviewTab}
                setActiveTab={setActivePreviewTab}
                onPrintPdf={handleSaveAsPDF}
              />
            </SlideIn>
          )}

          {/* ── SENTINEL AI Assistant ── */}
          {currentResult && (
            <SlideIn delay={180} direction="up">
              <SentinelAI currentResult={currentResult} />
            </SlideIn>
          )}
        </>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   FULL ON-SCREEN REPORT PREVIEW
══════════════════════════════════════════════════ */
function FullReportPreview({
  type,
  data,
  result,
  activeTab,
  setActiveTab,
  onPrintPdf,
}: {
  type: ReportType;
  data: ReportData;
  result: EmailAnalysisResult | null;
  activeTab: ReportContentTab;
  setActiveTab: (t: ReportContentTab) => void;
  onPrintPdf: () => void;
}) {
  const originLat = result?.origin?.latitude ?? 28.6139;
  const originLng = result?.origin?.longitude ?? 77.2090;
  const originCity = result?.origin?.city ?? 'New Delhi';
  const originCountry = result?.origin?.country ?? 'India';
  const originIp = result?.origin?.sending_ip ?? result?.threat_intel?.sending_ip ?? '103.19.199.18';
  const originAsn = result?.origin?.asn ?? 'AS55836';

  // Build the map markers from current result origin data
  const liveMarkers: InfraLocation[] = [
    {
      id: 'REPORT_ORIGIN',
      country: originCountry,
      countryCode: result?.origin?.country_code ?? 'RO',
      city: originCity,
      lat: originLat,
      lng: originLng,
      ip: originIp,
      asn: originAsn,
      asnOrg: result?.origin?.hosting ?? 'Unknown ISP',
      hosting: result?.origin?.hosting ?? 'Unknown Hosting',
      confidence: result?.confidence ?? 78,
      role: 'Originating SMTP Server',
      evidence: ['Email origin point identified via SMTP header analysis'],
    },
  ];

  return (
    <div
      className="rounded-2xl p-6 space-y-6"
      style={{
        background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
        border: '1px solid rgba(168,85,247,0.3)',
        boxShadow: '0 0 35px rgba(168,85,247,0.1)',
      }}
    >
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: 'linear-gradient(135deg, rgba(168,85,247,0.2), rgba(59,130,246,0.2))',
              border: '1px solid rgba(168,85,247,0.4)',
            }}
          >
            <Shield className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white">
                SENTINEL-X {REPORT_TYPES.find((r) => r.id === type)?.label.toUpperCase()}
              </h3>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-red-500/15 border border-red-500/30 text-red-400">
                CONFIDENTIAL // SOC FORENSICS
              </span>
            </div>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              Case ID: <span className="text-cyan-400 font-bold">{data.caseId}</span> · Generated: {new Date().toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs (Single Line) */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none flex-nowrap pb-1">
        {[
          { id: 'all', label: 'All Content', icon: Layers },
          { id: 'overview', label: 'Overview', icon: CheckCircle2 },
          { id: 'headers', label: 'Headers & Auth', icon: Server },
          { id: 'threat_intel', label: 'Threat Intel', icon: Globe },
          { id: 'origin_map', label: 'Origin Map', icon: MapPin },
          { id: 'attack_graph', label: 'Attack Graph', icon: Network },
          { id: 'actions', label: 'Actions', icon: AlertTriangle },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as ReportContentTab)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all shrink-0 cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-purple-500/25 text-purple-200 border border-purple-500/50 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 bg-white/5 border border-white/5 hover:bg-white/10'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Section 1: Executive Threat Overview ── */}
      {(activeTab === 'all' || activeTab === 'overview') && (
        <div className="space-y-4">
          <div
            className="rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center gap-5"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              className="w-24 h-24 rounded-2xl flex flex-col items-center justify-center shrink-0"
              style={{
                background: data.riskScore >= 80 ? 'rgba(239,68,68,0.12)' : 'rgba(249,115,22,0.12)',
                border: `2px solid ${data.riskScore >= 80 ? '#ef4444' : '#f97316'}`,
              }}
            >
              <span className={`text-3xl font-black ${data.riskScore >= 80 ? 'text-red-400' : 'text-orange-400'}`}>
                {data.riskScore}
              </span>
              <span className="text-[9px] font-mono font-bold text-gray-400 tracking-wider">RISK SCORE</span>
            </div>

            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-white">
                  {result?.headers.find((h) => h.key.toLowerCase() === 'subject')?.value || data.caseTitle.replace(/^[^:]+:\s*/, '')}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/15 border border-purple-500/30 text-purple-300">
                  {result?.verdict || 'Suspicious Threat'}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                  Confidence: {result?.confidence ?? 95}%
                </span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed font-mono">{data.threatSummary}</p>
            </div>
          </div>

          {/* Key Findings */}
          <div className="space-y-2">
            <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-green-400" />
              Key Forensic Findings
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {data.keyFindings.map((f, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2.5 p-3 rounded-xl text-xs text-gray-300"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
                  <span>{f}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Section 2: Header Forensics & Authentication ── */}
      {(activeTab === 'all' || activeTab === 'headers') && (
        <div className="space-y-3 pt-3 border-t border-white/10">
          <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-cyan-400" />
            Email Authentication & Header Forensics
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] font-mono text-gray-400 block">SPF VALIDATION</span>
              <span
                className={`text-sm font-mono font-bold block mt-1 ${result?.threat_intel.spf === 'FAIL' ? 'text-red-400' : 'text-green-400'
                  }`}
              >
                {result?.threat_intel.spf || 'FAIL (SPF HardFail)'}
              </span>
              <span className="text-[10px] font-mono text-gray-500">Sender IP unauthorized</span>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] font-mono text-gray-400 block">DKIM CRYPTO SIGNATURE</span>
              <span
                className={`text-sm font-mono font-bold block mt-1 ${result?.threat_intel.dkim === 'FAIL' ? 'text-red-400' : 'text-green-400'
                  }`}
              >
                {result?.threat_intel.dkim || 'FAIL (Invalid Key)'}
              </span>
              <span className="text-[10px] font-mono text-gray-500">Signature altered / missing</span>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] font-mono text-gray-400 block">DMARC POLICY ALIGNMENT</span>
              <span
                className={`text-sm font-mono font-bold block mt-1 ${result?.threat_intel.dmarc === 'FAIL' ? 'text-red-400' : 'text-green-400'
                  }`}
              >
                {result?.threat_intel.dmarc || 'FAIL (p=reject)'}
              </span>
              <span className="text-[10px] font-mono text-gray-500">Domain alignment failed</span>
            </div>
          </div>

          {/* Key Raw Headers table */}
          {result?.headers && result.headers.length > 0 && (
            <div className="rounded-xl overflow-hidden border border-white/5 bg-black/30">
              <div className="px-3 py-2 bg-white/5 border-b border-white/5 text-[10px] font-mono font-bold text-gray-400 uppercase">
                Captured SMTP / RFC-822 Headers
              </div>
              <div className="divide-y divide-white/5 max-h-48 overflow-y-auto font-mono text-[11px]">
                {result.headers.slice(0, 8).map((h, i) => (
                  <div key={i} className="px-3 py-1.5 flex items-start gap-2">
                    <span className="text-purple-300 font-bold w-28 shrink-0 truncate">{h.key}:</span>
                    <span className="text-gray-300 break-all">{h.value}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Section 3: Threat Intelligence & IOC Telemetry ── */}
      {(activeTab === 'all' || activeTab === 'threat_intel') && (
        <div className="space-y-3 pt-3 border-t border-white/10">
          <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="w-4 h-4 text-cyan-400" />
            Threat Intelligence & IOC Telemetry
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] font-mono text-gray-400 block">SENDING IP REPUTATION</span>
              <span className="text-xs font-mono font-bold text-red-400 block mt-1">
                {(result?.threat_intel.ip_reputation ?? 'malicious').toUpperCase()}
              </span>
              <span className="text-[10px] font-mono text-gray-500">{result?.threat_intel.sending_ip || originIp}</span>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] font-mono text-gray-400 block">SENDER DOMAIN AGE</span>
              <span className="text-xs font-mono font-bold text-amber-400 block mt-1">
                {result?.threat_intel.domain_age_days ? `${result.threat_intel.domain_age_days} Days Old` : '3 Days Old (Newly Observed)'}
              </span>
              <span className="text-[10px] font-mono text-gray-500">{result?.threat_intel.domain || 'Lookalike Domain'}</span>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] font-mono text-gray-400 block">BLOCKLIST DETECTIONS</span>
              <span className="text-xs font-mono font-bold text-red-400 block mt-1">
                {result?.threat_intel.blocklists?.length ? `${result.threat_intel.blocklists.length} Engines Flagged` : '3 Flagged (Spamhaus, SORBS)'}
              </span>
              <span className="text-[10px] font-mono text-gray-500">Known Threat Actor ASN</span>
            </div>

            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] font-mono text-gray-400 block">HOSTING INFRASTRUCTURE</span>
              <span className="text-xs font-mono font-bold text-purple-300 block mt-1 truncate">
                {result?.origin.hosting || 'Bulletproof VPS (FlokiNET)'}
              </span>
              <span className="text-[10px] font-mono text-gray-500">{originAsn}</span>
            </div>
          </div>

          {/* IOC Badges */}
          <div className="flex flex-wrap gap-2 pt-1">
            {data.indicators.map((ind, i) => (
              <span
                key={`${ind.value}-${i}`}
                className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-white/5 border border-white/10 text-white"
              >
                <span className="text-cyan-400 mr-1.5">{ind.type}:</span>
                {ind.value}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Section 4: Origin Investigation & Map Location (DarkCyberMap) ── */}
      {(activeTab === 'all' || activeTab === 'origin_map') && (
        <div className="space-y-3 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-cyan-400" />
              Origin Investigation & Geolocation Map
            </h4>
            <span className="text-[11px] font-mono text-gray-400">
              Target: <span className="text-white font-bold">{originCity}, {originCountry}</span> ({originLat.toFixed(4)}, {originLng.toFixed(4)})
            </span>
          </div>

          {/* Tactical Cyber Map (Same as Origin Page) */}
          <div
            className="rounded-2xl p-4 relative overflow-hidden"
            style={{
              background: 'linear-gradient(145deg, #090b12 0%, #0c0f1a 100%)',
              border: '1px solid rgba(56,189,248,0.25)',
              boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)',
            }}
          >
            <DarkCyberMap
              markers={liveMarkers}
              selectedId={liveMarkers[0]?.id}
              singlePointerMode={true}
              height="h-[380px]"
            />

            {/* Telemetry Footer Overlay */}
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-white/10 text-[11px] font-mono">
              <div>
                <span className="text-gray-500 block">GEO COORDINATES</span>
                <span className="text-cyan-300 font-bold">{originLat.toFixed(4)}° N, {originLng.toFixed(4)}° E</span>
              </div>
              <div>
                <span className="text-gray-500 block">PHYSICAL LOCATION</span>
                <span className="text-white font-bold">{originCity}, {originCountry}</span>
              </div>
              <div>
                <span className="text-gray-500 block">ORIGINATING IP</span>
                <span className="text-red-400 font-bold">{originIp}</span>
              </div>
              <div>
                <span className="text-gray-500 block">AUTONOMOUS SYSTEM</span>
                <span className="text-purple-300 font-bold">{originAsn}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Section 5: Visual Attack Graph (Full Interactive Topology) ── */}
      {(activeTab === 'all' || activeTab === 'attack_graph') && (
        <div className="space-y-3 pt-3 border-t border-white/10">
          <h4 className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
            <Network className="w-4 h-4 text-cyan-400" />
            Attack Graph & Threat Topology Chain
          </h4>

          <div className="rounded-2xl overflow-hidden">
            <AttackGraphCanvas result={result} height={620} />
          </div>
        </div>
      )}

      {/* ── Section 6: Recommended Actions ── */}
      {(activeTab === 'all' || activeTab === 'actions') && (
        <div className="space-y-3 pt-3 border-t border-white/10">
          <h4 className="text-xs font-mono font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 text-orange-400" />
            Recommended SOC Incident Response Actions
          </h4>

          <div className="space-y-2">
            {data.recommendedActions.map((act, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-3.5 rounded-xl text-xs"
                style={{
                  background: 'rgba(249,115,22,0.06)',
                  border: '1px solid rgba(249,115,22,0.2)',
                }}
              >
                <span className="w-5 h-5 rounded-lg bg-orange-500/20 border border-orange-500/40 flex items-center justify-center shrink-0 text-xs font-mono font-bold text-orange-400">
                  {i + 1}
                </span>
                <span className="text-gray-200 leading-relaxed font-mono">{act}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   VECTOR SVG TACTICAL MAP COMPONENT
══════════════════════════════════════════════════ */
function TacticalSvgMap({
  lat,
  lng,
  city,
  country,
  ip,
  asn,
}: {
  lat: number;
  lng: number;
  city: string;
  country: string;
  ip: string;
  asn: string;
}) {
  // Mercator-like map mapping (0..700 width, 0..350 height)
  const mapX = Math.max(30, Math.min(670, ((lng + 180) / 360) * 700));
  const mapY = Math.max(30, Math.min(320, ((90 - lat) / 180) * 350));

  return (
    <svg
      viewBox="0 0 700 350"
      className="w-full h-auto max-h-[350px]"
      style={{ filter: 'drop-shadow(0 0 10px rgba(56,189,248,0.1))' }}
    >
      <defs>
        <linearGradient id="gridGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0.05" />
        </linearGradient>
        <radialGradient id="targetGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
          <stop offset="60%" stopColor="#ef4444" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Deep Cyber Background Grid */}
      <rect width="700" height="350" fill="#040711" rx="12" />
      <g stroke="#1e293b" strokeWidth="0.75" strokeDasharray="3 3" opacity="0.6">
        {[70, 140, 210, 280, 350, 420, 490, 560, 630].map((x) => (
          <line key={`x-${x}`} x1={x} y1="0" x2={x} y2="350" />
        ))}
        {[50, 100, 150, 200, 250, 300].map((y) => (
          <line key={`y-${y}`} x1="0" y1={y} x2="700" y2={y} />
        ))}
      </g>

      {/* Equator & Prime Meridian */}
      <line x1="0" y1="175" x2="700" y2="175" stroke="#334155" strokeWidth="1" />
      <line x1="350" y1="0" x2="350" y2="350" stroke="#334155" strokeWidth="1" />

      {/* Stylized Vector World Continents */}
      <g fill="#1e293b" stroke="#38bdf8" strokeWidth="1" opacity="0.85" strokeLinejoin="round">
        {/* North America */}
        <path d="M 80,45 L 140,40 L 220,55 L 260,105 L 230,135 L 195,120 L 165,155 L 130,140 L 105,95 Z" />
        <path d="M 160,155 L 195,170 L 185,200 L 160,190 Z" />
        {/* Greenland */}
        <path d="M 245,30 L 285,25 L 295,50 L 260,65 Z" />
        {/* South America */}
        <path d="M 190,205 L 250,225 L 260,280 L 230,335 L 205,335 L 180,265 L 185,215 Z" />
        {/* Europe */}
        <path d="M 345,65 L 430,60 L 445,95 L 415,125 L 375,130 L 345,110 L 350,80 Z" />
        {/* UK */}
        <path d="M 335,70 L 348,70 L 345,90 L 335,85 Z" />
        {/* Africa */}
        <path d="M 345,135 L 435,135 L 465,195 L 440,285 L 400,320 L 365,265 L 335,185 Z" />
        {/* Asia */}
        <path d="M 445,60 L 600,50 L 650,95 L 620,165 L 565,185 L 515,155 L 450,135 L 440,95 Z" />
        {/* Japan */}
        <path d="M 635,105 L 648,115 L 642,140 L 632,130 Z" />
        {/* Australia */}
        <path d="M 565,245 L 640,245 L 650,295 L 585,320 L 555,285 Z" />
      </g>

      {/* Crosshair Target Reticle at Origin (mapX, mapY) */}
      <g>
        {/* Pulsing Target Ring */}
        <circle cx={mapX} cy={mapY} r="28" fill="url(#targetGlow)" />
        <circle cx={mapX} cy={mapY} r="18" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.9" />
        <circle cx={mapX} cy={mapY} r="10" fill="none" stroke="#f97316" strokeWidth="2" />
        <circle cx={mapX} cy={mapY} r="4" fill="#ffffff" stroke="#ef4444" strokeWidth="2" />

        {/* Crosshairs */}
        <line x1={mapX - 35} y1={mapY} x2={mapX - 12} y2={mapY} stroke="#ef4444" strokeWidth="1.5" />
        <line x1={mapX + 12} y1={mapY} x2={mapX + 35} y2={mapY} stroke="#ef4444" strokeWidth="1.5" />
        <line x1={mapX} y1={mapY - 35} x2={mapX} y2={mapY - 12} stroke="#ef4444" strokeWidth="1.5" />
        <line x1={mapX} y1={mapY + 12} x2={mapX} y2={mapY + 35} stroke="#ef4444" strokeWidth="1.5" />

        {/* Dynamic Callout Card */}
        {(() => {
          const calloutX = mapX > 450 ? mapX - 220 : mapX + 35;
          const calloutY = mapY > 240 ? mapY - 80 : mapY + 15;
          return (
            <g>
              {/* Leader Line */}
              <polyline
                points={`${mapX},${mapY} ${mapX > 450 ? mapX - 25 : mapX + 25},${calloutY + 25} ${calloutX + (mapX > 450 ? 200 : 0)},${calloutY + 25}`}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.2"
                strokeDasharray="2 2"
              />
              {/* Callout Box */}
              <rect
                x={calloutX}
                y={calloutY}
                width="200"
                height="65"
                rx="6"
                fill="#0b1120"
                stroke="#38bdf8"
                strokeWidth="1.5"
                opacity="0.95"
              />
              {/* Callout Text */}
              <text x={calloutX + 10} y={calloutY + 18} fill="#ef4444" fontSize="10" fontWeight="bold" fontFamily="monospace">
                TARGET ORIGIN PINPOINT
              </text>
              <text x={calloutX + 10} y={calloutY + 33} fill="#ffffff" fontSize="11" fontWeight="bold" fontFamily="monospace">
                {city}, {country}
              </text>
              <text x={calloutX + 10} y={calloutY + 46} fill="#94a3b8" fontSize="9" fontFamily="monospace">
                IP: {ip}
              </text>
              <text x={calloutX + 10} y={calloutY + 58} fill="#38bdf8" fontSize="9" fontFamily="monospace">
                ASN: {asn} ({lat.toFixed(2)}°, {lng.toFixed(2)}°)
              </text>
            </g>
          );
        })()}
      </g>

      {/* Compass / HUD Overlay */}
      <g transform="translate(20, 20)" fill="#64748b" fontSize="9" fontFamily="monospace">
        <text x="0" y="0" fill="#38bdf8" fontWeight="bold">SENTINEL-X GLOBAL SOC GEO-LOCATOR</text>
        <text x="0" y="14">PROJECTION: CYBER-CYLINDRICAL · WGS84</text>
      </g>
    </svg>
  );
}





/* ══════════════════════════════════════════════════
   HIGH-FIDELITY PDF REPORT HTML GENERATOR
══════════════════════════════════════════════════ */
function generateFormattedPdfHtml(
  type: ReportType,
  data: ReportData,
  result: EmailAnalysisResult | null
): string {
  const typeLabel = REPORT_TYPES.find((r) => r.id === type)?.label ?? '';
  const scoreColor = data.riskScore >= 80 ? '#ef4444' : data.riskScore >= 50 ? '#f97316' : '#22c55e';
  const alertBadgeColor =
    data.riskScore >= 80 ? '#dc2626' : data.riskScore >= 50 ? '#d97706' : '#16a34a';

  const originLat = result?.origin?.latitude ?? 28.6139;
  const originLng = result?.origin?.longitude ?? 77.2090;
  const originCity = result?.origin?.city ?? 'New Delhi';
  const originCountry = result?.origin?.country ?? 'India';
  const originIp = result?.origin?.sending_ip ?? result?.threat_intel?.sending_ip ?? '103.19.199.18';
  const originAsn = result?.origin?.asn ?? 'AS55836';
  const originHosting = result?.origin?.hosting ?? 'Reliance Jio Cloud Gateway';

  const senderDomain = result?.threat_intel.domain || 'micros0ft-support.example';
  const targetEmail = result?.headers?.find((h) => h.key.toLowerCase() === 'to')?.value || 'cfo@acme-corp.example';
  const fromHeader = result?.headers?.find((h) => h.key.toLowerCase() === 'from')?.value || 'Microsoft Billing <finance@micros0ft-support.example>';
  const subjectHeader = result?.headers?.find((h) => h.key.toLowerCase() === 'subject')?.value || data.caseTitle;
  const dateHeader = result?.headers?.find((h) => h.key.toLowerCase() === 'date')?.value || new Date().toUTCString();
  const replyToHeader = result?.headers?.find((h) => h.key.toLowerCase() === 'reply-to')?.value || 'secure-verification.example';
  const campaign = result?.campaign_id && result.campaign_id !== 'UNKNOWN' ? result.campaign_id : 'WIRE-FAUD-247';
  const evidenceHash = result?.evidence?.find((e) => e.hash)?.hash || 'a3f5b8c9d2e1f4a7b6c8d5e2f1a4b7c9d6e3f0a1b4c7d2e5';
  const payloadUrl = result?.threat_intel?.urls?.[0] || `https://${senderDomain}/auth-verify`;

  // Map coordinates calculation for SVG
  const mapX = Math.max(30, Math.min(670, ((originLng + 180) / 360) * 700));
  const mapY = Math.max(30, Math.min(320, ((90 - originLat) / 180) * 350));
  const calloutX = mapX > 450 ? mapX - 210 : mapX + 35;
  const calloutY = mapY > 240 ? mapY - 75 : mapY + 15;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SENTINEL-X ${typeLabel} — ${data.caseId}</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600;700;800&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: #0f172a;
      background: #f8fafc;
      padding: 30px;
      line-height: 1.5;
      font-size: 12px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    @keyframes cyberPulse1 {
      0% { transform: scale(0.6); opacity: 0.9; }
      50% { transform: scale(2.2); opacity: 0; }
      100% { transform: scale(2.2); opacity: 0; }
    }
    @keyframes cyberPulse2 {
      0% { transform: scale(0.6); opacity: 0.9; }
      30% { transform: scale(0.6); opacity: 0.7; }
      80% { transform: scale(2.6); opacity: 0; }
      100% { transform: scale(2.6); opacity: 0; }
    }
    .cyber-pulse-ring-1 {
      animation: cyberPulse1 2.2s ease-out infinite;
    }
    .cyber-pulse-ring-2 {
      animation: cyberPulse2 2.2s ease-out infinite;
    }
    .leaflet-container {
      background: #06070a !important;
      font-family: 'Inter', system-ui, sans-serif !important;
    }
    .leaflet-tile {
      filter: brightness(0.95) contrast(1.15) saturate(1.2);
    }

    @media print {
      body { padding: 0; background: #ffffff; }
      .no-print { display: none !important; }
      @page {
        margin: 12mm 14mm;
        size: A4 portrait;
      }
      .page-break { page-break-before: always; break-before: page; }
      .avoid-break { page-break-inside: avoid; break-inside: avoid; }
    }

    /* Print action bar */
    .print-bar {
      position: fixed;
      bottom: 24px;
      right: 24px;
      display: flex;
      gap: 12px;
      z-index: 9999;
    }
    .print-btn {
      background: linear-gradient(135deg, #7c3aed, #9333ea);
      color: #ffffff;
      padding: 14px 28px;
      border-radius: 12px;
      font-weight: 700;
      font-size: 13px;
      border: none;
      cursor: pointer;
      box-shadow: 0 10px 25px rgba(124, 58, 237, 0.4);
      display: flex;
      align-items: center;
      gap: 8px;
      font-family: 'Inter', sans-serif;
    }

    .report-container {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 36px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.05);
    }

    /* Header Bar */
    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 20px;
      margin-bottom: 24px;
    }
    .brand-title {
      font-size: 26px;
      font-weight: 900;
      letter-spacing: -0.5px;
      color: #0f172a;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .brand-title span {
      color: #7c3aed;
    }
    .brand-sub {
      font-size: 11px;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 2px;
    }
    .meta-box {
      text-align: right;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      line-height: 1.6;
    }
    .meta-tag {
      display: inline-block;
      padding: 3px 8px;
      background: #0f172a;
      color: #ffffff;
      border-radius: 4px;
      font-weight: 700;
      font-size: 10px;
    }

    /* Executive Score Card */
    .exec-card {
      background: #0f172a;
      color: #ffffff;
      border-radius: 14px;
      padding: 24px;
      display: flex;
      align-items: center;
      gap: 24px;
      margin-bottom: 24px;
    }
    .score-circle {
      width: 100px;
      height: 100px;
      border-radius: 14px;
      background: #1e293b;
      border: 3px solid ${scoreColor};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .score-num {
      font-size: 34px;
      font-weight: 900;
      color: ${scoreColor};
      line-height: 1;
    }
    .score-lbl {
      font-size: 9px;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      color: #94a3b8;
      margin-top: 4px;
      letter-spacing: 0.5px;
    }
    .exec-info h2 {
      font-size: 18px;
      font-weight: 800;
      margin-bottom: 6px;
      color: #f8fafc;
    }
    .exec-summary {
      font-size: 12.5px;
      color: #cbd5e1;
      line-height: 1.6;
    }

    /* Section Styling */
    .section-head {
      font-size: 13px;
      font-weight: 800;
      font-family: 'JetBrains Mono', monospace;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #0f172a;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 26px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .section-head span {
      font-size: 10px;
      color: #64748b;
      font-weight: 600;
    }

    /* Data Tables & Key Values */
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 12px;
    }
    .meta-table td, .meta-table th {
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      text-align: left;
    }
    .meta-table th {
      background: #f1f5f9;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #334155;
    }
    .mono-val {
      font-family: 'JetBrains Mono', monospace;
      color: #0f172a;
      font-weight: 500;
    }

    /* Auth Badge Cards */
    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }
    .grid-4 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr 1fr;
      gap: 10px;
      margin-bottom: 16px;
    }

    .auth-box {
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      padding: 12px;
      background: #f8fafc;
      text-align: center;
    }
    .auth-title {
      font-size: 10px;
      font-family: 'JetBrains Mono', monospace;
      font-weight: 700;
      color: #64748b;
      margin-bottom: 4px;
    }
    .auth-status {
      font-size: 16px;
      font-weight: 900;
      font-family: 'JetBrains Mono', monospace;
    }
    .status-fail { color: #dc2626; }
    .status-pass { color: #16a34a; }
    .status-warn { color: #d97706; }

    .callout-row {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-left: 4px solid #7c3aed;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 8px;
      font-size: 12px;
      color: #334155;
    }

    .action-row {
      background: #fff7ed;
      border: 1px solid #fed7aa;
      border-left: 4px solid #f97316;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 8px;
      font-size: 12px;
      color: #7c2d12;
    }

    .map-container {
      background: #040711;
      border-radius: 12px;
      padding: 14px;
      margin-bottom: 16px;
      border: 1px solid #1e293b;
    }

    .footer {
      margin-top: 36px;
      padding-top: 14px;
      border-top: 1px solid #cbd5e1;
      font-size: 10px;
      color: #94a3b8;
      font-family: 'JetBrains Mono', monospace;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  </style>
</head>
<body>
  <div class="print-bar no-print">
    <button class="print-btn" onclick="window.print()">
      <span>🖨️ Print / Save as PDF</span>
    </button>
  </div>

  <div class="report-container">
    <!-- Header -->
    <div class="header-bar">
      <div>
        <div class="brand-title">SENTINEL<span>-X</span> SOC</div>
        <div class="brand-sub">${typeLabel} · Cyber Threat Intelligence</div>
      </div>
      <div class="meta-box">
        <div>CASE: <strong class="mono-val">${data.caseId}</strong></div>
        <div>DATE: <span class="mono-val">${new Date().toISOString().slice(0, 10)}</span></div>
        <div style="margin-top: 4px;"><span class="meta-tag">TOP SECRET // FORENSICS</span></div>
      </div>
    </div>

    <!-- Executive Summary Card -->
    <div class="exec-card avoid-break">
      <div class="score-circle">
        <div class="score-num">${data.riskScore}</div>
        <div class="score-lbl">THREAT SCORE</div>
      </div>
      <div class="exec-info">
        <h2>${data.caseTitle}</h2>
        <div style="margin-bottom: 8px; font-family: 'JetBrains Mono', monospace; font-size: 11px;">
          CLASSIFICATION: <strong style="color: ${scoreColor};">${result?.verdict || 'BEC Impersonation'}</strong> · 
          CONFIDENCE: <strong>${result?.confidence ?? 95}%</strong>
        </div>
        <div class="exec-summary">${data.threatSummary}</div>
      </div>
    </div>

    <!-- 1. Email Analyzer Telemetry & Headers -->
    <div class="section-head avoid-break">
      <span>1. EMAIL TELEMETRY & RFC HEADERS</span>
      <span>CASE ID: ${data.caseId}</span>
    </div>

    <table class="meta-table avoid-break">
      <tr>
        <th style="width: 22%;">From Header</th>
        <td class="mono-val">${fromHeader}</td>
      </tr>
      <tr>
        <th>Target Recipient (To)</th>
        <td class="mono-val">${targetEmail}</td>
      </tr>
      <tr>
        <th>Subject Line</th>
        <td class="mono-val">${subjectHeader}</td>
      </tr>
      <tr>
        <th>Reply-To Redirection</th>
        <td class="mono-val">${replyToHeader}</td>
      </tr>
      <tr>
        <th>Transmission Timestamp</th>
        <td class="mono-val">${dateHeader}</td>
      </tr>
    </table>

    <!-- Key Risk Factors -->
    ${result?.risk_factors && result.risk_factors.length > 0 ? `
    <div style="margin-bottom: 16px;" class="avoid-break">
      <strong style="font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #475569; display: block; margin-bottom: 6px;">IDENTIFIED THREAT RISK FACTORS</strong>
      ${result.risk_factors.map((rf) => `
        <div class="callout-row" style="border-left-color: ${rf.severity === 'critical' ? '#ef4444' : '#f97316'};">
          <strong style="font-family: 'JetBrains Mono', monospace;">[${rf.severity.toUpperCase()}] ${rf.label}:</strong> ${rf.detail}
        </div>
      `).join('')}
    </div>
    ` : ''}

    <!-- 2. Header Forensics & Cryptographic Authentication Matrix -->
    <div class="section-head avoid-break">
      <span>2. HEADER FORENSICS & AUTHENTICATION MATRIX</span>
      <span>CRYPTOGRAPHIC INTEGRITY</span>
    </div>

    <div class="grid-3 avoid-break">
      <div class="auth-box">
        <div class="auth-title">SPF VERIFICATION</div>
        <div class="auth-status ${(result?.threat_intel.spf ?? 'FAIL') === 'PASS' ? 'status-pass' : 'status-fail'}">
          ${result?.threat_intel.spf ?? 'FAIL'}
        </div>
        <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Sending IP authorization check</div>
      </div>
      <div class="auth-box">
        <div class="auth-title">DKIM SIGNATURE</div>
        <div class="auth-status ${(result?.threat_intel.dkim ?? 'FAIL') === 'PASS' ? 'status-pass' : 'status-fail'}">
          ${result?.threat_intel.dkim ?? 'FAIL'}
        </div>
        <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Cryptographic hash verification</div>
      </div>
      <div class="auth-box">
        <div class="auth-title">DMARC POLICY</div>
        <div class="auth-status ${(result?.threat_intel.dmarc ?? 'FAIL') === 'PASS' ? 'status-pass' : 'status-fail'}">
          ${result?.threat_intel.dmarc ?? 'FAIL'}
        </div>
        <div style="font-size: 10px; color: #64748b; margin-top: 4px;">Domain alignment & reject policy</div>
      </div>
    </div>

    <!-- SMTP Relay Hops Table -->
    <div class="avoid-break" style="margin-bottom: 16px;">
      <strong style="font-size: 11px; font-family: 'JetBrains Mono', monospace; color: #475569; display: block; margin-bottom: 6px;">SMTP RELAY TRANSIT CHAIN</strong>
      <table class="meta-table">
        <thead>
          <tr>
            <th>Hop</th>
            <th>Received From IP / Host</th>
            <th>By MTA Server</th>
            <th>Country</th>
            <th>Latency</th>
          </tr>
        </thead>
        <tbody>
          ${SMTP_RELAYS.map((h) => `
            <tr>
              <td class="mono-val" style="font-weight: 700;">#${h.hop}</td>
              <td class="mono-val">${h.ip}</td>
              <td class="mono-val">${h.hostname}</td>
              <td>${h.country}</td>
              <td class="mono-val">${h.timestamp}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>

    <!-- Page Break for Clean Visual Print Flow -->
    <div class="page-break"></div>

    <!-- 3. Threat Intelligence & Infrastructure Profiling -->
    <div class="section-head avoid-break" style="margin-top: 0;">
      <span>3. THREAT INTELLIGENCE & INFRASTRUCTURE</span>
      <span>IOC CORRELATION</span>
    </div>

    <div class="grid-4 avoid-break">
      <div class="auth-box" style="text-align: left;">
        <div class="auth-title">SENDING IP REPUTATION</div>
        <div style="font-size: 13px; font-weight: 800; color: #dc2626; font-family: 'JetBrains Mono', monospace;">
          ${(result?.threat_intel.ip_reputation ?? 'malicious').toUpperCase()}
        </div>
        <div style="font-size: 10px; font-family: 'JetBrains Mono', monospace; color: #475569;">${originIp}</div>
      </div>
      <div class="auth-box" style="text-align: left;">
        <div class="auth-title">DOMAIN REGISTRATION AGE</div>
        <div style="font-size: 13px; font-weight: 800; color: #d97706; font-family: 'JetBrains Mono', monospace;">
          ${result?.threat_intel.domain_age_days ? `${result.threat_intel.domain_age_days} Days Old` : '3 Days Old'}
        </div>
        <div style="font-size: 10px; font-family: 'JetBrains Mono', monospace; color: #475569;">${senderDomain}</div>
      </div>
      <div class="auth-box" style="text-align: left;">
        <div class="auth-title">BLOCKLIST LISTINGS</div>
        <div style="font-size: 13px; font-weight: 800; color: #dc2626; font-family: 'JetBrains Mono', monospace;">
          ${result?.threat_intel.blocklists?.length ? `${result.threat_intel.blocklists.length} Engines` : '3 Engines'}
        </div>
        <div style="font-size: 10px; color: #475569;">Spamhaus XBL, SORBS</div>
      </div>
      <div class="auth-box" style="text-align: left;">
        <div class="auth-title">AUTONOMOUS SYSTEM</div>
        <div style="font-size: 13px; font-weight: 800; color: #7c3aed; font-family: 'JetBrains Mono', monospace;">
          ${originAsn}
        </div>
        <div style="font-size: 10px; color: #475569; truncate;">${originHosting}</div>
      </div>
    </div>

    <!-- 4. Origin Investigation & Geolocation Map Visual (DarkCyberMap Theme) -->
    <div class="section-head avoid-break">
      <span>4. ORIGIN INVESTIGATION & GEOLOCATION MAP</span>
      <span>GPS: ${originLat.toFixed(4)}° N, ${originLng.toFixed(4)}° E</span>
    </div>

    <div class="avoid-break" style="margin-bottom: 16px; border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.15); background: #06070a; position: relative; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
      <!-- Leaflet DarkCyberMap Container -->
      <div id="cyber-pdf-map" style="width: 100%; height: 360px; background: #06070a; z-index: 1;"></div>

      <!-- Top Right Origin Status Badge -->
      <div style="position: absolute; top: 14px; right: 14px; z-index: 1000; display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 10px; background: rgba(12,15,26,0.92); border: 1px solid rgba(239,68,68,0.4); color: #fff; font-family: 'JetBrains Mono', monospace; font-size: 11px; box-shadow: 0 4px 16px rgba(0,0,0,0.6);">
        <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 8px #ef4444;"></span>
        <span style="font-weight: 700; color: #ef4444; letter-spacing: 0.05em;">SUSPECTED ORIGIN:</span>
        <span style="color: #fff; font-weight: 600;">${originCity}, ${originCountry}</span>
      </div>

      <!-- Bottom Left Origin HUD Telemetry Overlay -->
      <div style="position: absolute; bottom: 14px; left: 14px; z-index: 1000; background: rgba(12,15,26,0.92); border: 1px solid rgba(56,189,248,0.3); border-radius: 10px; padding: 8px 14px; color: #cbd5e1; font-family: 'JetBrains Mono', monospace; font-size: 10px; box-shadow: 0 4px 16px rgba(0,0,0,0.6);">
        <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
          <div><span style="color: #64748b;">IP:</span> <strong style="color: #38bdf8;">${originIp}</strong></div>
          <div><span style="color: #64748b;">ASN:</span> <strong style="color: #a855f7;">${originAsn}</strong></div>
          <div><span style="color: #64748b;">HOSTING:</span> <strong style="color: #f1f5f9;">${originHosting}</strong></div>
          <div><span style="color: #64748b;">COORDINATES:</span> <strong style="color: #facc15;">${originLat.toFixed(4)}° N, ${originLng.toFixed(4)}° E</strong></div>
        </div>
      </div>
    </div>

    <!-- 5. Visual Attack Graph (Full Multi-Node Topology with 100% On-Screen Parity) -->
    <div class="section-head avoid-break">
      <span>5. ATTACK TOPOLOGY GRAPH</span>
      <span>INTRUSION CHAIN & CORRELATED IOC INFRASTRUCTURE</span>
    </div>

    <div class="map-container avoid-break" style="padding: 16px; background: #07080e; border-radius: 12px; border: 1px solid rgba(255,255,255,0.15); box-shadow: 0 8px 32px rgba(0,0,0,0.6); overflow: hidden;">
      ${renderAttackGraphToSvg(result, getCaseLayoutStyle(result?.case_id))}
    </div>

    <!-- 6. Recommended Incident Response & Remediation Plan -->
    <div class="section-head avoid-break">
      <span>6. RECOMMENDED INCIDENT RESPONSE ACTIONS</span>
      <span>SOC PLAYBOOK</span>
    </div>

    <div class="avoid-break">
      ${data.recommendedActions.map((a, i) => `
        <div class="action-row">
          <strong style="font-family: 'JetBrains Mono', monospace;">ACTION ${i + 1}:</strong> ${a}
        </div>
      `).join('')}
    </div>

    <!-- Footer -->
    <div class="footer avoid-break">
      <div>SENTINEL-X SECURITY OPERATIONS PLATFORM · CRYPTOGRAPHICALLY SECURED</div>
      <div>PAGE 1 OF 2 · CONFIDENTIAL</div>
    </div>
  </div>

  <script>
    function initPdfMap() {
      try {
        if (typeof L === 'undefined') {
          setTimeout(function() { window.print(); }, 500);
          return;
        }
        var map = L.map('cyber-pdf-map', {
          center: [${originLat}, ${originLng}],
          zoom: 5,
          zoomControl: false,
          attributionControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false
        });

        var tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          subdomains: 'abcd',
          maxZoom: 19
        }).addTo(map);

        var pulseIcon = L.divIcon({
          className: '',
          iconSize: [44, 44],
          iconAnchor: [22, 22],
          html: '<div style="position:relative;width:44px;height:44px;display:flex;align-items:center;justify-content:center;">' +
            '<div class="cyber-pulse-ring-1" style="position:absolute;width:16px;height:16px;border-radius:50%;background:#ef4444;opacity:0.85;"></div>' +
            '<div class="cyber-pulse-ring-2" style="position:absolute;width:16px;height:16px;border-radius:50%;background:#ef4444;opacity:0.6;"></div>' +
            '<div style="position:absolute;width:24px;height:24px;border-radius:50%;border:1.5px solid #ef4444;opacity:0.6;box-shadow:0 0 14px 5px rgba(239,68,68,0.5);"></div>' +
            '<div style="position:relative;width:12px;height:12px;border-radius:50%;background:#facc15;border:2px solid #ef4444;box-shadow:0 0 12px 4px rgba(239,68,68,0.8);z-index:2;">' +
            '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:4px;height:4px;border-radius:50%;background:#ffffff;"></div>' +
            '</div></div>'
        });

        L.marker([${originLat}, ${originLng}], { icon: pulseIcon }).addTo(map);

        var printTriggered = false;
        function triggerPrint() {
          if (printTriggered) return;
          printTriggered = true;
          setTimeout(function() { window.print(); }, 700);
        }

        tileLayer.on('load', function() {
          triggerPrint();
        });

        setTimeout(triggerPrint, 2000);
      } catch (err) {
        setTimeout(function() { window.print(); }, 600);
      }
    }

    window.onload = function() {
      initPdfMap();
    };
  </script>
</body>
</html>`;
}

function generateReportText(
  type: ReportType,
  data: ReportData,
  result: EmailAnalysisResult | null
): string {
  const typeLabel = REPORT_TYPES.find((r) => r.id === type)?.label ?? 'Report';
  let text = `=================================================================\n`;
  text += `SENTINEL-X ${typeLabel.toUpperCase()} — CASE ${data.caseId}\n`;
  text += `=================================================================\n\n`;
  text += `Generated: ${new Date().toISOString()}\n`;
  text += `Classification: CONFIDENTIAL // SOC INCIDENT DOSSIER\n`;
  text += `Case Title: ${data.caseTitle}\n`;
  text += `Risk Threat Score: ${data.riskScore} / 100\n`;
  text += `Status: ${data.investigationStatus}\n\n`;

  text += `[1] THREAT EXECUTIVE SUMMARY\n`;
  text += `-----------------------------------------------------------------\n`;
  text += `${data.threatSummary}\n\n`;

  text += `[2] KEY FORENSIC FINDINGS\n`;
  text += `-----------------------------------------------------------------\n`;
  data.keyFindings.forEach((f, i) => { text += `${i + 1}. ${f}\n`; });
  text += `\n`;

  if (result?.headers) {
    text += `[3] EXTRACTED RFC-5322 HEADERS\n`;
    text += `-----------------------------------------------------------------\n`;
    result.headers.forEach((h) => { text += `${h.key}: ${h.value}\n`; });
    text += `\n`;
  }

  text += `[4] AUTHENTICATION & THREAT INTELLIGENCE\n`;
  text += `-----------------------------------------------------------------\n`;
  text += `SPF Validation: ${result?.threat_intel.spf ?? 'FAIL'}\n`;
  text += `DKIM Signature: ${result?.threat_intel.dkim ?? 'FAIL'}\n`;
  text += `DMARC Policy:   ${result?.threat_intel.dmarc ?? 'FAIL'}\n`;
  text += `Sending IP:     ${result?.origin.sending_ip ?? result?.threat_intel.sending_ip ?? '185.220.101.47'}\n`;
  text += `Domain:         ${result?.threat_intel.domain ?? 'micros0ft-support.example'}\n`;
  text += `IP Reputation:  ${result?.threat_intel.ip_reputation ?? 'malicious'}\n\n`;

  text += `[5] ORIGIN GEOLOCATION\n`;
  text += `-----------------------------------------------------------------\n`;
  text += `Country:     ${result?.origin.country ?? 'India'}\n`;
  text += `City:        ${result?.origin.city ?? 'New Delhi'}\n`;
  text += `Coordinates: ${result?.origin.latitude ?? 28.6139}° N, ${result?.origin.longitude ?? 77.2090}° E\n`;
  text += `ASN / Host:  ${result?.origin.asn ?? 'AS55836'} (${result?.origin.hosting ?? 'Reliance Jio'})\n\n`;

  text += `[6] RECOMMENDED INCIDENT RESPONSE ACTIONS\n`;
  text += `-----------------------------------------------------------------\n`;
  data.recommendedActions.forEach((a, i) => { text += `${i + 1}. ${a}\n`; });
  text += `\n`;

  text += `=================================================================\n`;
  text += `End of Sentinel-X Forensic Dossier\n`;
  return text;
}

/* ══════════════════════════════════════════════════
   SENTINEL AI ASSISTANT COMPONENT
══════════════════════════════════════════════════ */
interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

function SentinelAI({ currentResult }: { currentResult: EmailAnalysisResult }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);

  const dynamicSuggestedQuestions = useMemo(() => {
    const questions = [
      { id: 'q1', question: `Why is this classified as "${currentResult.verdict}"?` },
      { id: 'q2', question: `Explain the risk score (${currentResult.threat_score}/100) & risk factors.` },
      { id: 'q3', question: `Analyze authentication results (SPF: ${currentResult.threat_intel.spf}, DKIM: ${currentResult.threat_intel.dkim}, DMARC: ${currentResult.threat_intel.dmarc}).` },
      { id: 'q4', question: `What indicators (IOCs) and URLs are associated with ${currentResult.threat_intel.domain || 'this sender'}?` },
      { id: 'q5', question: `What prioritized containment steps should the SOC take?` },
      { id: 'q6', question: `Summarize case ${currentResult.case_id} for executive briefing.` },
    ];
    return questions;
  }, [currentResult]);

  useEffect(() => {
    setMessages([]);
  }, [currentResult.case_id]);

  const askQuestion = async (questionText: string) => {
    if (!questionText.trim() || thinking) return;

    const userMsg: ChatMessage = { role: 'user', content: questionText };
    setMessages((prev) => [...prev, userMsg]);
    setThinking(true);
    setInput('');

    try {
      const history: AssistantChatMessage[] = messages.map((m) => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      }));

      const reply = await askSentinelAssistant(questionText, currentResult, history);
      setMessages((prev) => [...prev, { role: 'ai', content: reply }]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content: `**Case ${currentResult.case_id} Telemetry Brief**\n\n• Verdict: **${currentResult.verdict}** (Threat Score: ${currentResult.threat_score}/100)\n• Sender: \`${currentResult.threat_intel.domain || 'Unknown'}\`\n• Summary: ${currentResult.summary}`,
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    askQuestion(input.trim());
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
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-400" />
            SENTINEL SOC AI Assistant
          </h3>
          <p className="text-[11px] text-gray-500 mt-0.5">
            Grounded in active case <span className="text-purple-300 font-mono font-semibold">{currentResult.case_id}</span> ({currentResult.verdict})
          </p>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="text-[10px] font-mono text-gray-500 hover:text-gray-300 px-2 py-1 rounded bg-white/5"
            >
              Clear Chat
            </button>
          )}
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl text-[10px] font-mono font-bold text-purple-300"
            style={{ background: 'rgba(168,85,247,0.15)', border: '1px solid rgba(168,85,247,0.3)' }}
          >
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse" />
            ONLINE
          </div>
        </div>
      </div>

      {/* Suggested Questions */}
      <div className="mb-4">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-mono font-bold mb-2">
          Suggested Case Telemetry Queries
        </p>
        <div className="flex flex-wrap gap-2">
          {dynamicSuggestedQuestions.map((q) => (
            <button
              key={q.id}
              onClick={() => askQuestion(q.question)}
              className="px-3 py-1.5 rounded-xl text-xs font-mono text-gray-300 hover:text-white transition-all hover:scale-[1.02] text-left"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              {q.question}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Window */}
      <div
        className="rounded-xl p-4 max-h-96 overflow-y-auto scrollbar-thin space-y-3 min-h-[160px]"
        style={{ background: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        {messages.length === 0 && !thinking && (
          <div className="flex flex-col items-center justify-center text-center py-8">
            <Brain className="w-8 h-8 text-gray-700 mb-2" />
            <p className="text-xs text-gray-400 font-mono font-semibold">
              SENTINEL SOC AI is ready to analyze case {currentResult.case_id}
            </p>
            <p className="text-[11px] text-gray-600 font-mono mt-1">
              Ask any specific question about headers, threat vectors, IOCs, or remediation
            </p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-xl p-3.5 text-xs leading-relaxed ${msg.role === 'user'
                ? 'bg-blue-500/15 border border-blue-500/30 text-white font-mono'
                : 'bg-purple-500/10 border border-purple-500/25 text-gray-300 whitespace-pre-wrap'
                }`}
            >
              {msg.role === 'ai' && (
                <div className="flex items-center gap-1.5 mb-2 text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wider">
                  <Brain className="w-3.5 h-3.5" /> SENTINEL SOC AI FORENSICS
                </div>
              )}
              {msg.content}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex justify-start">
            <div
              className="rounded-xl p-3 flex items-center gap-2 text-xs font-mono text-purple-400"
              style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}
            >
              <Brain className="w-4 h-4 animate-spin" />
              <span>Analyzing case telemetry & querying Gemini engine…</span>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="flex gap-2 mt-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={`Ask SENTINEL AI anything about case ${currentResult.case_id}...`}
          className="flex-1 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none font-mono"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        />
        <button
          onClick={handleSend}
          disabled={thinking || !input.trim()}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all font-mono hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
          style={{
            background: 'linear-gradient(135deg, rgba(168,85,247,0.4), rgba(124,58,237,0.4))',
            border: '1px solid rgba(168,85,247,0.5)',
          }}
        >
          <Send className="w-3.5 h-3.5" />
          Ask
        </button>
      </div>
    </div>
  );
}
