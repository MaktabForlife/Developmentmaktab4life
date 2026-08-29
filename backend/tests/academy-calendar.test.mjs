import assert from "node:assert/strict";
import {
  buildAcademyCalendarEvents,
  deriveIslamicPeriods,
  generateSouthAfricanPublicHolidays,
  islamicDateLabel,
  validateAcademyCalendarRecord
} from "../src/lib/academy-calendar.js";

const holidays2026 = generateSouthAfricanPublicHolidays(2026);
const holidayDates = new Set(holidays2026.map(item => item.startDate));
assert.equal(holidays2026.every(item => item.description === "Public Holiday"), true);
assert.equal(holidays2026.every(item => item.teachingImpact === "NO_TEACHING"), true);
assert.equal(holidays2026.every(item => item.editable === true), true, "generated Public Holidays must be editable through overrides");
assert.equal(holidayDates.has("2026-04-03"), true, "Good Friday must be generated from Easter");
assert.equal(holidayDates.has("2026-04-06"), true, "Family Day must be generated from Easter");
assert.equal(holidayDates.has("2026-08-09"), true, "The actual Sunday public holiday remains a public holiday");
assert.equal(holidayDates.has("2026-08-10"), true, "The following Monday must also be a public holiday when the holiday falls on Sunday");

const islamicRows = [
  { CalendarEventID: "A0", EventType: "ISLAMIC_DAY", Description: "First Taraweeh", StartDate: "2026-02-18", EndDate: "2026-02-18", AlternateDate: "2026-02-19", TeachingImpact: "INFORMATION", Active: true },
  { CalendarEventID: "A1", EventType: "ISLAMIC_DAY", Description: "First Fast", StartDate: "2026-02-19", EndDate: "2026-02-19", AlternateDate: "2026-02-20", TeachingImpact: "INFORMATION", Active: true },
  { CalendarEventID: "A2", EventType: "ISLAMIC_DAY", Description: "Eid-ul-Fitr", StartDate: "2026-03-21", EndDate: "2026-03-21", AlternateDate: "2026-03-20", TeachingImpact: "INFORMATION", Active: true },
  { CalendarEventID: "A3", EventType: "ISLAMIC_DAY", Description: "Eid-ul-Adha", StartDate: "2026-05-28", EndDate: "2026-05-28", AlternateDate: "2026-05-29", TeachingImpact: "INFORMATION", Active: true },
  { CalendarEventID: "T1", EventType: "TERM", Description: "Term 3", StartDate: "2026-08-03", EndDate: "2026-11-30", AlternateDate: "", TeachingImpact: "INFORMATION", Active: true }
];
const periods = deriveIslamicPeriods(islamicRows);
const ramadaan = periods.find(item => item.description === "Ramadaan");
assert.deepEqual([ramadaan.startDate, ramadaan.endDate], ["2026-02-19", "2026-03-20"], "Ramadaan derives from First Taraweeh + 1 day after First Fast is removed from display");
const zulHijjah = periods.find(item => item.description === "First 10 Days of Zul Hijjah");
assert.deepEqual([zulHijjah.startDate, zulHijjah.endDate], ["2026-05-19", "2026-05-28"]);

const august = buildAcademyCalendarEvents(islamicRows, "2026-08-01", "2026-08-31");
assert.equal(august.some(item => item.eventType === "TERM" && item.description === "Term 3"), true);
assert.equal(august.some(item => item.eventType === "PUBLIC_HOLIDAY" && item.startDate === "2026-08-10"), true);

const february = buildAcademyCalendarEvents(islamicRows, "2026-02-01", "2026-02-28");
assert.equal(february.some(item => item.description === "First Fast"), false, "First Fast must no longer be displayed");
assert.equal(february.find(item => item.description === "First Taraweeh")?.islamicDate, "1 Ramadaan 1447");
assert.equal(islamicDateLabel("Eid-ul-Fitr", "2026-03-21"), "1 Shawwal 1447");
assert.equal(islamicDateLabel("New Islamic Year", "2026-06-17"), "1 Muharram 1448");
const legacyNoTeachingIslamic = buildAcademyCalendarEvents([
  { ...islamicRows[0], TeachingImpact: "NO_TEACHING", AlternateDate: "2026-02-17" }
], "2026-02-18", "2026-02-18")[0];
assert.equal(Object.hasOwn(legacyNoTeachingIslamic, "teachingImpact"), false, "Islamic dates must not deliver Teaching status/impact");
assert.equal(Object.hasOwn(legacyNoTeachingIslamic, "alternateDate"), false, "Alternate Islamic dates must not be delivered");


const publicOverrides = [
  ...islamicRows,
  { CalendarEventID: "PH-OFF", EventType: "PUBLIC_HOLIDAY", Description: "Public Holiday", StartDate: "2026-08-09", EndDate: "2026-08-09", AlternateDate: "", TeachingImpact: "NO_TEACHING", Active: false },
  { CalendarEventID: "PH-ADD", EventType: "PUBLIC_HOLIDAY", Description: "School Holiday", StartDate: "2026-08-12", EndDate: "2026-08-12", AlternateDate: "", TeachingImpact: "NO_TEACHING", Active: true }
];
const overriddenAugust = buildAcademyCalendarEvents(publicOverrides, "2026-08-01", "2026-08-31");
assert.equal(overriddenAugust.some(item => item.eventType === "PUBLIC_HOLIDAY" && item.startDate === "2026-08-09"), false, "inactive override suppresses generated Public Holiday");
assert.equal(overriddenAugust.some(item => item.eventType === "PUBLIC_HOLIDAY" && item.startDate === "2026-08-12" && item.description === "School Holiday"), true, "active override adds an editable Holiday description");

assert.equal(validateAcademyCalendarRecord(islamicRows[0]), true);
assert.equal(validateAcademyCalendarRecord(publicOverrides.at(-1)), true);
assert.throws(() => validateAcademyCalendarRecord({ ...islamicRows[0], Description: "Changed description" }), /must match the reference document/);
assert.equal(validateAcademyCalendarRecord({ ...publicOverrides.at(-1), Description: "Heritage Day" }), true, "Holiday descriptions are editable");
assert.throws(() => validateAcademyCalendarRecord({ ...islamicRows[3], EndDate: "2026-05-27" }), /cannot precede/);

console.log("V102.12.8 Academic Calendar informational Islamic delivery and editable Holiday override tests passed.");
