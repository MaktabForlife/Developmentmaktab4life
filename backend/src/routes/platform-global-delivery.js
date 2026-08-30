/* M4L V103.1.0.5 - Global Courses metadata, FREE/PAID access and staged course-access schema migration. */

import { getAuthUser } from "../lib/auth.js";
import {
  countActiveGlobalSubjectSubscriptions,
  deriveGlobalSubjectRunStatus,
  GLOBAL_SUBJECT_ACCESS_MODELS,
  isValidIanaTimezone,
  mapGlobalSubjectRun,
  resolveGlobalSubjectAccessPolicy,
  strongestGlobalSubjectDeliveryStatus,
  validateIsoDate
} from "../lib/global-subject-delivery.js";
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

const ACCESS_MODELS = new Set(GLOBAL_SUBJECT_ACCESS_MODELS);
const MAX_RUN_NAME_LENGTH = 160;
const PLATFORM_TIMEZONE_CONFIG_KEY = "PLATFORMTIMEZONE";
const COURSE_ACCESS_SCHEMA_VERSION = "102.0.9";
const LEGACY_COURSE_ACCESS_SCHEMA_VERSION = "102.0.8";
const COURSE_ACCESS_MODELS = new Set(["FREE", "PAID"]);

export async function getPlatformGlobalDeliveryEndpoint(request, env) {
  const permission = await requireDeliveryAdmin(request, env);
  if (!permission.ok) return permission.response;

  try {
    const tables = await readDeliveryTables(env);
    const now = new Date();
    return json({
      success: true,
      service: "platform-global-delivery",
      globalCurriculumVersion: readGlobalCurriculumVersion(tables.PlatformConfig).value,
      platformTimezone: readPlatformTimezone(tables.PlatformConfig),
      platformSchemaVersion: readPlatformSchemaVersion(tables.PlatformConfig).value,
      courseAccessSchemaReady: tables.GlobalSubjectRuns._courseAccessSchemaReady === true,
      subjects: tables.GlobalSubjectList.map(subject => mapDeliverySubject(subject, tables, now)),
      policies: tables.GlobalSubjectAccessPolicy.map(mapPolicy),
      runs: tables.GlobalSubjectRuns.map(run => mapCourseRun(run, tables, now))
    });
  } catch (error) {
    return deliveryError(error, env);
  }
}

export async function savePlatformGlobalSubjectPolicyEndpoint(request, env) {
  const permission = await requireDeliveryAdmin(request, env);
  if (!permission.ok) return permission.response;

  try {
    const body = await request.json();
    const subjectId = clean(body.subjectId || body.subjectid);
    const accessModel = normalizePlatformIdentifier(body.accessModel || body.accessmodel);
    if (!subjectId) throw clientError("Global SubjectID is required", 400);
    if (!ACCESS_MODELS.has(accessModel)) {
      throw clientError("AccessModel must be FREE or SUBSCRIPTION", 400);
    }

    const tables = await readDeliveryTables(env);
    const subject = uniqueRecord(tables.GlobalSubjectList, "SubjectID", subjectId, "Global subject");
    const subjectKey = normalizePlatformIdentifier(subject.SubjectID);
    const activeMatches = tables.GlobalSubjectAccessPolicy.filter(policy => (
      normalizePlatformIdentifier(policy.SubjectID) === subjectKey && isActivePlatformValue(policy.Active)
    ));
    if (activeMatches.length > 1) {
      throw clientError("Global subject has duplicate active access policies; run Platform validation", 409);
    }

    const timestamp = new Date().toISOString();
    const existing = activeMatches[0] || null;
    if (existing && normalizePlatformIdentifier(existing.AccessModel) === accessModel) {
      return json({
        success: true,
        message: `Global subject is already ${accessModel}`,
        policy: mapPolicy(existing),
        dependencies: subjectDependencies(tables, subject.SubjectID)
      });
    }

    const record = existing ? {
      ...existing,
      AccessModel: accessModel,
      Active: true,
      ModifiedByAccountID: permission.user.accountid,
      ModifiedByAccountName: permission.user.username,
      ModifiedDate: timestamp
    } : {
      SubjectPolicyID: createPlatformId("GSPOL"),
      SubjectID: clean(subject.SubjectID),
      AccessModel: accessModel,
      Active: true,
      CreatedDate: timestamp,
      CreatedByAccountID: permission.user.accountid,
      CreatedByAccountName: permission.user.username,
      ModifiedByAccountID: "",
      ModifiedByAccountName: "",
      ModifiedDate: ""
    };

    await writeDeliveryMutation(env, permission.user, tables, {
      sheetName: "GlobalSubjectAccessPolicy",
      rowNumber: existing?._rowNumber || nextRowNumber(tables.GlobalSubjectAccessPolicy),
      record,
      action: existing ? "UPDATE_GLOBAL_SUBJECT_ACCESS_POLICY" : "CREATE_GLOBAL_SUBJECT_ACCESS_POLICY",
      recordType: "GLOBAL_SUBJECT_ACCESS_POLICY",
      recordId: record.SubjectPolicyID,
      changedFields: existing ? ["AccessModel"] : ["SubjectID", "AccessModel", "Active"],
      timestamp
    });

    return json({
      success: true,
      message: `Global subject access set to ${accessModel}`,
      policy: mapPolicy(record),
      dependencies: subjectDependencies(tables, subject.SubjectID)
    });
  } catch (error) {
    return deliveryMutationError(error, env);
  }
}

