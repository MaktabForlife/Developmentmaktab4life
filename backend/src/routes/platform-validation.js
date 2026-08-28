/* M4L V102.10 - Platform validation including global access policies, runs and protected Drive configuration. */

import { requireSystemAdmin } from "../lib/auth.js";
import { json } from "../lib/http.js";
import {
  GLOBAL_SUBJECT_ACCESS_MODELS,
  globalSubjectAccessMatrixColumns,
  isValidIanaTimezone,
  validateIsoDate
} from "../lib/global-subject-delivery.js";
import { readPlatformSheet } from "../lib/platform-sheet.js";
import {
  isActivePlatformValue,
  normalizePlatformIdentifier,
  PLATFORM_SHEET_HEADERS
} from "../lib/platform-schema.js";

const EXPECTED_PLATFORM_SCHEMA_VERSION = "102.0.5";
const COURSE_ROLES = new Set(["ADMIN", "SENIOR", "TEACHER", "STUDENT"]);
const GLOBAL_RESOURCE_TYPES = new Set(["EBOOK", "PRINTABLE", "AUDIO", "VIDEO", "OTHER"]);
const DRIVE_FOLDER_ID_PATTERN = /^[A-Za-z0-9_-]{10,128}$/;

export async function platformValidationEndpoint(request, env) {
  const auth = await requireSystemAdmin(request, env);
  if (!auth.ok) return auth.response;

  try {
    const sheetNames = Object.keys(PLATFORM_SHEET_HEADERS);
    const entries = await Promise.all(sheetNames.map(async sheetName => (
      [sheetName, await readPlatformSheet(env, sheetName)]
    )));
    const tables = Object.fromEntries(entries);
    const summary = validatePlatformTables(tables);

    return json({
      success: true,
      service: "platform-validation",
      status: "ready",
      ...summary
    });
  } catch (error) {
    return json({
      success: false,
      error: "Platform Sheet validation failed",
      detail: safeValidationDetail(error, env)
    }, 503);
  }
}

