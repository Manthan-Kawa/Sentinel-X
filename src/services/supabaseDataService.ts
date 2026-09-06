/**
 * supabaseDataService.ts
 *
 * Provides persistence for Profiles, Settings, Tickets, Analyzed Reports,
 * Campaigns, Alert Overrides, and Notifications backed by Supabase with
 * resilient fallback to localStorage.
 */

import { getSupabaseClient, isSupabaseConfigured } from '@/config/supabaseClient';
import type { UserRole } from '@/contexts/AuthContext';
import {
  KEY_TICKETS,
  KEY_ANALYZED_REPORTS,
  KEY_USER_CAMPAIGNS,
  KEY_ALERT_STATUS_OVERRIDES,
  KEY_CASE_STATUS_OVERRIDES,
} from '@/utils/storageKeys';

/* ── Storage Keys for Local Fallbacks ────────────────────────────────────── */
const KEY_PROFILE_PREFIX = 'sentinel_profile_';
const KEY_SETTINGS_PREFIX = 'sentinel_settings_';
const KEY_NOTIFS_PREFIX = 'sentinel_read_notifs_';

/* ── Types ───────────────────────────────────────────────────────────────── */
export interface UserProfile {
  email: string;
  role: UserRole;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  updatedAt?: string;
}

export interface UserSettings {
  userEmail: string;
  role: UserRole;
  themePreset: string;
  animationsEnabled: boolean;
  glowEffects: boolean;
  emailNotifications: boolean;
  criticalAlerts: boolean;
  weeklyDigest: boolean;
  customAiKey?: string;
  activeAiModel?: string;
  updatedAt?: string;
}

export interface DbTicketMessage {
  id: string;
  sender: 'user' | 'analyst';
  senderEmail: string;
  senderName?: string;
  message: string;
  timestamp: string;
}

export interface DbTicket {
  id: string;
  userEmail: string;
  submittedAt: string;
  status: 'pending' | 'in_review' | 'analyzed' | 'resolved' | 'closed';
  priority?: 'low' | 'medium' | 'high' | 'critical';
  threatCategory?: string;
  didInteract?: {
    clickedLink?: boolean;
    enteredCreds?: boolean;
    openedAttachment?: boolean;
  };
  userComment: string;
  emlFile: any;
  // Analyst response
  assignedAnalyst?: string | null;
  verdict?: string | null;
  threatScore?: number | null;
  analystComment: string | null;
  recommendedAction?: string | null;
  remediationTaken?: string | null;
  analystReport: any;
  respondedAt: string | null;
  emailId?: string;
  // User resolution & feedback
  userAcknowledged?: boolean;
  userFeedback?: string | null;
  userRating?: number;
  closedAt?: string | null;
  // Threaded conversation
  threadMessages?: DbTicketMessage[];
}

export class SupabaseDataService {
  /* ═════════════════════════════════════════════════════════════════════════
     1. PROFILE OPERATIONS
  ═════════════════════════════════════════════════════════════════════════ */

  /**
   * Fetches user/analyst profile by email from Supabase (or local storage fallback).
   */
  static async fetchProfile(email: string): Promise<UserProfile | null> {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return null;

    const client = getSupabaseClient();
    if (isSupabaseConfigured() && client) {
      try {
        const { data, error } = await client
          .from('profiles')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();

        if (!error && data) {
          // Check if local storage has a custom display name saved by user
          const savedLocal =
            localStorage.getItem(`sentinel_user_display_name_${cleanEmail}`) ||
            localStorage.getItem('sentinel_user_display_name');

          let resolvedName = (savedLocal && savedLocal.trim() && savedLocal.trim() !== cleanEmail.split('@')[0])
            ? savedLocal.trim()
            : (data.display_name || cleanEmail.split('@')[0]);

          const profile: UserProfile = {
            email: data.email,
            role: data.role as UserRole,
            displayName: resolvedName,
            avatarUrl: data.avatar_url || undefined,
            bio: data.bio || undefined,
            updatedAt: data.updated_at,
          };
          // Cache locally
          try {
            localStorage.setItem(`${KEY_PROFILE_PREFIX}${cleanEmail}`, JSON.stringify(profile));
            if (resolvedName && resolvedName !== cleanEmail.split('@')[0]) {
              localStorage.setItem(`sentinel_user_display_name_${cleanEmail}`, resolvedName);
              localStorage.setItem('sentinel_user_display_name', resolvedName);
            }
          } catch { /* ignore */ }
          return profile;
        }
      } catch (err) {
        console.warn('Supabase fetchProfile failed, using local cache:', err);
      }
    }

    // Local fallback
    try {
      const cached = localStorage.getItem(`${KEY_PROFILE_PREFIX}${cleanEmail}`);
      if (cached) {
        return JSON.parse(cached) as UserProfile;
      }
    } catch { /* ignore */ }

    return null;
  }

