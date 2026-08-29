/* M4L V102.12.8 - Academic Calendar batch editing and simplified Islamic-date delivery. */

import { isActivePlatformValue, normalizePlatformIdentifier } from "./platform-schema.js";

export const ACADEMY_CALENDAR_EVENT_TYPES = Object.freeze(["TERM", "ISLAMIC_DAY", "PUBLIC_HOLIDAY"]);
export const ACADEMY_CALENDAR_IMPACTS = Object.freeze(["INFORMATION", "NO_TEACHING"]);
export const ISLAMIC_EVENT_DESCRIPTIONS = Object.freeze([
  "Laylatul-Bara'ah (Eve)",
  "First Taraweeh",
  "First Fast", // legacy V102.12.1 rows remain valid but are no longer displayed.
  "Eid-ul-Fitr",
  "Eid-ul-Adha",
  "New Islamic Year",
  "‘Aashuraa"
]);
export const HIDDEN_ISLAMIC_EVENT_DESCRIPTIONS = Object.freeze(["First Fast"]);

const FIXED_PUBLIC_HOLIDAYS = Object.freeze([
  [1, 1], [3, 21], [4, 27], [5, 1], [6, 16], [8, 9], [9, 24], [12, 16], [12, 25], [12, 26]
]);

export function buildAcademyCalendarEvents(rows, startDate, endDate) {
  const start = requireIsoDate(startDate, "Calendar start date");
  const end = requireIsoDate(endDate, "Calendar end date");
  if (end < start) throw new Error("Calendar end date cannot precede start date");

  const sourceRows = Array.isArray(rows) ? rows : [];
  const persisted = sourceRows
    .filter(row => isActivePlatformValue(row.Active))
    .filter(row => normalizePlatformIdentifier(row.EventType) !== "PUBLIC_HOLIDAY")
    .map(mapAcademyCalendarRow)
    .filter(event => !isHiddenIslamicEvent(event))
    .filter(event => rangesOverlap(event.startDate, event.endDate, start, end));

  const publicHolidays = buildEffectivePublicHolidays(sourceRows, start, end);
  const periods = deriveIslamicPeriods(sourceRows)
    .filter(event => rangesOverlap(event.startDate, event.endDate, start, end));

  return [...persisted, ...publicHolidays, ...periods]
    .sort(compareCalendarEvents)
    .map(event => Object.freeze({ ...event }));
}

export function mapAcademyCalendarRow(row) {
  const eventType = normalizePlatformIdentifier(row?.EventType);
  const description = String(row?.Description || "").trim();
  const startDate = String(row?.StartDate || "").trim();
  const event = {
    id: String(row?.CalendarEventID || "").trim(),
    eventType,
    description,
    islamicDate: eventType === "ISLAMIC_DAY" ? islamicDateLabel(description, startDate) : "",
    startDate,
    endDate: String(row?.EndDate || row?.StartDate || "").trim(),
    active: isActivePlatformValue(row?.Active),
    source: eventType === "ISLAMIC_DAY" ? "ISLAMIC_REFERENCE" : eventType === "PUBLIC_HOLIDAY" ? "PUBLIC_HOLIDAY_OVERRIDE" : "ADMIN",
    editable: true,
    derived: false,
    rowNumber: Number(row?._rowNumber) || 0
  };
  // V102.12.8: Islamic dates are informational reference dates. Legacy Sheet
  // columns remain untouched, but AlternateDate and TeachingImpact are no longer
  // part of Islamic-date UI/API delivery.
  if (eventType !== "ISLAMIC_DAY") {
    event.alternateDate = String(row?.AlternateDate || "").trim();
    event.teachingImpact = normalizeTeachingImpact(row?.TeachingImpact);
  }
  return event;
}

export function generateSouthAfricanPublicHolidays(yearInput) {
  const year = Number(yearInput);
  if (!Number.isInteger(year) || year < 1900 || year > 2200) return [];

  const dates = new Set(FIXED_PUBLIC_HOLIDAYS.map(([month, day]) => isoDate(year, month, day)));
  const easterSunday = easterSundayDate(year);
  dates.add(addDays(easterSunday, -2)); // Good Friday
  dates.add(addDays(easterSunday, 1)); // Family Day

  for (const date of [...dates]) {
    if (dayOfWeek(date) === 0) dates.add(addDays(date, 1));
  }

  return [...dates].sort().map(date => publicHolidayEvent({
    id: `SA-PUBLIC-HOLIDAY-${date}`,
    date,
    source: "SA_PUBLIC_HOLIDAY",
    derived: true,
    rowNumber: 0
  }));
}

