/* M4L V102.12.2 - Academy Calendar inline administration and Public Holiday overrides. */

import { getAuthUser } from "../lib/auth.js";
import {
  ACADEMY_CALENDAR_EVENT_TYPES,
  buildAcademyCalendarEvents,
  isHiddenIslamicEvent,
  mapAcademyCalendarRow,
  normalizeTeachingImpact,
  validateAcademyCalendarRecord
} from "../lib/academy-calendar.js";
import { batchUpdateGoogleSheetValues } from "../lib/google-sheets.js";
import { json } from "../lib/http.js";
import { getPlatformSpreadsheetId, readPlatformSheet } from "../lib/platform-sheet.js";
import { isActivePlatformValue, normalizePlatformIdentifier, PLATFORM_SHEET_HEADERS } from "../lib/platform-schema.js";

const CALENDAR_SCHEMA_VERSION = "102.0.8";
const GENERATED_PUBLIC_HOLIDAY_PREFIX = "SA-PUBLIC-HOLIDAY-";

export async function getAcademyCalendarAdminEndpoint(request, env) {
  const permission = await requireCalendarAdmin(request, env);
  if (!permission.ok) return permission.response;
  try {
    const body = await readBody(request);
    const year = normalizeYear(body.year);
    const tables = await readCalendarTables(env);
    requireCalendarSchema(tables.PlatformConfig);
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    return json({
      success: true,
      service: "academy-calendar",
      version: "102.12.2",
      year,
      events: buildAcademyCalendarEvents(tables.AcademyCalendar, startDate, endDate),
      storedEvents: tables.AcademyCalendar.map(mapAcademyCalendarRow)
        .filter(event => !isHiddenIslamicEvent(event))
        .filter(event => event.startDate.slice(0, 4) === String(year) || event.endDate.slice(0, 4) === String(year))
    });
  } catch (error) {
    return calendarError(error, env);
  }
}

export async function saveAcademyCalendarEventEndpoint(request, env) {
  const permission = await requireCalendarAdmin(request, env);
  if (!permission.ok) return permission.response;
  try {
    const body = await readBody(request);
    const tables = await readCalendarTables(env);
    requireCalendarSchema(tables.PlatformConfig);
    const eventId = clean(body.eventId || body.calendarEventId);
    const generatedPublicHolidayDate = generatedPublicHolidayDateFromId(eventId);
    const existing = eventId && !generatedPublicHolidayDate ? uniqueCalendarEvent(tables.AcademyCalendar, eventId) : null;
    const eventType = normalizePlatformIdentifier(existing?.EventType || body.eventType || "TERM");
    if (!ACADEMY_CALENDAR_EVENT_TYPES.includes(eventType)) throw clientError("EventType must be TERM, ISLAMIC_DAY or PUBLIC_HOLIDAY", 400);
    if (!existing && !generatedPublicHolidayDate && !["TERM", "PUBLIC_HOLIDAY"].includes(eventType)) {
      throw clientError("New Academy Calendar entries must be Terms or Public Holidays", 400);
    }

    if (eventType === "PUBLIC_HOLIDAY") {
      return await savePublicHoliday({ body, tables, permission, existing, generatedPublicHolidayDate, env });
    }

    const description = eventType === "ISLAMIC_DAY"
      ? clean(existing?.Description)
      : clean(body.description || existing?.Description);
    const startDate = clean(body.startDate || existing?.StartDate);
    const endDate = eventType === "ISLAMIC_DAY"
      ? startDate
      : clean(body.endDate || existing?.EndDate || startDate);
    const alternateDate = eventType === "ISLAMIC_DAY"
      ? clean(body.alternateDate ?? existing?.AlternateDate)
      : "";
    const teachingImpact = normalizeTeachingImpact(body.teachingImpact ?? existing?.TeachingImpact ?? "INFORMATION");
    const active = readBoolean(body.active, existing ? isActivePlatformValue(existing.Active) : true);
    const timestamp = new Date().toISOString();

    const record = existing ? {
      ...existing,
      Description: description,
      StartDate: startDate,
      EndDate: endDate,
      AlternateDate: alternateDate,
      TeachingImpact: teachingImpact,
      Active: active,
      ModifiedByAccountID: permission.user.accountid,
      ModifiedByAccountName: permission.user.username,
      ModifiedDate: timestamp
    } : newCalendarRecord({
      eventType,
      description,
      startDate,
      endDate,
      alternateDate,
      teachingImpact,
      active,
      timestamp,
      permission
    });
    validateAcademyCalendarRecord(record);

    const rowNumber = existing?._rowNumber || nextRowNumber(tables.AcademyCalendar);
    const changedFields = existing
      ? ["Description", "StartDate", "EndDate", "AlternateDate", "TeachingImpact", "Active"]
      : ["EventType", "Description", "StartDate", "EndDate", "TeachingImpact", "Active"];
    const audit = auditRow(permission, timestamp, existing ? "UPDATE_ACADEMY_CALENDAR_EVENT" : "CREATE_ACADEMY_CALENDAR_EVENT", record.CalendarEventID, changedFields);

    await batchUpdateGoogleSheetValues(env, [
      valueWrite("AcademyCalendar", rowNumber, recordToRow(record, PLATFORM_SHEET_HEADERS.AcademyCalendar)),
      valueWrite("PlatformAuditLog", nextRowNumber(tables.PlatformAuditLog), audit)
    ], { spreadsheetId: getPlatformSpreadsheetId(env) });

    return json({ success: true, event: mapAcademyCalendarRow({ ...record, _rowNumber: rowNumber }) });
  } catch (error) {
    return calendarError(error, env);
  }
}

