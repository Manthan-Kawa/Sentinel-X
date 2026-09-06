/**
 * TicketContext.tsx
 *
 * Central store for user-submitted report tickets.
 * Persisted in Supabase and localStorage. Provides full roundtrip CRUD operations:
 * - User submits request with interaction context & priority
 * - Analyst investigates, sets verdict, risk score, remediation guidance & report
 * - User acknowledges, rates SOC response, confirms resolution, or asks follow-ups
 * - Interactive threaded conversation between user and analyst
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import { KEY_TICKETS } from '@/utils/storageKeys';
import { EmailIngestionService } from '@/services/emailIngestionService';
import { SupabaseDataService, type DbTicket, type DbTicketMessage } from '@/services/supabaseDataService';

/* ── Types ──────────────────────────────────────────────────────────────── */

export type TicketStatus = 'pending' | 'in_review' | 'analyzed' | 'resolved' | 'closed';

export type TicketPriority = 'low' | 'medium' | 'high' | 'critical';

export interface TicketAttachment {
  /** Original filename */
  name: string;
  /** Base64-encoded file contents */
  data: string;
  /** MIME type */
  type: string;
  /** File size in bytes */
  size: number;
}

export interface TicketMessage {
  id: string;
  sender: 'user' | 'analyst';
  senderEmail: string;
  senderName?: string;
  message: string;
  timestamp: string;
}

export interface Ticket {
  /** Unique case identifier e.g. CASE-USER-0001 */
  id: string;
  /** Email of the submitting user */
  userEmail: string;
  /** ISO timestamp of submission */
  submittedAt: string;
  /** Current status of the ticket */
  status: TicketStatus;
  /** Priority level */
  priority: TicketPriority;
  /** Categorization of threat */
  threatCategory: string;
  /** Did user interact with the threat */
  didInteract: {
    clickedLink?: boolean;
    enteredCreds?: boolean;
    openedAttachment?: boolean;
  };
  /** User's additional comment / notes */
  userComment: string;
  /** The uploaded .eml file */
  emlFile: TicketAttachment | null;

  // ── Analyst response & findings ──
  assignedAnalyst: string | null;
  verdict: string | null;
  threatScore: number | null;
  analystComment: string | null;
  recommendedAction: string | null;
  remediationTaken: string | null;
  analystReport: TicketAttachment | null;
  respondedAt: string | null;
  emailId?: string;

  // ── User resolution & feedback ──
  userAcknowledged: boolean;
  userFeedback: string | null;
  userRating: number;
  closedAt: string | null;

  // ── Threaded conversation messages ──
  threadMessages: TicketMessage[];
}

/* ── Context ─────────────────────────────────────────────────────────────── */

interface TicketContextType {
  tickets: Ticket[];
  /** Submit a new ticket. Returns the generated case ID. */
  submitTicket: (data: {
    userEmail: string;
    userComment: string;
    emlFile: TicketAttachment | null;
    emailId?: string;
    priority?: TicketPriority;
    threatCategory?: string;
    didInteract?: {
      clickedLink?: boolean;
      enteredCreds?: boolean;
      openedAttachment?: boolean;
    };
  }) => Promise<string>;
  /** Analyst: update ticket with response, verdict, findings & status change */
  respondToTicket: (
    id: string,
    patch: {
      analystComment: string;
      analystReport: TicketAttachment | null;
      status?: TicketStatus;
      verdict?: string;
      threatScore?: number;
      recommendedAction?: string;
      remediationTaken?: string;
      assignedAnalyst?: string;
    }
  ) => void;
  /** User: acknowledge resolution and submit rating/feedback */
  acknowledgeAndResolveTicket: (
    id: string,
    data: {
      userRating?: number;
      userFeedback?: string;
    }
  ) => void;
  /** Append a message to the ticket's conversation thread */
  addTicketMessage: (
    id: string,
    message: {
      sender: 'user' | 'analyst';
      senderEmail: string;
      senderName?: string;
      message: string;
    }
  ) => void;
  /** Update ticket status */
  updateTicketStatus: (id: string, status: TicketStatus) => void;
  /** Get tickets belonging to a specific user */
  getTicketsForUser: (email: string) => Ticket[];
  /** Clear all tickets from local cache and remote database */
  clearAllTickets: () => Promise<void>;
  /** Delete a specific ticket */
  deleteTicket: (id: string) => Promise<void>;
}

