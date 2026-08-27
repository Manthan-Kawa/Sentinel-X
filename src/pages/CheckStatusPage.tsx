import { useState } from 'react';
import {
  ClipboardList, Clock, CheckCircle2, Download, X,
  FileText, MessageSquare, AlertCircle, Filter, Search,
  Calendar, Hash, ChevronRight, ExternalLink, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTickets, type Ticket, type TicketAttachment } from '@/contexts/TicketContext';

interface CheckStatusPageProps {
  onNavigate: (id: string) => void;
}

/* ── Helpers ───────────────────────────────────────────────────── */
function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function downloadAttachment(data: string, name: string) {
  const a = document.createElement('a');
  a.href = data;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/* ── Status Badge ──────────────────────────────────────────────── */
function StatusBadge({ status }: { status: Ticket['status'] }) {
  if (status === 'analyzed') {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold font-mono"
        style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}
      >
        <CheckCircle2 className="w-3 h-3" />
        Analyzed
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold font-mono"
      style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}
    >
      <Clock className="w-3 h-3 animate-pulse" />
      Pending
    </span>
  );
}

/* ── Openable Case Detail Modal ────────────────────────────────── */
interface CaseModalProps {
  ticket: Ticket;
  onClose: () => void;
}

function CaseDetailModal({ ticket, onClose }: CaseModalProps) {
  const isAnalyzed = ticket.status === 'analyzed';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.78)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-3xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]"
        style={{
          background: 'linear-gradient(145deg, #0d1118, #0a0c14)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.75)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: isAnalyzed ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                border: isAnalyzed ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(245,158,11,0.25)',
              }}
            >
              {isAnalyzed ? (
                <ShieldCheck className="w-5 h-5 text-green-400" />
              ) : (
                <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-white font-mono">{ticket.id}</p>
                <StatusBadge status={ticket.status} />
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5">Submitted {formatDate(ticket.submittedAt)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto scrollbar-thin flex-1 px-6 py-5 space-y-5">
          {/* Metadata Grid */}
          <div
            className="grid grid-cols-2 gap-3 p-4 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {[
              { icon: Hash, label: 'Case Number', value: ticket.id },
              { icon: Calendar, label: 'Date Submitted', value: formatDate(ticket.submittedAt) },
              { icon: FileText, label: 'Uploaded EML', value: ticket.emlFile?.name ?? 'None' },
              {
                icon: isAnalyzed ? CheckCircle2 : Clock,
                label: 'Investigation Status',
                value: isAnalyzed ? 'Review Completed' : 'In Triage Queue',
              },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3 h-3 text-gray-500" />
                  <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">{label}</p>
                </div>
                <p className="text-xs text-gray-200 font-mono truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* User's Submitted Notes */}
          {ticket.userComment && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" /> Your Submitted Notes
              </label>
              <p
                className="text-sm text-gray-300 leading-relaxed p-3.5 rounded-xl font-mono text-xs"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                {ticket.userComment}
              </p>
            </div>
          )}

          {/* Uploaded EML file download */}
          {ticket.emlFile && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3 h-3" /> Submitted Email File (.eml)
              </label>
              <button
                onClick={() => downloadAttachment(ticket.emlFile!.data, ticket.emlFile!.name)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm text-blue-300 font-semibold transition-all hover:text-blue-200 group"
                style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
              >
                <Download className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="truncate">{ticket.emlFile.name}</span>
                <span className="text-[11px] text-gray-500 font-normal ml-auto shrink-0 font-mono">
                  {formatBytes(ticket.emlFile.size)}
                </span>
              </button>
            </div>
          )}

          {/* Analyst Response Block (if Analyzed) */}
          {isAnalyzed ? (
            <div
              className="space-y-3.5 p-5 rounded-2xl"
              style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.25)' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <p className="text-xs font-bold text-green-400 font-mono uppercase tracking-wider">
                    Analyst Investigation Response
                  </p>
                </div>
                {ticket.respondedAt && (
                  <span className="text-[10px] text-green-400/70 font-mono">
                    {formatDate(ticket.respondedAt)}
                  </span>
                )}
              </div>

              {ticket.analystComment ? (
                <p className="text-sm text-gray-100 leading-relaxed bg-black/30 p-3.5 rounded-xl border border-green-500/20">
                  {ticket.analystComment}
                </p>
              ) : (
                <p className="text-xs text-gray-400 italic">No additional comments provided by the analyst.</p>
              )}

              {ticket.analystReport && (
                <div className="pt-1">
                  <button
                    onClick={() => downloadAttachment(ticket.analystReport!.data, ticket.analystReport!.name)}
                    className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-white font-bold text-sm transition-all hover:opacity-95 shadow-lg"
                    style={{
                      background: 'linear-gradient(135deg, #059669, #047857)',
                      boxShadow: '0 4px 20px rgba(5,150,105,0.3)',
                    }}
                  >
                    <Download className="w-4 h-4" />
                    Download Investigation Report ({ticket.analystReport.name})
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div
              className="flex items-start gap-3 p-4 rounded-2xl"
              style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}
            >
              <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono">
                  Queued for Analyst Review
                </p>
                <p className="text-xs text-amber-300/80 leading-relaxed mt-0.5">
                  Your submitted report is currently under review by our security operations team. You will receive an alert notification when the investigation report is ready.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div
          className="px-6 py-4 flex items-center justify-end shrink-0"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
        >
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 transition-all font-mono"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
export function CheckStatusPage({ onNavigate }: CheckStatusPageProps) {
  const { currentUser } = useAuth();
  const { getTicketsForUser } = useTickets();

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'analyzed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const tickets = currentUser ? getTicketsForUser(currentUser.email) : [];
  const pending = tickets.filter((t) => t.status === 'pending').length;
  const analyzed = tickets.filter((t) => t.status === 'analyzed').length;

  const filtered = tickets.filter((t) => {
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q
      || t.id.toLowerCase().includes(q)
      || (t.emlFile?.name && t.emlFile.name.toLowerCase().includes(q))
      || t.userComment.toLowerCase().includes(q)
      || (t.analystComment && t.analystComment.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}
            >
              <ClipboardList className="w-4.5 h-4.5 text-green-400" />
            </div>
            <h1 className="text-2xl font-black text-white">Check Status</h1>
            {pending > 0 && (
              <span
                className="px-2 py-0.5 rounded-full text-xs font-bold font-mono text-amber-300"
                style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}
              >
                {pending} pending
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm">
            Track all your submitted suspicious email reports and view analyst responses.
          </p>
        </div>

        <button
          onClick={() => onNavigate('submit-report')}
          className="px-4 py-2 rounded-xl text-xs font-bold text-white transition-all shadow-lg hover:opacity-90 flex items-center gap-2"
          style={{
            background: 'linear-gradient(135deg, #059669, #047857)',
            boxShadow: '0 4px 16px rgba(5,150,105,0.25)',
          }}
        >
          + Submit New Report
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-3 max-w-md">
        {[
          { label: 'Total Submitted', value: tickets.length, color: 'text-blue-400', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
          { label: 'Pending Review',  value: pending,        color: 'text-amber-400', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
          { label: 'Analyzed',        value: analyzed,       color: 'text-green-400', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl px-4 py-3 text-center" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-gray-400 font-mono mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Status filter tabs */}
        <div
          className="h-10 flex items-center gap-1 p-1 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Filter className="w-3.5 h-3.5 text-gray-500 ml-2 mr-1" />
          {(['all', 'pending', 'analyzed'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="h-8 px-3.5 rounded-lg text-xs font-bold font-mono capitalize transition-all flex items-center justify-center"
              style={
                filterStatus === s
                  ? { background: 'rgba(34,197,94,0.25)', color: '#86efac', border: '1px solid rgba(34,197,94,0.4)' }
                  : { color: '#6b7280', border: '1px solid transparent' }
              }
            >
              {s}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div
          className="h-10 flex items-center gap-2.5 px-3.5 rounded-xl flex-1 min-w-48 max-w-md"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Search className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by case ID, file name, or notes…"
            className="bg-transparent text-xs text-gray-200 placeholder-gray-500 focus:outline-none w-full font-mono"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-gray-500 hover:text-gray-300">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Ticket Cards List */}
      {tickets.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 gap-4 rounded-2xl"
          style={{ border: '1px dashed rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.01)' }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <ClipboardList className="w-7 h-7 text-gray-600" />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold">No reports submitted yet</p>
            <p className="text-gray-500 text-sm mt-1">Submit your first .eml file to get started.</p>
          </div>
          <button
            onClick={() => onNavigate('submit-report')}
            className="px-4 py-2 rounded-xl text-xs font-bold text-green-300 hover:text-white transition-all"
            style={{ background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.25)' }}
          >
            Submit a Report →
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center text-sm text-gray-500 rounded-2xl border border-white/5 bg-white/[0.01]">
          No cases match your search query or active filter.
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((ticket) => {
            const isAnalyzed = ticket.status === 'analyzed';
            return (
              <div
                key={ticket.id}
                onClick={() => setSelectedTicket(ticket)}
                className="group p-5 rounded-2xl transition-all duration-200 cursor-pointer flex items-center justify-between gap-4"
                style={{
                  background: isAnalyzed ? 'rgba(34,197,94,0.03)' : 'rgba(255,255,255,0.02)',
                  border: isAnalyzed ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(255,255,255,0.08)',
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = isAnalyzed
                    ? 'rgba(34,197,94,0.45)'
                    : 'rgba(255,255,255,0.2)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.borderColor = isAnalyzed
                    ? 'rgba(34,197,94,0.2)'
                    : 'rgba(255,255,255,0.08)';
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                }}
              >
                <div className="flex items-center gap-4 min-w-0 flex-1">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                    style={{
                      background: isAnalyzed ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.08)',
                      border: isAnalyzed ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(245,158,11,0.2)',
                    }}
                  >
                    {isAnalyzed ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="font-black text-white font-mono text-sm tracking-wide">
                        {ticket.id}
                      </span>
                      <StatusBadge status={ticket.status} />
                      {isAnalyzed && ticket.analystReport && (
                        <span className="text-[10px] font-mono text-emerald-400/90 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                          <FileText className="w-2.5 h-2.5" /> Report Attached
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-400 flex-wrap">
                      <span>Submitted {formatDate(ticket.submittedAt)}</span>
                      {ticket.emlFile && (
                        <span className="font-mono text-gray-500 flex items-center gap-1">
                          <FileText className="w-3 h-3 text-gray-600" />
                          {ticket.emlFile.name}
                        </span>
                      )}
                    </div>

                    {ticket.userComment && (
                      <p className="text-xs text-gray-500 mt-1 truncate max-w-xl">
                        "{ticket.userComment}"
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-400 group-hover:text-white font-medium flex items-center gap-1 font-mono transition-colors">
                    View Details <ChevronRight className="w-4 h-4 text-gray-500 group-hover:text-green-400 group-hover:translate-x-0.5 transition-all" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Case Detail Modal */}
      {selectedTicket && (
        <CaseDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  );
}
