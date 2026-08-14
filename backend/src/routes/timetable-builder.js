/* M4L V101.4 - audited, ADMIN-only course timetable builder. */

import {
  appendAdminAuditLog,
  columnIndexToA1,
  getRequiredRowAuditColumns,
  prepareAdminAudit,
  stampCreatedRow,
  stampModifiedRow
} from "../lib/admin-audit.js";
import { requireSystemAdmin } from "../lib/auth.js";
import {
  appendGoogleSheetValues,
  readGoogleSheetValues,
  updateGoogleSheetValues
} from "../lib/google-sheets.js";
import { json } from "../lib/http.js";
import { nextSequentialId } from "../lib/sequential-ids.js";
import {
  GLOBAL_ZOOM_LINK_KEY,
  getSystemConfigValue,
  readSystemConfigRows
} from "../lib/system-config.js";

export const COURSE_SHEET = "Courses";
export const TIME_SLOT_SHEET = "TimeSlots";
export const TIMETABLE_SESSION_SHEET = "TimetableSessions";

export const COURSE_HEADERS = Object.freeze([
  "CourseID",
  "CourseName",
  "Active",
  "CreatedDate",
  "CreatedByAdminID",
  "CreatedByAdminName",
  "ModifiedByAdminID",
  "ModifiedByAdminName",
  "ModifiedDate"
]);

export const TIME_SLOT_HEADERS = Object.freeze([
  "TimeSlotID",
  "CourseID",
  "StartTime",
  "EndTime",
  "Active",
  "CreatedDate",
  "CreatedByAdminID",
  "CreatedByAdminName",
  "ModifiedByAdminID",
  "ModifiedByAdminName",
  "ModifiedDate"
]);

export const TIMETABLE_SESSION_HEADERS = Object.freeze([
  "SessionID",
  "CourseID",
  "TimeSlotID",
  "DayOfWeek",
  "SubjectID",
  "ModuleID",
  "GroupNo",
  "TeacherID",
  "ZoomLink",
  "Active",
  "CreatedDate",
  "CreatedByAdminID",
  "CreatedByAdminName",
  "ModifiedByAdminID",
  "ModifiedByAdminName",
  "ModifiedDate"
]);

const SUBJECT_SHEET = "SubjectList";
const MODULE_SHEET = "ModuleList";
const ADMIN_SHEET = "AdminRecords";
const STUDENT_SHEET = "StudentRecords";
const FULL_RANGE = "A:ZZ";
const DAY_ORDER = Object.freeze(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);

export async function getTimetableBuilderGoogleSheetsEndpoint(request, env) {
  const permission = await requireBuilderAdmin(request, env);
  if (!permission.ok) return permission.response;

  let data;

  try {
    data = await readBuilderData(env, { includeReferences: true, includeSystemConfig: true });
  } catch (error) {
    return builderSetupResponse();
  }

  const schema = validateBuilderData(data);
  if (!schema.ok) return json({ success: false, error: schema.error }, 503);

  return json(buildBuilderResponse(data));
}