const TicketContext = createContext<TicketContextType | null>(null);

/* ── Helper ──────────────────────────────────────────────────────────────── */

function generateCaseId(tickets: Ticket[]): string {
  const n = (tickets.length + 1).toString().padStart(4, '0');
  return `CASE-USER-${n}`;
}

const KEY_TICKETS_PURGED = 'sentinel_tickets_purged_v2';

function loadTickets(): Ticket[] {
  try {
    // If not yet purged of legacy demo tickets, purge local cache immediately
    if (localStorage.getItem(KEY_TICKETS_PURGED) !== 'true') {
      localStorage.removeItem(KEY_TICKETS);
      localStorage.setItem(KEY_TICKETS_PURGED, 'true');
      return [];
    }
    const raw = localStorage.getItem(KEY_TICKETS);
    if (raw) return JSON.parse(raw) as Ticket[];
  } catch { /* ignore */ }
  return [];
}

function saveTickets(tickets: Ticket[]): void {
  try {
    localStorage.setItem(KEY_TICKETS, JSON.stringify(tickets));
  } catch (err) {
    // Quota-safe fallback if attachments are large Base64
    try {
      const light = tickets.map((t) => ({
        ...t,
        emlFile: t.emlFile ? { ...t.emlFile, data: '' } : null,
        analystReport: t.analystReport ? { ...t.analystReport, data: '' } : null,
      }));
      localStorage.setItem(KEY_TICKETS, JSON.stringify(light));
    } catch { /* ignore */ }
  }
}

/* ── Provider ────────────────────────────────────────────────────────────── */

