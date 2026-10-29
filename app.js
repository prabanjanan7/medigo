import { data, save, p, today, TRACKERS, SECTIONS, empty, uid, esc, fmtDate, entryName, replaceData } from "./src/state.js";
import { age, icon, unit, daysAgo, sectionLabel, sectionText, summaryText } from "./src/utils.js";
import { landing } from "./src/pages/landing.js";
import { welcome, setup } from "./src/pages/onboarding.js";
import { homeView } from "./src/pages/home.js";
import { logView } from "./src/pages/tracking.js";
import { doctorsView } from "./src/pages/care-team.js";
import { medicationsView } from "./src/pages/medications.js";
import { analyticsView } from "./src/pages/analytics.js";
import { reportView } from "./src/pages/report.js";
import { settingsView } from "./src/pages/settings.js";
import { profilesView, wireProfiles, resetProfiles } from "./src/pages/profiles.js";
import { parseHealthVoiceInput } from "./src/services/voiceParser.js";
import { createSpeechCapture } from "./src/services/speechCapture.js";

let page = data.profiles.length ? "home" : "landing", doctorTab = "doctors", tracker = "Weight", range = 30, tableMode = false, modal = "", editingDoctor = "";
let speechCapture = null;

const PHONE_COUNTRIES = [
  ["+91", "India", 10],
  ["+1", "United States / Canada", 10],
  ["+44", "United Kingdom", 10],
  ["+61", "Australia", 9],
  ["+971", "United Arab Emirates", 9],
  ["+65", "Singapore", 8]
];

function doctorPhoneParts(doctor) {
  const country = doctor?.phoneCountry || "+91";
  const digits = String(doctor?.phone || "").replace(/\D/g, "");
  const code = country.replace(/\D/g, "");
  return { country, phone: digits.startsWith(code) && digits.length > code.length ? digits.slice(code.length) : digits };
}

function setupDoctorForm() {
  document.querySelectorAll("[data-edit-doctor]").forEach(button => button.onclick = () => { editingDoctor = button.dataset.editDoctor; modal = "doctor"; render(); });
  const form = document.querySelector("#doctor-form");
  if (!form) return;
  const doctor = editingDoctor ? p().doctors.find(d => d.id === editingDoctor) : null;
  if (doctor) {
    form.closest(".modal").querySelector("h2").textContent = "Edit doctor";
    ["name", "specialty", "clinic", "email", "next", "notes"].forEach(name => { form.elements[name].value = doctor[name] || ""; });
    form.elements.primary.checked = Boolean(doctor.primary);
  }
  const parts = doctorPhoneParts(doctor);
  form.elements.email.type = "text";
  form.elements.email.inputMode = "email";
  form.noValidate = true;
  const phone = form.querySelector('[name="phone"]');
  const phoneLabel = phone.parentElement;
  const country = document.createElement("select");
  country.name = "phoneCountry";
  country.className = "phone-country";
  country.setAttribute("aria-label", "Country dial code");
  country.innerHTML = PHONE_COUNTRIES.map(([code, name]) => `<option value="${code}" ${code === parts.country ? "selected" : ""}>${name} (${code})</option>`).join("");
  const phoneRow = document.createElement("span");
  phoneRow.className = "phone-row";
  phoneRow.append(country, phone);
  phoneLabel.replaceChildren("Phone", phoneRow);
  phone.value = parts.phone;
  const message = document.createElement("p");
  message.className = "form-error";
  message.setAttribute("data-doctor-error", "");
  phoneRow.after(message);
  const name = form.elements.name;
  const emailField = form.elements.email;
  const nameError = document.createElement("p");
  nameError.className = "form-error";
  nameError.setAttribute("data-name-error", "");
  name.after(nameError);
  const emailError = document.createElement("p");
  emailError.className = "form-error";
  emailError.setAttribute("data-email-error", "");
  emailField.after(emailError);
  form.addEventListener("submit", event => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const formData = new FormData(form);
    const selected = PHONE_COUNTRIES.find(([code]) => code === formData.get("phoneCountry")) || PHONE_COUNTRIES[0];
    const phoneDigits = String(formData.get("phone") || "").replace(/\D/g, "");
    const email = String(formData.get("email") || "").trim();
    message.textContent = "";
    nameError.textContent = "";
    emailError.textContent = "";
    const errors = [];
    if (!String(formData.get("name") || "").trim()) errors.push({ field: name, message: "Enter the doctor's name." });
    if (phoneDigits && phoneDigits.length !== selected[2]) errors.push({ field: phone, message: `${selected[1]} phone numbers must contain exactly ${selected[2]} digits after ${selected[0]}.` });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) errors.push({ field: emailField, message: "Enter a valid email address, such as name@example.com." });
    if (errors.length) {
      const first = errors[0];
      if (first.field === name) nameError.textContent = first.message;
      if (first.field === phone) message.textContent = first.message;
      if (first.field === emailField) emailError.textContent = first.message;
      first.field.focus();
      return;
    }
    const record = { id: editingDoctor || uid(), name: String(formData.get("name") || "").trim(), specialty: formData.get("specialty"), clinic: formData.get("clinic"), phone: phoneDigits, phoneCountry: formData.get("phoneCountry"), email, next: formData.get("next"), notes: formData.get("notes"), primary: formData.get("primary") === "on" };
    if (editingDoctor) {
      const index = p().doctors.findIndex(d => d.id === editingDoctor);
      if (index >= 0) p().doctors[index] = record;
    } else p().doctors.push(record);
    save(); editingDoctor = ""; modal = ""; render();
  }, true);
}

