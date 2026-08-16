/* M4L V102.6 - ADMIN/GLOBAL_ADMIN management of central global curriculum and access. */

import { getAuthUser } from "../lib/auth.js";
import { batchUpdateGoogleSheetValues } from "../lib/google-sheets.js";
import { json } from "../lib/http.js";
import {
  getPlatformSpreadsheetId,
  readPlatformSheet
} from "../lib/platform-sheet.js";
import {
  isActivePlatformValue,
  normalizePlatformIdentifier,
  PLATFORM_SHEET_HEADERS
} from "../lib/platform-schema.js";

const GLOBAL_RESOURCE_TYPES = new Set(["EBOOK", "PRINTABLE", "AUDIO", "VIDEO", "OTHER"]);
const MAX_NAME_LENGTH = 160;
const MAX_DESCRIPTION_LENGTH = 2000;
const MAX_FORMAT_LENGTH = 40;
const MAX_LINK_LENGTH = 2000;

export async function getPlatformGlobalManagementEndpoint(request, env) {
  const permission = await requireGlobalCurriculumAdmin(request, env);
  if (!permission.ok) return permission.response;

  try {
    const tables = await readManagementTables(env);
    return json({
      success: true,
      service: "platform-global-management",
      globalCurriculumVersion: readGlobalCurriculumVersion(tables.PlatformConfig).value,
      subjects: tables.GlobalSubjectList.map(mapSubject),
      modules: tables.GlobalModuleList.map(mapModule),
      tasks: tables.GlobalTaskList.map(mapTask),
      resources: tables.GlobalResources.map(mapResource),
      accounts: tables.UserAccounts.map(mapAccount),
      subjectAccess: tables.UserGlobalSubjectAccess.map(mapSubjectAccess)
    });
  } catch (error) {
    return managementError(error, env);
  }
}

export async function savePlatformGlobalSubjectEndpoint(request, env) {
  const permission = await requireGlobalCurriculumAdmin(request, env);
  if (!permission.ok) return permission.response;

  try {
    const body = await request.json();
    const subjectId = clean(body.subjectId || body.subjectid);
    const subjectName = requireText(body.subjectName || body.subjectname, "Subject name", MAX_NAME_LENGTH);
    const requestedActive = readBoolean(body.active, subjectId ? null : true);
    const tables = await readManagementTables(env);
    const existing = subjectId
      ? uniqueRecord(tables.GlobalSubjectList, "SubjectID", subjectId, "Global subject")
      : null;

    assertNoDuplicateName(
      tables.GlobalSubjectList,
      "SubjectName",
      subjectName,
      existing?.SubjectID,
      "Global subject"
    );

    const timestamp = new Date().toISOString();
    const record = existing
      ? {
          ...existing,
          SubjectName: subjectName,
          Active: requestedActive,
          ModifiedByAccountID: permission.user.accountid,
          ModifiedByAccountName: permission.user.username,
          ModifiedDate: timestamp
        }
      : {
          SubjectID: createPlatformId("GSUBJ"),
          SubjectName: subjectName,
          Active: requestedActive,
          CreatedDate: timestamp,
          CreatedByAccountID: permission.user.accountid,
          CreatedByAccountName: permission.user.username,
          ModifiedByAccountID: "",
          ModifiedByAccountName: "",
          ModifiedDate: ""
        };
    const changedFields = existing
      ? changedRecordFields(existing, record, ["SubjectName", "Active"])
      : ["SubjectName", "Active"];

    if (existing && changedFields.length === 0) {
      return json({ success: true, message: "No global subject changes requested", subject: mapSubject(existing) });
    }

    const dependencies = subjectDependencies(tables, record.SubjectID);
    await writeCurriculumMutation(env, permission.user, tables, {
      sheetName: "GlobalSubjectList",
      rowNumber: existing?._rowNumber || nextRowNumber(tables.GlobalSubjectList),
      record,
      action: existing ? "UPDATE_GLOBAL_SUBJECT" : "CREATE_GLOBAL_SUBJECT",
      recordType: "GLOBAL_SUBJECT",
      recordId: record.SubjectID,
      changedFields,
      timestamp
    });

    return json({
      success: true,
      message: existing ? "Global subject updated" : "Global subject created",
      subject: mapSubject(record),
      dependencies: requestedActive ? undefined : dependencies
    });
  } catch (error) {
    return mutationError(error, env);
  }
}

