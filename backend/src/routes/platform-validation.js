/* M4L V102.2 - ADMIN-only validation of Platform schema V102.0.3. */

import { requireSystemAdmin } from "../lib/auth.js";
import { json } from "../lib/http.js";
import { readPlatformSheet } from "../lib/platform-sheet.js";
import {
  isActivePlatformValue,
  normalizePlatformIdentifier,
  PLATFORM_SHEET_HEADERS
} from "../lib/platform-schema.js";

const EXPECTED_PLATFORM_SCHEMA_VERSION = "102.0.3";
const COURSE_ROLES = new Set(["ADMIN", "SENIOR", "TEACHER", "STUDENT"]);

export async function platformValidationEndpoint(request, env) {
  const auth = await requireSystemAdmin(request, env);
  if (!auth.ok) return auth.response;

  try {
    const sheetNames = Object.keys(PLATFORM_SHEET_HEADERS);
    const entries = await Promise.all(sheetNames.map(async sheetName => (
      [sheetName, await readPlatformSheet(env, sheetName)]
    )));
    const tables = Object.fromEntries(entries);
    const summary = validatePlatformTables(tables);

    return json({
      success: true,
      service: "platform-validation",
      status: "ready",
      ...summary
    });
  } catch (error) {
    return json({
      success: false,
      error: "Platform Sheet validation failed",
      detail: safeValidationDetail(error, env)
    }, 503);
  }
}