async function savePublicHoliday({ body, tables, permission, existing, generatedPublicHolidayDate, env }) {
  const timestamp = new Date().toISOString();
  const active = readBoolean(body.active, existing ? isActivePlatformValue(existing.Active) : true);
  const requestedDate = clean(body.startDate || existing?.StartDate || generatedPublicHolidayDate);
  if (!requestedDate) throw clientError("Public Holiday date is required", 400);
  const records = [];
  const actionFields = ["StartDate", "Active"];
  let auditAction = "UPDATE_ACADEMY_PUBLIC_HOLIDAY";

  if (generatedPublicHolidayDate) {
    if (active && requestedDate === generatedPublicHolidayDate) {
      return json({
        success: true,
        unchanged: true,
        event: {
          id: `${GENERATED_PUBLIC_HOLIDAY_PREFIX}${generatedPublicHolidayDate}`,
          eventType: "PUBLIC_HOLIDAY",
          description: "Public Holiday",
          startDate: generatedPublicHolidayDate,
          endDate: generatedPublicHolidayDate,
          teachingImpact: "NO_TEACHING",
          active: true,
          source: "SA_PUBLIC_HOLIDAY",
          editable: true,
          derived: true
        }
      });
    }

    records.push(newCalendarRecord({
      eventType: "PUBLIC_HOLIDAY",
      description: "Public Holiday",
      startDate: generatedPublicHolidayDate,
      endDate: generatedPublicHolidayDate,
      alternateDate: "",
      teachingImpact: "NO_TEACHING",
      active: false,
      timestamp,
      permission
    }));
    auditAction = active ? "MOVE_ACADEMY_PUBLIC_HOLIDAY" : "DELETE_ACADEMY_PUBLIC_HOLIDAY";

    if (active) {
      records.push(newCalendarRecord({
        eventType: "PUBLIC_HOLIDAY",
        description: "Public Holiday",
        startDate: requestedDate,
        endDate: requestedDate,
        alternateDate: "",
        teachingImpact: "NO_TEACHING",
        active: true,
        timestamp,
        permission
      }));
    }
  } else if (existing) {
    const record = {
      ...existing,
      Description: "Public Holiday",
      StartDate: requestedDate,
      EndDate: requestedDate,
      AlternateDate: "",
      TeachingImpact: "NO_TEACHING",
      Active: active,
      ModifiedByAccountID: permission.user.accountid,
      ModifiedByAccountName: permission.user.username,
      ModifiedDate: timestamp
    };
    validateAcademyCalendarRecord(record);
    records.push(record);
    if (!active) auditAction = "DELETE_ACADEMY_PUBLIC_HOLIDAY";
  } else {
    const record = newCalendarRecord({
      eventType: "PUBLIC_HOLIDAY",
      description: "Public Holiday",
      startDate: requestedDate,
      endDate: requestedDate,
      alternateDate: "",
      teachingImpact: "NO_TEACHING",
      active: true,
      timestamp,
      permission
    });
    validateAcademyCalendarRecord(record);
    records.push(record);
    auditAction = "CREATE_ACADEMY_PUBLIC_HOLIDAY";
  }

  records.forEach(validateAcademyCalendarRecord);
  const firstRow = nextRowNumber(tables.AcademyCalendar);
  const writes = records.map((record, index) => {
    const rowNumber = existing ? existing._rowNumber : firstRow + index;
    return valueWrite("AcademyCalendar", rowNumber, recordToRow(record, PLATFORM_SHEET_HEADERS.AcademyCalendar));
  });
  const auditTargetId = records.at(-1)?.CalendarEventID || existing?.CalendarEventID || `${GENERATED_PUBLIC_HOLIDAY_PREFIX}${generatedPublicHolidayDate}`;
  writes.push(valueWrite("PlatformAuditLog", nextRowNumber(tables.PlatformAuditLog), auditRow(permission, timestamp, auditAction, auditTargetId, actionFields)));

  await batchUpdateGoogleSheetValues(env, writes, { spreadsheetId: getPlatformSpreadsheetId(env) });
  const visibleRecord = active ? records.at(-1) : records[0];
  return json({ success: true, event: mapAcademyCalendarRow({ ...visibleRecord, _rowNumber: existing?._rowNumber || firstRow }) });
}

