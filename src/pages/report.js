
import { p, esc, fmtDate, today, SECTIONS } from "../state.js";
import {
  age,
  daysAgo,
  qrPattern,
  sectionLabel,
  sectionText,
  summaryText,
} from "../utils.js";

export function reportView({ range }) {
  const x = p();

  const sel = new Set(
    JSON.parse(
      sessionStorage.getItem("medigo-sections") ||
        '["profile","conditions","medications","vitals","bmi","questions"]'
    )
  );

  const summary = summaryText(x, [...sel]);

  const preview = `
    <div class="report-paper">
      <div class="report-paper-head">
        <span class="logo-mark">M</span>
        <div>
          <h2>MediGO Profile Report</h2>
          <small>${esc(x.name)} · Generated ${fmtDate(today)}</small>
        </div>
        <span class="report-badge">Patient-entered</span>
      </div>

      <p class="report-disclaimer">
        MediGO is a personal record-keeping tool.
        It does not diagnose, treat or give medical advice.
      </p>

      ${[...sel]
        .map(
          (s) => `
            <section class="report-section">
              <h3>${esc(sectionLabel(s))}</h3>
              ${sectionText(x, s)}
            </section>
          `
        )
        .join("")}

      <footer>
        Patient-entered data. Not a diagnosis. For doctor review.
      </footer>
    </div>
  `;

  return `
    <div class="page-title">
      <div>
        <h1>Report</h1>
        <p>
          Last ${range} days ·
          ${fmtDate(daysAgo(range === "custom" ? 90 : range))} –
          ${fmtDate(today)}
        </p>
      </div>

      <button class="button secondary" data-action="print">
        ⎙　Print
      </button>
    </div>

    <section class="card">
      <h2>What goes in the report</h2>

      <p class="muted">
        Choose the sections you want to include. Review everything before sharing.
      </p>

      <div class="actions compact">
        <button class="text-button" data-action="all-sections">
          All
        </button>
        <button class="text-button" data-action="no-sections">
          None
        </button>
      </div>

      <div class="report-options">
        ${SECTIONS.map(
          ([k, title, detail]) => `
            <label class="report-option">
              <input
                type="checkbox"
                data-section="${k}"
                ${sel.has(k) ? "checked" : ""}
              >
              <span>
                <b>${title}</b>
                <small>${detail}</small>
              </span>
            </label>
          `
        ).join("")}
      </div>
    </section>

    <section class="card">
      <div class="card-heading">
        <div>
          <h2>QR summary</h2>
          <p class="muted">
            Anyone who scans this QR can read the summary.
          </p>
        </div>

        <span class="character-count">
          ${Math.min(900, summary.length)} / 900
        </span>
      </div>

      <div class="qr-summary">
        <div class="qr-placeholder">${qrPattern()}</div>
        <div>
          <b>Doctor-ready plain-text summary</b>
          <small>Review the selected sections before sharing.</small>
        </div>
      </div>

      <textarea id="qr-text" readonly>${esc(summary.slice(0, 900))}</textarea>

      <div class="actions">
        <button class="button secondary" data-action="copy-qr">
          Copy text
        </button>
        <button class="button ghost" data-action="download-qr">
          Download text
        </button>
        <button class="button ghost" data-action="share">
          Share
        </button>
      </div>

      <details>
        <summary>Show the plain-text summary</summary>
        <p class="muted">${esc(summary.slice(0, 900))}</p>
      </details>
    </section>

    <section class="card">
      <h2>Emergency card</h2>

      <div class="emergency-card">
        <h3>
          ${esc(x.name)}${x.dob ? ` · ${age(x.dob)} yrs` : ""}
        </h3>

        <p>Blood group　${esc(x.blood || "Not recorded")}</p>
        <p>Allergies　${esc(x.allergies || "None recorded")}</p>

        <p>
          Conditions　
          ${esc((x.conditions || []).join(", ") || "None recorded")}
        </p>

        <p>
          Current medications　
          ${esc(x.medications.map((m) => m.name).join(", ") || "None recorded")}
        </p>

        <p>
          Emergency contacts　
          ${esc(
            x.contacts
              .map((c) => c.name + (c.phone ? ` (${c.phone})` : ""))
              .join(", ") || "None saved"
          )}
        </p>

        <button class="text-button" data-page="settings">
          Edit profile information →
        </button>
      </div>
    </section>

    <section class="report-preview">
      ${preview}
    </section>
  `;
}
