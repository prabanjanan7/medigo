import { TRACKERS, today, p, esc, fmtDate, entryName } from "../state.js";
import { icon } from "../utils.js";

function waterMl(value) {
  const text = String(value ?? "").trim().toLowerCase().replace(/,/g, "");
  const amount = Number.parseFloat(text);
  if (!Number.isFinite(amount) || amount < 0) return 0;
  return /^[\d.]+\s*(l|lt|ltr|litre|litres|liter|liters)\b/.test(text) ? amount * 1000 : amount;
}

export function reminderCount(profile = p()) {
  if (!profile) return 0;
  const entries = profile.entries || [];
  const todayEntries = entries.filter(entry => entry.date === today);
  const water = todayEntries.filter(entry => entry.tracker === "Water").reduce((total, entry) => total + waterMl(entry.value), 0);
  const goal = Number(profile.waterGoal) || 2000;
  const missingLogs = TRACKERS.filter(tracker => tracker === "Water" ? water < goal : !todayEntries.some(entry => entry.tracker === tracker)).length;
  const upcomingVisits = (profile.doctors || []).filter(doctor => doctor.next && doctor.next >= today).length;
  return missingLogs + Math.min(upcomingVisits, 3);
}

export function remindersView() {
  const profile = p();
  const entries = profile.entries || [];
  const todayEntries = entries.filter(entry => entry.date === today);
  const water = Math.round(todayEntries.filter(entry => entry.tracker === "Water").reduce((total, entry) => total + waterMl(entry.value), 0));
  const goal = Number(profile.waterGoal) || 2000;
  const missing = TRACKERS.filter(tracker => tracker === "Water" ? water < goal : !todayEntries.some(entry => entry.tracker === tracker));
  const upcoming = (profile.doctors || []).filter(doctor => doctor.next && doctor.next >= today)
    .slice().sort((a, b) => a.next.localeCompare(b.next)).slice(0, 3);

  return `<div class="page-title reminders-title"><div><h1>Notifications & reminders</h1><p>Your health logs and upcoming care visits.</p></div><button class="button secondary" data-page="home">← Back to home</button></div><section class="card reminder-section"><div class="card-heading"><div><h2>Today’s health logs</h2><p class="muted">Items still waiting for a log today.</p></div><span class="reminder-count">${missing.length}</span></div>${missing.length ? `<div class="reminder-items">${missing.map(tracker => `<article class="reminder-item"><span class="tracker-icon">${icon(tracker)}</span><span><b>Log ${esc(entryName(tracker))}</b><small>${tracker === "Water" ? `${water} / ${goal} ml toward your daily goal` : "No entry recorded today"}</small></span>${tracker === "Water" ? `<button class="button secondary" data-water="250">+250 ml</button>` : `<button class="button secondary" data-log="${esc(tracker)}">Log now</button>`}</article>`).join("")}</div>` : `<div class="empty-state"><span>✓</span><h3>All caught up</h3><p>You have recorded today’s health trackers.</p></div>`}</section><section class="card reminder-section"><div class="card-heading"><div><h2>Upcoming doctor visits</h2><p class="muted">Questions linked to a doctor and visit date appear here.</p></div><button class="button secondary" data-page="doctors">Manage doctors</button></div>${upcoming.length ? upcoming.map(doctor => { const questions = (profile.questions || []).filter(question => question.doctorId === doctor.id && question.date === doctor.next); return `<article class="visit-reminder-page"><div class="visit-date-badge"><b>${new Date(`${doctor.next}T12:00:00`).toLocaleDateString(undefined, { day: "numeric" })}</b><small>${new Date(`${doctor.next}T12:00:00`).toLocaleDateString(undefined, { month: "short" })}</small></div><div class="visit-reminder-content"><div class="card-heading"><div><h3>${esc(doctor.name)}</h3><small>${fmtDate(doctor.next)}${doctor.next === today ? " · Today" : ""}</small></div><button class="text-button" data-page="doctors">Open doctor page →</button></div>${questions.length ? `<h4>Remember to ask</h4><ul>${questions.map(question => `<li>“${esc(question.text)}”</li>`).join("")}</ul>` : `<p class="muted">No question is linked to this visit yet.</p>`}</div></article>`; }).join("") : `<div class="empty-state"><span>♧</span><h3>No upcoming visits</h3><p>Add a doctor and set their next appointment date to see a reminder here.</p><button class="button secondary" data-page="doctors">Open doctors</button></div>`}</section>`;
}
