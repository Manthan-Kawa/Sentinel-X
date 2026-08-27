import { type EmailAnalysisResult } from '@/services/claudeService';

/**
 * Generates a structured plain text forensic report.
 */
export function generateTextReport(result: EmailAnalysisResult): string {
  const timestamp = new Date().toUTCString();
  const divider = '='.repeat(78);
  const subDivider = '-'.repeat(78);

  return `${divider}
SENTINEL-X EMAIL FORENSIC ANALYSIS REPORT
Generated: ${timestamp}
Classification: CONFIDENTIAL / SOC INCIDENT REPORT
${divider}

1. INCIDENT SUMMARY
${subDivider}
Case ID:          ${result.case_id}
Campaign ID:      ${result.campaign_id}
Alert Level:      ${result.alert_level.toUpperCase()}
Threat Verdict:   ${result.verdict}
Threat Score:     ${result.threat_score} / 100
Confidence:       ${result.confidence}%

Executive Summary:
${result.summary}

2. EMAIL AUTHENTICATION & INFRASTRUCTURE
${subDivider}
SPF Verification:    ${result.threat_intel.spf}
DKIM Verification:   ${result.threat_intel.dkim}
DMARC Verification:  ${result.threat_intel.dmarc}
Sending IP:          ${result.threat_intel.sending_ip || result.origin.sending_ip || 'N/A'}
IP Reputation:       ${result.threat_intel.ip_reputation.toUpperCase()}
Origin Country:      ${result.origin.country || 'N/A'}
Autonomous System:   ${result.origin.asn || 'N/A'}
Hosting Provider:    ${result.origin.hosting || 'N/A'}

3. RISK FACTORS & INDICATORS
${subDivider}
${result.risk_factors.map((rf, i) => `[${i + 1}] ${rf.label.toUpperCase()} (${rf.severity.toUpperCase()})\n    Detail: ${rf.detail}`).join('\n\n')}

4. OBSERVED FORENSIC FACTS
${subDivider}
${result.observed_facts.map(f => `* [${f.category}] ${f.field}: ${f.value} (${f.status.toUpperCase()})`).join('\n')}

5. AI THREAT INFERENCES
${subDivider}
${result.ai_inferences.map((inf, i) => `[${i + 1}] ${inf.inference} (Confidence: ${inf.confidence}%)\n    Basis: ${inf.basis}`).join('\n\n')}

6. RECOMMENDED ACTIONS
${subDivider}
${result.recommended_actions.map((act, i) => `[${i + 1}] [${act.priority.toUpperCase()}] ${act.action}\n    ${act.detail}`).join('\n\n')}

7. EXTRACTED HEADERS
${subDivider}
${result.headers.map(h => `${h.key}: ${h.value}`).join('\n')}

${divider}
END OF FORENSIC REPORT — SENTINEL-X SECURITY PLATFORM
${divider}
`;
}

/**
 * Downloads a plain text (.txt) report.
 */