export async function savePlatformGlobalModuleEndpoint(request, env) {
  const permission = await requireGlobalCurriculumAdmin(request, env);
  if (!permission.ok) return permission.response;

  try {
    const body = await request.json();
    const moduleId = clean(body.moduleId || body.moduleid);
    const subjectId = clean(body.subjectId || body.subjectid);
    const moduleName = requireText(body.moduleName || body.modulename, "Module name", MAX_NAME_LENGTH);
    const requestedActive = readBoolean(body.active, moduleId ? null : true);
    const sortOrder = readPositiveInteger(body.sortOrder ?? body.sortorder, "Sort order");
    const tables = await readManagementTables(env);
    const subject = uniqueRecord(tables.GlobalSubjectList, "SubjectID", subjectId, "Global subject");
    if (requestedActive && !isActivePlatformValue(subject.Active)) {
      throw clientError("An active module requires an active global subject", 409);
    }
    const existing = moduleId
      ? uniqueRecord(tables.GlobalModuleList, "ModuleID", moduleId, "Global module")
      : null;
    if (existing && normalizePlatformIdentifier(existing.SubjectID) !== normalizePlatformIdentifier(subjectId)) {
      const dependencies = moduleDependencies(tables, existing.ModuleID);
      if (dependencies.tasks > 0 || dependencies.resources > 0) {
        throw clientError("Move the module's dependent tasks and resources before changing its subject", 409);
      }
    }
    assertNoDuplicateChildName(
      tables.GlobalModuleList,
      "SubjectID",
      subjectId,
      "ModuleName",
      moduleName,
      existing?.ModuleID,
      "Global module"
    );

    const timestamp = new Date().toISOString();
    const record = existing
      ? {
          ...existing,
          SubjectID: subjectId,
          ModuleName: moduleName,
          SortOrder: sortOrder,
          Active: requestedActive,
          ModifiedByAccountID: permission.user.accountid,
          ModifiedByAccountName: permission.user.username,
          ModifiedDate: timestamp
        }
      : {
          ModuleID: createPlatformId("GMOD"),
          SubjectID: subjectId,
          ModuleName: moduleName,
          SortOrder: sortOrder,
          Active: requestedActive,
          CreatedDate: timestamp,
          CreatedByAccountID: permission.user.accountid,
          CreatedByAccountName: permission.user.username,
          ModifiedByAccountID: "",
          ModifiedByAccountName: "",
          ModifiedDate: ""
        };
    const changedFields = existing
      ? changedRecordFields(existing, record, ["SubjectID", "ModuleName", "SortOrder", "Active"])
      : ["SubjectID", "ModuleName", "SortOrder", "Active"];
    if (existing && changedFields.length === 0) {
      return json({ success: true, message: "No global module changes requested", module: mapModule(existing) });
    }
    const dependencies = moduleDependencies(tables, record.ModuleID);

    await writeCurriculumMutation(env, permission.user, tables, {
      sheetName: "GlobalModuleList",
      rowNumber: existing?._rowNumber || nextRowNumber(tables.GlobalModuleList),
      record,
      action: existing ? "UPDATE_GLOBAL_MODULE" : "CREATE_GLOBAL_MODULE",
      recordType: "GLOBAL_MODULE",
      recordId: record.ModuleID,
      changedFields,
      timestamp
    });

    return json({
      success: true,
      message: existing ? "Global module updated" : "Global module created",
      module: mapModule(record),
      dependencies: requestedActive ? undefined : dependencies
    });
  } catch (error) {
    return mutationError(error, env);
  }
}