function render() { speechCapture?.abort(); speechCapture = null; document.body.classList.toggle("large-text", data.settings.largeText); document.body.classList.toggle("high-contrast", data.settings.highContrast); const app = document.querySelector("#app"); app.innerHTML = page === "landing" ? landing() : page === "welcome" ? welcome() : page === "setup" ? setup() : shell(); wire(); }

function shell() { if (!p()) { page = "landing"; return landing(); } const profile = p(); const nav = [["home", "⌂", "Home"], ["doctors", "♧", "Doctors"], ["analytics", "▥", "Analytics"], ["report", "▤", "Report"]]; return `<header class="app-top"><button class="profile-switch" data-action="profiles"><span class="avatar">${esc(profile.name.slice(0, 1).toUpperCase())}</span><span><b>${esc(profile.name)}</b><small>${profile.dob ? `${age(profile.dob)} years` : "Personal health profile"}</small></span><span class="chevron">⌄</span></button><button class="settings-button" data-page="settings" aria-label="Settings">⚙</button></header><main class="content app-content container">${pageView()}</main><nav class="bottom-nav" aria-label="Primary">${nav.map(([k, icon, label]) => `<button class="nav-button ${page === k || (k === "doctors" && page === "medications") ? "active" : ""}" data-page="${k}" aria-current="${page === k ? "page" : "false"}"><span>${icon}</span>${label}</button>`).join("")}</nav>${modalView()}`; }

function pageView() { return ({ home: homeView, doctors: () => doctorsView({ doctorTab }), medications: medicationsView, analytics: () => analyticsView({ tracker, range, tableMode }), report: () => reportView({ range }), settings: settingsView, profiles: profilesView, log: () => logView({ tracker }) }[page] || homeView)(); }



