export async function savePlatformGlobalSubjectRunEndpoint(request, env) {
  const permission = await requireDeliveryAdmin(request, env);
  if (!permission.ok) return permission.response;

  try {
    const body = await request.json();
    const runId = clean(body.runId || body.runid);
    const subjectId = clean(body.subjectId || body.subjectid);
    const runName = clean(body.runName || body.runname);
    let startDate = clean(body.startDate || body.startdate);
    let endDate = clean(body.endDate || body.enddate);
    const requestedTimezone = clean(body.timezone);
    const requestedActive = readBoolean(body.active, runId ? null : true);
    const requestedAccessModel = normalizePlatformIdentifier(body.accessModel || body.accessmodel);
    const requestedOngoing = body.ongoing === undefined
      ? (!startDate && !endDate)
      : readBoolean(body.ongoing, false);

    if (!subjectId) throw clientError("Global SubjectID is required", 400);
    if (!runName) throw clientError("Run name is required", 400);
    if (runName.length > MAX_RUN_NAME_LENGTH) throw clientError("Run name is too long", 400);
    if (requestedOngoing) {
      startDate = "";
      endDate = "";
    } else {
      if (!validateIsoDate(startDate) || !validateIsoDate(endDate)) {
        throw clientError("StartDate and EndDate must use YYYY-MM-DD unless the course is Ongoing", 400);
      }
      if (endDate < startDate) throw clientError("EndDate cannot precede StartDate", 400);
    }

    const tables = await readDeliveryTables(env);
    const platformTimezone = readPlatformTimezone(tables.PlatformConfig);
    const courseAccessSchemaReady = tables.GlobalSubjectRuns._courseAccessSchemaReady === true;
    if (!courseAccessSchemaReady) {
      throw clientError("Run the V103.1.0.5 Course access migration before saving Courses", 409);
    }
    const timezone = existingTimezoneCandidate(runId, tables.GlobalSubjectRuns) || requestedTimezone || platformTimezone;
    if (!isValidIanaTimezone(timezone)) throw clientError("Platform timezone is invalid", 409);
    const subject = uniqueRecord(tables.GlobalSubjectList, "SubjectID", subjectId, "Global subject");
    if (requestedActive && !isActivePlatformValue(subject.Active)) {
      throw clientError("An active run requires an active global subject", 409);
    }
    const existing = runId
      ? uniqueRecord(tables.GlobalSubjectRuns, "RunID", runId, "Global subject run")
      : null;
    const accessModel = requestedAccessModel || resolveCourseAccessModel(existing, tables);
    if (!COURSE_ACCESS_MODELS.has(accessModel)) {
      throw clientError("Course AccessModel must be FREE or PAID", 400);
    }
    if (existing) {
      const timetableState = tables.GlobalTimetableRunState.find(row => (
        normalizePlatformIdentifier(row.RunID) === normalizePlatformIdentifier(existing.RunID)
      ));
      if (normalizePlatformIdentifier(timetableState?.Stage) === "PUBLISHED") {
        const wouldChange = [
          [existing.RunName, runName], [existing.StartDate, startDate], [existing.EndDate, endDate],
          [normalizePlatformIdentifier(existing.AccessModel), accessModel],
          [String(isActivePlatformValue(existing.Active)), String(requestedActive)]
        ].some(([left, right]) => String(left ?? "") !== String(right ?? ""));
        if (wouldChange) throw clientError("Revise timetable before modifying a published course", 409);
      }
    }
    if (
      existing &&
      normalizePlatformIdentifier(existing.SubjectID) !== normalizePlatformIdentifier(subject.SubjectID)
    ) {
      throw clientError("A run cannot be moved to a different global subject", 409);
    }

    // V103.1.0.5: fixed Course dates describe the current delivery window, not the lifetime
    // of the reusable Course. Historical sessions from earlier deliveries remain preserved.

    const timestamp = new Date().toISOString();
    const record = existing ? {
      ...existing,
      RunName: runName,
      StartDate: startDate,
      EndDate: endDate,
      Timezone: timezone,
      Active: requestedActive,
      ModifiedByAccountID: permission.user.accountid,
      ModifiedByAccountName: permission.user.username,
      ModifiedDate: timestamp,
      AccessModel: courseAccessSchemaReady ? accessModel : clean(existing.AccessModel)
    } : {
      RunID: createPlatformId("GSRUN"),
      SubjectID: clean(subject.SubjectID),
      RunName: runName,
      StartDate: startDate,
      EndDate: endDate,
      Timezone: timezone,
      Active: requestedActive,
      CreatedDate: timestamp,
      CreatedByAccountID: permission.user.accountid,
      CreatedByAccountName: permission.user.username,
      ModifiedByAccountID: "",
      ModifiedByAccountName: "",
      ModifiedDate: "",
      AccessModel: courseAccessSchemaReady ? accessModel : ""
    };

    const changedFields = existing
      ? changedRecordFields(existing, record, ["RunName", "StartDate", "EndDate", "Timezone", "Active", "AccessModel"])
      : ["SubjectID", "RunName", "StartDate", "EndDate", "Timezone", "Active", ...(courseAccessSchemaReady ? ["AccessModel"] : [])];
    if (existing && changedFields.length === 0) {
      return json({
        success: true,
        message: "No global-subject run changes requested",
        run: mapCourseRun(existing, tables),
        dependencies: subjectDependencies(tables, subject.SubjectID)
      });
    }

    await writeDeliveryMutation(env, permission.user, tables, {
      sheetName: "GlobalSubjectRuns",
      rowNumber: existing?._rowNumber || nextRowNumber(tables.GlobalSubjectRuns),
      record,
      action: existing ? "UPDATE_GLOBAL_SUBJECT_RUN" : "CREATE_GLOBAL_SUBJECT_RUN",
      recordType: "GLOBAL_SUBJECT_RUN",
      recordId: record.RunID,
      changedFields,
      timestamp
    });

    return json({
      success: true,
      message: existing ? "Global-subject run updated" : "Global-subject run created",
      run: mapCourseRun(record, tables),
      dependencies: subjectDependencies(tables, subject.SubjectID)
    });
  } catch (error) {
    return deliveryMutationError(error, env);
  }
}

