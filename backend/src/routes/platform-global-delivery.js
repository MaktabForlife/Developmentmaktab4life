/* M4L V102.10 - Global-subject access-policy and finite scheduled-run management. */

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
      subjects: tables.GlobalSubjectList.map(subject => mapDeliverySubject(subject, tables, now)),
      policies: tables.GlobalSubjectAccessPolicy.map(mapPolicy),
      runs: tables.GlobalSubjectRuns.map(run => mapGlobalSubjectRun(run, now))
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
    const startDate = clean(body.startDate || body.startdate);
    const endDate = clean(body.endDate || body.enddate);
    const timezone = clean(body.timezone);
    const requestedActive = readBoolean(body.active, runId ? null : true);

    if (!subjectId) throw clientError("Global SubjectID is required", 400);
    if (!runName) throw clientError("Run name is required", 400);
    if (runName.length > MAX_RUN_NAME_LENGTH) throw clientError("Run name is too long", 400);
    if (!validateIsoDate(startDate) || !validateIsoDate(endDate)) {
      throw clientError("StartDate and EndDate must use YYYY-MM-DD", 400);
    }
    if (endDate < startDate) throw clientError("EndDate cannot precede StartDate", 400);
    if (!isValidIanaTimezone(timezone)) throw clientError("Timezone must be a valid IANA timezone", 400);

    const tables = await readDeliveryTables(env);
    const subject = uniqueRecord(tables.GlobalSubjectList, "SubjectID", subjectId, "Global subject");
    if (requestedActive && !isActivePlatformValue(subject.Active)) {
      throw clientError("An active run requires an active global subject", 409);
    }
    const existing = runId
      ? uniqueRecord(tables.GlobalSubjectRuns, "RunID", runId, "Global subject run")
      : null;
    if (
      existing &&
      normalizePlatformIdentifier(existing.SubjectID) !== normalizePlatformIdentifier(subject.SubjectID)
    ) {
      throw clientError("A run cannot be moved to a different global subject", 409);
    }

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
      ModifiedDate: timestamp
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
      ModifiedDate: ""
    };

    const changedFields = existing
      ? changedRecordFields(existing, record, ["RunName", "StartDate", "EndDate", "Timezone", "Active"])
      : ["SubjectID", "RunName", "StartDate", "EndDate", "Timezone", "Active"];
    if (existing && changedFields.length === 0) {
      return json({
        success: true,
        message: "No global-subject run changes requested",
        run: mapGlobalSubjectRun(existing),
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
      run: mapGlobalSubjectRun(record),
      dependencies: subjectDependencies(tables, subject.SubjectID)
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
    "GlobalSubjectAccessPolicy",
    "GlobalSubjectRuns",
    "GlobalSubjectAccessMatrix",
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

function mapDeliverySubject(subject, tables, now) {
  const subjectId = clean(subject.SubjectID);
  const policy = resolveGlobalSubjectAccessPolicy(tables.GlobalSubjectAccessPolicy, subjectId);
  return {
    subjectid: subjectId,
    subjectname: clean(subject.SubjectName),
    active: isActivePlatformValue(subject.Active),
    accessmodel: policy.accessModel,
    policyconfigured: policy.configured,
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