function modalView() { if (!modal) return ""; const is = modal === "doctor", med = modal === "medication", visit = modal === "visit", contact = modal === "contact"; const title = is ? "Add doctor" : med ? "Add medication" : visit ? "Add visit note" : "Add emergency contact"; return `<div class="modal-backdrop" data-action="backdrop"><section class="modal" role="dialog" aria-modal="true" aria-label="${title}"><div class="card-heading"><h2>${title}</h2><button class="icon-button" data-action="close-modal" aria-label="Close">×</button></div>${is ? `<form id="doctor-form" class="form"><label>Name<input name="name" required></label><label>Specialty<input name="specialty"></label><label>Clinic<input name="clinic"></label><label>Phone<input name="phone" type="tel"></label><label>Email<input name="email" type="email"></label><label>Next appointment<input name="next" type="date"></label><label>Notes<textarea name="notes"></textarea></label><label class="check"><input name="primary" type="checkbox"> Primary doctor</label><div class="actions"><button type="button" class="button ghost" data-action="close-modal">Cancel</button><button class="button">Save doctor</button></div></form>` : med ? `<form id="med-form" class="form"><label>Name<input name="name" required></label><div class="form-row"><label>Dose<input name="dose" placeholder="e.g. 500 mg" required></label><label>Form<select name="form"><option value="">—</option>${["Tablet", "Capsule", "Syrup", "Injection", "Inhaler", "Drops", "Cream"].map(v => `<option>${v}</option>`).join("")}</select></label></div><label>Frequency<select name="frequency"><option>Daily</option><option>Twice daily</option><option>Three times daily</option><option>Weekly</option><option>Custom times</option></select></label><label>Scheduled times<input name="times" type="time" value="08:00"></label><button type="button" class="text-button" data-action="add-time">＋ Add another time</button><div class="form-row"><label>Start date<input name="start" type="date" value="${today}"></label><label>End date (optional)<input name="end" type="date"></label></div><label>Purpose (optional)<input name="purpose"></label><label>Prescribing doctor<select name="doctor"><option value="">—</option>${p().doctors.map(d => `<option>${esc(d.name)}</option>`).join("")}</select></label><div class="actions"><button type="button" class="button ghost" data-action="close-modal">Cancel</button><button class="button">Add medication</button></div></form>` : visit ? `<form id="visit-form" class="form"><label>Date<input name="date" type="date" value="${today}"></label><label>Doctor<select name="doctorId"><option value="">—</option>${p().doctors.map(d => `<option value="${esc(d.id)}">${esc(d.name)}</option>`).join("")}</select></label><label>What was discussed<textarea name="text" required></textarea></label><div class="actions"><button type="button" class="button ghost" data-action="close-modal">Cancel</button><button class="button">Save visit note</button></div></form>` : `<form id="contact-form" class="form"><label>Name<input name="name" required></label><div class="form-row"><label>Relationship<input name="relationship"></label><label>Phone<input name="phone" type="tel"></label></div><div class="actions"><button type="button" class="button ghost" data-action="close-modal">Cancel</button><button class="button">Save contact</button></div></form>`}</section></div>`; }

function startVoiceCapture() {
  const form = document.querySelector("#entry-form");
  const status = form?.querySelector("[data-voice-status]");
  const button = form?.querySelector("[data-action='voice-start']");
  if (!form || !status || !button) return;
  if (speechCapture) {
    speechCapture.abort();
    speechCapture = null;
    button.textContent = "Log with voice";
    button.removeAttribute("aria-label");
    status.textContent = "Voice capture cancelled. You can continue editing the form.";
    return;
  }
  const setStatus = message => { status.textContent = message; };
  speechCapture = createSpeechCapture({
    onInterim: text => setStatus(`Listening: ${text}`),
    onFinal: text => {
      const result = parseHealthVoiceInput(text);
      const trackerField = form.querySelector("[name='tracker']");
      const valueField = form.querySelector("[name='value']");
      const noteField = form.querySelector("[name='note']");
      if (result.success) {
        trackerField.value = result.tracker;
        tracker = result.tracker;
        form.querySelector("[data-entry-unit]").textContent = unit(result.tracker);
        valueField.value = result.value;
        noteField.value = result.note;
      } else {
        valueField.value = result.transcript;
      }
      setStatus(result.message);
    },
    onError: setStatus,
    onEnd: () => {
      speechCapture = null;
      button.textContent = "Log with voice";
      button.removeAttribute("aria-label");
    }
  });
  button.textContent = "Stop voice";
  button.setAttribute("aria-label", "Stop voice capture");
  setStatus("Listening… speak one tracker and its value.");
  if (!speechCapture.start()) {
    speechCapture = null;
    button.textContent = "Log with voice";
  }
}

