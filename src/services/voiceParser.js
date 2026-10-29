import { data, TRACKERS } from "../state.js";
import { unit } from "../utils.js";

/**
 * @typedef {Object} VoiceParseResult
 * @property {boolean} success
 * @property {string|null} tracker
 * @property {string} value
 * @property {string} unit
 * @property {string} note
 * @property {string} transcript
 * @property {string} message
 */

const numberPattern = "([0-9]+(?:[.,][0-9]+)?)";
const trackerAliases = [
  ["Blood pressure", /\b(?:blood\s+pressure|bp)\b/i],
  ["Blood glucose", /\b(?:blood\s+glucose|glucose|blood\s+sugar)\b/i],
  ["Weight", /\b(?:weight|weigh)\b/i],
  ["Water", /\b(?:water|hydration)\b/i],
  ["Mood", /\b(?:mood|feeling)\b/i],
  ["Symptom", /\b(?:symptom|symptoms)\b/i],
  ["Waist", /\b(?:waist)\b/i],
  ["Calories", /\b(?:calories|calorie)\b/i]
];

function failure(transcript, message) {
  return { success: false, tracker: null, value: "", unit: "", note: "", transcript, message };
}

function normalizedNumber(value) {
  return value.replace(",", ".");
}

function configuredUnit(tracker) {
  return unit(tracker) || (tracker === "Water" ? "ml" : "");
}

function explicitUnit(text, aliases) {
  const match = text.match(aliases);
  return match ? match[2].toLowerCase() : "";
}

function unitMismatch(tracker, spokenUnit) {
  if (!spokenUnit) return "";
  const target = configuredUnit(tracker).toLowerCase();
  const accepted = {
    kg: ["kg", "kilogram", "kilograms", "kilo", "kilos"],
    lb: ["lb", "lbs", "pound", "pounds"],
    "mg/dl": ["mg/dl", "mg per dl", "milligrams per deciliter"],
    ml: ["ml", "milliliter", "milliliters", "millilitre", "millilitres", "liter", "liters", "litre", "litres"],
    cm: ["cm", "centimeter", "centimeters", "centimetre", "centimetres"],
    kcal: ["kcal", "calorie", "calories"]
  };
  if (accepted[target]?.includes(spokenUnit)) return "";
  return `The spoken unit (${spokenUnit}) does not match MediGO's configured ${target || "unit"} for ${tracker}.`;
}

function parseBloodPressure(transcript) {
  const match = transcript.match(new RegExp(`(?:blood\\s+pressure|bp)\\s+${numberPattern}\\s+(?:over|by|slash)\\s+${numberPattern}`, "i"));
  if (!match) return null;
  const systolic = Number(normalizedNumber(match[1])), diastolic = Number(normalizedNumber(match[2]));
  if (systolic < 70 || systolic > 250 || diastolic < 40 || diastolic > 150 || systolic <= diastolic) {
    return failure(transcript, "Blood pressure must have a valid systolic/diastolic reading, such as 120 over 80.");
  }
  return { success: true, tracker: "Blood pressure", value: `${systolic}/${diastolic}`, unit: "mmHg", note: "", transcript, message: "Blood pressure recognized. Review the fields before saving." };
}

export function parseHealthVoiceInput(rawText) {
  const transcript = String(rawText ?? "").trim();
  if (!transcript) return failure("", "No speech was captured. Try saying a tracker and its value.");

  const bloodPressure = parseBloodPressure(transcript);
  if (bloodPressure) return bloodPressure;

  const found = trackerAliases.filter(([, pattern]) => pattern.test(transcript));
  if (found.length !== 1) {
    return failure(transcript, found.length ? "I heard more than one tracker. Say one tracker and one value, then try again." : "Say one supported tracker, such as weight, blood pressure, glucose, water, mood, or symptom.");
  }

  const [tracker] = found[0];
  if (!TRACKERS.includes(tracker)) return failure(transcript, "That tracker is not supported by MediGO.");

  if (tracker === "Symptom") {
    const symptom = transcript.replace(found[0][1], "").replace(/^(?:is|of|:)?\s*/i, "").trim();
    if (!symptom) return failure(transcript, "Say the symptom after the word symptom, for example: symptom headache after lunch.");
    const context = symptom.match(/^(.*?)\s+(after|before|during|since|with)\s+(.+)$/i);
    return {
      success: true,
      tracker,
      value: context ? context[1].trim() : symptom,
      unit: "",
      note: context ? `${context[2]} ${context[3].trim()}` : "",
      transcript,
      message: "Symptom recognized. Review the fields before saving."
    };
  }

  const spokenUnit = explicitUnit(transcript, new RegExp(`${numberPattern}\\s*(kg|kilograms?|kilos?|lb|lbs|pounds?|mg\\/dl|mg\\s+per\\s+dl|milligrams?\\s+per\\s+deciliter|ml|millilit(?:er|re)s?|liters?|litres?|cm|centimet(?:er|re)s?|kcal|calories?)\\b`, "i"));
  const mismatch = unitMismatch(tracker, spokenUnit);
  if (mismatch) return failure(transcript, mismatch);

  const valueMatch = transcript.match(new RegExp(`${trackerAliases.find(([name]) => name === tracker)[1].source}\\s+(?:is\\s+|at\\s+|of\\s+)?${numberPattern}`, "i"));
  if (!valueMatch) {
    return failure(transcript, `I heard ${tracker}, but not one clear numeric value. Say it again with the value.`);
  }

  let value = normalizedNumber(valueMatch[1]);
  if (tracker === "Mood" && (Number(value) < 1 || Number(value) > 5)) {
    return failure(transcript, "Mood must be a number from 1 to 5.");
  }
  const spokenTail = transcript.slice((valueMatch.index || 0) + valueMatch[0].length).trim();
  const noteMatch = spokenTail.match(/^(?:kg|kilograms?|kilos?|lb|lbs|pounds?|mg\/dl|mg\s+per\s+dl|milligrams?\s+per\s+deciliter|ml|millilit(?:er|re)s?|liters?|litres?|cm|centimet(?:er|re)s?|kcal|calories?)\s+(after|before|during|since|with)\s+(.+)$/i);
  const note = noteMatch ? `${noteMatch[1]} ${noteMatch[2].trim()}` : "";
  if (tracker === "Water" && /^liters?$|^litres?$/i.test(spokenUnit)) {
    value = String(Number(value) * 1000);
  }

  const targetUnit = configuredUnit(tracker);
  const conversionMessage = tracker === "Water" && /^liters?$|^litres?$/i.test(spokenUnit) ? " Liters were converted to milliliters." : "";
  return {
    success: true,
    tracker,
    value,
    unit: targetUnit,
    note,
    transcript,
    message: `${tracker} recognized.${conversionMessage} Review the fields before saving.`
  };
}