  /**
   * Upserts user or analyst profile into Supabase and local cache.
   */
  static async upsertProfile(profile: UserProfile): Promise<UserProfile> {
    const cleanEmail = profile.email.trim().toLowerCase();
    const updated: UserProfile = {
      ...profile,
      email: cleanEmail,
      updatedAt: new Date().toISOString(),
    };

    // Save locally immediately
    try {
      localStorage.setItem(`${KEY_PROFILE_PREFIX}${cleanEmail}`, JSON.stringify(updated));
      if (updated.displayName) {
        localStorage.setItem(`sentinel_user_display_name_${cleanEmail}`, updated.displayName);
        localStorage.setItem('sentinel_user_display_name', updated.displayName);
      }
    } catch { /* ignore */ }

    const client = getSupabaseClient();
    if (isSupabaseConfigured() && client) {
      try {
        const payload = {
          email: cleanEmail,
          role: updated.role,
          display_name: updated.displayName,
          avatar_url: updated.avatarUrl || null,
          bio: updated.bio || null,
          updated_at: updated.updatedAt,
        };

        const { error } = await client
          .from('profiles')
          .upsert(payload, { onConflict: 'email' });

        if (error) {
          console.warn('Supabase upsertProfile error:', error);
        }
      } catch (err) {
        console.warn('Supabase upsertProfile failed:', err);
      }
    }

    return updated;
  }

  /* ═════════════════════════════════════════════════════════════════════════
     2. SETTINGS OPERATIONS
  ═════════════════════════════════════════════════════════════════════════ */

  /**
   * Fetches user/analyst system preferences from Supabase or local cache.
   */
  static async fetchSettings(email: string, role: UserRole = 'user'): Promise<UserSettings> {
    const cleanEmail = email.trim().toLowerCase();
    const defaultSettings: UserSettings = {
      userEmail: cleanEmail,
      role,
      themePreset: 'Dark Cyber',
      animationsEnabled: true,
      glowEffects: true,
      emailNotifications: true,
      criticalAlerts: true,
      weeklyDigest: false,
      customAiKey: '',
      activeAiModel: 'gemini-3.6-flash',
      updatedAt: new Date().toISOString(),
    };

    if (!cleanEmail) return defaultSettings;

    const client = getSupabaseClient();
    if (isSupabaseConfigured() && client) {
      try {
        const { data, error } = await client
          .from('user_settings')
          .select('*')
          .eq('user_email', cleanEmail)
          .maybeSingle();

        if (!error && data) {
          const settings: UserSettings = {
            userEmail: data.user_email,
            role: (data.role as UserRole) || role,
            themePreset: data.theme_preset || 'Dark Cyber',
            animationsEnabled: data.animations_enabled ?? true,
            glowEffects: data.glow_effects ?? true,
            emailNotifications: data.email_notifications ?? true,
            criticalAlerts: data.critical_alerts ?? true,
            weeklyDigest: data.weekly_digest ?? false,
            customAiKey: data.custom_ai_key || '',
            activeAiModel: data.active_ai_model || 'gemini-3.6-flash',
            updatedAt: data.updated_at,
          };
          try {
            localStorage.setItem(`${KEY_SETTINGS_PREFIX}${cleanEmail}`, JSON.stringify(settings));
          } catch { /* ignore */ }
          return settings;
        }
      } catch (err) {
        console.warn('Supabase fetchSettings error, falling back to local:', err);
      }
    }

    // Local fallback
    try {
      const cached = localStorage.getItem(`${KEY_SETTINGS_PREFIX}${cleanEmail}`);
      if (cached) {
        return { ...defaultSettings, ...JSON.parse(cached) };
      }
    } catch { /* ignore */ }

    return defaultSettings;
  }