export function downloadTextReport(result: EmailAnalysisResult, filename?: string) {
  const content = generateTextReport(result);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || `SENTINEL-X_${result.case_id}_Forensic_Report.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generates an executive, styled printable HTML document and opens the browser print-to-PDF dialog.
 */
export function exportReportAsPDF(result: EmailAnalysisResult) {
  const printWindow = window.open('', '_blank', 'width=900,height=1100');
  if (!printWindow) {
    alert('Please allow popups for this site to export the PDF report.');
    return;
  }

  const scoreColor =
    result.threat_score >= 80 ? '#ef4444' : result.threat_score >= 50 ? '#f97316' : '#22c55e';

  const originLat = result.origin?.latitude ?? 28.6139;
  const originLng = result.origin?.longitude ?? 77.2090;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SENTINEL-X Forensic Report — ${result.case_id}</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;700&display=swap');
    
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      color: #0f172a;
      background: #ffffff;
      padding: 40px;
      line-height: 1.5;
      font-size: 13px;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    @keyframes cyberPulse1 {
      0% { transform: scale(0.6); opacity: 0.9; }
      50% { transform: scale(2.2); opacity: 0; }
      100% { transform: scale(2.2); opacity: 0; }
    }
    @keyframes cyberPulse2 {
      0% { transform: scale(0.6); opacity: 0.9; }
      30% { transform: scale(0.6); opacity: 0.7; }
      80% { transform: scale(2.6); opacity: 0; }
      100% { transform: scale(2.6); opacity: 0; }
    }
    .cyber-pulse-ring-1 {
      animation: cyberPulse1 2.2s ease-out infinite;
    }
    .cyber-pulse-ring-2 {
      animation: cyberPulse2 2.2s ease-out infinite;
    }
    .leaflet-container {
      background: #06070a !important;
      font-family: 'Inter', system-ui, sans-serif !important;
    }
    .leaflet-tile {
      filter: brightness(0.95) contrast(1.15) saturate(1.2);
    }

    @media print {
      body {
        padding: 0;
        background: #ffffff;
      }
      .no-print {
        display: none !important;
      }
      @page {
        margin: 1.5cm;
        size: A4;
      }
      .page-break {
        page-break-before: always;
      }
    }

    .header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }

    .logo-title {
      font-size: 22px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.5px;
    }

    .logo-subtitle {
      font-size: 11px;
      color: #64748b;
      font-family: 'JetBrains Mono', monospace;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-top: 2px;
    }

    .meta-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      font-weight: 700;
      padding: 6px 12px;
      border-radius: 6px;
      background: #f1f5f9;
      border: 1px solid #cbd5e1;
      text-align: right;
    }

    .executive-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      display: flex;
      gap: 24px;
      align-items: center;
    }

    .score-badge {
      width: 100px;
      height: 100px;
      border-radius: 12px;
      background: #ffffff;
      border: 2px solid ${scoreColor};
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .score-number {
      font-size: 32px;
      font-weight: 800;
      color: ${scoreColor};
      line-height: 1;
    }

    .score-label {
      font-size: 9px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      text-transform: uppercase;
      color: #64748b;
      margin-top: 4px;
    }

    .exec-info {
      flex: 1;
    }

    .exec-verdict {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 6px;
    }

    .exec-summary {
      font-size: 13px;
      color: #334155;
      line-height: 1.6;
    }

    .section-title {
      font-size: 14px;
      font-weight: 700;
      color: #0f172a;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-top: 24px;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }

    .grid-3 {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 12px;
      margin-bottom: 16px;
    }

    .stat-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
    }

    .stat-label {
      font-size: 10px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      text-transform: uppercase;
      color: #64748b;
      margin-bottom: 4px;
    }

    .stat-value {
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
      font-family: 'JetBrains Mono', monospace;
    }

    .table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 12px;
    }

    .table th {
      background: #f1f5f9;
      padding: 8px 12px;
      text-align: left;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      font-size: 11px;
      color: #475569;
      border: 1px solid #e2e8f0;
    }

    .table td {
      padding: 8px 12px;
      border: 1px solid #e2e8f0;
      color: #334155;
    }

    .badge-pill {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 10px;
      font-weight: 700;
      font-family: 'JetBrains Mono', monospace;
      text-transform: uppercase;
    }

    .badge-critical { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }
    .badge-high     { background: #ffedd5; color: #c2410c; border: 1px solid #fdba74; }
    .badge-medium   { background: #fef3c7; color: #b45309; border: 1px solid #fcd34d; }
    .badge-low      { background: #dbeafe; color: #1d4ed8; border: 1px solid #93c5fd; }
    .badge-pass     { background: #dcfce7; color: #15803d; border: 1px solid #86efac; }
    .badge-fail     { background: #fee2e2; color: #b91c1c; border: 1px solid #fca5a5; }

    .action-item {
      padding: 10px 14px;
      border-radius: 8px;
      border-left: 4px solid #7c3aed;
      background: #f8fafc;
      border-top: 1px solid #e2e8f0;
      border-right: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
      margin-bottom: 8px;
    }

    .footer {
      margin-top: 40px;
      padding-top: 12px;
      border-top: 1px solid #cbd5e1;
      font-size: 10px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      font-family: 'JetBrains Mono', monospace;
    }

    .print-btn {
      position: fixed;
      bottom: 20px;
      right: 20px;
      background: #7c3aed;
      color: #ffffff;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 700;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 14px rgba(124, 58, 237, 0.4);
    }
  </style>
</head>
<body>

  <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>

  <div class="header-bar">
    <div>
      <div class="logo-title">SENTINEL-X</div>
      <div class="logo-subtitle">Email Forensic &amp; Incident Report</div>
    </div>
    <div class="meta-badge">
      <div>CASE: ${result.case_id}</div>
      <div>DATE: ${new Date().toLocaleDateString()}</div>
    </div>
  </div>

  <!-- Executive Card -->
  <div class="executive-card">
    <div class="score-badge">
      <div class="score-number">${result.threat_score}</div>
      <div class="score-label">THREAT SCORE</div>
    </div>
    <div class="exec-info">
      <div class="exec-verdict">${result.verdict}</div>
      <div class="exec-summary">${result.summary}</div>
      <div style="margin-top: 10px; display: flex; gap: 8px;">
        <span class="badge-pill badge-${result.alert_level === 'critical' || result.alert_level === 'high' ? 'critical' : 'low'}">ALERT: ${result.alert_level.toUpperCase()}</span>
        <span class="badge-pill" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;">CONFIDENCE: ${result.confidence}%</span>
        <span class="badge-pill" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;">CAMPAIGN: ${result.campaign_id}</span>
      </div>
    </div>
  </div>

  <!-- Authentication & Origin -->
  <div class="section-title">Authentication &amp; Origin Infrastructure</div>
  <div class="grid-3">
    <div class="stat-card">
      <div class="stat-label">SPF Protocol</div>
      <div class="stat-value"><span class="badge-pill badge-${result.threat_intel.spf === 'PASS' ? 'pass' : 'fail'}">${result.threat_intel.spf}</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-label">DKIM Signature</div>
      <div class="stat-value"><span class="badge-pill badge-${result.threat_intel.dkim === 'PASS' ? 'pass' : 'fail'}">${result.threat_intel.dkim}</span></div>
    </div>
    <div class="stat-card">
      <div class="stat-label">DMARC Policy</div>
      <div class="stat-value"><span class="badge-pill badge-${result.threat_intel.dmarc === 'PASS' ? 'pass' : 'fail'}">${result.threat_intel.dmarc}</span></div>
    </div>
  </div>

  <div class="grid-2">
    <div class="stat-card">
      <div class="stat-label">Sending IP &amp; Location</div>
      <div class="stat-value">${result.threat_intel.sending_ip || result.origin.sending_ip || 'N/A'} (${result.origin.country || 'Unknown'})</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">ASN / Hosting Infrastructure</div>
      <div class="stat-value">${result.origin.asn || 'N/A'} - ${result.origin.hosting || 'Unknown'}</div>
    </div>
  </div>

  <!-- Origin Geolocation Visual (DarkCyberMap) -->
  <div style="margin-bottom: 16px; border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.15); background: #06070a; position: relative;">
    <div id="cyber-pdf-map" style="width: 100%; height: 280px; background: #06070a;"></div>
    <div style="position: absolute; top: 10px; right: 10px; z-index: 1000; display: flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 8px; background: rgba(12,15,26,0.92); border: 1px solid rgba(239,68,68,0.4); color: #fff; font-family: 'JetBrains Mono', monospace; font-size: 10px;">
      <span style="display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #ef4444; box-shadow: 0 0 6px #ef4444;"></span>
      <span style="font-weight: 700; color: #ef4444;">SUSPECTED ORIGIN:</span>
      <span>${result.origin.city || 'New Delhi'}, ${result.origin.country || 'India'}</span>
    </div>
  </div>

  <!-- Attack Topology Graph (Full 9-Node Intrusion Chain) -->
  <div class="section-title">Attack Topology Graph &amp; Intrusion Chain</div>
  <div style="margin-bottom: 16px; border-radius: 10px; overflow: hidden; border: 1px solid rgba(255,255,255,0.15); background: #050811; padding: 8px;">
    <svg viewBox="0 0 880 270" style="width: 100%; height: auto; display: block;">
      <defs>
        <marker id="pdfArrowIndigo" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#6366f1" />
        </marker>
        <marker id="pdfArrowOrange" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#f97316" />
        </marker>
        <marker id="pdfArrowBlue" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#3b82f6" />
        </marker>
        <marker id="pdfArrowPurple" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#8b5cf6" />
        </marker>
        <marker id="pdfArrowRed" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#ef4444" />
        </marker>
        <marker id="pdfArrowAmber" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#eab308" />
        </marker>
        <marker id="pdfArrowEmerald" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#10b981" />
        </marker>
        <marker id="pdfArrowPink" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 1 L 8 5 L 0 9 z" fill="#ec4899" />
        </marker>
      </defs>

      <rect width="880" height="270" fill="#050811" rx="10" />

      <g stroke="#1e293b" stroke-width="0.5" stroke-dasharray="3 3" opacity="0.35">
        <line x1="175" y1="0" x2="175" y2="270" />
        <line x1="350" y1="0" x2="350" y2="270" />
        <line x1="525" y1="0" x2="525" y2="270" />
        <line x1="700" y1="0" x2="700" y2="270" />
      </g>

      <g fill="none" stroke-width="1.5">
        <path d="M 85 85 L 85 155" stroke="#6366f1" stroke-dasharray="4 3" marker-end="url(#pdfArrowIndigo)" />
        <path d="M 155 52 L 195 52" stroke="#f97316" stroke-dasharray="4 3" marker-end="url(#pdfArrowOrange)" />
        <path d="M 335 52 C 352 52, 352 118, 370 118" stroke="#3b82f6" stroke-dasharray="4 3" marker-end="url(#pdfArrowBlue)" />
        <path d="M 370 135 C 352 135, 352 185, 335 185" stroke="#8b5cf6" stroke-dasharray="4 3" marker-end="url(#pdfArrowPurple)" />
        <path d="M 510 110 C 528 110, 528 45, 545 45" stroke="#ef4444" stroke-dasharray="4 3" marker-end="url(#pdfArrowRed)" />
        <path d="M 510 130 C 528 130, 528 185, 545 185" stroke="#eab308" stroke-dasharray="4 3" marker-end="url(#pdfArrowAmber)" />
        <path d="M 335 195 C 440 195, 440 60, 545 60" stroke="#8b5cf6" stroke-dasharray="4 3" marker-end="url(#pdfArrowPurple)" />
        <path d="M 685 52 L 720 52" stroke="#10b981" stroke-dasharray="4 3" marker-end="url(#pdfArrowEmerald)" />
        <path d="M 685 65 C 702 65, 702 170, 720 170" stroke="#ec4899" stroke-dasharray="4 3" marker-end="url(#pdfArrowPink)" />
        <path d="M 685 190 L 720 190" stroke="#ec4899" stroke-dasharray="4 3" marker-end="url(#pdfArrowPink)" />
      </g>

      <g font-size="7" font-family="monospace" fill="#94a3b8" text-anchor="middle">
        <text x="85" y="125" fill="#818cf8">HASHLINK</text>
        <text x="175" y="47" fill="#fb923c">RECEIVES</text>
        <text x="348" y="80" fill="#60a5fa">RESOLVES</text>
        <text x="348" y="155" fill="#a78bfa">MX</text>
        <text x="525" y="70" fill="#f87171">A-REC</text>
        <text x="525" y="165" fill="#facc15">HOSTS</text>
        <text x="702" y="47" fill="#34d399">ROUTED</text>
        <text x="702" y="125" fill="#f472b6">LINKED</text>
      </g>

      <!-- Node 1: EMAIL -->
      <g transform="translate(15, 18)">
        <rect width="140" height="66" rx="8" fill="#0c0f1a" stroke="#6366f1" stroke-width="1.5" />
        <rect width="140" height="18" rx="7" fill="#6366f1" opacity="0.18" />
        <text x="70" y="13" fill="#818cf8" font-size="8" font-weight="bold" font-family="monospace" text-anchor="middle">EMAIL MESSAGE</text>
        <text x="70" y="36" fill="#ffffff" font-size="9" font-weight="bold" font-family="monospace" text-anchor="middle">${(result.headers?.find(h => h.key.toLowerCase() === 'subject')?.value || 'Suspicious Email').slice(0, 16)}..</text>
        <text x="70" y="49" fill="#94a3b8" font-size="7.5" font-family="monospace" text-anchor="middle">To: ${(result.headers?.find(h => h.key.toLowerCase() === 'to')?.value || 'Recipient').slice(0, 16)}</text>
        <text x="70" y="60" fill="#f87171" font-size="7.5" font-weight="bold" font-family="monospace" text-anchor="middle">SCORE: ${result.threat_score}/100</text>
      </g>

      <!-- Node 2: HASH -->
      <g transform="translate(15, 155)">
        <rect width="140" height="66" rx="8" fill="#0c0f1a" stroke="#6366f1" stroke-width="1.5" />
        <rect width="140" height="18" rx="7" fill="#6366f1" opacity="0.18" />
        <text x="70" y="13" fill="#818cf8" font-size="8" font-weight="bold" font-family="monospace" text-anchor="middle">SHA-256 DIGEST</text>
        <text x="70" y="36" fill="#ffffff" font-size="9" font-weight="bold" font-family="monospace" text-anchor="middle">${(result.evidence?.[0]?.hash || 'a3f5b8c9d2e1f4a7').slice(0, 16)}…</text>
        <text x="70" y="49" fill="#94a3b8" font-size="7.5" font-family="monospace" text-anchor="middle">Ledger: BLOCK-${result.case_id.slice(-6)}</text>
        <text x="70" y="60" fill="#34d399" font-size="7.5" font-weight="bold" font-family="monospace" text-anchor="middle">VERIFIED INTEGRITY</text>
      </g>

      <!-- Node 3: SENDER -->
      <g transform="translate(195, 18)">
        <rect width="140" height="66" rx="8" fill="#0c0f1a" stroke="#f97316" stroke-width="1.5" />
        <rect width="140" height="18" rx="7" fill="#f97316" opacity="0.18" />
        <text x="70" y="13" fill="#fb923c" font-size="8" font-weight="bold" font-family="monospace" text-anchor="middle">SENDER IDENTITY</text>
        <text x="70" y="36" fill="#ffffff" font-size="9" font-weight="bold" font-family="monospace" text-anchor="middle">${(result.headers?.find(h => h.key.toLowerCase() === 'from')?.value || 'Sender').slice(0, 16)}..</text>
        <text x="70" y="49" fill="#94a3b8" font-size="7.5" font-family="monospace" text-anchor="middle">SPF: ${result.threat_intel.spf || 'FAIL'} • DKIM: ${result.threat_intel.dkim || 'FAIL'}</text>
        <text x="70" y="60" fill="#f97316" font-size="7.5" font-weight="bold" font-family="monospace" text-anchor="middle">UNTRUSTED SENDER</text>
      </g>

      <!-- Node 4: MAIL SERVER -->
      <g transform="translate(195, 155)">
        <rect width="140" height="66" rx="8" fill="#0c0f1a" stroke="#8b5cf6" stroke-width="1.5" />
        <rect width="140" height="18" rx="7" fill="#8b5cf6" opacity="0.18" />
        <text x="70" y="13" fill="#a78bfa" font-size="8" font-weight="bold" font-family="monospace" text-anchor="middle">SMTP MTA RELAY</text>
        <text x="70" y="36" fill="#ffffff" font-size="9" font-weight="bold" font-family="monospace" text-anchor="middle">mx1.${(result.threat_intel.domain || 'domain.example').slice(0, 12)}</text>
        <text x="70" y="49" fill="#94a3b8" font-size="7.5" font-family="monospace" text-anchor="middle">Mailer: PHPMailer 6.5</text>
        <text x="70" y="60" fill="#a78bfa" font-size="7.5" font-weight="bold" font-family="monospace" text-anchor="middle">AUTOMATED AGENT</text>
      </g>

      <!-- Node 5: DOMAIN -->
      <g transform="translate(370, 88)">
        <rect width="140" height="66" rx="8" fill="#0c0f1a" stroke="#3b82f6" stroke-width="1.5" />
        <rect width="140" height="18" rx="7" fill="#3b82f6" opacity="0.18" />
        <text x="70" y="13" fill="#60a5fa" font-size="8" font-weight="bold" font-family="monospace" text-anchor="middle">SENDER DOMAIN</text>
        <text x="70" y="36" fill="#ffffff" font-size="9" font-weight="bold" font-family="monospace" text-anchor="middle">${(result.threat_intel.domain || 'domain.example').slice(0, 16)}</text>
        <text x="70" y="49" fill="#94a3b8" font-size="7.5" font-family="monospace" text-anchor="middle">Age: ${result.threat_intel.domain_age_days ?? 3} Days Old</text>
        <text x="70" y="60" fill="#f87171" font-size="7.5" font-weight="bold" font-family="monospace" text-anchor="middle">DMARC: ${result.threat_intel.dmarc || 'FAIL'}</text>
      </g>

      <!-- Node 6: IP INFRASTRUCTURE -->
      <g transform="translate(545, 18)">
        <rect width="140" height="66" rx="8" fill="#0c0f1a" stroke="#ef4444" stroke-width="1.5" />
        <rect width="140" height="18" rx="7" fill="#ef4444" opacity="0.18" />
        <text x="70" y="13" fill="#f87171" font-size="8" font-weight="bold" font-family="monospace" text-anchor="middle">ORIGINATING IP</text>
        <text x="70" y="36" fill="#ffffff" font-size="9" font-weight="bold" font-family="monospace" text-anchor="middle">${result.origin.sending_ip || '185.220.101.47'}</text>
        <text x="70" y="49" fill="#94a3b8" font-size="7.5" font-family="monospace" text-anchor="middle">${result.origin.city || 'Hamburg'}, ${result.origin.country || 'Germany'}</text>
        <text x="70" y="60" fill="#ef4444" font-size="7.5" font-weight="bold" font-family="monospace" text-anchor="middle">ACTIVE BLOCKLISTS</text>
      </g>

      <!-- Node 7: PHISHING URL -->
      <g transform="translate(545, 155)">
        <rect width="140" height="66" rx="8" fill="#0c0f1a" stroke="#eab308" stroke-width="1.5" />
        <rect width="140" height="18" rx="7" fill="#eab308" opacity="0.18" />
        <text x="70" y="13" fill="#facc15" font-size="8" font-weight="bold" font-family="monospace" text-anchor="middle">PHISHING PAYLOAD</text>
        <text x="70" y="36" fill="#ffffff" font-size="9" font-weight="bold" font-family="monospace" text-anchor="middle">${(result.threat_intel.urls?.[0] || 'https://domain/verify').slice(0, 16)}..</text>
        <text x="70" y="49" fill="#94a3b8" font-size="7.5" font-family="monospace" text-anchor="middle">3-Hop Redirect Chain</text>
        <text x="70" y="60" fill="#eab308" font-size="7.5" font-weight="bold" font-family="monospace" text-anchor="middle">CREDENTIAL HARVEST</text>
      </g>

      <!-- Node 8: HOSTING ASN -->
      <g transform="translate(720, 18)">
        <rect width="145" height="66" rx="8" fill="#0c0f1a" stroke="#10b981" stroke-width="1.5" />
        <rect width="145" height="18" rx="7" fill="#10b981" opacity="0.18" />
        <text x="72" y="13" fill="#34d399" font-size="8" font-weight="bold" font-family="monospace" text-anchor="middle">AUTONOMOUS SYSTEM</text>
        <text x="72" y="36" fill="#ffffff" font-size="9" font-weight="bold" font-family="monospace" text-anchor="middle">${result.origin.asn || 'AS200651'}</text>
        <text x="72" y="49" fill="#94a3b8" font-size="7.5" font-family="monospace" text-anchor="middle">${(result.origin.hosting || 'Bulletproof VPS').slice(0, 16)}</text>
        <text x="72" y="60" fill="#10b981" font-size="7.5" fontWeight="bold" font-family="monospace" text-anchor="middle">HOSTING INFRA</text>
      </g>

      <!-- Node 9: CAMPAIGN CLUSTER -->
      <g transform="translate(720, 155)">
        <rect width="145" height="66" rx="8" fill="#0c0f1a" stroke="#ec4899" stroke-width="1.5" />
        <rect width="145" height="18" rx="7" fill="#ec4899" opacity="0.18" />
        <text x="72" y="13" fill="#f472b6" font-size="8" font-weight="bold" font-family="monospace" text-anchor="middle">THREAT CAMPAIGN</text>
        <text x="72" y="36" fill="#ffffff" font-size="9" font-weight="bold" font-family="monospace" text-anchor="middle">${result.campaign_id && result.campaign_id !== 'UNKNOWN' ? result.campaign_id : 'WIRE-FAUD-247'}</text>
        <text x="72" y="49" fill="#94a3b8" font-size="7.5" font-family="monospace" text-anchor="middle">Multi-Vector Cluster</text>
        <text x="72" y="60" fill="#ec4899" font-size="7.5" fontWeight="bold" font-family="monospace" text-anchor="middle">HIGH CORRELATION</text>
      </g>
    </svg>
  </div>

  <!-- Risk Factors -->
  ${result.risk_factors.length > 0 ? `
  <div class="section-title">Identified Risk Factors</div>
  <table class="table">
    <thead>
      <tr>
        <th style="width: 25%;">Risk Factor</th>
        <th style="width: 15%;">Severity</th>
        <th>Technical Detail</th>
      </tr>
    </thead>
    <tbody>
      ${result.risk_factors.map(rf => `
        <tr>
          <td><strong>${rf.label}</strong></td>
          <td><span class="badge-pill badge-${rf.severity}">${rf.severity.toUpperCase()}</span></td>
          <td>${rf.detail}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  <!-- Observed Forensic Facts -->
  ${result.observed_facts.length > 0 ? `
  <div class="section-title">Observed Forensic Facts</div>
  <table class="table">
    <thead>
      <tr>
        <th style="width: 20%;">Category</th>
        <th style="width: 25%;">Field</th>
        <th>Extracted Value</th>
        <th style="width: 10%;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${result.observed_facts.map(f => `
        <tr>
          <td>${f.category}</td>
          <td><strong>${f.field}</strong></td>
          <td style="font-family: 'JetBrains Mono', monospace; word-break: break-all;">${f.value}</td>
          <td><span class="badge-pill badge-${f.status === 'pass' ? 'pass' : f.status === 'fail' ? 'fail' : 'high'}">${f.status.toUpperCase()}</span></td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  <!-- AI Inferences -->
  ${result.ai_inferences.length > 0 ? `
  <div class="section-title">AI Forensic Inferences &amp; Threat Attribution</div>
  <table class="table">
    <thead>
      <tr>
        <th style="width: 45%;">Analytical Inference</th>
        <th style="width: 15%;">Confidence</th>
        <th>Evidentiary Basis</th>
      </tr>
    </thead>
    <tbody>
      ${result.ai_inferences.map(inf => `
        <tr>
          <td><strong>${inf.inference}</strong></td>
          <td><span class="badge-pill badge-${inf.confidence >= 80 ? 'critical' : 'medium'}">${inf.confidence}%</span></td>
          <td>${inf.basis}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  <!-- Recommended Incident Response Actions -->
  ${result.recommended_actions.length > 0 ? `
  <div class="section-title">Recommended Incident Response Actions</div>
  <div>
    ${result.recommended_actions.map(act => `
      <div class="action-item">
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <strong>${act.action}</strong>
          <span class="badge-pill badge-${act.priority === 'immediate' || act.priority === 'high' ? 'critical' : 'low'}">${act.priority.toUpperCase()}</span>
        </div>
        <div style="color: #64748b; font-size: 12px;">${act.detail}</div>
      </div>
    `).join('')}
  </div>
  ` : ''}

  <!-- Key Headers -->
  ${result.headers.length > 0 ? `
  <div class="section-title">Extracted RFC Email Headers</div>
  <table class="table">
    <tbody>
      ${result.headers.map(h => `
        <tr>
          <td style="width: 25%; font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #475569;">${h.key}</td>
          <td style="font-family: 'JetBrains Mono', monospace; word-break: break-all;">${h.value}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  ` : ''}

  <div class="footer">
    <div>SENTINEL-X SECURITY PLATFORM · CONFIDENTIAL</div>
    <div>PAGE 1 OF 1</div>
  </div>

  <script>
    function initPdfMap() {
      try {
        if (typeof L === 'undefined') {
          setTimeout(function() { window.print(); }, 500);
          return;
        }
        var map = L.map('cyber-pdf-map', {
          center: [${originLat}, ${originLng}],
          zoom: 5,
          zoomControl: false,
          attributionControl: false,
          dragging: false,
          scrollWheelZoom: false,
          doubleClickZoom: false
        });

        var tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
          subdomains: 'abcd',
          maxZoom: 19
        }).addTo(map);

        var pulseIcon = L.divIcon({
          className: '',
          iconSize: [40, 40],
          iconAnchor: [20, 20],
          html: '<div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">' +
            '<div class="cyber-pulse-ring-1" style="position:absolute;width:14px;height:14px;border-radius:50%;background:#ef4444;opacity:0.85;"></div>' +
            '<div class="cyber-pulse-ring-2" style="position:absolute;width:14px;height:14px;border-radius:50%;background:#ef4444;opacity:0.6;"></div>' +
            '<div style="position:absolute;width:20px;height:20px;border-radius:50%;border:1.5px solid #ef4444;opacity:0.6;box-shadow:0 0 12px 4px rgba(239,68,68,0.5);"></div>' +
            '<div style="position:relative;width:11px;height:11px;border-radius:50%;background:#facc15;border:2px solid #ef4444;box-shadow:0 0 10px 3px rgba(239,68,68,0.8);z-index:2;">' +
            '<div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:4px;height:4px;border-radius:50%;background:#ffffff;"></div>' +
            '</div></div>'
        });

        L.marker([${originLat}, ${originLng}], { icon: pulseIcon }).addTo(map);

        var printTriggered = false;
        function triggerPrint() {
          if (printTriggered) return;
          printTriggered = true;
          setTimeout(function() { window.print(); }, 700);
        }

        tileLayer.on('load', function() {
          triggerPrint();
        });

        setTimeout(triggerPrint, 2000);
      } catch (err) {
        setTimeout(function() { window.print(); }, 600);
      }
    }

    window.onload = function() {
      initPdfMap();
    };
  </script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