export async function saveTimetableCourseGoogleSheetsEndpoint(request, env) {
  const permission = await requireBuilderAdmin(request, env);
  if (!permission.ok) return permission.response;

  const body = await readJsonBody(request);
  const courseId = clean(body.courseid || body.courseId);
  const courseName = clean(body.courseName || body.coursename).replace(/\s+/g, " ");

  if (!courseName) {
    return json({ success: false, error: "Course name is required" }, 400);
  }

  if (courseName.length > 100) {
    return json({ success: false, error: "Course name must be 100 characters or fewer" }, 400);
  }

  let data;
  try {
    data = await readBuilderData(env);
  } catch (error) {
    return builderSetupResponse();
  }

  const schema = validateBuilderData(data);
  if (!schema.ok) return json({ success: false, error: schema.error }, 503);

  const courses = parseCourses(data.courseRows);
  const existing = courseId
    ? courses.find(course => course.courseid === courseId)
    : null;

  if (courseId && !existing) {
    return json({ success: false, error: "Course not found" }, 404);
  }

  const duplicate = courses.find(course => (
    course.courseid !== courseId && normalizeMatch(course.coursename) === normalizeMatch(courseName)
  ));

  if (duplicate) {
    return json({ success: false, duplicate: true, error: "Course name already exists" }, 409);
  }

  const active = normalizeRequestedBoolean(body.active, existing ? existing.active : true);

  if (existing && existing.active && !active) {
    const activeSlots = parseTimeSlots(data.timeSlotRows).some(slot => (
      slot.courseid === existing.courseid && slot.active
    ));
    const activeSessions = parseSessions(data.sessionRows).some(session => (
      session.courseid === existing.courseid && session.active
    ));

    if (activeSlots || activeSessions) {
      return json({
        success: false,
        error: "Deactivate this course's sessions and time slots before deactivating the course"
      }, 409);
    }
  }

  const audit = await prepareAdminAudit(env, permission.user);
  if (!audit.ok) return json({ success: false, error: audit.error }, 503);

  const rowAudit = getRequiredRowAuditColumns(COURSE_HEADERS);
  if (!rowAudit.ok) return json({ success: false, error: rowAudit.error }, 503);

  if (!existing) {
    const created = {
      courseid: nextSequentialId(data.courseRows, "COURSE"),
      coursename: courseName,
      active,
      createddate: audit.timestamp
    };
    const row = new Array(COURSE_HEADERS.length).fill("");
    row[0] = created.courseid;
    row[1] = created.coursename;
    row[2] = created.active;
    row[3] = created.createddate;
    stampCreatedRow(row, rowAudit.columns, audit.actor, audit.timestamp);

    await appendGoogleSheetValues(env, appendRange(COURSE_SHEET, row.length), [row]);
    await appendAdminAuditLog(env, audit, {
      action: "CREATE",
      recordType: "COURSE",
      recordId: created.courseid,
      changedFields: ["CourseName", "Active"]
    });

    return json({ success: true, message: "Course created", course: created });
  }

  const changedFields = [];
  if (existing.coursename !== courseName) changedFields.push("CourseName");
  if (existing.active !== active) changedFields.push("Active");

  if (changedFields.length === 0) {
    return json({ success: true, message: "No course changes requested", course: existing });
  }

  const row = copyRow(data.courseRows[existing.rowindex], COURSE_HEADERS.length);
  row[1] = courseName;
  row[2] = active;
  stampModifiedRow(row, rowAudit.columns, audit.actor, audit.timestamp);

  await updateGoogleSheetValues(
    env,
    updateRange(COURSE_SHEET, existing.rowindex + 1, row.length),
    [row]
  );
  await appendAdminAuditLog(env, audit, {
    action: "UPDATE",
    recordType: "COURSE",
    recordId: existing.courseid,
    changedFields
  });

  return json({
    success: true,
    message: "Course updated",
    course: { ...existing, coursename: courseName, active }
  });
}

