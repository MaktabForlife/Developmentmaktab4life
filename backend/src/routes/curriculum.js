import { getAuthUser, requireAdminOrSenior } from "../lib/auth.js";
import {
  appendGoogleSheetValues,
  readGoogleSheetValues,
  updateGoogleSheetValues
} from "../lib/google-sheets.js";
import { json } from "../lib/http.js";

const SUBJECT_LIST_SHEET = "SubjectList";
const TASK_LIST_SHEET = "TaskList";
const SUBJECT_RESOURCES_SHEET = "SubjectResources";
const SYSTEM_CONFIG_SHEET = "SystemConfig";
const FULL_SHEET_RANGE = "A:ZZ";
const SUBJECT_LIST_APPEND_RANGE = `${SUBJECT_LIST_SHEET}!A:D`;
const TASK_LIST_APPEND_RANGE = `${TASK_LIST_SHEET}!A:I`;
const SUBJECT_RESOURCES_APPEND_RANGE = `${SUBJECT_RESOURCES_SHEET}!A:G`;
const RESOURCE_TYPES = Object.freeze([
  "PDF",
  "AUDIO",
  "VIDEO",
  "IMAGE",
  "LINK",
  "TEXT",
  "OTHER"
]);

export async function createSubjectGoogleSheetsEndpoint(request, env) {
  const permission = await requireAdminOrSenior(request, env);

  if (!permission.ok) {
    return permission.response;
  }

  const body = await request.json();
  const subjectName = clean(body.subjectName);

  if (!subjectName) {
    return json({ success: false, error: "Missing subjectName" }, 400);
  }

  const rows = await readCurriculumSheet(env, SUBJECT_LIST_SHEET);

  if (rows === null) {
    return missingSheetResponse(SUBJECT_LIST_SHEET);
  }

  const duplicate = findSubjectByName(rows, subjectName);

  if (duplicate) {
    return json({
      success: false,
      duplicate: true,
      error: "Subject already exists",
      subject: duplicate
    });
  }

  const idResult = await reserveLegacyId(
    env,
    "NextSubjectNumber",
    "SUBJ"
  );

  if (!idResult.ok) {
    return json({ success: false, error: idResult.error });
  }

  const now = new Date().toISOString();
  const subject = {
    subjectid: idResult.id,
    subjectname: subjectName,
    active: true,
    createdate: now
  };

  await appendGoogleSheetValues(env, SUBJECT_LIST_APPEND_RANGE, [[
    subject.subjectid,
    subject.subjectname,
    subject.active,
    subject.createdate
  ]]);

  return json({ success: true, subject });
}

export async function updateSubjectGoogleSheetsEndpoint(request, env) {
  const permission = await requireAdminOrSenior(request, env);

  if (!permission.ok) {
    return permission.response;
  }

  const body = await request.json();
  const subjectid = clean(body.subjectid);

  if (!subjectid) {
    return json({ success: false, error: "Missing subjectid" }, 400);
  }

  let subjectName;

  if (body.subjectName !== undefined) {
    subjectName = clean(body.subjectName);

    if (!subjectName) {
      return json({ success: false, error: "Subject name cannot be empty" }, 400);
    }
  }

  if (body.active !== undefined && typeof body.active !== "boolean") {
    return json({ success: false, error: "active must be true or false" }, 400);
  }

  const rows = await readCurriculumSheet(env, SUBJECT_LIST_SHEET);

  if (rows === null) {
    return missingSheetResponse(SUBJECT_LIST_SHEET);
  }

  const rowIndex = findRowIndexById(rows, 0, subjectid);

  if (rowIndex === -1) {
    return json({ success: false, error: "Subject not found" });
  }

  if (subjectName !== undefined) {
    const duplicate = findSubjectByName(rows, subjectName, subjectid);

    if (duplicate) {
      return json({
        success: false,
        duplicate: true,
        error: "Another subject with that name already exists",
        subject: duplicate
      });
    }
  }

  const updatedRow = copyRow(rows[rowIndex], 4);

  if (subjectName !== undefined) {
    updatedRow[1] = subjectName;
  }

  if (body.active !== undefined) {
    updatedRow[2] = body.active;
  }

  await updateGoogleSheetValues(
    env,
    `${SUBJECT_LIST_SHEET}!A${rowIndex + 1}:D${rowIndex + 1}`,
    [updatedRow]
  );

  return json({
    success: true,
    message: "Subject updated successfully",
    subjectid
  });
}