export async function savePlatformGlobalTaskEndpoint(request, env) {
  const permission = await requireGlobalCurriculumAdmin(request, env);
  if (!permission.ok) return permission.response;

  try {
    const body = await request.json();
    const taskId = clean(body.taskId || body.taskid);
    const subjectId = clean(body.subjectId || body.subjectid);
    const moduleId = clean(body.moduleId || body.moduleid);
    const taskName = requireText(body.taskName || body.taskname, "Task name", MAX_NAME_LENGTH);
    const requestedActive = readBoolean(body.active, taskId ? null : true);
    const tables = await readManagementTables(env);
    const subject = uniqueRecord(tables.GlobalSubjectList, "SubjectID", subjectId, "Global subject");
    if (requestedActive && !isActivePlatformValue(subject.Active)) {
      throw clientError("An active task requires an active global subject", 409);
    }
    let module = null;
    if (moduleId) {
      module = uniqueRecord(tables.GlobalModuleList, "ModuleID", moduleId, "Global module");
      if (normalizePlatformIdentifier(module.SubjectID) !== normalizePlatformIdentifier(subjectId)) {
        throw clientError("The selected global module does not belong to the selected subject", 409);
      }
      if (requestedActive && !isActivePlatformValue(module.Active)) {
        throw clientError("An active task requires an active global module", 409);
      }
    }
    const existing = taskId
      ? uniqueRecord(tables.GlobalTaskList, "TaskID", taskId, "Global task")
      : null;
    if (existing && (
      normalizePlatformIdentifier(existing.SubjectID) !== normalizePlatformIdentifier(subjectId) ||
      normalizePlatformIdentifier(existing.ModuleID) !== normalizePlatformIdentifier(moduleId)
    )) {
      const dependencies = taskDependencies(tables, existing.TaskID);
      if (dependencies.resources > 0) {
        throw clientError("Move the task's dependent resources before changing its curriculum branch", 409);
      }
    }
    assertNoDuplicateTask(tables.GlobalTaskList, subjectId, moduleId, taskName, existing?.TaskID);

    const timestamp = new Date().toISOString();
    const record = existing
      ? {
          ...existing,
          SubjectID: subjectId,
          ModuleID: moduleId,
          TaskName: taskName,
          Active: requestedActive,
          ModifiedByAccountID: permission.user.accountid,
          ModifiedByAccountName: permission.user.username,
          ModifiedDate: timestamp
        }
      : {
          TaskID: createPlatformId("GTASK"),
          SubjectID: subjectId,
          ModuleID: moduleId,
          TaskName: taskName,
          Active: requestedActive,
          CreatedDate: timestamp,
          CreatedByAccountID: permission.user.accountid,
          CreatedByAccountName: permission.user.username,
          ModifiedByAccountID: "",
          ModifiedByAccountName: "",
          ModifiedDate: ""
        };
    const changedFields = existing
      ? changedRecordFields(existing, record, ["SubjectID", "ModuleID", "TaskName", "Active"])
      : ["SubjectID", "ModuleID", "TaskName", "Active"];
    if (existing && changedFields.length === 0) {
      return json({ success: true, message: "No global task changes requested", task: mapTask(existing) });
    }
    const dependencies = taskDependencies(tables, record.TaskID);

    await writeCurriculumMutation(env, permission.user, tables, {
      sheetName: "GlobalTaskList",
      rowNumber: existing?._rowNumber || nextRowNumber(tables.GlobalTaskList),
      record,
      action: existing ? "UPDATE_GLOBAL_TASK" : "CREATE_GLOBAL_TASK",
      recordType: "GLOBAL_TASK",
      recordId: record.TaskID,
      changedFields,
      timestamp
    });

    return json({
      success: true,
      message: existing ? "Global task updated" : "Global task created",
      task: mapTask(record),
      dependencies: requestedActive ? undefined : dependencies
    });
  } catch (error) {
    return mutationError(error, env);
  }
}