export function validatePlatformTables(tables) {
  const missingTable = Object.keys(PLATFORM_SHEET_HEADERS).find(name => !Array.isArray(tables?.[name]));
  if (missingTable) {
    throw new Error(`${missingTable} was not validated`);
  }

  const courseRegistry = tables.CourseRegistry;
  const courseIds = new Set();
  const spreadsheetIds = new Set();
  let activeCourses = 0;

  for (const course of courseRegistry) {
    const courseId = normalizePlatformIdentifier(course.CourseID);
    const spreadsheetId = String(course.SpreadsheetID || "").trim();
    if (!courseId || !String(course.CourseName || "").trim()) {
      throw new Error(`CourseRegistry row ${course._rowNumber} requires CourseID and CourseName`);
    }
    if (courseIds.has(courseId)) {
      throw new Error(`CourseRegistry has duplicate CourseID in row ${course._rowNumber}`);
    }
    if (!/^[A-Za-z0-9_-]+$/.test(spreadsheetId)) {
      throw new Error(`CourseRegistry row ${course._rowNumber} has an invalid SpreadsheetID`);
    }
    if (spreadsheetIds.has(spreadsheetId)) {
      throw new Error(`CourseRegistry has duplicate SpreadsheetID in row ${course._rowNumber}`);
    }
    if (!String(course.SchemaVersion || "").trim()) {
      throw new Error(`CourseRegistry row ${course._rowNumber} requires SchemaVersion`);
    }
    courseIds.add(courseId);
    spreadsheetIds.add(spreadsheetId);
    if (isActivePlatformValue(course.Active)) activeCourses += 1;
  }
  if (activeCourses === 0) {
    throw new Error("CourseRegistry requires at least one active course");
  }

  const config = uniqueRowsByKey(tables.PlatformConfig, "ConfigKey", "PlatformConfig");
  const accountLoginBaseUrl = String(config.get("ACCOUNTLOGINBASEURL")?.ConfigValue || "").trim();
  const schemaVersion = String(config.get("PLATFORMSCHEMAVERSION")?.ConfigValue || "").trim();
  const curriculumVersion = Number(config.get("GLOBALCURRICULUMVERSION")?.ConfigValue);
  const globalResourceDriveRootFolderId = String(
    config.get("GLOBALRESOURCEDRIVEROOTFOLDERID")?.ConfigValue || ""
  ).trim();
  if (!isAccountLoginBaseUrl(accountLoginBaseUrl)) {
    throw new Error("PlatformConfig AccountLoginBaseUrl must be an HTTPS /account/ URL");
  }
  if (schemaVersion !== EXPECTED_PLATFORM_SCHEMA_VERSION) {
    throw new Error(`PlatformConfig PlatformSchemaVersion must be ${EXPECTED_PLATFORM_SCHEMA_VERSION}`);
  }
  if (!Number.isInteger(curriculumVersion) || curriculumVersion < 1) {
    throw new Error("PlatformConfig GlobalCurriculumVersion must be a positive integer");
  }
  if (globalResourceDriveRootFolderId && !DRIVE_FOLDER_ID_PATTERN.test(globalResourceDriveRootFolderId)) {
    throw new Error("PlatformConfig GlobalResourceDriveRootFolderID is invalid");
  }

  const accounts = tables.UserAccounts;
  const accountIds = new Set();
  const uniqueIds = new Set();
  let globalAdminAccounts = 0;
  for (const account of accounts) {
    const accountId = normalizePlatformIdentifier(account.AccountID);
    const uniqueId = normalizePlatformIdentifier(account.UniqueID);
    const platformRole = normalizePlatformIdentifier(account.PlatformRole);
    if (!accountId || !uniqueId || !String(account.DisplayName || "").trim()) {
      throw new Error(`UserAccounts row ${account._rowNumber} requires AccountID, DisplayName and UniqueID`);
    }
    if (accountIds.has(accountId) || uniqueIds.has(uniqueId)) {
      throw new Error(`UserAccounts row ${account._rowNumber} duplicates AccountID or UniqueID`);
    }
    if (platformRole && platformRole !== "GLOBAL_ADMIN") {
      throw new Error(`UserAccounts row ${account._rowNumber} has an invalid PlatformRole`);
    }
    accountIds.add(accountId);
    uniqueIds.add(uniqueId);
    if (platformRole === "GLOBAL_ADMIN" && isActivePlatformValue(account.Active)) {
      globalAdminAccounts += 1;
    }
  }

  const accessKeys = new Set();
  const courseRecordKeys = new Set();
  for (const access of tables.UserCourseAccess) {
    const accountId = normalizePlatformIdentifier(access.AccountID);
    const courseId = normalizePlatformIdentifier(access.CourseID);
    const role = normalizePlatformIdentifier(access.Role);
    const courseRecordId = normalizePlatformIdentifier(access.CourseRecordID);
    const accessKey = `${accountId}|${courseId}|${role}`;
    if (!normalizePlatformIdentifier(access.AccessID) || !accountIds.has(accountId)) {
      throw new Error(`UserCourseAccess row ${access._rowNumber} has an invalid account reference`);
    }
    if (!courseIds.has(courseId) || !COURSE_ROLES.has(role)) {
      throw new Error(`UserCourseAccess row ${access._rowNumber} has an invalid course or role`);
    }
    if (!courseRecordId) {
      throw new Error(`UserCourseAccess row ${access._rowNumber} requires CourseRecordID`);
    }
    if (accessKeys.has(accessKey)) {
      throw new Error(`UserCourseAccess row ${access._rowNumber} duplicates an account/course/role`);
    }
    const courseRecordKey = `${courseId}|${role}|${courseRecordId}`;
    if (courseRecordKeys.has(courseRecordKey)) {
      throw new Error(`UserCourseAccess row ${access._rowNumber} duplicates a course-local record mapping`);
    }
    accessKeys.add(accessKey);
    courseRecordKeys.add(courseRecordKey);
  }

  const globalCurriculum = validateGlobalCurriculum(tables);
  const globalDelivery = validateGlobalSubjectDelivery(tables, globalCurriculum.subjectIds, globalCurriculum.activeSubjectIds);
  const subjectAccessIds = new Set();
  const subjectAccessKeys = new Set();
  let legacyActiveGlobalSubjectAccessCount = 0;
  for (const access of tables.UserGlobalSubjectAccess) {
    const subjectAccessId = normalizePlatformIdentifier(access.SubjectAccessID);
    const accountId = normalizePlatformIdentifier(access.AccountID);
    const subjectId = normalizePlatformIdentifier(access.SubjectID);
    const accessKey = `${accountId}|${subjectId}`;
    if (!subjectAccessId || subjectAccessIds.has(subjectAccessId)) {
      throw new Error(`UserGlobalSubjectAccess row ${access._rowNumber} has a blank or duplicate SubjectAccessID`);
    }
    if (!accountIds.has(accountId)) {
      throw new Error(`UserGlobalSubjectAccess row ${access._rowNumber} has an invalid account reference`);
    }
    if (!globalCurriculum.subjectIds.has(subjectId)) {
      throw new Error(`UserGlobalSubjectAccess row ${access._rowNumber} has an invalid global SubjectID`);
    }
    if (subjectAccessKeys.has(accessKey)) {
      throw new Error(`UserGlobalSubjectAccess row ${access._rowNumber} duplicates an account/subject access`);
    }
    subjectAccessIds.add(subjectAccessId);
    subjectAccessKeys.add(accessKey);
    if (isActivePlatformValue(access.Active)) legacyActiveGlobalSubjectAccessCount += 1;
  }

  const globalAccessMatrix = validateGlobalSubjectAccessMatrix(
    tables.GlobalSubjectAccessMatrix,
    accountIds,
    globalCurriculum.subjectIds
  );

  return Object.freeze({
    platformSchemaVersion: schemaVersion,
    globalCurriculumVersion: curriculumVersion,
    tabCount: Object.keys(PLATFORM_SHEET_HEADERS).length,
    rowCounts: Object.freeze(Object.fromEntries(
      Object.keys(PLATFORM_SHEET_HEADERS).map(name => [name, tables[name].length])
    )),
    activeCourseCount: activeCourses,
    accountCount: accounts.length,
    courseAccessCount: tables.UserCourseAccess.length,
    globalSubjectCount: tables.GlobalSubjectList.length,
    globalSubjectAccessCount: globalAccessMatrix.entitlementCellCount,
    globalSubjectAccessMatrixRowCount: globalAccessMatrix.rowCount,
    activeGlobalSubjectAccessCount: globalAccessMatrix.activeEntitlementCount,
    legacyGlobalSubjectAccessRowCount: tables.UserGlobalSubjectAccess.length,
    legacyActiveGlobalSubjectAccessCount,
    globalSubjectPolicyCount: tables.GlobalSubjectAccessPolicy.length,
    activeGlobalSubjectPolicyCount: globalDelivery.activePolicyCount,
    globalSubjectRunCount: tables.GlobalSubjectRuns.length,
    activeGlobalSubjectRunCount: globalDelivery.activeRunCount,
    globalResourceCount: tables.GlobalResources.length,
    globalAdminCount: globalAdminAccounts,
    globalResourceDriveConfigured: Boolean(globalResourceDriveRootFolderId),
    readyForAccountMigration: true,
    readyForUnifiedLogin: accounts.length > 0 && globalAdminAccounts > 0
  });
}

