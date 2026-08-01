import { getAuthUser } from "../lib/auth.js";
import {
  batchUpdateGoogleSheetValues,
  readGoogleSheetValues
} from "../lib/google-sheets.js";
import { json } from "../lib/http.js";
import { normalizeProgressStatusUpdates } from "./progress.js";

const STUDENT_TASKS_SHEET = "StudentTasks";
const STUDENT_RECORDS_SHEET = "StudentRecords";
const FULL_SHEET_RANGE = "A:ZZ";

export async function updateTaskCompleteGoogleSheetsEndpoint(request, env) {
  return progressStatusWriteEndpoint(request, env, "complete", false);
}

export async function verifyStudentTaskGoogleSheetsEndpoint(request, env) {
  return progressStatusWriteEndpoint(request, env, "verify", true);
}

async function progressStatusWriteEndpoint(request, env, mode, adminOnly) {
  const authUser = await getAuthUser(request, env);

  if (!authUser || (adminOnly && authUser.type !== "admin")) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  const body = await request.json();
  const normalized = normalizeProgressStatusUpdates(body, mode, authUser);

  if (normalized.errors.length > 0) {
    return json({
      success: false,
      error: normalized.errors[0].error || "Invalid progress update",
      errors: normalized.errors
    }, 400);
  }

  return applyProgressStatusUpdates(env, normalized.updates, authUser);
}