export function buildEffectivePublicHolidays(rows, startDate, endDate) {
  const sourceRows = Array.isArray(rows) ? rows : [];
  const overrides = sourceRows
    .filter(row => normalizePlatformIdentifier(row.EventType) === "PUBLIC_HOLIDAY")
    .map(mapAcademyCalendarRow);
  const suppressedDates = new Set(overrides.filter(event => !event.active).map(event => event.startDate));
  const activeOverrides = overrides.filter(event => event.active);
  const years = yearsInRange(startDate, endDate);
  const byDate = new Map();

  for (const event of years.flatMap(generateSouthAfricanPublicHolidays)) {
    if (!suppressedDates.has(event.startDate)) byDate.set(event.startDate, event);
  }
  for (const event of activeOverrides) {
    byDate.set(event.startDate, publicHolidayEvent({
      id: event.id,
      date: event.startDate,
      description: event.description,
      source: "PUBLIC_HOLIDAY_OVERRIDE",
      derived: false,
      rowNumber: event.rowNumber
    }));
  }

  return [...byDate.values()]
    .filter(event => rangesOverlap(event.startDate, event.endDate, startDate, endDate))
    .sort(compareCalendarEvents);
}

export function deriveIslamicPeriods(rows) {
  const active = (Array.isArray(rows) ? rows : [])
    .filter(row => isActivePlatformValue(row.Active) && normalizePlatformIdentifier(row.EventType) === "ISLAMIC_DAY")
    .map(mapAcademyCalendarRow)
    .filter(event => !isHiddenIslamicEvent(event));
  const byYear = new Map();
  for (const event of active) {
    const year = Number(String(event.startDate || "").slice(0, 4));
    if (!Number.isInteger(year)) continue;
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(event);
  }

  const periods = [];
  for (const [year, events] of byYear) {
    const firstTaraweeh = events.find(event => event.description === "First Taraweeh");
    const eidFitr = events.find(event => event.description === "Eid-ul-Fitr");
    const ramadaanStart = firstTaraweeh ? addDays(firstTaraweeh.startDate, 1) : "";
    if (ramadaanStart && eidFitr && ramadaanStart < eidFitr.startDate) {
      periods.push({
        id: `ISLAMIC-PERIOD-RAMADAAN-${year}`,
        eventType: "RELIGIOUS_PERIOD",
        description: "Ramadaan",
        islamicDate: "1 Ramadaan",
        startDate: ramadaanStart,
        endDate: addDays(eidFitr.startDate, -1),
        alternateDate: "",
        teachingImpact: "INFORMATION",
        source: "DERIVED_ISLAMIC_REFERENCE",
        editable: false,
        derived: true,
        rowNumber: 0
      });
    }

    const eidAdha = events.find(event => event.description === "Eid-ul-Adha");
    if (eidAdha) {
      periods.push({
        id: `ISLAMIC-PERIOD-ZUL-HIJJAH-${year}`,
        eventType: "RELIGIOUS_PERIOD",
        description: "First 10 Days of Zul Hijjah",
        islamicDate: "1–10 Zul Hijjah",
        startDate: addDays(eidAdha.startDate, -9),
        endDate: eidAdha.startDate,
        alternateDate: "",
        teachingImpact: "INFORMATION",
        source: "DERIVED_ISLAMIC_REFERENCE",
        editable: false,
        derived: true,
        rowNumber: 0
      });
    }
  }
  return periods.sort(compareCalendarEvents);
}

export function validateAcademyCalendarRecord(record) {
  const type = normalizePlatformIdentifier(record?.EventType);
  const description = String(record?.Description || "").trim();
  const startDate = String(record?.StartDate || "").trim();
  const endDate = String(record?.EndDate || startDate).trim();
  const alternateDate = String(record?.AlternateDate || "").trim();
  const impact = normalizeTeachingImpact(record?.TeachingImpact);

  if (!ACADEMY_CALENDAR_EVENT_TYPES.includes(type)) throw new Error("AcademyCalendar EventType must be TERM, ISLAMIC_DAY or PUBLIC_HOLIDAY");
  if (!description) throw new Error("AcademyCalendar Description is required");
  requireIsoDate(startDate, "AcademyCalendar StartDate");
  requireIsoDate(endDate, "AcademyCalendar EndDate");
  if (endDate < startDate) throw new Error("AcademyCalendar EndDate cannot precede StartDate");
  if (alternateDate) requireIsoDate(alternateDate, "AcademyCalendar AlternateDate");
  if (!ACADEMY_CALENDAR_IMPACTS.includes(impact)) throw new Error("AcademyCalendar TeachingImpact is invalid");
  if (type === "ISLAMIC_DAY" && startDate !== endDate) throw new Error("AcademyCalendar ISLAMIC_DAY rows must use the same StartDate and EndDate");
  if (type === "ISLAMIC_DAY" && !ISLAMIC_EVENT_DESCRIPTIONS.includes(description)) {
    throw new Error("AcademyCalendar Islamic description must match the reference document");
  }
  if (type === "PUBLIC_HOLIDAY") {
    if (startDate !== endDate) throw new Error("AcademyCalendar PUBLIC_HOLIDAY rows must use the same StartDate and EndDate");
    if (impact !== "NO_TEACHING") throw new Error("AcademyCalendar PUBLIC_HOLIDAY TeachingImpact must be NO_TEACHING");
  }
  return true;
}

