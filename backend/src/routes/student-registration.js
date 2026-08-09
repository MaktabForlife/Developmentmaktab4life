import { normalizeWhatsapp6, requireAdminOrSenior } from "../lib/auth.js";
import {
  appendGoogleSheetValues,
  readGoogleSheetValues,
  updateGoogleSheetValues
} from "../lib/google-sheets.js";
import { json } from "../lib/http.js";
import { getStudentLoginBaseUrl } from "../lib/system-config.js";
import { buildStudentDuplicateResponse } from "./student-management.js";

const STUDENT_RECORDS_SHEET = "StudentRecords";
const SYSTEM_CONFIG_SHEET = "SystemConfig";
const FULL_SHEET_RANGE = "A:ZZ";
const STUDENT_RECORDS_APPEND_RANGE = `${STUDENT_RECORDS_SHEET}!A:L`;
const UNIQUE_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export async function registerStudentGoogleSheetsEndpoint(request, env) {
  const permission = await requireAdminOrSenior(request, env);

  if (!permission.ok) {
    return permission.response;
  }

  const body = await request.json();
  const username = clean(body.username);
  const whatsapp6 = normalizeWhatsapp6(body.whatsapp6);
  const classgroup = clean(
    body.classgroup === null || body.classgroup === undefined
      ? "1"
      : body.classgroup
  );
  const confirmDuplicate = body.confirmDuplicate === true;

  if (!username) {
    return json({ success: false, error: "Missing username" }, 400);
  }

  if (!classgroup) {
    return json({ success: false, error: "Missing classgroup" }, 400);
  }

  if (!isValidStudentClassGroup(classgroup)) {
    return json({
      success: false,
      error: "classgroup must be 0 (ALL) or a positive whole number"
    }, 400);
  }

  if (classgroup === "0" && !isFullAdmin(permission.user)) {
    return json({
      success: false,
      error: "Only an Admin can assign Group 0 (ALL) access"
    }, 403);
  }

  const registeredby = clean(
    permission.user.username ||
    permission.user.name ||
    permission.user.adminid ||
    permission.user.uniqueid ||
    "ADMIN"
  );
  let studentLoginBaseUrl;

  try {
    studentLoginBaseUrl = await getStudentLoginBaseUrl(env);
  } catch (error) {
    return json({
      success: false,
      error: error && error.message
        ? error.message
        : "Student login URL is not configured in System Settings"
    }, 503);
  }

  const studentRows = await readRegistrationSheet(env, STUDENT_RECORDS_SHEET);

  if (studentRows === null) {
    return json({ success: false, error: "StudentRecords sheet not found" });
  }

  const duplicateCheck = buildStudentDuplicateResponse(studentRows, {
    username,
    whatsapp6
  });

  if (!confirmDuplicate && duplicateCheck.duplicate) {
    return json({
      success: false,
      duplicate: true,
      matches: duplicateCheck.matches,
      suggestedUsername: duplicateCheck.suggestedUsername,
      error: "Duplicate student found. Confirmation required."
    });
  }

  const finalUsername = confirmDuplicate
    ? getNextAvailableUsername(studentRows, username)
    : username;
  const studentIdResult = await reserveStudentId(env);

  if (!studentIdResult.ok) {
    return json({ success: false, error: studentIdResult.error });
  }

  const uniqueid = generateUniqueId();
  const createdate = new Date().toISOString();

  await appendGoogleSheetValues(env, STUDENT_RECORDS_APPEND_RANGE, [[
    studentIdResult.studentid,
    finalUsername,
    whatsapp6,
    uniqueid,
    false,
    "",
    classgroup,
    createdate,
    "",
    0,
    true,
    registeredby
  ]]);

  return json({
    success: true,
    studentid: studentIdResult.studentid,
    username: finalUsername,
    whatsapp6,
    classgroup,
    active: true,
    uniqueid,
    registeredby,
    loginUrl: `${studentLoginBaseUrl}${uniqueid}`,
    taskAssignmentPending: true
  });
}

async function reserveStudentId(env) {
  const rows = await readRegistrationSheet(env, SYSTEM_CONFIG_SHEET);

  if (rows === null) {
    return { ok: false, error: "SystemConfig sheet not found" };
  }

  const current = Number(getValue(rows[0], 1));

  await updateGoogleSheetValues(env, `${SYSTEM_CONFIG_SHEET}!B1`, [[current + 1]]);

  return { ok: true, studentid: `MAKTAB${current}` };
}

async function readRegistrationSheet(env, sheetName) {
  try {
    return await readGoogleSheetValues(env, `${sheetName}!${FULL_SHEET_RANGE}`);
  } catch (error) {
    if (isMissingSheetError(error, sheetName)) {
      return null;
    }

    throw error;
  }
}

function generateUniqueId() {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  let id = "";

  bytes.forEach(value => {
    id += UNIQUE_ID_ALPHABET.charAt(value % UNIQUE_ID_ALPHABET.length);
  });

  return id;
}

function getNextAvailableUsername(rows, baseUsername) {
  const existingNames = new Set(
    rows.slice(1).map(row => normalizeUsername(getValue(row, 1)))
  );
  let counter = 1;
  let candidate = `${clean(baseUsername)}${counter}`;

  while (existingNames.has(normalizeUsername(candidate))) {
    counter += 1;
    candidate = `${clean(baseUsername)}${counter}`;
  }

  return candidate;
}

function getValue(row, index) {
  const value = Array.isArray(row) ? row[index] : "";
  return value === undefined || value === null ? "" : value;
}

function normalizeUsername(value) {
  return clean(value)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function isMissingSheetError(error, sheetName) {
  const message = error && error.message ? error.message : String(error || "");
  return message.includes("Google Sheets API error 400:") &&
    message.includes("Unable to parse range") &&
    message.toLowerCase().includes(String(sheetName).toLowerCase());
}

function clean(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function isValidStudentClassGroup(value) {
  return /^(0|[1-9]\d*)$/.test(clean(value));
}

function isFullAdmin(user) {
  return clean(user && user.role).toUpperCase() === "ADMIN";
}
