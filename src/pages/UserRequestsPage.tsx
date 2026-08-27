import { useState, useRef, useCallback } from 'react';
import {
  Inbox, Clock, CheckCircle2, Download, Upload, X, ChevronRight,
  MessageSquare, FileText, User, Calendar, Hash, Send, AlertTriangle,
  Filter, Search, Mail, ExternalLink, ShieldCheck,
} from 'lucide-react';
import { useTickets, type Ticket, type TicketAttachment } from '@/contexts/TicketContext';

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

  // Auto-download the attached PDF report file so it is ready on the analyst's machine to attach in Gmail
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
Please log in to your Sentinel-X portal under "Check Status" to view full telemetry details and download the complete forensic dossier.

Regards,
SENTINEL-X Cyber Defense Operations
Security Operations Center (SOC)`;

  // Copy rich HTML with bold styling to clipboard for instant pasting
  const richHtml = `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #222; line-height: 1.6;">
<p>Dear User,</p>
<p>The <b>Security Operations Center (SOC)</b> team has analyzed your suspicious email submission (<b>${ticket.id}</b>).</p>
<hr style="border: 0; border-top: 1px solid #ccc; margin: 15px 0;" />
<p><b>CASE SUMMARY:</b></p>
<ul style="margin: 5px 0 15px 20px; padding: 0;">
  <li><b>Case Number:</b> ${ticket.id}</li>
  <li><b>Submitted At:</b> ${formatDate(ticket.submittedAt)}</li>
  <li><b>Status:</b> <span style="color: #16a34a; font-weight: bold;">ANALYZED & RESOLVED</span></li>
  ${ticket.emlFile ? `<li><b>Original File:</b> ${ticket.emlFile.name}</li>` : ''}
</ul>
<hr style="border: 0; border-top: 1px solid #ccc; margin: 15px 0;" />
<p><b>ANALYST INVESTIGATION FINDINGS:</b></p>
<div style="background: #f4f4f5; padding: 12px; border-left: 4px solid #7c3aed; border-radius: 4px; margin: 10px 0;">
  <p style="margin: 0; white-space: pre-wrap;">${comment}</p>
</div>
${reportObj ? `<p><b>Attached Investigation Report:</b> ${reportObj.name}<br /><i style="color: #666; font-size: 12px;">(Available for instant download in your Sentinel-X Check Status portal)</i></p>` : ''}
<p><b>SECURITY RECOMMENDATION:</b></p>
<p>Please log in to your Sentinel-X portal under <b>"Check Status"</b> to view full telemetry details and download the complete forensic dossier.</p>
<p style="margin-top: 20px;">Regards,<br /><b>SENTINEL-X Cyber Defense Operations</b><br />Security Operations Center (SOC)</p>
</div>`;

  try {
    if (navigator.clipboard && window.ClipboardItem) {
      const blobHtml = new Blob([richHtml], { type: 'text/html' });
      const blobText = new Blob([bodyText], { type: 'text/plain' });
      navigator.clipboard.write([new ClipboardItem({ 'text/html': blobHtml, 'text/plain': blobText })]);
    }
  } catch { /* ignore */ }

  // Opens directly in the browser's logged-in Gmail composer tab with prefilled fields
  const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(ticket.userEmail)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`;
  window.open(gmailUrl, '_blank');
}

/* ── Status Badge ─────────────────────────────────────────────── */
function StatusBadge({ status }: { status: Ticket['status'] }) {
  if (status === 'analyzed') {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono"
        style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}
      >
        <CheckCircle2 className="w-2.5 h-2.5" /> Analyzed
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold font-mono"
      style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.3)', color: '#fbbf24' }}
    >
      <Clock className="w-2.5 h-2.5 animate-pulse" /> Pending
    </span>
  );
}