export async function saveTimetableTimeSlotGoogleSheetsEndpoint(request, env) {
  const permission = await requireBuilderAdmin(request, env);
  if (!permission.ok) return permission.response;

  const body = await readJsonBody(request);
  const timeSlotId = clean(body.timeslotid || body.timeSlotId);
  const requestedCourseId = clean(body.courseid || body.courseId);
  const startTime = normalizeTime(body.startTime || body.starttime);
  const endTime = normalizeTime(body.endTime || body.endtime);

  if (!requestedCourseId) {
    return json({ success: false, error: "Course is required" }, 400);
  }

  if (!startTime || !endTime) {
    return json({ success: false, error: "Enter valid start and end times" }, 400);
  }

  if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    return json({ success: false, error: "End time must be later than start time" }, 400);
  }

  let data;
  try {
    data = await readBuilderData(env);
  } catch (error) {
    return builderSetupResponse();
  }

  const schema = validateBuilderData(data);
  if (!schema.ok) return json({ success: false, error: schema.error }, 503);

  const courses = parseCourses(data.courseRows);
  const timeSlots = parseTimeSlots(data.timeSlotRows);
  const sessions = parseSessions(data.sessionRows);
  const existing = timeSlotId
    ? timeSlots.find(slot => slot.timeslotid === timeSlotId)
    : null;

  if (timeSlotId && !existing) {
    return json({ success: false, error: "Time slot not found" }, 404);
  }

  if (existing && existing.courseid !== requestedCourseId) {
    return json({ success: false, error: "A time slot cannot be moved to another course" }, 409);
  }

  const course = courses.find(item => item.courseid === requestedCourseId);
  if (!course) return json({ success: false, error: "Course not found" }, 404);

  const active = normalizeRequestedBoolean(body.active, existing ? existing.active : true);
  if (active && !course.active) {
    return json({ success: false, error: "Activate the course before adding an active time slot" }, 409);
  }

  const duplicate = timeSlots.find(slot => (
    slot.timeslotid !== timeSlotId &&
    slot.courseid === requestedCourseId &&
    slot.starttime === startTime &&
    slot.endtime === endTime
  ));

  if (duplicate) {
    return json({ success: false, duplicate: true, error: "This course already has that time slot" }, 409);
  }

  if (existing) {
    const hasActiveSessions = sessions.some(session => (
      session.timeslotid === existing.timeslotid && session.active
    ));
    const timeChanged = existing.starttime !== startTime || existing.endtime !== endTime;

    if (hasActiveSessions && (timeChanged || !active)) {
      return json({
        success: false,
        error: "Move or deactivate this time slot's sessions before changing its times or status"
      }, 409);
    }
  }

  const audit = await prepareAdminAudit(env, permission.user);
  if (!audit.ok) return json({ success: false, error: audit.error }, 503);

  const rowAudit = getRequiredRowAuditColumns(TIME_SLOT_HEADERS);
  if (!rowAudit.ok) return json({ success: false, error: rowAudit.error }, 503);

  if (!existing) {
    const created = {
      timeslotid: nextSequentialId(data.timeSlotRows, "SLOT"),
      courseid: requestedCourseId,
      starttime: startTime,
      endtime: endTime,
      active,
      createddate: audit.timestamp
    };
    const row = new Array(TIME_SLOT_HEADERS.length).fill("");
    row[0] = created.timeslotid;
    row[1] = created.courseid;
    row[2] = created.starttime;
    row[3] = created.endtime;
    row[4] = created.active;
    row[5] = created.createddate;
    stampCreatedRow(row, rowAudit.columns, audit.actor, audit.timestamp);

    await appendGoogleSheetValues(env, appendRange(TIME_SLOT_SHEET, row.length), [row]);
    await appendAdminAuditLog(env, audit, {
      action: "CREATE",
      recordType: "TIME_SLOT",
      recordId: created.timeslotid,
      changedFields: ["CourseID", "StartTime", "EndTime", "Active"]
    });

    return json({ success: true, message: "Time slot created", timeslot: created });
  }

  const changedFields = [];
  if (existing.starttime !== startTime) changedFields.push("StartTime");
  if (existing.endtime !== endTime) changedFields.push("EndTime");
  if (existing.active !== active) changedFields.push("Active");

  if (changedFields.length === 0) {
    return json({ success: true, message: "No time slot changes requested", timeslot: existing });
  }

  const row = copyRow(data.timeSlotRows[existing.rowindex], TIME_SLOT_HEADERS.length);
  row[2] = startTime;
  row[3] = endTime;
  row[4] = active;
  stampModifiedRow(row, rowAudit.columns, audit.actor, audit.timestamp);

  await updateGoogleSheetValues(
    env,
    updateRange(TIME_SLOT_SHEET, existing.rowindex + 1, row.length),
    [row]
  );
  await appendAdminAuditLog(env, audit, {
    action: "UPDATE",
    recordType: "TIME_SLOT",
    recordId: existing.timeslotid,
    changedFields
  });

  return json({
    success: true,
    message: "Time slot updated",
    timeslot: { ...existing, starttime: startTime, endtime: endTime, active }
  });
}

