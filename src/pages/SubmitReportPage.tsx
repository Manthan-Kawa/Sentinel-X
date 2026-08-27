import { useState, useRef, useCallback } from 'react';
import {
  Upload, FileText, ChevronDown, ChevronUp, CheckCircle2,
  Mail, AlertTriangle, HelpCircle, Send, X, Paperclip,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useTickets, type TicketAttachment } from '@/contexts/TicketContext';

interface SubmitReportPageProps {
  onNavigate: (id: string) => void;
}

/* ── EML export instructions ─────────────────────────────────────── */
const EML_INSTRUCTIONS = [
  {
    client: 'Gmail',
    icon: '📧',
    color: 'text-red-400',
    border: 'border-red-500/20',
    bg: 'rgba(239,68,68,0.05)',
    steps: [
      'Open the suspicious email in Gmail.',
      'Click the three-dot menu (⋮) in the top-right of the email.',
      'Select "Download message".',
      'The file will download as a .eml file.',
    ],
  },
  {
    client: 'Outlook (Desktop)',
    icon: '📨',
    color: 'text-blue-400',
    border: 'border-blue-500/20',
    bg: 'rgba(59,130,246,0.05)',
    steps: [
      'Open the suspicious email in Outlook.',
      'Go to File → Save As.',
      'In the "Save as type" dropdown, choose "Outlook Message Format - Unicode (*.msg)" or drag the email from the message list to your desktop.',
      'For .eml specifically: drag and drop the email from the inbox list to your Desktop.',
    ],
  },
  {
    client: 'Outlook Web (OWA)',
    icon: '🌐',
    color: 'text-cyan-400',
    border: 'border-cyan-500/20',
    bg: 'rgba(6,182,212,0.05)',
    steps: [
      'Open the suspicious email.',
      'Click the three-dot menu (…) at the top of the email.',
      'Choose "View message source" or "Download" (availability varies by version).',
      'Copy the raw source and save it with a .eml extension, or use the download option if available.',
    ],
  },
  {
    client: 'Apple Mail',
    icon: '🍎',
    color: 'text-gray-300',
    border: 'border-gray-500/20',
    bg: 'rgba(156,163,175,0.05)',
    steps: [
      'Open the suspicious email in Apple Mail.',
      'Go to File → Save As.',
      'In the format dropdown, choose "Raw Message Source".',
      'Save the file — it will be in .eml format.',
    ],
  },
  {
    client: 'Thunderbird',
    icon: '⚡',
    color: 'text-amber-400',
    border: 'border-amber-500/20',
    bg: 'rgba(245,158,11,0.05)',
    steps: [
      'Open the suspicious email in Thunderbird.',
      'Go to File → Save As → File.',
      'Change the file extension to .eml if needed.',
      'Click Save.',
    ],
  },
];

