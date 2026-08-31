import { callAppsScript } from "../lib/apps-script.js";
import {
  appendAdminAuditLog,
  prepareAdminAudit
} from "../lib/admin-audit.js";
import { getAuthUser, requireAdminOrSenior, requireSystemAdmin } from "../lib/auth.js";
import { batchReadGoogleSheetValues, readGoogleSheetValues } from "../lib/google-sheets.js";
import { json } from "../lib/http.js";
import {
  PUBLISHED_TIMETABLE_SESSION_SHEET,
  TIMETABLE_PUBLICATION_SHEET,
  TIMETABLE_STATE_SHEET,
  resolveCurrentPublishedTimetable
} from "../lib/timetable-publication.js";
import {
  GLOBAL_ZOOM_LINK_KEY,
  TIMETABLE_SOURCE_PUBLISHED,
  TIMETABLE_SOURCE_TEACHER_ASSIGN,
  findSystemConfigRowIndexes,
  getSystemConfigValue,
  getTimetableLiveSource,
  normalizeGlobalZoomLink,
  readSystemConfigRows,
  upsertSystemConfigValues
} from "../lib/system-config.js";

const TEACHER_TIMETABLE_SHEET_NAME = "TeacherAssign";
const LEGACY_TIMETABLE_SHEET_NAME = "TimeTable";
const ADMIN_RECORDS_SHEET_NAME = "AdminRecords";
const SUBJECT_LIST_SHEET_NAME = "SubjectList";
const MODULE_LIST_SHEET_NAME = "ModuleList";
const FULL_SHEET_RANGE = "A:ZZ";
const TEACHER_TIMETABLE_SHEET_RANGE = `${TEACHER_TIMETABLE_SHEET_NAME}!${FULL_SHEET_RANGE}`;
const LEGACY_TIMETABLE_SHEET_RANGE = `${LEGACY_TIMETABLE_SHEET_NAME}!${FULL_SHEET_RANGE}`;
const ADMIN_RECORDS_SHEET_RANGE = `${ADMIN_RECORDS_SHEET_NAME}!${FULL_SHEET_RANGE}`;
const SUBJECT_LIST_SHEET_RANGE = `${SUBJECT_LIST_SHEET_NAME}!${FULL_SHEET_RANGE}`;
const MODULE_LIST_SHEET_RANGE = `${MODULE_LIST_SHEET_NAME}!${FULL_SHEET_RANGE}`;

export async function getTimetableAppsScriptEndpoint(request, env) {
  const context = await getTimetableRequestContext(request, env);

  if (!context.ok) {
    return context.response;
  }

  const result = await callAppsScript(env, {
    action: "getTimetable",
    data: {
      groupNo: context.groupNo,
      teacherId: context.teacherId,
      userType: context.authUser.type,
      role: context.authUser.role || ""
    }
  });

  return json(result);
}

// Retained until the verified TeacherAssign timetable fully replaces the legacy path.
export const getTimetableEndpoint = getTimetableAppsScriptEndpoint;

