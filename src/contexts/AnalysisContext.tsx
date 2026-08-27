import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { EmailAnalysisResult } from '@/services/claudeService';
import { buildDemoAnalysisResult } from '@/services/claudeService';
import type { ReportData } from '@/data/mockData';
import {
  KEY_ANALYZED_REPORTS,
  KEY_ACTIVE_CASE,
  KEY_EVIDENCE_VAULT,
  KEY_CAMPAIGN_OVERRIDES,
  KEY_CASE_STATUS_OVERRIDES,
  KEY_USER_CAMPAIGNS,
  clearEphemeralStorage,
  clearAllSentinelStorage,
} from '@/utils/storageKeys';

export interface AnalysisContextValue {
  analyzedReports: EmailAnalysisResult[];
  currentResult: EmailAnalysisResult | null;
  currentReportData: ReportData | null;
  hasCustomAnalysis: boolean;
  addAnalysisResult: (result: EmailAnalysisResult) => void;
  selectCase: (caseId: string) => void;
  deleteCase: (caseId: string) => void;
  /** Clears all Sentinel data (persistent + ephemeral). Used by logout & Settings Reset Cache. */
  clearCases: () => void;
  loadDemoCase: () => void;
  /** Clears only the ephemeral forensic-session state (active case + evidence vault).
   *  Called before each new analysis so the forensic pages start clean. */
  resetActiveAnalysis: () => void;
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null);

