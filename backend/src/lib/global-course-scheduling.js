/* M4L V104.5 - Derived-by-default Global Course scheduling helpers. */

import { normalizePlatformIdentifier } from "./platform-schema.js";

export const COURSE_SCHEDULE_MODE_DERIVED = "DERIVED";
export const COURSE_SCHEDULE_MODE_EXPLICIT = "EXPLICIT";
export const COURSE_SCHEDULE_MODES = Object.freeze([
  COURSE_SCHEDULE_MODE_DERIVED,
  COURSE_SCHEDULE_MODE_EXPLICIT
]);

export const GLOBAL_SESSION_KIND_EXPLICIT = "EXPLICIT";
export const GLOBAL_SESSION_KIND_EXCEPTION = "EXCEPTION";
export const GLOBAL_SESSION_KINDS = Object.freeze([
  GLOBAL_SESSION_KIND_EXPLICIT,
  GLOBAL_SESSION_KIND_EXCEPTION
]);

export const COURSE_SCHEDULE_DAY_ORDER = Object.freeze(["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]);

const DAY_INDEX = Object.freeze({ SUN: 0, MON: 1, TUE: 2, WED: 3, THU: 4, FRI: 5, SAT: 6 });
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const MAX_RULES = 32;
const MAX_ZOOM_LENGTH = 1000;

export function normalizeCourseScheduleMode(value, fallback = COURSE_SCHEDULE_MODE_EXPLICIT) {
  const normalized = normalizePlatformIdentifier(value);
  if (COURSE_SCHEDULE_MODES.includes(normalized)) return normalized;
  return COURSE_SCHEDULE_MODES.includes(fallback) ? fallback : COURSE_SCHEDULE_MODE_EXPLICIT;
}

export function normalizeGlobalSessionKind(value, fallback = GLOBAL_SESSION_KIND_EXPLICIT) {
  const normalized = normalizePlatformIdentifier(value);
  if (GLOBAL_SESSION_KINDS.includes(normalized)) return normalized;
  return GLOBAL_SESSION_KINDS.includes(fallback) ? fallback : GLOBAL_SESSION_KIND_EXPLICIT;
}

export function parseCourseScheduleDefinition(value, options = {}) {
  const input = parseDefinitionValue(value);
  if (input.length > MAX_RULES) throw new Error(`A Course schedule may contain at most ${MAX_RULES} recurring rules`);
  const seenKeys = new Set();
  return Object.freeze(input.map((raw, index) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      throw new Error(`Course schedule rule ${index + 1} is invalid`);
    }
    let rulekey = clean(raw.rulekey ?? raw.ruleKey ?? raw.ScheduleRuleKey);
    if (!rulekey && typeof options.createRuleKey === "function") rulekey = clean(options.createRuleKey(index));
    if (!rulekey) throw new Error(`Course schedule rule ${index + 1} requires RuleKey`);
    const normalizedKey = normalizePlatformIdentifier(rulekey);
    if (!normalizedKey || seenKeys.has(normalizedKey)) throw new Error("Course schedule RuleKey values must be unique");
    seenKeys.add(normalizedKey);

    const days = normalizeDays(raw.days ?? raw.weekdays ?? raw.Weekdays);
    if (!days.length) throw new Error(`Course schedule rule ${index + 1} requires at least one weekday`);
    const starttime = normalizeTime(raw.starttime ?? raw.startTime ?? raw.StartTime);
    const endtime = normalizeTime(raw.endtime ?? raw.endTime ?? raw.EndTime);
    if (!validTimeRange(starttime, endtime)) {
      throw new Error(`Course schedule rule ${index + 1} requires a valid increasing HH:MM time range`);
    }
    const zoomlink = clean(raw.zoomlink ?? raw.zoomLink ?? raw.ZoomLink);
    if (zoomlink.length > MAX_ZOOM_LENGTH) throw new Error(`Course schedule rule ${index + 1} ZoomLink is too long`);

    const rule = {
      rulekey,
      days: Object.freeze(days),
      starttime,
      endtime,
      moduleid: clean(raw.moduleid ?? raw.moduleId ?? raw.ModuleID),
      teacheraccountid: clean(raw.teacheraccountid ?? raw.teacherAccountId ?? raw.TeacherAccountID),
      zoomlink
    };
    if (options.includeDisplayValues) {
      rule.modulename = clean(raw.modulename ?? raw.moduleName ?? raw.ModuleName);
      rule.teachername = clean(raw.teachername ?? raw.teacherName ?? raw.TeacherName) || "TBA";
    }
    return Object.freeze(rule);
  }));
}

export function serializeCourseScheduleDefinition(rules, options = {}) {
  const normalized = parseCourseScheduleDefinition(rules, options);
  return JSON.stringify(normalized.map(rule => ({ ...rule, days: [...rule.days] })));
}

