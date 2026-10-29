import { TRACKERS, today, p, esc, fmtDate, entryName } from "../state.js";
import { displayValue, icon, unit } from "../utils.js";
import { reminderCount } from "./reminders.js";

const WATER_STEP = 250;

function waterMl(value) {
  const text = String(value ?? "").trim().toLowerCase().replace(/,/g, "");
  const amount = parseFloat(text);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return /^[\d.]+\s*(l|lt|ltr|litre|litres|liter|liters)\b/.test(text) ? amount * 1000 : amount;
}

function sparkline(entries, tracker) {
  const points = entries.filter(e => e.tracker === tracker).slice(-7)
    .map(e => Number.parseFloat(e.value)).filter(Number.isFinite);
  if (points.length < 2) return `<span class="metric-sparkline empty-sparkline" aria-hidden="true"></span>`;
  const min = Math.min(...points), max = Math.max(...points), span = max - min || 1;
  const coords = points.map((value, i) => `${(i / (points.length - 1)) * 100},${28 - ((value - min) / span) * 22}`).join(" ");
  return `<svg class="metric-sparkline" viewBox="0 0 100 32" preserveAspectRatio="none" role="img" aria-label="Recent ${esc(tracker)} readings"><polyline points="${coords}" /></svg>`;
}

function metricCard(tracker, value, subtitle, entries, tone) {
  return `<article class="metric-card metric-${tone}"><div class="metric-head"><span class="metric-icon">${icon(tracker)}</span><span>${esc(entryName(tracker))}</span><button class="icon-button" data-log="${esc(tracker)}" aria-label="Log ${esc(tracker)}">＋</button></div><strong class="metric-value">${value}</strong><small>${esc(subtitle)}</small>${sparkline(entries, tracker)}<button class="button secondary metric-log" data-log="${esc(tracker)}">Log ${esc(entryName(tracker))} →</button></article>`;
}

