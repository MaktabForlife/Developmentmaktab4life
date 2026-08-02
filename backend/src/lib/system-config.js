import { readGoogleSheetValues } from "./google-sheets.js";

export const SYSTEM_CONFIG_SHEET = "SystemConfig";
export const STUDENT_LOGIN_BASE_KEY = "StudentLoginBaseUrl";
export const WEEKLY_PLANNER_DRIVE_FOLDER_ID_KEY = "WeeklyPlannerDriveFolderId";
export const WEEKLY_PLANNER_DRIVE_FOLDER_LABEL_KEY = "WeeklyPlannerDriveFolderLabel";
export const DEFAULT_WEEKLY_PLANNER_DRIVE_FOLDER_LABEL = "Weekly Planner";

const SYSTEM_CONFIG_RANGE = `${SYSTEM_CONFIG_SHEET}!A:D`;
const DRIVE_FOLDER_ID_PATTERN = /^[A-Za-z0-9_-]{10,128}$/;

export async function readSystemConfigRows(env) {
  return readGoogleSheetValues(env, SYSTEM_CONFIG_RANGE);
}

export function getSystemConfigValue(rows, key) {
  const targetKey = clean(key);

  if (!targetKey || !Array.isArray(rows)) return "";

  const row = rows.find(item => clean(item?.[0]) === targetKey);
  return row ? clean(row[1]) : "";
}

export function findSystemConfigRowIndexes(rows, key) {
  const targetKey = clean(key);
  const indexes = [];

  if (!targetKey || !Array.isArray(rows)) return indexes;

  rows.forEach((row, index) => {
    if (clean(row?.[0]) === targetKey) {
      indexes.push(index);
    }
  });

  return indexes;
}

export async function getStudentLoginBaseUrl(env) {
  const rows = await readSystemConfigRows(env);
  const storedValue = getSystemConfigValue(rows, STUDENT_LOGIN_BASE_KEY);
  const fallbackValue = clean(env?.M4L_STUDENT_LOGIN_BASE);
  const value = storedValue || fallbackValue;

  if (!value) {
    throw new Error("Student login URL is not configured in System Settings");
  }

  return normalizeStudentLoginBaseUrl(value);
}

export function normalizeStudentLoginBaseUrl(value) {
  const text = clean(value);

  if (!text) {
    throw new Error("Student login URL is required");
  }

  let url;

  try {
    url = new URL(text);
  } catch {
    throw new Error("Enter a valid Student login URL");
  }

  if (url.protocol !== "https:") {
    throw new Error("Student login URL must use https://");
  }

  if (url.username || url.password || url.search || url.hash) {
    throw new Error("Student login URL cannot contain credentials, a query or a fragment");
  }

  url.pathname = ensureTrailingSlash(url.pathname || "/");
  return url.toString();
}

export function extractGoogleDriveFolderId(value) {
  const text = clean(value);

  if (!text) {
    throw new Error("Weekly Planner Google Drive folder is required");
  }

  if (DRIVE_FOLDER_ID_PATTERN.test(text)) {
    return text;
  }

  let url;

  try {
    url = new URL(text);
  } catch {
    throw new Error("Enter a valid Google Drive folder URL or folder ID");
  }

  if (url.protocol !== "https:" || url.hostname !== "drive.google.com") {
    throw new Error("Enter a Google Drive folder URL or folder ID");
  }

  const folderPathMatch = url.pathname.match(/\/drive\/folders\/([A-Za-z0-9_-]+)/);
  const candidate = folderPathMatch ? folderPathMatch[1] : clean(url.searchParams.get("id"));

  if (!DRIVE_FOLDER_ID_PATTERN.test(candidate)) {
    throw new Error("The Google Drive folder URL does not contain a valid folder ID");
  }

  return candidate;
}

export function buildGoogleDriveFolderUrl(folderId) {
  const safeFolderId = extractGoogleDriveFolderId(folderId);
  return `https://drive.google.com/drive/folders/${encodeURIComponent(safeFolderId)}`;
}

function ensureTrailingSlash(value) {
  const text = String(value || "");
  return text.endsWith("/") ? text : `${text}/`;
}

function clean(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}