export async function savePlatformGlobalResourceEndpoint(request, env) {
  const permission = await requireGlobalCurriculumAdmin(request, env);
  if (!permission.ok) return permission.response;

  try {
    const body = await request.json();
    const resourceId = clean(body.resourceId || body.resourceid);
    const subjectId = clean(body.subjectId || body.subjectid);
    const moduleId = clean(body.moduleId || body.moduleid);
    const taskId = clean(body.taskId || body.taskid);
    const resourceName = requireText(body.resourceName || body.resourcename, "Resource name", MAX_NAME_LENGTH);
    const resourceType = normalizePlatformIdentifier(body.resourceType || body.resourcetype);
    const resourceFormat = optionalText(body.resourceFormat || body.resourceformat, "Resource format", MAX_FORMAT_LENGTH);
    const resourceDescription = optionalText(
      body.resourceDescription || body.resourcedescription,
      "Resource description",
      MAX_DESCRIPTION_LENGTH
    );
    const resourceLink = requireText(body.resourceLink || body.resourcelink, "Resource link", MAX_LINK_LENGTH);
    const requestedActive = readBoolean(body.active, resourceId ? null : true);
    if (!GLOBAL_RESOURCE_TYPES.has(resourceType)) {
      throw clientError("Resource type must be EBOOK, PRINTABLE, AUDIO, VIDEO, or OTHER", 400);
    }
    if (!isHttpsUrl(resourceLink)) {
      throw clientError("Global resource link must be a complete HTTPS URL", 400);
    }

    const tables = await readManagementTables(env);
    const subject = uniqueRecord(tables.GlobalSubjectList, "SubjectID", subjectId, "Global subject");
    if (requestedActive && !isActivePlatformValue(subject.Active)) {
      throw clientError("An active resource requires an active global subject", 409);
    }
    let module = null;
    if (moduleId) {
      module = uniqueRecord(tables.GlobalModuleList, "ModuleID", moduleId, "Global module");
      if (normalizePlatformIdentifier(module.SubjectID) !== normalizePlatformIdentifier(subjectId)) {
        throw clientError("The selected global module does not belong to the selected subject", 409);
      }
    }
    if (taskId) {
      const task = uniqueRecord(tables.GlobalTaskList, "TaskID", taskId, "Global task");
      if (normalizePlatformIdentifier(task.SubjectID) !== normalizePlatformIdentifier(subjectId)) {
        throw clientError("The selected global task does not belong to the selected subject", 409);
      }
      if (moduleId && normalizePlatformIdentifier(task.ModuleID) !== normalizePlatformIdentifier(moduleId)) {
        throw clientError("The selected global task does not belong to the selected module", 409);
      }
    }
    const existing = resourceId
      ? uniqueRecord(tables.GlobalResources, "ResourceID", resourceId, "Global resource")
      : null;
    assertNoDuplicateResource(tables.GlobalResources, subjectId, moduleId, taskId, resourceName, existing?.ResourceID);

    const timestamp = new Date().toISOString();
    const record = existing
      ? {
          ...existing,
          SubjectID: subjectId,
          ModuleID: moduleId,
          TaskID: taskId,
          ResourceName: resourceName,
          ResourceType: resourceType,
          ResourceFormat: resourceFormat,
          ResourceDescription: resourceDescription,
          ResourceLink: resourceLink,
          Active: requestedActive,
          ModifiedByAccountID: permission.user.accountid,
          ModifiedByAccountName: permission.user.username,
          ModifiedDate: timestamp
        }
      : {
          ResourceID: createPlatformId("GRES"),
          SubjectID: subjectId,
          ModuleID: moduleId,
          TaskID: taskId,
          ResourceName: resourceName,
          ResourceType: resourceType,
          ResourceFormat: resourceFormat,
          ResourceDescription: resourceDescription,
          ResourceLink: resourceLink,
          Active: requestedActive,
          CreatedDate: timestamp,
          CreatedByAccountID: permission.user.accountid,
          CreatedByAccountName: permission.user.username,
          ModifiedByAccountID: "",
          ModifiedByAccountName: "",
          ModifiedDate: ""
        };
    const mutableFields = [
      "SubjectID", "ModuleID", "TaskID", "ResourceName", "ResourceType",
      "ResourceFormat", "ResourceDescription", "ResourceLink", "Active"
    ];
    const changedFields = existing
      ? changedRecordFields(existing, record, mutableFields)
      : mutableFields;
    if (existing && changedFields.length === 0) {
      return json({ success: true, message: "No global resource changes requested", resource: mapResource(existing) });
    }

    await writeCurriculumMutation(env, permission.user, tables, {
      sheetName: "GlobalResources",
      rowNumber: existing?._rowNumber || nextRowNumber(tables.GlobalResources),
      record,
      action: existing ? "UPDATE_GLOBAL_RESOURCE" : "CREATE_GLOBAL_RESOURCE",
      recordType: "GLOBAL_RESOURCE",
      recordId: record.ResourceID,
      changedFields,
      timestamp
    });

    return json({
      success: true,
      message: existing ? "Global resource updated" : "Global resource created",
      resource: mapResource(record)
    });
  } catch (error) {
    return mutationError(error, env);
  }
}

