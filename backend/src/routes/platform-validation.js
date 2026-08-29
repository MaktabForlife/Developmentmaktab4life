/* M4L V102.12.7 - Platform validation including publishable TBA, Academy Calendar and immutable publication. */

import { requireSystemAdmin } from "../lib/auth.js";
import { isHiddenIslamicEvent, validateAcademyCalendarRecord } from "../lib/academy-calendar.js";
import { json } from "../lib/http.js";
import {
  GLOBAL_SUBJECT_ACCESS_MODELS,
  globalSubjectAccessMatrixColumns,
  isValidIanaTimezone,
  validateIsoDate
} from "../lib/global-subject-delivery.js";
import { readPlatformSheet } from "../lib/platform-sheet.js";
import {
  GLOBAL_TIMETABLE_DEVELOPMENT_STAGE,
  GLOBAL_TIMETABLE_PUBLISHED_STAGE,
  resolveCurrentPublishedGlobalTimetable,
  sessionWithinRun,
  validateTimeRange
} from "../lib/global-timetable.js";
import {
  isActivePlatformValue,
  normalizePlatformIdentifier,
  PLATFORM_SHEET_HEADERS
} from "../lib/platform-schema.js";
import {
  GLOBAL_SESSION_STATUSES,
  normalizeGlobalSessionStatus
} from "../lib/global-timetable-lifecycle.js";

const EXPECTED_PLATFORM_SCHEMA_VERSION = "102.0.8";
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
  const globalTimetableVersion = Number(config.get("GLOBALTIMETABLEVERSION")?.ConfigValue);
  const platformTimezone = String(config.get("PLATFORMTIMEZONE")?.ConfigValue || "").trim();
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
  if (!Number.isInteger(globalTimetableVersion) || globalTimetableVersion < 1) {
    throw new Error("PlatformConfig GlobalTimetableVersion must be a positive integer");
  }
  if (!isValidIanaTimezone(platformTimezone)) {
    throw new Error("PlatformConfig PlatformTimezone must be a valid IANA timezone");
  }
  if (globalResourceDriveRootFolderId && !DRIVE_FOLDER_ID_PATTERN.test(globalResourceDriveRootFolderId)) {
    throw new Error("PlatformConfig GlobalResourceDriveRootFolderID is invalid");
  }

  const accounts = tables.UserAccounts;
  const accountIds = new Set();
  const activeAccountIds = new Set();
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
    if (isActivePlatformValue(account.Active)) activeAccountIds.add(accountId);
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
  const globalTimetable = validateGlobalTimetable(tables, {
    accountIds,
    activeAccountIds,
    subjectIds: globalCurriculum.subjectIds,
    moduleSubjects: globalCurriculum.moduleSubjects,
    runIds: globalDelivery.runIds,
    runSubjects: globalDelivery.runSubjects
  });
  const academyCalendar = validateAcademyCalendar(tables.AcademyCalendar);

  return Object.freeze({
    platformSchemaVersion: schemaVersion,
    globalCurriculumVersion: curriculumVersion,
    globalTimetableVersion,
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
    globalTimetableSessionCount: globalTimetable.sessionCount,
    globalTimetableRunStateCount: globalTimetable.stateCount,
    globalTimetablePublicationCount: globalTimetable.publicationCount,
    globalTimetableSessionLifecycleCount: globalTimetable.lifecycleCount,
    publishedGlobalTimetableSessionCount: globalTimetable.publishedSessionCount,
    academyCalendarEventCount: academyCalendar.eventCount,
    academyCalendarTermCount: academyCalendar.termCount,
    academyCalendarIslamicDayCount: academyCalendar.islamicDayCount,
    globalResourceCount: tables.GlobalResources.length,
    globalAdminCount: globalAdminAccounts,
    globalResourceDriveConfigured: Boolean(globalResourceDriveRootFolderId),
    readyForAccountMigration: true,
    readyForUnifiedLogin: accounts.length > 0 && globalAdminAccounts > 0
  });
}


