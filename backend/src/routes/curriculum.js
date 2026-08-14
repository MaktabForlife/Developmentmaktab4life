import { getAuthUser, requireAdminOrSenior } from "../lib/auth.js";
import {
  appendAdminAuditLog,
  columnIndexToA1,
  getRequiredRowAuditColumns,
  prepareAdminAudit,
  stampCreatedRow,
  stampModifiedRow
} from "../lib/admin-audit.js";
import {
  appendGoogleSheetValues,
  readGoogleSheetValues,
  updateGoogleSheetValues
} from "../lib/google-sheets.js";
import { json } from "../lib/http.js";
import { nextSequentialId } from "../lib/sequential-ids.js";

const SUBJECT_LIST_SHEET = "SubjectList";
const TASK_LIST_SHEET = "TaskList";
const SUBJECT_RESOURCES_SHEET = "SubjectResources";
const FULL_SHEET_RANGE = "A:ZZ";
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

  const auditContext = await requireCurriculumAudit(env, permission.user, rows);
  if (!auditContext.ok) return auditContext.response;
  const now = auditContext.audit.timestamp;
  const subject = {
    subjectid: nextSequentialId(rows, "SUBJ"),
    subjectname: subjectName,
    active: true,
    createdate: now
  };

  const row = new Array((rows[0] || []).length).fill("");
  row[0] = subject.subjectid;
  row[1] = subject.subjectname;
  row[2] = subject.active;
  row[3] = subject.createdate;
  stampCreatedRow(row, auditContext.rowAudit.columns, auditContext.audit.actor, now);

  await appendGoogleSheetValues(env, appendRange(SUBJECT_LIST_SHEET, row.length), [row]);
  await appendAdminAuditLog(env, auditContext.audit, {
    action: "CREATE",
    recordType: "SUBJECT",
    recordId: subject.subjectid,
    changedFields: ["SubjectName", "Active"]
  });

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

  const changedFields = [];
  const updatedRow = copyRow(rows[rowIndex], (rows[0] || []).length);

  if (subjectName !== undefined) {
    updatedRow[1] = subjectName;
    changedFields.push("SubjectName");
  }

  if (body.active !== undefined) {
    updatedRow[2] = body.active;
    changedFields.push("Active");
  }

  if (changedFields.length === 0) {
    return json({ success: true, message: "No subject changes requested", subjectid });
  }

  const auditContext = await requireCurriculumAudit(env, permission.user, rows);
  if (!auditContext.ok) return auditContext.response;
  stampModifiedRow(
    updatedRow,
    auditContext.rowAudit.columns,
    auditContext.audit.actor,
    auditContext.audit.timestamp
  );

  await updateGoogleSheetValues(
    env,
    updateRange(SUBJECT_LIST_SHEET, rowIndex + 1, updatedRow.length),
    [updatedRow]
  );
  await appendAdminAuditLog(env, auditContext.audit, {
    action: "UPDATE",
    recordType: "SUBJECT",
    recordId: subjectid,
    changedFields
  });

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

  const auditContext = await requireCurriculumAudit(env, permission.user, rows);
  if (!auditContext.ok) return auditContext.response;
  const now = auditContext.audit.timestamp;
  const task = {
    taskid: nextSequentialId(rows, "TASK"),
    subjectid,
    taskname: taskName,
    audiolink: audioLink,
    visuallink: visualLink,
    videolink: videoLink,
    pdflink: pdfLink,
    active: true,
    createdate: now
  };

  const row = new Array((rows[0] || []).length).fill("");
  row[0] = task.taskid;
  row[1] = task.subjectid;
  row[2] = task.taskname;
  row[3] = task.audiolink;
  row[4] = task.visuallink;
  row[5] = task.videolink;
  row[6] = task.pdflink;
  row[7] = task.active;
  row[8] = task.createdate;
  stampCreatedRow(row, auditContext.rowAudit.columns, auditContext.audit.actor, now);

  await appendGoogleSheetValues(env, appendRange(TASK_LIST_SHEET, row.length), [row]);
  await appendAdminAuditLog(env, auditContext.audit, {
    action: "CREATE",
    recordType: "TASK",
    recordId: task.taskid,
    changedFields: [
      "SubjectID",
      "TaskName",
      "AudioLink",
      "VisualLink",
      "VideoLink",
      "PDFLink",
      "Active"
    ]
  });

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

  const changedFields = [];
  const updatedRow = copyRow(currentRow, (rows[0] || []).length);

  if (updates.subjectid !== undefined) { updatedRow[1] = updates.subjectid; changedFields.push("SubjectID"); }
  if (updates.taskName !== undefined) { updatedRow[2] = updates.taskName; changedFields.push("TaskName"); }
  if (updates.audioLink !== undefined) { updatedRow[3] = updates.audioLink; changedFields.push("AudioLink"); }
  if (updates.visualLink !== undefined) { updatedRow[4] = updates.visualLink; changedFields.push("VisualLink"); }
  if (updates.videoLink !== undefined) { updatedRow[5] = updates.videoLink; changedFields.push("VideoLink"); }
  if (updates.pdfLink !== undefined) { updatedRow[6] = updates.pdfLink; changedFields.push("PDFLink"); }
  if (updates.active !== undefined) { updatedRow[7] = updates.active; changedFields.push("Active"); }

  if (changedFields.length === 0) {
    return json({ success: true, message: "No task changes requested", taskid });
  }

  const auditContext = await requireCurriculumAudit(env, permission.user, rows);
  if (!auditContext.ok) return auditContext.response;
  stampModifiedRow(
    updatedRow,
    auditContext.rowAudit.columns,
    auditContext.audit.actor,
    auditContext.audit.timestamp
  );

  await updateGoogleSheetValues(
    env,
    updateRange(TASK_LIST_SHEET, rowIndex + 1, updatedRow.length),
    [updatedRow]
  );
  await appendAdminAuditLog(env, auditContext.audit, {
    action: "UPDATE",
    recordType: "TASK",
    recordId: taskid,
    changedFields
  });

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

  const auditContext = await requireCurriculumAudit(env, permission.user, rows);
  if (!auditContext.ok) return auditContext.response;
  const now = auditContext.audit.timestamp;
  const resource = {
    resourceid: nextSequentialId(rows, "RES"),
    subjectid,
    resourcename: resourceName,
    resourcetype: resourceType,
    resourcelink: resourceLink,
    active: true,
    createdate: now
  };

  const row = new Array((rows[0] || []).length).fill("");
  row[0] = resource.resourceid;
  row[1] = resource.subjectid;
  row[2] = resource.resourcename;
  row[3] = resource.resourcetype;
  row[4] = resource.resourcelink;
  row[5] = resource.active;
  row[6] = resource.createdate;
  stampCreatedRow(row, auditContext.rowAudit.columns, auditContext.audit.actor, now);

  await appendGoogleSheetValues(env, appendRange(SUBJECT_RESOURCES_SHEET, row.length), [row]);
  await appendAdminAuditLog(env, auditContext.audit, {
    action: "CREATE",
    recordType: "SUBJECT_RESOURCE",
    recordId: resource.resourceid,
    changedFields: ["SubjectID", "ResourceName", "ResourceType", "ResourceLink", "Active"]
  });

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

  const changedFields = [];
  const updatedRow = copyRow(rows[rowIndex], (rows[0] || []).length);

  if (updates.subjectid !== undefined) { updatedRow[1] = updates.subjectid; changedFields.push("SubjectID"); }
  if (updates.resourceName !== undefined) { updatedRow[2] = updates.resourceName; changedFields.push("ResourceName"); }
  if (updates.resourceType !== undefined) { updatedRow[3] = updates.resourceType; changedFields.push("ResourceType"); }
  if (updates.resourceLink !== undefined) { updatedRow[4] = updates.resourceLink; changedFields.push("ResourceLink"); }
  if (updates.active !== undefined) { updatedRow[5] = updates.active; changedFields.push("Active"); }

  if (changedFields.length === 0) {
    return json({ success: true, message: "No resource changes requested", resourceid });
  }

  const auditContext = await requireCurriculumAudit(env, permission.user, rows);
  if (!auditContext.ok) return auditContext.response;
  stampModifiedRow(
    updatedRow,
    auditContext.rowAudit.columns,
    auditContext.audit.actor,
    auditContext.audit.timestamp
  );

  await updateGoogleSheetValues(
    env,
    updateRange(SUBJECT_RESOURCES_SHEET, rowIndex + 1, updatedRow.length),
    [updatedRow]
  );
  await appendAdminAuditLog(env, auditContext.audit, {
    action: "UPDATE",
    recordType: "SUBJECT_RESOURCE",
    recordId: resourceid,
    changedFields
  });

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

async function requireCurriculumAudit(env, user, rows) {
  const rowAudit = getRequiredRowAuditColumns(rows?.[0] || []);

  if (!rowAudit.ok) {
    return {
      ok: false,
      response: json({ success: false, error: rowAudit.error }, 503)
    };
  }

  const audit = await prepareAdminAudit(env, user);

  if (!audit.ok) {
    return {
      ok: false,
      response: json({ success: false, error: audit.error }, 503)
    };
  }

  return { ok: true, rowAudit, audit };
}

function appendRange(sheetName, length) {
  return `${sheetName}!A:${columnIndexToA1(length - 1)}`;
}

function updateRange(sheetName, sheetRow, length) {
  return `${sheetName}!A${sheetRow}:${columnIndexToA1(length - 1)}${sheetRow}`;
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