function newCalendarRecord({ eventType, description, startDate, endDate, alternateDate, teachingImpact, active, timestamp, permission }) {
  return {
    CalendarEventID: createId("ACEVT"),
    EventType: eventType,
    Description: description,
    StartDate: startDate,
    EndDate: endDate,
    AlternateDate: alternateDate,
    TeachingImpact: teachingImpact,
    Active: active,
    CreatedDate: timestamp,
    CreatedByAccountID: permission.user.accountid,
    CreatedByAccountName: permission.user.username,
    ModifiedByAccountID: "",
    ModifiedByAccountName: "",
    ModifiedDate: ""
  };
}

function auditRow(permission, timestamp, action, targetId, changedFields) {
  return [
    createId("AUDIT"), timestamp, permission.user.accountid, permission.user.username, permission.user.role,
    permission.user.courseid || "", action, "ACADEMY_CALENDAR_EVENT", targetId, JSON.stringify(changedFields)
  ];
}

async function requireCalendarAdmin(request, env) {
  if (request.method !== "POST") return { ok: false, response: json({ success: false, error: "Method not allowed" }, 405) };
  const user = await getAuthUser(request, env);
  if (!user) return { ok: false, response: json({ success: false, error: "Unauthorized" }, 401) };
  const role = normalizePlatformIdentifier(user.role);
  const allowed = (user.type === "account" && ["ADMIN", "GLOBAL_ADMIN"].includes(role)) || (user.type === "admin" && role === "ADMIN");
  if (!allowed) return { ok: false, response: json({ success: false, error: "ADMIN or GLOBAL_ADMIN authority is required" }, 403) };
  return { ok: true, user: { accountid: clean(user.accountid || user.adminid), username: clean(user.username || "Admin"), role, courseid: clean(user.courseid) } };
}

async function readCalendarTables(env) {
  const [calendar, config, audit] = await Promise.all([
    readPlatformSheet(env, "AcademyCalendar"), readPlatformSheet(env, "PlatformConfig"), readPlatformSheet(env, "PlatformAuditLog")
  ]);
  return { AcademyCalendar: calendar, PlatformConfig: config, PlatformAuditLog: audit };
}

function requireCalendarSchema(configRows) {
  const matches = (configRows || []).filter(row => normalizePlatformIdentifier(row.ConfigKey) === "PLATFORMSCHEMAVERSION");
  const version = clean(matches[0]?.ConfigValue);
  if (matches.length !== 1 || version !== CALENDAR_SCHEMA_VERSION) throw new Error(`Academy Calendar requires PlatformSchemaVersion ${CALENDAR_SCHEMA_VERSION}`);
}

function uniqueCalendarEvent(rows, id) {
  const normalized = normalizePlatformIdentifier(id);
  const matches = (rows || []).filter(row => normalizePlatformIdentifier(row.CalendarEventID) === normalized);
  if (matches.length === 0) throw clientError("Academy Calendar event was not found", 404);
  if (matches.length > 1) throw clientError("Academy Calendar event is duplicated", 409);
  return matches[0];
}

function generatedPublicHolidayDateFromId(id) {
  const value = clean(id);
  if (!value.startsWith(GENERATED_PUBLIC_HOLIDAY_PREFIX)) return "";
  const date = value.slice(GENERATED_PUBLIC_HOLIDAY_PREFIX.length);
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

function normalizeYear(value) {
  const year = Number(value || new Date().getUTCFullYear());
  if (!Number.isInteger(year) || year < 2025 || year > 2100) throw clientError("Calendar year is invalid", 400);
  return year;
}

function readBoolean(value, fallback) {
  if (typeof value === "boolean") return value;
  if (value === undefined || value === null || value === "") return fallback;
  return ["TRUE", "YES", "1", "ACTIVE"].includes(normalizePlatformIdentifier(value));
}

function clientError(message, status = 400) { const error = new Error(message); error.status = status; return error; }
function calendarError(error, env) { return json({ success: false, error: error?.status ? error.message : "Academy Calendar request failed", detail: env?.DEBUG_ERRORS === "true" ? String(error?.message || error) : undefined }, Number(error?.status) || 503); }
function clean(value) { return String(value ?? "").trim(); }
function recordToRow(record, headers) { return headers.map(header => record?.[header] ?? ""); }
function nextRowNumber(rows) { return Math.max(1, ...(rows || []).map(row => Number(row?._rowNumber) || 1)) + 1; }
function valueWrite(sheetName, rowNumber, row) { return { range: `'${sheetName}'!A${rowNumber}:${columnName(row.length)}${rowNumber}`, majorDimension: "ROWS", values: [row] }; }
function columnName(number) { let n = Number(number), out = ""; while (n > 0) { const r = (n - 1) % 26; out = String.fromCharCode(65 + r) + out; n = Math.floor((n - 1) / 26); } return out; }
function createId(prefix) { return `${prefix}-${crypto.randomUUID()}`; }
async function readBody(request) { try { return await request.json(); } catch { return {}; } }