export async function getTimetableGoogleSheetsEndpoint(request, env) {
  const context = await getTimetableRequestContext(request, env);

  if (!context.ok) {
    return context.response;
  }

  let systemConfigRows;
  try {
    systemConfigRows = await readSystemConfigRows(env);
  } catch (error) {
    return json({
      success: false,
      error: "Timetable source configuration could not be read",
      code: "TIMETABLE_SOURCE_CONFIG_UNAVAILABLE",
      retryable: true,
      sessions: []
    }, 503);
  }

  let liveSource;
  try {
    liveSource = getTimetableLiveSource(systemConfigRows);
  } catch (error) {
    return json({
      success: false,
      error: error?.message || "Timetable live source configuration is invalid",
      code: "TIMETABLE_SOURCE_CONFIG_INVALID",
      sessions: []
    }, 503);
  }

  const globalZoomConfigured = findSystemConfigRowIndexes(
    systemConfigRows,
    GLOBAL_ZOOM_LINK_KEY
  ).length === 1;
  const globalZoomLink = getSystemConfigValue(systemConfigRows, GLOBAL_ZOOM_LINK_KEY);

  if (liveSource === TIMETABLE_SOURCE_PUBLISHED) {
    let stateRows;
    let publicationRows;
    let publishedSessionRows;
    try {
      [stateRows, publicationRows, publishedSessionRows] = await batchReadGoogleSheetValues(env, [
        `${TIMETABLE_STATE_SHEET}!${FULL_SHEET_RANGE}`,
        `${TIMETABLE_PUBLICATION_SHEET}!${FULL_SHEET_RANGE}`,
        `${PUBLISHED_TIMETABLE_SESSION_SHEET}!${FULL_SHEET_RANGE}`
      ]);
    } catch (error) {
      return publishedTimetableUnavailableResponse(
        "The published timetable could not be read. No legacy fallback was used.",
        "PUBLISHED_TIMETABLE_READ_FAILED"
      );
    }

    const current = resolveCurrentPublishedTimetable({
      stateRows,
      publicationRows,
      publishedSessionRows
    }, env.M4L_AUTHENTICATED_COURSE_ID || inferPublishedCourseId(stateRows), {
      requireCurrentHeaders: true,
      requireDisplayValues: true
    });
    if (!current.ok) {
      return publishedTimetableUnavailableResponse(current.error, current.code);
    }

    const legacyRows = globalZoomConfigured ? [] : await readLegacyTimetableRows(env);
    return json(buildPublishedTimetableResponse(current, {
      legacyRows,
      globalZoomLink,
      globalZoomConfigured,
      groupNo: context.groupNo,
      teacherId: context.teacherId,
      allGroupsStudent: context.allGroupsStudent,
      viewerAdminId: context.viewerAdminId,
      viewerRole: context.viewerRole,
      teacherOnly: context.teacherOnly,
      showGroupLabels: context.showGroupLabels
    }));
  }

  let teacherRows;
  let adminRows;
  let subjectRows;
  let moduleRows;

  try {
    [teacherRows, adminRows, subjectRows, moduleRows] = await batchReadGoogleSheetValues(env, [
      TEACHER_TIMETABLE_SHEET_RANGE,
      ADMIN_RECORDS_SHEET_RANGE,
      SUBJECT_LIST_SHEET_RANGE,
      MODULE_LIST_SHEET_RANGE
    ]);
  } catch (error) {
    const missingSheet = getMissingRequiredSheetName(error);

    if (!missingSheet) {
      throw error;
    }

    return json(missingTimetableSheetResponse(missingSheet));
  }

  const legacyRows = globalZoomConfigured ? [] : await readLegacyTimetableRows(env);

  return json(buildTimetableResponse(teacherRows, {
    adminRows,
    subjectRows,
    moduleRows,
    legacyRows,
    globalZoomLink,
    globalZoomConfigured,
    groupNo: context.groupNo,
    teacherId: context.teacherId,
    allGroupsStudent: context.allGroupsStudent,
    viewerAdminId: context.viewerAdminId,
    viewerRole: context.viewerRole,
    teacherOnly: context.teacherOnly,
    showGroupLabels: context.showGroupLabels
  }));
}