function validateGlobalSubjectAccessMatrix(matrixRows, accountIds, subjectIds) {
  const columns = globalSubjectAccessMatrixColumns(matrixRows);
  const matrixSubjectIds = new Set(columns.map(column => normalizePlatformIdentifier(column.subjectId)));
  if (matrixSubjectIds.size !== subjectIds.size) {
    throw new Error("GlobalSubjectAccessMatrix must contain exactly one column for every GlobalSubjectList SubjectID");
  }
  for (const subjectId of subjectIds) {
    if (!matrixSubjectIds.has(subjectId)) {
      throw new Error(`GlobalSubjectAccessMatrix is missing the ${subjectId} subject column`);
    }
  }
  for (const subjectId of matrixSubjectIds) {
    if (!subjectIds.has(subjectId)) {
      throw new Error(`GlobalSubjectAccessMatrix has an unknown ${subjectId} subject column`);
    }
  }

  const matrixAccounts = new Set();
  let activeEntitlementCount = 0;
  for (const row of matrixRows) {
    const accountId = normalizePlatformIdentifier(row.AccountID);
    if (!accountId || !accountIds.has(accountId)) {
      throw new Error(`GlobalSubjectAccessMatrix row ${row._rowNumber} has an invalid AccountID`);
    }
    if (matrixAccounts.has(accountId)) {
      throw new Error(`GlobalSubjectAccessMatrix row ${row._rowNumber} duplicates AccountID ${accountId}`);
    }
    matrixAccounts.add(accountId);
    for (const subjectId of matrixSubjectIds) {
      const value = row?._subjectAccess?.[subjectId];
      if (!isExplicitBooleanAccessValue(value)) {
        throw new Error(`GlobalSubjectAccessMatrix row ${row._rowNumber} ${subjectId} must be TRUE or FALSE`);
      }
      if (isActivePlatformValue(value)) activeEntitlementCount += 1;
    }
  }

  if (matrixAccounts.size !== accountIds.size) {
    throw new Error("GlobalSubjectAccessMatrix must contain exactly one row for every UserAccounts AccountID");
  }
  for (const accountId of accountIds) {
    if (!matrixAccounts.has(accountId)) {
      throw new Error(`GlobalSubjectAccessMatrix is missing the ${accountId} account row`);
    }
  }

  return Object.freeze({
    rowCount: matrixRows.length,
    entitlementCellCount: matrixRows.length * matrixSubjectIds.size,
    activeEntitlementCount
  });
}