  /**
   * Saves user/analyst system preferences to Supabase and local cache.
   */
  static async upsertSettings(settings: UserSettings): Promise<UserSettings> {
    const cleanEmail = settings.userEmail.trim().toLowerCase();
    const updated: UserSettings = {
      ...settings,
      userEmail: cleanEmail,
      updatedAt: new Date().toISOString(),
    };

    // Save locally
    try {
      localStorage.setItem(`${KEY_SETTINGS_PREFIX}${cleanEmail}`, JSON.stringify(updated));
    } catch { /* ignore */ }

    const client = getSupabaseClient();
    if (isSupabaseConfigured() && client) {
      try {
        const payload = {
          user_email: cleanEmail,
          role: updated.role,
          theme_preset: updated.themePreset,
          animations_enabled: updated.animationsEnabled,
          glow_effects: updated.glowEffects,
          email_notifications: updated.emailNotifications,
          critical_alerts: updated.criticalAlerts,
          weekly_digest: updated.weeklyDigest,
          custom_ai_key: updated.customAiKey || '',
          active_ai_model: updated.activeAiModel || 'gemini-3.6-flash',
          updated_at: updated.updatedAt,
        };

        const { error } = await client
          .from('user_settings')
          .upsert(payload, { onConflict: 'user_email' });

        if (error) {
          console.warn('Supabase upsertSettings error:', error);
        }
      } catch (err) {
        console.warn('Supabase upsertSettings failed:', err);
      }
    }

    return updated;
  }

  /* ═════════════════════════════════════════════════════════════════════════
     3. USER NOTIFICATIONS (Read/Unread Tracking)
  ═════════════════════════════════════════════════════════════════════════ */

  /**
   * Fetches read notification IDs for a user or analyst from Supabase or localStorage.
   */
  static async fetchReadNotifications(userEmail: string): Promise<string[]> {
    const cleanEmail = userEmail.trim().toLowerCase();
    const client = getSupabaseClient();

    if (isSupabaseConfigured() && client && cleanEmail) {
      try {
        const { data, error } = await client
          .from('user_notifications')
          .select('read_notification_ids')
          .eq('user_email', cleanEmail)
          .maybeSingle();

        if (!error && data?.read_notification_ids) {
          const ids = data.read_notification_ids as string[];
          try {
            localStorage.setItem(`${KEY_NOTIFS_PREFIX}${cleanEmail}`, JSON.stringify(ids));
          } catch { /* ignore */ }
          return ids;
        }
      } catch (err) {
        console.warn('Supabase fetchReadNotifications error:', err);
      }
    }

    // Local fallback
    try {
      const saved = localStorage.getItem(`${KEY_NOTIFS_PREFIX}${cleanEmail}`);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }

    return [];
  }

