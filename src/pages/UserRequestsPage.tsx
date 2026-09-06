import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Inbox, Clock, CheckCircle2, Download, Upload, X, ChevronRight,
  MessageSquare, FileText, User, Calendar, Hash, Send, AlertTriangle,
  Filter, Search, Mail, ShieldCheck, Star, ArrowRight, ShieldAlert,
  Lock,
} from 'lucide-react';
import { useTickets, type Ticket, type TicketAttachment, type TicketStatus } from '@/contexts/TicketContext';
import { useAuth } from '@/contexts/AuthContext';

interface UserRequestsPageProps {
  onNavigate: (id: string) => void;
}

/* ── Helpers ──────────────────────────────────────────────────── */
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

function fileToAttachment(file: File): Promise<TicketAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({ name: file.name, data: reader.result as string, type: file.type, size: file.size });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Prepares, copies rich formatted body, auto-downloads the PDF report, and launches Gmail */
function sendEmailToUser(ticket: Ticket, analystComment?: string, analystReport?: TicketAttachment | null) {
  const comment = analystComment || ticket.analystComment || 'The security investigation for your submitted suspicious email report has concluded.';
  const reportObj = analystReport || ticket.analystReport;
  const reportInfo = reportObj
    ? `\nAttached Investigation Report: ${reportObj.name}\n(Available for instant download in your Sentinel-X Check Status portal)`
    : '';

  if (reportObj?.data) {
    try {
      downloadAttachment(reportObj.data, reportObj.name);
    } catch { /* ignore */ }
  }

  const subject = `[SENTINEL-X SOC] Investigation Report: ${ticket.id}`;

  const bodyText = `Dear User,

The Security Operations Center (SOC) team has analyzed your suspicious email submission (${ticket.id}).

==================================================
CASE SUMMARY:
• Case Number  : ${ticket.id}
• Submitted At : ${formatDate(ticket.submittedAt)}
• Status       : ANALYZED & RESOLVED
${ticket.emlFile ? `• Original File: ${ticket.emlFile.name}` : ''}
==================================================

ANALYST INVESTIGATION FINDINGS:
${comment}
${reportInfo}

SECURITY RECOMMENDATION:
Please log in to your Sentinel-X portal under "Check Status" to view telemetry details.

Regards,
SENTINEL-X Cyber Defense Operations
Security Operations Center (SOC)`;

  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(ticket.userEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
  window.open(gmailUrl, '_blank');
}

/* ── Status Badge ─────────────────────────────────────────────── */
function StatusBadge({ status }: { status: TicketStatus }) {
  switch (status) {
    case 'resolved':
    case 'closed':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono"
          style={{ background: 'rgba(168,85,247,0.12)', border: '1px solid rgba(168,85,247,0.3)', color: '#c084fc' }}
        >
          <CheckCircle2 className="w-2.5 h-2.5" /> Resolved
        </span>
      );
    case 'analyzed':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono"
          style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}
        >
          <CheckCircle2 className="w-2.5 h-2.5" /> Analyzed
        </span>
      );
    case 'in_review':
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono"
          style={{ background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)', color: '#22d3ee' }}
        >
          <Clock className="w-2.5 h-2.5 animate-spin" /> In Investigation
        </span>
      );
    case 'pending':
    default:
      return (
        <span
          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono"
          style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}
        >
          <Clock className="w-2.5 h-2.5 animate-pulse" /> Pending
        </span>
      );
  }
}

/* ── Detail Modal ─────────────────────────────────────────────── */
interface ModalProps {
  ticket: Ticket;
  onClose: () => void;
  onRespond: (
    id: string,
    data: {
      analystComment: string;
      analystReport: TicketAttachment | null;
      status: TicketStatus;
      verdict?: string;
      threatScore?: number;
      recommendedAction?: string;
      remediationTaken?: string;
    }
  ) => void;
}