export async function saveTimetableSessionGoogleSheetsEndpoint(request, env) {
  const permission = await requireBuilderAdmin(request, env);
  if (!permission.ok) return permission.response;

  const body = await readJsonBody(request);
  const sessionId = clean(body.sessionid || body.sessionId);
  const courseId = clean(body.courseid || body.courseId);
  const timeSlotId = clean(body.timeslotid || body.timeSlotId);
  const dayOfWeek = normalizeDay(body.dayofweek || body.dayOfWeek || body.day);
  const subjectId = clean(body.subjectid || body.subjectId);
  const moduleId = clean(body.moduleid || body.moduleId);
  const groupNo = normalizeGroup(body.groupno ?? body.groupNo ?? body.group);
  const teacherId = clean(body.teacherid || body.teacherId);
  let zoomLink;

  try {
    zoomLink = normalizeOptionalHttpsUrl(body.zoomlink || body.zoomLink);
  } catch (error) {
    return json({ success: false, error: error.message }, 400);
  }

  if (!courseId || !timeSlotId || !dayOfWeek || !subjectId || !groupNo || !teacherId) {
    return json({
      success: false,
      error: "Course, time slot, day, subject, group and teacher are required"
    }, 400);
  }

  let data;
  try {
    data = await readBuilderData(env, { includeReferences: true });
  } catch (error) {
    return builderSetupResponse();
  }

  const schema = validateBuilderData(data);
  if (!schema.ok) return json({ success: false, error: schema.error }, 503);

  const courses = parseCourses(data.courseRows);
  const timeSlots = parseTimeSlots(data.timeSlotRows);
  const sessions = parseSessions(data.sessionRows);
  const subjects = parseSubjects(data.subjectRows);
  const modules = parseModules(data.moduleRows);
  const teachers = parseTeachers(data.adminRows);
  const existing = sessionId
    ? sessions.find(session => session.sessionid === sessionId)
    : null;

  if (sessionId && !existing) {
    return json({ success: false, error: "Timetable session not found" }, 404);
  }

  const course = courses.find(item => item.courseid === courseId);
  const timeSlot = timeSlots.find(item => item.timeslotid === timeSlotId);
  const subject = subjects.find(item => item.subjectid === subjectId);
  const module = moduleId ? modules.find(item => item.moduleid === moduleId) : null;
  const teacher = teachers.find(item => item.teacherid === teacherId);
  const active = normalizeRequestedBoolean(body.active, existing ? existing.active : true);

  if (!course) return json({ success: false, error: "Course not found" }, 404);
  if (!timeSlot || timeSlot.courseid !== courseId) {
    return json({ success: false, error: "The selected time slot does not belong to this course" }, 409);
  }
  if (!subject) return json({ success: false, error: "Subject not found" }, 404);
  if (moduleId && (!module || module.subjectid !== subjectId)) {
    return json({ success: false, error: "The selected module does not belong to this subject" }, 409);
  }
  if (!teacher) return json({ success: false, error: "Teacher not found" }, 404);

  if (active) {
    if (!course.active) return json({ success: false, error: "Activate the course first" }, 409);
    if (!timeSlot.active) return json({ success: false, error: "Activate the time slot first" }, 409);
    if (!subject.active) return json({ success: false, error: "Activate the subject first" }, 409);
    if (module && !module.active) return json({ success: false, error: "Activate the module first" }, 409);
    if (!teacher.active) return json({ success: false, error: "Activate the teacher first" }, 409);

    const conflicts = findSessionConflicts({
      sessionId,
      courseId,
      timeSlot,
      dayOfWeek,
      groupNo,
      teacherId,
      sessions,
      timeSlots,
      courses
    });

    if (conflicts.length > 0) {
      return json({
        success: false,
        conflict: true,
        error: conflicts[0].message,
        conflicts
      }, 409);
    }
  }

  const audit = await prepareAdminAudit(env, permission.user);
  if (!audit.ok) return json({ success: false, error: audit.error }, 503);

  const rowAudit = getRequiredRowAuditColumns(TIMETABLE_SESSION_HEADERS);
  if (!rowAudit.ok) return json({ success: false, error: rowAudit.error }, 503);

  const proposed = {
    sessionid: existing ? existing.sessionid : nextSequentialId(data.sessionRows, "SESSION"),
    courseid: courseId,
    timeslotid: timeSlotId,
    dayofweek: dayOfWeek,
    subjectid: subjectId,
    moduleid: moduleId,
    groupno: groupNo,
    teacherid: teacherId,
    zoomlink: zoomLink,
    active,
    createddate: existing ? existing.createddate : audit.timestamp
  };

  if (!existing) {
    const row = sessionToRow(proposed, TIMETABLE_SESSION_HEADERS.length);
    stampCreatedRow(row, rowAudit.columns, audit.actor, audit.timestamp);

    await appendGoogleSheetValues(env, appendRange(TIMETABLE_SESSION_SHEET, row.length), [row]);
    await appendAdminAuditLog(env, audit, {
      action: "CREATE",
      recordType: "TIMETABLE_SESSION",
      recordId: proposed.sessionid,
      changedFields: [
        "CourseID", "TimeSlotID", "DayOfWeek", "SubjectID", "ModuleID",
        "GroupNo", "TeacherID", "ZoomLink", "Active"
      ]
    });

    return json({ success: true, message: "Session created", session: proposed });
  }

  const changedFields = getSessionChangedFields(existing, proposed);
  if (changedFields.length === 0) {
    return json({ success: true, message: "No session changes requested", session: existing });
  }

  const row = sessionToRow(proposed, TIMETABLE_SESSION_HEADERS.length);
  row[rowAudit.columns.createdByAdminID] = getCell(data.sessionRows[existing.rowindex], rowAudit.columns.createdByAdminID);
  row[rowAudit.columns.createdByAdminName] = getCell(data.sessionRows[existing.rowindex], rowAudit.columns.createdByAdminName);
  stampModifiedRow(row, rowAudit.columns, audit.actor, audit.timestamp);

  await updateGoogleSheetValues(
    env,
    updateRange(TIMETABLE_SESSION_SHEET, existing.rowindex + 1, row.length),
    [row]
  );
  await appendAdminAuditLog(env, audit, {
    action: "UPDATE",
    recordType: "TIMETABLE_SESSION",
    recordId: existing.sessionid,
    changedFields
  });

  return json({ success: true, message: "Session updated", session: proposed });
}