export function convertAnalysisToReportData(result: EmailAnalysisResult): ReportData {
  const subjectHdr = result.headers.find((h) => h.key.toLowerCase() === 'subject')?.value;
  const fromHdr = result.headers.find((h) => h.key.toLowerCase() === 'from')?.value;

  const caseTitle = subjectHdr
    ? `${result.verdict}: ${subjectHdr}`
    : `${result.verdict} — ${result.threat_intel.domain || result.origin.sending_ip || 'Email Forensics'}`;

  // Key findings
  const keyFindings =
    result.risk_factors.length > 0
      ? result.risk_factors.map((rf) => `${rf.label}: ${rf.detail}`)
      : result.ai_inferences.length > 0
      ? result.ai_inferences.map((inf) => `${inf.inference} (${inf.confidence}% confidence)`)
      : [`Verdict: ${result.verdict}`, `Threat Score: ${result.threat_score}/100`];

  // Observed facts
  const observedFacts =
    result.observed_facts.length > 0
      ? result.observed_facts.map((f) => `${f.field}: ${f.value} [${f.status.toUpperCase()}]`)
      : [
          `Sender Domain: ${result.threat_intel.domain || 'Not identified'}`,
          `Sending IP: ${result.threat_intel.sending_ip || result.origin.sending_ip || 'Not identified'}`,
          `SPF: ${result.threat_intel.spf} | DKIM: ${result.threat_intel.dkim} | DMARC: ${result.threat_intel.dmarc}`,
          ...(fromHdr ? [`From Header: ${fromHdr}`] : []),
        ];

  // AI Inferences
  const aiInference =
    result.ai_inferences.length > 0
      ? result.ai_inferences.map((inf) => `${inf.inference} — ${inf.confidence}% confidence (basis: ${inf.basis})`)
      : [`Threat classification: ${result.verdict} with confidence rating ${result.confidence}%`];

  // Indicators
  const indicators: { type: string; value: string }[] = [];
  if (result.threat_intel.sending_ip) {
    indicators.push({ type: 'IP', value: result.threat_intel.sending_ip });
  }
  if (result.threat_intel.domain) {
    indicators.push({ type: 'Domain', value: result.threat_intel.domain });
  }
  if (result.threat_intel.urls && result.threat_intel.urls.length > 0) {
    result.threat_intel.urls.forEach((u) => {
      if (u && !indicators.some((i) => i.value === u)) {
        indicators.push({ type: 'URL', value: u });
      }
    });
  }
  if (fromHdr) {
    indicators.push({ type: 'Sender', value: fromHdr });
  }
  if (result.campaign_id && result.campaign_id !== 'UNKNOWN') {
    indicators.push({ type: 'Campaign', value: result.campaign_id });
  }
  if (result.evidence && result.evidence.length > 0) {
    result.evidence.forEach((ev) => {
      if (ev.value && !indicators.some((i) => i.value === ev.value)) {
        indicators.push({ type: ev.type || 'Evidence', value: ev.value });
      }
    });
  }

  // Timeline
  const now = new Date();
  const dateStr = now.toISOString().replace('T', ' ').slice(0, 19);
  const timeline = [
    { time: dateStr, event: `Email analyzed by SENTINEL engine — Risk Score: ${result.threat_score}/100 (${result.alert_level.toUpperCase()})` },
    { time: dateStr, event: `Verdict established: ${result.verdict}` },
    { time: dateStr, event: `Authentication verification completed (SPF=${result.threat_intel.spf}, DKIM=${result.threat_intel.dkim}, DMARC=${result.threat_intel.dmarc})` },
    { time: dateStr, event: `Origin resolved: ${result.origin.country || 'Global'} (${result.origin.asn || 'AS Unknown'})` },
    { time: dateStr, event: `Forensic report and ledger evidence record saved for ${result.case_id}` },
  ];

  // Status
  const investigationStatus =
    result.alert_level === 'critical' || result.alert_level === 'high'
      ? 'Active SOC Investigation — High Priority'
      : result.alert_level === 'medium'
      ? 'Under SOC Review'
      : 'Automated Analysis Complete — Resolved / Low Risk';

  // Evidence summary
  const evidenceSummary =
    result.evidence.length > 0
      ? result.evidence.map((e) => `${e.type.toUpperCase()}: ${e.value} ${e.hash ? `[SHA-256: ${e.hash.slice(0, 16)}...]` : ''}`)
      : ['Raw email body and header stream cryptographically recorded'];

  // Recommended actions
  const recommendedActions =
    result.recommended_actions.length > 0
      ? result.recommended_actions.map((a) => `[${a.priority.toUpperCase()}] ${a.action}: ${a.detail}`)
      : ['Monitor sender domain and IP for subsequent abnormal transmission patterns'];

  return {
    caseId: result.case_id,
    caseTitle,
    threatSummary: result.summary || `Forensic inspection concluded for case ${result.case_id}.`,
    riskScore: result.threat_score,
    keyFindings,
    observedFacts,
    aiInference,
    indicators,
    timeline,
    investigationStatus,
    evidenceSummary,
    recommendedActions,
  };
}

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  // ── TIER 1: always load & persist analyzed reports unconditionally ──────────
  // Reports are permanent (Dashboard / Alerts / Reports / Campaigns rely on them).
  // They are never cleared on refresh — only on explicit Reset Cache or logout.
  const [analyzedReports, setAnalyzedReports] = useState<EmailAnalysisResult[]>(() => {
    try {
      const saved = localStorage.getItem(KEY_ANALYZED_REPORTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [currentCaseId, setCurrentCaseId] = useState<string | null>(null);

  // Always persist analyzed reports — no route-gating
  useEffect(() => {
    try {
      localStorage.setItem(KEY_ANALYZED_REPORTS, JSON.stringify(analyzedReports));
    } catch {
      // ignore
    }
  }, [analyzedReports]);

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const addAnalysisResult = useCallback((result: EmailAnalysisResult) => {
    setAnalyzedReports((prev) => {
      // Remove any existing result with the same case_id
      const filtered = prev.filter((r) => r.case_id !== result.case_id);
      return [result, ...filtered];
    });
    setCurrentCaseId(result.case_id);
  }, []);

  const selectCase = useCallback((caseId: string) => {
    setCurrentCaseId(caseId);
  }, []);

  const deleteCase = useCallback((caseId: string) => {
    setAnalyzedReports((prev) => {
      const filtered = prev.filter((r) => r.case_id !== caseId);
      if (currentCaseId === caseId) {
        setCurrentCaseId(filtered[0]?.case_id ?? null);
      }
      return filtered;
    });
  }, [currentCaseId]);

  /**
   * In-memory clear — resets the analyzed reports list in React state.
   * Does NOT touch localStorage so persistent data survives logout/login.
   * Called by Reset Cache (which separately clears localStorage via clearAllSentinelStorage).
   */
  const clearCases = useCallback(() => {
    setAnalyzedReports([]);
    setCurrentCaseId(null);
  }, []);

  /**
   * Ephemeral-only reset — clears the active case ID and evidence vault
   * so forensic pages (Email Analyzer, Header Forensics, etc.) start fresh.
   * Called before each new analysis run.
   */
  const resetActiveAnalysis = useCallback(() => {
    setCurrentCaseId(null);
    clearEphemeralStorage();
    // Also clear campaign-session overrides that were created during the analysis
    try { localStorage.removeItem(KEY_CAMPAIGN_OVERRIDES); } catch { /* ignore */ }
    try { localStorage.removeItem(KEY_CASE_STATUS_OVERRIDES); } catch { /* ignore */ }
    try { localStorage.removeItem(KEY_USER_CAMPAIGNS); } catch { /* ignore */ }
  }, []);

  const loadDemoCase = useCallback(() => {
    const demo = buildDemoAnalysisResult();
    addAnalysisResult(demo);
  }, [addAnalysisResult]);

  const currentResult = useMemo(() => {
    if (!currentCaseId) return null;
    return analyzedReports.find((r) => r.case_id === currentCaseId) ?? null;
  }, [analyzedReports, currentCaseId]);

  const currentReportData = useMemo(() => {
    if (!currentResult) return null;
    return convertAnalysisToReportData(currentResult);
  }, [currentResult]);

  const hasCustomAnalysis = useMemo(() => {
    return analyzedReports.some((r) => r.case_id !== 'CASE-2026-0471');
  }, [analyzedReports]);

  return (
    <AnalysisContext.Provider
      value={{
        analyzedReports,
        currentResult,
        currentReportData,
        hasCustomAnalysis,
        addAnalysisResult,
        selectCase,
        deleteCase,
        clearCases,
        loadDemoCase,
        resetActiveAnalysis,
      }}
    >
      {children}
    </AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const context = useContext(AnalysisContext);
  if (!context) {
    throw new Error('useAnalysis must be used within an AnalysisProvider');
  }
  return context;
}