async function applyProgressStatusUpdates(env, sourceUpdates, authUser) {
  const updates = sourceUpdates.map((update, index) => ({ ...update, index }));
  const requestedIdIndexes = new Map();
  const duplicateRequestErrors = [];

  updates.forEach(update => {
    if (requestedIdIndexes.has(update.studenttaskid)) {
      duplicateRequestErrors.push({
        index: update.index,
        studenttaskid: update.studenttaskid,
        error: "Duplicate studenttaskid in request"
      });
      return;
    }

    requestedIdIndexes.set(update.studenttaskid, update.index);
  });

  if (duplicateRequestErrors.length > 0) {
    return json(buildValidationFailure(
      updates,
      duplicateRequestErrors,
      "No student task progress was updated"
    ));
  }

  const [studentTaskRows, studentRows] = await Promise.all([
    readProgressWriteSheet(env, STUDENT_TASKS_SHEET),
    readProgressWriteSheet(env, STUDENT_RECORDS_SHEET)
  ]);

  if (studentTaskRows === null) {
    return missingSheetResponse(STUDENT_TASKS_SHEET);
  }

  if (studentRows === null) {
    return missingSheetResponse(STUDENT_RECORDS_SHEET);
  }

  const headerMap = buildHeaderMap(studentTaskRows[0] || []);
  const studentTaskIdCol = findHeaderIndex(
    headerMap,
    ["StudentTaskID", "StudentTaskId", "studenttaskid"]
  );
  const studentIdCol = findHeaderIndex(
    headerMap,
    ["StudentID", "StudentId", "studentid"]
  );
  const taskIdCol = findHeaderIndex(headerMap, ["TaskID", "TaskId", "taskid"]);
  const completeStatusCol = findHeaderIndex(
    headerMap,
    ["CompleteStatus", "Complete", "Completed", "completestatus"]
  );
  const completeDateCol = findHeaderIndex(
    headerMap,
    ["CompleteDate", "CompletedDate", "completedate"]
  );
  const verifyStatusCol = findHeaderIndex(
    headerMap,
    ["VerifyStatus", "Verified", "verifystatus"]
  );
  const verifyDateCol = findHeaderIndex(
    headerMap,
    ["VerifyDate", "VerifiedDate", "verifydate"]
  );

  if (studentTaskIdCol === -1) {
    return json({
      success: false,
      error: "Missing required column: StudentTaskID",
      updatedCount: 0,
      failedCount: updates.length
    });
  }

  const needsComplete = updates.some(update => hasOwn(update, "completeStatus"));
  const needsVerify = updates.some(update => hasOwn(update, "verifyStatus"));

  if (needsComplete && (completeStatusCol === -1 || completeDateCol === -1)) {
    return json({
      success: false,
      error: "Missing required complete status/date column",
      updatedCount: 0,
      failedCount: updates.length
    });
  }

  if (needsVerify && (verifyStatusCol === -1 || verifyDateCol === -1)) {
    return json({
      success: false,
      error: "Missing required verify status/date column",
      updatedCount: 0,
      failedCount: updates.length
    });
  }

  const rowByStudentTaskId = new Map();
  const duplicateSheetIds = new Set();

  studentTaskRows.slice(1).forEach((row, offset) => {
    const studenttaskid = clean(row[studentTaskIdCol]);

    if (!studenttaskid || !requestedIdIndexes.has(studenttaskid)) {
      return;
    }

    if (rowByStudentTaskId.has(studenttaskid)) {
      duplicateSheetIds.add(studenttaskid);
      return;
    }

    rowByStudentTaskId.set(studenttaskid, offset + 1);
  });

  const studentMap = buildStudentLookup(studentRows);
  const now = new Date().toISOString();
  const validationErrors = [];
  const cellUpdates = [];
  const results = [];

  updates.forEach(update => {
    const rowIndex = rowByStudentTaskId.get(update.studenttaskid);

    if (duplicateSheetIds.has(update.studenttaskid)) {
      validationErrors.push({
        index: update.index,
        studenttaskid: update.studenttaskid,
        error: "Duplicate StudentTaskID in StudentTasks sheet"
      });
      return;
    }

    if (rowIndex === undefined) {
      validationErrors.push({
        index: update.index,
        studenttaskid: update.studenttaskid,
        error: "Student task not found"
      });
      return;
    }

    const row = studentTaskRows[rowIndex];
    const studentid = studentIdCol === -1 ? "" : clean(row[studentIdCol]);
    const student = studentMap[studentid] || {};
    const permission = canActorUpdateProgress(authUser, {
      studentid,
      classgroup: student.classgroup || ""
    });

    if (authUser.type === "student" && hasOwn(update, "verifyStatus")) {
      validationErrors.push({
        index: update.index,
        studenttaskid: update.studenttaskid,
        error: "Students cannot verify tasks"
      });
      return;
    }

    if (!permission.ok) {
      validationErrors.push({
        index: update.index,
        studenttaskid: update.studenttaskid,
        error: permission.error || "Forbidden"
      });
      return;
    }

    const sheetRow = rowIndex + 1;

    if (hasOwn(update, "completeStatus")) {
      cellUpdates.push(singleCellUpdate(
        completeStatusCol,
        sheetRow,
        update.completeStatus
      ));
      cellUpdates.push(singleCellUpdate(
        completeDateCol,
        sheetRow,
        update.completeStatus ? now : ""
      ));
    }

    if (hasOwn(update, "verifyStatus")) {
      cellUpdates.push(singleCellUpdate(
        verifyStatusCol,
        sheetRow,
        update.verifyStatus
      ));
      cellUpdates.push(singleCellUpdate(
        verifyDateCol,
        sheetRow,
        update.verifyStatus ? now : ""
      ));
    }

    results.push({
      success: true,
      index: update.index,
      studenttaskid: update.studenttaskid,
      studentid,
      taskid: taskIdCol === -1 ? "" : row[taskIdCol]
    });
  });

  if (validationErrors.length > 0) {
    return json(buildValidationFailure(
      updates,
      validationErrors,
      "No student task progress was updated"
    ));
  }

  if (cellUpdates.length > 0) {
    await batchUpdateGoogleSheetValues(env, cellUpdates);
  }

  return json({
    success: true,
    message: "Student task progress updated successfully",
    updatedCount: updates.length,
    failedCount: 0,
    results
  });
}

