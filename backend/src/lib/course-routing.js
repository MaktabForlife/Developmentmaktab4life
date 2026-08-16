/* M4L V102.8.2 - Authenticated CourseID to SpreadsheetID routing.
   Central account tokens are revalidated before the selected course Sheet is
   attached to the request. Submitted CourseIDs never select the target Sheet.
   Temporary Sheets failures remain distinct from denied course access. */

import { getAuthUser } from "./auth.js";
import {
  isRetryableGoogleSheetsError,
  readGoogleSheetValues
} from "./google-sheets.js";
import { json } from "./http.js";
import { resolveActiveCourseRegistration } from "./platform-sheet.js";
import { normalizePlatformIdentifier } from "./platform-schema.js";
import { setRequestAuthUser } from "./request-context.js";

const COURSE_ADMIN_ROLES = new Set(["ADMIN", "SENIOR", "TEACHER"]);

export async function resolveCourseScopedRequest(request, env) {
  let authUser;
  try {
    authUser = await getAuthUser(request, env);
  } catch (error) {
    logCourseValidationFailure("central-account", error);
    return {
      ok: false,
      response: temporaryCourseValidationResponse()
    };
  }

  // Missing/invalid credentials are left to the endpoint so its established
  // Unauthorized response and compatibility behaviour remain unchanged.
  if (!authUser) return { ok: true, env, course: null };

  if (authUser.type !== "account") {
    setRequestAuthUser(request, authUser);
    return { ok: true, env, course: null };
  }

  if (
    normalizePlatformIdentifier(authUser.scope) !== "COURSE" ||
    !String(authUser.courseid || "").trim()
  ) {
    return {
      ok: false,
      response: json({
        success: false,
        error: "Select an active course before opening course data",
        code: "COURSE_CONTEXT_REQUIRED"
      }, 403)
    };
  }

  try {
    const course = String(authUser.coursespreadsheetid || "").trim()
      ? Object.freeze({
          courseId: String(authUser.courseid || "").trim(),
          courseName: String(authUser.coursename || "").trim(),
          spreadsheetId: String(authUser.coursespreadsheetid || "").trim(),
          schemaVersion: ""
        })
      : await resolveActiveCourseRegistration(env, authUser.courseid);
    const courseEnv = createCourseEnvironment(env, course);
    const operationalUser = await resolveOperationalAccountUser(courseEnv, authUser);
    setRequestAuthUser(request, operationalUser);
    return { ok: true, env: courseEnv, course, user: operationalUser };
  } catch (error) {
    if (isRetryableGoogleSheetsError(error)) {
      logCourseValidationFailure("course-profile", error);
      return {
        ok: false,
        response: temporaryCourseValidationResponse()
      };
    }

    const message = String(error?.message || "");
    const configurationFailure = /sheet|header|spreadsheet|registry|missing/i.test(message);
    return {
      ok: false,
      response: json({
        success: false,
        error: configurationFailure
          ? "The selected course is not ready for account access"
          : "The account is not authorised for this course workspace",
        code: configurationFailure
          ? "COURSE_ROUTING_NOT_READY"
          : "COURSE_PROFILE_NOT_AUTHORISED"
      }, configurationFailure ? 503 : 403)
    };
  }
}

function temporaryCourseValidationResponse() {
  return json({
    success: false,
    error: "Course validation is temporarily unavailable. Please wait a moment and try again.",
    code: "COURSE_VALIDATION_TEMPORARILY_UNAVAILABLE",
    retryable: true
  }, 503);
}

function logCourseValidationFailure(stage, error) {
  console.warn("M4L course validation temporarily unavailable", {
    stage,
    name: String(error?.name || "Error"),
    code: String(error?.code || ""),
    status: Number(error?.status) || 0
  });
}

export function createCourseEnvironment(env, course) {
  const courseEnv = Object.create(env || null);
  Object.defineProperties(courseEnv, {
    GOOGLE_SPREADSHEET_ID: {
      configurable: false,
      enumerable: true,
      writable: false,
      value: course.spreadsheetId
    },
    M4L_AUTHENTICATED_COURSE_ID: {
      configurable: false,
      enumerable: true,
      writable: false,
      value: course.courseId
    },
    M4L_AUTHENTICATED_COURSE_NAME: {
      configurable: false,
      enumerable: true,
      writable: false,
      value: course.courseName
    }
  });
  return courseEnv;
}

