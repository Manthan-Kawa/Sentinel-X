/**
 * storageKeys.ts
 *
 * Central registry of every localStorage key used by Sentinel-X.
 *
 * TIER 1 — PERSISTENT KEYS
 *   Data that should survive tab refresh AND login/logout cycles.
 *   Only cleared when the user explicitly presses "Reset Cache" in Settings → Data.
 *   Used by: Dashboard, Reports, Alerts, Campaigns.
 *
 * TIER 2 — EPHEMERAL KEYS
 *   Analysis-session state that is cleared on:
 *     • Tab refresh (page load)
 *     • Starting a new analysis
 *     • Logout / login
 *     • "Reset Cache" in Settings → Data
 *   Used by: Email Analyzer, Header Forensics, Threat Intelligence,
 *             Origin Investigation, Attack Graph.
 */

// ── Tier 1: Persistent ────────────────────────────────────────────────────────

/** Analyzed email forensic reports (Dashboard / Alerts / Reports feed) */
export const KEY_ANALYZED_REPORTS = 'sentinel_analyzed_reports';

/** User-created campaign objects */
export const KEY_USER_CAMPAIGNS = 'sentinel_user_campaigns_v2';

/** Field-level override patches applied to static mock campaigns */
export const KEY_CAMPAIGN_OVERRIDES = 'sentinel_campaign_overrides_v1';

/** Case status overrides (open / closed / escalated …) */
export const KEY_CASE_STATUS_OVERRIDES = 'sentinel_case_status_overrides_v1';

/** Alert triage status overrides (acknowledged / dismissed …) */
export const KEY_ALERT_STATUS_OVERRIDES = 'sentinel_alert_status_overrides';

/** Supabase / custom auth token flag */
export const KEY_AUTH = 'sentinel_auth';

/** Authenticated user e-mail */
export const KEY_USER = 'sentinel_user';

/** Authenticated user role ('analyst' | 'user') */
export const KEY_USER_ROLE = 'sentinel_user_role';

/** User-submitted report tickets */
export const KEY_TICKETS = 'sentinel_tickets';

/** Gemini / Claude API key entered in Settings → AI Engine */
export const KEY_CLAUDE_API = 'sentinel_gemini_key';

/** Deleted campaign IDs to suppress across sessions */
export const KEY_DELETED_CAMPAIGNS = 'sentinel_deleted_campaigns_v1';

export const PERSISTENT_KEYS: readonly string[] = [
  KEY_ANALYZED_REPORTS,
  KEY_USER_CAMPAIGNS,
  KEY_CAMPAIGN_OVERRIDES,
  KEY_CASE_STATUS_OVERRIDES,
  KEY_ALERT_STATUS_OVERRIDES,
  KEY_DELETED_CAMPAIGNS,
  KEY_TICKETS,
] as const;

// ── Tier 2: Ephemeral ─────────────────────────────────────────────────────────

/** Active forensic case ID currently open in the analysis pages */
export const KEY_ACTIVE_CASE = 'sentinel_active_case_id';

/** Evidence vault items generated from the current analysis session */
export const KEY_EVIDENCE_VAULT = 'sentinel_evidence_vault_v2';

export const EPHEMERAL_KEYS: readonly string[] = [
  KEY_ACTIVE_CASE,
  KEY_EVIDENCE_VAULT,
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Clears only the ephemeral (forensic-session) keys.
 * Called when a new analysis is started or the user navigates to a forensic page fresh.
 */
export function clearEphemeralStorage(): void {
  EPHEMERAL_KEYS.forEach((k) => {
    try { localStorage.removeItem(k); } catch { /* ignore */ }
  });
}

/**
 * Clears all Sentinel-X data keys (both tiers) but preserves the API key.
 * Called by Settings "Reset Cache" and by logout.
 */
export function clearAllSentinelStorage(): void {
  [...PERSISTENT_KEYS, ...EPHEMERAL_KEYS].forEach((k) => {
    try { localStorage.removeItem(k); } catch { /* ignore */ }
  });
  // Also purge auth
  try { localStorage.removeItem(KEY_AUTH); } catch { /* ignore */ }
  try { localStorage.removeItem(KEY_USER); } catch { /* ignore */ }
}
