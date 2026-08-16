/* M4L V102.9 - Admin preview, activation and rollback for the live timetable source. */

import {
  ADMIN_AUDIT_LOG_SHEET,
  buildAdminAuditRows,
  prepareAdminAudit
} from "../lib/admin-audit.js";
import { requireSystemAdmin } from "../lib/auth.js";
import {
  batchReadGoogleSheetValues,
  batchUpdateGoogleSpreadsheet,
  readGoogleSpreadsheetSheetProperties
} from "../lib/google-sheets.js";
import { json } from "../lib/http.js";
import {
  PUBLISHED_TIMETABLE_SESSION_SHEET,
  TIMETABLE_PUBLICATION_SHEET,
  TIMETABLE_STATE_SHEET,
  resolveCurrentPublishedTimetable
} from "../lib/timetable-publication.js";
import {
  SYSTEM_CONFIG_SHEET,
  TIMETABLE_LIVE_SOURCE_KEY,
  TIMETABLE_SOURCE_PUBLISHED,
  TIMETABLE_SOURCE_TEACHER_ASSIGN,
  findSystemConfigRowIndexes,
  getTimetableLiveSource
} from "../lib/system-config.js";

const TEACHER_ASSIGN_SHEET = "TeacherAssign";
const FULL_RANGE = "A:ZZ";
const ACTIVATE_CONFIRMATION = "ACTIVATE PUBLISHED TIMETABLE";
const ROLLBACK_CONFIRMATION = "RETURN TO TEACHERASSIGN";

export async function previewTimetableIntegrationGoogleSheetsEndpoint(request, env) {
  const permission = await requireIntegrationAdmin(request, env);
  if (!permission.ok) return permission.response;
  const body = await readJsonBody(request);
  const course = resolveRequestedCourse(body, env);
  if (!course.ok) return json({ success: false, error: course.error, code: course.code }, course.status);

  let data;
  try {
    data = await readIntegrationData(env);
  } catch (error) {
    return json({
      success: false,
      error: error?.message || "Unable to review timetable integration",
      code: "TIMETABLE_INTEGRATION_READ_FAILED"
    }, 503);
  }

  return json(buildTimetableIntegrationPreview(data, course.courseid));
}

export async function saveTimetableLiveSourceGoogleSheetsEndpoint(request, env) {
  const permission = await requireIntegrationAdmin(request, env);
  if (!permission.ok) return permission.response;
  const body = await readJsonBody(request);
  const course = resolveRequestedCourse(body, env);
  if (!course.ok) return json({ success: false, error: course.error, code: course.code }, course.status);

  const requestedSource = clean(body.source || body.liveSource).toUpperCase();
  if (![TIMETABLE_SOURCE_TEACHER_ASSIGN, TIMETABLE_SOURCE_PUBLISHED].includes(requestedSource)) {
    return json({ success: false, error: "Select a supported timetable live source" }, 400);
  }

  const requiredConfirmation = requestedSource === TIMETABLE_SOURCE_PUBLISHED
    ? ACTIVATE_CONFIRMATION
    : ROLLBACK_CONFIRMATION;
  if (clean(body.confirmation) !== requiredConfirmation) {
    return json({
      success: false,
      error: `Type ${requiredConfirmation} exactly to confirm this source change`
    }, 400);
  }

  let data;
  try {
    data = await readIntegrationData(env);
  } catch (error) {
    return json({
      success: false,
      error: error?.message || "Unable to validate timetable integration",
      code: "TIMETABLE_INTEGRATION_READ_FAILED"
    }, 503);
  }

  const preview = buildTimetableIntegrationPreview(data, course.courseid);
  if (!preview.success) return json(preview, 503);
  if (requestedSource === TIMETABLE_SOURCE_PUBLISHED) {
    if (!preview.readyToActivate) {
      return json({
        success: false,
        error: preview.blockingError || "The published timetable is not ready to become live",
        code: preview.blockingCode || "PUBLISHED_TIMETABLE_NOT_READY"
      }, 409);
    }
    if (!clean(body.publicationid || body.publicationId) || clean(body.publicationid || body.publicationId) !== preview.publication.publicationid) {
      return json({
        success: false,
        error: "The current publication changed after review. Review the integration again before activating.",
        code: "TIMETABLE_PUBLICATION_CHANGED"
      }, 409);
    }
  }

  if (preview.currentSource === requestedSource) {
    return json({
      success: true,
      changed: false,
      message: requestedSource === TIMETABLE_SOURCE_PUBLISHED
        ? "PublishedTimetableSessions is already the live timetable source"
        : "TeacherAssign is already the live timetable source",
      courseid: course.courseid,
      liveSource: requestedSource,
      publication: preview.publication || null
    });
  }

  const audit = await prepareAdminAudit(env, permission.user);
  if (!audit.ok) return json({ success: false, error: audit.error }, 503);

  try {
    await writeTimetableLiveSource(env, data.systemConfigRows, requestedSource, audit);
  } catch (error) {
    return json({
      success: false,
      error: error?.message || "Unable to save the timetable live source",
      code: "TIMETABLE_SOURCE_SAVE_FAILED"
    }, 503);
  }

  return json({
    success: true,
    changed: true,
    message: requestedSource === TIMETABLE_SOURCE_PUBLISHED
      ? `Published timetable version ${preview.publication.versionno} is now live for this course`
      : "TeacherAssign is now the live timetable source for this course",
    courseid: course.courseid,
    liveSource: requestedSource,
    publication: preview.publication || null
  });
}