export async function createTaskGoogleSheetsEndpoint(request, env) {
  const permission = await requireAdminOrSenior(request, env);

  if (!permission.ok) {
    return permission.response;
  }

  const body = await request.json();
  const subjectid = clean(body.subjectid);
  const taskName = clean(body.taskName);
  const audioLink = clean(body.audioLink);
  const visualLink = clean(body.visualLink);
  const videoLink = clean(body.videoLink);
  const pdfLink = clean(body.pdfLink);

  if (!subjectid) {
    return json({ success: false, error: "Missing subjectid" }, 400);
  }

  if (!taskName) {
    return json({ success: false, error: "Missing taskName" }, 400);
  }

  const rows = await readCurriculumSheet(env, TASK_LIST_SHEET);

  if (rows === null) {
    return missingSheetResponse(TASK_LIST_SHEET);
  }

  const duplicate = findTaskBySubjectAndName(rows, subjectid, taskName);

  if (duplicate) {
    return json({
      success: false,
      duplicate: true,
      error: "Task already exists for this subject",
      task: duplicate
    });
  }

  const idResult = await reserveLegacyId(env, "NextTaskNumber", "TASK");

  if (!idResult.ok) {
    return json({ success: false, error: idResult.error });
  }

  const now = new Date().toISOString();
  const task = {
    taskid: idResult.id,
    subjectid,
    taskname: taskName,
    audiolink: audioLink,
    visuallink: visualLink,
    videolink: videoLink,
    pdflink: pdfLink,
    active: true,
    createdate: now
  };

  await appendGoogleSheetValues(env, TASK_LIST_APPEND_RANGE, [[
    task.taskid,
    task.subjectid,
    task.taskname,
    task.audiolink,
    task.visuallink,
    task.videolink,
    task.pdflink,
    task.active,
    task.createdate
  ]]);

  return json({ success: true, task });
}

export async function updateTaskGoogleSheetsEndpoint(request, env) {
  const permission = await requireAdminOrSenior(request, env);

  if (!permission.ok) {
    return permission.response;
  }

  const body = await request.json();
  const taskid = clean(body.taskid);

  if (!taskid) {
    return json({ success: false, error: "Missing taskid" }, 400);
  }

  const updates = { taskid };

  if (body.subjectid !== undefined) {
    updates.subjectid = clean(body.subjectid);

    if (!updates.subjectid) {
      return json({ success: false, error: "subjectid cannot be empty" }, 400);
    }
  }

  if (body.taskName !== undefined) {
    updates.taskName = clean(body.taskName);

    if (!updates.taskName) {
      return json({ success: false, error: "taskName cannot be empty" }, 400);
    }
  }

  ["audioLink", "visualLink", "videoLink", "pdfLink"].forEach(field => {
    if (body[field] !== undefined) {
      updates[field] = clean(body[field]);
    }
  });

  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") {
      return json({ success: false, error: "active must be true or false" }, 400);
    }

    updates.active = body.active;
  }

  const rows = await readCurriculumSheet(env, TASK_LIST_SHEET);

  if (rows === null) {
    return missingSheetResponse(TASK_LIST_SHEET);
  }

  const rowIndex = findRowIndexById(rows, 0, taskid);

  if (rowIndex === -1) {
    return json({ success: false, error: "Task not found" });
  }

  const currentRow = rows[rowIndex];
  const subjectToCheck = updates.subjectid !== undefined
    ? updates.subjectid
    : clean(getValue(currentRow, 1));

  if (updates.taskName !== undefined) {
    const duplicate = findTaskBySubjectAndName(
      rows,
      subjectToCheck,
      updates.taskName,
      taskid,
      false
    );

    if (duplicate) {
      return json({
        success: false,
        duplicate: true,
        error: "Another task with that name already exists for this subject",
        task: duplicate
      });
    }
  }

  const updatedRow = copyRow(currentRow, 9);

  if (updates.subjectid !== undefined) updatedRow[1] = updates.subjectid;
  if (updates.taskName !== undefined) updatedRow[2] = updates.taskName;
  if (updates.audioLink !== undefined) updatedRow[3] = updates.audioLink;
  if (updates.visualLink !== undefined) updatedRow[4] = updates.visualLink;
  if (updates.videoLink !== undefined) updatedRow[5] = updates.videoLink;
  if (updates.pdfLink !== undefined) updatedRow[6] = updates.pdfLink;
  if (updates.active !== undefined) updatedRow[7] = updates.active;

  await updateGoogleSheetValues(
    env,
    `${TASK_LIST_SHEET}!A${rowIndex + 1}:I${rowIndex + 1}`,
    [updatedRow]
  );

  return json({
    success: true,
    message: "Task updated successfully",
    taskid
  });
}