function wire() { setupDoctorForm(); wireProfiles({ go: next => { page = next; render(); }, refresh: render }); document.querySelectorAll("[data-page]").forEach(b => b.onclick = () => { page = b.dataset.page; if (page === "doctors") doctorTab = "doctors"; render(); }); document.querySelectorAll("[data-action]").forEach(b => b.onclick = e => { const a = b.dataset.action; if (a === "open-app") { e.preventDefault(); page = data.profiles.length ? "home" : "welcome"; render(); } if (a === "start-profile") { page = data.profiles.length ? "home" : "welcome"; render(); } if (a === "landing") { page = "landing"; render(); } if (a === "continue") { page = "setup"; render(); } if (a === "close-modal") { modal = ""; render(); } if (a === "backdrop" && e.target === b) { modal = ""; render(); } if (a === "profiles") { resetProfiles(); page = "profiles"; render(); } if (a === "print") window.print(); if (a === "voice-start") startVoiceCapture(); if (a === "all-sections" || a === "no-sections") { document.querySelectorAll("[data-section]").forEach(i => i.checked = a === "all-sections"); updateSections(); } if (a === "copy-qr") navigator.clipboard?.writeText(document.querySelector("#full-report-text").value).then(() => alert("Full report copied. Review it before sharing.")); if (a === "download-qr") downloadText(document.querySelector("#full-report-text").value, "medigo-summary.txt"); if (a === "share") { const text = document.querySelector("#full-report-text").value; if (navigator.share) navigator.share({ title: "MediGO health summary", text }); else { navigator.clipboard?.writeText(text); alert("Full report copied. Review it before sharing."); } } if (a === "export") exportBackup(); if (a === "delete-profile" && confirm("Delete this profile and its records from this device? This cannot be undone unless you have a backup.")) { data.profiles = data.profiles.filter(z => z.id !== p().id); data.activeProfileId = data.profiles[0]?.id || null; save(); page = data.profiles.length ? "home" : "landing"; render(); } if (a === "toggle-table") { tableMode = !tableMode; render(); } if (a === "apply-range") { const from = document.querySelector("#range-from").value, to = document.querySelector("#range-to").value; if (from && to && from <= to) { window.customRange = [from, to]; render(); } } if (a === "add-time") { const f = document.querySelector("#med-form"); const label = document.createElement("label"); label.textContent = "Additional time"; const input = document.createElement("input"); input.name = "times"; input.type = "time"; input.value = "20:00"; label.append(input); f.querySelector('[name="times"]').parentElement.after(label); } });
 document.querySelector("#accept-disclaimer")?.addEventListener("change", e => { document.querySelector('[data-action="continue"]').disabled = !e.target.checked; }); document.querySelector("#setup-form")?.addEventListener("submit", e => { e.preventDefault(); const f = new FormData(e.target); const q = { id: uid(), name: f.get("name").trim(), dob: f.get("dob"), blood: f.get("blood"), conditions: f.get("conditions").split(",").map(s => s.trim()).filter(Boolean), allergies: "", guardian: f.get("guardian") === "on", height: "", entries: [], medications: [], doses: {}, doctors: [], questions: [], visitNotes: [], documents: [], contacts: [], waterGoal: 2000, waterTotal: 0 }; data.profiles.push(q); data.activeProfileId = q.id; save(); page = "home"; render(); });
 document.querySelector("#entry-form")?.addEventListener("submit", e => { e.preventDefault(); const f = new FormData(e.target), t = f.get("tracker"); p().entries.push({ id: uid(), tracker: t, value: f.get("value"), unit: unit(t), date: f.get("date"), note: f.get("note"), time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }); save(); page = "home"; render(); }); document.querySelector("[data-tracker-select]")?.addEventListener("change", e => { const t = e.target.value; tracker = t; e.target.form.querySelector("[data-entry-unit]").textContent = unit(t); }); document.querySelectorAll("[data-log]").forEach(b => b.onclick = () => { tracker = b.dataset.log; page = "log"; render(); }); document.querySelectorAll("[data-water]").forEach(b => b.onclick = () => { const amount = Number(b.dataset.water); p().waterTotal = Number(p().waterTotal || 0) + amount; p().entries.push({ id: uid(), tracker: "Water", value: amount, unit: "ml", date: today, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) }); save(); render(); });
 document.querySelectorAll("[data-doctor-tab]").forEach(b => b.onclick = () => { doctorTab = b.dataset.doctorTab; render(); }); document.querySelectorAll("[data-modal]").forEach(b => b.onclick = () => { modal = b.dataset.modal; render(); });  document.querySelector("#doctor-form")?.addEventListener("submit", e => { e.preventDefault(); const f = new FormData(e.target); p().doctors.push({ id: uid(), name: f.get("name"), specialty: f.get("specialty"), clinic: f.get("clinic"), phone: f.get("phone"), email: f.get("email"), next: f.get("next"), notes: f.get("notes"), primary: f.get("primary") === "on" }); save(); modal = ""; render(); }); document.querySelector("#visit-form")?.addEventListener("submit", e => { e.preventDefault(); const f = new FormData(e.target), doctorId = f.get("doctorId"), doctor = p().doctors.find(d => d.id === doctorId); p().visitNotes.push({ id: uid(), date: f.get("date"), doctorId: doctorId || "", doctor: doctor?.name || "", text: f.get("text") }); save(); modal = ""; doctorTab = "visits"; render(); }); document.querySelector("#question-form")?.addEventListener("submit", e => { e.preventDefault(); const f = new FormData(e.target); p().questions.push({ id: uid(), text: f.get("question"), doctorId: f.get("doctorId") || "", date: f.get("date") || "", ready: true }); save(); render(); }); document.querySelectorAll("[data-ready]").forEach(i => i.onchange = () => { const q = p().questions.find(z => z.id === i.dataset.ready); q.ready = i.checked; save(); }); document.querySelectorAll("[data-edit-question]").forEach(b => b.onclick = () => { const q = p().questions.find(z => z.id === b.dataset.editQuestion); if (!q) return; const text = prompt("Update this question", q.text); if (text !== null && text.trim()) { q.text = text.trim(); save(); render(); } });
 document.querySelector("#med-form")?.addEventListener("submit", e => { e.preventDefault(); const f = new FormData(e.target); const times = f.getAll("times"); p().medications.push({ id: uid(), name: f.get("name"), dose: f.get("dose"), form: f.get("form"), frequency: f.get("frequency"), times, start: f.get("start"), end: f.get("end"), purpose: f.get("purpose"), doctor: f.get("doctor") }); save(); modal = ""; page = "medications"; render(); }); document.querySelectorAll("[data-dose]").forEach(b => b.onclick = () => { p().doses[`${today}:${b.dataset.dose}`] = b.dataset.status; save(); render(); });
 document.querySelector("#contact-form")?.addEventListener("submit", e => { e.preventDefault(); const f = new FormData(e.target); p().contacts.push({ id: uid(), name: f.get("name"), relationship: f.get("relationship"), phone: f.get("phone") }); save(); modal = ""; render(); }); document.querySelector("#profile-form")?.addEventListener("submit", e => { e.preventDefault(); const f = new FormData(e.target); Object.assign(p(), { name: f.get("name"), dob: f.get("dob"), blood: f.get("blood"), height: f.get("height"), conditions: f.get("conditions").split(",").map(s => s.trim()).filter(Boolean), allergies: f.get("allergies") }); save(); render(); }); document.querySelectorAll("[data-unit]").forEach(i => i.onchange = () => { data.settings[i.dataset.unit] = i.value; save(); render(); }); document.querySelector("#large-text")?.addEventListener("change", e => { data.settings.largeText = e.target.checked; save(); render(); }); document.querySelector("#high-contrast")?.addEventListener("change", e => { data.settings.highContrast = e.target.checked; save(); render(); }); document.querySelector("#asian-bmi")?.addEventListener("change", e => { data.settings.asianBmi = e.target.checked; save(); }); document.querySelector("#import-backup")?.addEventListener("change", importBackup);
 document.querySelectorAll("[data-tracker]").forEach(b => b.onclick = () => { tracker = b.dataset.tracker; render(); }); document.querySelectorAll("[data-range]").forEach(b => b.onclick = () => { range = b.dataset.range === "custom" ? "custom" : Number(b.dataset.range); render(); }); document.querySelectorAll("[data-section]").forEach(i => i.onchange = updateSections); document.querySelectorAll("[data-edit]").forEach(b => b.onclick = () => { const e = p().entries.find(z => z.id === b.dataset.edit); if (!e) return; const value = prompt("Update this entry", e.value); if (value !== null && value.trim()) { e.value = value.trim(); save(); render(); } }); document.querySelectorAll("[data-delete-entry]").forEach(b => b.onclick = () => { if (confirm("Delete this entry?")) { p().entries = p().entries.filter(z => z.id !== b.dataset.deleteEntry); save(); render(); } }); document.querySelectorAll("[data-remove-med]").forEach(b => b.onclick = () => { p().medications = p().medications.filter(z => z.id !== b.dataset.removeMed); save(); render(); }); document.querySelectorAll("[data-remove-doctor]").forEach(b => b.onclick = () => { p().doctors = p().doctors.filter(z => z.id !== b.dataset.removeDoctor); save(); render(); }); document.querySelectorAll("[data-remove-question]").forEach(b => b.onclick = () => { p().questions = p().questions.filter(z => z.id !== b.dataset.removeQuestion); save(); render(); }); document.querySelectorAll("[data-remove-doc]").forEach(b => b.onclick = () => { p().documents = p().documents.filter(z => z.id !== b.dataset.removeDoc); save(); render(); }); document.querySelectorAll("[data-remove-contact]").forEach(b => b.onclick = () => { p().contacts = p().contacts.filter(z => z.id !== b.dataset.removeContact); save(); render(); }); document.querySelectorAll("[data-view-doc]").forEach(b => b.onclick = () => { const d = p().documents.find(z => z.id === b.dataset.viewDoc); if (d?.content) window.open(d.content, "_blank", "noopener"); else alert("This local document preview is unavailable."); }); document.querySelector("#document-form")?.addEventListener("submit", e => { e.preventDefault(); const f = new FormData(e.target), file = f.get("file"); if (!file?.name) return alert("Choose a PDF or photo first."); if (file.size > 5 * 1024 * 1024) return alert("Choose a file smaller than 5 MB."); if (p().documents.length >= 20) return alert("This profile can store up to 20 documents."); const reader = new FileReader(); reader.onload = () => { p().documents.push({ id: uid(), name: file.name, label: f.get("label"), category: f.get("category"), date: f.get("date") || today, size: file.size, content: reader.result }); save(); render(); }; reader.readAsDataURL(file); }); }