function isExplicitBooleanAccessValue(value) {
  if (value === true || value === false) return true;
  return ["TRUE", "FALSE"].includes(String(value ?? "").trim().toUpperCase());
}

function validateGlobalCurriculum(tables) {
  const subjectIds = new Set();
  const activeSubjectIds = new Set();
  for (const subject of tables.GlobalSubjectList) {
    const subjectId = normalizePlatformIdentifier(subject.SubjectID);
    if (!subjectId || !String(subject.SubjectName || "").trim()) {
      throw new Error(`GlobalSubjectList row ${subject._rowNumber} requires SubjectID and SubjectName`);
    }
    if (subjectIds.has(subjectId)) {
      throw new Error(`GlobalSubjectList row ${subject._rowNumber} duplicates SubjectID`);
    }
    subjectIds.add(subjectId);
    if (isActivePlatformValue(subject.Active)) activeSubjectIds.add(subjectId);
  }

  const moduleIds = new Set();
  const moduleSubjects = new Map();
  for (const module of tables.GlobalModuleList) {
    const moduleId = normalizePlatformIdentifier(module.ModuleID);
    const subjectId = normalizePlatformIdentifier(module.SubjectID);
    if (!moduleId || !String(module.ModuleName || "").trim()) {
      throw new Error(`GlobalModuleList row ${module._rowNumber} requires ModuleID and ModuleName`);
    }
    if (moduleIds.has(moduleId)) {
      throw new Error(`GlobalModuleList row ${module._rowNumber} duplicates ModuleID`);
    }
    if (!subjectIds.has(subjectId)) {
      throw new Error(`GlobalModuleList row ${module._rowNumber} has an invalid global SubjectID`);
    }
    moduleIds.add(moduleId);
    moduleSubjects.set(moduleId, subjectId);
  }

  const taskIds = new Set();
  const taskCurriculum = new Map();
  for (const task of tables.GlobalTaskList) {
    const taskId = normalizePlatformIdentifier(task.TaskID);
    const subjectId = normalizePlatformIdentifier(task.SubjectID);
    const moduleId = normalizePlatformIdentifier(task.ModuleID);
    if (!taskId || !String(task.TaskName || "").trim()) {
      throw new Error(`GlobalTaskList row ${task._rowNumber} requires TaskID and TaskName`);
    }
    if (taskIds.has(taskId)) {
      throw new Error(`GlobalTaskList row ${task._rowNumber} duplicates TaskID`);
    }
    if (!subjectIds.has(subjectId)) {
      throw new Error(`GlobalTaskList row ${task._rowNumber} has an invalid global SubjectID`);
    }
    if (moduleId && moduleSubjects.get(moduleId) !== subjectId) {
      throw new Error(`GlobalTaskList row ${task._rowNumber} has an invalid SubjectID/ModuleID relationship`);
    }
    taskIds.add(taskId);
    taskCurriculum.set(taskId, { subjectId, moduleId });
  }

  const resourceIds = new Set();
  for (const resource of tables.GlobalResources) {
    const resourceId = normalizePlatformIdentifier(resource.ResourceID);
    const subjectId = normalizePlatformIdentifier(resource.SubjectID);
    const moduleId = normalizePlatformIdentifier(resource.ModuleID);
    const taskId = normalizePlatformIdentifier(resource.TaskID);
    const resourceType = normalizePlatformIdentifier(resource.ResourceType);
    if (!resourceId || !String(resource.ResourceName || "").trim() || !String(resource.ResourceLink || "").trim()) {
      throw new Error(`GlobalResources row ${resource._rowNumber} requires ResourceID, ResourceName and ResourceLink`);
    }
    if (resourceIds.has(resourceId)) {
      throw new Error(`GlobalResources row ${resource._rowNumber} duplicates ResourceID`);
    }
    if (!subjectIds.has(subjectId)) {
      throw new Error(`GlobalResources row ${resource._rowNumber} has an invalid global SubjectID`);
    }
    if (moduleId && moduleSubjects.get(moduleId) !== subjectId) {
      throw new Error(`GlobalResources row ${resource._rowNumber} has an invalid SubjectID/ModuleID relationship`);
    }
    if (taskId) {
      const task = taskCurriculum.get(taskId);
      if (!task || task.subjectId !== subjectId || (moduleId && task.moduleId && task.moduleId !== moduleId)) {
        throw new Error(`GlobalResources row ${resource._rowNumber} has an invalid curriculum reference`);
      }
    }
    if (!GLOBAL_RESOURCE_TYPES.has(resourceType)) {
      throw new Error(`GlobalResources row ${resource._rowNumber} has an invalid ResourceType`);
    }
    resourceIds.add(resourceId);
  }

  return Object.freeze({ subjectIds, activeSubjectIds, moduleIds, taskIds, resourceIds });
}