export async function createSubjectResourceGoogleSheetsEndpoint(request, env) {
  const permission = await requireAdminOrSenior(request, env);

  if (!permission.ok) {
    return permission.response;
  }

  const body = await request.json();
  const subjectid = clean(body.subjectid);
  const resourceName = clean(body.resourceName);
  const resourceType = clean(body.resourceType).toUpperCase();
  const resourceLink = clean(body.resourceLink);

  if (!subjectid) {
    return json({ success: false, error: "Missing subjectid" }, 400);
  }

  if (!resourceName) {
    return json({ success: false, error: "Missing resourceName" }, 400);
  }

  if (!resourceType) {
    return json({ success: false, error: "Missing resourceType" }, 400);
  }

  if (!resourceLink) {
    return json({ success: false, error: "Missing resourceLink" }, 400);
  }

  if (!RESOURCE_TYPES.includes(resourceType)) {
    return json({ success: false, error: "Invalid resourceType" }, 400);
  }

  const rows = await readCurriculumSheet(env, SUBJECT_RESOURCES_SHEET);

  if (rows === null) {
    return missingSheetResponse(SUBJECT_RESOURCES_SHEET);
  }

  const idResult = await reserveLegacyId(
    env,
    "NextResourceNumber",
    "RES"
  );

  if (!idResult.ok) {
    return json({ success: false, error: idResult.error });
  }

  const now = new Date().toISOString();
  const resource = {
    resourceid: idResult.id,
    subjectid,
    resourcename: resourceName,
    resourcetype: resourceType,
    resourcelink: resourceLink,
    active: true,
    createdate: now
  };

  await appendGoogleSheetValues(env, SUBJECT_RESOURCES_APPEND_RANGE, [[
    resource.resourceid,
    resource.subjectid,
    resource.resourcename,
    resource.resourcetype,
    resource.resourcelink,
    resource.active,
    resource.createdate
  ]]);

  return json({ success: true, resource });
}

export async function updateSubjectResourceGoogleSheetsEndpoint(request, env) {
  const permission = await requireAdminOrSenior(request, env);

  if (!permission.ok) {
    return permission.response;
  }

  const body = await request.json();
  const resourceid = clean(body.resourceid);

  if (!resourceid) {
    return json({ success: false, error: "Missing resourceid" }, 400);
  }

  const updates = { resourceid };

  if (body.subjectid !== undefined) {
    updates.subjectid = clean(body.subjectid);

    if (!updates.subjectid) {
      return json({ success: false, error: "subjectid cannot be empty" }, 400);
    }
  }

  if (body.resourceName !== undefined) {
    updates.resourceName = clean(body.resourceName);

    if (!updates.resourceName) {
      return json({ success: false, error: "resourceName cannot be empty" }, 400);
    }
  }

  if (body.resourceType !== undefined) {
    updates.resourceType = clean(body.resourceType).toUpperCase();

    if (!RESOURCE_TYPES.includes(updates.resourceType)) {
      return json({ success: false, error: "Invalid resourceType" }, 400);
    }
  }

  if (body.resourceLink !== undefined) {
    updates.resourceLink = clean(body.resourceLink);

    if (!updates.resourceLink) {
      return json({ success: false, error: "resourceLink cannot be empty" }, 400);
    }
  }

  if (body.active !== undefined) {
    if (typeof body.active !== "boolean") {
      return json({ success: false, error: "active must be true or false" }, 400);
    }

    updates.active = body.active;
  }

  const rows = await readCurriculumSheet(env, SUBJECT_RESOURCES_SHEET);

  if (rows === null) {
    return missingSheetResponse(SUBJECT_RESOURCES_SHEET);
  }

  const rowIndex = findRowIndexById(rows, 0, resourceid);

  if (rowIndex === -1) {
    return json({ success: false, error: "Resource not found" });
  }

  const updatedRow = copyRow(rows[rowIndex], 7);

  if (updates.subjectid !== undefined) updatedRow[1] = updates.subjectid;
  if (updates.resourceName !== undefined) updatedRow[2] = updates.resourceName;
  if (updates.resourceType !== undefined) updatedRow[3] = updates.resourceType;
  if (updates.resourceLink !== undefined) updatedRow[4] = updates.resourceLink;
  if (updates.active !== undefined) updatedRow[5] = updates.active;

  await updateGoogleSheetValues(
    env,
    `${SUBJECT_RESOURCES_SHEET}!A${rowIndex + 1}:G${rowIndex + 1}`,
    [updatedRow]
  );

  return json({
    success: true,
    message: "Subject resource updated successfully",
    resourceid
  });
}