  /**
   * Saves read notification IDs to Supabase and localStorage.
   */
  static async saveReadNotifications(userEmail: string, readIds: string[]): Promise<void> {
    const cleanEmail = userEmail.trim().toLowerCase();
    if (!cleanEmail) return;

    try {
      localStorage.setItem(`${KEY_NOTIFS_PREFIX}${cleanEmail}`, JSON.stringify(readIds));
    } catch { /* ignore */ }

    const client = getSupabaseClient();
    if (isSupabaseConfigured() && client) {
      try {
        await client.from('user_notifications').upsert({
          user_email: cleanEmail,
          read_notification_ids: readIds,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_email' });
      } catch (err) {
        console.warn('Supabase saveReadNotifications error:', err);
      }
    }
  }

  /* ═════════════════════════════════════════════════════════════════════════
     4. TICKET OPERATIONS (User Check Status <-> Analyst User Requests)
  ═════════════════════════════════════════════════════════════════════════ */

  /**
   * Fetches all user tickets from Supabase or local storage.
   */
  static async fetchTickets(): Promise<DbTicket[]> {
    const client = getSupabaseClient();
    if (isSupabaseConfigured() && client) {
      try {
        const { data, error } = await client
          .from('user_tickets')
          .select('*')
          .order('submitted_at', { ascending: false });

        if (!error && data) {
          const tickets: DbTicket[] = data.map((d: any) => ({
            id: d.id,
            userEmail: (d.user_email || '').toLowerCase().trim(),
            submittedAt: d.submitted_at,
            status: d.status,
            priority: d.priority || 'medium',
            threatCategory: d.threat_category || 'phishing',
            didInteract: d.did_interact || {},
            userComment: d.user_comment || '',
            emlFile: d.eml_file || null,
            assignedAnalyst: d.assigned_analyst || 'sentinelx.analyst@gmail.com',
            verdict: d.verdict || null,
            threatScore: d.threat_score ?? null,
            analystComment: d.analyst_comment || null,
            recommendedAction: d.recommended_action || null,
            remediationTaken: d.remediation_taken || null,
            analystReport: d.analyst_report || null,
            respondedAt: d.responded_at || null,
            emailId: d.email_id || undefined,
            userAcknowledged: Boolean(d.user_acknowledged),
            userFeedback: d.user_feedback || null,
            userRating: d.user_rating || 0,
            closedAt: d.closed_at || null,
            threadMessages: d.thread_messages || [],
          }));

          // Sync local storage safely
          try {
            localStorage.setItem(KEY_TICKETS, JSON.stringify(tickets));
          } catch {
            try {
              const light = tickets.map((t) => ({
                ...t,
                emlFile: t.emlFile ? { ...t.emlFile, data: '' } : null,
                analystReport: t.analystReport ? { ...t.analystReport, data: '' } : null,
              }));
              localStorage.setItem(KEY_TICKETS, JSON.stringify(light));
            } catch { /* ignore */ }
          }

          return tickets;
        }
      } catch (err) {
        console.warn('Supabase fetchTickets error, using local storage:', err);
      }
    }

    // Local fallback
    try {
      const stored = localStorage.getItem(KEY_TICKETS);
      if (stored) {
        return JSON.parse(stored) as DbTicket[];
      }
    } catch { /* ignore */ }

    return [];
  }

  /**
   * Saves or updates a ticket in Supabase and local storage.
   */
  static async upsertTicket(ticket: DbTicket): Promise<void> {
    // Update local storage safely
    try {
      const stored = localStorage.getItem(KEY_TICKETS);
      const existing: DbTicket[] = stored ? JSON.parse(stored) : [];
      const idx = existing.findIndex((t) => t.id === ticket.id);
      let updatedList: DbTicket[];
      if (idx >= 0) {
        updatedList = existing.map((t) => (t.id === ticket.id ? ticket : t));
      } else {
        updatedList = [ticket, ...existing];
      }
      try {
        localStorage.setItem(KEY_TICKETS, JSON.stringify(updatedList));
      } catch {
        // Quota fallback
        const light = updatedList.map((t) => ({
          ...t,
          emlFile: t.emlFile ? { ...t.emlFile, data: '' } : null,
          analystReport: t.analystReport ? { ...t.analystReport, data: '' } : null,
        }));
        localStorage.setItem(KEY_TICKETS, JSON.stringify(light));
      }
    } catch { /* ignore */ }

    const client = getSupabaseClient();
    if (isSupabaseConfigured() && client) {
      try {
        const payload = {
          id: ticket.id,
          user_email: ticket.userEmail,
          submitted_at: ticket.submittedAt,
          status: ticket.status,
          priority: ticket.priority || 'medium',
          threat_category: ticket.threatCategory || 'phishing',
          did_interact: ticket.didInteract || {},
          user_comment: ticket.userComment,
          eml_file: ticket.emlFile,
          assigned_analyst: ticket.assignedAnalyst || 'sentinelx.analyst@gmail.com',
          verdict: ticket.verdict || null,
          threat_score: ticket.threatScore ?? null,
          analyst_comment: ticket.analystComment,
          recommended_action: ticket.recommendedAction || null,
          remediation_taken: ticket.remediationTaken || null,
          analyst_report: ticket.analystReport,
          responded_at: ticket.respondedAt,
          email_id: ticket.emailId || null,
          user_acknowledged: Boolean(ticket.userAcknowledged),
          user_feedback: ticket.userFeedback || '',
          user_rating: ticket.userRating || 0,
          closed_at: ticket.closedAt || null,
          thread_messages: ticket.threadMessages || [],
          updated_at: new Date().toISOString(),
        };

        const { error } = await client.from('user_tickets').upsert(payload, { onConflict: 'id' });
        if (error) {
          console.error('Supabase upsertTicket error:', error);
        }
      } catch (err) {
        console.warn('Supabase upsertTicket failed:', err);
      }
    }
  }

  /**
   * Clears all user tickets from local storage and Supabase.
   */
  static async clearAllTickets(): Promise<void> {
    try {
      localStorage.removeItem(KEY_TICKETS);
    } catch { /* ignore */ }

    const client = getSupabaseClient();
    if (isSupabaseConfigured() && client) {
      try {
        await client.from('user_tickets').delete().neq('id', '___NEVER_MATCH___');
      } catch (err) {
        console.warn('Supabase clearAllTickets error:', err);
      }
    }
  }

  /**
   * Deletes a specific ticket by ID from Supabase and local storage.
   */
  static async deleteTicket(ticketId: string): Promise<void> {
    try {
      const stored = localStorage.getItem(KEY_TICKETS);
      if (stored) {
        const list: DbTicket[] = JSON.parse(stored);
        const filtered = list.filter((t) => t.id !== ticketId);
        localStorage.setItem(KEY_TICKETS, JSON.stringify(filtered));
      }
    } catch { /* ignore */ }

    const client = getSupabaseClient();
    if (isSupabaseConfigured() && client) {
      try {
        await client.from('user_tickets').delete().eq('id', ticketId);
      } catch (err) {
        console.warn('Supabase deleteTicket error:', err);
      }
    }
  }

  /* ═════════════════════════════════════════════════════════════════════════
     5. ANALYST SIDE: REPORTS (Analyzed Forensic Reports)
  ═════════════════════════════════════════════════════════════════════════ */

  /**
   * Fetches analyzed reports from Supabase or localStorage.
   */
  static async fetchAnalyzedReports(): Promise<any[]> {
    const client = getSupabaseClient();
    if (isSupabaseConfigured() && client) {
      try {
        const { data, error } = await client
          .from('analyzed_reports')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const reports = data.map((d: any) => d.report_data);
          try {
            localStorage.setItem(KEY_ANALYZED_REPORTS, JSON.stringify(reports));
          } catch { /* ignore */ }
          return reports;
        }
      } catch (err) {
        console.warn('Supabase fetchAnalyzedReports failed:', err);
      }
    }

    try {
      const saved = localStorage.getItem(KEY_ANALYZED_REPORTS);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }

    return [];
  }

  /**
   * Saves an analyzed report to Supabase and localStorage.
   */
  static async upsertAnalyzedReport(report: any, analystEmail: string = 'sentinelx.analyst@gmail.com'): Promise<void> {
    if (!report?.case_id) return;

    // Update local storage
    try {
      const current = await this.fetchAnalyzedReports();
      const filtered = current.filter((r: any) => r.case_id !== report.case_id);
      localStorage.setItem(KEY_ANALYZED_REPORTS, JSON.stringify([report, ...filtered]));
    } catch { /* ignore */ }

    const client = getSupabaseClient();
    if (isSupabaseConfigured() && client) {
      try {
        await client.from('analyzed_reports').upsert({
          case_id: report.case_id,
          verdict: report.verdict || 'Suspicious',
          threat_score: report.threat_score ?? 0,
          confidence: report.confidence ?? 85,
          summary: report.summary || '',
          analyzed_by: analystEmail,
          report_data: report,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'case_id' });
      } catch (err) {
        console.warn('Supabase upsertAnalyzedReport failed:', err);
      }
    }
  }

  /**
   * Deletes an analyzed report from Supabase and localStorage.
   */
  static async deleteAnalyzedReport(caseId: string): Promise<void> {
    try {
      const current = await this.fetchAnalyzedReports();
      const filtered = current.filter((r: any) => r.case_id !== caseId);
      localStorage.setItem(KEY_ANALYZED_REPORTS, JSON.stringify(filtered));
    } catch { /* ignore */ }

    const client = getSupabaseClient();
    if (isSupabaseConfigured() && client) {
      try {
        await client.from('analyzed_reports').delete().eq('case_id', caseId);
      } catch (err) {
        console.warn('Supabase deleteAnalyzedReport failed:', err);
      }
    }
  }

  /* ═════════════════════════════════════════════════════════════════════════
     6. ANALYST SIDE: CAMPAIGNS (Campaign Clusters & IOC Groups)
  ═════════════════════════════════════════════════════════════════════════ */

  /**
   * Fetches analyst-created campaigns from Supabase or localStorage.
   */
  static async fetchCampaigns(): Promise<any[]> {
    const client = getSupabaseClient();
    if (isSupabaseConfigured() && client) {
      try {
        const { data, error } = await client
          .from('campaigns')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && data && data.length > 0) {
          const campaigns = data.map((d: any) => d.campaign_data);
          try {
            localStorage.setItem(KEY_USER_CAMPAIGNS, JSON.stringify(campaigns));
          } catch { /* ignore */ }
          return campaigns;
        }
      } catch (err) {
        console.warn('Supabase fetchCampaigns failed:', err);
      }
    }

    try {
      const saved = localStorage.getItem(KEY_USER_CAMPAIGNS);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }

    return [];
  }