/* ── Helpers ─────────────────────────────────────────────────────── */
function fileToAttachment(file: File): Promise<TicketAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({
        name: file.name,
        data: reader.result as string,
        type: file.type || 'message/rfc822',
        size: file.size,
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ══════════════════════════════════════════════════════════════════ */
export function SubmitReportPage({ onNavigate }: SubmitReportPageProps) {
  const { currentUser } = useAuth();
  const { submitTicket } = useTickets();

  const [emlFile, setEmlFile] = useState<TicketAttachment | null>(null);
  const [dragging, setDragging] = useState(false);
  const [comment, setComment] = useState('');
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<{ caseId: string } | null>(null);
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.eml')) {
      setError('Please upload a .eml file.');
      return;
    }
    setError('');
    const att = await fileToAttachment(file);
    setEmlFile(att);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) await handleFile(file);
  }, [handleFile]);

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await handleFile(file);
  };

  async function handleSubmit() {
    if (!emlFile) { setError('Please attach a .eml file before submitting.'); return; }
    if (!currentUser) { setError('You must be logged in.'); return; }
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800)); // Simulated async
    const caseId = submitTicket({
      userEmail: currentUser.email,
      userComment: comment.trim(),
      emlFile,
    });
    setSubmitted({ caseId });
    setSubmitting(false);
  }

  /* ── Success screen ── */
  if (submitted) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-6 animate-fade-in px-4">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center"
          style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)', boxShadow: '0 0 40px rgba(34,197,94,0.15)' }}
        >
          <CheckCircle2 className="w-10 h-10 text-green-400" />
        </div>
        <div className="text-center">
          <h2 className="text-2xl font-black text-white mb-2">Report Submitted!</h2>
          <p className="text-gray-400 text-sm">Your report has been received and is pending analyst review.</p>
        </div>
        <div
          className="px-6 py-4 rounded-2xl text-center"
          style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}
        >
          <p className="text-xs text-gray-400 font-mono mb-1">Case ID</p>
          <p className="text-xl font-black text-green-400 font-mono">{submitted.caseId}</p>
        </div>
        <p className="text-xs text-gray-500 text-center max-w-sm">
          You will be notified when an analyst has reviewed your submission. Track the status in Check Status.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => { setSubmitted(null); setEmlFile(null); setComment(''); }}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-gray-300 transition-all hover:text-white"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            Submit Another
          </button>
          <button
            onClick={() => onNavigate('check-status')}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #059669, #047857)', boxShadow: '0 4px 20px rgba(5,150,105,0.3)' }}
          >
            Check Status
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-10 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(59,130,246,0.25)' }}
          >
            <Upload className="w-4.5 h-4.5 text-blue-400" />
          </div>
          <h1 className="text-2xl font-black text-white">Submit a Report</h1>
        </div>
        <p className="text-gray-400 text-sm">
          Upload a suspicious .eml email file for our security analysts to investigate.
        </p>
      </div>

      {/* EML Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !emlFile && fileInputRef.current?.click()}
        className="relative rounded-2xl transition-all duration-200 cursor-pointer"
        style={{
          border: dragging
            ? '2px dashed rgba(59,130,246,0.7)'
            : emlFile
            ? '2px solid rgba(34,197,94,0.4)'
            : '2px dashed rgba(255,255,255,0.15)',
          background: dragging
            ? 'rgba(59,130,246,0.06)'
            : emlFile
            ? 'rgba(34,197,94,0.04)'
            : 'rgba(255,255,255,0.02)',
          boxShadow: dragging ? '0 0 30px rgba(59,130,246,0.12)' : 'none',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".eml,.EML,message/rfc822"
          className="hidden"
          onChange={handleInputChange}
        />

        {emlFile ? (
          /* File attached */
          <div className="p-6 flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)' }}
            >
              <FileText className="w-6 h-6 text-green-400" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white font-mono truncate">{emlFile.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{formatBytes(emlFile.size)} · .eml</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setEmlFile(null); }}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          /* Drop prompt */
          <div className="p-12 flex flex-col items-center gap-3 text-center">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <Paperclip className="w-7 h-7 text-gray-500" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Drop your .eml file here</p>
              <p className="text-gray-500 text-xs mt-1">or click to browse</p>
            </div>
            <span
              className="px-3 py-1 rounded-full text-[10px] font-mono font-bold text-blue-400"
              style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}
            >
              .EML files only
            </span>
          </div>
        )}
      </div>

      {error && (
        <div
          className="flex items-center gap-2.5 px-4 py-3 rounded-xl"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
        >
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* How to export .eml — collapsible instructions */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.02)' }}
      >
        <div className="px-5 py-3 flex items-center gap-2 border-b border-white/5">
          <HelpCircle className="w-4 h-4 text-gray-400" />
          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono">
            How to export a .eml file
          </span>
        </div>
        <div className="divide-y divide-white/[0.05]">
          {EML_INSTRUCTIONS.map((client) => {
            const open = expandedClient === client.client;
            return (
              <div key={client.client}>
                <button
                  onClick={() => setExpandedClient(open ? null : client.client)}
                  className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.03] transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{client.icon}</span>
                    <span className={`text-sm font-semibold ${client.color}`}>{client.client}</span>
                  </div>
                  {open ? (
                    <ChevronUp className="w-4 h-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  )}
                </button>
                {open && (
                  <div
                    className="px-5 pb-4 animate-fade-in"
                    style={{ background: client.bg }}
                  >
                    <ol className="space-y-2 mt-1">
                      {client.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-3">
                          <span
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                            style={{ background: 'rgba(255,255,255,0.08)', color: '#9ca3af' }}
                          >
                            {i + 1}
                          </span>
                          <p className="text-xs text-gray-300 leading-relaxed">{step}</p>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Comment / Notes */}
      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-300 uppercase tracking-wider font-mono flex items-center gap-2">
          <Mail className="w-3.5 h-3.5 text-gray-400" />
          Additional Notes (optional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Describe any suspicious behaviour, why you think this email is malicious, any context that may help the analyst…"
          rows={4}
          className="w-full px-4 py-3 rounded-xl text-sm text-gray-200 placeholder-gray-600 focus:outline-none resize-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
          onFocus={(e) => { e.currentTarget.style.border = '1px solid rgba(59,130,246,0.5)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.08)'; }}
          onBlur={(e) => { e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)'; e.currentTarget.style.boxShadow = 'none'; }}
        />
        <p className="text-[11px] text-gray-600">{comment.length} characters</p>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={submitting || !emlFile}
        className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-white font-bold text-sm transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-[0.98]"
        style={{
          background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #7c3aed 100%)',
          boxShadow: emlFile ? '0 6px 28px rgba(99,102,241,0.4)' : 'none',
        }}
      >
        {submitting ? (
          <>
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Submitting…
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Submit Report
          </>
        )}
      </button>
    </div>
  );
}
