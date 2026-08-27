/**
 * TicketContext.tsx
 *
 * Central store for user-submitted report tickets.
 * Persisted in localStorage. Provides CRUD operations for both
 * standard users (submit / read own) and analysts (read all / respond).
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { KEY_TICKETS } from '@/utils/storageKeys';

/* ── Types ──────────────────────────────────────────────────────────────── */

export type TicketStatus = 'pending' | 'analyzed';

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

export interface Ticket {
  /** Unique case identifier e.g. CASE-USER-0001 */
  id: string;
  /** Email of the submitting user */
  userEmail: string;
  /** ISO timestamp of submission */
  submittedAt: string;
  /** Status of the ticket */
  status: TicketStatus;
  /** User's additional comment / notes */
  userComment: string;
  /** The uploaded .eml file */
  emlFile: TicketAttachment | null;
  /** Analyst response comment */
  analystComment: string | null;
  /** Analyst-attached report file */
  analystReport: TicketAttachment | null;
  /** ISO timestamp of analyst response */
  respondedAt: string | null;
}

/* ── Context ─────────────────────────────────────────────────────────────── */

interface TicketContextType {
  tickets: Ticket[];
  /** Submit a new ticket. Returns the generated case ID. */
  submitTicket: (data: {
    userEmail: string;
    userComment: string;
    emlFile: TicketAttachment | null;
  }) => string;
  /** Analyst: update ticket with response + status change */
  respondToTicket: (
    id: string,
    patch: {
      analystComment: string;
      analystReport: TicketAttachment | null;
      status: TicketStatus;
    }
  ) => void;
  /** Get tickets belonging to a specific user */
  getTicketsForUser: (email: string) => Ticket[];
}

const TicketContext = createContext<TicketContextType | null>(null);

/* ── Helper ──────────────────────────────────────────────────────────────── */

function generateCaseId(tickets: Ticket[]): string {
  const n = (tickets.length + 1).toString().padStart(4, '0');
  return `CASE-USER-${n}`;
}

function loadTickets(): Ticket[] {
  try {
    const raw = localStorage.getItem(KEY_TICKETS);
    if (raw) return JSON.parse(raw) as Ticket[];
  } catch { /* ignore */ }
  return [];
}

function saveTickets(tickets: Ticket[]): void {
  try {
    localStorage.setItem(KEY_TICKETS, JSON.stringify(tickets));
  } catch { /* ignore */ }
}

/* ── Provider ────────────────────────────────────────────────────────────── */

export function TicketProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>(loadTickets);

  useEffect(() => {
    saveTickets(tickets);
  }, [tickets]);

  const submitTicket = useCallback(
    (data: { userEmail: string; userComment: string; emlFile: TicketAttachment | null }): string => {
      const id = generateCaseId(tickets);
      const newTicket: Ticket = {
        id,
        userEmail: data.userEmail,
        submittedAt: new Date().toISOString(),
        status: 'pending',
        userComment: data.userComment,
        emlFile: data.emlFile,
        analystComment: null,
        analystReport: null,
        respondedAt: null,
      };
      setTickets((prev) => [newTicket, ...prev]);
      return id;
    },
    [tickets]
  );

  const respondToTicket = useCallback(
    (
      id: string,
      patch: { analystComment: string; analystReport: TicketAttachment | null; status: TicketStatus }
    ) => {
      setTickets((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                analystComment: patch.analystComment,
                analystReport: patch.analystReport,
                status: patch.status,
                respondedAt: new Date().toISOString(),
              }
            : t
        )
      );
    },
    []
  );

  const getTicketsForUser = useCallback(
    (email: string) => tickets.filter((t) => t.userEmail === email),
    [tickets]
  );

  return (
    <TicketContext.Provider value={{ tickets, submitTicket, respondToTicket, getTicketsForUser }}>
      {children}
    </TicketContext.Provider>
  );
}

export function useTickets(): TicketContextType {
  const ctx = useContext(TicketContext);
  if (!ctx) throw new Error('useTickets must be used inside TicketProvider');
  return ctx;
}