export async function resolveOperationalAccountUser(env, centralUser) {
  const centralRole = normalizePlatformIdentifier(centralUser.role);
  const common = {
    ...centralUser,
    sessiontype: "account",
    centralrole: centralRole,
    courseid: String(centralUser.courseid || env.M4L_AUTHENTICATED_COURSE_ID || "").trim(),
    coursename: String(centralUser.coursename || env.M4L_AUTHENTICATED_COURSE_NAME || "").trim()
  };

  if (centralRole === "GLOBAL_ADMIN") {
    return {
      ...common,
      type: "admin",
      adminid: String(centralUser.accountid || "").trim(),
      username: String(centralUser.username || "Global Admin").trim(),
      role: "ADMIN",
      assignedgroup: "ALL",
      platformrole: "GLOBAL_ADMIN"
    };
  }

  const courseRecordId = String(centralUser.courserecordid || "").trim();
  if (!courseRecordId) throw new Error("Course membership is missing CourseRecordID");

  if (centralRole === "STUDENT") {
    const rows = await readGoogleSheetValues(env, "StudentRecords!A:K");
    assertLegacyHeaders(rows[0], [
      [0, "StudentID"],
      [1, "Username"],
      [3, "UniqueID"],
      [6, "ClassGroup"],
      [10, "Active"]
    ], "StudentRecords");
    const matches = rows.slice(1).filter(row => (
      normalizePlatformIdentifier(row?.[0]) === normalizePlatformIdentifier(courseRecordId)
    ));
    if (matches.length !== 1) throw new Error("Student course profile did not resolve exactly once");
    const row = matches[0];
    if (
      normalizePlatformIdentifier(row[3]) !== normalizePlatformIdentifier(centralUser.uniqueid) ||
      !isActiveLegacyValue(row[10])
    ) {
      throw new Error("Student course profile is inactive or does not match the central account");
    }
    return {
      ...common,
      type: "student",
      studentid: String(row[0] || "").trim(),
      username: String(row[1] || centralUser.username || "Student").trim(),
      classgroup: String(row[6] ?? "").trim(),
      role: "STUDENT"
    };
  }

  if (!COURSE_ADMIN_ROLES.has(centralRole)) {
    throw new Error("Central course role is not operationally supported");
  }

  const rows = await readGoogleSheetValues(env, "AdminRecords!A:J");
  assertLegacyHeaders(rows[0], [
    [0, "AdminID"],
    [1, "Username"],
    [2, "UniqueID"],
    [5, "Role"],
    [6, "AssignedGroup"],
    [7, "Active"]
  ], "AdminRecords");
  const matches = rows.slice(1).filter(row => (
    normalizePlatformIdentifier(row?.[0]) === normalizePlatformIdentifier(courseRecordId)
  ));
  if (matches.length !== 1) throw new Error("Staff course profile did not resolve exactly once");
  const row = matches[0];
  if (
    normalizePlatformIdentifier(row[2]) !== normalizePlatformIdentifier(centralUser.uniqueid) ||
    normalizePlatformIdentifier(row[5]) !== centralRole ||
    !isActiveLegacyValue(row[7])
  ) {
    throw new Error("Staff course profile is inactive or does not match the central membership");
  }

  return {
    ...common,
    type: "admin",
    adminid: String(row[0] || "").trim(),
    username: String(row[1] || centralUser.username || "Staff member").trim(),
    role: centralRole,
    assignedgroup: String(row[6] ?? "").trim()
  };
}

function assertLegacyHeaders(headers, required, sheetName) {
  const row = Array.isArray(headers) ? headers : [];
  for (const [index, expected] of required) {
    if (normalizeHeader(row[index]) !== normalizeHeader(expected)) {
      throw new Error(`${sheetName} header ${columnName(index + 1)}1 must be ${expected}`);
    }
  }
}

function normalizeHeader(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isActiveLegacyValue(value) {
  if (value === true || value === 1) return true;
  return ["TRUE", "YES", "ACTIVE", "1"].includes(String(value || "").trim().toUpperCase());
}

function columnName(columnNumber) {
  let value = columnNumber;
  let name = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}