export async function savePlatformGlobalSubjectAccessEndpoint(request, env) {
  const permission = await requireGlobalCurriculumAdmin(request, env);
  if (!permission.ok) return permission.response;

  try {
    const body = await request.json();
    const accountId = clean(body.accountId || body.accountid);
    const subjectId = clean(body.subjectId || body.subjectid);
    const requestedActive = readBoolean(body.active, true);
    const tables = await readManagementTables(env);
    const account = uniqueRecord(tables.UserAccounts, "AccountID", accountId, "User account");
    const subject = uniqueRecord(tables.GlobalSubjectList, "SubjectID", subjectId, "Global subject");
    if (requestedActive && !isActivePlatformValue(account.Active)) {
      throw clientError("Global-subject access cannot be activated for an inactive account", 409);
    }
    if (requestedActive && !isActivePlatformValue(subject.Active)) {
      throw clientError("Global-subject access cannot be activated for an inactive subject", 409);
    }

    const matches = tables.UserGlobalSubjectAccess.filter(record => (
      normalizePlatformIdentifier(record.AccountID) === normalizePlatformIdentifier(accountId) &&
      normalizePlatformIdentifier(record.SubjectID) === normalizePlatformIdentifier(subjectId)
    ));
    if (matches.length > 1) throw clientError("Global-subject access is duplicated", 409);
    const existing = matches[0] || null;
    const timestamp = new Date().toISOString();
    const record = existing
      ? {
          ...existing,
          Active: requestedActive,
          ModifiedByAccountID: permission.user.accountid,
          ModifiedByAccountName: permission.user.username,
          ModifiedDate: timestamp
        }
      : {
          SubjectAccessID: createPlatformId("GSACCESS"),
          AccountID: accountId,
          SubjectID: subjectId,
          Active: requestedActive,
          CreatedDate: timestamp,
          CreatedByAccountID: permission.user.accountid,
          CreatedByAccountName: permission.user.username,
          ModifiedByAccountID: "",
          ModifiedByAccountName: "",
          ModifiedDate: ""
        };
    const changedFields = existing
      ? changedRecordFields(existing, record, ["Active"])
      : ["AccountID", "SubjectID", "Active"];
    if (existing && changedFields.length === 0) {
      return json({
        success: true,
        message: "Global-subject access is already in the requested state",
        access: mapSubjectAccess(existing)
      });
    }

    await writeAccessMutation(env, permission.user, tables, {
      rowNumber: existing?._rowNumber || nextRowNumber(tables.UserGlobalSubjectAccess),
      record,
      action: requestedActive ? "ACTIVATE_GLOBAL_SUBJECT_ACCESS" : "DEACTIVATE_GLOBAL_SUBJECT_ACCESS",
      changedFields,
      timestamp
    });

    return json({
      success: true,
      message: requestedActive ? "Global-subject access activated" : "Global-subject access deactivated",
      access: mapSubjectAccess(record)
    });
  } catch (error) {
    return mutationError(error, env);
  }
}

async function requireGlobalCurriculumAdmin(request, env) {
  const user = await getAuthUser(request, env);
  if (!user) {
    return { ok: false, response: json({ success: false, error: "Unauthorized" }, 401) };
  }
  const authority = normalizePlatformIdentifier(user.role);
  if (user.type !== "account" || !["ADMIN", "GLOBAL_ADMIN"].includes(authority)) {
    return { ok: false, response: json({ success: false, error: "ADMIN or GLOBAL_ADMIN authority is required" }, 403) };
  }
  return {
    ok: true,
    user: {
      accountid: String(user.accountid || "").trim(),
      username: String(user.username || "Global Admin").trim(),
      role: authority,
      courseid: String(user.courseid || "").trim()
    }
  };
}