function updateSections() { sessionStorage.setItem("medigo-sections", JSON.stringify([...document.querySelectorAll("[data-section]:checked")].map(i => i.dataset.section))); render(); }
function profilePicker() { const names = data.profiles.map((z, i) => `${i + 1}. ${z.name}`).join("\n"); const choice = Number(prompt(`Choose a profile:\n${names}\n\nEnter a number, or Cancel.`)); if (choice > 0 && data.profiles[choice - 1]) { data.activeProfileId = data.profiles[choice - 1].id; save(); render(); } }
function downloadText(text, filename) { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/plain" })); a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
function exportBackup() { data.lastBackup = new Date().toLocaleString(); save(); const blob = new Blob([JSON.stringify({ format: "medigo-backup", version: 2, exportedAt: new Date().toISOString(), data }, null, 2)], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `medigo-backup-${today}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }
function importBackup(e) { const file = e.target.files?.[0]; if (!file) return; const r = new FileReader(); r.onload = () => { try { const b = JSON.parse(r.result); if (b.format !== "medigo-backup" || !b.data || !Array.isArray(b.data.profiles)) throw new Error("Unsupported backup file"); if (confirm("Replace this device’s MediGO records with the profiles in this backup?")) { replaceData(b.data); save(); page = data.profiles.length ? "home" : "landing"; render(); } } catch (err) { alert(`Backup was not imported: ${err.message}`); } }; r.readAsText(file); }
if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js").catch(() => {});
render();