export function homeView() {
  const profile = p();
  const entries = profile.entries || [];
  const todays = entries.filter(e => e.date === today);
  const loggedTrackers = new Set(todays.map(e => e.tracker));
  const goal = Number(profile.waterGoal) || 2000;
  const waterToday = Math.round(todays.filter(e => e.tracker === "Water").reduce((sum, e) => sum + waterMl(e.value), 0));
  const waterPercent = Math.min(100, Math.round((waterToday / goal) * 100));
  const isComplete = tracker => tracker === "Water" ? waterToday >= goal : loggedTrackers.has(tracker);
  const completed = TRACKERS.filter(isComplete).length;
  const percent = Math.round((completed / TRACKERS.length) * 100);
  const latest = tracker => entries.slice().reverse().find(e => e.tracker === tracker);
  const latestValue = (tracker, fallback) => {
    const entry = latest(tracker);
    return entry ? esc(displayValue(entry.value, tracker)) : fallback;
  };
  const alertCount = reminderCount(profile);
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  const recent = entries.slice().reverse().slice(0, 5);
  const doctors = profile.doctors || [];
  const questions = profile.questions || [];
  const waterCard = `<article class="metric-card metric-water"><div class="metric-head"><span class="metric-icon">${icon("Water")}</span><span>Water</span><span class="metric-menu" aria-hidden="true">◌</span></div><strong class="metric-value">${waterToday} <small>/ ${goal} ml</small></strong><small>${waterPercent}% of your daily goal</small><div class="water-progress" role="progressbar" aria-label="Water goal progress" aria-valuenow="${waterPercent}" aria-valuemin="0" aria-valuemax="100"><span style="width:${waterPercent}%"></span></div><div class="water-quick-actions"><button class="button secondary" data-water="250">+250</button><button class="button secondary" data-water="500">+500</button><button class="button secondary" data-water="750">+750</button><button class="button secondary" data-log="Water">Custom</button></div></article>`;

  const checklist = TRACKERS.map(tracker => {
    const entry = todays.find(e => e.tracker === tracker);
    const detail = tracker === "Water"
      ? `${waterToday} / ${goal} ml today`
      : entry ? esc(displayValue(entry.value, tracker)) : "Not logged today";
    const action = tracker === "Water"
      ? `<button class="button secondary" data-water="${WATER_STEP}">+${WATER_STEP} ml</button>`
      : `<button class="button secondary" data-log="${esc(tracker)}">Log</button>`;
    return `<div class="checklist-item ${isComplete(tracker) ? "is-complete" : ""}"><span class="tracker-icon">${icon(tracker)}</span><span><b>${esc(entryName(tracker))}</b><small>${detail}</small></span>${action}</div>`;
  }).join("");

  const questionRows = questions.slice().reverse().slice(0, 3).map(q => {
    const doctor = doctors.find(d => d.id === q.doctorId);
    const date = q.date ? ` · ${fmtDate(q.date)}` : "";
    return `<blockquote class="saved-question">“${esc(q.text)}”<small>${esc(doctor?.name || "No doctor assigned")}${date}</small></blockquote>`;
  }).join("");

  const questionOptions = doctors.map(d => `<option value="${esc(d.id)}">${esc(d.name)}${d.next ? ` · next visit ${fmtDate(d.next)}` : ""}</option>`).join("");
  const recentRows = recent.map(e => `<div class="entry-row"><span><b>${esc(entryName(e.tracker))}</b><small>${fmtDate(e.date)} · ${esc(e.time || "")}</small></span><strong>${esc(displayValue(e.value, e.tracker))}</strong><button class="icon-button" data-edit="${esc(e.id)}" aria-label="Edit entry">✎</button><button class="icon-button danger-text" data-delete-entry="${esc(e.id)}" aria-label="Delete entry">×</button></div>`).join("");

  return `<div class="dashboard-heading"><div><p class="dashboard-date">☀ ${fmtDate(today)}</p><h1>${greeting}, ${esc(profile.name)}</h1><p>Small steps today, bigger health tomorrow.</p></div><button class="notification-button" data-page="reminders" aria-label="${alertCount} reminders"><span aria-hidden="true">🔔</span>${alertCount ? `<b>${alertCount}</b>` : ""}</button></div><section class="dashboard-metrics" aria-label="Health snapshot">${metricCard("Weight", latestValue("Weight", `— ${unit("Weight")}`), latest("Weight")?.date === today ? "Logged today" : latest("Weight") ? `Last logged ${fmtDate(latest("Weight").date)}` : "Not logged yet", entries, "weight")}${metricCard("Blood pressure", latestValue("Blood pressure", "— / — mmHg"), latest("Blood pressure")?.date === today ? "Logged today" : latest("Blood pressure") ? `Last logged ${fmtDate(latest("Blood pressure").date)}` : "Not logged yet", entries, "pressure")}${metricCard("Blood glucose", latestValue("Blood glucose", `— ${unit("Blood glucose")}`), latest("Blood glucose")?.date === today ? "Logged today" : latest("Blood glucose") ? `Last logged ${fmtDate(latest("Blood glucose").date)}` : "Not logged yet", entries, "glucose")}${waterCard}</section><div class="dashboard-columns"><div class="dashboard-column"><section class="card progress-card"><div class="card-heading"><h2>Today’s progress</h2><span class="muted">${completed} / ${TRACKERS.length} tasks</span></div><div class="progress-content"><div class="progress-ring" style="--progress:${percent}%"><div><b>${percent}%</b><small>${completed} / ${TRACKERS.length}</small></div></div><div class="progress-copy"><b>${completed ? `${completed} tracker${completed === 1 ? "" : "s"} updated today` : "No entries yet"}</b><p>${completed ? "Your logged readings are included in today's summary." : "Start logging your health data to build today's progress."}</p>${!completed ? `<button class="button" data-log="Weight">Log your first entry</button>` : ""}</div></div></section><section class="card checklist-card"><div class="card-heading"><h2>Today’s checklist</h2><small>${TRACKERS.length} trackers</small></div><div class="checklist-grid">${checklist}</div></section></div><div class="dashboard-column"><section class="card add-question-card"><div class="card-heading"><div><h2>Add a new question</h2><p>Save a question for a doctor visit.</p></div><span class="question-mark">?</span></div><form id="question-form" class="home-question-form"><label>Question<input name="question" placeholder="What would you like to ask?" required></label><div class="form-row"><label>Doctor<select name="doctorId" data-question-doctor><option value="">No doctor assigned</option>${questionOptions}</select></label><label>Visit date<input name="date" data-question-date type="date"></label></div><button class="button">＋ Add question</button></form>${questionRows ? `<div class="saved-questions"><h3>Saved questions</h3>${questionRows}</div>` : `<p class="empty">Your saved questions and visit reminders will appear here.</p>`}</section><section class="card recent-card"><div class="card-heading"><h2>Recent entries</h2><button class="text-button" data-page="analytics">View all →</button></div>${recentRows || `<div class="empty-state"><span>▤</span><h3>No entries yet</h3><p>Your logged data will appear here with dates and trends.</p></div>`}</section><section class="card insight-card"><h2>✦ Health insights</h2><p>${entries.length ? `You have ${entries.length} saved health entr${entries.length === 1 ? "y" : "ies"}. Keep recording readings to see your trends in Analytics.` : "Log your first entry to start building your personal health history and trends."}</p><button class="text-button" data-page="analytics">Open analytics →</button><small>Insights describe your records and are not medical advice.</small></section></div></div>`;
}