export function buildPublishedTimetableResponse(current = {}, options = {}) {
  const requestedGroup = clean(options.groupNo ?? options.classgroup ?? options.group ?? "ALL") || "ALL";
  const requestedTeacherId = clean(
    options.teacherId ?? options.adminId ?? options.assignedTeacher ?? options.teacher ?? "ALL"
  ) || "ALL";
  const viewerAdminId = clean(options.viewerAdminId);
  const viewerRole = clean(options.viewerRole).toUpperCase();
  const globalZoom = resolveGlobalZoom(options);
  const sourceSessions = Array.isArray(current.sessions) ? current.sessions : [];
  const sessions = sourceSessions.filter(session => (
    groupMatches(session.groupno, requestedGroup, options.allGroupsStudent === true) &&
    teacherMatches(session.teacherid, requestedTeacherId)
  )).map((session, index) => ({
    row: session.rowindex >= 0 ? session.rowindex + 1 : index + 2,
    sessionid: session.sourcesessionid,
    publishedsessionid: session.publishedsessionid,
    publicationid: session.publicationid,
    subjectid: session.subjectid,
    subjectname: session.subjectname,
    subjectactive: null,
    moduleid: session.moduleid,
    modulename: session.modulename,
    moduleno: "",
    moduleassigned: Boolean(session.moduleid),
    modulestatus: session.moduleid ? "assigned" : "subject-level",
    dayofweek: session.dayofweek,
    starttime: session.starttime,
    endtime: session.endtime,
    zoomlink: session.zoomlink,
    groupno: session.groupno,
    teacherid: session.teacherid,
    teachername: session.teachername,
    teacherassigned: Boolean(session.teacherid && session.teachername),
    assignmentstatus: session.teacherid && session.teachername ? "assigned" : "unassigned",
    assignedteacher: session.teacherid,
    courseid: session.courseid,
    coursename: session.coursename,
    assignmentconflict: false
  }));
  const warnings = [
    ...markAssignmentConflicts(sessions),
    ...markSubjectModuleOverlaps(sessions)
  ];

  return {
    success: true,
    sessions,
    zoomlink: globalZoom.link,
    zoomsource: globalZoom.source,
    timetablesource: PUBLISHED_TIMETABLE_SESSION_SHEET,
    liveSource: TIMETABLE_SOURCE_PUBLISHED,
    publicationid: clean(current.publication?.publicationid),
    publicationversion: Number(current.publication?.versionno) || 0,
    publisheddate: clean(current.publication?.publisheddate),
    groupno: requestedGroup,
    teacherid: requestedTeacherId,
    assignedteacher: requestedTeacherId,
    vieweradminid: viewerAdminId,
    viewerrole: viewerRole,
    teacheronly: options.teacherOnly === true,
    viewerhasassignments: Boolean(viewerAdminId) && sessions.some(session => (
      session.teacherassigned === true && normalizeMatch(session.teacherid) === normalizeMatch(viewerAdminId)
    )),
    showgrouplabels: options.showGroupLabels === true || requestedGroup.toUpperCase() === "ALL",
    warnings,
    count: sessions.length
  };
}