export async function listSubjectsGoogleSheetsEndpoint(request, env) {
  const auth = await requireAdminRead(request, env);

  if (!auth.ok) {
    return auth.response;
  }

  const rows = await readCurriculumSheet(env, SUBJECT_LIST_SHEET);

  if (rows === null) {
    return json({ success: false, error: `${SUBJECT_LIST_SHEET} sheet not found` });
  }

  return json(buildSubjectsResponse(rows));
}

export async function listTasksGoogleSheetsEndpoint(request, env) {
  const auth = await requireAdminRead(request, env);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const subjectid = clean(body.subjectid || "ALL");
  const activeOnly = body.activeOnly === true;
  const rows = await readCurriculumSheet(env, TASK_LIST_SHEET);

  if (rows === null) {
    return json({ success: false, error: `${TASK_LIST_SHEET} sheet not found` });
  }

  return json(buildTasksResponse(rows, { subjectid, activeOnly }));
}

export async function listSubjectResourcesGoogleSheetsEndpoint(request, env) {
  const auth = await requireAdminRead(request, env);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const subjectid = clean(body.subjectid || "ALL");
  const rows = await readCurriculumSheet(env, SUBJECT_RESOURCES_SHEET);

  if (rows === null) {
    return json({ success: false, error: `${SUBJECT_RESOURCES_SHEET} sheet not found` });
  }

  return json(buildSubjectResourcesResponse(rows, subjectid));
}

export function buildSubjectsResponse(rows = []) {
  const subjects = rows.slice(1).map(row => ({
    subjectid: getValue(row, 0),
    subjectname: getValue(row, 1),
    active: normalizeBooleanCell(getValue(row, 2)),
    createdate: getValue(row, 3)
  }));

  subjects.sort((a, b) => String(a.subjectname).localeCompare(String(b.subjectname)));

  return {
    success: true,
    count: subjects.length,
    subjects
  };
}

export function buildTasksResponse(rows = [], options = {}) {
  const requestedSubjectId = clean(options.subjectid || "ALL");
  const activeOnly = options.activeOnly === true;
  const tasks = [];

  rows.slice(1).forEach(row => {
    const subjectid = clean(getValue(row, 1));
    const active = normalizeBooleanCell(getValue(row, 7));

    if (requestedSubjectId !== "ALL" && subjectid !== requestedSubjectId) {
      return;
    }

    if (activeOnly && active !== true) {
      return;
    }

    tasks.push({
      taskid: getValue(row, 0),
      subjectid: getValue(row, 1),
      taskname: getValue(row, 2),
      audiolink: getValue(row, 3),
      visuallink: getValue(row, 4),
      videolink: getValue(row, 5),
      pdflink: getValue(row, 6),
      active,
      createdate: getValue(row, 8)
    });
  });

  tasks.sort((a, b) => {
    const subjectCompare = String(a.subjectid).localeCompare(String(b.subjectid));
    return subjectCompare !== 0
      ? subjectCompare
      : String(a.taskname).localeCompare(String(b.taskname));
  });

  return {
    success: true,
    subjectid: requestedSubjectId,
    count: tasks.length,
    tasks
  };
}

export function buildSubjectResourcesResponse(rows = [], subjectid = "ALL") {
  const requestedSubjectId = clean(subjectid || "ALL");
  const resources = [];

  rows.slice(1).forEach(row => {
    const rowSubjectId = clean(getValue(row, 1));

    if (requestedSubjectId !== "ALL" && rowSubjectId !== requestedSubjectId) {
      return;
    }

    resources.push({
      resourceid: getValue(row, 0),
      subjectid: getValue(row, 1),
      resourcename: getValue(row, 2),
      resourcetype: getValue(row, 3),
      resourcelink: getValue(row, 4),
      active: normalizeBooleanCell(getValue(row, 5)),
      createdate: getValue(row, 6)
    });
  });

  resources.sort((a, b) => {
    const subjectCompare = String(a.subjectid).localeCompare(String(b.subjectid));
    return subjectCompare !== 0
      ? subjectCompare
      : String(a.resourcename).localeCompare(String(b.resourcename));
  });

  return {
    success: true,
    subjectid: requestedSubjectId,
    count: resources.length,
    resources
  };
}

