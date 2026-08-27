import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Campaign, CampaignStatus, Severity, ThreatType, CaseStatus } from '@/data/mockData';
import { CAMPAIGNS } from '@/data/mockData';
import { useAnalysis } from '@/contexts/AnalysisContext';
import {
  KEY_USER_CAMPAIGNS,
  KEY_CAMPAIGN_OVERRIDES,
  KEY_CASE_STATUS_OVERRIDES,
  KEY_DELETED_CAMPAIGNS,
} from '@/utils/storageKeys';

// IDs that belong to the static mock dataset (handled via overrides, not customCampaigns)
const STATIC_CAMPAIGN_IDS = new Set(CAMPAIGNS.map((c) => c.id));

export interface CampaignStats {
  emailsObserved: number;
  uniqueDomains: number;
  uniqueIPs: number;
  suspiciousURLs: number;
  activeCases: number;
}

export interface CampaignContextValue {
  campaigns: Campaign[];
  totalCampaigns: number;
  activeCampaignsCount: number;
  stats: CampaignStats;
  lastRefreshed: Date;
  addCampaign: (campaign: Partial<Campaign>) => Campaign;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;
  clearCampaigns: () => void;
  setCaseStatus: (caseId: string, status: CaseStatus) => void;
  getCaseStatus: (caseId: string, fallback: CaseStatus) => CaseStatus;
}

const CampaignContext = createContext<CampaignContextValue | null>(null);

function alertToSeverity(level: string): Severity {
  if (level === 'critical' || level === 'high' || level === 'medium' || level === 'low' || level === 'info') {
    return level as Severity;
  }
  return 'info';
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as T;
      if (parsed !== null && parsed !== undefined) return parsed;
    }
  } catch {
    // ignore
  }
  return fallback;
}