export function buildTimetableIntegrationPreview(data = {}, courseId) {
  let currentSource;
  try {
    currentSource = getTimetableLiveSource(data.systemConfigRows || []);
  } catch (error) {
    return {
      success: false,
      error: error?.message || "TimetableLiveSource configuration is invalid",
      code: "TIMETABLE_SOURCE_CONFIG_INVALID"
    };
  }

  const resolved = resolveCurrentPublishedTimetable(data, courseId, {
    requireCurrentHeaders: true,
    requireDisplayValues: true
  });
  const base = {
    success: true,
    courseid: clean(courseId),
    currentSource,
    readyToActivate: resolved.ok,
    requiredConfirmation: currentSource === TIMETABLE_SOURCE_PUBLISHED
      ? ROLLBACK_CONFIRMATION
      : ACTIVATE_CONFIRMATION,
    targetSource: currentSource === TIMETABLE_SOURCE_PUBLISHED
      ? TIMETABLE_SOURCE_TEACHER_ASSIGN
      : TIMETABLE_SOURCE_PUBLISHED,
    snapshotSchemaReady: resolved.header?.current === true,
    publication: resolved.publication || null,
    comparison: emptyComparison(),
    warnings: []
  };

  if (!resolved.ok) {
    return {
      ...base,
      blockingCode: resolved.code,
      blockingError: resolved.error,
      warnings: [resolved.error]
    };
  }

  const comparison = comparePublishedAndTeacherAssign(
    resolved.sessions,
    data.teacherAssignRows || [],
    courseId
  );
  const warnings = [];
  if (comparison.invalidTeacherAssignHeaders) {
    warnings.push("TeacherAssign could not be compared because its required headers are incomplete. This does not invalidate the published snapshot.");
  } else if (comparison.publishedOnlyCount || comparison.teacherAssignOnlyCount) {
    warnings.push("The published snapshot differs from TeacherAssign. Review the listed differences before activation; differences may be intentional Builder changes.");
  }

  return { ...base, comparison, warnings };
}

export function comparePublishedAndTeacherAssign(publishedSessions = [], teacherRows = [], courseId = "") {
  const parsedTeacher = parseTeacherAssignRows(teacherRows, courseId);
  if (!parsedTeacher.ok) {
    return { ...emptyComparison(), invalidTeacherAssignHeaders: true };
  }

  const teacherBuckets = bucketBySignature(parsedTeacher.sessions);
  const publishedOnly = [];
  let matchingCount = 0;

  publishedSessions.forEach(session => {
    const signature = timetableSignature(session);
    const bucket = teacherBuckets.get(signature);
    if (bucket?.length) {
      bucket.shift();
      matchingCount += 1;
    } else {
      publishedOnly.push(describeSession(session));
    }
  });

  const teacherOnly = [];
  teacherBuckets.forEach(bucket => bucket.forEach(session => teacherOnly.push(describeSession(session))));
  return {
    matchingCount,
    publishedCount: publishedSessions.length,
    teacherAssignCount: parsedTeacher.sessions.length,
    publishedOnlyCount: publishedOnly.length,
    teacherAssignOnlyCount: teacherOnly.length,
    publishedOnly: publishedOnly.slice(0, 12),
    teacherAssignOnly: teacherOnly.slice(0, 12),
    invalidTeacherAssignHeaders: false
  };
}

async function requireIntegrationAdmin(request, env) {
  const permission = await requireSystemAdmin(request, env);
  if (!permission.ok) return permission;
  if (request.method !== "POST") {
    return { ok: false, response: json({ success: false, error: "Method not allowed" }, 405) };
  }
  return permission;
}

