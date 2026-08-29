import assert from "node:assert/strict";
import {
  buildAcademyCalendarEvents,
  deriveIslamicPeriods,
  generateSouthAfricanPublicHolidays,
  validateAcademyCalendarRecord
} from "../src/lib/academy-calendar.js";

const holidays2026 = generateSouthAfricanPublicHolidays(2026);
const holidayDates = new Set(holidays2026.map(item => item.startDate));
assert.equal(holidays2026.every(item => item.description === "Public Holiday"), true);
assert.equal(holidays2026.every(item => item.teachingImpact === "NO_TEACHING"), true);
assert.equal(holidayDates.has("2026-04-03"), true, "Good Friday must be generated from Easter");
assert.equal(holidayDates.has("2026-04-06"), true, "Family Day must be generated from Easter");
assert.equal(holidayDates.has("2026-08-09"), true, "The actual Sunday public holiday remains a public holiday");
assert.equal(holidayDates.has("2026-08-10"), true, "The following Monday must also be a public holiday when the holiday falls on Sunday");

const islamicRows = [
  { CalendarEventID: "A1", EventType: "ISLAMIC_DAY", Description: "First Fast", StartDate: "2026-02-19", EndDate: "2026-02-19", AlternateDate: "2026-02-20", TeachingImpact: "INFORMATION", Active: true },
  { CalendarEventID: "A2", EventType: "ISLAMIC_DAY", Description: "Eid-ul-Fitr", StartDate: "2026-03-21", EndDate: "2026-03-21", AlternateDate: "2026-03-20", TeachingImpact: "INFORMATION", Active: true },
  { CalendarEventID: "A3", EventType: "ISLAMIC_DAY", Description: "Eid-ul-Adha", StartDate: "2026-05-28", EndDate: "2026-05-28", AlternateDate: "2026-05-29", TeachingImpact: "INFORMATION", Active: true },
  { CalendarEventID: "T1", EventType: "TERM", Description: "Term 3", StartDate: "2026-08-03", EndDate: "2026-11-30", AlternateDate: "", TeachingImpact: "INFORMATION", Active: true }
];
const periods = deriveIslamicPeriods(islamicRows);
const ramadaan = periods.find(item => item.description === "Ramadaan");
assert.deepEqual([ramadaan.startDate, ramadaan.endDate], ["2026-02-19", "2026-03-20"]);
const zulHijjah = periods.find(item => item.description === "First 10 Days of Zul Hijjah");
assert.deepEqual([zulHijjah.startDate, zulHijjah.endDate], ["2026-05-19", "2026-05-28"]);

const august = buildAcademyCalendarEvents(islamicRows, "2026-08-01", "2026-08-31");
assert.equal(august.some(item => item.eventType === "TERM" && item.description === "Term 3"), true);
assert.equal(august.some(item => item.eventType === "PUBLIC_HOLIDAY" && item.startDate === "2026-08-10"), true);

assert.equal(validateAcademyCalendarRecord(islamicRows[0]), true);
assert.throws(() => validateAcademyCalendarRecord({ ...islamicRows[0], Description: "Changed description" }), /must match the reference document/);
assert.throws(() => validateAcademyCalendarRecord({ ...islamicRows[3], EndDate: "2026-08-02" }), /cannot precede/);

console.log("V102.12.1 Academy Calendar date generation and validation tests passed.");
