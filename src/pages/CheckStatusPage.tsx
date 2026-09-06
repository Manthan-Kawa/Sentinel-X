import { useState, useEffect } from 'react';
import {
  ClipboardList, Clock, CheckCircle2, Download, X,
  FileText, MessageSquare, AlertCircle, Filter, Search,
  Calendar, Hash, Send, ShieldCheck, ShieldAlert, Star,
  CornerDownRight, User, AlertTriangle, ArrowRight, Trash2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTickets, type Ticket, type TicketAttachment, type TicketStatus } from '@/contexts/TicketContext';

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
function StatusBadge({ status }: { status: TicketStatus }) {
  switch (status) {
    case 'resolved':
    case 'closed':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
          style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', color: '#c084fc' }}
        >
          <CheckCircle2 className="w-3 h-3" />
          Resolved
        </span>
      );
    case 'analyzed':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
          style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}
        >
          <CheckCircle2 className="w-3 h-3" />
          Analyzed
        </span>
      );
    case 'in_review':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
          style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)', color: '#22d3ee' }}
        >
          <Clock className="w-3 h-3 animate-spin" />
          In Investigation
        </span>
      );
    case 'pending':
    default:
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}
        >
          <Clock className="w-3 h-3 animate-pulse" />
          Pending Review
        </span>
      );
  }
}

