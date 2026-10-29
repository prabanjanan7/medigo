import { TRACKERS, today, p, esc, fmtDate, entryName } from "../state.js";
import { displayValue, icon } from "../utils.js";

const WATER_STEP = 250;

// Reads a water entry as millilitres. Accepts 250, "250", "250 ml", "1,500" and "1.5 L"; ignores junk and negatives.
function waterMl(value) {
  const text = String(value ?? "").trim().toLowerCase().replace(/,/g, "");
  const n = parseFloat(text);
  if (!Number.isFinite(n) || n < 0) return 0;
  return /^[\d.]+\s*(l|lt|ltr|litre|litres|liter|liters)\b/.test(text) ? n * 1000 : n;
}

export function homeView() {
  const x = p(), due = ["Weight", "Blood pressure", "Blood glucose", "Water"];
  const todays = x.entries.filter(e => e.date === today);
  const logs = new Set(todays.map(e => e.tracker));
  const dueMeds = x.medications.filter(m => !m.end || m.end >= today);

  // Water: today's total is the sum of today's Water entries (each entry = one drink)
  const goal = Number(x.waterGoal) || 2000;
  const waterToday = Math.round(todays.filter(e => e.tracker === "Water").reduce((sum, e) => sum + waterMl(e.value), 0));
  const over = waterToday - goal;
  const waterText = `${waterToday} / ${goal} ml today`;
  const waterNote = over > 0 ? ` · ${over} ml over goal` : (waterToday && over === 0 ? " · Goal reached" : "");
  const waterNotice = over > 0
    ? `<div class="notice water-over" role="alert"><b>Over today’s water goal</b><p>You’ve logged ${waterToday} ml today, which is ${over} ml more than your ${goal} ml goal.</p></div>`
    : "";

  const checklistItem = t => {
    if (t === "Water") {
      return `<div class="checklist-item"><span class="tracker-icon">${icon(t)}</span><span><b>${entryName(t)}</b><small class="${over > 0 ? "over" : ""}">${waterToday ? `${waterText}${waterNote}` : "Not logged yet today"}</small></span><button class="button secondary" data-water="${WATER_STEP}">+${WATER_STEP} ml</button></div>`;
    }
    const e = todays.find(z => z.tracker === t);
    return `<div class="checklist-item"><span class="tracker-icon">${icon(t)}</span><span><b>${entryName(t)}</b><small>${e ? esc(displayValue(e.value, e.tracker)) : "Not logged yet today"}</small></span><button class="button secondary" data-log="${t}">Log</button></div>`;
  };

  return `<div class="page-title"><div><h1>Today</h1><p>${fmtDate(today)} · ${esc(x.name)}</p></div><button class="button secondary" data-page="analytics">⌁　Trends</button></div><h2 class="section-label">Due today</h2><div class="due-row">${due.slice(0, 3).map(t => `<button class="due-card" data-log="${t}"><small>Suggested</small><b>Log ${entryName(t)}</b><span>${logs.has(t) ? "Logged today" : "Not logged yet today"}</span></button>`).join("")}<button class="due-card ${over > 0 ? "over-goal" : ""}" data-water="${WATER_STEP}"><small>Daily target</small><b>Water</b><span>${waterText}${waterNote}</span></button>${dueMeds.length ? `<button class="due-card" data-page="medications"><small>Medication</small><b>${dueMeds.length} dose${dueMeds.length === 1 ? "" : "s"} due</b><span>Record dose status</span></button>` : ""}</div>${waterNotice}<section class="card checklist-card"><h2>Today’s checklist</h2><div class="checklist-grid">${[...TRACKERS.filter(t => !["Water"].includes(t)), "Water"].map(checklistItem).join("")}</div></section><section class="card"><div class="card-heading"><h2>Logged today</h2><button class="text-button" data-page="analytics">All history →</button></div>${todays.length ? todays.slice().reverse().map(e => `<div class="entry-row"><span><b>${entryName(e.tracker)}</b><small>${fmtDate(e.date)} · ${esc(e.time || "")}</small></span><strong>${esc(displayValue(e.value, e.tracker))}</strong><button class="icon-button" data-edit="${e.id}" aria-label="Edit entry">✎</button><button class="icon-button danger-text" data-delete-entry="${e.id}" aria-label="Delete entry">×</button></div>`).join("") : `<p class="empty">Your logged entries will appear here.</p>`}</section><section class="card"><div class="card-heading"><h2>Care team</h2><button class="text-button" data-page="doctors">Open →</button></div>${x.doctors.length ? x.doctors.map(d => `<p><b>${esc(d.name)}</b> · ${esc(d.specialty || d.clinic || "Doctor")}</p>`).join("") : `<p class="empty">No doctor saved. Add one so questions and visit notes have a home.</p><button class="button secondary" data-page="doctors">Add a doctor</button>`}</section>`;
}