function validateAcademyCalendar(rows) {
  const ids = new Set();
  let termCount = 0;
  let islamicDayCount = 0;
  for (const row of rows) {
    const id = normalizePlatformIdentifier(row.CalendarEventID);
    if (!id || ids.has(id)) {
      throw new Error(`AcademyCalendar row ${row._rowNumber} has a blank or duplicate CalendarEventID`);
    }
    try {
      validateAcademyCalendarRecord(row);
    } catch (error) {
      throw new Error(`AcademyCalendar row ${row._rowNumber}: ${error.message}`);
    }
    ids.add(id);
    const type = normalizePlatformIdentifier(row.EventType);
    if (type === "TERM") termCount += 1;
    if (type === "ISLAMIC_DAY" && !isHiddenIslamicEvent(row)) islamicDayCount += 1;
  }
  return Object.freeze({ eventCount: rows.length, termCount, islamicDayCount });
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

  return Object.freeze({ subjectIds, activeSubjectIds, moduleIds, moduleSubjects, taskIds, resourceIds });
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
  const runSubjects = new Map();
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
    runSubjects.set(runId, subjectId);
  }

  return Object.freeze({ activePolicyCount, activeRunCount, runIds, runSubjects });
}


function validateGlobalTimetable(tables, context) {
  const {
    accountIds,
    activeAccountIds,
    subjectIds,
    moduleSubjects,
    runIds,
    runSubjects
  } = context;

  const runById = new Map(tables.GlobalSubjectRuns.map(run => [
    normalizePlatformIdentifier(run.RunID), run
  ]));
  const lifecycleIds = new Set();
  const currentLifecycleBySession = new Map();
  const publishedLifecycleByKey = new Map();
  for (const lifecycle of tables.GlobalTimetableSessionLifecycle) {
    const lifecycleId = normalizePlatformIdentifier(lifecycle.SessionLifecycleID);
    const sessionId = normalizePlatformIdentifier(lifecycle.SessionID);
    const publicationId = normalizePlatformIdentifier(lifecycle.PublicationID);
    const statusRaw = normalizePlatformIdentifier(lifecycle.Status);
    const fromId = normalizePlatformIdentifier(lifecycle.RescheduledFromSessionID);
    const toId = normalizePlatformIdentifier(lifecycle.RescheduledToSessionID);
    if (!lifecycleId || lifecycleIds.has(lifecycleId) || !sessionId) {
      throw new Error(`GlobalTimetableSessionLifecycle row ${lifecycle._rowNumber} has a blank/duplicate ID or blank SessionID`);
    }
    if (!GLOBAL_SESSION_STATUSES.includes(statusRaw)) {
      throw new Error(`GlobalTimetableSessionLifecycle row ${lifecycle._rowNumber} has an invalid Status`);
    }
    if (fromId === sessionId || toId === sessionId) {
      throw new Error(`GlobalTimetableSessionLifecycle row ${lifecycle._rowNumber} cannot link a session to itself`);
    }
    lifecycleIds.add(lifecycleId);
    if (publicationId) {
      const key = `${publicationId}|${sessionId}`;
      if (publishedLifecycleByKey.has(key)) throw new Error(`GlobalTimetableSessionLifecycle row ${lifecycle._rowNumber} duplicates a publication/session lifecycle`);
      publishedLifecycleByKey.set(key, lifecycle);
    } else {
      if (currentLifecycleBySession.has(sessionId)) throw new Error(`GlobalTimetableSessionLifecycle row ${lifecycle._rowNumber} duplicates a current session lifecycle`);
      currentLifecycleBySession.set(sessionId, lifecycle);
    }
  }
  const sourceSessionIds = new Set();
  const sessionRuns = new Set();
  for (const session of tables.GlobalTimetableSessions) {
    const sessionId = normalizePlatformIdentifier(session.SessionID);
    const runId = normalizePlatformIdentifier(session.RunID);
    const subjectId = normalizePlatformIdentifier(session.SubjectID);
    const moduleId = normalizePlatformIdentifier(session.ModuleID);
    const teacherAccountId = normalizePlatformIdentifier(session.TeacherAccountID);
    if (!sessionId || sourceSessionIds.has(sessionId)) {
      throw new Error(`GlobalTimetableSessions row ${session._rowNumber} has a blank or duplicate SessionID`);
    }
    if (!runIds.has(runId) || runSubjects.get(runId) !== subjectId || !subjectIds.has(subjectId)) {
      throw new Error(`GlobalTimetableSessions row ${session._rowNumber} has an invalid run/subject relationship`);
    }
    if (moduleId && moduleSubjects.get(moduleId) !== subjectId) {
      throw new Error(`GlobalTimetableSessions row ${session._rowNumber} has an invalid module relationship`);
    }
    if (!sessionWithinRun(session, runById.get(runId))) {
      throw new Error(`GlobalTimetableSessions row ${session._rowNumber} falls outside its run dates`);
    }
    if (!validateTimeRange(session.StartTime, session.EndTime)) {
      throw new Error(`GlobalTimetableSessions row ${session._rowNumber} has an invalid time range`);
    }
    if (teacherAccountId && !activeAccountIds.has(teacherAccountId)) {
      throw new Error(`GlobalTimetableSessions row ${session._rowNumber} has an inactive or invalid TeacherAccountID`);
    }
    if (String(session.ZoomLink || "").trim() && !isHttpsUrl(session.ZoomLink)) {
      throw new Error(`GlobalTimetableSessions row ${session._rowNumber} ZoomLink must use HTTPS`);
    }
    sourceSessionIds.add(sessionId);
    sessionRuns.add(runId);
  }
  for (const [sessionId, lifecycle] of currentLifecycleBySession.entries()) {
    if (!sourceSessionIds.has(sessionId)) throw new Error(`GlobalTimetableSessionLifecycle row ${lifecycle._rowNumber} references an unknown SessionID`);
    const status = normalizeGlobalSessionStatus(lifecycle.Status);
    const fromId = normalizePlatformIdentifier(lifecycle.RescheduledFromSessionID);
    const toId = normalizePlatformIdentifier(lifecycle.RescheduledToSessionID);
    if (fromId && !sourceSessionIds.has(fromId)) throw new Error(`GlobalTimetableSessionLifecycle row ${lifecycle._rowNumber} has an invalid RescheduledFromSessionID`);
    if (toId && !sourceSessionIds.has(toId)) throw new Error(`GlobalTimetableSessionLifecycle row ${lifecycle._rowNumber} has an invalid RescheduledToSessionID`);
    if (status === "RESCHEDULED" && !toId) throw new Error(`GlobalTimetableSessionLifecycle row ${lifecycle._rowNumber} requires RescheduledToSessionID when RESCHEDULED`);
  }

  const stateRuns = new Set();
  const stateByRun = new Map();
  for (const state of tables.GlobalTimetableRunState) {
    const runId = normalizePlatformIdentifier(state.RunID);
    const stage = normalizePlatformIdentifier(state.Stage);
    if (!runIds.has(runId) || stateRuns.has(runId)) {
      throw new Error(`GlobalTimetableRunState row ${state._rowNumber} has an invalid or duplicate RunID`);
    }
    if (![GLOBAL_TIMETABLE_DEVELOPMENT_STAGE, GLOBAL_TIMETABLE_PUBLISHED_STAGE].includes(stage)) {
      throw new Error(`GlobalTimetableRunState row ${state._rowNumber} Stage must be DEVELOPMENT or PUBLISHED`);
    }
    if (stage === GLOBAL_TIMETABLE_PUBLISHED_STAGE && !normalizePlatformIdentifier(state.CurrentPublicationID)) {
      throw new Error(`GlobalTimetableRunState row ${state._rowNumber} requires CurrentPublicationID when PUBLISHED`);
    }
    stateRuns.add(runId);
    stateByRun.set(runId, state);
  }
  for (const runId of sessionRuns) {
    if (!stateRuns.has(runId)) {
      throw new Error(`Global timetable run ${runId} has sessions but no GlobalTimetableRunState row`);
    }
  }

  const publicationIds = new Set();
  const publicationVersions = new Set();
  const publicationById = new Map();
  for (const publication of tables.GlobalTimetablePublications) {
    const publicationId = normalizePlatformIdentifier(publication.PublicationID);
    const runId = normalizePlatformIdentifier(publication.RunID);
    const subjectId = normalizePlatformIdentifier(publication.SubjectID);
    const versionNo = Number(publication.VersionNo);
    const sessionCount = Number(publication.SessionCount);
    const publishedDate = String(publication.PublishedDate || "").trim();
    const publishedByAccountId = normalizePlatformIdentifier(publication.PublishedByAccountID);
    const publishedByAccountName = String(publication.PublishedByAccountName || "").trim();
    if (!publicationId || publicationIds.has(publicationId)) {
      throw new Error(`GlobalTimetablePublications row ${publication._rowNumber} has a blank or duplicate PublicationID`);
    }
    if (!runIds.has(runId) || runSubjects.get(runId) !== subjectId) {
      throw new Error(`GlobalTimetablePublications row ${publication._rowNumber} has an invalid run/subject relationship`);
    }
    if (!Number.isInteger(versionNo) || versionNo < 1 || publicationVersions.has(`${runId}|${versionNo}`)) {
      throw new Error(`GlobalTimetablePublications row ${publication._rowNumber} has an invalid or duplicate VersionNo`);
    }
    if (!Number.isInteger(sessionCount) || sessionCount < 1) {
      throw new Error(`GlobalTimetablePublications row ${publication._rowNumber} requires a positive SessionCount`);
    }
    if (!publishedDate || !accountIds.has(publishedByAccountId) || !publishedByAccountName) {
      throw new Error(`GlobalTimetablePublications row ${publication._rowNumber} has incomplete publication audit data`);
    }
    publicationIds.add(publicationId);
    publicationVersions.add(`${runId}|${versionNo}`);
    publicationById.set(publicationId, {
      publicationId,
      runId,
      subjectId,
      sessionCount,
      publishedDate,
      publishedByAccountId,
      publishedByAccountName
    });
  }

  const publishedSessionIds = new Set();
  const sourceByPublication = new Set();
  const snapshotCounts = new Map();
  for (const snapshot of tables.PublishedGlobalTimetableSessions) {
    const publishedSessionId = normalizePlatformIdentifier(snapshot.PublishedSessionID);
    const publicationId = normalizePlatformIdentifier(snapshot.PublicationID);
    const sourceSessionId = normalizePlatformIdentifier(snapshot.SourceSessionID);
    const runId = normalizePlatformIdentifier(snapshot.RunID);
    const subjectId = normalizePlatformIdentifier(snapshot.SubjectID);
    const moduleId = normalizePlatformIdentifier(snapshot.ModuleID);
    const teacherAccountId = normalizePlatformIdentifier(snapshot.TeacherAccountID);
    const publication = publicationById.get(publicationId);
    if (!publishedSessionId || publishedSessionIds.has(publishedSessionId)) {
      throw new Error(`PublishedGlobalTimetableSessions row ${snapshot._rowNumber} has a blank or duplicate PublishedSessionID`);
    }
    if (!publication || publication.runId !== runId || publication.subjectId !== subjectId) {
      throw new Error(`PublishedGlobalTimetableSessions row ${snapshot._rowNumber} has an invalid publication/run/subject relationship`);
    }
    const sourceKey = `${publicationId}|${sourceSessionId}`;
    if (!sourceSessionId || sourceByPublication.has(sourceKey)) {
      throw new Error(`PublishedGlobalTimetableSessions row ${snapshot._rowNumber} has a blank or duplicate SourceSessionID`);
    }
    if (!runIds.has(runId) || runSubjects.get(runId) !== subjectId) {
      throw new Error(`PublishedGlobalTimetableSessions row ${snapshot._rowNumber} has an invalid run/subject relationship`);
    }
    if (moduleId && moduleSubjects.get(moduleId) !== subjectId) {
      throw new Error(`PublishedGlobalTimetableSessions row ${snapshot._rowNumber} has an invalid module relationship`);
    }
    if (!sessionWithinRun(snapshot, runById.get(runId)) || !validateTimeRange(snapshot.StartTime, snapshot.EndTime)) {
      throw new Error(`PublishedGlobalTimetableSessions row ${snapshot._rowNumber} has invalid date/time values`);
    }
    if (teacherAccountId && !accountIds.has(teacherAccountId)) {
      throw new Error(`PublishedGlobalTimetableSessions row ${snapshot._rowNumber} has an invalid TeacherAccountID`);
    }
    if (String(snapshot.ZoomLink || "").trim() && !isHttpsUrl(snapshot.ZoomLink)) {
      throw new Error(`PublishedGlobalTimetableSessions row ${snapshot._rowNumber} ZoomLink must use HTTPS`);
    }
    if (
      String(snapshot.PublishedDate || "").trim() !== publication.publishedDate ||
      normalizePlatformIdentifier(snapshot.PublishedByAccountID) !== publication.publishedByAccountId ||
      !String(snapshot.PublishedByAccountName || "").trim()
    ) {
      throw new Error(`PublishedGlobalTimetableSessions row ${snapshot._rowNumber} does not match its publication audit data`);
    }
    if (
      !String(snapshot.RunName || "").trim() ||
      !String(snapshot.SubjectName || "").trim() ||
      !String(snapshot.TeacherName || "").trim() ||
      !String(snapshot.Timezone || "").trim() ||
      (moduleId && !String(snapshot.ModuleName || "").trim())
    ) {
      throw new Error(`PublishedGlobalTimetableSessions row ${snapshot._rowNumber} is missing immutable display values`);
    }
    publishedSessionIds.add(publishedSessionId);
    sourceByPublication.add(sourceKey);
    snapshotCounts.set(publicationId, (snapshotCounts.get(publicationId) || 0) + 1);
  }

  for (const [key, lifecycle] of publishedLifecycleByKey.entries()) {
    const publicationId = normalizePlatformIdentifier(lifecycle.PublicationID);
    const sessionId = normalizePlatformIdentifier(lifecycle.SessionID);
    if (!publicationIds.has(publicationId)) throw new Error(`GlobalTimetableSessionLifecycle row ${lifecycle._rowNumber} has an invalid PublicationID`);
    if (!sourceByPublication.has(`${publicationId}|${sessionId}`)) throw new Error(`GlobalTimetableSessionLifecycle row ${lifecycle._rowNumber} does not match a published session snapshot`);
    const fromId = normalizePlatformIdentifier(lifecycle.RescheduledFromSessionID);
    const toId = normalizePlatformIdentifier(lifecycle.RescheduledToSessionID);
    if (fromId && !sourceByPublication.has(`${publicationId}|${fromId}`)) throw new Error(`GlobalTimetableSessionLifecycle row ${lifecycle._rowNumber} has an invalid published RescheduledFromSessionID`);
    if (toId && !sourceByPublication.has(`${publicationId}|${toId}`)) throw new Error(`GlobalTimetableSessionLifecycle row ${lifecycle._rowNumber} has an invalid published RescheduledToSessionID`);
  }

  for (const publication of publicationById.values()) {
    if ((snapshotCounts.get(publication.publicationId) || 0) !== publication.sessionCount) {
      throw new Error(`Global timetable publication ${publication.publicationId} SessionCount does not match its snapshot rows`);
    }
  }

  for (const [runId, state] of stateByRun.entries()) {
    const currentPublicationId = normalizePlatformIdentifier(state.CurrentPublicationID);
    if (!currentPublicationId) continue;
    const publication = publicationById.get(currentPublicationId);
    if (!publication || publication.runId !== runId) {
      throw new Error(`GlobalTimetableRunState row ${state._rowNumber} CurrentPublicationID is invalid`);
    }
    const resolved = resolveCurrentPublishedGlobalTimetable(tables, runId);
    if (!resolved.ok) {
      throw new Error(`GlobalTimetableRunState row ${state._rowNumber} current publication failed integrity: ${resolved.error}`);
    }
  }

  return Object.freeze({
    sessionCount: tables.GlobalTimetableSessions.length,
    stateCount: tables.GlobalTimetableRunState.length,
    publicationCount: tables.GlobalTimetablePublications.length,
    publishedSessionCount: tables.PublishedGlobalTimetableSessions.length,
    lifecycleCount: tables.GlobalTimetableSessionLifecycle.length
  });
}

function isHttpsUrl(value) {
  try {
    return new URL(String(value || "").trim()).protocol === "https:";
  } catch (error) {
    return false;
  }
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