export function buildTimetableResponse(rows = [], options = {}) {
  const requestedGroup = clean(
    options.groupNo ?? options.classgroup ?? options.group ?? "ALL"
  ) || "ALL";
  const requestedTeacherId = clean(
    options.teacherId ?? options.adminId ?? options.assignedTeacher ?? options.teacher ?? "ALL"
  ) || "ALL";
  const viewerAdminId = clean(options.viewerAdminId);
  const viewerRole = clean(options.viewerRole).toUpperCase();
  const globalZoom = resolveGlobalZoom(options);
  const baseResponse = {
    success: true,
    sessions: [],
    zoomlink: globalZoom.link,
    zoomsource: globalZoom.source,
    timetablesource: TEACHER_TIMETABLE_SHEET_NAME,
    liveSource: TIMETABLE_SOURCE_TEACHER_ASSIGN,
    groupno: requestedGroup,
    teacherid: requestedTeacherId,
    assignedteacher: requestedTeacherId,
    vieweradminid: viewerAdminId,
    viewerrole: viewerRole,
    teacheronly: options.teacherOnly === true,
    viewerhasassignments: false,
    showgrouplabels: options.showGroupLabels === true || requestedGroup.toUpperCase() === "ALL",
    warnings: [],
    count: 0
  };

  if (!Array.isArray(rows) || rows.length < 2) {
    return baseResponse;
  }

  const headerMap = buildHeaderMap(rows[0] || []);
  const columns = {
    sessionId: findColumn(headerMap, ["SessionID", "SessionId", "Session"]),
    subjectId: findColumn(headerMap, ["SubjectID", "SubjectId"]),
    subjectName: findColumn(headerMap, ["SubjectName", "Subject"]),
    moduleId: findColumn(headerMap, ["ModuleID", "ModuleId", "Module ID"]),
    moduleName: findColumn(headerMap, ["ModuleName", "Module Name"]),
    moduleNo: findColumn(headerMap, ["ModuleNo", "ModuleNumber", "Module Number", "SortOrder", "Sort Order"]),
    day: findColumn(headerMap, ["DayofWeek", "DayOfWeek", "Day", "DayName"]),
    startTime: findColumn(headerMap, ["StartTime", "start time", "Start Time", "Time"]),
    zoomLink: findColumn(headerMap, ["ZoomLink", "Zoom Link", "ClassLink", "MeetingLink"]),
    groupNo: findColumn(headerMap, ["GroupNo", "Group", "ClassGroup", "Class Group"]),
    assignedTeacher: findColumn(headerMap, [
      "AssignedTeacher",
      "Assigned Teacher",
      "TeacherID",
      "Teacher ID",
      "AdminID",
      "Admin ID"
    ]),
    courseId: findColumn(headerMap, ["CourseID", "CourseId", "Course ID"]),
    courseName: findColumn(headerMap, ["CourseName", "Course Name", "CoureName"]),
    active: findColumn(headerMap, ["Active", "Status", "AssignmentActive"])
  };

  const requiredColumns = [
    columns.sessionId,
    columns.subjectId,
    columns.day,
    columns.startTime,
    columns.groupNo,
    columns.assignedTeacher
  ];

  if (requiredColumns.some(column => column < 0)) {
    return {
      ...baseResponse,
      success: false,
      error: "TeacherAssign sheet must include SessionID, SubjectID, DayofWeek, StartTime, GroupNo and AssignedTeacher columns"
    };
  }

  const adminMap = buildAdminMap(options.adminRows);
  const subjectMap = buildSubjectMap(options.subjectRows);
  const moduleMap = buildModuleMap(options.moduleRows);
  const sessions = [];
  const moduleWarnings = [];

  rows.slice(1).forEach((row, index) => {
    if (columns.active >= 0 && !normalizeBooleanCell(getCell(row, columns.active))) {
      return;
    }

    const sessionId = getCell(row, columns.sessionId);
    const subjectId = getCell(row, columns.subjectId);
    const dayOfWeek = getCell(row, columns.day);
    const startTime = getCell(row, columns.startTime);
    const groupNo = getCell(row, columns.groupNo);
    const teacherId = getCell(row, columns.assignedTeacher);

    if (!sessionId || !subjectId || !dayOfWeek || !startTime || !groupNo) {
      return;
    }

    if (!groupMatches(groupNo, requestedGroup, options.allGroupsStudent === true)) {
      return;
    }

    if (!teacherMatches(teacherId, requestedTeacherId)) {
      return;
    }

    const subject = subjectMap.get(normalizeMatch(subjectId));
    const teacher = adminMap.get(normalizeMatch(teacherId));
    const assignment = resolveTeacherAssignment(teacherId, teacher);
    const moduleId = getCell(row, columns.moduleId);
    const moduleAssignment = resolveModuleAssignment({
      moduleId,
      moduleName: getCell(row, columns.moduleName),
      moduleNo: getCell(row, columns.moduleNo),
      subjectId,
      module: moduleMap.get(normalizeMatch(moduleId))
    });
    const rowSubjectName = getCell(row, columns.subjectName);

    if (moduleAssignment.warning) {
      moduleWarnings.push({
        ...moduleAssignment.warning,
        sessionid: sessionId,
        row: index + 2
      });
    }

    sessions.push({
      row: index + 2,
      sessionid: sessionId,
      subjectid: subjectId,
      subjectname: clean(subject?.subjectname) || rowSubjectName || subjectId,
      subjectactive: subject ? subject.active : null,
      moduleid: moduleAssignment.moduleid,
      modulename: moduleAssignment.modulename,
      moduleno: moduleAssignment.moduleno,
      moduleassigned: moduleAssignment.moduleassigned,
      modulestatus: moduleAssignment.modulestatus,
      dayofweek: dayOfWeek,
      starttime: startTime,
      zoomlink: columns.zoomLink >= 0 ? getCell(row, columns.zoomLink) : "",
      groupno: groupNo,
      teacherid: assignment.teacherid,
      teachername: assignment.teachername,
      teacherassigned: assignment.teacherassigned,
      assignmentstatus: assignment.assignmentstatus,
      assignedteacher: assignment.teacherid,
      courseid: getCell(row, columns.courseId),
      coursename: getCell(row, columns.courseName),
      assignmentconflict: false
    });
  });

  const warnings = [
    ...moduleWarnings,
    ...markAssignmentConflicts(sessions),
    ...markSubjectModuleOverlaps(sessions)
  ];
  return {
    ...baseResponse,
    sessions,
    // TeacherAssign.ZoomLink remains session-specific. Global Join Zoom uses
    // SystemConfig, with the old TimeTable value retained as a migration-only
    // fallback until GlobalZoomLink has been saved.
    zoomlink: globalZoom.link,
    zoomsource: globalZoom.source,
    viewerhasassignments: Boolean(viewerAdminId) && sessions.some(session => {
      return session.teacherassigned === true &&
        normalizeMatch(session.teacherid) === normalizeMatch(viewerAdminId);
    }),
    warnings,
    count: sessions.length
  };
}