async function requireBuilderAdmin(request, env) {
  const permission = await requireSystemAdmin(request, env);
  if (!permission.ok) return permission;

  if (request.method !== "POST") {
    return { ok: false, response: json({ success: false, error: "Method not allowed" }, 405) };
  }

  return permission;
}

async function readBuilderData(env, options = {}) {
  const requests = [
    readGoogleSheetValues(env, `${COURSE_SHEET}!${FULL_RANGE}`),
    readGoogleSheetValues(env, `${TIME_SLOT_SHEET}!${FULL_RANGE}`),
    readGoogleSheetValues(env, `${TIMETABLE_SESSION_SHEET}!${FULL_RANGE}`)
  ];

  if (options.includeReferences) {
    requests.push(
      readGoogleSheetValues(env, `${SUBJECT_SHEET}!${FULL_RANGE}`),
      readGoogleSheetValues(env, `${MODULE_SHEET}!${FULL_RANGE}`),
      readGoogleSheetValues(env, `${ADMIN_SHEET}!${FULL_RANGE}`),
      readGoogleSheetValues(env, `${STUDENT_SHEET}!${FULL_RANGE}`)
    );
  }

  if (options.includeSystemConfig) {
    requests.push(readSystemConfigRows(env));
  }

  const results = await Promise.all(requests);
  let index = 0;
  const data = {
    courseRows: results[index++],
    timeSlotRows: results[index++],
    sessionRows: results[index++]
  };

  if (options.includeReferences) {
    data.subjectRows = results[index++];
    data.moduleRows = results[index++];
    data.adminRows = results[index++];
    data.studentRows = results[index++];
  }

  if (options.includeSystemConfig) {
    data.systemConfigRows = results[index++];
  }

  return data;
}

function validateBuilderData(data) {
  const checks = [
    validateExactHeaders(data.courseRows, COURSE_HEADERS, COURSE_SHEET),
    validateExactHeaders(data.timeSlotRows, TIME_SLOT_HEADERS, TIME_SLOT_SHEET),
    validateExactHeaders(data.sessionRows, TIMETABLE_SESSION_HEADERS, TIMETABLE_SESSION_SHEET)
  ];
  return checks.find(check => !check.ok) || { ok: true };
}

function validateExactHeaders(rows, expected, sheetName) {
  const actual = Array.isArray(rows?.[0]) ? rows[0].map(clean) : [];
  const valid = actual.length === expected.length && expected.every((header, index) => actual[index] === header);
  return valid
    ? { ok: true }
    : { ok: false, error: `${sheetName} must use the documented ${expected.join(", ")} headers` };
}