async function requireAdminRead(request, env) {
  const authUser = await getAuthUser(request, env);

  if (!authUser || authUser.type !== "admin") {
    return {
      ok: false,
      response: json({ success: false, error: "Unauthorized" }, 401)
    };
  }

  return { ok: true, user: authUser };
}

async function readCurriculumSheet(env, sheetName, range = FULL_SHEET_RANGE) {
  try {
    return await readGoogleSheetValues(env, `${sheetName}!${range}`);
  } catch (error) {
    if (isMissingSheetError(error, sheetName)) {
      return null;
    }

    throw error;
  }
}

async function reserveLegacyId(env, counterName, prefix) {
  const rows = await readCurriculumSheet(env, SYSTEM_CONFIG_SHEET, "A:B");

  if (rows === null) {
    return { ok: false, error: `${SYSTEM_CONFIG_SHEET} sheet not found` };
  }

  const rowIndex = rows.findIndex(row => clean(getValue(row, 0)) === counterName);

  if (rowIndex === -1) {
    return { ok: false, error: `${counterName} not found` };
  }

  const current = Number(getValue(rows[rowIndex], 1));

  if (!Number.isSafeInteger(current) || current < 0) {
    return { ok: false, error: `${counterName} must contain a valid number` };
  }

  await updateGoogleSheetValues(
    env,
    `${SYSTEM_CONFIG_SHEET}!B${rowIndex + 1}`,
    [[current + 1]]
  );

  return { ok: true, id: `${prefix}${current}` };
}

function findSubjectByName(rows, subjectName, excludedSubjectId = "") {
  const target = normalizeText(subjectName);
  const excludedId = clean(excludedSubjectId);

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];
    const subjectid = clean(getValue(row, 0));

    if (
      (!excludedId || subjectid !== excludedId) &&
      normalizeText(getValue(row, 1)) === target
    ) {
      return {
        row: index + 1,
        subjectid: getValue(row, 0),
        subjectname: getValue(row, 1),
        active: normalizeBooleanCell(getValue(row, 2)),
        createdate: getValue(row, 3)
      };
    }
  }

  return null;
}

function findTaskBySubjectAndName(
  rows,
  subjectid,
  taskName,
  excludedTaskId = "",
  includeLinks = true
) {
  const targetSubject = clean(subjectid);
  const targetTask = normalizeText(taskName);
  const excludedId = clean(excludedTaskId);

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];
    const taskid = clean(getValue(row, 0));

    if (
      (!excludedId || taskid !== excludedId) &&
      clean(getValue(row, 1)) === targetSubject &&
      normalizeText(getValue(row, 2)) === targetTask
    ) {
      const task = {
        taskid: getValue(row, 0),
        subjectid: getValue(row, 1),
        taskname: getValue(row, 2)
      };

      if (includeLinks) {
        task.audiolink = getValue(row, 3);
        task.visuallink = getValue(row, 4);
        task.videolink = getValue(row, 5);
        task.pdflink = getValue(row, 6);
      }

      task.active = normalizeBooleanCell(getValue(row, 7));
      task.createdate = getValue(row, 8);
      return task;
    }
  }

  return null;
}

function findRowIndexById(rows, columnIndex, id) {
  const target = clean(id);

  for (let index = 1; index < rows.length; index += 1) {
    if (clean(getValue(rows[index], columnIndex)) === target) {
      return index;
    }
  }

  return -1;
}

function copyRow(row, length) {
  const result = Array.isArray(row) ? row.slice(0, length) : [];

  while (result.length < length) {
    result.push("");
  }

  return result;
}

function normalizeText(value) {
  return clean(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function missingSheetResponse(sheetName) {
  return json({ success: false, error: `${sheetName} sheet not found` });
}

function normalizeBooleanCell(value) {
  if (value === true || value === false) {
    return value;
  }

  const text = clean(value).toUpperCase();

  if (text === "TRUE") {
    return true;
  }

  if (text === "FALSE") {
    return false;
  }

  return value;
}

function getValue(row, index) {
  const value = Array.isArray(row) ? row[index] : "";
  return value === null || value === undefined ? "" : value;
}

function isMissingSheetError(error, sheetName) {
  const message = error && error.message ? error.message : String(error || "");
  return message.includes("Google Sheets API error 400:") &&
    message.includes("Unable to parse range") &&
    message.toLowerCase().includes(String(sheetName).toLowerCase());
}

function clean(value) {
  return String(value === null || value === undefined ? "" : value).trim();
}