function TicketModal({ ticket, onClose, onRespond }: ModalProps) {
  const { addTicketMessage } = useTickets();
  const { currentUser } = useAuth();

  const [analystComment, setAnalystComment] = useState(ticket.analystComment ?? '');
  const [reportFile, setReportFile] = useState<TicketAttachment | null>(ticket.analystReport ?? null);
  const [status, setStatus] = useState<TicketStatus>(ticket.status === 'pending' ? 'in_review' : ticket.status);

  const [sendEmail, setSendEmail] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [chatMessage, setChatMessage] = useState('');
  const reportFileRef = useRef<HTMLInputElement>(null);

  // Synchronize status whenever ticket prop updates
  useEffect(() => {
    if (ticket.status === 'resolved' || ticket.userAcknowledged) {
      setStatus('resolved');
    } else if (ticket.status === 'in_review') {
      setStatus('in_review');
    } else if (ticket.status === 'analyzed') {
      setStatus('analyzed');
    } else if (ticket.status === 'pending') {
      setStatus('in_review');
    }
  }, [ticket.status, ticket.userAcknowledged]);

  const handleReportFile = useCallback(async (file: File) => {
    const att = await fileToAttachment(file);
    setReportFile(att);
  }, []);

  async function handleSend() {
    if (status !== 'in_review' && status !== 'resolved' && !analystComment.trim()) {
      setError('Please write an investigation comment.');
      return;
    }
    setError('');
    setSending(true);
    await new Promise((r) => setTimeout(r, 600));

    const finalComment = analystComment.trim() || (status === 'in_review' ? (ticket.analystComment || 'Case is actively being investigated by the SOC team.') : ticket.analystComment || '');

    const isUserResolved = ticket.status === 'resolved' || ticket.userAcknowledged;
    const effectiveStatus: TicketStatus = (status === 'resolved' && !isUserResolved) ? 'analyzed' : status;

    // Save in portal store & Supabase
    onRespond(ticket.id, {
      analystComment: finalComment,
      analystReport: reportFile,
      status: effectiveStatus,
    });

    if (sendEmail && status === 'analyzed') {
      sendEmailToUser(ticket, finalComment, reportFile);
    }

    setSending(false);
    setSent(true);
    setTimeout(onClose, 1200);
  }

  const handleSendChatMessage = () => {
    if (!chatMessage.trim()) return;
    addTicketMessage(ticket.id, {
      sender: 'analyst',
      senderEmail: currentUser?.email || 'sentinelx.analyst@gmail.com',
      senderName: 'SOC Analyst',
      message: chatMessage.trim(),
    });
    setChatMessage('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-3xl overflow-hidden animate-slide-up flex flex-col max-h-[92vh]"
        style={{
          background: 'linear-gradient(145deg, #0d1118, #0a0c14)',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 32px 80px rgba(0,0,0,0.85)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal header */}
        <div
          className="flex items-center justify-between px-6 py-4 shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)' }}
            >
              <Inbox className="w-4.5 h-4.5 text-violet-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-black text-white font-mono">{ticket.id}</p>
                <StatusBadge status={status} />
              </div>
              <p className="text-[11px] text-gray-500">{formatDate(ticket.submittedAt)} • From: {ticket.userEmail}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => sendEmailToUser(ticket, analystComment, reportFile)}
              title={`Compose email to ${ticket.userEmail}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold text-purple-300 hover:text-white bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition-all"
            >
              <Mail className="w-3.5 h-3.5" /> Launch Gmail
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto scrollbar-thin flex-1 px-6 py-5 space-y-5">
          {/* Submission metadata */}
          <div
            className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {[
              { icon: User, label: 'User Email', value: ticket.userEmail },
              { icon: Hash, label: 'Case ID', value: ticket.id },
              { icon: Calendar, label: 'Submitted', value: formatDate(ticket.submittedAt) },
              { icon: FileText, label: 'Attached File', value: ticket.emlFile?.name ?? 'None' },
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

          {/* User Notes */}
          {ticket.userComment && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" /> User Provided Notes
              </label>
              <p
                className="text-sm text-gray-300 leading-relaxed p-3 rounded-xl font-mono text-xs"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                {ticket.userComment}
              </p>
            </div>
          )}

          {/* User Interaction Flags */}
          {ticket.didInteract && (ticket.didInteract.clickedLink || ticket.didInteract.enteredCreds) && (
            <div
              className="p-3.5 rounded-xl flex items-center gap-3"
              style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
            >
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-red-300">High Risk Interaction Reported by User!</p>
                <p className="text-xs text-red-200/80 mt-0.5">
                  User indicated: {ticket.didInteract.clickedLink ? '• Clicked Embedded Link ' : ''}
                  {ticket.didInteract.enteredCreds ? '• Submitted Credentials / Passwords' : ''}
                </p>
              </div>
            </div>
          )}


          {/* EML download */}
          {ticket.emlFile && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3 h-3" /> Submitted .eml File
              </label>
              <button
                onClick={() => downloadAttachment(ticket.emlFile!.data, ticket.emlFile!.name)}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm text-blue-300 font-semibold transition-all hover:text-blue-200 w-full"
                style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}
              >
                <Download className="w-4 h-4" />
                <span className="truncate">{ticket.emlFile.name}</span>
                <span className="text-[11px] text-gray-500 font-normal ml-auto font-mono">{formatBytes(ticket.emlFile.size)}</span>
              </button>
            </div>
          )}

          {/* Analyst response form */}
          <div
            className="space-y-4 pt-3 border-t"
            style={{ borderColor: 'rgba(255,255,255,0.07)' }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-violet-400" />
                Analyst Response & Findings
              </p>
              <span className="text-[11px] text-gray-500 font-mono">Recipient: {ticket.userEmail}</span>
            </div>

            {/* Comment textarea */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">
                Forensic Analysis & Findings
              </label>
              <textarea
                value={analystComment}
                onChange={(e) => setAnalystComment(e.target.value)}
                rows={4}
                placeholder={`Provide your forensic findings, header analysis, and security advice for ${ticket.userEmail}...`}
                className="w-full text-xs rounded-xl p-3 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-violet-500 resize-none font-mono"
                style={{
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              />
            </div>

            {/* Report file upload */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-wider">
                Attach Forensic Report (.pdf / .txt / .json)
              </label>
              <input
                ref={reportFileRef}
                type="file"
                className="hidden"
                accept=".pdf,.txt,.json,.doc,.docx"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f) await handleReportFile(f);
                }}
              />
              {reportFile ? (
                <div
                  className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-mono"
                  style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)', color: '#4ade80' }}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-4 h-4 shrink-0" />
                    <span className="truncate">{reportFile.name}</span>
                    <span className="text-[10px] text-gray-500">({formatBytes(reportFile.size)})</span>
                  </div>
                  <button
                    onClick={() => setReportFile(null)}
                    className="text-gray-400 hover:text-red-400 ml-2"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => reportFileRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-white/15 text-xs text-gray-400 hover:text-white hover:border-violet-500/50 transition-all font-mono"
                >
                  <Upload className="w-3.5 h-3.5 text-gray-500" />
                  Click to attach analysis dossier or PDF
                </button>
              )}
            </div>

            {/* Status progression buttons */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider">Set Ticket Status:</p>
              <div className="flex gap-2 flex-wrap items-center">
                {(['in_review', 'analyzed'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setStatus(s);
                      setError('');
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all capitalize"
                    style={
                      status === s
                        ? s === 'analyzed'
                          ? { background: 'rgba(34,197,94,0.2)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.4)' }
                          : { background: 'rgba(6,182,212,0.2)', color: '#22d3ee', border: '1px solid rgba(6,182,212,0.4)' }
                        : { background: 'rgba(255,255,255,0.05)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.08)' }
                    }
                  >
                    {s === 'in_review' ? 'In Investigation' : 'Analyzed'}
                  </button>
                ))}

                {/* Resolved button — locked for analyst; only user can mark resolved */}
                <div
                  title={
                    ticket.userAcknowledged || ticket.status === 'resolved'
                      ? 'Case confirmed and marked resolved by user.'
                      : 'Locked for analyst: Only the user can confirm resolution and close this case.'
                  }
                  className="inline-flex items-center"
                >
                  <button
                    type="button"
                    disabled
                    className="px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all flex items-center gap-1.5 cursor-not-allowed select-none"
                    style={
                      ticket.userAcknowledged || ticket.status === 'resolved'
                        ? { background: 'rgba(168,85,247,0.25)', color: '#c084fc', border: '1px solid rgba(168,85,247,0.45)' }
                        : { background: 'rgba(255,255,255,0.03)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)', opacity: 0.7 }
                    }
                  >
                    {ticket.userAcknowledged || ticket.status === 'resolved' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                        <span>✓ Resolved by User</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3 text-gray-500" />
                        <span>Resolved</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-gray-400 font-normal">User Only</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Threaded Discussion (Shown while In Review / Pending) OR Review (Shown once Analyzed / Resolved) */}
            {status !== 'analyzed' && status !== 'resolved' && ticket.status !== 'analyzed' && ticket.status !== 'resolved' ? (
              <div className="pt-2 border-t border-white/5 space-y-2">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3" /> Live Ticket Messages
                </p>
                {ticket.threadMessages && ticket.threadMessages.length > 0 && (
                  <div className="flex flex-col space-y-2 max-h-40 overflow-y-auto pr-1">
                    {ticket.threadMessages.map((msg) => {
                      const isAnalyst = msg.sender === 'analyst';
                      return (
                        <div
                          key={msg.id}
                          className={`p-2.5 rounded-xl text-xs w-[40%] min-w-[220px] ${
                            isAnalyst
                              ? 'ml-auto bg-purple-950/40 border border-purple-500/25 text-purple-100'
                              : 'mr-auto bg-white/[0.04] border border-white/10 text-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 text-[10px] text-gray-400 font-mono mb-1">
                            <span className="font-semibold truncate" title={isAnalyst ? '🛡️ You (Analyst)' : `👤 User (${ticket.userEmail})`}>
                              {isAnalyst ? '🛡️ You (Analyst)' : `👤 User (${ticket.userEmail})`}
                            </span>
                            <span className="text-gray-500 shrink-0 text-[9px]">{formatDate(msg.timestamp)}</span>
                          </div>
                          <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                    placeholder="Post quick update in user's ticket thread..."
                    className="flex-1 text-xs rounded-xl px-3 py-2 text-gray-100 placeholder-gray-500 font-mono"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)' }}
                  />
                  <button
                    type="button"
                    onClick={handleSendChatMessage}
                    disabled={!chatMessage.trim()}
                    className="px-3 py-2 rounded-xl text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 disabled:opacity-40 font-mono"
                  >
                    Post
                  </button>
                </div>
              </div>
            ) : (
              /* User Review Section (Matching user side) */
              <div className="pt-2 border-t border-white/5">
                {ticket.userAcknowledged || ticket.status === 'resolved' ? (
                  <div
                    className="p-4 rounded-2xl flex items-center justify-between"
                    style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)' }}
                  >
                    <div>
                      <p className="text-xs font-bold text-purple-300 font-mono flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" /> Case Resolved by User
                      </p>
                      {ticket.userFeedback ? (
                        <p className="text-xs text-gray-200 mt-1 italic">"{ticket.userFeedback}"</p>
                      ) : (
                        <p className="text-xs text-gray-400 mt-1 italic">User acknowledged resolution and marked case complete.</p>
                      )}
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
                ) : (
                  <div
                    className="p-4 rounded-2xl flex items-center justify-between"
                    style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-emerald-300 font-mono">Analysis Published — Awaiting User Review</p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          User review and resolution feedback will appear here once submitted.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Dispatch Gmail / Portal Notification Checkbox */}
            {status === 'analyzed' && (
              <label className="flex items-center gap-3 p-3 rounded-xl cursor-pointer select-none transition-all duration-150 border bg-white/[0.02] border-white/10 hover:bg-white/[0.04] hover:border-purple-500/30">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-600 text-purple-600 focus:ring-purple-500 bg-black/40 accent-purple-600 cursor-pointer"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-purple-400" />
                    <span className="text-xs font-bold text-gray-200 font-mono">
                      Dispatch findings via Gmail to {ticket.userEmail}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-0.5 font-mono">
                    {sendEmail
                      ? 'Pre-composes forensic report in Gmail draft & updates user portal'
                      : 'Saves findings directly to user portal without dispatching email'}
                  </p>
                </div>
              </label>
            )}

            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400">
                <AlertTriangle className="w-3.5 h-3.5" />
                {error}
              </div>
            )}

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={sending || sent}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 disabled:opacity-50 font-mono"
              style={{
                background: sent
                  ? 'linear-gradient(135deg, #059669, #047857)'
                  : status === 'in_review'
                    ? 'linear-gradient(135deg, #0284c7, #0369a1)'
                    : status === 'resolved'
                      ? 'linear-gradient(135deg, #7c3aed, #6d28d9)'
                      : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                boxShadow: status === 'in_review'
                  ? '0 4px 20px rgba(2,132,199,0.35)'
                  : '0 4px 20px rgba(124,58,237,0.35)',
              }}
            >
              {sent ? (
                <><CheckCircle2 className="w-4 h-4" /> {status === 'in_review' ? 'Case Moved to In Review!' : status === 'resolved' ? 'Ticket Closed & Saved!' : 'Findings Saved & Synced!'}</>
              ) : sending ? (
                <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Updating…</>
              ) : status === 'in_review' ? (
                <><Clock className="w-4 h-4" /> Update Status to In Review</>
              ) : status === 'resolved' ? (
                <><CheckCircle2 className="w-4 h-4" /> Save Ticket Changes</>
              ) : (
                <><Send className="w-4 h-4" /> {sendEmail ? `Save Findings & Dispatch Email` : 'Save Findings to User Portal'}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════ */
export function UserRequestsPage({ onNavigate: _onNavigate }: UserRequestsPageProps) {
  const { tickets, respondToTicket } = useTickets();
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'in_review' | 'analyzed' | 'resolved'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

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

  // Keep modal ticket state updated when new messages or updates arrive
  useEffect(() => {
    if (selectedTicket) {
      const refreshed = tickets.find((t) => t.id === selectedTicket.id);
      if (refreshed && (
        refreshed.status !== selectedTicket.status ||
        (refreshed.threadMessages?.length || 0) !== (selectedTicket.threadMessages?.length || 0) ||
        refreshed.respondedAt !== selectedTicket.respondedAt ||
        refreshed.userAcknowledged !== selectedTicket.userAcknowledged ||
        refreshed.userFeedback !== selectedTicket.userFeedback ||
        refreshed.userRating !== selectedTicket.userRating
      )) {
        setSelectedTicket(refreshed);
      }
    }
  }, [tickets, selectedTicket]);

  const filtered = tickets.filter((t) => {
    const matchesStatus = filterStatus === 'all'
      || t.status === filterStatus
      || (filterStatus === 'resolved' && (t.status === 'resolved' || t.status === 'closed'));
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q
      || t.id.toLowerCase().includes(q)
      || t.userEmail.toLowerCase().includes(q)
      || (t.emlFile?.name && t.emlFile.name.toLowerCase().includes(q))
      || t.userComment.toLowerCase().includes(q)
      || (t.verdict && t.verdict.toLowerCase().includes(q));
    return matchesStatus && matchesSearch;
  });

  const pending = tickets.filter((t) => t.status === 'pending').length;
  const inReview = tickets.filter((t) => t.status === 'in_review').length;
  const analyzed = tickets.filter((t) => t.status === 'analyzed').length;
  const resolved = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed').length;

  return (
    <div className="space-y-6 pb-10 animate-fade-in">
      {/* Toast banner */}
      {toastMessage && (
        <div
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border animate-slide-up"
          style={{ background: '#0f121d', borderColor: 'rgba(168,85,247,0.4)', color: '#e9d5ff' }}
        >
          <Mail className="w-4 h-4 text-purple-400 shrink-0" />
          <span className="text-xs font-mono font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-white ml-2">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)' }}
            >
              <Inbox className="w-4.5 h-4.5 text-violet-400" />
            </div>
            <h1 className="text-2xl font-black text-white">User Requests & Triage</h1>
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
            Investigate suspicious emails reported by end-users, publish forensic verdicts, and provide mitigation instructions.
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl">
        {[
          { label: 'Total In Queue', value: tickets.length, color: 'text-violet-400', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)' },
          { label: 'Pending Review', value: pending, color: 'text-amber-400', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
          { label: 'In Investigation', value: inReview, color: 'text-cyan-400', bg: 'rgba(6,182,212,0.08)', border: 'rgba(6,182,212,0.2)' },
          { label: 'Resolved / Closed', value: resolved, color: 'text-purple-400', bg: 'rgba(168,85,247,0.08)', border: 'rgba(168,85,247,0.2)' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl px-4 py-3 text-center" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-gray-400 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter and Search */}
      <div className="flex items-center gap-3 flex-wrap">
        <div
          className="h-10 flex items-center gap-1 p-1 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Filter className="w-3.5 h-3.5 text-gray-500 ml-2 mr-1" />
          {(['all', 'pending', 'in_review', 'analyzed', 'resolved'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className="h-8 px-3.5 rounded-lg text-xs font-bold capitalize transition-all font-mono"
              style={
                filterStatus === s
                  ? { background: 'rgba(139,92,246,0.25)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.4)' }
                  : { color: '#6b7280', border: '1px solid transparent' }
              }
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div
          className="h-10 flex-1 min-w-[200px] flex items-center gap-2.5 px-3.5 rounded-xl"
          style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Search className="w-4 h-4 text-gray-500 shrink-0" />
          <input
            type="text"
            placeholder="Search by case ID, user email, filename, or verdict..."
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
          <Inbox className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-sm font-bold text-gray-400">No requests found</p>
          <p className="text-xs text-gray-600 mt-1">No user requests match the active filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => setSelectedTicket(ticket)}
              className="rounded-2xl p-4 transition-all duration-200 hover:scale-[1.005] cursor-pointer group"
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
                      <CheckCircle2 className="w-5 h-5 text-purple-400" />
                    ) : ticket.status === 'analyzed' ? (
                      <CheckCircle2 className="w-5 h-5 text-green-400" />
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
                      <span className="text-[11px] font-mono text-gray-400 font-bold">
                        {ticket.userEmail}
                      </span>
                      {ticket.verdict && (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-white/5 text-gray-300">
                          {ticket.verdict}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-gray-300 mt-1 truncate">
                      {ticket.userComment || (ticket.emlFile ? `Attachment: ${ticket.emlFile.name}` : 'No comment')}
                    </p>

                    <div className="flex items-center gap-4 mt-2 text-[11px] text-gray-500 flex-wrap font-mono">
                      <span>Submitted: {formatDate(ticket.submittedAt)}</span>
                      {ticket.emlFile && <span>• {ticket.emlFile.name}</span>}
                      {ticket.threadMessages && ticket.threadMessages.length > 0 && (
                        <span>• {ticket.threadMessages.length} message(s)</span>
                      )}
                      {ticket.userAcknowledged && (
                        <span className="text-purple-400 font-bold">• User Confirmed Resolved</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-center">
                  <span className="text-xs text-violet-400 group-hover:text-violet-300 transition-colors font-mono">
                    Investigate →
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedTicket && (
        <TicketModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onRespond={(id, data) => respondToTicket(id, data)}
        />
      )}
    </div>
  );
}