  /**
   * Saves or updates a campaign in Supabase and localStorage.
   */
  static async upsertCampaign(campaign: any, creatorEmail: string = 'sentinelx.analyst@gmail.com'): Promise<void> {
    if (!campaign?.id) return;

    try {
      const current = await this.fetchCampaigns();
      const filtered = current.filter((c: any) => c.id !== campaign.id);
      localStorage.setItem(KEY_USER_CAMPAIGNS, JSON.stringify([campaign, ...filtered]));
    } catch { /* ignore */ }

    const client = getSupabaseClient();
    if (isSupabaseConfigured() && client) {
      try {
        await client.from('campaigns').upsert({
          id: campaign.id,
          name: campaign.name || 'Untitled Campaign',
          threat_actor: campaign.threatActor || campaign.threat_actor || 'Unknown',
          status: campaign.status || 'active',
          severity: campaign.severity || 'high',
          first_seen: campaign.firstSeen || campaign.first_seen || null,
          last_seen: campaign.lastSeen || campaign.last_seen || null,
          indicators_count: campaign.indicatorsCount ?? campaign.indicators?.length ?? 0,
          description: campaign.description || '',
          campaign_data: campaign,
          created_by: creatorEmail,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      } catch (err) {
        console.warn('Supabase upsertCampaign error:', err);
      }
    }
  }

  /**
   * Deletes a campaign from Supabase and localStorage.
   */
  static async deleteCampaign(id: string): Promise<void> {
    try {
      const current = await this.fetchCampaigns();
      const filtered = current.filter((c: any) => c.id !== id);
      localStorage.setItem(KEY_USER_CAMPAIGNS, JSON.stringify(filtered));
    } catch { /* ignore */ }

    const client = getSupabaseClient();
    if (isSupabaseConfigured() && client) {
      try {
        await client.from('campaigns').delete().eq('id', id);
      } catch (err) {
        console.warn('Supabase deleteCampaign error:', err);
      }
    }
  }

  /* ═════════════════════════════════════════════════════════════════════════
     7. ANALYST SIDE: ALERTS (Alert Triage Status & Case Overrides)
  ═════════════════════════════════════════════════════════════════════════ */

  /**
   * Fetches alert and case status overrides from Supabase or localStorage.
   */
  static async fetchAlertStates(): Promise<{
    alertStatusOverrides: Record<string, string>;
    caseStatusOverrides: Record<string, string>;
  }> {
    let alertOverrides: Record<string, string> = {};
    let caseOverrides: Record<string, string> = {};

    try {
      const a = localStorage.getItem(KEY_ALERT_STATUS_OVERRIDES);
      if (a) alertOverrides = JSON.parse(a);
      const c = localStorage.getItem(KEY_CASE_STATUS_OVERRIDES);
      if (c) caseOverrides = JSON.parse(c);
    } catch { /* ignore */ }

    const client = getSupabaseClient();
    if (isSupabaseConfigured() && client) {
      try {
        const { data, error } = await client
          .from('alert_states')
          .select('*')
          .eq('id', 'global_analyst_alerts')
          .maybeSingle();

        if (!error && data) {
          if (data.alert_status_overrides) {
            alertOverrides = { ...alertOverrides, ...data.alert_status_overrides };
            try { localStorage.setItem(KEY_ALERT_STATUS_OVERRIDES, JSON.stringify(alertOverrides)); } catch {}
          }
          if (data.case_status_overrides) {
            caseOverrides = { ...caseOverrides, ...data.case_status_overrides };
            try { localStorage.setItem(KEY_CASE_STATUS_OVERRIDES, JSON.stringify(caseOverrides)); } catch {}
          }
        }
      } catch (err) {
        console.warn('Supabase fetchAlertStates error:', err);
      }
    }

    return { alertStatusOverrides: alertOverrides, caseStatusOverrides: caseOverrides };
  }

  /**
   * Saves alert status overrides to Supabase and localStorage.
   */
  static async saveAlertStatusOverrides(overrides: Record<string, string>): Promise<void> {
    try {
      localStorage.setItem(KEY_ALERT_STATUS_OVERRIDES, JSON.stringify(overrides));
    } catch { /* ignore */ }

    const client = getSupabaseClient();
    if (isSupabaseConfigured() && client) {
      try {
        await client.from('alert_states').upsert({
          id: 'global_analyst_alerts',
          alert_status_overrides: overrides,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      } catch (err) {
        console.warn('Supabase saveAlertStatusOverrides error:', err);
      }
    }
  }

  /**
   * Saves case status overrides to Supabase and localStorage.
   */
  static async saveCaseStatusOverrides(overrides: Record<string, string>): Promise<void> {
    try {
      localStorage.setItem(KEY_CASE_STATUS_OVERRIDES, JSON.stringify(overrides));
    } catch { /* ignore */ }

    const client = getSupabaseClient();
    if (isSupabaseConfigured() && client) {
      try {
        await client.from('alert_states').upsert({
          id: 'global_analyst_alerts',
          case_status_overrides: overrides,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'id' });
      } catch (err) {
        console.warn('Supabase saveCaseStatusOverrides error:', err);
      }
    }
  }

  /* ═════════════════════════════════════════════════════════════════════════
     8. AUTHENTICATION & GOOGLE SYNC
  ═════════════════════════════════════════════════════════════════════════ */

  /**
   * Signs up a new user or analyst in Supabase Auth and creates their profile.
   */
  static async signUpWithEmail(
    email: string,
    password: string,
    role: UserRole = 'user',
    displayName?: string
  ): Promise<{ success: boolean; user?: any; error?: string }> {
    const client = getSupabaseClient();
    const cleanEmail = email.trim().toLowerCase();
    const name = displayName || cleanEmail.split('@')[0];

    if (isSupabaseConfigured() && client) {
      try {
        const { data, error } = await client.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              role,
              display_name: name,
            },
          },
        });

        if (error) {
          return { success: false, error: error.message };
        }

        // Save profile in profiles table
        await this.upsertProfile({
          email: cleanEmail,
          role,
          displayName: name,
        });

        return { success: true, user: data.user };
      } catch (err: any) {
        return { success: false, error: err?.message || 'Supabase signup failed.' };
      }
    }

    // Fallback: local profile record
    await this.upsertProfile({
      email: cleanEmail,
      role,
      displayName: name,
    });
    return { success: true };
  }

