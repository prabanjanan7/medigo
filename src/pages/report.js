import { p, esc, fmtDate, today, SECTIONS } from "../state.js";
import { age, daysAgo, sectionLabel, sectionText, summaryText } from "../utils.js";
import qrcode from "../qrcode-generator.js";

function makeQrPayload(summary) {
  qrcode.stringToBytes = value => Array.from(new TextEncoder().encode(value));
  let low = 0, high = Array.from(summary).length, best = "";
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = Array.from(summary).slice(0, mid).join("");
    try {
      const test = qrcode(0, "L");
      test.addData(candidate, "Byte");
      test.make();
      best = candidate;
      low = mid + 1;
    } catch {
      high = mid - 1;
    }
  }
  const qr = qrcode(0, "L");
  qr.addData(best, "Byte");
  qr.make();
  return {
    text: best,
    svg: qr.createSvgTag({ cellSize: 4, margin: 4, scalable: true, alt: "QR code containing the plain-text health summary" }),
    truncated: best.length < summary.length
  };
}

export function reportView({ range }) {
  const x = p(), sel = new Set(JSON.parse(sessionStorage.getItem("medigo-sections") || '["profile","conditions","medications","vitals","bmi","questions"]'));
  const summary = summaryText(x, [...sel]), qr = makeQrPayload(summary);
  const preview = `<div class="report-paper"><div class="report-paper-head"><span class="logo-mark">M</span><div><h2>MediGO Profile Report</h2><small>${esc(x.name)} · Generated ${fmtDate(today)}</small></div><span class="report-badge">Patient-entered</span></div><p class="report-disclaimer">MediGO is a personal record-keeping tool. It does not diagnose, treat or give medical advice.</p>${[...sel].map(s => `<section class="report-section"><h3>${esc(sectionLabel(s))}</h3>${sectionText(x, s)}</section>`).join("")}<footer>Patient-entered data. Not a diagnosis. For doctor review.</footer></div>`;
  return `<div class="page-title"><div><h1>Report</h1><p>Last ${range} days · ${fmtDate(daysAgo(range === "custom" ? 90 : range))} – ${fmtDate(today)}</p></div><button class="button secondary" data-action="print">⎙　Print</button></div><section class="card"><h2>What goes in the report</h2><p class="muted">Choose the sections you want to include. Review everything before sharing.</p><div class="actions compact"><button class="text-button" data-action="all-sections">All</button><button class="text-button" data-action="no-sections">None</button></div><div class="report-options">${SECTIONS.map(([k, title, detail]) => `<label class="report-option"><input type="checkbox" data-section="${k}" ${sel.has(k) ? "checked" : ""}><span><b>${title}</b><small>${detail}</small></span></label>`).join("")}</div></section><section class="card"><div class="card-heading"><div><h2>QR summary</h2><p class="muted">Scan this local, high-contrast QR code with a phone camera to read plain text.</p></div><span class="character-count">${qr.text.length}${qr.truncated ? ` / ${summary.length} (QR capacity)` : " characters"}</span></div><div class="qr-summary"><div class="qr-code">${qr.svg}</div><div><b>Doctor-ready plain-text summary</b><small>It reflects the selected sections and current records.</small></div></div><textarea id="qr-text" readonly aria-label="Text encoded in the QR code">${esc(qr.text)}</textarea><textarea id="full-report-text" hidden readonly>${esc(summary)}</textarea>${qr.truncated ? `<p class="muted qr-limit">This report is longer than one QR code can hold. The QR contains the first ${qr.text.length} characters; copy, download, or share the full report below.</p>` : ""}<div class="actions"><button class="button secondary" data-action="copy-qr">Copy full report</button><button class="button ghost" data-action="download-qr">Download full report</button><button class="button ghost" data-action="share">Share full report</button></div><details><summary>Show the QR payload</summary><p class="muted">${esc(qr.text)}</p></details></section><section class="card"><h2>Emergency card</h2><div class="emergency-card"><h3>${esc(x.name)}${x.dob ? ` · ${age(x.dob)} yrs` : ""}</h3><p>Blood group　${esc(x.blood || "Not recorded")}</p><p>Allergies　${esc(x.allergies || "None recorded")}</p><p>Conditions　${esc((x.conditions || []).join(", ") || "None recorded")}</p><p>Current medications　${esc(x.medications.map(m => m.name).join(", ") || "None recorded")}</p><p>Emergency contacts　${esc(x.contacts.map(c => c.name + (c.phone ? ` (${c.phone})` : "")).join(", ") || "None saved")}</p><button class="text-button" data-page="settings">Edit profile information →</button></div></section><section class="report-preview">${preview}</section>`;
}