function buildBuilderResponse(data) {
  const courses = parseCourses(data.courseRows);
  const timeSlots = parseTimeSlots(data.timeSlotRows);
  const subjects = parseSubjects(data.subjectRows);
  const modules = parseModules(data.moduleRows);
  const teachers = parseTeachers(data.adminRows);
  const sessions = parseSessions(data.sessionRows);
  const subjectMap = new Map(subjects.map(subject => [subject.subjectid, subject]));
  const moduleMap = new Map(modules.map(module => [module.moduleid, module]));
  const teacherMap = new Map(teachers.map(teacher => [teacher.teacherid, teacher]));
  const courseMap = new Map(courses.map(course => [course.courseid, course]));
  const slotMap = new Map(timeSlots.map(slot => [slot.timeslotid, slot]));

  return {
    success: true,
    liveSource: "TeacherAssign",
    builderSource: TIMETABLE_SESSION_SHEET,
    published: false,
    days: DAY_ORDER,
    courses,
    timeslots: timeSlots,
    sessions: sessions.map(session => ({
      ...session,
      coursename: courseMap.get(session.courseid)?.coursename || session.courseid,
      starttime: slotMap.get(session.timeslotid)?.starttime || "",
      endtime: slotMap.get(session.timeslotid)?.endtime || "",
      subjectname: subjectMap.get(session.subjectid)?.subjectname || session.subjectid,
      modulename: session.moduleid
        ? moduleMap.get(session.moduleid)?.modulename || session.moduleid
        : "",
      teachername: teacherMap.get(session.teacherid)?.teachername || session.teacherid
    })),
    subjects,
    modules,
    teachers,
    groups: parseStudentGroups(data.studentRows),
    globalzoomlink: getSystemConfigValue(data.systemConfigRows, GLOBAL_ZOOM_LINK_KEY)
  };
}

function parseCourses(rows = []) {
  return rows.slice(1).map((row, index) => ({
    rowindex: index + 1,
    courseid: clean(row[0]),
    coursename: clean(row[1]),
    active: normalizeBoolean(row[2]),
    createddate: clean(row[3])
  })).filter(course => course.courseid && course.coursename).sort((left, right) => (
    Number(right.active) - Number(left.active) || left.coursename.localeCompare(right.coursename)
  ));
}

function parseTimeSlots(rows = []) {
  return rows.slice(1).map((row, index) => ({
    rowindex: index + 1,
    timeslotid: clean(row[0]),
    courseid: clean(row[1]),
    starttime: normalizeTime(row[2]),
    endtime: normalizeTime(row[3]),
    active: normalizeBoolean(row[4]),
    createddate: clean(row[5])
  })).filter(slot => slot.timeslotid && slot.courseid && slot.starttime && slot.endtime)
    .sort((left, right) => (
      left.courseid.localeCompare(right.courseid) ||
      timeToMinutes(left.starttime) - timeToMinutes(right.starttime) ||
      timeToMinutes(left.endtime) - timeToMinutes(right.endtime)
    ));
}

function parseSessions(rows = []) {
  return rows.slice(1).map((row, index) => ({
    rowindex: index + 1,
    sessionid: clean(row[0]),
    courseid: clean(row[1]),
    timeslotid: clean(row[2]),
    dayofweek: normalizeDay(row[3]),
    subjectid: clean(row[4]),
    moduleid: clean(row[5]),
    groupno: normalizeGroup(row[6]),
    teacherid: clean(row[7]),
    zoomlink: clean(row[8]),
    active: normalizeBoolean(row[9]),
    createddate: clean(row[10])
  })).filter(session => session.sessionid && session.courseid && session.timeslotid && session.dayofweek);
}

function parseSubjects(rows = []) {
  const columns = getHeaderColumns(rows[0]);
  return rows.slice(1).map(row => ({
    subjectid: getCell(row, columns.subjectid),
    subjectname: getCell(row, columns.subjectname),
    active: normalizeBoolean(getCell(row, columns.active))
  })).filter(subject => subject.subjectid && subject.subjectname).sort((left, right) => (
    Number(right.active) - Number(left.active) || left.subjectname.localeCompare(right.subjectname)
  ));
}