  /**
   * Signs in with email and password via Supabase Auth or local registry.
   */
  static async signInWithEmail(
    email: string,
    password: string
  ): Promise<{ success: boolean; role?: UserRole; profile?: UserProfile; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const client = getSupabaseClient();

    if (isSupabaseConfigured() && client) {
      try {
        const { data, error } = await client.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });

        if (!error && data.user) {
          const profile = await this.fetchProfile(cleanEmail);
          const isMasterAnalyst = cleanEmail === 'sentinelx.analyst@gmail.com' || cleanEmail === 'analyst@gmail.com';
          const resolvedRole: UserRole = isMasterAnalyst ? 'analyst' : 'user';
          return {
            success: true,
            role: resolvedRole,
            profile: profile || { email: cleanEmail, role: resolvedRole, displayName: cleanEmail.split('@')[0] },
          };
        }
      } catch (err) {
        console.warn('Supabase signInWithEmail error, checking fallback:', err);
      }
    }

    // Local profile check
    const localProfile = await this.fetchProfile(cleanEmail);
    const isMasterAnalyst = cleanEmail === 'sentinelx.analyst@gmail.com' || cleanEmail === 'analyst@gmail.com';
    const role: UserRole = isMasterAnalyst ? 'analyst' : 'user';
    return {
      success: true,
      role,
      profile: localProfile || { email: cleanEmail, role, displayName: cleanEmail.split('@')[0] },
    };
  }

  /**
   * Synchronizes Google OAuth profile with Supabase and sets appropriate role.
   */
  static async syncGoogleUser(
    googleProfile: { email: string; name?: string; picture?: string },
    forcedRole?: UserRole
  ): Promise<UserProfile> {
    const cleanEmail = googleProfile.email.trim().toLowerCase();

    // Check existing profile in Supabase first
    const existing = await this.fetchProfile(cleanEmail);

    const isMasterAnalyst =
      cleanEmail === 'sentinelx.analyst@gmail.com' ||
      cleanEmail === 'analyst@gmail.com';

    // All new emails and Google sign-ins strictly receive 'user' role.
    // Only master SOC analyst accounts receive 'analyst'.
    const resolvedRole: UserRole = isMasterAnalyst ? 'analyst' : 'user';

    const savedLocalName =
      localStorage.getItem(`sentinel_user_display_name_${cleanEmail}`) ||
      localStorage.getItem('sentinel_user_display_name');

    // Never overwrite an explicitly saved user display name with a raw Google account name
    const finalDisplayName =
      (savedLocalName && savedLocalName.trim() && savedLocalName.trim() !== cleanEmail.split('@')[0])
        ? savedLocalName.trim()
        : (existing?.displayName && existing.displayName !== cleanEmail.split('@')[0])
        ? existing.displayName
        : (googleProfile.name || cleanEmail.split('@')[0]);

    const profile: UserProfile = {
      email: cleanEmail,
      role: resolvedRole,
      displayName: finalDisplayName,
      avatarUrl: googleProfile.picture || existing?.avatarUrl,
      bio: existing?.bio || (resolvedRole === 'analyst' ? 'Cybersecurity Analyst & Threat Investigator' : 'Security-aware team member'),
    };

    return await this.upsertProfile(profile);
  }
}