async function readManagementTables(env) {
  const names = [
    "UserAccounts",
    "UserGlobalSubjectAccess",
    "GlobalSubjectList",
    "GlobalModuleList",
    "GlobalTaskList",
    "GlobalResources",
    "PlatformConfig",
    "PlatformAuditLog"
  ];
  const entries = await Promise.all(names.map(async name => [name, await readPlatformSheet(env, name)]));
  return Object.fromEntries(entries);
}

async function writeCurriculumMutation(env, user, tables, mutation) {
  const version = readGlobalCurriculumVersion(tables.PlatformConfig);
  const nextVersion = version.value + 1;
  const auditRow = buildAuditRow(user, mutation);
  const headers = PLATFORM_SHEET_HEADERS[mutation.sheetName];
  await batchUpdateGoogleSheetValues(env, [
    valueWrite(mutation.sheetName, mutation.rowNumber, recordToRow(mutation.record, headers)),
    {
      range: `'PlatformConfig'!B${version.rowNumber}:E${version.rowNumber}`,
      majorDimension: "ROWS",
      values: [[nextVersion, mutation.timestamp, user.accountid, user.username]]
    },
    valueWrite("PlatformAuditLog", nextRowNumber(tables.PlatformAuditLog), auditRow)
  ], { spreadsheetId: getPlatformSpreadsheetId(env) });
}

async function writeAccessMutation(env, user, tables, mutation) {
  const auditRow = buildAuditRow(user, {
    ...mutation,
    recordType: "GLOBAL_SUBJECT_ACCESS",
    recordId: mutation.record.SubjectAccessID
  });
  await batchUpdateGoogleSheetValues(env, [
    valueWrite(
      "UserGlobalSubjectAccess",
      mutation.rowNumber,
      recordToRow(mutation.record, PLATFORM_SHEET_HEADERS.UserGlobalSubjectAccess)
    ),
    valueWrite("PlatformAuditLog", nextRowNumber(tables.PlatformAuditLog), auditRow)
  ], { spreadsheetId: getPlatformSpreadsheetId(env) });
}

function buildAuditRow(user, mutation) {
  return [
    createPlatformId("AUDIT"),
    mutation.timestamp,
    user.accountid,
    user.username,
    user.role,
    user.role === "GLOBAL_ADMIN" ? "" : user.courseid,
    mutation.action,
    mutation.recordType,
    mutation.recordId,
    JSON.stringify(mutation.changedFields)
  ];
}

function valueWrite(sheetName, rowNumber, row) {
  return {
    range: `'${sheetName}'!A${rowNumber}:${columnName(row.length)}${rowNumber}`,
    majorDimension: "ROWS",
    values: [row]
  };
}

function recordToRow(record, headers) {
  return headers.map(header => record?.[header] ?? "");
}

function readGlobalCurriculumVersion(configRows) {
  const matches = configRows.filter(record => (
    normalizePlatformIdentifier(record.ConfigKey) === "GLOBALCURRICULUMVERSION"
  ));
  const value = Number(matches[0]?.ConfigValue);
  if (matches.length !== 1 || !Number.isInteger(value) || value < 1) {
    throw new Error("PlatformConfig GlobalCurriculumVersion must resolve exactly once as a positive integer");
  }
  return { value, rowNumber: matches[0]._rowNumber };
}

function uniqueRecord(records, key, value, label) {
  const normalized = normalizePlatformIdentifier(value);
  if (!normalized) throw clientError(`${label} ID is required`, 400);
  const matches = records.filter(record => normalizePlatformIdentifier(record[key]) === normalized);
  if (matches.length === 0) throw clientError(`${label} was not found`, 404);
  if (matches.length > 1) throw clientError(`${label} is duplicated`, 409);
  return matches[0];
}