function parseModules(rows = []) {
  const columns = getHeaderColumns(rows[0]);
  return rows.slice(1).map(row => ({
    moduleid: getCell(row, columns.moduleid),
    modulename: getCell(row, columns.modulename),
    subjectid: getCell(row, columns.subjectid),
    subjectname: getCell(row, columns.subjectname),
    sortorder: Number(getCell(row, columns.sortorder)) || "",
    active: normalizeBoolean(getCell(row, columns.active))
  })).filter(module => module.moduleid && module.modulename && module.subjectid).sort((left, right) => (
    left.subjectid.localeCompare(right.subjectid) ||
    (Number(left.sortorder) || Number.MAX_SAFE_INTEGER) - (Number(right.sortorder) || Number.MAX_SAFE_INTEGER) ||
    left.modulename.localeCompare(right.modulename)
  ));
}

function parseTeachers(rows = []) {
  const columns = getHeaderColumns(rows[0]);
  return rows.slice(1).map(row => ({
    teacherid: getCell(row, columns.adminid),
    teachername: getCell(row, columns.username),
    role: getCell(row, columns.role).toUpperCase(),
    active: normalizeBoolean(getCell(row, columns.active))
  })).filter(teacher => teacher.teacherid && teacher.teachername).sort((left, right) => (
    Number(right.active) - Number(left.active) || left.teachername.localeCompare(right.teachername)
  ));
}

function parseStudentGroups(rows = []) {
  const columns = getHeaderColumns(rows[0]);
  const values = new Set();

  rows.slice(1).forEach(row => {
    if (!normalizeBoolean(getCell(row, columns.active))) return;
    const group = clean(getCell(row, columns.classgroup));
    if (/^[1-9]\d*$/.test(group)) values.add(group);
  });

  if (values.size === 0) ["1", "2", "3", "4"].forEach(group => values.add(group));

  return ["ALL", ...Array.from(values).sort((left, right) => Number(left) - Number(right))];
}

function findSessionConflicts(options) {
  const slotMap = new Map(options.timeSlots.map(slot => [slot.timeslotid, slot]));
  const courseMap = new Map(options.courses.map(course => [course.courseid, course]));
  const start = timeToMinutes(options.timeSlot.starttime);
  const end = timeToMinutes(options.timeSlot.endtime);
  const conflicts = [];

  options.sessions.forEach(session => {
    if (!session.active || session.sessionid === options.sessionId) return;
    if (session.dayofweek !== options.dayOfWeek) return;

    const otherSlot = slotMap.get(session.timeslotid);
    if (!otherSlot || !otherSlot.active) return;
    if (!rangesOverlap(start, end, timeToMinutes(otherSlot.starttime), timeToMinutes(otherSlot.endtime))) return;

    if (session.teacherid === options.teacherId) {
      conflicts.push({
        type: "TEACHER",
        sessionid: session.sessionid,
        message: `This teacher is already assigned to an overlapping ${courseMap.get(session.courseid)?.coursename || session.courseid} session`
      });
    }

    if (session.courseid === options.courseId && groupsOverlap(session.groupno, options.groupNo)) {
      conflicts.push({
        type: "GROUP",
        sessionid: session.sessionid,
        message: `Group ${options.groupNo} already has an overlapping session in this course`
      });
    }
  });

  return conflicts;
}

function getSessionChangedFields(existing, proposed) {
  const fields = [
    ["courseid", "CourseID"],
    ["timeslotid", "TimeSlotID"],
    ["dayofweek", "DayOfWeek"],
    ["subjectid", "SubjectID"],
    ["moduleid", "ModuleID"],
    ["groupno", "GroupNo"],
    ["teacherid", "TeacherID"],
    ["zoomlink", "ZoomLink"],
    ["active", "Active"]
  ];
  return fields.filter(([key]) => existing[key] !== proposed[key]).map(([, label]) => label);
}

function sessionToRow(session, length) {
  const row = new Array(length).fill("");
  row[0] = session.sessionid;
  row[1] = session.courseid;
  row[2] = session.timeslotid;
  row[3] = session.dayofweek;
  row[4] = session.subjectid;
  row[5] = session.moduleid;
  row[6] = session.groupno;
  row[7] = session.teacherid;
  row[8] = session.zoomlink;
  row[9] = session.active;
  row[10] = session.createddate;
  return row;
}