export async function updateTimetableZoomLinkEndpoint(request, env) {
  const auth = await requireAdminOrSenior(request, env);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const zoomlink = clean(body.zoomlink || body.zoomLink || body.link || "");

  const result = await callAppsScript(env, {
    action: "updateTimetableZoomLink",
    data: {
      zoomlink,
      updatedBy: auth.user.username || "",
      groupNo: "ALL",
      teacherId: "ALL"
    }
  });

  return json(result);
}

export async function updateTimetableZoomLinkGoogleSheetsEndpoint(request, env) {
  const auth = await requireSystemAdmin(request, env);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  let zoomlink;

  try {
    zoomlink = normalizeGlobalZoomLink(body.zoomlink || body.zoomLink || body.link || "");
  } catch (error) {
    return json({
      success: false,
      error: error && error.message ? error.message : "Invalid global Zoom link"
    }, 400);
  }

  let teacherRows;
  let adminRows;
  let subjectRows;
  let moduleRows;
  let systemConfigRows;

  try {
    [teacherRows, adminRows, subjectRows, moduleRows, systemConfigRows] = await batchReadGoogleSheetValues(env, [
      TEACHER_TIMETABLE_SHEET_RANGE,
      ADMIN_RECORDS_SHEET_RANGE,
      SUBJECT_LIST_SHEET_RANGE,
      MODULE_LIST_SHEET_RANGE,
      "SystemConfig!A:E"
    ]);
  } catch (error) {
    const missingSheet = getMissingRequiredSheetName(error);

    if (!missingSheet) {
      throw error;
    }

    return json(missingTimetableSheetResponse(missingSheet));
  }

  const audit = await prepareAdminAudit(env, auth.user);

  if (!audit.ok) {
    return json({ success: false, error: audit.error }, 503);
  }

  const saved = await upsertSystemConfigValues(
    env,
    new Map([[GLOBAL_ZOOM_LINK_KEY, zoomlink]]),
    {
      rows: systemConfigRows,
      updatedBy: audit.actor.adminid,
      updatedByName: audit.actor.adminname
    }
  );

  if (!saved.ok) {
    return json({ success: false, error: saved.error }, saved.status || 409);
  }

  await appendAdminAuditLog(env, audit, {
    action: "UPDATE",
    recordType: "SYSTEM_CONFIG",
    recordId: GLOBAL_ZOOM_LINK_KEY,
    changedFields: [GLOBAL_ZOOM_LINK_KEY]
  });

  const timetable = buildTimetableResponse(teacherRows, {
    adminRows,
    subjectRows,
    moduleRows,
    globalZoomLink: zoomlink,
    globalZoomConfigured: true,
    groupNo: "ALL",
    teacherId: "ALL",
    viewerAdminId: auth.user.adminid || "",
    viewerRole: auth.user.role || "",
    teacherOnly: false,
    showGroupLabels: true
  });

  timetable.message = "Zoom link saved";
  timetable.systemconfigzoomsaved = true;

  return json(timetable);
}

async function getTimetableRequestContext(request, env) {
  const authUser = await getAuthUser(request, env);

  if (!authUser) {
    return {
      ok: false,
      response: json({ success: false, error: "Unauthorized" }, 401)
    };
  }

  const body = await request.json();
  let groupNo = clean(body.groupNo ?? body.classgroup ?? body.group ?? "ALL") || "ALL";
  let teacherId = clean(
    body.teacherId ?? body.adminId ?? body.assignedTeacher ?? body.teacher ?? "ALL"
  ) || "ALL";
  let allGroupsStudent = false;
  const viewerRole = authUser.type === "admin"
    ? clean(authUser.role).toUpperCase()
    : "";
  const teacherViewer = authUser.type === "admin" && viewerRole === "TEACHER";

  if (authUser.type === "student") {
    const studentGroup = clean(
      authUser.classgroup === null || authUser.classgroup === undefined
        ? groupNo
        : authUser.classgroup
    ) || "ALL";

    // V100.8 boundary: only authenticated StudentRecords ClassGroup 0 is an
    // all-groups grant. TeacherAssign GroupNo 0 and AdminRecords AssignedGroup
    // 0 remain literal values.
    allGroupsStudent = studentGroup === "0";
    groupNo = allGroupsStudent ? "ALL" : studentGroup;
    teacherId = "ALL";
  }

  if (teacherViewer) {
    // V102.9.1: a TEACHER may read the complete course timetable. This does
    // not expand attendance, progress, planner or student-record scope and it
    // does not grant any timetable write permission.
    groupNo = "ALL";
    teacherId = "ALL";
  }

  // Timetable visibility is course-wide for ADMIN, SENIOR and TEACHER.
  // AdminRecords AssignedGroup never grants or restricts this read-only view.
  return {
    ok: true,
    authUser,
    groupNo,
    teacherId,
    allGroupsStudent,
    viewerAdminId: authUser.type === "admin" ? clean(authUser.adminid) : "",
    viewerRole,
    teacherOnly: false,
    showGroupLabels: teacherViewer || allGroupsStudent || (
      authUser.type === "admin" && normalizeMatch(groupNo) === "all"
    )
  };
}