export function normalizeTeachingImpact(value) {
  const normalized = normalizePlatformIdentifier(value || "INFORMATION");
  return ACADEMY_CALENDAR_IMPACTS.includes(normalized) ? normalized : "INFORMATION";
}

export function eventsOnDate(events, date) {
  return (Array.isArray(events) ? events : []).filter(event => (
    String(event.startDate || "") <= date && String(event.endDate || "") >= date
  ));
}

export function noTeachingEventsOnDates(rows, dates) {
  const wanted = [...new Set((Array.isArray(dates) ? dates : []).filter(isIsoDate))].sort();
  if (!wanted.length) return [];
  const events = buildAcademyCalendarEvents(rows, wanted[0], wanted[wanted.length - 1]);
  return wanted.flatMap(date => eventsOnDate(events, date)
    .filter(event => event.teachingImpact === "NO_TEACHING")
    .map(event => ({ date, description: event.description, eventType: event.eventType, eventId: event.id })));
}

export function isHiddenIslamicEvent(event) {
  return normalizePlatformIdentifier(event?.eventType || event?.EventType) === "ISLAMIC_DAY" &&
    HIDDEN_ISLAMIC_EVENT_DESCRIPTIONS.includes(String(event?.description || event?.Description || "").trim());
}

export function islamicDateLabel(descriptionInput, startDateInput) {
  const description = String(descriptionInput || "").trim();
  const date = String(startDateInput || "").trim();
  const year = Number(date.slice(0, 4));
  if (!Number.isInteger(year)) return "";
  const rollover = {
    2025: "2025-06-27",
    2026: "2026-06-17",
    2027: "2027-06-07",
    2028: "2028-05-26",
    2029: "2029-05-16",
    2030: "2030-05-05"
  }[year];
  const baseHijriYear = { 2025: 1446, 2026: 1447, 2027: 1448, 2028: 1449, 2029: 1450, 2030: 1451 }[year];
  if (!baseHijriYear) return "";
  const hijriYear = rollover && date >= rollover ? baseHijriYear + 1 : baseHijriYear;
  const label = {
    "Laylatul-Bara'ah (Eve)": "15 Sha'baan",
    "First Taraweeh": "1 Ramadaan",
    "First Fast": "1 Ramadaan",
    "Eid-ul-Fitr": "1 Shawwal",
    "Eid-ul-Adha": "10 Zul Hijjah",
    "New Islamic Year": "1 Muharram",
    "‘Aashuraa": "10 Muharram"
  }[description];
  return label ? `${label} ${hijriYear}` : "";
}

function publicHolidayEvent({ id, date, description = "Public Holiday", source, derived, rowNumber }) {
  return {
    id,
    eventType: "PUBLIC_HOLIDAY",
    description: String(description || "Public Holiday").trim() || "Public Holiday",
    islamicDate: "",
    startDate: date,
    endDate: date,
    alternateDate: "",
    teachingImpact: "NO_TEACHING",
    active: true,
    source,
    editable: true,
    derived: Boolean(derived),
    rowNumber: Number(rowNumber) || 0
  };
}

function compareCalendarEvents(left, right) {
  return String(left.startDate || "").localeCompare(String(right.startDate || "")) ||
    calendarTypeRank(left.eventType) - calendarTypeRank(right.eventType) ||
    String(left.description || "").localeCompare(String(right.description || ""));
}

function calendarTypeRank(type) {
  return ({ PUBLIC_HOLIDAY: 1, ISLAMIC_DAY: 2, RELIGIOUS_PERIOD: 3, TERM: 4 })[type] || 9;
}

function yearsInRange(start, end) {
  const startYear = Number(start.slice(0, 4));
  const endYear = Number(end.slice(0, 4));
  const years = [];
  for (let year = startYear; year <= endYear; year += 1) years.push(year);
  return years;
}

function easterSundayDate(year) {
  // Anonymous Gregorian algorithm.
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return isoDate(year, month, day);
}

function dayOfWeek(dateText) {
  return parseDate(dateText).getUTCDay();
}

function addDays(dateText, amount) {
  const date = parseDate(dateText);
  date.setUTCDate(date.getUTCDate() + Number(amount || 0));
  return formatDate(date);
}

function parseDate(value) {
  const [year, month, day] = String(value).split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function formatDate(date) {
  return isoDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function isoDate(year, month, day) {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function requireIsoDate(value, label) {
  if (!isIsoDate(value)) throw new Error(`${label} must use YYYY-MM-DD`);
  return String(value);
}

function isIsoDate(value) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const date = parseDate(text);
  return Number.isFinite(date.getTime()) && formatDate(date) === text;
}

function rangesOverlap(leftStart, leftEnd, rightStart, rightEnd) {
  return String(leftStart || "") <= String(rightEnd || "") && String(leftEnd || leftStart || "") >= String(rightStart || "");
}
