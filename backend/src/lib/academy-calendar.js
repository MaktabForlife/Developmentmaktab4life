/* M4L V102.12.1 - Academy Calendar date generation and presentation helpers. */

import { isActivePlatformValue, normalizePlatformIdentifier } from "./platform-schema.js";

export const ACADEMY_CALENDAR_EVENT_TYPES = Object.freeze(["TERM", "ISLAMIC_DAY"]);
export const ACADEMY_CALENDAR_IMPACTS = Object.freeze(["INFORMATION", "NO_TEACHING"]);
export const ISLAMIC_EVENT_DESCRIPTIONS = Object.freeze([
  "Laylatul-Bara'ah (Eve)",
  "First Taraweeh",
  "First Fast",
  "Eid-ul-Fitr",
  "Eid-ul-Adha",
  "New Islamic Year",
  "‘Aashuraa"
]);

const FIXED_PUBLIC_HOLIDAYS = Object.freeze([
  [1, 1], [3, 21], [4, 27], [5, 1], [6, 16], [8, 9], [9, 24], [12, 16], [12, 25], [12, 26]
]);

export function buildAcademyCalendarEvents(rows, startDate, endDate) {
  const start = requireIsoDate(startDate, "Calendar start date");
  const end = requireIsoDate(endDate, "Calendar end date");
  if (end < start) throw new Error("Calendar end date cannot precede start date");

  const persisted = (Array.isArray(rows) ? rows : [])
    .filter(row => isActivePlatformValue(row.Active))
    .map(mapAcademyCalendarRow)
    .filter(event => rangesOverlap(event.startDate, event.endDate, start, end));

  const years = yearsInRange(start, end);
  const publicHolidays = years.flatMap(generateSouthAfricanPublicHolidays)
    .filter(event => rangesOverlap(event.startDate, event.endDate, start, end));
  const periods = deriveIslamicPeriods(rows)
    .filter(event => rangesOverlap(event.startDate, event.endDate, start, end));

  return [...persisted, ...publicHolidays, ...periods]
    .sort(compareCalendarEvents)
    .map(event => Object.freeze({ ...event }));
}

export function mapAcademyCalendarRow(row) {
  const eventType = normalizePlatformIdentifier(row?.EventType);
  return {
    id: String(row?.CalendarEventID || "").trim(),
    eventType,
    description: String(row?.Description || "").trim(),
    startDate: String(row?.StartDate || "").trim(),
    endDate: String(row?.EndDate || row?.StartDate || "").trim(),
    alternateDate: String(row?.AlternateDate || "").trim(),
    teachingImpact: normalizeTeachingImpact(row?.TeachingImpact),
    active: isActivePlatformValue(row?.Active),
    source: eventType === "ISLAMIC_DAY" ? "ISLAMIC_REFERENCE" : "ADMIN",
    editable: true,
    derived: false,
    rowNumber: Number(row?._rowNumber) || 0
  };
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

  return [...dates].sort().map(date => ({
    id: `SA-PUBLIC-HOLIDAY-${date}`,
    eventType: "PUBLIC_HOLIDAY",
    description: "Public Holiday",
    startDate: date,
    endDate: date,
    alternateDate: "",
    teachingImpact: "NO_TEACHING",
    source: "SA_PUBLIC_HOLIDAY",
    editable: false,
    derived: true,
    rowNumber: 0
  }));
}

export function deriveIslamicPeriods(rows) {
  const active = (Array.isArray(rows) ? rows : [])
    .filter(row => isActivePlatformValue(row.Active) && normalizePlatformIdentifier(row.EventType) === "ISLAMIC_DAY")
    .map(mapAcademyCalendarRow);
  const byYear = new Map();
  for (const event of active) {
    const year = Number(String(event.startDate || "").slice(0, 4));
    if (!Number.isInteger(year)) continue;
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(event);
  }

  const periods = [];
  for (const [year, events] of byYear) {
    const firstFast = events.find(event => event.description === "First Fast");
    const eidFitr = events.find(event => event.description === "Eid-ul-Fitr");
    if (firstFast && eidFitr && firstFast.startDate < eidFitr.startDate) {
      periods.push({
        id: `ISLAMIC-PERIOD-RAMADAAN-${year}`,
        eventType: "RELIGIOUS_PERIOD",
        description: "Ramadaan",
        startDate: firstFast.startDate,
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

  if (!ACADEMY_CALENDAR_EVENT_TYPES.includes(type)) throw new Error("AcademyCalendar EventType must be TERM or ISLAMIC_DAY");
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