function assertNoDuplicateName(records, nameKey, name, excludedId, label) {
  const normalizedName = normalizeName(name);
  const normalizedExcluded = normalizePlatformIdentifier(excludedId);
  const duplicate = records.find(record => (
    normalizeName(record[nameKey]) === normalizedName &&
    normalizePlatformIdentifier(primaryId(record)) !== normalizedExcluded
  ));
  if (duplicate) throw clientError(`${label} name already exists`, 409);
}

function assertNoDuplicateChildName(records, parentKey, parentId, nameKey, name, excludedId, label) {
  const normalizedParent = normalizePlatformIdentifier(parentId);
  const normalizedName = normalizeName(name);
  const normalizedExcluded = normalizePlatformIdentifier(excludedId);
  const duplicate = records.find(record => (
    normalizePlatformIdentifier(record[parentKey]) === normalizedParent &&
    normalizeName(record[nameKey]) === normalizedName &&
    normalizePlatformIdentifier(primaryId(record)) !== normalizedExcluded
  ));
  if (duplicate) throw clientError(`${label} already exists in this subject`, 409);
}

function assertNoDuplicateTask(records, subjectId, moduleId, taskName, excludedId) {
  const duplicate = records.find(record => (
    normalizePlatformIdentifier(record.SubjectID) === normalizePlatformIdentifier(subjectId) &&
    normalizePlatformIdentifier(record.ModuleID) === normalizePlatformIdentifier(moduleId) &&
    normalizeName(record.TaskName) === normalizeName(taskName) &&
    normalizePlatformIdentifier(record.TaskID) !== normalizePlatformIdentifier(excludedId)
  ));
  if (duplicate) throw clientError("Global task already exists in this curriculum branch", 409);
}

function assertNoDuplicateResource(records, subjectId, moduleId, taskId, name, excludedId) {
  const duplicate = records.find(record => (
    normalizePlatformIdentifier(record.SubjectID) === normalizePlatformIdentifier(subjectId) &&
    normalizePlatformIdentifier(record.ModuleID) === normalizePlatformIdentifier(moduleId) &&
    normalizePlatformIdentifier(record.TaskID) === normalizePlatformIdentifier(taskId) &&
    normalizeName(record.ResourceName) === normalizeName(name) &&
    normalizePlatformIdentifier(record.ResourceID) !== normalizePlatformIdentifier(excludedId)
  ));
  if (duplicate) throw clientError("Global resource already exists in this curriculum branch", 409);
}

function primaryId(record) {
  return record.SubjectID || record.ModuleID || record.TaskID || record.ResourceID || record.SubjectAccessID || "";
}

function changedRecordFields(before, after, fields) {
  return fields.filter(field => normalizeComparable(before[field]) !== normalizeComparable(after[field]));
}

function normalizeComparable(value) {
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return String(value);
  return String(value ?? "").trim();
}

function subjectDependencies(tables, subjectId) {
  const normalized = normalizePlatformIdentifier(subjectId);
  return {
    modules: tables.GlobalModuleList.filter(record => normalizePlatformIdentifier(record.SubjectID) === normalized).length,
    tasks: tables.GlobalTaskList.filter(record => normalizePlatformIdentifier(record.SubjectID) === normalized).length,
    resources: tables.GlobalResources.filter(record => normalizePlatformIdentifier(record.SubjectID) === normalized).length,
    subscriptions: tables.UserGlobalSubjectAccess.filter(record => (
      normalizePlatformIdentifier(record.SubjectID) === normalized && isActivePlatformValue(record.Active)
    )).length
  };
}

function moduleDependencies(tables, moduleId) {
  const normalized = normalizePlatformIdentifier(moduleId);
  return {
    tasks: tables.GlobalTaskList.filter(record => normalizePlatformIdentifier(record.ModuleID) === normalized).length,
    resources: tables.GlobalResources.filter(record => normalizePlatformIdentifier(record.ModuleID) === normalized).length
  };
}

function taskDependencies(tables, taskId) {
  const normalized = normalizePlatformIdentifier(taskId);
  return {
    resources: tables.GlobalResources.filter(record => normalizePlatformIdentifier(record.TaskID) === normalized).length
  };
}