export function TicketProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>(loadTickets);
  const ticketsRef = useRef<Ticket[]>(tickets);
  // Track when the last local mutation occurred to suppress polling race conditions
  const lastMutationRef = useRef<number>(0);

  useEffect(() => {
    ticketsRef.current = tickets;
  }, [tickets]);

  // Sync tickets from Supabase on mount
  useEffect(() => {
    let isMounted = true;
    SupabaseDataService.fetchTickets().then((dbTickets) => {
      if (isMounted) {
        setTickets(dbTickets as unknown as Ticket[]);
        ticketsRef.current = dbTickets as unknown as Ticket[];
      }
    }).catch((e) => console.warn('Supabase fetchTickets failed:', e));
    return () => { isMounted = false; };
  }, []);

  // Listen for cross-tab storage updates (instant multi-tab sync)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === KEY_TICKETS && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue);
          if (Array.isArray(updated)) {
            setTickets(updated);
            ticketsRef.current = updated;
          }
        } catch { /* ignore */ }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // Periodic background sync with Supabase (every 5s) to catch remote updates
  useEffect(() => {
    let isMounted = true;
    const interval = setInterval(async () => {
      // Skip polling if a local mutation happened within the last 10 seconds
      // to avoid overwriting freshly-upserted data with stale remote data
      if (Date.now() - lastMutationRef.current < 10000) return;

      try {
        const remote = await SupabaseDataService.fetchTickets();
        if (isMounted) {
          setTickets((prev) => {
            const remoteTickets = (remote || []) as unknown as Ticket[];
            const prevSig = prev.map((t) => `${t.id}:${t.status}:${t.respondedAt}:${t.threadMessages?.length || 0}`).join('|');
            const remoteSig = remoteTickets.map((t) => `${t.id}:${t.status}:${t.respondedAt}:${t.threadMessages?.length || 0}`).join('|');
            if (prevSig !== remoteSig) {
              ticketsRef.current = remoteTickets;
              return remoteTickets;
            }
            return prev;
          });
        }
      } catch { /* ignore network errors */ }
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    saveTickets(tickets);
  }, [tickets]);

  const submitTicket = useCallback(
    async (data: {
      userEmail: string;
      userComment: string;
      emlFile: TicketAttachment | null;
      emailId?: string;
      priority?: TicketPriority;
      threatCategory?: string;
      didInteract?: { clickedLink?: boolean; enteredCreds?: boolean; openedAttachment?: boolean };
    }): Promise<string> => {
      const currentList = ticketsRef.current.length > 0 ? ticketsRef.current : loadTickets();
      const id = generateCaseId(currentList);
      const initialMessages: TicketMessage[] = data.userComment ? [{
        id: `msg-${Date.now()}`,
        sender: 'user',
        senderEmail: data.userEmail,
        message: data.userComment,
        timestamp: new Date().toISOString(),
      }] : [];

      const newTicket: Ticket = {
        id,
        userEmail: data.userEmail,
        submittedAt: new Date().toISOString(),
        status: 'pending',
        priority: data.priority || 'medium',
        threatCategory: data.threatCategory || 'phishing',
        didInteract: data.didInteract || {},
        userComment: data.userComment,
        emlFile: data.emlFile,
        assignedAnalyst: 'sentinelx.analyst@gmail.com',
        verdict: null,
        threatScore: null,
        analystComment: null,
        recommendedAction: null,
        remediationTaken: null,
        analystReport: null,
        respondedAt: null,
        emailId: data.emailId,
        userAcknowledged: false,
        userFeedback: null,
        userRating: 0,
        closedAt: null,
        threadMessages: initialMessages,
      };

      const nextTickets = [newTicket, ...currentList];
      lastMutationRef.current = Date.now();
      ticketsRef.current = nextTickets;
      setTickets(nextTickets);
      saveTickets(nextTickets);

      // Await sync to Supabase so it is committed before any redirect or page reload
      try {
        await SupabaseDataService.upsertTicket(newTicket as unknown as DbTicket);
      } catch (e) {
        console.warn('Failed to upsert ticket to Supabase:', e);
      }

      return id;
    },
    []
  );

  const respondToTicket = useCallback(
    (
      id: string,
      patch: {
        analystComment: string;
        analystReport: TicketAttachment | null;
        status?: TicketStatus;
        verdict?: string;
        threatScore?: number;
        recommendedAction?: string;
        remediationTaken?: string;
        assignedAnalyst?: string;
      }
    ) => {
      const currentList = ticketsRef.current.length > 0 ? ticketsRef.current : loadTickets();
      const existing = currentList.find((t) => t.id === id);
      if (!existing) return;

      const now = new Date().toISOString();
      const newMsgs = [...(existing.threadMessages || [])];
      if (patch.analystComment && !newMsgs.some((m) => m.message === patch.analystComment)) {
        newMsgs.push({
          id: `msg-${Date.now()}`,
          sender: 'analyst',
          senderEmail: patch.assignedAnalyst || existing.assignedAnalyst || 'sentinelx.analyst@gmail.com',
          message: patch.analystComment,
          timestamp: now,
        });
      }

      const updatedTicket: Ticket = {
        ...existing,
        analystComment: patch.analystComment,
        analystReport: patch.analystReport,
        status: patch.status || 'analyzed',
        verdict: patch.verdict !== undefined ? patch.verdict : existing.verdict,
        threatScore: patch.threatScore !== undefined ? patch.threatScore : existing.threatScore,
        recommendedAction: patch.recommendedAction !== undefined ? patch.recommendedAction : existing.recommendedAction,
        remediationTaken: patch.remediationTaken !== undefined ? patch.remediationTaken : existing.remediationTaken,
        assignedAnalyst: patch.assignedAnalyst || existing.assignedAnalyst || 'sentinelx.analyst@gmail.com',
        respondedAt: now,
        threadMessages: newMsgs,
      };

      const nextTickets = currentList.map((t) => (t.id === id ? updatedTicket : t));
      lastMutationRef.current = Date.now();
      ticketsRef.current = nextTickets;
      setTickets(nextTickets);
      saveTickets(nextTickets);

      // Upsert synchronously to Supabase
      SupabaseDataService.upsertTicket(updatedTicket as unknown as DbTicket).catch((e) => {
        console.warn('Failed to update ticket in Supabase:', e);
      });

      // Once the ticket is analyzed & responded to, mark escalation as completed on email
      if (patch.status !== 'in_review') {
        EmailIngestionService.completeEscalationByTicketOrCase(id, existing.emailId, patch.analystComment);
      }
    },
    []
  );

  const acknowledgeAndResolveTicket = useCallback(
    (id: string, data: { userRating?: number; userFeedback?: string }) => {
      const currentList = ticketsRef.current.length > 0 ? ticketsRef.current : loadTickets();
      const existing = currentList.find((t) => t.id === id);
      if (!existing) return;

      const now = new Date().toISOString();
      const newMsgs = [...(existing.threadMessages || [])];
      if (data.userFeedback) {
        newMsgs.push({
          id: `msg-${Date.now()}`,
          sender: 'user',
          senderEmail: existing.userEmail,
          message: `[Resolved] ${data.userFeedback}`,
          timestamp: now,
        });
      }

      const updatedTicket: Ticket = {
        ...existing,
        status: 'resolved',
        userAcknowledged: true,
        userRating: data.userRating || existing.userRating || 5,
        userFeedback: data.userFeedback !== undefined ? data.userFeedback : existing.userFeedback,
        closedAt: now,
        threadMessages: newMsgs,
      };

      const nextTickets = currentList.map((t) => (t.id === id ? updatedTicket : t));
      lastMutationRef.current = Date.now();
      ticketsRef.current = nextTickets;
      setTickets(nextTickets);
      saveTickets(nextTickets);

      SupabaseDataService.upsertTicket(updatedTicket as unknown as DbTicket).catch((e) => {
        console.warn('Failed to resolve ticket in Supabase:', e);
      });
    },
    []
  );

  const addTicketMessage = useCallback(
    (
      id: string,
      message: { sender: 'user' | 'analyst'; senderEmail: string; senderName?: string; message: string }
    ) => {
      const currentList = ticketsRef.current.length > 0 ? ticketsRef.current : loadTickets();
      const existing = currentList.find((t) => t.id === id);
      if (!existing) return;

      const newMsg: TicketMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sender: message.sender,
        senderEmail: message.senderEmail,
        senderName: message.senderName,
        message: message.message,
        timestamp: new Date().toISOString(),
      };

      // If user messages after analyzed, status can move to in_review
      const newStatus = message.sender === 'user' && existing.status === 'analyzed' ? 'in_review' : existing.status;
      const updatedTicket: Ticket = {
        ...existing,
        status: newStatus,
        threadMessages: [...(existing.threadMessages || []), newMsg],
      };

      const nextTickets = currentList.map((t) => (t.id === id ? updatedTicket : t));
      lastMutationRef.current = Date.now();
      ticketsRef.current = nextTickets;
      setTickets(nextTickets);
      saveTickets(nextTickets);

      SupabaseDataService.upsertTicket(updatedTicket as unknown as DbTicket).catch((e) => {
        console.warn('Failed to append ticket message in Supabase:', e);
      });
    },
    []
  );

  const updateTicketStatus = useCallback((id: string, status: TicketStatus) => {
    const currentList = ticketsRef.current.length > 0 ? ticketsRef.current : loadTickets();
    const existing = currentList.find((t) => t.id === id);
    if (!existing) return;

    const updatedTicket: Ticket = { ...existing, status };
    const nextTickets = currentList.map((t) => (t.id === id ? updatedTicket : t));
    lastMutationRef.current = Date.now();
    ticketsRef.current = nextTickets;
    setTickets(nextTickets);
    saveTickets(nextTickets);

    SupabaseDataService.upsertTicket(updatedTicket as unknown as DbTicket).catch((e) => {
      console.warn('Failed to update ticket status in Supabase:', e);
    });
  }, []);

  const clearAllTickets = useCallback(async () => {
    setTickets([]);
    ticketsRef.current = [];
    lastMutationRef.current = Date.now();
    try {
      localStorage.removeItem(KEY_TICKETS);
      localStorage.setItem(KEY_TICKETS_PURGED, 'true');
    } catch { /* ignore */ }
    await SupabaseDataService.clearAllTickets();
  }, []);

  const deleteTicket = useCallback(async (id: string) => {
    const nextTickets = ticketsRef.current.filter((t) => t.id !== id);
    lastMutationRef.current = Date.now();
    ticketsRef.current = nextTickets;
    setTickets(nextTickets);
    saveTickets(nextTickets);
    await SupabaseDataService.deleteTicket(id);
  }, []);

  const getTicketsForUser = useCallback(
    (email: string) => {
      if (!email) return [];
      const clean = email.toLowerCase().trim();
      return tickets.filter((t) => t.userEmail.toLowerCase().trim() === clean);
    },
    [tickets]
  );

  return (
    <TicketContext.Provider
      value={{
        tickets,
        submitTicket,
        respondToTicket,
        acknowledgeAndResolveTicket,
        addTicketMessage,
        updateTicketStatus,
        getTicketsForUser,
        clearAllTickets,
        deleteTicket,
      }}
    >
      {children}
    </TicketContext.Provider>
  );
}

export function useTickets(): TicketContextType {
  const ctx = useContext(TicketContext);
  if (!ctx) throw new Error('useTickets must be used inside TicketProvider');
  return ctx;
}