/* ── Case Detail Modal ─────────────────────────────────────────── */
function CaseDetailModal({
  ticket,
  onClose,
}: {
  ticket: Ticket;
  onClose: () => void;
}) {
  const { acknowledgeAndResolveTicket, addTicketMessage } = useTickets();
  const { currentUser } = useAuth();

  const isAnalyzed = ticket.status === 'analyzed';
  const isResolved = ticket.status === 'resolved' || ticket.status === 'closed';
  const isInReview = ticket.status === 'in_review';

  // Feedback form state
  const [rating, setRating] = useState<number>(ticket.userRating || 5);
  const [feedback, setFeedback] = useState<string>(ticket.userFeedback || '');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Chat message state
  const [replyText, setReplyText] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);

  const handleResolve = () => {
    setIsSubmittingFeedback(true);
    acknowledgeAndResolveTicket(ticket.id, {
      userRating: rating,
      userFeedback: feedback.trim() || 'Acknowledged and marked resolved by user.',
    });
    setIsSubmittingFeedback(false);
  };

  const handleSendMessage = () => {
    if (!replyText.trim() || !currentUser) return;
    setIsSendingMessage(true);
    addTicketMessage(ticket.id, {
      sender: 'user',
      senderEmail: currentUser.email,
      senderName: currentUser.displayName || 'You',
      message: replyText.trim(),
    });
    setReplyText('');
    setIsSendingMessage(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(10px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-3xl overflow-hidden animate-slide-up flex flex-col max-h-[92vh]"
        style={{
          background: 'linear-gradient(145deg, #0d1118, #0a0c14)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.85)',
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
                background: isResolved
                  ? 'rgba(168,85,247,0.15)'
                  : isAnalyzed
                  ? 'rgba(34,197,94,0.15)'
                  : isInReview
                  ? 'rgba(6,182,212,0.15)'
                  : 'rgba(245,158,11,0.15)',
                border: isResolved
                  ? '1px solid rgba(168,85,247,0.3)'
                  : isAnalyzed
                  ? '1px solid rgba(34,197,94,0.3)'
                  : isInReview
                  ? '1px solid rgba(6,182,212,0.3)'
                  : '1px solid rgba(245,158,11,0.3)',
              }}
            >
              {isResolved || isAnalyzed ? (
                <ShieldCheck className={`w-5 h-5 ${isResolved ? 'text-purple-400' : 'text-green-400'}`} />
              ) : isInReview ? (
                <Clock className="w-5 h-5 text-cyan-400 animate-spin" />
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
          {/* Progress Stepper */}
          <div
            className="p-3.5 rounded-2xl flex items-center justify-between"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {[
              { label: '1. Submitted', active: true, done: true },
              { label: '2. Under Investigation', active: isInReview || isAnalyzed || isResolved, done: isAnalyzed || isResolved },
              { label: '3. Findings Ready', active: isAnalyzed || isResolved, done: isAnalyzed || isResolved },
              { label: '4. Resolved', active: isResolved, done: isResolved },
            ].map((step, idx) => (
              <div key={step.label} className="flex items-center gap-1 text-[10px] font-bold">
                <div
                  className={`w-2 h-2 rounded-full ${
                    step.done
                      ? 'bg-green-400'
                      : step.active
                      ? (isInReview && step.label.includes('Investigation') ? 'bg-cyan-400 animate-ping' : 'bg-amber-400 animate-ping')
                      : 'bg-gray-700'
                  }`}
                />
                <span className={step.done ? 'text-green-300 font-mono' : step.active ? (isInReview && step.label.includes('Investigation') ? 'text-cyan-300 font-mono' : 'text-amber-300 font-mono') : 'text-gray-600 font-mono'}>
                  {step.label}
                </span>
                {idx < 3 && <ArrowRight className="w-3 h-3 text-gray-700 mx-1 hidden sm:inline" />}
              </div>
            ))}
          </div>

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
                icon: isResolved ? CheckCircle2 : isAnalyzed ? ShieldCheck : Clock,
                label: 'SOC Status',
                value: isResolved ? 'Resolved & Closed' : isAnalyzed ? 'Analysis Complete' : isInReview ? 'Under Active Investigation' : 'Queued in Triage',
              },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <Icon className="w-3 h-3 text-gray-500" />
                  <p className="text-[10px] text-gray-500 uppercase tracking-wider">{label}</p>
                </div>
                <p className="text-xs text-gray-200 truncate">{value}</p>
              </div>
            ))}
          </div>

          {/* User's Original Notes */}
          {ticket.userComment && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" /> Your Original Submission Notes
              </label>
              <p
                className="text-sm text-gray-300 leading-relaxed p-3.5 rounded-xl text-xs"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                {ticket.userComment}
              </p>
            </div>
          )}

          {/* User Interaction Flags if any */}
          {ticket.didInteract && (ticket.didInteract.clickedLink || ticket.didInteract.enteredCreds) && (
            <div
              className="flex items-center gap-2.5 p-3 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
            >
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-xs text-red-300">
                You reported interacting with this email ({ticket.didInteract.clickedLink ? 'Clicked Link' : ''} {ticket.didInteract.enteredCreds ? '• Entered Credentials' : ''}). Please review analyst actions below.
              </p>
            </div>
          )}

          {/* Uploaded EML file download */}
          {ticket.emlFile && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3 h-3" /> Submitted Email File (.eml)
              </label>
              <button
                onClick={() => downloadAttachment(ticket.emlFile!.data, ticket.emlFile!.name)}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm text-blue-300 font-semibold transition-all hover:text-blue-200 group"
                style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
              >
                <Download className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
                <span className="truncate">{ticket.emlFile.name}</span>
                <span className="text-[11px] text-gray-500 font-normal ml-auto shrink-0">
                  {formatBytes(ticket.emlFile.size)}
                </span>
              </button>
            </div>
          )}

          {/* Analyst Response & Findings Block */}
          {(isAnalyzed || isResolved) ? (
            <div
              className="space-y-4 p-5 rounded-2xl"
              style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.25)' }}
            >
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                  <p className="text-xs font-bold text-green-400 uppercase tracking-wider">
                    Analyst Investigation Response
                  </p>
                </div>
                {ticket.respondedAt && (
                  <span className="text-[10px] text-green-400/70 font-mono">
                    {formatDate(ticket.respondedAt)}
                  </span>
                )}
              </div>

              {/* Verdict & Threat Score Badges */}
              {(ticket.verdict || ticket.threatScore !== null) && (
                <div className="flex items-center gap-2 flex-wrap">
                  {ticket.verdict && (
                    <span
                      className="px-2.5 py-1 rounded-lg text-xs font-bold"
                      style={{
                        background: ticket.verdict.toLowerCase().includes('malicious') || ticket.verdict.toLowerCase().includes('phishing')
                          ? 'rgba(239,68,68,0.15)'
                          : ticket.verdict.toLowerCase().includes('safe') || ticket.verdict.toLowerCase().includes('clean')
                          ? 'rgba(34,197,94,0.15)'
                          : 'rgba(245,158,11,0.15)',
                        color: ticket.verdict.toLowerCase().includes('malicious') || ticket.verdict.toLowerCase().includes('phishing')
                          ? '#f87171'
                          : ticket.verdict.toLowerCase().includes('safe') || ticket.verdict.toLowerCase().includes('clean')
                          ? '#4ade80'
                          : '#fbbf24',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                    >
                      Verdict: {ticket.verdict}
                    </span>
                  )}
                  {ticket.threatScore !== null && ticket.threatScore !== undefined && (
                    <span
                      className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#e5e7eb' }}
                    >
                      Threat Score: {ticket.threatScore}/100
                    </span>
                  )}
                </div>
              )}

              {/* Analyst Comment */}
              {ticket.analystComment ? (
                <p className="text-sm text-gray-100 leading-relaxed bg-black/30 p-3.5 rounded-xl border border-green-500/20 whitespace-pre-wrap">
                  {ticket.analystComment}
                </p>
              ) : (
                <p className="text-xs text-gray-400 italic">No comments provided by the analyst.</p>
              )}

              {/* Recommended Action Box */}
              {ticket.recommendedAction && (
                <div
                  className="p-3.5 rounded-xl"
                  style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.25)' }}
                >
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">
                    Recommended Action For You:
                  </p>
                  <p className="text-xs text-blue-100 leading-relaxed">
                    {ticket.recommendedAction}
                  </p>
                </div>
              )}

              {/* Remediation Taken by SOC */}
              {ticket.remediationTaken && (
                <div
                  className="p-3 rounded-xl text-xs text-gray-300"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                >
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-0.5">
                    Remediation Implemented by SOC:
                  </span>
                  {ticket.remediationTaken}
                </div>
              )}

              {/* Download Investigation Report Button */}
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
                <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  {isInReview ? 'Active Investigation in Progress' : 'Queued for Analyst Review'}
                </p>
                <p className="text-xs text-amber-300/80 leading-relaxed mt-0.5">
                  {isInReview
                    ? 'A security analyst is currently inspecting headers, reputation, and domain links for this submission.'
                    : 'Your submitted report is queued in the SOC triage stream. You will receive an alert notification when the investigation concludes.'}
                </p>
              </div>
            </div>
          )}

          {/* Interactive User Resolution / Feedback Block */}
          {isAnalyzed && !isResolved && (
            <div
              className="p-5 rounded-2xl space-y-3"
              style={{ background: 'rgba(168,85,247,0.06)', border: '1px solid rgba(168,85,247,0.25)' }}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-purple-400" />
                  Confirm Resolution & Rate Response
                </p>
                <span className="text-[10px] text-gray-500">Closes the ticket loop</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Rating:</span>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 hover:scale-125 transition-transform"
                  >
                    <Star
                      className={`w-4 h-4 ${star <= rating ? 'text-amber-400 fill-amber-400' : 'text-gray-600'}`}
                    />
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Optional confirmation note (e.g. 'Password reset, thank you!')..."
                className="w-full text-xs rounded-xl px-3 py-2 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
              />

              <button
                onClick={handleResolve}
                disabled={isSubmittingFeedback}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 shadow"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
              >
                Acknowledge & Mark Resolved
              </button>
            </div>
          )}

          {/* If already resolved, show rating summary */}
          {isResolved && (
            <div
              className="p-4 rounded-2xl flex items-center justify-between"
              style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.2)' }}
            >
              <div>
                <p className="text-xs font-bold text-purple-300">Case Resolved by You</p>
                {ticket.userFeedback && <p className="text-xs text-gray-300 mt-0.5 italic">"{ticket.userFeedback}"</p>}
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`w-3.5 h-3.5 ${s <= (ticket.userRating || 5) ? 'text-amber-400 fill-amber-400' : 'text-gray-700'}`}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Threaded Discussion Messages (Only shown prior to analysis/resolution) */}
          {!isAnalyzed && !isResolved && (
            <div className="space-y-3 pt-2 border-t border-white/5">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" /> Ticket Activity & Messages
              </p>

              {ticket.threadMessages && ticket.threadMessages.length > 0 ? (
                <div className="flex flex-col space-y-2 max-h-48 overflow-y-auto pr-1">
                  {ticket.threadMessages.map((msg) => {
                    const isAnalyst = msg.sender === 'analyst';
                    return (
                      <div
                        key={msg.id}
                        className={`p-3 rounded-xl text-xs leading-relaxed w-[40%] min-w-[220px] ${
                          isAnalyst
                            ? 'mr-auto bg-purple-950/30 border border-purple-500/20 text-purple-100'
                            : 'ml-auto bg-white/[0.06] border border-white/10 text-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="font-bold text-[10px] text-gray-400 font-mono truncate" title={isAnalyst ? '🛡️ SOC Analyst' : '👤 You'}>
                            {isAnalyst ? '🛡️ SOC Analyst' : '👤 You'}
                          </span>
                          <span className="text-[10px] text-gray-500 font-mono shrink-0 text-[9px]">{formatDate(msg.timestamp)}</span>
                        </div>
                        <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-500 italic">No additional messages yet.</p>
              )}

              {/* Follow-up question input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask follow-up question or reply to analyst..."
                  className="flex-1 text-xs rounded-xl px-3.5 py-2.5 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!replyText.trim() || isSendingMessage}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-white transition-all disabled:opacity-40 hover:opacity-90 flex items-center gap-1.5"
                  style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
                >
                  <Send className="w-3 h-3" />
                  Reply
                </button>
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
            className="px-5 py-2 rounded-xl text-xs font-bold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 transition-all"
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
  const { getTicketsForUser, deleteTicket } = useTickets();

  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_review' | 'analyzed' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const tickets = currentUser ? getTicketsForUser(currentUser.email) : [];

  // Auto-open ticket if directed from notification click
  useEffect(() => {
    const activeId = sessionStorage.getItem('sentinel_active_ticket_id');
    if (activeId && tickets.length > 0) {
      sessionStorage.removeItem('sentinel_active_ticket_id');
      const found = tickets.find((t) => t.id === activeId);
      if (found) {
        setSelectedTicket(found);
      }
    }
  }, [tickets]);

  // Keep modal ticket state updated when new messages or analyst responses arrive
  useEffect(() => {
    if (selectedTicket) {
      const refreshed = tickets.find((t) => t.id === selectedTicket.id);
      if (refreshed && (
        refreshed.status !== selectedTicket.status ||
        (refreshed.threadMessages?.length || 0) !== (selectedTicket.threadMessages?.length || 0) ||
        refreshed.respondedAt !== selectedTicket.respondedAt ||
        refreshed.closedAt !== selectedTicket.closedAt
      )) {
        setSelectedTicket(refreshed);
      }
    }
  }, [tickets, selectedTicket]);
  const pending = tickets.filter((t) => t.status === 'pending').length;
  const inReview = tickets.filter((t) => t.status === 'in_review').length;
  const analyzed = tickets.filter((t) => t.status === 'analyzed').length;
  const resolved = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;

  const filtered = tickets.filter((t) => {
    const matchesStatus = filterStatus === 'all'
      || t.status === filterStatus
      || (filterStatus === 'resolved' && (t.status === 'resolved' || t.status === 'closed'));
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
                className="px-2 py-0.5 rounded-full text-xs font-bold text-amber-300 font-mono"
                style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)' }}
              >
                {pending} pending
              </span>
            )}
          </div>
          <p className="text-gray-400 text-sm">
            Track submitted suspicious email reports, view SOC verdicts, and communicate with security analysts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {tickets.length > 0 && (
            <button
              onClick={async () => {
                if (window.confirm('Are you sure you want to clear your submitted report history?')) {
                  for (const t of tickets) {
                    await deleteTicket(t.id);
                  }
                }
              }}
              className="px-3 py-2 rounded-xl text-xs font-mono font-bold text-gray-400 hover:text-rose-400 bg-white/[0.03] hover:bg-rose-500/10 border border-white/10 hover:border-rose-500/30 transition-all flex items-center gap-1.5 cursor-pointer"
              title="Clear all your submitted reports"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear History
            </button>
          )}

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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
        {[
          { label: 'Total Submitted', value: tickets.length, color: 'text-blue-400', bg: 'rgba(59,130,246,0.08)', border: 'rgba(59,130,246,0.2)' },
          { label: 'Pending Review',  value: pending,        color: 'text-amber-400', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
          { label: 'In Investigation',value: inReview,       color: 'text-cyan-400',  bg: 'rgba(6,182,212,0.08)',  border: 'rgba(6,182,212,0.2)' },
          { label: 'Analyzed & Done', value: analyzed + resolved, color: 'text-green-400', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl px-4 py-3 text-center" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{s.label}</p>
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
          {(['all', 'pending', 'in_review', 'analyzed', 'resolved'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="h-8 px-3.5 rounded-lg text-xs font-bold capitalize transition-all flex items-center justify-center"
              style={
                filterStatus === s
                  ? { background: 'rgba(34,197,94,0.25)', color: '#86efac', border: '1px solid rgba(34,197,94,0.4)' }
                  : { color: '#6b7280', border: '1px solid transparent' }
              }
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Search */}
        <div
          className="h-10 flex-1 min-w-[200px] flex items-center gap-2.5 px-3.5 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Search className="w-4 h-4 text-gray-500 shrink-0" />
          <input
            type="text"
            placeholder="Search by case ID, filename, or comment..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs text-white bg-transparent placeholder-gray-500 focus:outline-none"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-gray-500 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Ticket List */}
      {filtered.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <ClipboardList className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-400">No reports found</p>
          <p className="text-xs text-gray-600 mt-1 max-w-sm mx-auto">
            {tickets.length === 0
              ? 'You have not submitted any reports yet. Click "Submit New Report" to upload a suspicious email.'
              : 'No tickets match the selected filters.'}
          </p>
          {tickets.length === 0 && (
            <button
              onClick={() => onNavigate('submit-report')}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #059669, #047857)' }}
            >
              Submit Your First Report
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket)}
              className="rounded-2xl p-4 transition-all duration-200 hover:scale-[1.007] cursor-pointer group"
              style={{
                background: 'linear-gradient(145deg, #0d1118, #0a0c14)',
                border: ticket.status === 'analyzed'
                  ? '1px solid rgba(34,197,94,0.25)'
                  : ticket.status === 'resolved'
                  ? '1px solid rgba(168,85,247,0.25)'
                  : ticket.status === 'in_review'
                  ? '1px solid rgba(6,182,212,0.25)'
                  : '1px solid rgba(255,255,255,0.07)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              }}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                    style={{
                      background: ticket.status === 'resolved'
                        ? 'rgba(168,85,247,0.12)'
                        : ticket.status === 'analyzed'
                        ? 'rgba(34,197,94,0.12)'
                        : ticket.status === 'in_review'
                        ? 'rgba(6,182,212,0.12)'
                        : 'rgba(245,158,11,0.12)',
                      border: ticket.status === 'resolved'
                        ? '1px solid rgba(168,85,247,0.25)'
                        : ticket.status === 'analyzed'
                        ? '1px solid rgba(34,197,94,0.25)'
                        : ticket.status === 'in_review'
                        ? '1px solid rgba(6,182,212,0.3)'
                        : '1px solid rgba(245,158,11,0.25)',
                    }}
                  >
                    {ticket.status === 'resolved' ? (
                      <ShieldCheck className="w-5 h-5 text-purple-400" />
                    ) : ticket.status === 'analyzed' ? (
                      <ShieldCheck className="w-5 h-5 text-green-400" />
                    ) : ticket.status === 'in_review' ? (
                      <Clock className="w-5 h-5 text-cyan-400 animate-spin" />
                    ) : (
                      <Clock className="w-5 h-5 text-amber-400 animate-pulse" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold text-white">{ticket.id}</span>
                      <StatusBadge status={ticket.status} />
                      {ticket.verdict && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-white/5 text-gray-300">
                          {ticket.verdict}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-300 mt-1 truncate">
                      {ticket.userComment || (ticket.emlFile ? `File: ${ticket.emlFile.name}` : 'No description')}
                    </p>

                    <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-500 flex-wrap">
                      <span>Submitted: {formatDate(ticket.submittedAt)}</span>
                      {ticket.emlFile && <span>• {ticket.emlFile.name}</span>}
                      {ticket.threadMessages && ticket.threadMessages.length > 0 && (
                        <span>• {ticket.threadMessages.length} message(s)</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete report ${ticket.id}?`)) {
                        deleteTicket(ticket.id);
                      }
                    }}
                    className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete report"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-xs text-gray-400 group-hover:text-white transition-colors">
                    View Details →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Ticket Modal */}
      {selectedTicket && (
        <CaseDetailModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
        />
      )}
    </div>
  );
}