async function readIntegrationData(env) {
  const ranges = [
    `${TIMETABLE_STATE_SHEET}!${FULL_RANGE}`,
    `${TIMETABLE_PUBLICATION_SHEET}!${FULL_RANGE}`,
    `${PUBLISHED_TIMETABLE_SESSION_SHEET}!${FULL_RANGE}`,
    `${TEACHER_ASSIGN_SHEET}!${FULL_RANGE}`,
    `${SYSTEM_CONFIG_SHEET}!A:E`
  ];
  const [stateRows, publicationRows, publishedSessionRows, teacherAssignRows, systemConfigRows] =
    await batchReadGoogleSheetValues(env, ranges);
  return { stateRows, publicationRows, publishedSessionRows, teacherAssignRows, systemConfigRows };
}

function resolveRequestedCourse(body, env) {
  const requested = clean(body.courseid || body.courseId);
  const authenticated = clean(env.M4L_AUTHENTICATED_COURSE_ID);
  if (!requested) {
    return { ok: false, status: 400, code: "COURSE_REQUIRED", error: "Course is required" };
  }
  if (authenticated && requested !== authenticated) {
    return {
      ok: false,
      status: 403,
      code: "COURSE_CONTEXT_MISMATCH",
      error: "The requested course does not match the authenticated course context"
    };
  }
  return { ok: true, courseid: authenticated || requested };
}

async function writeTimetableLiveSource(env, systemConfigRows, source, audit) {
  const indexes = findSystemConfigRowIndexes(systemConfigRows, TIMETABLE_LIVE_SOURCE_KEY);
  if (indexes.length > 1) throw new Error(`SystemConfig contains duplicate ${TIMETABLE_LIVE_SOURCE_KEY} rows`);

  const properties = await readGoogleSpreadsheetSheetProperties(env);
  const ids = new Map(properties.map(sheet => [sheet.title, sheet.sheetId]));
  if (!ids.has(SYSTEM_CONFIG_SHEET) || !ids.has(ADMIN_AUDIT_LOG_SHEET)) {
    throw new Error("SystemConfig and AdminAuditLog tabs are required for timetable source changes");
  }

  const configRow = [
    TIMETABLE_LIVE_SOURCE_KEY,
    source,
    audit.timestamp,
    audit.actor.adminid,
    audit.actor.adminname
  ];
  const configRequest = indexes.length
    ? buildUpdateCellsRequest(ids.get(SYSTEM_CONFIG_SHEET), indexes[0], configRow)
    : buildAppendCellsRequest(ids.get(SYSTEM_CONFIG_SHEET), [configRow]);
  const auditRows = buildAdminAuditRows(audit, [{
    action: source === TIMETABLE_SOURCE_PUBLISHED ? "ACTIVATE" : "ROLLBACK",
    recordType: "TIMETABLE_LIVE_SOURCE",
    recordId: TIMETABLE_LIVE_SOURCE_KEY,
    changedFields: [TIMETABLE_LIVE_SOURCE_KEY]
  }]);

  await batchUpdateGoogleSpreadsheet(env, [
    configRequest,
    buildAppendCellsRequest(ids.get(ADMIN_AUDIT_LOG_SHEET), auditRows)
  ]);
}

function parseTeacherAssignRows(rows, courseId) {
  if (!Array.isArray(rows) || !rows[0]) return { ok: false, sessions: [] };
  const map = buildHeaderMap(rows[0]);
  const columns = {
    sessionid: findColumn(map, ["SessionID", "Session"]),
    subjectid: findColumn(map, ["SubjectID"]),
    subjectname: findColumn(map, ["SubjectName", "Subject"]),
    moduleid: findColumn(map, ["ModuleID"]),
    modulename: findColumn(map, ["ModuleName"]),
    dayofweek: findColumn(map, ["DayofWeek", "DayOfWeek", "Day"]),
    starttime: findColumn(map, ["StartTime", "Start Time", "Time"]),
    zoomlink: findColumn(map, ["ZoomLink", "Zoom Link"]),
    groupno: findColumn(map, ["GroupNo", "Group"]),
    teacherid: findColumn(map, ["AssignedTeacher", "TeacherID", "AdminID"]),
    teachername: findColumn(map, ["TeacherName", "AssignedTeacherName"]),
    courseid: findColumn(map, ["CourseID"]),
    active: findColumn(map, ["Active", "Status"])
  };
  if ([columns.sessionid, columns.subjectid, columns.dayofweek, columns.starttime, columns.groupno, columns.teacherid].some(index => index < 0)) {
    return { ok: false, sessions: [] };
  }

  const sessions = rows.slice(1).map(row => ({
    sourcesessionid: cell(row, columns.sessionid),
    courseid: cell(row, columns.courseid) || clean(courseId),
    subjectid: cell(row, columns.subjectid),
    subjectname: cell(row, columns.subjectname),
    moduleid: cell(row, columns.moduleid),
    modulename: cell(row, columns.modulename),
    dayofweek: cell(row, columns.dayofweek),
    starttime: normalizeTime(cell(row, columns.starttime)),
    zoomlink: cell(row, columns.zoomlink),
    groupno: cell(row, columns.groupno),
    teacherid: cell(row, columns.teacherid),
    teachername: cell(row, columns.teachername)
  })).filter((session, index) => {
    const row = rows[index + 1];
    if (columns.active >= 0 && !activeValue(cell(row, columns.active))) return false;
    if (columns.courseid >= 0 && session.courseid && session.courseid !== clean(courseId)) return false;
    return session.sourcesessionid && session.subjectid && session.dayofweek && session.starttime && session.groupno;
  });
  return { ok: true, sessions };
}