export function validatePlatformTables(tables) {
  const missingTable = Object.keys(PLATFORM_SHEET_HEADERS).find(name => !Array.isArray(tables?.[name]));
  if (missingTable) {
    throw new Error(`${missingTable} was not validated`);
  }

  const courseRegistry = tables.CourseRegistry;
  const courseIds = new Set();
  const spreadsheetIds = new Set();
  let activeCourses = 0;

  for (const course of courseRegistry) {
    const courseId = normalizePlatformIdentifier(course.CourseID);
    const spreadsheetId = String(course.SpreadsheetID || "").trim();
    if (!courseId || !String(course.CourseName || "").trim()) {
      throw new Error(`CourseRegistry row ${course._rowNumber} requires CourseID and CourseName`);
    }
    if (courseIds.has(courseId)) {
      throw new Error(`CourseRegistry has duplicate CourseID in row ${course._rowNumber}`);
    }
    if (!/^[A-Za-z0-9_-]+$/.test(spreadsheetId)) {
      throw new Error(`CourseRegistry row ${course._rowNumber} has an invalid SpreadsheetID`);
    }
    if (spreadsheetIds.has(spreadsheetId)) {
      throw new Error(`CourseRegistry has duplicate SpreadsheetID in row ${course._rowNumber}`);
    }
    if (!String(course.SchemaVersion || "").trim()) {
      throw new Error(`CourseRegistry row ${course._rowNumber} requires SchemaVersion`);
    }
    courseIds.add(courseId);
    spreadsheetIds.add(spreadsheetId);
    if (isActivePlatformValue(course.Active)) activeCourses += 1;
  }
  if (activeCourses === 0) {
    throw new Error("CourseRegistry requires at least one active course");
  }

  const config = uniqueRowsByKey(tables.PlatformConfig, "ConfigKey", "PlatformConfig");
  const accountLoginBaseUrl = String(config.get("ACCOUNTLOGINBASEURL")?.ConfigValue || "").trim();
  const schemaVersion = String(config.get("PLATFORMSCHEMAVERSION")?.ConfigValue || "").trim();
  const curriculumVersion = Number(config.get("GLOBALCURRICULUMVERSION")?.ConfigValue);
  if (!isAccountLoginBaseUrl(accountLoginBaseUrl)) {
    throw new Error("PlatformConfig AccountLoginBaseUrl must be an HTTPS /account/ URL");
  }
  if (schemaVersion !== EXPECTED_PLATFORM_SCHEMA_VERSION) {
    throw new Error(`PlatformConfig PlatformSchemaVersion must be ${EXPECTED_PLATFORM_SCHEMA_VERSION}`);
  }
  if (!Number.isInteger(curriculumVersion) || curriculumVersion < 1) {
    throw new Error("PlatformConfig GlobalCurriculumVersion must be a positive integer");
  }

  const accounts = tables.UserAccounts;
  const accountIds = new Set();
  const uniqueIds = new Set();
  let globalAdminAccounts = 0;
  for (const account of accounts) {
    const accountId = normalizePlatformIdentifier(account.AccountID);
    const uniqueId = normalizePlatformIdentifier(account.UniqueID);
    const platformRole = normalizePlatformIdentifier(account.PlatformRole);
    if (!accountId || !uniqueId || !String(account.DisplayName || "").trim()) {
      throw new Error(`UserAccounts row ${account._rowNumber} requires AccountID, DisplayName and UniqueID`);
    }
    if (accountIds.has(accountId) || uniqueIds.has(uniqueId)) {
      throw new Error(`UserAccounts row ${account._rowNumber} duplicates AccountID or UniqueID`);
    }
    if (platformRole && platformRole !== "GLOBAL_ADMIN") {
      throw new Error(`UserAccounts row ${account._rowNumber} has an invalid PlatformRole`);
    }
    accountIds.add(accountId);
    uniqueIds.add(uniqueId);
    if (platformRole === "GLOBAL_ADMIN" && isActivePlatformValue(account.Active)) {
      globalAdminAccounts += 1;
    }
  }

  const accessKeys = new Set();
  const courseRecordKeys = new Set();
  for (const access of tables.UserCourseAccess) {
    const accountId = normalizePlatformIdentifier(access.AccountID);
    const courseId = normalizePlatformIdentifier(access.CourseID);
    const role = normalizePlatformIdentifier(access.Role);
    const courseRecordId = normalizePlatformIdentifier(access.CourseRecordID);
    const accessKey = `${accountId}|${courseId}|${role}`;
    if (!normalizePlatformIdentifier(access.AccessID) || !accountIds.has(accountId)) {
      throw new Error(`UserCourseAccess row ${access._rowNumber} has an invalid account reference`);
    }
    if (!courseIds.has(courseId) || !COURSE_ROLES.has(role)) {
      throw new Error(`UserCourseAccess row ${access._rowNumber} has an invalid course or role`);
    }
    if (!courseRecordId) {
      throw new Error(`UserCourseAccess row ${access._rowNumber} requires CourseRecordID`);
    }
    if (accessKeys.has(accessKey)) {
      throw new Error(`UserCourseAccess row ${access._rowNumber} duplicates an account/course/role`);
    }
    const courseRecordKey = `${courseId}|${role}|${courseRecordId}`;
    if (courseRecordKeys.has(courseRecordKey)) {
      throw new Error(`UserCourseAccess row ${access._rowNumber} duplicates a course-local record mapping`);
    }
    accessKeys.add(accessKey);
    courseRecordKeys.add(courseRecordKey);
  }

  return Object.freeze({
    platformSchemaVersion: schemaVersion,
    globalCurriculumVersion: curriculumVersion,
    tabCount: Object.keys(PLATFORM_SHEET_HEADERS).length,
    rowCounts: Object.freeze(Object.fromEntries(
      Object.keys(PLATFORM_SHEET_HEADERS).map(name => [name, tables[name].length])
    )),
    activeCourseCount: activeCourses,
    accountCount: accounts.length,
    courseAccessCount: tables.UserCourseAccess.length,
    globalAdminCount: globalAdminAccounts,
    readyForAccountMigration: true,
    readyForUnifiedLogin: accounts.length > 0 && globalAdminAccounts > 0
  });
}

function uniqueRowsByKey(rows, keyName, sheetName) {
  const records = new Map();
  for (const row of rows) {
    const key = normalizePlatformIdentifier(row[keyName]);
    if (!key || records.has(key)) {
      throw new Error(`${sheetName} has a blank or duplicate ${keyName} in row ${row._rowNumber}`);
    }
    records.set(key, row);
  }
  return records;
}

function isAccountLoginBaseUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.pathname.endsWith("/account/");
  } catch (error) {
    return false;
  }
}

function safeValidationDetail(error, env) {
  let detail = String(error?.message || "Validation error").replace(/[\r\n\t]+/g, " ");
  for (const value of [env?.PLATFORM_SPREADSHEET_ID, env?.GOOGLE_SPREADSHEET_ID]) {
    const sensitive = String(value || "").trim();
    if (sensitive) detail = detail.split(sensitive).join("[redacted]");
  }
  return detail.slice(0, 240);
}