export async function migratePlatformGlobalCourseAccessEndpoint(request, env) {
  const permission = await requireDeliveryAdmin(request, env);
  if (!permission.ok) return permission.response;
  if (permission.user.role !== "GLOBAL_ADMIN") {
    return json({ success: false, error: "GLOBAL_ADMIN authority is required for the Course access schema migration" }, 403);
  }
  try {
    const body = await request.json();
    const commit = body.commit === true;
    const tables = await readDeliveryTables(env);
    const schema = readPlatformSchemaVersion(tables.PlatformConfig);
    const ready = tables.GlobalSubjectRuns._courseAccessSchemaReady === true;
    const proposed = tables.GlobalSubjectRuns.map(run => ({
      runid: clean(run.RunID),
      runname: clean(run.RunName),
      subjectid: clean(run.SubjectID),
      accessmodel: resolveCourseAccessModel(run, tables)
    }));
    if (!commit) {
      return json({
        success: true,
        canCommit: !ready || schema.value !== COURSE_ACCESS_SCHEMA_VERSION,
        courseAccessSchemaReady: ready,
        platformSchemaVersion: schema.value,
        targetPlatformSchemaVersion: COURSE_ACCESS_SCHEMA_VERSION,
        courseCount: proposed.length,
        courses: proposed,
        confirmationText: "MIGRATE COURSES"
      });
    }
    if (normalizePlatformIdentifier(body.confirmation) !== "MIGRATE COURSES") {
      throw clientError("Enter MIGRATE COURSES to confirm the Course access migration", 400);
    }
    if (ready && schema.value === COURSE_ACCESS_SCHEMA_VERSION) {
      return json({ success: true, message: "Course FREE/PAID access schema is already current", courseAccessSchemaReady: true, platformSchemaVersion: schema.value });
    }
    if (![LEGACY_COURSE_ACCESS_SCHEMA_VERSION, COURSE_ACCESS_SCHEMA_VERSION].includes(schema.value)) {
      throw clientError(`Course access migration supports PlatformSchemaVersion ${LEGACY_COURSE_ACCESS_SCHEMA_VERSION} or ${COURSE_ACCESS_SCHEMA_VERSION}`, 409);
    }
    const timestamp = new Date().toISOString();
    const runHeaders = PLATFORM_SHEET_HEADERS.GlobalSubjectRuns;
    const runRows = tables.GlobalSubjectRuns.map(run => ({ ...run, AccessModel: resolveCourseAccessModel(run, tables) }));
    const writes = [{
      range: `'GlobalSubjectRuns'!A1:${columnName(runHeaders.length)}${Math.max(1, runRows.length + 1)}`,
      majorDimension: "ROWS",
      values: [runHeaders, ...runRows.map(record => recordToRow(record, runHeaders))]
    }, {
      range: `'PlatformConfig'!B${schema.rowNumber}:E${schema.rowNumber}`,
      majorDimension: "ROWS",
      values: [[COURSE_ACCESS_SCHEMA_VERSION, timestamp, permission.user.accountid, permission.user.username]]
    }, valueWrite("PlatformAuditLog", nextRowNumber(tables.PlatformAuditLog), [
      createPlatformId("AUDIT"), timestamp, permission.user.accountid, permission.user.username,
      permission.user.role, "", "MIGRATE_GLOBAL_COURSE_ACCESS_MODEL", "PLATFORM_SCHEMA",
      COURSE_ACCESS_SCHEMA_VERSION, JSON.stringify(["GlobalSubjectRuns.AccessModel", "PlatformSchemaVersion"])
    ])];
    await batchUpdateGoogleSheetValues(env, writes, { spreadsheetId: getPlatformSpreadsheetId(env) });
    return json({
      success: true,
      message: `${runRows.length} Course access value${runRows.length === 1 ? "" : "s"} prepared as FREE/PAID`,
      courseAccessSchemaReady: true,
      platformSchemaVersion: COURSE_ACCESS_SCHEMA_VERSION,
      migrated: runRows.length
    });
  } catch (error) {
    return deliveryMutationError(error, env);
  }
}