export function CampaignProvider({ children }: { children: React.ReactNode }) {
  const { analyzedReports } = useAnalysis();

  // ── 1. Custom user-created campaigns (not in static set) ──────────────────
  // TIER 1 — always load unconditionally (no route-gating)
  const [customCampaigns, setCustomCampaigns] = useState<Campaign[]>(() => {
    const loaded = loadJSON<Campaign[]>(KEY_USER_CAMPAIGNS, []);
    return loaded.filter((c) => !STATIC_CAMPAIGN_IDS.has(c.id));
  });

  // ── 2. Overrides for static & analysis-derived campaigns (field-level patches) ──
  // TIER 1 — always load unconditionally
  const [campaignOverrides, setCampaignOverrides] = useState<Record<string, Partial<Campaign>>>(
    () => loadJSON<Record<string, Partial<Campaign>>>(KEY_CAMPAIGN_OVERRIDES, {})
  );

  // ── 3. Case status overrides (persisted across navigation) ────────────────
  // TIER 1 — always load unconditionally
  const [caseStatusOverrides, setCaseStatusOverrides] = useState<Record<string, CaseStatus>>(
    () => loadJSON<Record<string, CaseStatus>>(KEY_CASE_STATUS_OVERRIDES, {})
  );

  // ── 3b. Deleted campaigns tracking ───────────────────────────────────────
  const [deletedCampaignIds, setDeletedCampaignIds] = useState<string[]>(
    () => loadJSON<string[]>(KEY_DELETED_CAMPAIGNS, [])
  );

  // ── 4. Real-time ticker: updates every 30 seconds ─────────────────────────
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // ── 5. Live email count simulation: active campaigns tick every 60s ────────
  const liveTickRef = useRef(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setLastRefreshed(new Date());
      liveTickRef.current += 1;
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  // ── Persist to localStorage — always, no route-gating ────────────────────
  useEffect(() => {
    try {
      localStorage.setItem(KEY_USER_CAMPAIGNS, JSON.stringify(customCampaigns));
    } catch { /* ignore */ }
  }, [customCampaigns]);

  useEffect(() => {
    try { localStorage.setItem(KEY_CAMPAIGN_OVERRIDES, JSON.stringify(campaignOverrides)); } catch { /* ignore */ }
  }, [campaignOverrides]);

  useEffect(() => {
    try { localStorage.setItem(KEY_CASE_STATUS_OVERRIDES, JSON.stringify(caseStatusOverrides)); } catch { /* ignore */ }
  }, [caseStatusOverrides]);

  useEffect(() => {
    try { localStorage.setItem(KEY_DELETED_CAMPAIGNS, JSON.stringify(deletedCampaignIds)); } catch { /* ignore */ }
  }, [deletedCampaignIds]);

  // ── Build full campaign list ──────────────────────────────────────────────
  const campaigns = useMemo(() => {
    // tick read just to force re-compute when liveTickRef changes
    void liveTickRef.current;

    const map = new Map<string, Campaign>();

    // 1. Load static campaigns as baseline (with any saved overrides applied)
    CAMPAIGNS.forEach((c) => {
      const override = campaignOverrides[c.id] ?? {};
      map.set(c.id, { ...c, ...override });
    });

    // 2. Merge analysis-derived clusters from analyzed reports
    analyzedReports.forEach((r) => {
      const campaignId = r.campaign_id ?? `CAMP-${r.case_id.replace(/^CASE-/, '')}`;
      if (!campaignId || campaignId === 'UNKNOWN') return;

      if (map.has(campaignId)) {
        // Campaign already exists (static or custom): augment it
        const camp = map.get(campaignId)!;
        const newCases = camp.relatedCases.includes(r.case_id)
          ? camp.relatedCases
          : [...camp.relatedCases, r.case_id];
        const newDomains = [
          ...new Set([...camp.relatedDomains, ...(r.threat_intel?.domain ? [r.threat_intel.domain] : [])]),
        ];
        const newIPs = [
          ...new Set([
            ...camp.relatedIPs,
            ...(r.threat_intel?.sending_ip ? [r.threat_intel.sending_ip] : []),
            ...(r.origin?.sending_ip ? [r.origin.sending_ip] : []),
          ]),
        ];
        const newURLs = [...new Set([...camp.relatedURLs, ...(r.threat_intel?.urls ?? [])])];
        map.set(campaignId, {
          ...camp,
          relatedCases: newCases,
          emails: camp.emails + 1,
          lastSeen: new Date().toISOString().slice(0, 10),
          relatedDomains: newDomains,
          relatedIPs: newIPs,
          relatedURLs: newURLs,
        });
      } else {
        // New cluster derived from email analysis
        const subjectHdr = r.headers.find((h) => h.key.toLowerCase() === 'subject')?.value;
        const now = new Date().toISOString().slice(0, 10);
        const override = campaignOverrides[campaignId] ?? {};
        map.set(campaignId, {
          id: campaignId,
          name: subjectHdr ? `${r.verdict}: ${subjectHdr.slice(0, 36)}` : `${r.verdict} Cluster`,
          threatType: (r.verdict?.split(' ')[0] ?? 'BEC') as ThreatType,
          severity: alertToSeverity(r.alert_level),
          firstSeen: now,
          lastSeen: now,
          emails: 1,
          indicators: r.evidence?.length ?? 1,
          status: 'active',
          confidence: r.confidence ?? 85,
          description: r.summary ?? `Dynamic campaign cluster generated from analysis of ${r.case_id}`,
          relatedEmails: [],
          relatedDomains: r.threat_intel?.domain ? [r.threat_intel.domain] : [],
          relatedIPs: r.threat_intel?.sending_ip ? [r.threat_intel.sending_ip] : [],
          relatedURLs: r.threat_intel?.urls ?? [],
          relatedCases: [r.case_id],
          timeline: [{ time: now, event: `Campaign cluster initialized from case ${r.case_id}` }],
          ...override,
        });
      }
    });

    // 3. Overlay user-created custom campaigns (highest priority)
    customCampaigns.forEach((c) => {
      map.set(c.id, { ...c });
    });

    return Array.from(map.values()).filter((c) => !deletedCampaignIds.includes(c.id));
  }, [customCampaigns, analyzedReports, campaignOverrides, deletedCampaignIds, lastRefreshed]); // lastRefreshed forces re-run every 30s

  // ── Aggregate stats ────────────────────────────────────────────────────────
  const stats = useMemo(
    (): CampaignStats => ({
      emailsObserved: campaigns.reduce((sum, c) => sum + (c.emails || 0), 0),
      uniqueDomains: [...new Set(campaigns.flatMap((c) => c.relatedDomains || []))].length,
      uniqueIPs: [...new Set(campaigns.flatMap((c) => c.relatedIPs || []))].length,
      suspiciousURLs: [...new Set(campaigns.flatMap((c) => c.relatedURLs || []))].length,
      activeCases: campaigns.reduce((sum, c) => sum + (c.relatedCases?.length > 0 ? 1 : 0), 0),
    }),
    [campaigns]
  );

  const activeCampaignsCount = useMemo(
    () => campaigns.filter((c) => c.status === 'active').length,
    [campaigns]
  );

  // ── CRUD ──────────────────────────────────────────────────────────────────
  const addCampaign = useCallback((data: Partial<Campaign>): Campaign => {
    const now = new Date().toISOString().slice(0, 10);
    const id = data.id || `CAMP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`;

    const newCamp: Campaign = {
      id,
      name: data.name || `Custom Threat Cluster ${id}`,
      threatType: data.threatType || 'BEC',
      severity: data.severity || 'high',
      firstSeen: data.firstSeen || now,
      lastSeen: data.lastSeen || now,
      emails: data.emails || 1,
      indicators: data.indicators || (data.relatedDomains?.length || 0) + (data.relatedIPs?.length || 0),
      status: data.status || 'active',
      confidence: data.confidence ?? 90,
      description: data.description || `User-created threat campaign cluster ${id}`,
      relatedEmails: data.relatedEmails || [],
      relatedDomains: data.relatedDomains || [],
      relatedIPs: data.relatedIPs || [],
      relatedURLs: data.relatedURLs || [],
      relatedCases: data.relatedCases || [],
      timeline: data.timeline || [{ time: now, event: `Campaign ${id} created by security analyst` }],
    };

    setCustomCampaigns((prev) => [newCamp, ...prev.filter((c) => c.id !== id)]);
    return newCamp;
  }, []);

  const updateCampaign = useCallback((id: string, updates: Partial<Campaign>) => {
    if (STATIC_CAMPAIGN_IDS.has(id)) {
      // For static campaigns, store as an override
      setCampaignOverrides((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...updates } }));
    } else {
      // For custom campaigns, update in-place
      setCustomCampaigns((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );
      // Also update any analysis-derived campaign via overrides
      setCampaignOverrides((prev) => ({ ...prev, [id]: { ...(prev[id] ?? {}), ...updates } }));
    }
  }, []);

  const deleteCampaign = useCallback((id: string) => {
    setDeletedCampaignIds((prev) => [...new Set([...prev, id])]);
    setCustomCampaigns((prev) => prev.filter((c) => c.id !== id));
    setCampaignOverrides((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  /** Full campaign clear — clears in-memory state AND localStorage. Used by logout / Reset Cache. */
  const clearCampaigns = useCallback(() => {
    setCustomCampaigns([]);
    setCampaignOverrides({});
    setCaseStatusOverrides({});
    setDeletedCampaignIds([]);
    try { localStorage.removeItem(KEY_USER_CAMPAIGNS); } catch { /* ignore */ }
    try { localStorage.removeItem(KEY_CAMPAIGN_OVERRIDES); } catch { /* ignore */ }
    try { localStorage.removeItem(KEY_CASE_STATUS_OVERRIDES); } catch { /* ignore */ }
    try { localStorage.removeItem(KEY_DELETED_CAMPAIGNS); } catch { /* ignore */ }
  }, []);

  // ── Case status helpers ───────────────────────────────────────────────────
  const setCaseStatus = useCallback((caseId: string, status: CaseStatus) => {
    setCaseStatusOverrides((prev) => ({ ...prev, [caseId]: status }));
  }, []);

  const getCaseStatus = useCallback(
    (caseId: string, fallback: CaseStatus): CaseStatus => {
      return caseStatusOverrides[caseId] ?? fallback;
    },
    [caseStatusOverrides]
  );

  const value: CampaignContextValue = {
    campaigns,
    totalCampaigns: campaigns.length,
    activeCampaignsCount,
    stats,
    lastRefreshed,
    addCampaign,
    updateCampaign,
    deleteCampaign,
    clearCampaigns,
    setCaseStatus,
    getCaseStatus,
  };

  return <CampaignContext.Provider value={value}>{children}</CampaignContext.Provider>;
}

export function useCampaigns(): CampaignContextValue {
  const ctx = useContext(CampaignContext);
  if (!ctx) {
    throw new Error('useCampaigns must be used within a CampaignProvider');
  }
  return ctx;
}
