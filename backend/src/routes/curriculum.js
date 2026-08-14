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
const MODULE_LIST_SHEET = "ModuleList";
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

export async function createModuleGoogleSheetsEndpoint(request, env) {
  const permission = await requireAdminOrSenior(request, env);
  if (!permission.ok) return permission.response;

  const body = await request.json();
  const subjectid = clean(body.subjectid);
  const moduleName = clean(body.moduleName || body.modulename);

  if (!subjectid) return json({ success: false, error: "Missing subjectid" }, 400);
  if (!moduleName) return json({ success: false, error: "Missing moduleName" }, 400);

  const [moduleRows, subjectRows] = await Promise.all([
    readCurriculumSheet(env, MODULE_LIST_SHEET),
    readCurriculumSheet(env, SUBJECT_LIST_SHEET)
  ]);

  if (moduleRows === null) return missingSheetResponse(MODULE_LIST_SHEET);
  if (subjectRows === null) return missingSheetResponse(SUBJECT_LIST_SHEET);

  const subject = findSubjectById(subjectRows, subjectid);
  if (!subject) return json({ success: false, error: "Subject not found" }, 404);

  const columns = getCurriculumColumns(moduleRows[0]);
  const required = requireColumns(columns, [
    "moduleid", "modulename", "subjectid", "active", "createddate"
  ], MODULE_LIST_SHEET);
  if (!required.ok) return json({ success: false, error: required.error }, 503);

  const duplicate = findModuleBySubjectAndName(moduleRows, subjectid, moduleName);
  if (duplicate) {
    return json({ success: false, duplicate: true, error: "Module already exists for this subject", module: duplicate }, 409);
  }

  const requestedSortOrder = normalizePositiveInteger(body.sortOrder || body.sortorder);
  const sortOrder = requestedSortOrder || nextModuleSortOrder(moduleRows, subjectid);
  const auditContext = await requireCurriculumAudit(env, permission.user, moduleRows);
  if (!auditContext.ok) return auditContext.response;
  const now = auditContext.audit.timestamp;
  const module = {
    moduleid: nextSequentialId(moduleRows, "MOD"),
    modulename: moduleName,
    subjectid,
    subjectname: subject.subjectname,
    sortorder: sortOrder,
    active: true,
    createddate: now
  };

  const row = new Array((moduleRows[0] || []).length).fill("");
  setColumnValue(row, columns, "moduleid", module.moduleid);
  setColumnValue(row, columns, "modulename", module.modulename);
  setColumnValue(row, columns, "subjectid", module.subjectid);
  setColumnValue(row, columns, "subjectname", module.subjectname);
  setColumnValue(row, columns, "sortorder", module.sortorder);
  setColumnValue(row, columns, "active", module.active);
  setColumnValue(row, columns, "createddate", module.createddate);
  setColumnValue(row, columns, "classgroup", "ALL");
  stampCreatedRow(row, auditContext.rowAudit.columns, auditContext.audit.actor, now);

  await appendGoogleSheetValues(env, appendRange(MODULE_LIST_SHEET, row.length), [row]);
  await appendAdminAuditLog(env, auditContext.audit, {
    action: "CREATE",
    recordType: "MODULE",
    recordId: module.moduleid,
    changedFields: ["SubjectID", "ModuleName", "SortOrder", "Active"]
  });

  return json({ success: true, message: "Module created", module });
}