function mapSubject(record) {
  return {
    subjectid: String(record.SubjectID || "").trim(),
    subjectname: String(record.SubjectName || "").trim(),
    active: isActivePlatformValue(record.Active),
    scope: "GLOBAL"
  };
}

function mapModule(record) {
  return {
    moduleid: String(record.ModuleID || "").trim(),
    subjectid: String(record.SubjectID || "").trim(),
    modulename: String(record.ModuleName || "").trim(),
    sortorder: Number(record.SortOrder) || 0,
    active: isActivePlatformValue(record.Active),
    scope: "GLOBAL"
  };
}

function mapTask(record) {
  return {
    taskid: String(record.TaskID || "").trim(),
    subjectid: String(record.SubjectID || "").trim(),
    moduleid: String(record.ModuleID || "").trim(),
    taskname: String(record.TaskName || "").trim(),
    active: isActivePlatformValue(record.Active),
    scope: "GLOBAL"
  };
}

function mapResource(record) {
  return {
    resourceid: String(record.ResourceID || "").trim(),
    subjectid: String(record.SubjectID || "").trim(),
    moduleid: String(record.ModuleID || "").trim(),
    taskid: String(record.TaskID || "").trim(),
    resourcename: String(record.ResourceName || "").trim(),
    resourcetype: normalizePlatformIdentifier(record.ResourceType),
    resourceformat: String(record.ResourceFormat || "").trim(),
    resourcedescription: String(record.ResourceDescription || "").trim(),
    resourcelink: String(record.ResourceLink || "").trim(),
    active: isActivePlatformValue(record.Active),
    scope: "GLOBAL"
  };
}

function mapAccount(record) {
  return {
    accountid: String(record.AccountID || "").trim(),
    displayname: String(record.DisplayName || "").trim(),
    uniqueid: String(record.UniqueID || "").trim(),
    active: isActivePlatformValue(record.Active),
    platformrole: normalizePlatformIdentifier(record.PlatformRole)
  };
}

function mapSubjectAccess(record) {
  return {
    subjectaccessid: String(record.SubjectAccessID || "").trim(),
    accountid: String(record.AccountID || "").trim(),
    subjectid: String(record.SubjectID || "").trim(),
    active: isActivePlatformValue(record.Active)
  };
}

function requireText(value, label, maxLength) {
  const text = clean(value);
  if (!text) throw clientError(`${label} is required`, 400);
  if (text.length > maxLength) throw clientError(`${label} is too long`, 400);
  return text;
}

function optionalText(value, label, maxLength) {
  const text = clean(value);
  if (text.length > maxLength) throw clientError(`${label} is too long`, 400);
  return text;
}

function readBoolean(value, fallback) {
  if (value === undefined && fallback !== null) return fallback;
  if (typeof value !== "boolean") throw clientError("Active must be true or false", 400);
  return value;
}

function readPositiveInteger(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1 || number > 100000) {
    throw clientError(`${label} must be a positive whole number`, 400);
  }
  return number;
}

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === "https:";
  } catch (error) {
    return false;
  }
}

function normalizeName(value) {
  return clean(value).replace(/\s+/g, " ").toLocaleLowerCase();
}

function clean(value) {
  return String(value ?? "").trim();
}

function createPlatformId(prefix) {
  const uuid = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : fallbackUuid();
  return `${prefix}-${uuid}`;
}

function fallbackUuid() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function nextRowNumber(records) {
  return Math.max(1, ...(records || []).map(record => Number(record._rowNumber) || 1)) + 1;
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

function clientError(message, status) {
  const error = new Error(message);
  error.status = status;
  error.isClientError = true;
  return error;
}

function mutationError(error, env) {
  if (error?.isClientError) {
    return json({ success: false, error: String(error.message || "Invalid request") }, error.status || 400);
  }
  return managementError(error, env);
}

function managementError(error, env) {
  const response = {
    success: false,
    error: "Global curriculum management is not ready"
  };
  if (String(env.M4L_ACCOUNT_AUTH_DIAGNOSTICS || "").trim().toLowerCase() === "true") {
    response.detail = String(error?.message || "Global management error")
      .replace(/[\r\n\t]+/g, " ")
      .slice(0, 220);
  }
  return json(response, 503);
}
