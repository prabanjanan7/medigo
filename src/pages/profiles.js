import { data, save, uid, esc, today } from "../state.js";
import { age } from "../utils.js";

const BLOOD_GROUPS = ["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"];

// Page-local UI state: "" | "new" | <profile id> while the form is open
let editing = "";
// Profile id waiting for an in-page "Yes, delete" confirmation
let confirming = "";

export function resetProfiles() { editing = ""; confirming = ""; }

function profileForm(x) {
  const isNew = !x;
  const v = x || { name: "", dob: "", blood: "", conditions: [], allergies: "", guardian: false };
  return `<section class="card"><h2>${isNew ? "Add a profile" : "Edit profile"}</h2>
<form id="profile-edit-form" class="form" data-profile-id="${esc(v.id || "")}" novalidate>
  <label>Profile name<input name="name" value="${esc(v.name)}" placeholder="Name" autocomplete="off"></label>
  <p class="form-error" data-profile-error></p>
  <div class="form-row">
    <label>Date of birth<input name="dob" type="date" max="${today}" value="${esc(v.dob || "")}"></label>
    <label>Blood group<select name="blood"><option value="">Not specified</option>${BLOOD_GROUPS.map(b => `<option ${v.blood === b ? "selected" : ""}>${b}</option>`).join("")}</select></label>
  </div>
  <label>Conditions or health categories<input name="conditions" value="${esc((v.conditions || []).join(", "))}" placeholder="Optional, separate with commas"></label>
  <label>Allergies<input name="allergies" value="${esc(v.allergies || "")}" placeholder="None recorded"></label>
  <label class="check"><input name="guardian" type="checkbox" ${v.guardian ? "checked" : ""}> I help manage this profile for someone else.</label>
  <div class="actions"><button type="button" class="button ghost" data-cancel-profile>Cancel</button><button class="button">${isNew ? "Add profile" : "Save changes"}</button></div>
</form></section>`;
}

function profileCard(x) {
  const active = x.id === data.activeProfileId;
  const meta = [x.dob ? `${age(x.dob)} years` : "", x.blood ? `Blood group ${x.blood}` : "", `${(x.entries || []).length} entries`, x.guardian ? "Managed for someone else" : ""].filter(Boolean).join(" · ");
  const del = confirming === x.id
    ? `<span class="profile-confirm">Delete all records for ${esc(x.name)}?</span><button class="button danger" data-confirm-delete="${esc(x.id)}">Yes, delete</button><button class="button ghost" data-cancel-delete>Keep</button>`
    : `<button class="button danger" data-delete-profile="${esc(x.id)}" aria-label="Delete ${esc(x.name)}">Delete</button>`;
  return `<article class="profile-card ${active ? "active" : ""}">
  <span class="avatar">${esc(x.name.slice(0, 1).toUpperCase())}</span>
  <div class="profile-info"><b>${esc(x.name)}${active ? `<span class="status-label taken">Active</span>` : ""}</b><small>${esc(meta)}</small></div>
  <div class="profile-actions">${active ? "" : `<button class="button" data-switch-profile="${esc(x.id)}">Switch</button>`}<button class="button secondary" data-edit-profile="${esc(x.id)}">Edit</button>${del}</div>
</article>`;
}

export function profilesView() {
  const target = editing && editing !== "new" ? data.profiles.find(x => x.id === editing) : null;
  const showForm = editing === "new" || Boolean(target);
  return `<div class="page-title"><div><h1>Profiles</h1><p>${data.profiles.length} on this device · switch, edit or add a person</p></div>${showForm ? "" : `<button class="button" data-new-profile>＋ Add profile</button>`}</div>${showForm ? profileForm(target) : ""}<section class="profile-list" aria-label="Profiles">${data.profiles.map(profileCard).join("")}</section>`;
}

/** Attach handlers. go(pageName) changes page and re-renders; refresh() just re-renders. */
export function wireProfiles({ go, refresh }) {
  const on = (sel, fn) => document.querySelectorAll(sel).forEach(el => el.onclick = () => fn(el));

  on("[data-new-profile]", () => { editing = "new"; confirming = ""; refresh(); });
  on("[data-edit-profile]", el => { editing = el.dataset.editProfile; confirming = ""; refresh(); window.scrollTo({ top: 0 }); });
  on("[data-cancel-profile]", () => { editing = ""; refresh(); });
  on("[data-switch-profile]", el => { data.activeProfileId = el.dataset.switchProfile; save(); resetProfiles(); go("home"); });
  on("[data-delete-profile]", el => { confirming = el.dataset.deleteProfile; refresh(); });
  on("[data-cancel-delete]", () => { confirming = ""; refresh(); });
  on("[data-confirm-delete]", el => {
    const id = el.dataset.confirmDelete;
    data.profiles = data.profiles.filter(z => z.id !== id);
    if (data.activeProfileId === id) data.activeProfileId = data.profiles[0]?.id || null;
    save(); resetProfiles();
    go(data.profiles.length ? "profiles" : "landing");
  });

  const form = document.querySelector("#profile-edit-form");
  if (!form) return;
  form.elements.name.focus({ preventScroll: true });
  form.addEventListener("submit", e => {
    e.preventDefault();
    const f = new FormData(form), id = form.dataset.profileId, name = String(f.get("name") || "").trim();
    if (!name) { form.querySelector("[data-profile-error]").textContent = "Enter a name for this profile."; form.elements.name.focus(); return; }
    const fields = {
      name,
      dob: f.get("dob") || "",
      blood: f.get("blood") || "",
      conditions: String(f.get("conditions") || "").split(",").map(s => s.trim()).filter(Boolean),
      allergies: String(f.get("allergies") || "").trim(),
      guardian: f.get("guardian") === "on"
    };
    const existing = id && data.profiles.find(z => z.id === id);
    if (existing) Object.assign(existing, fields);
    else {
      const q = { id: uid(), ...fields, height: "", entries: [], medications: [], doses: {}, doctors: [], questions: [], visitNotes: [], documents: [], contacts: [], waterGoal: 2000, waterTotal: 0 };
      data.profiles.push(q);
      data.activeProfileId = q.id;
    }
    save(); editing = ""; refresh();
  });
}