function buildValidationFailure(updates, validationErrors, message) {
  const firstError = validationErrors[0] || {};
  const errorByIndex = new Map();

  validationErrors.forEach(item => {
    if (item && item.index !== undefined && !errorByIndex.has(item.index)) {
      errorByIndex.set(item.index, item.error || "Invalid progress update");
    }
  });

  return {
    success: false,
    error: firstError.error || message || "Invalid progress update",
    message: message || "No student task progress was updated",
    errors: validationErrors,
    updatedCount: 0,
    failedCount: updates.length || validationErrors.length,
    results: updates.map(update => ({
      success: false,
      index: update.index,
      studenttaskid: update.studenttaskid,
      error: errorByIndex.get(update.index) || "Batch not applied because another update failed"
    }))
  };
}

function canActorUpdateProgress(actor, task) {
  if (actor.type === "student") {
    return clean(task.studentid) === clean(actor.studentid)
      ? { ok: true }
      : { ok: false, error: "Forbidden" };
  }

  if (actor.type === "admin") {
    if (
      clean(actor.role) === "TEACHER" &&
      clean(task.classgroup) !== clean(actor.assignedgroup)
    ) {
      return { ok: false, error: "Forbidden" };
    }

    return { ok: true };
  }

  return { ok: false, error: "Unauthorized" };
}

function buildStudentLookup(rows) {
  const headerMap = buildHeaderMap(rows[0] || []);
  const map = {};

  rows.slice(1).forEach(row => {
    const studentid = clean(getCell(
      row,
      headerMap,
      ["StudentID", "StudentId", "studentid"]
    ));
    const classgroup = clean(getCell(
      row,
      headerMap,
      ["classgroup", "ClassGroup", "Group", "GroupNo"]
    ));
    const active = getCell(row, headerMap, ["Active", "Status"], true);

    if (!studentid || !isActiveValue(active) || classgroup === "0") {
      return;
    }

    map[studentid] = { studentid, classgroup, active };
  });

  return map;
}

async function readProgressWriteSheet(env, sheetName) {
  try {
    return await readGoogleSheetValues(env, `${sheetName}!${FULL_SHEET_RANGE}`);
  } catch (error) {
    if (isMissingSheetError(error, sheetName)) {
      return null;
    }

    throw error;
  }
}

function singleCellUpdate(columnIndex, rowNumber, value) {
  return {
    range: `${STUDENT_TASKS_SHEET}!${columnIndexToA1(columnIndex)}${rowNumber}`,
    majorDimension: "ROWS",
    values: [[value]]
  };
}

function columnIndexToA1(index) {
  let value = Number(index) + 1;
  let label = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }

  return label;
}

function buildHeaderMap(headers) {
  const map = {};

  headers.forEach((header, index) => {
    const key = normalizeHeader(header);

    if (key && map[key] === undefined) {
      map[key] = index;
    }
  });

  return map;
}

function findHeaderIndex(headerMap, names) {
  for (const name of names) {
    const index = headerMap[normalizeHeader(name)];

    if (index !== undefined) {
      return index;
    }
  }

  return -1;
}

function getCell(row, headerMap, names, fallback = "") {
  for (const name of names) {
    const index = headerMap[normalizeHeader(name)];

    if (index !== undefined) {
      const value = Array.isArray(row) ? row[index] : undefined;
      return value === undefined || value === null ? fallback : value;
    }
  }

  return fallback;
}

function normalizeHeader(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isActiveValue(value) {
  if (value === undefined || value === null || value === "") return true;
  if (value === true) return true;
  return ["true", "1", "yes", "active"].includes(clean(value).toLowerCase());
}

function missingSheetResponse(sheetName) {
  return json({ success: false, error: `${sheetName} sheet not found` });
}

function isMissingSheetError(error, sheetName) {
  const message = error && error.message ? error.message : String(error || "");
  return message.includes("Google Sheets API error 400:") &&
    message.includes("Unable to parse range") &&
    message.toLowerCase().includes(String(sheetName).toLowerCase());
}

function hasOwn(source, key) {
  return !!source && Object.prototype.hasOwnProperty.call(source, key);
}

function clean(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}