function timetableSignature(session) {
  return [
    normalizeDay(session.dayofweek),
    normalizeTime(session.starttime),
    session.subjectid,
    session.moduleid,
    session.groupno,
    session.teacherid,
    session.zoomlink
  ].map(normalize).join("|");
}

function bucketBySignature(sessions) {
  const buckets = new Map();
  sessions.forEach(session => {
    const signature = timetableSignature(session);
    if (!buckets.has(signature)) buckets.set(signature, []);
    buckets.get(signature).push(session);
  });
  return buckets;
}

function describeSession(session) {
  return {
    sessionid: clean(session.sourcesessionid || session.sessionid),
    dayofweek: normalizeDay(session.dayofweek),
    starttime: normalizeTime(session.starttime),
    subjectid: clean(session.subjectid),
    subjectname: clean(session.subjectname) || clean(session.subjectid),
    moduleid: clean(session.moduleid),
    modulename: clean(session.modulename),
    groupno: clean(session.groupno),
    teacherid: clean(session.teacherid),
    teachername: clean(session.teachername) || clean(session.teacherid),
    zoomlink: clean(session.zoomlink)
  };
}

function emptyComparison() {
  return {
    matchingCount: 0,
    publishedCount: 0,
    teacherAssignCount: 0,
    publishedOnlyCount: 0,
    teacherAssignOnlyCount: 0,
    publishedOnly: [],
    teacherAssignOnly: [],
    invalidTeacherAssignHeaders: false
  };
}

function buildAppendCellsRequest(sheetId, rows) {
  return {
    appendCells: {
      sheetId,
      rows: rows.map(row => ({ values: row.map(value => ({ userEnteredValue: toSheetValue(value) })) })),
      fields: "userEnteredValue"
    }
  };
}

function buildUpdateCellsRequest(sheetId, rowIndex, row) {
  return {
    updateCells: {
      range: {
        sheetId,
        startRowIndex: rowIndex,
        endRowIndex: rowIndex + 1,
        startColumnIndex: 0,
        endColumnIndex: row.length
      },
      rows: [{ values: row.map(value => ({ userEnteredValue: toSheetValue(value) })) }],
      fields: "userEnteredValue"
    }
  };
}

function toSheetValue(value) {
  if (typeof value === "boolean") return { boolValue: value };
  if (typeof value === "number" && Number.isFinite(value)) return { numberValue: value };
  return { stringValue: clean(value) };
}

function buildHeaderMap(headers) {
  return (Array.isArray(headers) ? headers : []).reduce((map, header, index) => {
    const key = normalizeHeader(header);
    if (key && !map.has(key)) map.set(key, index);
    return map;
  }, new Map());
}

function findColumn(map, aliases) {
  for (const alias of aliases) {
    const index = map.get(normalizeHeader(alias));
    if (index !== undefined) return index;
  }
  return -1;
}

function normalizeDay(value) {
  const days = { mon: "Mon", monday: "Mon", tue: "Tue", tues: "Tue", tuesday: "Tue", wed: "Wed", wednesday: "Wed", thu: "Thu", thur: "Thu", thurs: "Thu", thursday: "Thu", fri: "Fri", friday: "Fri", sat: "Sat", saturday: "Sat", sun: "Sun", sunday: "Sun" };
  return days[normalize(value)] || clean(value);
}

function normalizeTime(value) {
  const match = /^(\d{1,2}):(\d{2})/.exec(clean(value));
  return match ? `${String(Number(match[1])).padStart(2, "0")}:${match[2]}` : clean(value);
}

function activeValue(value) {
  if (value === true || value === 1) return true;
  return ["true", "yes", "active", "1"].includes(normalize(value));
}

function cell(row, index) {
  return index >= 0 ? clean(row?.[index]) : "";
}

function normalizeHeader(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalize(value) {
  return clean(value).toLowerCase().replace(/\s+/g, "");
}

async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function clean(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}
