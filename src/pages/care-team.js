import { p, esc, fmtDate, today } from "../state.js";

function doctorReminder(x, doctor) {
  if (doctor.next !== today) return "";
  const questions = x.questions.filter(q => q.doctorId === doctor.id && q.date === doctor.next);
  const list = questions.map(q => `<li>${esc(q.text)}</li>`).join("");
  return `<div class="visit-reminder" role="status"><b>Appointment today</b><small>${fmtDate(doctor.next)} - ${esc(doctor.name)}</small>${questions.length ? `<strong>Questions for this visit</strong><ul>${list}</ul>` : ""}</div>`;
}

function doctorCard(x, doctor) {
  const specialty = `${esc(doctor.specialty || "")}${doctor.clinic ? ` - ${esc(doctor.clinic)}` : ""}`;
  const phone = doctor.phone ? `<p>${esc(doctor.phoneCountry || "+91")} ${esc(doctor.phone)}</p>` : "";
  const email = doctor.email ? `<p>${esc(doctor.email)}</p>` : "";
  const next = doctor.next ? `<small>Next appointment - ${fmtDate(doctor.next)}</small>` : "";
  const notes = doctor.notes ? `<p>${esc(doctor.notes)}</p>` : "";
  const name = String(doctor.name || "Doctor");
  return `<article class="doctor-card">${doctorReminder(x, doctor)}<div class="card-heading"><span class="avatar">${esc(name.slice(0, 1))}</span><div class="actions"><button class="button secondary" data-edit-doctor="${doctor.id}">Edit</button><button class="icon-button danger-text" data-remove-doctor="${doctor.id}" aria-label="Remove doctor">x</button></div></div><h3>${esc(name)}</h3><p class="muted">${specialty}</p>${phone}${email}${next}${notes}</article>`;
}

export function doctorsView({ doctorTab }) {
  const x = p();
  const doctorName = id => x.doctors.find(d => d.id === id)?.name || "";
  const tabs = [["doctors", "Doctors"], ["visits", "Visit notes"], ["questions", "Questions"], ["documents", `Documents (${x.documents.length})`]];
  let content = "";

  if (doctorTab === "doctors") {
    const cards = x.doctors.map(doctor => doctorCard(x, doctor)).join("");
    content = `<div class="card-heading"><h2>Your doctors</h2><button class="button" data-modal="doctor">Add doctor</button></div>${cards || `<div class="empty-state"><span>+</span><h3>No doctors yet</h3><p>Save your doctor's clinic and phone number so your care information is easy to find.</p><button class="button secondary" data-modal="doctor">Add doctor</button></div>`}`;
  }
  if (doctorTab === "visits") {
    content = `<div class="card-heading"><h2>Visit notes</h2><button class="button" data-modal="visit">Add visit note</button></div>${x.visitNotes.length ? x.visitNotes.slice().reverse().map(n => `<article class="note-card"><small>${fmtDate(n.date)}</small><h3>${esc(doctorName(n.doctorId) || n.doctor || "Visit note")}</h3><p>${esc(n.text)}</p></article>`).join("") : `<div class="empty-state"><span>+</span><h3>No visit notes yet</h3><p>Write what your doctor said, and what changed, while it is fresh.</p><button class="button secondary" data-modal="visit">Add visit note</button></div>`}`;
  }
  if (doctorTab === "questions") {
    const options = x.doctors.map(d => `<option value="${esc(d.id)}">${esc(d.name)}</option>`).join("");
    const rows = x.questions.map(q => {
      const association = q.doctorId && doctorName(q.doctorId) ? ` - ${esc(doctorName(q.doctorId))}` : " - Unassigned";
      const date = q.date ? ` - ${fmtDate(q.date)}` : "";
      return `<div class="question-row"><label class="check"><input type="checkbox" data-ready="${q.id}" ${q.ready ? "checked" : ""}><span><b>${esc(q.text)}</b><small>${association}${date}</small></span></label><button class="text-button" data-edit-question="${q.id}">Edit</button><button class="icon-button danger-text" data-remove-question="${q.id}" aria-label="Remove question">x</button></div>`;
    }).join("");
    content = `<div class="card-heading"><h2>Ask at the next visit</h2></div><form id="question-form" class="question-form"><input name="question" placeholder="New question for the doctor" required><select name="doctorId" aria-label="Question doctor" data-question-doctor><option value="">No doctor assigned</option>${options}</select><label class="question-date">For date (optional)<input name="date" type="date" data-question-date></label><button class="button">Add</button></form>${rows || `<div class="empty-state"><span>?</span><h3>No questions yet</h3><p>Park questions here as they come to you - choose the ones you want to include in your report.</p></div>`}`;
  }
  if (doctorTab === "documents") {
    content = `<div class="card-heading"><h2>Add a document</h2></div><form id="document-form" class="form document-form"><label>Category<select name="category"><option>Lab</option><option>Prescription</option><option>Scan</option><option>Other</option></select></label><label>Label (optional)<input name="label"></label><label>Document date<input name="date" type="date" value="${today}"></label><label class="upload-box">Choose PDF or photo (max 5 MB)<input name="file" type="file" accept="image/*,.pdf" hidden></label><button class="button">Save document</button></form><p class="muted small-note">Files are saved on this device only.</p><h3>Saved documents - ${x.documents.length} of 20</h3>${x.documents.length ? x.documents.map(d => `<div class="entry-row"><span><b>${esc(d.label || d.name)}</b><small>${esc(d.category)} - ${fmtDate(d.date)} - ${Math.round(d.size / 1024)} KB</small></span><button class="button secondary" data-view-doc="${d.id}">View</button><button class="icon-button danger-text" data-remove-doc="${d.id}" aria-label="Delete document">x</button></div>`).join("") : `<p class="empty">No documents saved yet.</p>`}`;
  }
  return `<div class="page-title"><div><h1>Doctors</h1><p>People, questions and notes for your care.</p></div></div><div class="tabs">${tabs.map(([key, label]) => `<button class="tab ${doctorTab === key ? "active" : ""}" data-doctor-tab="${key}">${label}</button>`).join("")}</div><section class="card">${content}</section>`;
}
