/*
===============================================================================
MAKTABHELPER — WEEKLY PLANNER GOOGLE DRIVE BRIDGE
Last updated: 5 August 2026
Migration milestone: V98.14
===============================================================================

SOURCE OF TRUTH:
- This repository file is authoritative.
- Synchronize the complete file to the bound Apps Script project; do not
  maintain an independent dashboard copy.

V98.14 FINAL OWNERSHIP:
- All Google Sheets application reads and writes are owned by authenticated
  Cloudflare Worker routes and the M4L UI.
- Apps Script is retained only because Weekly Planner PNG submission requires
  Google Drive access.
- Apps Script reads the UI-managed Weekly Planner Drive destination from the
  bound spreadsheet's SystemConfig sheet; it does not administer Sheets data.

CALLABLE doPost ACTION:
- saveWeeklyPlannerPreviewToDrive

MANUAL DEPLOYMENT / AUTHORIZATION FUNCTION:
- authorizeM4LServices

Do not add Sheets administration, maintenance or compatibility actions back to
Apps Script. New Sheets features must be implemented through the UI and Worker.
===============================================================================
*/

const SYSTEM_CONFIG_SHEET_NAME = "SystemConfig";
const WEEKLY_PLANNER_DRIVE_FOLDER_ID_CONFIG_KEY = "WeeklyPlannerDriveFolderId";
const WEEKLY_PLANNER_DRIVE_FOLDER_LABEL_CONFIG_KEY = "WeeklyPlannerDriveFolderLabel";
const DEFAULT_WEEKLY_PLANNER_DRIVE_FOLDER_LABEL = "Weekly Planner";

/* =========================
   UI-MANAGED DRIVE CONFIGURATION
========================= */

function getSystemConfigValue_(key, required) {
  const configKey = String(key || "").trim();
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(SYSTEM_CONFIG_SHEET_NAME);

  if (!sheet) {
    throw new Error("SystemConfig sheet not found");
  }

  const lastRow = sheet.getLastRow();

  if (lastRow < 1) {
    if (required) throw new Error("SystemConfig is empty");
    return "";
  }

  const rows = sheet.getRange(1, 1, lastRow, 2).getDisplayValues();
  const matches = rows.filter(function(row) {
    return String(row[0] || "").trim() === configKey;
  });

  if (matches.length > 1) {
    throw new Error("SystemConfig contains duplicate " + configKey + " rows");
  }

  const value = matches.length ? String(matches[0][1] || "").trim() : "";

  if (required && !value) {
    throw new Error(configKey + " is not configured in System Settings");
  }

  return value;
}

function getWeeklyPlannerDriveConfig_() {
  const folderId = getSystemConfigValue_(
    WEEKLY_PLANNER_DRIVE_FOLDER_ID_CONFIG_KEY,
    true
  );

  if (!/^[A-Za-z0-9_-]{10,128}$/.test(folderId)) {
    throw new Error("WeeklyPlannerDriveFolderId is invalid in System Settings");
  }

  const folderLabel = getSystemConfigValue_(
    WEEKLY_PLANNER_DRIVE_FOLDER_LABEL_CONFIG_KEY,
    false
  ) || DEFAULT_WEEKLY_PLANNER_DRIVE_FOLDER_LABEL;

  return {
    folderId: folderId,
    folderLabel: folderLabel,
    folderUrl: "https://drive.google.com/drive/folders/" + encodeURIComponent(folderId)
  };
}


/* =========================
   WEEKLY PLANNER PNG-TO-DRIVE BRIDGE
========================= */

function extractWeeklyPlannerPreviewBase64_(data) {
  const directBase64 = String(data.base64 || "").replace(/\s/g, "");

  if (directBase64) {
    return directBase64;
  }

  const dataUrl = String(data.dataUrl || "").trim();
  const match = dataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=\r\n]+)$/);

  return match ? match[1].replace(/\s/g, "") : "";
}

function sanitizeWeeklyPlannerDriveFileName_(value) {
  let name = String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!name) {
    return "";
  }

  if (!/\.png$/i.test(name)) {
    name += ".png";
  }

  return name.slice(0, 140);
}

function saveWeeklyPlannerPreviewToDrive(data) {
  data = data || {};

  const mimeType = String(data.mimeType || "image/png").trim();

  if (mimeType !== "image/png") {
    return { success: false, error: "Only PNG planner previews are supported" };
  }

  const fileName = sanitizeWeeklyPlannerDriveFileName_(data.fileName);

  if (!fileName) {
    return { success: false, error: "Missing fileName" };
  }

  const base64 = extractWeeklyPlannerPreviewBase64_(data);

  if (!base64) {
    return { success: false, error: "Missing preview image data" };
  }

  let driveConfig = {
    folderId: "",
    folderLabel: DEFAULT_WEEKLY_PLANNER_DRIVE_FOLDER_LABEL,
    folderUrl: ""
  };

  try {
    driveConfig = getWeeklyPlannerDriveConfig_();
    const bytes = Utilities.base64Decode(base64);
    const blob = Utilities.newBlob(bytes, mimeType, fileName);
    const folder = DriveApp.getFolderById(driveConfig.folderId);
    const file = folder.createFile(blob);

    return {
      success: true,
      message: "Weekly planner preview saved to Google Drive",
      fileName: file.getName(),
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      folderId: driveConfig.folderId,
      destinationLabel: driveConfig.folderLabel,
      destinationUrl: driveConfig.folderUrl,
      teacherName: String(data.teacherName || "").trim(),
      saveDate: String(data.saveDate || "").trim(),
      weekStart: String(data.weekStart || "").trim(),
      requestedBy: String(data.requestedBy || "").trim(),
      requestedByAdminId: String(data.requestedByAdminId || "").trim()
    };
  } catch (error) {
    console.error("Weekly planner Drive save failed", error);

    return {
      success: false,
      error: error && error.message
        ? error.message
        : "Unable to save Weekly Planner. Verify the configured Google Drive folder and Apps Script access.",
      destinationLabel: driveConfig.folderLabel,
      destinationUrl: driveConfig.folderUrl
    };
  }
}

function authorizeM4LServices() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error("This Apps Script project is not bound to a Google Sheet");
  }

  const driveConfig = getWeeklyPlannerDriveConfig_();
  const folder = DriveApp.getFolderById(driveConfig.folderId);

  const result = {
    success: true,
    spreadsheetId: spreadsheet.getId(),
    spreadsheetName: spreadsheet.getName(),
    folderId: folder.getId(),
    folderName: folder.getName(),
    folderUrl: driveConfig.folderUrl
  };

  console.log(JSON.stringify(result));
  return result;
}

/* =========================
   WEB APP ENTRY POINTS
========================= */

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    if (body.action === "saveWeeklyPlannerPreviewToDrive") {
      return jsonResponse(saveWeeklyPlannerPreviewToDrive(body.data));
    }

    return jsonResponse({
      success: false,
      error: "Unknown action"
    });
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err && err.message ? err.message : "Apps Script request failed"
    });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return jsonResponse({
    status: "success",
    message: "Connected to M4L Weekly Planner Google Drive bridge",
    milestone: "V98.14"
  });
}