export function validateCourseScheduleRuleConflicts(rules) {
  const normalized = parseCourseScheduleDefinition(rules);
  for (const day of COURSE_SCHEDULE_DAY_ORDER) {
    const dayRules = normalized.filter(rule => rule.days.includes(day));
    for (let leftIndex = 0; leftIndex < dayRules.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < dayRules.length; rightIndex += 1) {
        const left = dayRules[leftIndex];
        const right = dayRules[rightIndex];
        if (timesOverlap(left.starttime, left.endtime, right.starttime, right.endtime)) {
          throw new Error(`Course schedule rules overlap on ${day}`);
        }
      }
    }
  }
  return true;
}

export function deriveCourseScheduleOccurrences(rules, startDate, endDate, context = {}) {
  if (!validIsoDate(startDate) || !validIsoDate(endDate) || endDate < startDate) {
    throw new Error("Derived Course occurrences require a valid start/end window");
  }
  const normalized = parseCourseScheduleDefinition(rules, {
    includeDisplayValues: context.includeDisplayValues === true
  });
  const output = [];
  for (const rule of normalized) {
    const indexes = new Set(rule.days.map(day => DAY_INDEX[day]));
    const cursor = parseIsoDateUtc(startDate);
    const last = parseIsoDateUtc(endDate);
    while (cursor <= last) {
      if (indexes.has(cursor.getUTCDay())) {
        const date = formatIsoDateUtc(cursor);
        output.push(Object.freeze({
          sessionid: derivedOccurrenceId(rule.rulekey, date),
          sourcesessionid: derivedOccurrenceId(rule.rulekey, date),
          derived: true,
          runid: clean(context.runid),
          subjectid: clean(context.subjectid),
          moduleid: rule.moduleid,
          sessiondate: date,
          starttime: rule.starttime,
          endtime: rule.endtime,
          teacheraccountid: rule.teacheraccountid,
          zoomlink: rule.zoomlink,
          active: true,
          sessionkind: "DERIVED",
          schedulerulekey: rule.rulekey,
          occurrencedate: date,
          runname: clean(context.runname),
          subjectname: clean(context.subjectname),
          modulename: clean(rule.modulename),
          teachername: clean(rule.teachername) || "TBA",
          timezone: clean(context.timezone)
        }));
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }
  return output.sort((a, b) => `${a.sessiondate} ${a.starttime} ${a.schedulerulekey}`.localeCompare(`${b.sessiondate} ${b.starttime} ${b.schedulerulekey}`));
}

export function derivedOccurrenceId(ruleKey, occurrenceDate) {
  return `GDERIVED:${clean(ruleKey)}:${clean(occurrenceDate)}`;
}

export function derivedOccurrenceAnchor(ruleKey, occurrenceDate) {
  const key = normalizePlatformIdentifier(ruleKey);
  const date = clean(occurrenceDate);
  return key && validIsoDate(date) ? `${key}|${date}` : "";
}

export function ruleOccursOnDate(rule, date) {
  if (!validIsoDate(date)) return false;
  const normalized = parseCourseScheduleDefinition([rule])[0];
  const parsed = parseIsoDateUtc(date);
  const code = Object.keys(DAY_INDEX).find(day => DAY_INDEX[day] === parsed.getUTCDay());
  return normalized.days.includes(code);
}

export function validIsoDate(value) {
  const text = clean(value);
  if (!DATE_PATTERN.test(text)) return false;
  const parsed = parseIsoDateUtc(text);
  return Boolean(parsed && formatIsoDateUtc(parsed) === text);
}

export function normalizeCourseScheduleTime(value) {
  return normalizeTime(value);
}

function parseDefinitionValue(value) {
  if (Array.isArray(value)) return value;
  const text = clean(value);
  if (!text) return [];
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error("Course ScheduleDefinition is not valid JSON");
  }
  if (!Array.isArray(parsed)) throw new Error("Course ScheduleDefinition must be a JSON array");
  return parsed;
}

function normalizeDays(value) {
  const list = Array.isArray(value)
    ? value
    : clean(value).split(/[\s,|]+/).filter(Boolean);
  const selected = new Set(list.map(normalizePlatformIdentifier).filter(day => Object.prototype.hasOwnProperty.call(DAY_INDEX, day)));
  return COURSE_SCHEDULE_DAY_ORDER.filter(day => selected.has(day));
}

function normalizeTime(value) {
  const text = clean(value);
  const match = /^(\d{1,2}):(\d{2})/.exec(text);
  if (!match) return text;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !Number.isInteger(minute) || minute < 0 || minute > 59) return text;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function validTimeRange(start, end) {
  return TIME_PATTERN.test(start) && TIME_PATTERN.test(end) && end > start;
}

function timesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

function parseIsoDateUtc(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(clean(value));
  if (!match) return null;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return Number.isFinite(date.getTime()) ? date : null;
}

function formatIsoDateUtc(date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function clean(value) {
  return String(value ?? "").trim();
}
