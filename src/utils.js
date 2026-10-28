import { data, today, TRACKERS, SECTIONS, esc, fmtDate } from "./state.js";

export function age(dob) { const d = new Date(dob); let a = new Date().getFullYear() - d.getFullYear(); if (new Date() < new Date(new Date().getFullYear(), d.getMonth(), d.getDate())) a--; return a; }

export function icon(t) { return ({ Weight: "⚖", "Blood pressure": "♡", "Blood glucose": "◉", Water: "♢", Waist: "⌁", Calories: "✳", Mood: "☺", Symptom: "＋" })[t] || "•"; }

export function unit(t) { if (t === "Weight") return data.settings.weight || "kg"; if (t === "Blood pressure") return "mmHg"; if (t === "Blood glucose") return data.settings.glucose || "mg/dL"; if (t === "Waist") return data.settings.height || "cm"; if (t === "Water") return "ml"; if (t === "Calories") return "kcal"; return ""; }

export function displayValue(value, tracker) {
  const text = String(value ?? "").trim(), u = unit(tracker);
  const escapedUnit = u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (!u || new RegExp(`(?:\\s|^)${escapedUnit}$`, "i").test(text)) return text;
  return `${text} ${u}`;
}

export function daysAgo(n) { const d = new Date(`${today}T12:00:00`); d.setDate(d.getDate() - Number(n)); return d.toISOString().slice(0, 10); }

export function qrPattern() { return `<span class="qr-grid">${Array.from({ length: 81 }, (_, i) => `<i class="${((i * 7 + Math.floor(i / 3) * 5) % 11 < 5 || [0, 1, 2, 9, 18, 19, 20, 6, 7, 8, 15, 16, 17, 54, 55, 56, 63, 64, 65, 72, 73, 74].includes(i)) ? "dark" : ""}"></i>`).join("")}</span>`; }

export function sectionLabel(k) { return (SECTIONS.find(s => s[0] === k) || [k, k])[1]; }

export function sectionText(x, k) { if (k === "profile") return `<p>${esc(x.name)}${x.dob ? ` · ${age(x.dob)} years` : ""} · Blood group ${esc(x.blood || "not recorded")}<br>Allergies: ${esc(x.allergies || "None recorded")}<br>Emergency contacts: ${esc(x.contacts.map(c => `${c.name} ${c.phone || ""}`).join(", ") || "None recorded")}</p>`; if (k === "conditions") return `<p>${esc(x.conditions.join(", ") || "No conditions recorded.")}</p>`; if (k === "medications") return `<p>${x.medications.map(m => `${esc(m.name)} ${esc(m.dose)} (${esc(m.frequency)})`).join("<br>") || "No active medications recorded."}</p>`; if (k === "vitals") return TRACKERS.filter(t => t !== "Symptom").map(t => { const a = x.entries.filter(e => e.tracker === t).slice(-30), v = a.map(e => parseFloat(e.value)).filter(Number.isFinite); return a.length ? `<p><b>${esc(t)}</b> · Latest ${esc(displayValue(a[a.length - 1].value, t))} · Average ${v.length ? (v.reduce((q, z) => q + z, 0) / v.length).toFixed(1) : "—"} ${unit(t)} · ${a.length} entries</p>` : ""; }).join("") || "<p>No readings recorded.</p>"; if (k === "bmi") { const wt = [...x.entries].reverse().find(e => e.tracker === "Weight" && parseFloat(e.value)); const cm = Number(x.height); const bmi = wt && cm ? (Number(wt.value) / ((cm / 100) ** 2)).toFixed(1) : null; return `<p>Latest weight ${wt ? esc(displayValue(wt.value, "Weight")) : "Not recorded"}${bmi ? ` · BMI ${bmi} (reference only)` : ""}</p>`; } if (k === "mood") return `<p>${x.entries.filter(e => e.tracker === "Mood").map(e => `${esc(e.value)} · ${fmtDate(e.date)}`).join("<br>") || "No mood entries recorded."}</p>`; if (k === "symptoms") return `<p>${x.entries.filter(e => ["Symptom", "Mood"].includes(e.tracker)).map(e => `${esc(e.value)} · ${fmtDate(e.date)}`).join("<br>") || "No symptoms or notes recorded."}</p>`; if (k === "questions") return `<p>${x.questions.filter(q => q.ready).map(q => esc(q.text)).join("<br>") || "No questions marked as ready to ask."}</p>`; if (k === "notes") return `<p>${x.visitNotes.map(n => `${esc(n.text)} · ${fmtDate(n.date)}`).join("<br>") || "No visit notes recorded."}</p>`; return `<p>${x.documents.map(d => `${esc(d.label || d.name)} · ${esc(d.category)} · ${fmtDate(d.date)}`).join("<br>") || "No documents attached."}</p>`; }

export function summaryText(x, sel) { const lines = [`MediGO summary for ${x.name}. Patient-entered reference data.`]; for (const k of sel) { const text = sectionText(x, k).replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(); if (text) lines.push(`${sectionLabel(k)}: ${text}`); } return lines.join(" | "); }
