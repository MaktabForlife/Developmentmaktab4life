import { getAuthUser } from "../lib/auth.js";
import {
  appendGoogleSheetValues,
  batchUpdateGoogleSheetValues
} from "../lib/google-sheets.js";
import { json } from "../lib/http.js";
import {
  DEFAULT_WEEKLY_PLANNER_DRIVE_FOLDER_LABEL,
  STUDENT_LOGIN_BASE_KEY,
  SYSTEM_CONFIG_SHEET,
  WEEKLY_PLANNER_DRIVE_FOLDER_ID_KEY,
  WEEKLY_PLANNER_DRIVE_FOLDER_LABEL_KEY,
  buildGoogleDriveFolderUrl,
  extractGoogleDriveFolderId,
  findSystemConfigRowIndexes,
  getSystemConfigValue,
  normalizeStudentLoginBaseUrl,
  readSystemConfigRows
} from "../lib/system-config.js";

const SYSTEM_CONFIG_APPEND_RANGE = `${SYSTEM_CONFIG_SHEET}!A:D`;
const MAX_FOLDER_LABEL_LENGTH = 80;

export async function getSystemSettingsGoogleSheetsEndpoint(request, env) {
  const permission = await requireSystemSettingsAdmin(request, env);

  if (!permission.ok) {
    return permission.response;
  }

  if (request.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  const rows = await readSystemConfigRows(env);
  return json({ success: true, settings: buildSystemSettingsResponse(rows, env) });
}

export async function saveSystemSettingsGoogleSheetsEndpoint(request, env) {
  const permission = await requireSystemSettingsAdmin(request, env);

  if (!permission.ok) {
    return permission.response;
  }

  if (request.method !== "POST") {
    return json({ success: false, error: "Method not allowed" }, 405);
  }

  const body = await request.json();
  let studentLoginBaseUrl;
  let weeklyPlannerDriveFolderId;

  try {
    studentLoginBaseUrl = normalizeStudentLoginBaseUrl(body.studentLoginBaseUrl);
    weeklyPlannerDriveFolderId = extractGoogleDriveFolderId(
      body.weeklyPlannerDriveFolder || body.weeklyPlannerDriveFolderId
    );
  } catch (error) {
    return json({
      success: false,
      error: error && error.message ? error.message : "Invalid System Settings"
    }, 400);
  }

  const weeklyPlannerDriveFolderLabel = clean(
    body.weeklyPlannerDriveFolderLabel || DEFAULT_WEEKLY_PLANNER_DRIVE_FOLDER_LABEL
  );

  if (!weeklyPlannerDriveFolderLabel) {
    return json({ success: false, error: "Weekly Planner folder label is required" }, 400);
  }

  if (weeklyPlannerDriveFolderLabel.length > MAX_FOLDER_LABEL_LENGTH) {
    return json({
      success: false,
      error: `Weekly Planner folder label must be ${MAX_FOLDER_LABEL_LENGTH} characters or fewer`
    }, 400);
  }

  const rows = await readSystemConfigRows(env);
  const updatedAt = new Date().toISOString();
  const updatedBy = clean(permission.user.adminid || permission.user.username || "ADMIN");
  const valuesByKey = new Map([
    [STUDENT_LOGIN_BASE_KEY, studentLoginBaseUrl],
    [WEEKLY_PLANNER_DRIVE_FOLDER_ID_KEY, weeklyPlannerDriveFolderId],
    [WEEKLY_PLANNER_DRIVE_FOLDER_LABEL_KEY, weeklyPlannerDriveFolderLabel]
  ]);
  const updates = [];
  const appends = [];

  for (const [key, value] of valuesByKey.entries()) {
    const rowIndexes = findSystemConfigRowIndexes(rows, key);

    if (rowIndexes.length > 1) {
      return json({
        success: false,
        error: `SystemConfig contains duplicate ${key} rows`
      }, 409);
    }

    if (rowIndexes.length === 1) {
      const sheetRow = rowIndexes[0] + 1;
      updates.push({
        range: `${SYSTEM_CONFIG_SHEET}!B${sheetRow}:D${sheetRow}`,
        majorDimension: "ROWS",
        values: [[value, updatedAt, updatedBy]]
      });
    } else {
      appends.push([key, value, updatedAt, updatedBy]);
    }
  }

  if (updates.length > 0) {
    await batchUpdateGoogleSheetValues(env, updates);
  }

  if (appends.length > 0) {
    await appendGoogleSheetValues(env, SYSTEM_CONFIG_APPEND_RANGE, appends);
  }

  return json({
    success: true,
    message: "System Settings saved",
    settings: {
      studentLoginBaseUrl,
      studentLoginBaseSource: "system-config",
      weeklyPlannerDriveFolderId,
      weeklyPlannerDriveFolderUrl: buildGoogleDriveFolderUrl(weeklyPlannerDriveFolderId),
      weeklyPlannerDriveFolderLabel,
      configured: {
        studentLoginBaseUrl: true,
        weeklyPlannerDriveFolderId: true,
        weeklyPlannerDriveFolderLabel: true
      },
      updatedAt,
      updatedBy
    }
  });
}

function buildSystemSettingsResponse(rows, env) {
  const storedStudentLoginBaseUrl = getSystemConfigValue(rows, STUDENT_LOGIN_BASE_KEY);
  const studentLoginFallback = clean(env?.M4L_STUDENT_LOGIN_BASE);
  const rawStudentLoginBaseUrl = storedStudentLoginBaseUrl || studentLoginFallback;
  let studentLoginBaseUrl = "";

  if (rawStudentLoginBaseUrl) {
    try {
      studentLoginBaseUrl = normalizeStudentLoginBaseUrl(rawStudentLoginBaseUrl);
    } catch {
      studentLoginBaseUrl = rawStudentLoginBaseUrl;
    }
  }

  const weeklyPlannerDriveFolderId = getSystemConfigValue(
    rows,
    WEEKLY_PLANNER_DRIVE_FOLDER_ID_KEY
  );
  const weeklyPlannerDriveFolderLabel = getSystemConfigValue(
    rows,
    WEEKLY_PLANNER_DRIVE_FOLDER_LABEL_KEY
  ) || DEFAULT_WEEKLY_PLANNER_DRIVE_FOLDER_LABEL;
  let weeklyPlannerDriveFolderUrl = "";

  if (weeklyPlannerDriveFolderId) {
    try {
      weeklyPlannerDriveFolderUrl = buildGoogleDriveFolderUrl(weeklyPlannerDriveFolderId);
    } catch {
      weeklyPlannerDriveFolderUrl = "";
    }
  }

  return {
    studentLoginBaseUrl,
    studentLoginBaseSource: storedStudentLoginBaseUrl ? "system-config" : (
      studentLoginFallback ? "worker-fallback" : "missing"
    ),
    weeklyPlannerDriveFolderId,
    weeklyPlannerDriveFolderUrl,
    weeklyPlannerDriveFolderLabel,
    configured: {
      studentLoginBaseUrl: Boolean(storedStudentLoginBaseUrl),
      weeklyPlannerDriveFolderId: Boolean(weeklyPlannerDriveFolderId),
      weeklyPlannerDriveFolderLabel: Boolean(getSystemConfigValue(
        rows,
        WEEKLY_PLANNER_DRIVE_FOLDER_LABEL_KEY
      ))
    }
  };
}

async function requireSystemSettingsAdmin(request, env) {
  const authUser = await getAuthUser(request, env);

  if (!authUser || authUser.type !== "admin") {
    return {
      ok: false,
      response: json({ success: false, error: "Unauthorized" }, 401)
    };
  }

  if (clean(authUser.role).toUpperCase() !== "ADMIN") {
    return {
      ok: false,
      response: json({ success: false, error: "Forbidden" }, 403)
    };
  }

  return { ok: true, user: authUser };
}

function clean(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}