function validateGlobalSubjectDelivery(tables, subjectIds, activeSubjectIds) {
  const accessModels = new Set(GLOBAL_SUBJECT_ACCESS_MODELS);
  const policyIds = new Set();
  const activePoliciesBySubject = new Map();
  let activePolicyCount = 0;

  for (const policy of tables.GlobalSubjectAccessPolicy) {
    const policyId = normalizePlatformIdentifier(policy.SubjectPolicyID);
    const subjectId = normalizePlatformIdentifier(policy.SubjectID);
    const accessModel = normalizePlatformIdentifier(policy.AccessModel);
    if (!policyId || policyIds.has(policyId)) {
      throw new Error(`GlobalSubjectAccessPolicy row ${policy._rowNumber} has a blank or duplicate SubjectPolicyID`);
    }
    if (!subjectIds.has(subjectId)) {
      throw new Error(`GlobalSubjectAccessPolicy row ${policy._rowNumber} has an invalid global SubjectID`);
    }
    if (!accessModels.has(accessModel)) {
      throw new Error(`GlobalSubjectAccessPolicy row ${policy._rowNumber} AccessModel must be FREE or SUBSCRIPTION`);
    }
    policyIds.add(policyId);
    if (isActivePlatformValue(policy.Active)) {
      activePolicyCount += 1;
      if (activePoliciesBySubject.has(subjectId)) {
        throw new Error(`GlobalSubjectAccessPolicy row ${policy._rowNumber} duplicates an active policy for ${subjectId}`);
      }
      activePoliciesBySubject.set(subjectId, policy);
    }
  }

  for (const subjectId of subjectIds) {
    if (!activePoliciesBySubject.has(subjectId)) {
      throw new Error(`Global subject ${subjectId} requires exactly one active access policy`);
    }
  }

  const runIds = new Set();
  let activeRunCount = 0;
  for (const run of tables.GlobalSubjectRuns) {
    const runId = normalizePlatformIdentifier(run.RunID);
    const subjectId = normalizePlatformIdentifier(run.SubjectID);
    const runName = String(run.RunName || "").trim();
    const startDate = String(run.StartDate || "").trim();
    const endDate = String(run.EndDate || "").trim();
    const timezone = String(run.Timezone || "").trim();
    if (!runId || runIds.has(runId)) {
      throw new Error(`GlobalSubjectRuns row ${run._rowNumber} has a blank or duplicate RunID`);
    }
    if (!subjectIds.has(subjectId)) {
      throw new Error(`GlobalSubjectRuns row ${run._rowNumber} has an invalid global SubjectID`);
    }
    if (!runName) {
      throw new Error(`GlobalSubjectRuns row ${run._rowNumber} requires RunName`);
    }
    if (!validateIsoDate(startDate) || !validateIsoDate(endDate)) {
      throw new Error(`GlobalSubjectRuns row ${run._rowNumber} requires YYYY-MM-DD StartDate and EndDate`);
    }
    if (endDate < startDate) {
      throw new Error(`GlobalSubjectRuns row ${run._rowNumber} EndDate cannot precede StartDate`);
    }
    if (!isValidIanaTimezone(timezone)) {
      throw new Error(`GlobalSubjectRuns row ${run._rowNumber} has an invalid Timezone`);
    }
    if (isActivePlatformValue(run.Active)) {
      activeRunCount += 1;
      if (!activeSubjectIds.has(subjectId)) {
        throw new Error(`GlobalSubjectRuns row ${run._rowNumber} cannot be active for an inactive global subject`);
      }
    }
    runIds.add(runId);
  }

  return Object.freeze({ activePolicyCount, activeRunCount });
}

function uniqueRowsByKey(rows, keyName, sheetName) {
  const records = new Map();
  for (const row of rows) {
    const key = normalizePlatformIdentifier(row[keyName]);
    if (!key || records.has(key)) {
      throw new Error(`${sheetName} has a blank or duplicate ${keyName} in row ${row._rowNumber}`);
    }
    records.set(key, row);
  }
  return records;
}

function isAccountLoginBaseUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.pathname.endsWith("/account/");
  } catch (error) {
    return false;
  }
}

function safeValidationDetail(error, env) {
  let detail = String(error?.message || "Validation error").replace(/[\r\n\t]+/g, " ");
  for (const value of [env?.PLATFORM_SPREADSHEET_ID, env?.GOOGLE_SPREADSHEET_ID]) {
    const sensitive = String(value || "").trim();
    if (sensitive) detail = detail.split(sensitive).join("[redacted]");
  }
  return detail.slice(0, 240);
}