async function requireDeliveryAdmin(request, env) {
  const user = await getAuthUser(request, env);
  if (!user) return { ok: false, response: json({ success: false, error: "Unauthorized" }, 401) };
  const authority = normalizePlatformIdentifier(user.role);
  if (user.type !== "account" || !["ADMIN", "GLOBAL_ADMIN"].includes(authority)) {
    return {
      ok: false,
      response: json({ success: false, error: "ADMIN or GLOBAL_ADMIN authority is required" }, 403)
    };
  }
  return {
    ok: true,
    user: {
      accountid: clean(user.accountid),
      username: clean(user.username || "Global Admin"),
      role: authority,
      courseid: clean(user.courseid)
    }
  };
}

async function readDeliveryTables(env) {
  const names = [
    "GlobalSubjectList",
    "GlobalModuleList",
    "GlobalSubjectAccessPolicy",
    "GlobalSubjectRuns",
    "GlobalSubjectAccessMatrix",
    "GlobalTimetableSessions",
    "GlobalTimetableRunState",
    "GlobalResources",
    "PlatformConfig",
    "PlatformAuditLog"
  ];
  const entries = await Promise.all(names.map(async name => [name, await readPlatformSheet(env, name)]));
  return Object.fromEntries(entries);
}

async function writeDeliveryMutation(env, user, tables, mutation) {
  const version = readGlobalCurriculumVersion(tables.PlatformConfig);
  const nextVersion = version.value + 1;
  const headers = PLATFORM_SHEET_HEADERS[mutation.sheetName];
  const auditRow = [
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

function readPlatformSchemaVersion(configRows) {
  const matches = (configRows || []).filter(row => normalizePlatformIdentifier(row.ConfigKey) === "PLATFORMSCHEMAVERSION");
  const value = clean(matches[0]?.ConfigValue);
  if (matches.length !== 1 || !value) throw new Error("PlatformConfig PlatformSchemaVersion must resolve exactly once");
  return { value, rowNumber: matches[0]._rowNumber };
}

function resolveCourseAccessModel(run, tables) {
  const explicit = normalizePlatformIdentifier(run?.AccessModel);
  if (COURSE_ACCESS_MODELS.has(explicit)) return explicit;
  const subjectId = clean(run?.SubjectID);
  const subjectPolicy = resolveGlobalSubjectAccessPolicy(tables?.GlobalSubjectAccessPolicy || [], subjectId).accessModel;
  return subjectPolicy === "FREE" ? "FREE" : "PAID";
}

function mapCourseRun(run, tables, now = new Date()) {
  return Object.freeze({
    ...mapGlobalSubjectRun(run, now),
    accessmodel: resolveCourseAccessModel(run, tables)
  });
}

function mapDeliverySubject(subject, tables, now) {
  const subjectId = clean(subject.SubjectID);
  const policy = resolveGlobalSubjectAccessPolicy(tables.GlobalSubjectAccessPolicy, subjectId);
  return {
    subjectid: subjectId,
    subjectname: clean(subject.SubjectName),
    active: isActivePlatformValue(subject.Active),
    accessmodel: policy.accessModel,
    policyconfigured: policy.configured,
    modulecount: tables.GlobalModuleList.filter(row => normalizePlatformIdentifier(row.SubjectID) === normalizePlatformIdentifier(subjectId)).length,
    deliverystatus: strongestGlobalSubjectDeliveryStatus(tables.GlobalSubjectRuns, subjectId, now),
    dependencies: subjectDependencies(tables, subjectId)
  };
}

function mapPolicy(policy) {
  return {
    subjectpolicyid: clean(policy.SubjectPolicyID),
    subjectid: clean(policy.SubjectID),
    accessmodel: normalizePlatformIdentifier(policy.AccessModel) || "SUBSCRIPTION",
    active: isActivePlatformValue(policy.Active)
  };
}

function subjectDependencies(tables, subjectId) {
  const requested = normalizePlatformIdentifier(subjectId);
  return {
    subscriptions: countActiveGlobalSubjectSubscriptions(tables.GlobalSubjectAccessMatrix, requested),
    resources: tables.GlobalResources.filter(row => normalizePlatformIdentifier(row.SubjectID) === requested).length,
    runs: tables.GlobalSubjectRuns.filter(row => normalizePlatformIdentifier(row.SubjectID) === requested).length
  };
}

function uniqueRecord(records, key, value, label) {
  const normalized = normalizePlatformIdentifier(value);
  if (!normalized) throw clientError(`${label} ID is required`, 400);
  const matches = (records || []).filter(record => normalizePlatformIdentifier(record[key]) === normalized);
  if (matches.length === 0) throw clientError(`${label} was not found`, 404);
  if (matches.length > 1) throw clientError(`${label} is duplicated`, 409);
  return matches[0];
}

function changedRecordFields(existing, next, keys) {
  return keys.filter(key => String(existing?.[key] ?? "") !== String(next?.[key] ?? ""));
}

function readGlobalCurriculumVersion(configRows) {
  const matches = (configRows || []).filter(row => (
    normalizePlatformIdentifier(row.ConfigKey) === "GLOBALCURRICULUMVERSION"
  ));
  const value = Number(matches[0]?.ConfigValue);
  if (matches.length !== 1 || !Number.isInteger(value) || value < 1) {
    throw new Error("PlatformConfig GlobalCurriculumVersion must resolve exactly once as a positive integer");
  }
  return { value, rowNumber: matches[0]._rowNumber };
}

function readPlatformTimezone(configRows) {
  const matches = (configRows || []).filter(row => normalizePlatformIdentifier(row.ConfigKey) === PLATFORM_TIMEZONE_CONFIG_KEY);
  if (matches.length !== 1) throw new Error("PlatformConfig PlatformTimezone must resolve exactly once");
  const timezone = clean(matches[0].ConfigValue);
  if (!isValidIanaTimezone(timezone)) throw new Error("PlatformConfig PlatformTimezone must be a valid IANA timezone");
  return timezone;
}

function existingTimezoneCandidate(runId, runRows) {
  if (!clean(runId)) return "";
  const key = normalizePlatformIdentifier(runId);
  const matches = (runRows || []).filter(row => normalizePlatformIdentifier(row.RunID) === key);
  return matches.length === 1 ? clean(matches[0].Timezone) : "";
}

function recordToRow(record, headers) {
  return headers.map(header => record?.[header] ?? "");
}

function valueWrite(sheetName, rowNumber, row) {
  return {
    range: `'${sheetName}'!A${rowNumber}:${columnName(row.length)}${rowNumber}`,
    majorDimension: "ROWS",
    values: [row]
  };
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

function readBoolean(value, fallback) {
  if (value === true || value === false) return value;
  const normalized = normalizePlatformIdentifier(value);
  if (["TRUE", "YES", "ACTIVE", "1"].includes(normalized)) return true;
  if (["FALSE", "NO", "INACTIVE", "0"].includes(normalized)) return false;
  if (fallback !== null && fallback !== undefined) return fallback;
  throw clientError("Active must be true or false", 400);
}

function createPlatformId(prefix) {
  const uuid = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${uuid}`;
}

function clientError(message, status = 400) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function deliveryMutationError(error, env) {
  if (Number.isInteger(error?.status) && error.status >= 400 && error.status < 500) {
    return json({ success: false, error: clean(error.message) }, error.status);
  }
  return deliveryError(error, env);
}

function deliveryError(error, env) {
  const response = { success: false, error: "Global-subject Delivery service is not ready" };
  if (String(env.M4L_ACCOUNT_AUTH_DIAGNOSTICS || "").trim().toLowerCase() === "true") {
    response.detail = clean(error?.message || "Delivery service error").replace(/[\r\n\t]+/g, " ").slice(0, 180);
  }
  return json(response, 503);
}

function clean(value) {
  return String(value ?? "").trim();
}