export async function updateModuleGoogleSheetsEndpoint(request, env) {
  const permission = await requireAdminOrSenior(request, env);
  if (!permission.ok) return permission.response;

  const body = await request.json();
  const moduleid = clean(body.moduleid);
  if (!moduleid) return json({ success: false, error: "Missing moduleid" }, 400);

  const [moduleRows, subjectRows] = await Promise.all([
    readCurriculumSheet(env, MODULE_LIST_SHEET),
    readCurriculumSheet(env, SUBJECT_LIST_SHEET)
  ]);
  if (moduleRows === null) return missingSheetResponse(MODULE_LIST_SHEET);
  if (subjectRows === null) return missingSheetResponse(SUBJECT_LIST_SHEET);

  const columns = getCurriculumColumns(moduleRows[0]);
  const required = requireColumns(columns, [
    "moduleid", "modulename", "subjectid", "active", "createddate"
  ], MODULE_LIST_SHEET);
  if (!required.ok) return json({ success: false, error: required.error }, 503);

  const rowIndex = findRowIndexById(moduleRows, columns.moduleid, moduleid);
  if (rowIndex === -1) return json({ success: false, error: "Module not found" }, 404);

  const current = moduleFromRow(moduleRows[rowIndex], columns);
  const subjectid = body.subjectid !== undefined ? clean(body.subjectid) : current.subjectid;
  const moduleName = body.moduleName !== undefined || body.modulename !== undefined
    ? clean(body.moduleName || body.modulename)
    : current.modulename;
  const sortOrder = body.sortOrder !== undefined || body.sortorder !== undefined
    ? normalizePositiveInteger(body.sortOrder || body.sortorder)
    : current.sortorder;
  const active = body.active !== undefined ? body.active : current.active;

  if (!subjectid) return json({ success: false, error: "subjectid cannot be empty" }, 400);
  if (!moduleName) return json({ success: false, error: "moduleName cannot be empty" }, 400);
  if (!sortOrder) return json({ success: false, error: "Sort order must be a positive whole number" }, 400);
  if (typeof active !== "boolean") return json({ success: false, error: "active must be true or false" }, 400);

  const subject = findSubjectById(subjectRows, subjectid);
  if (!subject) return json({ success: false, error: "Subject not found" }, 404);

  const duplicate = findModuleBySubjectAndName(moduleRows, subjectid, moduleName, moduleid);
  if (duplicate) {
    return json({ success: false, duplicate: true, error: "Another module with that name already exists for this subject", module: duplicate }, 409);
  }

  const changedFields = [];
  if (current.subjectid !== subjectid) changedFields.push("SubjectID");
  if (current.modulename !== moduleName) changedFields.push("ModuleName");
  if (current.sortorder !== sortOrder) changedFields.push("SortOrder");
  if (current.active !== active) changedFields.push("Active");

  if (changedFields.length === 0) {
    return json({ success: true, message: "No module changes requested", module: current });
  }

  const auditContext = await requireCurriculumAudit(env, permission.user, moduleRows);
  if (!auditContext.ok) return auditContext.response;
  const updatedRow = copyRow(moduleRows[rowIndex], (moduleRows[0] || []).length);
  setColumnValue(updatedRow, columns, "subjectid", subjectid);
  setColumnValue(updatedRow, columns, "subjectname", subject.subjectname);
  setColumnValue(updatedRow, columns, "modulename", moduleName);
  setColumnValue(updatedRow, columns, "sortorder", sortOrder);
  setColumnValue(updatedRow, columns, "active", active);
  stampModifiedRow(updatedRow, auditContext.rowAudit.columns, auditContext.audit.actor, auditContext.audit.timestamp);

  await updateGoogleSheetValues(env, updateRange(MODULE_LIST_SHEET, rowIndex + 1, updatedRow.length), [updatedRow]);
  await appendAdminAuditLog(env, auditContext.audit, {
    action: "UPDATE",
    recordType: "MODULE",
    recordId: moduleid,
    changedFields
  });

  return json({
    success: true,
    message: "Module updated",
    module: { ...current, subjectid, subjectname: subject.subjectname, modulename: moduleName, sortorder: sortOrder, active }
  });
}

export async function listModulesGoogleSheetsEndpoint(request, env) {
  const auth = await requireAdminRead(request, env);
  if (!auth.ok) return auth.response;

  const body = await request.json();
  const subjectid = clean(body.subjectid || "ALL");
  const activeOnly = body.activeOnly === true;
  const rows = await readCurriculumSheet(env, MODULE_LIST_SHEET);
  if (rows === null) return json({ success: false, error: `${MODULE_LIST_SHEET} sheet not found` });

  return json(buildModulesResponse(rows, { subjectid, activeOnly }));
}

