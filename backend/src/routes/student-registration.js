import { normalizeWhatsapp6, requireAdminOrSenior } from "../lib/auth.js";
import {
  appendGoogleSheetValues,
  readGoogleSheetValues,
  updateGoogleSheetValues
} from "../lib/google-sheets.js";
import { json } from "../lib/http.js";
import { buildStudentDuplicateResponse } from "./student-management.js";

const STUDENT_RECORDS_SHEET = "StudentRecords";
const STUDENT_TASKS_SHEET = "StudentTasks";
const TASK_LIST_SHEET = "TaskList";
const SYSTEM_CONFIG_SHEET = "SystemConfig";
const FULL_SHEET_RANGE = "A:ZZ";
const STUDENT_RECORDS_APPEND_RANGE = `${STUDENT_RECORDS_SHEET}!A:L`;
const DEFAULT_STUDENT_LOGIN_BASE = "https://rebootyourmaktab.maktabhelper.app/student/";
const UNIQUE_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export async function registerStudentGoogleSheetsEndpoint(request, env) {
  const permission = await requireAdminOrSenior(request, env);

  if (!permission.ok) {
    return permission.response;
  }

  const body = await request.json();
  const username = clean(body.username);
  const whatsapp6 = normalizeWhatsapp6(body.whatsapp6);
  const classgroup = clean(body.classgroup || "1");
  const confirmDuplicate = body.confirmDuplicate === true;
  const assignmentMode = body.assignmentMode === "selected" ? "selected" : "all";
  const selectedModules = Array.isArray(body.selectedModules) ? body.selectedModules : [];

  if (!username) {
    return json({ success: false, error: "Missing username" }, 400);
  }

  if (!classgroup) {
    return json({ success: false, error: "Missing classgroup" }, 400);
  }

  // Manual subject/module assignment is temporarily disabled in the frontend.
  // Match the Apps Script wrapper by falling back to all active tasks when an
  // older page submits selected mode without any selected modules.
  const safeAssignmentMode = assignmentMode === "selected" && selectedModules.length > 0
    ? "selected"
    : "all";
  const registeredby = clean(
    permission.user.username ||
    permission.user.name ||
    permission.user.adminid ||
    permission.user.uniqueid ||
    "ADMIN"
  );
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

  let assignment;

  try {
    assignment = await assignInitialStudentTasks(env, {
      studentid: studentIdResult.studentid,
      assignedBy: registeredby || "SYSTEM",
      assignmentMode: safeAssignmentMode,
      selectedModules: safeAssignmentMode === "selected" ? selectedModules : []
    });
  } catch (error) {
    // The legacy Apps Script writes StudentRecords before assigning tasks and
    // returns the assignment error through doPost if its counter/write fails.
    return json({
      success: false,
      error: error && error.message ? error.message : String(error)
    });
  }

  return json({
    success: true,
    studentid: studentIdResult.studentid,
    username: finalUsername,
    whatsapp6,
    classgroup,
    active: true,
    uniqueid,
    registeredby,
    loginUrl: `${ensureTrailingSlash(
      env.M4L_STUDENT_LOGIN_BASE || DEFAULT_STUDENT_LOGIN_BASE
    )}${uniqueid}`,
    assignment
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

async function assignInitialStudentTasks(env, options) {
  const [studentTaskRows, taskRows] = await Promise.all([
    readRegistrationSheet(env, STUDENT_TASKS_SHEET),
    readRegistrationSheet(env, TASK_LIST_SHEET)
  ]);

  if (studentTaskRows === null) {
    return {
      success: false,
      error: "StudentTasks sheet not found",
      assignedCount: 0
    };
  }

  if (taskRows === null) {
    return {
      success: false,
      error: "TaskList sheet not found",
      assignedCount: 0
    };
  }

  const taskHeaderMap = buildHeaderMap(taskRows[0] || []);
  const selectedModuleKeys = new Set();

  options.selectedModules.forEach(item => {
    const subjectid = clean(item.subjectid || item.SubjectID || item.subjectId);
    const moduleid = clean(item.moduleid || item.ModuleID || item.moduleId) || "NO_MODULE";

    if (subjectid && moduleid) {
      selectedModuleKeys.add(`${subjectid}|${moduleid}`);
    }
  });

  const tasksToAssign = [];

  taskRows.slice(1).forEach(row => {
    const taskid = clean(getCell(row, taskHeaderMap, ["TaskID", "TaskId", "taskid"]));
    const subjectid = clean(getCell(row, taskHeaderMap, [
      "SubjectID",
      "SubjectId",
      "subjectid"
    ]));
    const subjectname = clean(getCell(row, taskHeaderMap, [
      "SubjectName",
      "Subject",
      "subjectname"
    ], ""));
    const moduleid = clean(getCell(row, taskHeaderMap, [
      "ModuleID",
      "ModuleId",
      "moduleid",
      "ModuletID"
    ], ""));
    const modulename = clean(getCell(row, taskHeaderMap, [
      "ModuleName",
      "Module",
      "modulename"
    ], ""));
    const taskname = clean(getCell(row, taskHeaderMap, [
      "TaskName",
      "Task",
      "taskname"
    ], taskid));
    const active = getCell(row, taskHeaderMap, ["Active", "Status", "active"], true);

    if (!taskid || !subjectid || !isTaskActiveValue(active)) return;

    if (options.assignmentMode === "selected") {
      const key = `${subjectid}|${moduleid || "NO_MODULE"}`;

      if (!selectedModuleKeys.has(key)) return;
    }

    tasksToAssign.push({
      taskid,
      subjectid,
      subjectname,
      moduleid,
      modulename,
      taskname
    });
  });

  if (tasksToAssign.length === 0) {
    return {
      success: true,
      assignedCount: 0,
      skippedDuplicate: 0,
      message: "No matching active tasks selected."
    };
  }

  const studentTaskHeaders = studentTaskRows[0] || [];
  const studentTaskHeaderMap = buildHeaderMap(studentTaskHeaders);
  const studentIdCol = findColumn(studentTaskHeaderMap, [
    "StudentID",
    "StudentId",
    "studentid"
  ]);
  const taskIdCol = findColumn(studentTaskHeaderMap, ["TaskID", "TaskId", "taskid"]);

  if (studentIdCol === -1 || taskIdCol === -1) {
    return {
      success: false,
      error: "StudentTasks sheet is missing StudentID or TaskID",
      assignedCount: 0
    };
  }

  const existingPairs = new Set();

  studentTaskRows.slice(1).forEach(row => {
    const studentid = clean(getValue(row, studentIdCol));
    const taskid = clean(getValue(row, taskIdCol));

    if (studentid && taskid) {
      existingPairs.add(`${studentid}|${taskid}`);
    }
  });

  const assignedDate = new Date().toISOString();
  const rowsToAdd = [];
  let skippedDuplicate = 0;

  tasksToAssign.forEach(task => {
    const pairKey = `${options.studentid}|${task.taskid}`;

    if (existingPairs.has(pairKey)) {
      skippedDuplicate += 1;
      return;
    }

    existingPairs.add(pairKey);
    const row = new Array(studentTaskHeaders.length).fill("");

    setCell(row, studentTaskHeaderMap, ["StudentTaskID", "StudentTaskId", "studenttaskid"], "");
    setCell(row, studentTaskHeaderMap, ["StudentID", "StudentId", "studentid"], options.studentid);
    setCell(row, studentTaskHeaderMap, ["TaskID", "TaskId", "taskid"], task.taskid);
    setCell(row, studentTaskHeaderMap, ["SubjectID", "SubjectId", "subjectid"], task.subjectid);
    setCell(row, studentTaskHeaderMap, ["SubjectName", "Subject", "subjectname"], task.subjectname);
    setCell(row, studentTaskHeaderMap, ["ModuleID", "ModuleId", "moduleid", "ModuletID"], task.moduleid);
    setCell(row, studentTaskHeaderMap, ["ModuleName", "Module", "modulename"], task.modulename);
    setCell(row, studentTaskHeaderMap, ["TaskName", "Task", "taskname"], task.taskname);
    setCell(row, studentTaskHeaderMap, ["CompleteStatus", "Complete", "Completed", "completestatus"], "");
    setCell(row, studentTaskHeaderMap, ["CompleteDate", "CompletedDate", "completedate"], "");
    setCell(row, studentTaskHeaderMap, ["VerifyStatus", "Verified", "verifystatus"], "");
    setCell(row, studentTaskHeaderMap, ["VerifyDate", "VerifiedDate", "verifydate"], "");
    setCell(row, studentTaskHeaderMap, ["AssignedBy", "assignedby"], options.assignedBy);
    setCell(row, studentTaskHeaderMap, ["AssignedDate", "assigneddate"], assignedDate);

    rowsToAdd.push(row);
  });

  if (rowsToAdd.length === 0) {
    return {
      success: true,
      assignedCount: 0,
      skippedDuplicate,
      message: "All selected tasks were already assigned."
    };
  }

  const studentTaskIds = await reserveStudentTaskIds(env, rowsToAdd.length);

  if (!studentTaskIds.ok) {
    throw new Error(studentTaskIds.error);
  }

  const idCol = findColumn(studentTaskHeaderMap, [
    "StudentTaskID",
    "StudentTaskId",
    "studenttaskid"
  ]);

  if (idCol !== -1) {
    rowsToAdd.forEach((row, index) => {
      row[idCol] = studentTaskIds.ids[index];
    });
  }

  await appendGoogleSheetValues(
    env,
    `${STUDENT_TASKS_SHEET}!A:${columnIndexToA1(studentTaskHeaders.length - 1)}`,
    rowsToAdd
  );

  return {
    success: true,
    assignedCount: rowsToAdd.length,
    skippedDuplicate,
    message: "Student tasks assigned successfully."
  };
}

async function reserveStudentTaskIds(env, count) {
  const rows = await readRegistrationSheet(env, SYSTEM_CONFIG_SHEET);

  if (rows === null) {
    return { ok: false, error: "SystemConfig sheet not found" };
  }

  const rowIndex = rows.findIndex(row => clean(getValue(row, 0)) === "NextStudentTaskNumber");

  if (rowIndex === -1) {
    return { ok: false, error: "NextStudentTaskNumber not found" };
  }

  const current = Number(getValue(rows[rowIndex], 1));

  if (!current || current < 1) {
    return { ok: false, error: "NextStudentTaskNumber is invalid" };
  }

  const ids = Array.from({ length: count }, (_, index) => `STASK${current + index}`);

  await updateGoogleSheetValues(
    env,
    `${SYSTEM_CONFIG_SHEET}!B${rowIndex + 1}`,
    [[current + count]]
  );

  return { ok: true, ids };
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

function findColumn(headerMap, names) {
  for (const name of names) {
    const index = headerMap[normalizeHeader(name)];

    if (index !== undefined) {
      return index;
    }
  }

  return -1;
}

function getCell(row, headerMap, names, fallback = "") {
  const column = findColumn(headerMap, names);

  if (column === -1) return fallback;

  const value = Array.isArray(row) ? row[column] : undefined;
  return value === undefined || value === null ? fallback : value;
}

function setCell(row, headerMap, names, value) {
  const column = findColumn(headerMap, names);

  if (column !== -1) {
    row[column] = value;
  }
}

function getValue(row, index) {
  const value = Array.isArray(row) ? row[index] : "";
  return value === undefined || value === null ? "" : value;
}

function isTaskActiveValue(value) {
  if (value === undefined || value === null || value === "") return true;
  if (value === true) return true;

  return ["true", "1", "yes", "active"].includes(clean(value).toLowerCase());
}

function normalizeUsername(value) {
  return clean(value)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeHeader(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
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

function ensureTrailingSlash(value) {
  const text = clean(value) || DEFAULT_STUDENT_LOGIN_BASE;
  return text.endsWith("/") ? text : `${text}/`;
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