function buildAdminMap(rows = []) {
  const map = new Map();

  if (!Array.isArray(rows) || rows.length < 2) {
    return map;
  }

  const headerMap = buildHeaderMap(rows[0] || []);
  const idColumn = findColumn(headerMap, ["AdminID", "Admin Id", "TeacherID"]);
  const nameColumn = findColumn(headerMap, ["Username", "AdminName", "TeacherName", "Name"]);
  const activeColumn = findColumn(headerMap, ["Active", "Status"]);

  if (idColumn < 0 || nameColumn < 0) {
    return map;
  }

  rows.slice(1).forEach(row => {
    const adminid = getCell(row, idColumn);
    if (!adminid) return;

    map.set(normalizeMatch(adminid), {
      adminid,
      username: getCell(row, nameColumn),
      active: activeColumn < 0 || normalizeBooleanCell(getCell(row, activeColumn))
    });
  });

  return map;
}

function buildSubjectMap(rows = []) {
  const map = new Map();

  if (!Array.isArray(rows) || rows.length < 2) {
    return map;
  }

  const headerMap = buildHeaderMap(rows[0] || []);
  const idColumn = findColumn(headerMap, ["SubjectID", "Subject Id"]);
  const nameColumn = findColumn(headerMap, ["SubjectName", "Subject", "Name"]);
  const activeColumn = findColumn(headerMap, ["Active", "Status"]);

  if (idColumn < 0 || nameColumn < 0) {
    return map;
  }

  rows.slice(1).forEach(row => {
    const subjectid = getCell(row, idColumn);
    if (!subjectid) return;

    map.set(normalizeMatch(subjectid), {
      subjectid,
      subjectname: getCell(row, nameColumn),
      active: activeColumn < 0 || normalizeBooleanCell(getCell(row, activeColumn))
    });
  });

  return map;
}

function buildModuleMap(rows = []) {
  const map = new Map();

  if (!Array.isArray(rows) || rows.length < 2) {
    return map;
  }

  const headerMap = buildHeaderMap(rows[0] || []);
  const idColumn = findColumn(headerMap, ["ModuleID", "Module Id"]);
  const nameColumn = findColumn(headerMap, ["ModuleName", "Module", "Name"]);
  const numberColumn = findColumn(headerMap, [
    "ModuleNo",
    "ModuleNumber",
    "Module Number",
    "SortOrder",
    "Sort Order"
  ]);
  const subjectIdColumn = findColumn(headerMap, ["SubjectID", "Subject Id"]);
  const activeColumn = findColumn(headerMap, ["Active", "Status"]);

  if (idColumn < 0 || subjectIdColumn < 0) {
    return map;
  }

  rows.slice(1).forEach(row => {
    const moduleid = getCell(row, idColumn);
    if (!moduleid) return;

    map.set(normalizeMatch(moduleid), {
      moduleid,
      modulename: getCell(row, nameColumn),
      moduleno: getCell(row, numberColumn),
      subjectid: getCell(row, subjectIdColumn),
      active: activeColumn < 0 || normalizeBooleanCell(getCell(row, activeColumn))
    });
  });

  return map;
}