/* ── Detail Modal ─────────────────────────────────────────────── */
interface ModalProps {
  ticket: Ticket;
  onClose: () => void;
  onRespond: (id: string, data: { analystComment: string; analystReport: TicketAttachment | null; status: Ticket['status'] }) => void;
}

function TicketModal({ ticket, onClose, onRespond }: ModalProps) {
  const [analystComment, setAnalystComment] = useState(ticket.analystComment ?? '');
  const [reportFile, setReportFile] = useState<TicketAttachment | null>(ticket.analystReport ?? null);
  const [status, setStatus] = useState<Ticket['status']>(ticket.status);
  const [sendEmail, setSendEmail] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const reportFileRef = useRef<HTMLInputElement>(null);

  const handleReportFile = useCallback(async (file: File) => {
    const att = await fileToAttachment(file);
    setReportFile(att);
  }, []);

  async function handleSend() {
    if (!analystComment.trim()) { setError('Please write a response comment.'); return; }
    setError('');
    setSending(true);
    await new Promise((r) => setTimeout(r, 600));

    // Save in portal store
    onRespond(ticket.id, { analystComment: analystComment.trim(), analystReport: reportFile, status: 'analyzed' });

    // If email dispatch is enabled, launch mailto to user email
    if (sendEmail) {
      sendEmailToUser(ticket, analystComment.trim(), reportFile);
    }

    setSending(false);
    setSent(true);
    setTimeout(onClose, 1400);
  }

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
              <p className="text-[11px] text-gray-500">{formatDate(ticket.submittedAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {ticket.status === 'analyzed' && (
              <button
                onClick={() => sendEmailToUser(ticket, analystComment, reportFile)}
                title={`Compose email to ${ticket.userEmail}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold text-purple-300 hover:text-white bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 transition-all"
              >
                <Mail className="w-3.5 h-3.5" /> Email User
              </button>
            )}
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
            className="grid grid-cols-2 gap-3 p-4 rounded-2xl"
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

          {/* User comment */}
          {ticket.userComment && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" /> User Notes
              </label>
              <p
                className="text-sm text-gray-300 leading-relaxed p-3 rounded-xl font-mono text-xs"
                style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
              >
                {ticket.userComment}
              </p>
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
                Investigation Comment / Verdict
              </label>
              <textarea
                value={analystComment}
                onChange={(e) => setAnalystComment(e.target.value)}
                rows={4}
                placeholder={`Provide your forensic findings, risk evaluation, and security advice for ${ticket.userEmail}...`}
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
                    className="text-gray-500 hover:text-red-400 transition-colors ml-2"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => reportFileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setDragging(false);
                    const f = e.dataTransfer.files[0];
                    if (f) await handleReportFile(f);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-xs font-mono text-gray-400 transition-all hover:text-gray-200"
                  style={{
                    border: dragging ? '2px dashed rgba(139,92,246,0.6)' : '2px dashed rgba(255,255,255,0.1)',
                    background: dragging ? 'rgba(139,92,246,0.06)' : 'rgba(255,255,255,0.02)',
                  }}
                >
                  <Upload className="w-4 h-4" />
                  Click or drag to attach investigation report
                </button>
              )}
            </div>

            {/* Email send checkbox */}
            <div
              className="flex items-center justify-between p-3.5 rounded-xl cursor-pointer"
              style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.25)' }}
              onClick={() => setSendEmail(!sendEmail)}
            >
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-0 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                />
                <div>
                  <p className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-purple-400" />
                    Dispatch findings email to {ticket.userEmail}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Sends an email with comments & report details directly to the requester.
                  </p>
                </div>
              </div>
            </div>

            {/* Status toggle */}
            <div className="flex items-center gap-3">
              <p className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider">Set Ticket Status:</p>
              {(['pending', 'analyzed'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all capitalize"
                  style={
                    status === s
                      ? s === 'analyzed'
                        ? { background: 'rgba(34,197,94,0.2)', color: '#4ade80', border: '1px solid rgba(34,197,94,0.4)' }
                        : { background: 'rgba(245,158,11,0.2)', color: '#fbbf24', border: '1px solid rgba(245,158,11,0.4)' }
                      : { background: 'rgba(255,255,255,0.05)', color: '#6b7280', border: '1px solid rgba(255,255,255,0.08)' }
                  }
                >
                  {s}
                </button>
              ))}
            </div>

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
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-white font-bold text-sm transition-all hover:opacity-90 disabled:opacity-50"
              style={{
                background: sent
                  ? 'linear-gradient(135deg, #059669, #047857)'
                  : 'linear-gradient(135deg, #7c3aed, #6d28d9)',
                boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
              }}
            >
              {sent ? (
                <><CheckCircle2 className="w-4 h-4" /> Response Saved & Dispatched to {ticket.userEmail}!</>
              ) : sending ? (
                <><span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> Dispatching…</>
              ) : (
                <><Send className="w-4 h-4" /> {sendEmail ? `Send Response & Email to ${ticket.userEmail}` : 'Save & Send to User Portal'}</>
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
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'analyzed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filtered = tickets.filter((t) => {
    const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = !q
      || t.id.toLowerCase().includes(q)
      || t.userEmail.toLowerCase().includes(q)
      || (t.emlFile?.name && t.emlFile.name.toLowerCase().includes(q))
      || t.userComment.toLowerCase().includes(q);
    return matchesStatus && matchesSearch;
  });

  const pending = tickets.filter((t) => t.status === 'pending').length;
  const analyzed = tickets.filter((t) => t.status === 'analyzed').length;

  const handleQuickEmail = (ticket: Ticket) => {
    sendEmailToUser(ticket);
    const hasReport = !!ticket.analystReport;
    setToastMessage(
      hasReport
        ? `Gmail opened & ${ticket.analystReport!.name} saved to Downloads for ${ticket.userEmail}!`
        : `Gmail composer opened for ${ticket.userEmail}!`
    );
    setTimeout(() => setToastMessage(null), 4500);
  };

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
            <h1 className="text-2xl font-black text-white">User Requests</h1>
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
            Review user-submitted report tickets, respond in-portal, and directly email forensic findings to users.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 max-w-md">
        {[
          { label: 'Total', value: tickets.length, color: 'text-violet-400', bg: 'rgba(139,92,246,0.08)', border: 'rgba(139,92,246,0.2)' },
          { label: 'Pending', value: pending, color: 'text-amber-400', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.2)' },
          { label: 'Analyzed', value: analyzed, color: 'text-green-400', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)' },
        ].map((s) => (
          <div key={s.label} className="rounded-xl px-4 py-3 text-center" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-[11px] text-gray-400 font-mono mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters & Search Toolbar */}
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
                  ? { background: 'rgba(139,92,246,0.25)', color: '#c4b5fd', border: '1px solid rgba(139,92,246,0.4)' }
                  : { color: '#6b7280', border: '1px solid transparent' }
              }
            >
              {s}
            </button>
          ))}
        </div>

        {/* Search bar */}
        <div
          className="h-10 flex items-center gap-2.5 px-3.5 rounded-xl flex-1 min-w-48 max-w-md"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          <Search className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by email, case ID, file name, or notes…"
            className="bg-transparent text-xs text-gray-200 placeholder-gray-500 focus:outline-none w-full font-mono"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-gray-500 hover:text-gray-300">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {tickets.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-24 gap-4 rounded-2xl"
          style={{ border: '1px dashed rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.01)' }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Inbox className="w-7 h-7 text-gray-600" />
          </div>
          <div className="text-center">
            <p className="text-white font-semibold">No user requests submitted yet</p>
            <p className="text-gray-500 text-sm mt-1">Incoming user report submissions will appear here.</p>
          </div>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-x-auto scrollbar-thin"
          style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.015)' }}
        >
          <div className="min-w-[820px]">
            {/* Table header */}
            <div
              className="grid gap-4 px-6 py-3.5 text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider items-center"
              style={{
                gridTemplateColumns: '150px minmax(180px, 1fr) 180px 110px 110px',
                borderBottom: '1px solid rgba(255,255,255,0.07)',
                background: 'rgba(255,255,255,0.02)',
              }}
            >
              <span>Case ID</span>
              <span>User Email</span>
              <span>Submitted</span>
              <span>Status</span>
              <span className="text-right">Actions</span>
            </div>

            {/* Rows */}
            {filtered.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500 font-mono">No results match your filter.</div>
            ) : (
              filtered.map((ticket) => (
                <div
                  key={ticket.id}
                  className="grid gap-4 px-6 py-4 items-center transition-all hover:bg-white/[0.03] border-b border-white/[0.05] last:border-0 cursor-pointer group"
                  style={{ gridTemplateColumns: '150px minmax(180px, 1fr) 180px 110px 110px' }}
                  onClick={() => setSelectedTicket(ticket)}
                >
                  {/* Case ID */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-white font-mono tracking-wide">{ticket.id}</span>
                  </div>

                  {/* User email */}
                  <div className="min-w-0 pr-2">
                    <p className="text-xs text-gray-200 truncate font-medium">{ticket.userEmail}</p>
                    {ticket.userComment ? (
                      <p className="text-[11px] text-gray-500 truncate mt-0.5 italic font-mono">
                        "{ticket.userComment}"
                      </p>
                    ) : ticket.emlFile ? (
                      <p className="text-[11px] text-gray-500 truncate mt-0.5 font-mono">
                        File: {ticket.emlFile.name}
                      </p>
                    ) : null}
                  </div>

                  {/* Submitted */}
                  <span className="text-xs text-gray-400 font-mono whitespace-nowrap">
                    {formatDate(ticket.submittedAt)}
                  </span>

                  {/* Status */}
                  <div className="flex items-center">
                    <StatusBadge status={ticket.status} />
                  </div>

                  {/* Actions */}
                  <div
                    className="flex items-center justify-end gap-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {/* Direct Email to User Button (Analyzed tickets only) */}
                    {ticket.status === 'analyzed' && (
                      <button
                        onClick={() => handleQuickEmail(ticket)}
                        title={`Direct Email to ${ticket.userEmail}`}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-purple-400 hover:text-white hover:bg-purple-500/20 transition-all border border-purple-500/20 hover:border-purple-500/40 shrink-0"
                        style={{ background: 'rgba(168,85,247,0.08)' }}
                      >
                        <Mail className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Download attached EML */}
                    {ticket.emlFile && (
                      <button
                        onClick={() => downloadAttachment(ticket.emlFile!.data, ticket.emlFile!.name)}
                        title={`Download original file: ${ticket.emlFile.name}`}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-blue-400 hover:text-white hover:bg-blue-500/20 transition-all border border-blue-500/20 hover:border-blue-500/40 shrink-0"
                        style={{ background: 'rgba(59,130,246,0.08)' }}
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Open details / triage modal */}
                    <button
                      onClick={() => setSelectedTicket(ticket)}
                      title="Open ticket investigation modal"
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-violet-400 hover:text-white hover:bg-violet-500/20 transition-all border border-violet-500/20 hover:border-violet-500/40 shrink-0"
                      style={{ background: 'rgba(139,92,246,0.08)' }}
                    >
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal */}
      {selectedTicket && (
        <TicketModal
          ticket={selectedTicket}
          onClose={() => setSelectedTicket(null)}
          onRespond={(id, data) => {
            respondToTicket(id, data);
            setSelectedTicket(null);
            setToastMessage(`Response recorded & dispatched to ${selectedTicket.userEmail}`);
            setTimeout(() => setToastMessage(null), 3500);
          }}
        />
      )}
    </div>
  );
}
