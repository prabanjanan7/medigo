/* MediGO — private, local-first health record and report builder. */
export const KEY = "medigo-data-v1";
export const today = new Date().toISOString().slice(0, 10);
export const TRACKERS = ["Weight", "Blood pressure", "Blood glucose", "Water", "Waist", "Calories", "Mood", "Symptom"];
export const SECTIONS = [["profile", "Profile & emergency info", "Name, age, blood group, allergies, contacts"], ["conditions", "Conditions", "The health categories you track"], ["medications", "Current medications & adherence", "Dose, schedule, taken/missed/skipped"], ["vitals", "Vitals per condition", "Summary stats and trend chart per vital"], ["bmi", "BMI & weight", "Latest weight, BMI and trend"], ["mood", "Mood summary", "Average mood and low-mood days"], ["symptoms", "Symptoms & notes", "Free-text entries"], ["questions", "Questions for doctor", "Only the questions you checked"], ["notes", "Visit notes", "Advice from previous visits"], ["documents", "Attached documents", "Images inline, PDFs listed"]];
export const empty = () => ({ disclaimerAccepted: false, settings: { largeText: false, highContrast: false, weight: "kg", height: "cm", glucose: "mg/dL", asianBmi: true }, profiles: [], activeProfileId: null });
export let data = load();

export function load() { try { const x = JSON.parse(localStorage.getItem(KEY)) || empty(); x.settings = { ...empty().settings, ...(x.settings || {}) }; x.profiles = (x.profiles || []).map(old => { const entries = old.entries || old.trackerEntries || old.readings || []; return { ...old, conditions: old.conditions || old.categories || [], contacts: old.contacts || [], allergies: old.allergies || "", medications: (old.medications || []).map(m => ({ ...m, dose: m.dose || m.strength || "", frequency: m.frequency || m.schedule || "Daily", times: m.times || [] })), doses: old.doses || {}, entries: entries.map(e => ({ ...e, tracker: ({ weight: "Weight", bp: "Blood pressure", glucose: "Blood glucose", "blood pressure": "Blood pressure", "blood glucose": "Blood glucose", waist: "Waist", calories: "Calories", mood: "Mood", symptom: "Symptom", water: "Water" })[String(e.tracker || e.type || "").toLowerCase()] || e.tracker || e.type || "Weight" })), waterGoal: old.waterGoal || 2000, doctors: (old.doctors || []).map(d => ({ ...d, specialty: d.specialty || "", phone: d.phone || d.note || "", phoneCountry: d.phoneCountry || "+91", notes: d.notes || "" })), questions: old.questions || [], visitNotes: old.visitNotes || [], documents: old.documents || [] }; }); return x; } catch { return empty(); } }
export function save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { alert("MediGO could not save this change. Check available device storage."); } }
export const p = () => data.profiles.find(x => x.id === data.activeProfileId);
export const uid = () => crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
export const esc = x => String(x ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
export const fmtDate = d => new Date(`${d}T12:00:00`).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
export const entryName = t => t === "Blood pressure" ? "BP" : t;

export function replaceData(next) { data = next; }
