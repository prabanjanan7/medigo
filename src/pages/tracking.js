
import { TRACKERS, today, p, esc, fmtDate, entryName } from "../state.js";
import { displayValue, unit } from "../utils.js";

export function logView({ tracker, prefill = "", date = today } = {}) {
  const x = p();
  const selectedDate = date <= today ? date : today;
  const entries = x.entries
    .filter(e => e.date === selectedDate)
    .slice()
    .reverse();

  const earlierDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() - (i + 1));
    return d.toISOString().slice(0, 10);
  }).filter(d => !x.entries.some(e => e.date === d));

  return `
    <div class="page-title">
      <div>
        <h1>Log an entry</h1>
        <p>Record what you want to remember.</p>
      </div>
    </div>

    <section class="card">
      <form id="entry-form" class="form">
        <div class="form-row">
          <label>Tracker
            <select name="tracker" data-tracker-select>
              ${TRACKERS.map(t => `
                <option value="${esc(t)}"
                  ${t === (prefill || tracker) ? "selected" : ""}>
                  ${esc(t)}
                </option>
              `).join("")}
            </select>
          </label>
          <label>Value
            <span class="input-with-unit">
              <input name="value" required
                placeholder="Enter a reading or note">
              <small data-entry-unit>${esc(unit(prefill || tracker))}</small>
            </span>
          </label>
        </div>

        <div class="form-row">
          <label>Date
            <input name="date" type="date"
              value="${selectedDate}" max="${today}" required>
          </label>
          <label>Context (optional)
            <input name="note"
              placeholder="For example, before breakfast">
          </label>
        </div>

        <button class="button">Save entry</button>
      </form>
    </section>

    <section class="card">
      <h2>Entries for ${fmtDate(selectedDate)}</h2>
      ${entries.map(e => `
        <div class="entry-row">
          <span>
            <b>${esc(entryName(e.tracker))}</b>
            <small>${fmtDate(e.date)} · ${esc(e.note || "")}</small>
          </span>
          <strong>${esc(displayValue(e.value, e.tracker))}</strong>
        </div>
      `).join("") || '<p class="empty">No entries for this date.</p>'}
    </section>

    <section class="card">
      <h2>Earlier — not recorded</h2>
      <p>Choose a previous date to enter a remembered reading.</p>
      <div class="actions">
        ${earlierDays.map(d => `
          <button type="button" class="button secondary"
            data-backfill="${d}">
            Add entry for ${fmtDate(d)}
          </button>
        `).join("") || '<p>No unrecorded days in the last week.</p>'}
      </div>
    </section>
  `;
}