function resolveModuleAssignment({ moduleId, moduleName, moduleNo, subjectId, module }) {
  const resolvedModuleId = clean(moduleId);

  if (!resolvedModuleId) {
    return {
      moduleid: "",
      modulename: "",
      moduleno: "",
      moduleassigned: false,
      modulestatus: "subject-level",
      warning: null
    };
  }

  if (!module) {
    return {
      moduleid: resolvedModuleId,
      modulename: "",
      moduleno: "",
      moduleassigned: false,
      modulestatus: "module-not-found",
      warning: {
        code: "MODULE_NOT_FOUND",
        moduleid: resolvedModuleId,
        subjectid: clean(subjectId)
      }
    };
  }

  if (module.active !== true) {
    return {
      moduleid: module.moduleid,
      modulename: "",
      moduleno: "",
      moduleassigned: false,
      modulestatus: "module-inactive",
      warning: {
        code: "MODULE_INACTIVE",
        moduleid: module.moduleid,
        subjectid: clean(subjectId)
      }
    };
  }

  if (normalizeMatch(module.subjectid) !== normalizeMatch(subjectId)) {
    return {
      moduleid: module.moduleid,
      modulename: "",
      moduleno: "",
      moduleassigned: false,
      modulestatus: "module-subject-mismatch",
      warning: {
        code: "MODULE_SUBJECT_MISMATCH",
        moduleid: module.moduleid,
        subjectid: clean(subjectId),
        modulesubjectid: module.subjectid
      }
    };
  }

  return {
    moduleid: module.moduleid,
    modulename: clean(module.modulename) || clean(moduleName),
    moduleno: clean(module.moduleno) || clean(moduleNo),
    moduleassigned: true,
    modulestatus: "assigned",
    warning: null
  };
}

function resolveTeacherAssignment(teacherId, teacher) {
  const resolvedTeacherId = clean(teacherId);

  if (!resolvedTeacherId || normalizeMatch(resolvedTeacherId) === "all") {
    return {
      teacherid: "",
      teachername: "Teacher not assigned",
      teacherassigned: false,
      assignmentstatus: "unassigned"
    };
  }

  if (!teacher) {
    return {
      teacherid: resolvedTeacherId,
      teachername: "Teacher not assigned",
      teacherassigned: false,
      assignmentstatus: "teacher-not-found"
    };
  }

  if (teacher.active !== true) {
    return {
      teacherid: resolvedTeacherId,
      teachername: "Teacher not assigned",
      teacherassigned: false,
      assignmentstatus: "teacher-inactive"
    };
  }

  return {
    teacherid: teacher.adminid,
    teachername: teacher.username || teacher.adminid,
    teacherassigned: true,
    assignmentstatus: "assigned"
  };
}

function markAssignmentConflicts(sessions) {
  const matches = new Map();

  sessions.forEach(session => {
    const logicalKey = [
      session.courseid || session.coursename,
      session.groupno,
      session.subjectid,
      session.moduleid || "__SUBJECT__",
      session.dayofweek,
      session.starttime
    ].map(normalizeMatch).join("|");

    if (!matches.has(logicalKey)) {
      matches.set(logicalKey, []);
    }

    matches.get(logicalKey).push(session);
  });

  const warnings = [];

  matches.forEach(group => {
    if (group.length < 2) return;

    group.forEach(session => {
      session.assignmentconflict = true;
    });

    warnings.push({
      code: "MULTIPLE_TEACHER_ASSIGNMENTS",
      sessionids: group.map(session => session.sessionid),
      rows: group.map(session => session.row)
    });
  });

  return warnings;
}

function markSubjectModuleOverlaps(sessions) {
  const matches = new Map();

  sessions.forEach(session => {
    const logicalKey = [
      session.courseid || session.coursename,
      session.groupno,
      session.subjectid,
      session.dayofweek,
      session.starttime
    ].map(normalizeMatch).join("|");

    if (!matches.has(logicalKey)) {
      matches.set(logicalKey, []);
    }

    matches.get(logicalKey).push(session);
  });

  const warnings = [];

  matches.forEach(group => {
    const subjectLevel = group.filter(session => !clean(session.moduleid));
    const moduleLevel = group.filter(session => clean(session.moduleid));

    if (!subjectLevel.length || !moduleLevel.length) return;

    group.forEach(session => {
      session.assignmentconflict = true;
    });

    warnings.push({
      code: "SUBJECT_MODULE_ASSIGNMENT_OVERLAP",
      sessionids: group.map(session => session.sessionid),
      rows: group.map(session => session.row)
    });
  });

  return warnings;
}