export async function createTaskGoogleSheetsEndpoint(request, env) {
  const permission = await requireAdminOrSenior(request, env);
  if (!permission.ok) return permission.response;

  const body = await request.json();
  const subjectid = clean(body.subjectid);
  const moduleid = clean(body.moduleid || body.moduleId);
  const taskName = clean(body.taskName);
  const audioLink = clean(body.audioLink);
  const visualLink = clean(body.visualLink || body.graphicLink);
  const videoLink = clean(body.videoLink);
  const pdfLink = clean(body.pdfLink);

  if (!subjectid) return json({ success: false, error: "Missing subjectid" }, 400);
  if (!taskName) return json({ success: false, error: "Missing taskName" }, 400);

  const [rows, subjectRows, moduleRows] = await Promise.all([
    readCurriculumSheet(env, TASK_LIST_SHEET),
    readCurriculumSheet(env, SUBJECT_LIST_SHEET),
    readCurriculumSheet(env, MODULE_LIST_SHEET)
  ]);
  if (rows === null) return missingSheetResponse(TASK_LIST_SHEET);
  if (subjectRows === null) return missingSheetResponse(SUBJECT_LIST_SHEET);
  if (moduleRows === null) return missingSheetResponse(MODULE_LIST_SHEET);

  const columns = getCurriculumColumns(rows[0]);
  const required = requireColumns(columns, [
    "taskid", "subjectid", "taskname", "active", "createddate"
  ], TASK_LIST_SHEET);
  if (!required.ok) return json({ success: false, error: required.error }, 503);

  const subject = findSubjectById(subjectRows, subjectid);
  if (!subject) return json({ success: false, error: "Subject not found" }, 404);

  const module = moduleid ? findModuleById(moduleRows, moduleid) : null;
  if (moduleid && (!module || module.subjectid !== subjectid)) {
    return json({ success: false, error: "The selected module does not belong to this subject" }, 409);
  }
  if (moduleid && !Number.isInteger(columns.moduleid)) {
    return json({ success: false, error: "TaskList is missing the ModuleID column" }, 503);
  }

  const duplicate = findTaskBySubjectAndName(rows, subjectid, taskName, "", true, moduleid);

  if (duplicate) {
    return json({
      success: false,
      duplicate: true,
      error: "Task already exists for this subject and module",
      task: duplicate
    }, 409);
  }

  const auditContext = await requireCurriculumAudit(env, permission.user, rows);
  if (!auditContext.ok) return auditContext.response;
  const now = auditContext.audit.timestamp;
  const task = {
    taskid: nextSequentialId(rows, "TASK"),
    subjectid,
    subjectname: subject.subjectname,
    moduleid,
    modulename: module ? module.modulename : "",
    taskname: taskName,
    audiolink: audioLink,
    visuallink: visualLink,
    videolink: videoLink,
    pdflink: pdfLink,
    active: true,
    createdate: now
  };

  const row = new Array((rows[0] || []).length).fill("");
  setColumnValue(row, columns, "taskid", task.taskid);
  setColumnValue(row, columns, "subjectid", task.subjectid);
  setColumnValue(row, columns, "subjectname", task.subjectname);
  setColumnValue(row, columns, "moduleid", task.moduleid);
  setColumnValue(row, columns, "modulename", task.modulename);
  setColumnValue(row, columns, "taskname", task.taskname);
  setColumnValue(row, columns, "audiolink", task.audiolink);
  setColumnValue(row, columns, "visuallink", task.visuallink);
  setColumnValue(row, columns, "videolink", task.videolink);
  setColumnValue(row, columns, "pdflink", task.pdflink);
  setColumnValue(row, columns, "active", task.active);
  setColumnValue(row, columns, "createddate", task.createddate);
  stampCreatedRow(row, auditContext.rowAudit.columns, auditContext.audit.actor, now);

  await appendGoogleSheetValues(env, appendRange(TASK_LIST_SHEET, row.length), [row]);
  await appendAdminAuditLog(env, auditContext.audit, {
    action: "CREATE",
    recordType: "TASK",
    recordId: task.taskid,
    changedFields: [
      "SubjectID",
      "ModuleID",
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
  if (!permission.ok) return permission.response;

  const body = await request.json();
  const taskid = clean(body.taskid);
  if (!taskid) return json({ success: false, error: "Missing taskid" }, 400);

  const [rows, subjectRows, moduleRows] = await Promise.all([
    readCurriculumSheet(env, TASK_LIST_SHEET),
    readCurriculumSheet(env, SUBJECT_LIST_SHEET),
    readCurriculumSheet(env, MODULE_LIST_SHEET)
  ]);
  if (rows === null) return missingSheetResponse(TASK_LIST_SHEET);
  if (subjectRows === null) return missingSheetResponse(SUBJECT_LIST_SHEET);
  if (moduleRows === null) return missingSheetResponse(MODULE_LIST_SHEET);

  const columns = getCurriculumColumns(rows[0]);
  const required = requireColumns(columns, [
    "taskid", "subjectid", "taskname", "active", "createddate"
  ], TASK_LIST_SHEET);
  if (!required.ok) return json({ success: false, error: required.error }, 503);

  const rowIndex = findRowIndexById(rows, columns.taskid, taskid);
  if (rowIndex === -1) return json({ success: false, error: "Task not found" }, 404);

  const currentRow = rows[rowIndex];
  const current = taskFromRow(currentRow, columns);
  const moduleProvided = Object.prototype.hasOwnProperty.call(body, "moduleid") ||
    Object.prototype.hasOwnProperty.call(body, "moduleId");
  const subjectid = body.subjectid !== undefined ? clean(body.subjectid) : current.subjectid;
  const moduleid = moduleProvided ? clean(body.moduleid || body.moduleId) : current.moduleid;
  const taskName = body.taskName !== undefined ? clean(body.taskName) : current.taskname;
  const active = body.active !== undefined ? body.active : current.active;
  const audioLink = body.audioLink !== undefined ? clean(body.audioLink) : current.audiolink;
  const visualLink = body.visualLink !== undefined || body.graphicLink !== undefined
    ? clean(body.visualLink || body.graphicLink)
    : current.visuallink;
  const videoLink = body.videoLink !== undefined ? clean(body.videoLink) : current.videolink;
  const pdfLink = body.pdfLink !== undefined ? clean(body.pdfLink) : current.pdflink;

  if (!subjectid) return json({ success: false, error: "subjectid cannot be empty" }, 400);
  if (!taskName) return json({ success: false, error: "taskName cannot be empty" }, 400);
  if (typeof active !== "boolean") return json({ success: false, error: "active must be true or false" }, 400);

  const subject = findSubjectById(subjectRows, subjectid);
  if (!subject) return json({ success: false, error: "Subject not found" }, 404);
  const module = moduleid ? findModuleById(moduleRows, moduleid) : null;
  if (moduleid && (!module || module.subjectid !== subjectid)) {
    return json({ success: false, error: "The selected module does not belong to this subject" }, 409);
  }
  if (moduleid && !Number.isInteger(columns.moduleid)) {
    return json({ success: false, error: "TaskList is missing the ModuleID column" }, 503);
  }

  const duplicate = findTaskBySubjectAndName(rows, subjectid, taskName, taskid, false, moduleid);
  if (duplicate) {
    return json({
      success: false,
      duplicate: true,
      error: "Another task with that name already exists for this subject and module",
      task: duplicate
    }, 409);
  }

  const proposed = {
    ...current,
    subjectid,
    subjectname: subject.subjectname,
    moduleid,
    modulename: module ? module.modulename : "",
    taskname: taskName,
    audiolink: audioLink,
    visuallink: visualLink,
    videolink: videoLink,
    pdflink: pdfLink,
    active
  };
  const changedFields = getTaskChangedFields(current, proposed);
  if (changedFields.length === 0) {
    return json({ success: true, message: "No task changes requested", task: current });
  }

  const auditContext = await requireCurriculumAudit(env, permission.user, rows);
  if (!auditContext.ok) return auditContext.response;
  const updatedRow = copyRow(currentRow, (rows[0] || []).length);
  setColumnValue(updatedRow, columns, "subjectid", proposed.subjectid);
  setColumnValue(updatedRow, columns, "subjectname", proposed.subjectname);
  setColumnValue(updatedRow, columns, "moduleid", proposed.moduleid);
  setColumnValue(updatedRow, columns, "modulename", proposed.modulename);
  setColumnValue(updatedRow, columns, "taskname", proposed.taskname);
  setColumnValue(updatedRow, columns, "audiolink", proposed.audiolink);
  setColumnValue(updatedRow, columns, "visuallink", proposed.visuallink);
  setColumnValue(updatedRow, columns, "videolink", proposed.videolink);
  setColumnValue(updatedRow, columns, "pdflink", proposed.pdflink);
  setColumnValue(updatedRow, columns, "active", proposed.active);
  stampModifiedRow(updatedRow, auditContext.rowAudit.columns, auditContext.audit.actor, auditContext.audit.timestamp);

  await updateGoogleSheetValues(env, updateRange(TASK_LIST_SHEET, rowIndex + 1, updatedRow.length), [updatedRow]);
  await appendAdminAuditLog(env, auditContext.audit, {
    action: "UPDATE",
    recordType: "TASK",
    recordId: taskid,
    changedFields
  });

  return json({ success: true, message: "Task updated successfully", task: proposed });
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

export function buildModulesResponse(rows = [], options = {}) {
  const requestedSubjectId = clean(options.subjectid || "ALL");
  const activeOnly = options.activeOnly === true;
  const columns = getCurriculumColumns(rows[0]);
  const modules = rows.slice(1).map(row => moduleFromRow(row, columns)).filter(module => {
    if (!module.moduleid || !module.modulename) return false;
    if (requestedSubjectId !== "ALL" && module.subjectid !== requestedSubjectId) return false;
    if (activeOnly && module.active !== true) return false;
    return true;
  });

  modules.sort((left, right) => (
    String(left.subjectid).localeCompare(String(right.subjectid)) ||
    Number(left.sortorder || 0) - Number(right.sortorder || 0) ||
    String(left.modulename).localeCompare(String(right.modulename))
  ));

  return {
    success: true,
    subjectid: requestedSubjectId,
    count: modules.length,
    modules
  };
}

export function buildTasksResponse(rows = [], options = {}) {
  const requestedSubjectId = clean(options.subjectid || "ALL");
  const activeOnly = options.activeOnly === true;
  const columns = getCurriculumColumns(rows[0]);
  const tasks = [];

  rows.slice(1).forEach(row => {
    const task = taskFromRow(row, columns);

    if (requestedSubjectId !== "ALL" && task.subjectid !== requestedSubjectId) {
      return;
    }

    if (activeOnly && task.active !== true) {
      return;
    }

    if (task.taskid && task.taskname) tasks.push(task);
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
  includeLinks = true,
  moduleid = ""
) {
  const targetSubject = clean(subjectid);
  const targetModule = clean(moduleid);
  const targetTask = normalizeText(taskName);
  const excludedId = clean(excludedTaskId);
  const columns = getCurriculumColumns(rows[0]);

  for (let index = 1; index < rows.length; index += 1) {
    const row = rows[index];
    const task = taskFromRow(row, columns);

    if (
      (!excludedId || task.taskid !== excludedId) &&
      task.subjectid === targetSubject &&
      task.moduleid === targetModule &&
      normalizeText(task.taskname) === targetTask
    ) {
      if (includeLinks) return task;
      return {
        taskid: task.taskid,
        subjectid: task.subjectid,
        moduleid: task.moduleid,
        taskname: task.taskname,
        active: task.active,
        createdate: task.createdate
      };
    }
  }

  return null;
}

function getCurriculumColumns(headers = []) {
  return {
    subjectid: findHeaderIndex(headers, ["SubjectID", "SubjectId"]),
    subjectname: findHeaderIndex(headers, ["SubjectName"]),
    moduleid: findHeaderIndex(headers, ["ModuleID", "ModuleId"]),
    modulename: findHeaderIndex(headers, ["ModuleName"]),
    sortorder: findHeaderIndex(headers, ["SortOrder", "Sort Order", "ModuleNo"]),
    classgroup: findHeaderIndex(headers, ["ClassGroup", "classgroup", "GroupNo"]),
    taskid: findHeaderIndex(headers, ["TaskID", "TaskId"]),
    taskname: findHeaderIndex(headers, ["TaskName"]),
    audiolink: findHeaderIndex(headers, ["AudioLink"]),
    visuallink: findHeaderIndex(headers, ["VisualLink", "GraphicLink"]),
    videolink: findHeaderIndex(headers, ["VideoLink"]),
    pdflink: findHeaderIndex(headers, ["PDFLink", "PdfLink"]),
    active: findHeaderIndex(headers, ["Active"]),
    createddate: findHeaderIndex(headers, ["CreatedDate", "CreateDate", "Date"])
  };
}

function findHeaderIndex(headers, aliases) {
  const targets = new Set(aliases.map(normalizeHeaderName));
  return (Array.isArray(headers) ? headers : []).findIndex(header => targets.has(normalizeHeaderName(header)));
}

function normalizeHeaderName(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function requireColumns(columns, names, sheetName) {
  const missing = names.filter(name => !Number.isInteger(columns[name]) || columns[name] < 0);
  return missing.length === 0
    ? { ok: true }
    : { ok: false, error: `${sheetName} is missing required columns: ${missing.join(", ")}` };
}

function setColumnValue(row, columns, name, value) {
  const index = columns[name];
  if (Number.isInteger(index) && index >= 0) row[index] = value;
}

function findSubjectById(rows, subjectid) {
  const target = clean(subjectid);
  const row = rows.slice(1).find(item => clean(getValue(item, 0)) === target);
  return row ? {
    subjectid: clean(getValue(row, 0)),
    subjectname: clean(getValue(row, 1)),
    active: normalizeBooleanCell(getValue(row, 2))
  } : null;
}

function moduleFromRow(row, columns) {
  return {
    moduleid: clean(getValue(row, columns.moduleid)),
    modulename: clean(getValue(row, columns.modulename)),
    subjectid: clean(getValue(row, columns.subjectid)),
    subjectname: clean(getValue(row, columns.subjectname)),
    sortorder: Number(getValue(row, columns.sortorder)) || 0,
    active: normalizeBooleanCell(getValue(row, columns.active)),
    createddate: getValue(row, columns.createddate)
  };
}

function findModuleById(rows, moduleid) {
  const columns = getCurriculumColumns(rows[0]);
  const target = clean(moduleid);
  const row = rows.slice(1).find(item => clean(getValue(item, columns.moduleid)) === target);
  return row ? moduleFromRow(row, columns) : null;
}

function findModuleBySubjectAndName(rows, subjectid, moduleName, excludedModuleId = "") {
  const columns = getCurriculumColumns(rows[0]);
  const targetSubject = clean(subjectid);
  const targetName = normalizeText(moduleName);
  const excluded = clean(excludedModuleId);

  for (let index = 1; index < rows.length; index += 1) {
    const module = moduleFromRow(rows[index], columns);
    if (
      (!excluded || module.moduleid !== excluded) &&
      module.subjectid === targetSubject &&
      normalizeText(module.modulename) === targetName
    ) {
      return module;
    }
  }

  return null;
}

function nextModuleSortOrder(rows, subjectid) {
  const columns = getCurriculumColumns(rows[0]);
  return rows.slice(1).reduce((maximum, row) => {
    const module = moduleFromRow(row, columns);
    return module.subjectid === subjectid ? Math.max(maximum, module.sortorder || 0) : maximum;
  }, 0) + 1;
}

function normalizePositiveInteger(value) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : 0;
}

function taskFromRow(row, columns) {
  return {
    taskid: clean(getValue(row, columns.taskid)),
    subjectid: clean(getValue(row, columns.subjectid)),
    subjectname: clean(getValue(row, columns.subjectname)),
    moduleid: clean(getValue(row, columns.moduleid)),
    modulename: clean(getValue(row, columns.modulename)),
    taskname: clean(getValue(row, columns.taskname)),
    audiolink: clean(getValue(row, columns.audiolink)),
    visuallink: clean(getValue(row, columns.visuallink)),
    videolink: clean(getValue(row, columns.videolink)),
    pdflink: clean(getValue(row, columns.pdflink)),
    active: normalizeBooleanCell(getValue(row, columns.active)),
    createdate: getValue(row, columns.createddate)
  };
}

function getTaskChangedFields(current, proposed) {
  const fields = [
    ["subjectid", "SubjectID"],
    ["moduleid", "ModuleID"],
    ["taskname", "TaskName"],
    ["audiolink", "AudioLink"],
    ["visuallink", "VisualLink"],
    ["videolink", "VideoLink"],
    ["pdflink", "PDFLink"],
    ["active", "Active"]
  ];
  return fields.filter(([key]) => current[key] !== proposed[key]).map(([, label]) => label);
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