function getHeaderColumns(headers = []) {
  const columns = {};
  headers.forEach((header, index) => {
    columns[normalizeHeader(header)] = index;
  });
  return columns;
}

function normalizeHeader(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeDay(value) {
  const key = normalizeMatch(value).replace(/[^a-z]/g, "");
  const days = {
    mon: "Mon", monday: "Mon",
    tue: "Tue", tues: "Tue", tuesday: "Tue",
    wed: "Wed", weds: "Wed", wednesday: "Wed",
    thu: "Thu", thur: "Thu", thurs: "Thu", thursday: "Thu",
    fri: "Fri", friday: "Fri",
    sat: "Sat", saturday: "Sat",
    sun: "Sun", sunday: "Sun"
  };
  return days[key] || "";
}

function normalizeGroup(value) {
  const text = clean(value).toUpperCase();
  if (text === "ALL") return "ALL";
  return /^[1-9]\d*$/.test(text) ? String(Number(text)) : "";
}

function normalizeTime(value) {
  if (typeof value === "number" && Number.isFinite(value) && value >= 0 && value < 1) {
    return minutesToTime(Math.round(value * 24 * 60) % (24 * 60));
  }

  const text = clean(value);
  if (!text) return "";

  if (/^0?\.\d+$/.test(text)) {
    const fraction = Number(text);
    if (Number.isFinite(fraction) && fraction >= 0 && fraction < 1) {
      return minutesToTime(Math.round(fraction * 24 * 60) % (24 * 60));
    }
  }

  const match = /^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i.exec(text);
  if (!match) return "";

  let hour = Number(match[1]);
  const minute = Number(match[2]);
  const period = clean(match[3]).toUpperCase();
  if (minute > 59) return "";

  if (period) {
    if (hour < 1 || hour > 12) return "";
    if (period === "AM" && hour === 12) hour = 0;
    if (period === "PM" && hour !== 12) hour += 12;
  } else if (hour > 23) {
    return "";
  }

  return minutesToTime(hour * 60 + minute);
}

function timeToMinutes(value) {
  const normalized = normalizeTime(value);
  if (!normalized) return Number.NaN;
  const [hour, minute] = normalized.split(":").map(Number);
  return hour * 60 + minute;
}

function minutesToTime(value) {
  const minutes = Math.max(0, Number(value) || 0);
  const hour = Math.floor(minutes / 60) % 24;
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function normalizeOptionalHttpsUrl(value) {
  const text = clean(value);
  if (!text) return "";

  let url;
  try {
    url = new URL(text);
  } catch (error) {
    throw new Error("Enter a valid Zoom override URL");
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error("Zoom override must use a valid https:// URL without credentials");
  }

  return url.toString();
}

function normalizeRequestedBoolean(value, fallback) {
  if (value === undefined || value === null || value === "") return fallback === true;
  return normalizeBoolean(value);
}

function normalizeBoolean(value) {
  if (value === true || value === 1) return true;
  return new Set(["true", "yes", "1", "active"]).has(clean(value).toLowerCase());
}

function groupsOverlap(left, right) {
  return left === "ALL" || right === "ALL" || left === right;
}

function rangesOverlap(leftStart, leftEnd, rightStart, rightEnd) {
  return leftStart < rightEnd && rightStart < leftEnd;
}

function normalizeMatch(value) {
  return clean(value).toLowerCase().replace(/\s+/g, " ");
}

function getCell(row, index) {
  return Number.isInteger(index) && index >= 0 ? clean(row?.[index]) : "";
}

function copyRow(row, length) {
  const copy = Array.isArray(row) ? row.slice(0, length) : [];
  while (copy.length < length) copy.push("");
  return copy;
}

function appendRange(sheetName, length) {
  return `${sheetName}!A:${columnIndexToA1(length - 1)}`;
}

function updateRange(sheetName, rowNumber, length) {
  return `${sheetName}!A${rowNumber}:${columnIndexToA1(length - 1)}${rowNumber}`;
}

async function readJsonBody(request) {
  return request.json().catch(() => ({}));
}

function builderSetupResponse() {
  return json({
    success: false,
    error: "Timetable Builder Sheet setup is incomplete. Create Courses, TimeSlots and TimetableSessions using the V101.4 migration headers."
  }, 503);
}

function clean(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}