function extractGlobalZoomLink(rows = []) {
  if (!Array.isArray(rows) || rows.length < 2) {
    return "";
  }

  const headerMap = buildHeaderMap(rows[0] || []);
  const zoomLinkColumn = findColumn(
    headerMap,
    ["ZoomLink", "Zoom Link", "ClassLink", "MeetingLink"]
  );

  if (zoomLinkColumn < 0) {
    return "";
  }

  for (const row of rows.slice(1)) {
    const zoomlink = getCell(row, zoomLinkColumn);
    if (zoomlink) return zoomlink;
  }

  return "";
}

function resolveGlobalZoom(options = {}) {
  if (options.globalZoomConfigured === true) {
    return {
      link: clean(options.globalZoomLink),
      source: "SystemConfig"
    };
  }

  const legacyLink = extractGlobalZoomLink(options.legacyRows);
  return {
    link: legacyLink,
    source: legacyLink ? LEGACY_TIMETABLE_SHEET_NAME : ""
  };
}

async function readLegacyTimetableRows(env) {
  try {
    return await readGoogleSheetValues(env, LEGACY_TIMETABLE_SHEET_RANGE);
  } catch (error) {
    // The legacy sheet is only a temporary Zoom-link fallback during V100.10
    // verification. New timetable reads must not depend on its availability.
    return [];
  }
}

function missingTimetableSheetResponse(sheetName) {
  return {
    success: false,
    error: `${sheetName} sheet not found`,
    sessions: [],
    zoomlink: "",
    timetablesource: TEACHER_TIMETABLE_SHEET_NAME
  };
}

function publishedTimetableUnavailableResponse(error, code) {
  return json({
    success: false,
    error: clean(error) || "The published timetable is not ready",
    code: clean(code) || "PUBLISHED_TIMETABLE_NOT_READY",
    retryable: true,
    sessions: [],
    zoomlink: "",
    timetablesource: PUBLISHED_TIMETABLE_SESSION_SHEET,
    liveSource: TIMETABLE_SOURCE_PUBLISHED,
    fallbackUsed: false
  }, 503);
}

function inferPublishedCourseId(stateRows = []) {
  const ids = new Set((Array.isArray(stateRows) ? stateRows.slice(1) : [])
    .map(row => clean(row?.[0]))
    .filter(Boolean));
  return ids.size === 1 ? Array.from(ids)[0] : "";
}

function getMissingRequiredSheetName(error) {
  return [
    TEACHER_TIMETABLE_SHEET_NAME,
    ADMIN_RECORDS_SHEET_NAME,
    SUBJECT_LIST_SHEET_NAME,
    MODULE_LIST_SHEET_NAME
  ].find(sheetName => isMissingSheetError(error, sheetName)) || "";
}

function clean(value) {
  return String(value === null || value === undefined ? "" : value).trim();
}

function normalizeHeader(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeMatch(value) {
  return clean(value).toLowerCase().replace(/\s+/g, "");
}

function buildHeaderMap(headers) {
  return headers.reduce((map, header, index) => {
    const key = normalizeHeader(header);

    if (key && map[key] === undefined) {
      map[key] = index;
    }

    return map;
  }, {});
}

function findColumn(headerMap, possibleHeaders) {
  for (const header of possibleHeaders) {
    const key = normalizeHeader(header);

    if (headerMap[key] !== undefined) {
      return headerMap[key];
    }
  }

  return -1;
}

function getCell(row, columnIndex) {
  return columnIndex >= 0 ? clean(row[columnIndex]) : "";
}

function groupMatches(rowValue, requestedValue, allGroupsStudent) {
  if (allGroupsStudent === true) {
    return true;
  }

  const rowText = normalizeMatch(rowValue);
  const requestedText = normalizeMatch(requestedValue);

  if (!requestedText || requestedText === "all") {
    return true;
  }

  if (!rowText || rowText === "all") {
    return true;
  }

  return rowText === requestedText;
}

function teacherMatches(rowValue, requestedValue) {
  const requestedText = normalizeMatch(requestedValue);

  if (!requestedText || requestedText === "all") {
    return true;
  }

  return normalizeMatch(rowValue) === requestedText;
}

function normalizeBooleanCell(value) {
  if (value === true) return true;
  if (value === false || value === null || value === undefined) return false;

  return ["true", "yes", "1", "active"].includes(clean(value).toLowerCase());
}

function isMissingSheetError(error, sheetName) {
  const message = error && error.message ? error.message : String(error || "");
  return message.includes("Google Sheets API error 400:") &&
    message.includes("Unable to parse range") &&
    message.toLowerCase().includes(clean(sheetName).toLowerCase());
}
