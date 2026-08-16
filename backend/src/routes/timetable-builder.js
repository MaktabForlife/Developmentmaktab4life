/* M4L V102.9 - reliable group-assigned sessions, selective bulk editing,
   immutable publication snapshots and reversible live-source integration. */

import {
  appendAdminAuditLog,
  appendAdminAuditLogs,
  ADMIN_AUDIT_LOG_SHEET,
  buildAdminAuditRows,
  columnIndexToA1,
  getRequiredRowAuditColumns,
  prepareAdminAudit,
  stampCreatedRow,
  stampModifiedRow
} from "../lib/admin-audit.js";
import { requireSystemAdmin } from "../lib/auth.js";
import {
  appendGoogleSheetValues,
  batchReadGoogleSheetValues,
  batchUpdateGoogleSpreadsheet,
  isRetryableGoogleSheetsError,
  readGoogleSpreadsheetSheetProperties,
  updateGoogleSheetValues
} from "../lib/google-sheets.js";
import { json } from "../lib/http.js";
import { nextSequentialId } from "../lib/sequential-ids.js";
import {
  PUBLISHED_TIMETABLE_SESSION_HEADERS,
  PUBLISHED_TIMETABLE_SESSION_SHEET,
  TIMETABLE_PUBLICATION_HEADERS,
  TIMETABLE_PUBLICATION_SHEET,
  TIMETABLE_STATE_HEADERS,
  TIMETABLE_STATE_SHEET,
  parsePublishedTimetableSessions,
  parseTimetablePublications,
  parseTimetableStates,
  validatePublishedTimetableHeaders
} from "../lib/timetable-publication.js";
import { buildTasksResponse } from "./curriculum.js";
import {
  GLOBAL_ZOOM_LINK_KEY,
  TIMETABLE_SOURCE_PUBLISHED,
  getSystemConfigValue,
  getTimetableLiveSource
} from "../lib/system-config.js";

export const COURSE_SHEET = "Courses";
export const TIME_SLOT_SHEET = "TimeSlots";
export const TIMETABLE_SESSION_SHEET = "TimetableSessions";
export {
  PUBLISHED_TIMETABLE_SESSION_HEADERS,
  TIMETABLE_PUBLICATION_HEADERS,
  TIMETABLE_STATE_HEADERS
} from "../lib/timetable-publication.js";

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
const TASK_SHEET = "TaskList";
const FULL_RANGE = "A:ZZ";
const DAY_ORDER = Object.freeze(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
const DEVELOPMENT_STAGE = "DEVELOPMENT";
const PUBLISHED_STAGE = "PUBLISHED";

export async function getTimetableBuilderGoogleSheetsEndpoint(request, env) {
  const permission = await requireBuilderAdmin(request, env);
  if (!permission.ok) return permission.response;

  let data;

  try {
    data = await readBuilderData(env, {
      includeReferences: true,
      includeSystemConfig: true,
      includeTasks: true
    });
  } catch (error) {
    return builderDataReadErrorResponse(error);
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
    return builderDataReadErrorResponse(error);
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

  await markCourseTimetableDevelopment(env, data, existing.courseid, audit);
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
    return builderDataReadErrorResponse(error);
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

    await markCourseTimetableDevelopment(env, data, requestedCourseId, audit);
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

  await markCourseTimetableDevelopment(env, data, requestedCourseId, audit);
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
  const daySelection = normalizeDaySelection(
    body.daysofweek ?? body.days ?? body.dayofweek ?? body.dayOfWeek ?? body.day
  );
  const subjectId = clean(body.subjectid || body.subjectId);
  const moduleId = clean(body.moduleid || body.moduleId);
  const assignmentSelection = normalizeGroupAssignments(body, { subjectId, moduleId });

  if (assignmentSelection.error) return json({ success: false, error: assignmentSelection.error }, 400);

  if (daySelection.invalid.length > 0) {
    return json({ success: false, error: `Invalid day selection: ${daySelection.invalid.join(", ")}` }, 400);
  }

  const assignmentGroups = assignmentSelection.values.map(assignment => assignment.groupno);
  if (assignmentGroups.includes("ALL") && assignmentGroups.length > 1) {
    return json({ success: false, error: "Select ALL by itself, or select one or more numbered groups" }, 400);
  }

  if (sessionId && (
    daySelection.values.length !== 1 ||
    assignmentSelection.values.length !== 1
  )) {
    return json({ success: false, error: "An existing session must be modified one day and one group at a time" }, 400);
  }

  const combinationCount = daySelection.values.length * assignmentSelection.values.length;
  if (combinationCount > 100) {
    return json({ success: false, error: "Create no more than 100 day and group combinations at once" }, 400);
  }

  if (!courseId || !timeSlotId || !daySelection.values.length || !subjectId || !assignmentSelection.values.length) {
    return json({
      success: false,
      error: "Course, time slot, at least one day, subject and at least one group assignment are required"
    }, 400);
  }

  const incompleteAssignment = assignmentSelection.values.find(assignment => !assignment.teacherid);
  if (incompleteAssignment) {
    return json({
      success: false,
      error: `Select a teacher for group ${incompleteAssignment.groupno}`
    }, 400);
  }

  let data;
  try {
    data = await readBuilderData(env, { includeReferences: true });
  } catch (error) {
    return builderDataReadErrorResponse(error);
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
  const active = normalizeRequestedBoolean(body.active, existing ? existing.active : true);

  if (existing && active !== existing.active) {
    return json({
      success: false,
      error: active ? "Use Restore Session to reactivate this session" : "Use Delete Session to remove this session"
    }, 409);
  }
  if (!existing && !active) {
    return json({ success: false, error: "New sessions must be active" }, 400);
  }

  if (!course) return json({ success: false, error: "Course not found" }, 404);
  if (!timeSlot || timeSlot.courseid !== courseId) {
    return json({ success: false, error: "The selected time slot does not belong to this course" }, 409);
  }
  if (!subject) return json({ success: false, error: "Subject not found" }, 404);
  if (moduleId && (!module || module.subjectid !== subjectId)) {
    return json({ success: false, error: "The selected module does not belong to this subject" }, 409);
  }

  const validatedAssignments = [];
  for (const assignment of assignmentSelection.values) {
    const teacher = teachers.find(item => item.teacherid === assignment.teacherid);
    if (!teacher) return json({ success: false, error: `Teacher for group ${assignment.groupno} was not found` }, 404);
    if (active && !teacher.active) {
      return json({ success: false, error: `Activate ${teacher.teachername} before assigning group ${assignment.groupno}` }, 409);
    }
    validatedAssignments.push({ ...assignment, teachername: teacher.teachername });
  }

  const repeatedTeacher = findRepeatedAssignmentTeacher(validatedAssignments);
  if (repeatedTeacher) {
    return json({
      success: false,
      conflict: true,
      error: `${repeatedTeacher.teachername || repeatedTeacher.teacherid} cannot teach groups ${repeatedTeacher.groups.join(" and ")} at the same time. Select ALL only when every group is taught together.`
    }, 409);
  }

  if (active) {
    if (!course.active) return json({ success: false, error: "Activate the course first" }, 409);
    if (!timeSlot.active) return json({ success: false, error: "Activate the time slot first" }, 409);
    if (!subject.active) return json({ success: false, error: "Activate the subject first" }, 409);
    if (module && !module.active) return json({ success: false, error: "Activate the module first" }, 409);

    const conflicts = daySelection.values.flatMap(dayOfWeek => (
      validatedAssignments.flatMap(assignment => findSessionConflicts({
        sessionId,
        courseId,
        timeSlot,
        dayOfWeek,
        groupNo: assignment.groupno,
        teacherId: assignment.teacherid,
        teacherName: assignment.teachername,
        sessions,
        timeSlots,
        courses
      }))
    ));

    if (conflicts.length > 0) {
      const uniqueConflicts = deduplicateConflicts(conflicts);
      return json({
        success: false,
        conflict: true,
        error: uniqueConflicts[0].message,
        conflicts: uniqueConflicts
      }, 409);
    }
  }

  const audit = await prepareAdminAudit(env, permission.user);
  if (!audit.ok) return json({ success: false, error: audit.error }, 503);

  const rowAudit = getRequiredRowAuditColumns(TIMETABLE_SESSION_HEADERS);
  if (!rowAudit.ok) return json({ success: false, error: rowAudit.error }, 503);

  if (!existing) {
    const combinations = daySelection.values.flatMap(dayofweek => (
      validatedAssignments.map(assignment => ({ dayofweek, assignment }))
    ));
    const proposedSessions = combinations.map((combination, index) => ({
      sessionid: createTimetableId("SESSION"),
      courseid: courseId,
      timeslotid: timeSlotId,
      dayofweek: combination.dayofweek,
      subjectid: subjectId,
      moduleid: moduleId,
      groupno: combination.assignment.groupno,
      teacherid: combination.assignment.teacherid,
      zoomlink: combination.assignment.zoomlink,
      active,
      createddate: audit.timestamp
    }));
    const rows = proposedSessions.map(proposed => {
      const row = sessionToRow(proposed, TIMETABLE_SESSION_HEADERS.length);
      stampCreatedRow(row, rowAudit.columns, audit.actor, audit.timestamp);
      return row;
    });
    const auditEvents = proposedSessions.map(proposed => ({
      action: "CREATE",
      recordType: "TIMETABLE_SESSION",
      recordId: proposed.sessionid,
      changedFields: [
        "CourseID", "TimeSlotID", "DayOfWeek", "SubjectID", "ModuleID",
        "GroupNo", "TeacherID", "ZoomLink", "Active"
      ]
    }));

    await markCourseTimetableDevelopment(env, data, courseId, audit);
    await appendGoogleSheetValues(env, appendRange(TIMETABLE_SESSION_SHEET, rows[0].length), rows);
    await appendAdminAuditLogs(env, audit, auditEvents);

    return json({
      success: true,
      message: proposedSessions.length === 1
        ? "Session created"
        : `${proposedSessions.length} sessions created`,
      changed: true,
      count: proposedSessions.length,
      session: proposedSessions[0],
      sessions: proposedSessions
    });
  }

  const assignment = validatedAssignments[0];

  const proposed = {
    sessionid: existing.sessionid,
    courseid: courseId,
    timeslotid: timeSlotId,
    dayofweek: daySelection.values[0],
    subjectid: subjectId,
    moduleid: moduleId,
    groupno: assignment.groupno,
    teacherid: assignment.teacherid,
    zoomlink: assignment.zoomlink,
    active,
    createddate: existing.createddate
  };

  const changedFields = getSessionChangedFields(existing, proposed);
  if (changedFields.length === 0) {
    return json({
      success: true,
      message: "No session changes requested",
      changed: false,
      session: existing
    });
  }

  const row = sessionToRow(proposed, TIMETABLE_SESSION_HEADERS.length);
  row[rowAudit.columns.createdByAdminID] = getCell(data.sessionRows[existing.rowindex], rowAudit.columns.createdByAdminID);
  row[rowAudit.columns.createdByAdminName] = getCell(data.sessionRows[existing.rowindex], rowAudit.columns.createdByAdminName);
  stampModifiedRow(row, rowAudit.columns, audit.actor, audit.timestamp);

  await markCourseTimetableDevelopment(env, data, courseId, audit);
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

  return json({ success: true, message: "Session updated", changed: true, session: proposed });
}

export async function bulkUpdateTimetableSessionsGoogleSheetsEndpoint(request, env) {
  const permission = await requireBuilderAdmin(request, env);
  if (!permission.ok) return permission.response;

  const body = await readJsonBody(request);
  const courseId = clean(body.courseid || body.courseId);
  const sessionSelection = normalizeUniqueIdSelection(body.sessionids || body.sessionIds);
  const applySubjectModule = body.applysubjectmodule === true || body.applySubjectModule === true;
  const applyTeacher = body.applyteacher === true || body.applyTeacher === true;
  const applyZoom = body.applyzoom === true || body.applyZoom === true;
  const subjectId = clean(body.subjectid || body.subjectId);
  const moduleId = clean(body.moduleid || body.moduleId);
  const teacherId = clean(body.teacherid || body.teacherId);
  let zoomLink = "";

  if (!courseId) return json({ success: false, error: "Course is required" }, 400);
  if (sessionSelection.invalid || sessionSelection.values.length < 2) {
    return json({ success: false, error: "Select at least two different timetable sessions" }, 400);
  }
  if (sessionSelection.values.length > 100) {
    return json({ success: false, error: "Edit no more than 100 sessions at once" }, 400);
  }
  if (!applySubjectModule && !applyTeacher && !applyZoom) {
    return json({ success: false, error: "Choose at least one field to change" }, 400);
  }
  if (applySubjectModule && !subjectId) {
    return json({ success: false, error: "Select the subject to apply" }, 400);
  }
  if (applyTeacher && !teacherId) {
    return json({ success: false, error: "Select the teacher to apply" }, 400);
  }
  if (applyZoom) {
    try {
      zoomLink = normalizeOptionalHttpsUrl(body.zoomlink ?? body.zoomLink);
    } catch (error) {
      return json({ success: false, error: error.message }, 400);
    }
  }

  let data;
  try {
    data = await readBuilderData(env, { includeReferences: true });
  } catch (error) {
    return builderDataReadErrorResponse(error);
  }

  const schema = validateBuilderData(data);
  if (!schema.ok) return json({ success: false, error: schema.error }, 503);

  const courses = parseCourses(data.courseRows);
  const timeSlots = parseTimeSlots(data.timeSlotRows);
  const sessions = parseSessions(data.sessionRows);
  const subjects = parseSubjects(data.subjectRows);
  const modules = parseModules(data.moduleRows);
  const teachers = parseTeachers(data.adminRows);
  const selectedIdSet = new Set(sessionSelection.values);
  const selectedSessions = sessions.filter(session => selectedIdSet.has(session.sessionid));

  if (selectedSessions.length !== sessionSelection.values.length) {
    return json({
      success: false,
      error: "One or more selected sessions no longer exist. Reload the builder and select them again."
    }, 409);
  }
  if (selectedSessions.some(session => session.courseid !== courseId)) {
    return json({ success: false, error: "Every selected session must belong to the current course" }, 409);
  }
  if (selectedSessions.some(session => !session.active)) {
    return json({ success: false, error: "Inactive sessions must be restored before bulk editing" }, 409);
  }

  const course = courses.find(item => item.courseid === courseId);
  if (!course?.active) return json({ success: false, error: "Activate the course before editing its sessions" }, 409);

  const proposedSessions = selectedSessions.map(session => ({
    ...session,
    subjectid: applySubjectModule ? subjectId : session.subjectid,
    moduleid: applySubjectModule ? moduleId : session.moduleid,
    teacherid: applyTeacher ? teacherId : session.teacherid,
    zoomlink: applyZoom ? zoomLink : session.zoomlink
  }));

  for (const proposed of proposedSessions) {
    const timeSlot = timeSlots.find(item => item.timeslotid === proposed.timeslotid);
    const subject = subjects.find(item => item.subjectid === proposed.subjectid);
    const module = proposed.moduleid ? modules.find(item => item.moduleid === proposed.moduleid) : null;
    const teacher = teachers.find(item => item.teacherid === proposed.teacherid);

    if (!timeSlot || timeSlot.courseid !== courseId || !timeSlot.active) {
      return json({ success: false, error: `Session ${proposed.sessionid} has an inactive or missing time slot` }, 409);
    }
    if (!subject?.active) {
      return json({ success: false, error: `Session ${proposed.sessionid} has an inactive or missing subject` }, 409);
    }
    if (proposed.moduleid && (!module || module.subjectid !== proposed.subjectid || !module.active)) {
      return json({
        success: false,
        error: `The module selected for session ${proposed.sessionid} is inactive, missing or belongs to another subject`
      }, 409);
    }
    if (!teacher?.active) {
      return json({ success: false, error: `Session ${proposed.sessionid} has an inactive or missing teacher` }, 409);
    }
  }

  const proposedById = new Map(proposedSessions.map(session => [session.sessionid, session]));
  const proposedUniverse = sessions.map(session => proposedById.get(session.sessionid) || session);
  const conflicts = proposedSessions.flatMap(session => {
    const timeSlot = timeSlots.find(item => item.timeslotid === session.timeslotid);
    const teacher = teachers.find(item => item.teacherid === session.teacherid);
    return findSessionConflicts({
      sessionId: session.sessionid,
      courseId,
      timeSlot,
      dayOfWeek: session.dayofweek,
      groupNo: session.groupno,
      teacherId: session.teacherid,
      teacherName: teacher?.teachername || session.teacherid,
      sessions: proposedUniverse,
      timeSlots,
      courses
    });
  });

  if (conflicts.length > 0) {
    const uniqueConflicts = deduplicateConflicts(conflicts);
    return json({
      success: false,
      conflict: true,
      error: uniqueConflicts[0].message,
      conflicts: uniqueConflicts
    }, 409);
  }

  const changed = proposedSessions.map(proposed => {
    const existing = selectedSessions.find(session => session.sessionid === proposed.sessionid);
    return {
      existing,
      proposed,
      changedFields: getSessionChangedFields(existing, proposed)
    };
  }).filter(item => item.changedFields.length > 0);

  if (changed.length === 0) {
    return json({
      success: true,
      message: "The selected sessions already use those values",
      changed: false,
      count: 0,
      selectedcount: selectedSessions.length,
      sessions: []
    });
  }

  const audit = await prepareAdminAudit(env, permission.user);
  if (!audit.ok) return json({ success: false, error: audit.error }, 503);
  const rowAudit = getRequiredRowAuditColumns(TIMETABLE_SESSION_HEADERS);
  if (!rowAudit.ok) return json({ success: false, error: rowAudit.error }, 503);

  const sheetIds = await getRequiredSheetIds(env, [
    TIMETABLE_SESSION_SHEET,
    TIMETABLE_STATE_SHEET,
    ADMIN_AUDIT_LOG_SHEET
  ]);
  const requests = changed.map(item => {
    const row = copyRow(data.sessionRows[item.existing.rowindex], TIMETABLE_SESSION_HEADERS.length);
    row[4] = item.proposed.subjectid;
    row[5] = item.proposed.moduleid;
    row[7] = item.proposed.teacherid;
    row[8] = item.proposed.zoomlink;
    stampModifiedRow(row, rowAudit.columns, audit.actor, audit.timestamp);
    return buildUpdateCellsRequest(
      sheetIds.get(TIMETABLE_SESSION_SHEET),
      item.existing.rowindex,
      row
    );
  });
  const auditEvents = changed.map(item => ({
    action: "BULK_UPDATE",
    recordType: "TIMETABLE_SESSION",
    recordId: item.proposed.sessionid,
    changedFields: item.changedFields
  }));
  const developmentMutation = buildCourseDevelopmentMutation(
    data,
    courseId,
    audit,
    sheetIds.get(TIMETABLE_STATE_SHEET)
  );
  if (developmentMutation.request) requests.push(developmentMutation.request);
  if (developmentMutation.auditEvent) auditEvents.push(developmentMutation.auditEvent);
  requests.push(buildAppendCellsRequest(
    sheetIds.get(ADMIN_AUDIT_LOG_SHEET),
    buildAdminAuditRows(audit, auditEvents)
  ));

  await batchUpdateGoogleSpreadsheet(env, requests);

  return json({
    success: true,
    message: `${changed.length} selected sessions updated`,
    changed: true,
    count: changed.length,
    selectedcount: selectedSessions.length,
    sessions: changed.map(item => item.proposed),
    changedfields: Array.from(new Set(changed.flatMap(item => item.changedFields))).sort(),
    stage: DEVELOPMENT_STAGE
  });
}

export async function deleteTimetableSessionGoogleSheetsEndpoint(request, env) {
  const permission = await requireBuilderAdmin(request, env);
  if (!permission.ok) return permission.response;

  const body = await readJsonBody(request);
  const sessionId = clean(body.sessionid || body.sessionId);
  if (!sessionId) return json({ success: false, error: "Session ID is required" }, 400);

  let data;
  try {
    data = await readBuilderData(env, { includeReferences: true });
  } catch (error) {
    return builderDataReadErrorResponse(error);
  }

  const schema = validateBuilderData(data);
  if (!schema.ok) return json({ success: false, error: schema.error }, 503);

  const sessions = parseSessions(data.sessionRows);
  const session = sessions.find(item => item.sessionid === sessionId);
  if (!session) return json({ success: false, error: "Timetable session not found" }, 404);

  const state = getCourseTimetableState(data, session.courseid);
  const everPublished = hasSessionEverBeenPublished(data, sessionId);
  const requestedMode = clean(body.mode).toUpperCase();
  if (requestedMode && !new Set(["HARD", "SOFT"]).has(requestedMode)) {
    return json({ success: false, error: "Deletion mode must be HARD or SOFT" }, 400);
  }
  const mode = requestedMode || (state.stage === DEVELOPMENT_STAGE && !everPublished ? "HARD" : "SOFT");

  if (mode === "HARD" && (state.stage !== DEVELOPMENT_STAGE || everPublished)) {
    return json({
      success: false,
      error: "This session has been published and can only be soft-deleted",
      deletionmode: "SOFT"
    }, 409);
  }

  const audit = await prepareAdminAudit(env, permission.user);
  if (!audit.ok) return json({ success: false, error: audit.error }, 503);

  if (mode === "HARD") {
    await hardDeleteTimetableSession(env, session, audit);
    return json({
      success: true,
      message: "Draft session permanently deleted",
      changed: true,
      deletionmode: "HARD",
      sessionid: sessionId
    });
  }

  if (!session.active) {
    return json({
      success: true,
      message: "Session is already inactive",
      changed: false,
      deletionmode: "SOFT",
      session
    });
  }

  const rowAudit = getRequiredRowAuditColumns(TIMETABLE_SESSION_HEADERS);
  if (!rowAudit.ok) return json({ success: false, error: rowAudit.error }, 503);
  const row = copyRow(data.sessionRows[session.rowindex], TIMETABLE_SESSION_HEADERS.length);
  row[9] = false;
  stampModifiedRow(row, rowAudit.columns, audit.actor, audit.timestamp);

  await markCourseTimetableDevelopment(env, data, session.courseid, audit);
  await updateGoogleSheetValues(env, updateRange(TIMETABLE_SESSION_SHEET, session.rowindex + 1, row.length), [row]);
  await appendAdminAuditLog(env, audit, {
    action: "DEACTIVATE",
    recordType: "TIMETABLE_SESSION",
    recordId: sessionId,
    changedFields: ["Active"]
  });

  return json({
    success: true,
    message: "Published session removed from the development timetable",
    changed: true,
    deletionmode: "SOFT",
    session: { ...session, active: false }
  });
}

export async function restoreTimetableSessionGoogleSheetsEndpoint(request, env) {
  const permission = await requireBuilderAdmin(request, env);
  if (!permission.ok) return permission.response;

  const body = await readJsonBody(request);
  const sessionId = clean(body.sessionid || body.sessionId);
  if (!sessionId) return json({ success: false, error: "Session ID is required" }, 400);

  let data;
  try {
    data = await readBuilderData(env, { includeReferences: true });
  } catch (error) {
    return builderDataReadErrorResponse(error);
  }

  const schema = validateBuilderData(data);
  if (!schema.ok) return json({ success: false, error: schema.error }, 503);

  const sessions = parseSessions(data.sessionRows);
  const session = sessions.find(item => item.sessionid === sessionId);
  if (!session) return json({ success: false, error: "Timetable session not found" }, 404);
  if (session.active) {
    return json({
      success: true,
      message: "Session is already active",
      changed: false,
      session
    });
  }

  const courses = parseCourses(data.courseRows);
  const timeSlots = parseTimeSlots(data.timeSlotRows);
  const subjects = parseSubjects(data.subjectRows);
  const modules = parseModules(data.moduleRows);
  const teachers = parseTeachers(data.adminRows);
  const course = courses.find(item => item.courseid === session.courseid);
  const timeSlot = timeSlots.find(item => item.timeslotid === session.timeslotid);
  const subject = subjects.find(item => item.subjectid === session.subjectid);
  const module = session.moduleid ? modules.find(item => item.moduleid === session.moduleid) : null;
  const teacher = teachers.find(item => item.teacherid === session.teacherid);

  if (!course?.active || !timeSlot?.active || !subject?.active || (session.moduleid && !module?.active) || !teacher?.active) {
    return json({ success: false, error: "Activate the session's course, time slot, subject, module and teacher before restoring it" }, 409);
  }

  const conflicts = findSessionConflicts({
    sessionId,
    courseId: session.courseid,
    timeSlot,
    dayOfWeek: session.dayofweek,
    groupNo: session.groupno,
    teacherId: session.teacherid,
    teacherName: teacher.teachername,
    sessions,
    timeSlots,
    courses
  });
  if (conflicts.length) {
    const uniqueConflicts = deduplicateConflicts(conflicts);
    return json({ success: false, conflict: true, error: uniqueConflicts[0].message, conflicts: uniqueConflicts }, 409);
  }

  const audit = await prepareAdminAudit(env, permission.user);
  if (!audit.ok) return json({ success: false, error: audit.error }, 503);
  const rowAudit = getRequiredRowAuditColumns(TIMETABLE_SESSION_HEADERS);
  if (!rowAudit.ok) return json({ success: false, error: rowAudit.error }, 503);
  const row = copyRow(data.sessionRows[session.rowindex], TIMETABLE_SESSION_HEADERS.length);
  row[9] = true;
  stampModifiedRow(row, rowAudit.columns, audit.actor, audit.timestamp);

  await markCourseTimetableDevelopment(env, data, session.courseid, audit);
  await updateGoogleSheetValues(env, updateRange(TIMETABLE_SESSION_SHEET, session.rowindex + 1, row.length), [row]);
  await appendAdminAuditLog(env, audit, {
    action: "RESTORE",
    recordType: "TIMETABLE_SESSION",
    recordId: sessionId,
    changedFields: ["Active"]
  });

  return json({
    success: true,
    message: "Session restored to the development timetable",
    changed: true,
    session: { ...session, active: true }
  });
}

export async function publishTimetableGoogleSheetsEndpoint(request, env) {
  const permission = await requireBuilderAdmin(request, env);
  if (!permission.ok) return permission.response;

  const body = await readJsonBody(request);
  const courseId = clean(body.courseid || body.courseId);
  if (!courseId) return json({ success: false, error: "Course is required" }, 400);

  let data;
  try {
    data = await readBuilderData(env, {
      includeReferences: true,
      includeSystemConfig: true
    });
  } catch (error) {
    return builderDataReadErrorResponse(error);
  }

  const schema = validateBuilderData(data);
  if (!schema.ok) return json({ success: false, error: schema.error }, 503);

  const publishSchema = validatePublishedTimetableHeaders(data.publishedSessionRows, {
    allowLegacy: false,
    requireCurrent: true
  });
  if (!publishSchema.ok) {
    return json({
      success: false,
      code: "PUBLISHED_TIMETABLE_SCHEMA_NOT_READY",
      error: "Before publishing, add the documented immutable display headers in PublishedTimetableSessions O1:T1"
    }, 503);
  }

  const courses = parseCourses(data.courseRows);
  const timeSlots = parseTimeSlots(data.timeSlotRows);
  const sessions = parseSessions(data.sessionRows);
  const subjects = parseSubjects(data.subjectRows);
  const modules = parseModules(data.moduleRows);
  const teachers = parseTeachers(data.adminRows);
  const course = courses.find(item => item.courseid === courseId);
  const activeSessions = sessions.filter(session => session.courseid === courseId && session.active);

  if (!course?.active) return json({ success: false, error: "Activate the course before publishing" }, 409);
  if (!activeSessions.length) return json({ success: false, error: "Add at least one active session before publishing" }, 409);

  for (const session of activeSessions) {
    const slot = timeSlots.find(item => item.timeslotid === session.timeslotid);
    const subject = subjects.find(item => item.subjectid === session.subjectid);
    const module = session.moduleid ? modules.find(item => item.moduleid === session.moduleid) : null;
    const teacher = teachers.find(item => item.teacherid === session.teacherid);
    if (!slot?.active || !subject?.active || (session.moduleid && !module?.active) || !teacher?.active) {
      return json({ success: false, error: `Session ${session.sessionid} has an inactive or missing time slot, subject, module or teacher` }, 409);
    }
  }

  const publicationConflicts = activeSessions.flatMap(session => {
    const timeSlot = timeSlots.find(item => item.timeslotid === session.timeslotid);
    const teacher = teachers.find(item => item.teacherid === session.teacherid);
    return findSessionConflicts({
      sessionId: session.sessionid,
      courseId,
      timeSlot,
      dayOfWeek: session.dayofweek,
      groupNo: session.groupno,
      teacherId: session.teacherid,
      teacherName: teacher?.teachername || session.teacherid,
      sessions,
      timeSlots,
      courses
    });
  });
  if (publicationConflicts.length) {
    const uniqueConflicts = deduplicateConflicts(publicationConflicts);
    return json({ success: false, conflict: true, error: uniqueConflicts[0].message, conflicts: uniqueConflicts }, 409);
  }

  const audit = await prepareAdminAudit(env, permission.user);
  if (!audit.ok) return json({ success: false, error: audit.error }, 503);

  const publications = parseTimetablePublications(data.publicationRows);
  const versionno = publications
    .filter(item => item.courseid === courseId)
    .reduce((maximum, item) => Math.max(maximum, item.versionno), 0) + 1;
  const publicationid = createTimetableId("PUBLICATION");
  await writePublishedTimetableSnapshot(env, data, {
    publicationid,
    courseid: courseId,
    versionno,
    sessions: activeSessions,
    audit
  });

  return json({
    success: true,
    message: `Timetable version ${versionno} published in the builder`,
    publication: { publicationid, courseid: courseId, versionno, sessioncount: activeSessions.length, stage: PUBLISHED_STAGE },
    liveSource: getTimetableLiveSource(data.systemConfigRows || []),
    publicationBecomesLive: getTimetableLiveSource(data.systemConfigRows || []) === TIMETABLE_SOURCE_PUBLISHED
  });
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
  const ranges = [
    `${COURSE_SHEET}!${FULL_RANGE}`,
    `${TIME_SLOT_SHEET}!${FULL_RANGE}`,
    `${TIMETABLE_SESSION_SHEET}!${FULL_RANGE}`,
    `${TIMETABLE_STATE_SHEET}!${FULL_RANGE}`,
    `${TIMETABLE_PUBLICATION_SHEET}!${FULL_RANGE}`,
    `${PUBLISHED_TIMETABLE_SESSION_SHEET}!${FULL_RANGE}`
  ];

  if (options.includeReferences) {
    ranges.push(
      `${SUBJECT_SHEET}!${FULL_RANGE}`,
      `${MODULE_SHEET}!${FULL_RANGE}`,
      `${ADMIN_SHEET}!${FULL_RANGE}`,
      `${STUDENT_SHEET}!${FULL_RANGE}`
    );
  }

  if (options.includeSystemConfig) {
    ranges.push("SystemConfig!A:E");
  }

  if (options.includeTasks) {
    ranges.push(`${TASK_SHEET}!${FULL_RANGE}`);
  }

  const results = await batchReadGoogleSheetValues(env, ranges);
  let index = 0;
  const data = {
    courseRows: results[index++],
    timeSlotRows: results[index++],
    sessionRows: results[index++],
    stateRows: results[index++],
    publicationRows: results[index++],
    publishedSessionRows: results[index++]
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

  if (options.includeTasks) {
    data.taskRows = results[index++];
  }

  return data;
}

function validateBuilderData(data) {
  const checks = [
    validateExactHeaders(data.courseRows, COURSE_HEADERS, COURSE_SHEET),
    validateExactHeaders(data.timeSlotRows, TIME_SLOT_HEADERS, TIME_SLOT_SHEET),
    validateExactHeaders(data.sessionRows, TIMETABLE_SESSION_HEADERS, TIMETABLE_SESSION_SHEET),
    validateExactHeaders(data.stateRows, TIMETABLE_STATE_HEADERS, TIMETABLE_STATE_SHEET),
    validateExactHeaders(data.publicationRows, TIMETABLE_PUBLICATION_HEADERS, TIMETABLE_PUBLICATION_SHEET),
    validatePublishedTimetableHeaders(data.publishedSessionRows, { allowLegacy: true })
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
  const states = parseTimetableStates(data.stateRows);
  const publications = parseTimetablePublications(data.publicationRows);
  const publishedSessions = parsePublishedTimetableSessions(data.publishedSessionRows);
  const liveSource = getTimetableLiveSource(data.systemConfigRows || []);
  const snapshotSchema = validatePublishedTimetableHeaders(data.publishedSessionRows, { allowLegacy: true });
  const publishedSourceIds = new Set(publishedSessions.map(session => session.sourcesessionid));
  const subjectMap = new Map(subjects.map(subject => [subject.subjectid, subject]));
  const moduleMap = new Map(modules.map(module => [module.moduleid, module]));
  const teacherMap = new Map(teachers.map(teacher => [teacher.teacherid, teacher]));
  const courseMap = new Map(courses.map(course => [course.courseid, course]));
  const slotMap = new Map(timeSlots.map(slot => [slot.timeslotid, slot]));
  const stateMap = new Map(states.map(state => [state.courseid, state]));
  const publicationMap = new Map(publications.map(publication => [publication.publicationid, publication]));

  return {
    success: true,
    liveSource,
    publishedSnapshotSchemaReady: snapshotSchema.current === true,
    builderSource: TIMETABLE_SESSION_SHEET,
    publishedSnapshotSource: PUBLISHED_TIMETABLE_SESSION_SHEET,
    published: states.some(state => state.stage === PUBLISHED_STAGE),
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
      teachername: teacherMap.get(session.teacherid)?.teachername || session.teacherid,
      everpublished: publishedSourceIds.has(session.sessionid)
    })),
    timetablestates: courses.map(course => {
      const state = stateMap.get(course.courseid);
      const publication = state?.currentpublicationid
        ? publicationMap.get(state.currentpublicationid)
        : null;
      return {
        courseid: course.courseid,
        stage: state?.stage || DEVELOPMENT_STAGE,
        currentpublicationid: state?.currentpublicationid || "",
        versionno: publication?.versionno || 0,
        publisheddate: publication?.publisheddate || "",
        publishedbyadminname: publication?.publishedbyadminname || ""
      };
    }),
    publications,
    subjects,
    modules,
    tasks: buildTasksResponse(data.taskRows || [], { subjectid: "ALL" }).tasks,
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

function normalizeTimetableStage(value) {
  return clean(value).toUpperCase() === PUBLISHED_STAGE ? PUBLISHED_STAGE : DEVELOPMENT_STAGE;
}

function getCourseTimetableState(data, courseId) {
  return parseTimetableStates(data.stateRows).find(state => state.courseid === courseId) || {
    courseid: courseId,
    stage: DEVELOPMENT_STAGE,
    currentpublicationid: "",
    rowindex: -1
  };
}

function hasSessionEverBeenPublished(data, sessionId) {
  return parsePublishedTimetableSessions(data.publishedSessionRows)
    .some(session => session.sourcesessionid === sessionId);
}

function createTimetableId(prefix) {
  const randomId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 14)}`;
  return `${clean(prefix).toUpperCase()}-${randomId}`;
}

async function markCourseTimetableDevelopment(env, data, courseId, audit) {
  const state = getCourseTimetableState(data, courseId);
  if (state.rowindex >= 0 && state.stage === DEVELOPMENT_STAGE) return;

  const rowAudit = getRequiredRowAuditColumns(TIMETABLE_STATE_HEADERS);
  if (!rowAudit.ok) throw new Error(rowAudit.error);

  if (state.rowindex < 0) {
    const row = new Array(TIMETABLE_STATE_HEADERS.length).fill("");
    row[0] = courseId;
    row[1] = DEVELOPMENT_STAGE;
    row[2] = "";
    stampCreatedRow(row, rowAudit.columns, audit.actor, audit.timestamp);
    await appendGoogleSheetValues(env, appendRange(TIMETABLE_STATE_SHEET, row.length), [row]);
    await appendAdminAuditLog(env, audit, {
      action: "CREATE",
      recordType: "TIMETABLE_COURSE_STATE",
      recordId: courseId,
      changedFields: ["Stage"]
    });
    return;
  }

  const row = copyRow(data.stateRows[state.rowindex], TIMETABLE_STATE_HEADERS.length);
  row[1] = DEVELOPMENT_STAGE;
  stampModifiedRow(row, rowAudit.columns, audit.actor, audit.timestamp);
  await updateGoogleSheetValues(
    env,
    updateRange(TIMETABLE_STATE_SHEET, state.rowindex + 1, row.length),
    [row]
  );
  await appendAdminAuditLog(env, audit, {
    action: "UPDATE",
    recordType: "TIMETABLE_COURSE_STATE",
    recordId: courseId,
    changedFields: ["Stage"]
  });
}

function buildCourseDevelopmentMutation(data, courseId, audit, stateSheetId) {
  const state = getCourseTimetableState(data, courseId);
  if (state.rowindex >= 0 && state.stage === DEVELOPMENT_STAGE) {
    return { request: null, auditEvent: null };
  }

  const rowAudit = getRequiredRowAuditColumns(TIMETABLE_STATE_HEADERS);
  if (!rowAudit.ok) throw new Error(rowAudit.error);

  if (state.rowindex < 0) {
    const row = new Array(TIMETABLE_STATE_HEADERS.length).fill("");
    row[0] = courseId;
    row[1] = DEVELOPMENT_STAGE;
    row[2] = "";
    stampCreatedRow(row, rowAudit.columns, audit.actor, audit.timestamp);
    return {
      request: buildAppendCellsRequest(stateSheetId, [row]),
      auditEvent: {
        action: "CREATE",
        recordType: "TIMETABLE_COURSE_STATE",
        recordId: courseId,
        changedFields: ["Stage"]
      }
    };
  }

  const row = copyRow(data.stateRows[state.rowindex], TIMETABLE_STATE_HEADERS.length);
  row[1] = DEVELOPMENT_STAGE;
  stampModifiedRow(row, rowAudit.columns, audit.actor, audit.timestamp);
  return {
    request: buildUpdateCellsRequest(stateSheetId, state.rowindex, row),
    auditEvent: {
      action: "UPDATE",
      recordType: "TIMETABLE_COURSE_STATE",
      recordId: courseId,
      changedFields: ["Stage"]
    }
  };
}

async function hardDeleteTimetableSession(env, session, audit) {
  const sheetIds = await getRequiredSheetIds(env, [TIMETABLE_SESSION_SHEET, ADMIN_AUDIT_LOG_SHEET]);
  const auditRows = buildAdminAuditRows(audit, [{
    action: "HARD_DELETE",
    recordType: "TIMETABLE_SESSION",
    recordId: session.sessionid,
    changedFields: TIMETABLE_SESSION_HEADERS
  }]);

  await batchUpdateGoogleSpreadsheet(env, [
    buildAppendCellsRequest(sheetIds.get(ADMIN_AUDIT_LOG_SHEET), auditRows),
    {
      deleteDimension: {
        range: {
          sheetId: sheetIds.get(TIMETABLE_SESSION_SHEET),
          dimension: "ROWS",
          startIndex: session.rowindex,
          endIndex: session.rowindex + 1
        }
      }
    }
  ]);
}

async function writePublishedTimetableSnapshot(env, data, options) {
  const requiredSheets = [
    TIMETABLE_STATE_SHEET,
    TIMETABLE_PUBLICATION_SHEET,
    PUBLISHED_TIMETABLE_SESSION_SHEET,
    ADMIN_AUDIT_LOG_SHEET
  ];
  const sheetIds = await getRequiredSheetIds(env, requiredSheets);
  const { audit, publicationid, courseid, versionno, sessions } = options;
  const courseMap = new Map(parseCourses(data.courseRows).map(course => [course.courseid, course]));
  const timeSlotMap = new Map(parseTimeSlots(data.timeSlotRows).map(slot => [slot.timeslotid, slot]));
  const subjectMap = new Map(parseSubjects(data.subjectRows).map(subject => [subject.subjectid, subject]));
  const moduleMap = new Map(parseModules(data.moduleRows).map(module => [module.moduleid, module]));
  const teacherMap = new Map(parseTeachers(data.adminRows).map(teacher => [teacher.teacherid, teacher]));
  const course = courseMap.get(courseid);
  const publicationRow = [
    publicationid,
    courseid,
    versionno,
    audit.timestamp,
    audit.actor.adminid,
    audit.actor.adminname,
    sessions.length
  ];
  const snapshotRows = sessions.map(session => {
    const slot = timeSlotMap.get(session.timeslotid);
    const subject = subjectMap.get(session.subjectid);
    const module = session.moduleid ? moduleMap.get(session.moduleid) : null;
    const teacher = teacherMap.get(session.teacherid);
    return [
      createTimetableId("PUBLISHED-SESSION"),
      publicationid,
      session.sessionid,
      courseid,
      session.timeslotid,
      session.dayofweek,
      session.subjectid,
      session.moduleid,
      session.groupno,
      session.teacherid,
      session.zoomlink,
      audit.timestamp,
      audit.actor.adminid,
      audit.actor.adminname,
      course?.coursename || courseid,
      slot?.starttime || "",
      slot?.endtime || "",
      subject?.subjectname || session.subjectid,
      module?.modulename || "",
      teacher?.teachername || session.teacherid
    ];
  });
  const state = getCourseTimetableState(data, courseid);
  const rowAudit = getRequiredRowAuditColumns(TIMETABLE_STATE_HEADERS);
  if (!rowAudit.ok) throw new Error(rowAudit.error);
  let stateRow;
  let stateRequest;

  if (state.rowindex < 0) {
    stateRow = new Array(TIMETABLE_STATE_HEADERS.length).fill("");
    stateRow[0] = courseid;
    stateRow[1] = PUBLISHED_STAGE;
    stateRow[2] = publicationid;
    stampCreatedRow(stateRow, rowAudit.columns, audit.actor, audit.timestamp);
    stateRequest = buildAppendCellsRequest(sheetIds.get(TIMETABLE_STATE_SHEET), [stateRow]);
  } else {
    stateRow = copyRow(data.stateRows[state.rowindex], TIMETABLE_STATE_HEADERS.length);
    stateRow[1] = PUBLISHED_STAGE;
    stateRow[2] = publicationid;
    stampModifiedRow(stateRow, rowAudit.columns, audit.actor, audit.timestamp);
    stateRequest = buildUpdateCellsRequest(
      sheetIds.get(TIMETABLE_STATE_SHEET),
      state.rowindex,
      stateRow
    );
  }

  const auditRows = buildAdminAuditRows(audit, [{
    action: "PUBLISH",
    recordType: "TIMETABLE",
    recordId: publicationid,
    changedFields: ["CourseID", "VersionNo", "PublishedDate", "SessionCount", "Stage"]
  }]);
  const requests = [
    buildAppendCellsRequest(sheetIds.get(TIMETABLE_PUBLICATION_SHEET), [publicationRow]),
    buildAppendCellsRequest(sheetIds.get(PUBLISHED_TIMETABLE_SESSION_SHEET), snapshotRows),
    stateRequest,
    buildAppendCellsRequest(sheetIds.get(ADMIN_AUDIT_LOG_SHEET), auditRows)
  ];
  await batchUpdateGoogleSpreadsheet(env, requests);
}

async function getRequiredSheetIds(env, titles) {
  const properties = await readGoogleSpreadsheetSheetProperties(env);
  const byTitle = new Map(properties.map(sheet => [sheet.title, sheet.sheetId]));
  const missing = titles.filter(title => !byTitle.has(title));
  if (missing.length) throw new Error(`Missing Google Sheet tabs: ${missing.join(", ")}`);
  return byTitle;
}

function buildAppendCellsRequest(sheetId, rows) {
  return {
    appendCells: {
      sheetId,
      rows: rows.map(row => ({ values: row.map(value => ({ userEnteredValue: toSheetExtendedValue(value) })) })),
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
      rows: [{ values: row.map(value => ({ userEnteredValue: toSheetExtendedValue(value) })) }],
      fields: "userEnteredValue"
    }
  };
}

function toSheetExtendedValue(value) {
  if (typeof value === "boolean") return { boolValue: value };
  if (typeof value === "number" && Number.isFinite(value)) return { numberValue: value };
  return { stringValue: clean(value) };
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

    const courseName = courseMap.get(session.courseid)?.coursename || session.courseid;
    const range = `${otherSlot.starttime}–${otherSlot.endtime}`;
    if (session.teacherid === options.teacherId) {
      conflicts.push({
        type: "TEACHER",
        sessionid: session.sessionid,
        dayofweek: options.dayOfWeek,
        starttime: otherSlot.starttime,
        endtime: otherSlot.endtime,
        courseid: session.courseid,
        coursename: courseName,
        groupno: session.groupno,
        teacherid: session.teacherid,
        message: `${options.teacherName || "This teacher"} is already assigned on ${options.dayOfWeek} at ${range} (${courseName}, group ${session.groupno}).`
      });
    }

    if (session.courseid === options.courseId && groupsOverlap(session.groupno, options.groupNo)) {
      const requestedGroup = options.groupNo === "ALL" ? "All groups" : `Group ${options.groupNo}`;
      conflicts.push({
        type: "GROUP",
        sessionid: session.sessionid,
        dayofweek: options.dayOfWeek,
        starttime: otherSlot.starttime,
        endtime: otherSlot.endtime,
        courseid: session.courseid,
        coursename: courseName,
        groupno: session.groupno,
        teacherid: session.teacherid,
        message: `${requestedGroup} already has a session on ${options.dayOfWeek} at ${range} (${courseName}).`
      });
    }
  });

  return conflicts;
}

function deduplicateConflicts(conflicts) {
  const seen = new Set();
  return conflicts.filter(conflict => {
    const key = [
      conflict.type,
      conflict.sessionid,
      conflict.dayofweek,
      conflict.groupno,
      conflict.message
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeGroupAssignments(body) {
  if (Array.isArray(body.lessons)) {
    return {
      values: [],
      error: "Refresh Timetable Builder. Multi-lesson saves have been replaced by one Subject/Module with a Teacher and Zoom assignment for each group."
    };
  }

  const rawAssignments = Array.isArray(body.groupassignments)
    ? body.groupassignments
    : Array.isArray(body.groupAssignments)
      ? body.groupAssignments
      : null;
  let candidates = rawAssignments;

  if (!candidates) {
    const groups = normalizeGroupSelection(body.groupnos ?? body.groups ?? body.groupno ?? body.groupNo ?? body.group);
    if (groups.invalid.length) {
      return { values: [], error: `Invalid group selection: ${groups.invalid.join(", ")}` };
    }
    if (groups.values.length > 1) {
      return { values: [], error: "Refresh Timetable Builder and select a Teacher and Zoom assignment for each group" };
    }
    candidates = groups.values.map(groupno => ({
      groupno,
      teacherid: body.teacherid ?? body.teacherId,
      zoomlink: body.zoomlink ?? body.zoomLink
    }));
  }

  if (candidates.length > 20) return { values: [], error: "Select no more than 20 group assignments at once" };

  const values = [];
  const seenGroups = new Set();
  for (let index = 0; index < candidates.length; index += 1) {
    const raw = candidates[index];
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { values: [], error: `Group assignment ${index + 1} is invalid` };
    }
    const groupno = normalizeGroup(raw.groupno ?? raw.groupNo ?? raw.group);
    if (!groupno) return { values: [], error: `Group assignment ${index + 1} has an invalid group` };
    if (seenGroups.has(groupno)) return { values: [], error: `Group ${groupno} appears more than once` };
    seenGroups.add(groupno);

    let zoomlink;
    try {
      zoomlink = normalizeOptionalHttpsUrl(raw.zoomlink ?? raw.zoomLink);
    } catch (error) {
      return { values: [], error: `Group ${groupno}: ${error.message}` };
    }

    values.push({
      groupno,
      teacherid: clean(raw.teacherid ?? raw.teacherId),
      zoomlink
    });
  }

  values.sort((left, right) => {
    if (left.groupno === "ALL") return -1;
    if (right.groupno === "ALL") return 1;
    return Number(left.groupno) - Number(right.groupno);
  });
  return { values, error: "" };
}

function findRepeatedAssignmentTeacher(assignments) {
  const groupsByTeacher = new Map();
  assignments.forEach(assignment => {
    if (!assignment.teacherid || assignment.groupno === "ALL") return;
    const groups = groupsByTeacher.get(assignment.teacherid) || [];
    groups.push(assignment.groupno);
    groupsByTeacher.set(assignment.teacherid, groups);
  });
  for (const [teacherid, groups] of groupsByTeacher.entries()) {
    if (groups.length > 1) {
      return {
        teacherid,
        teachername: assignments.find(assignment => assignment.teacherid === teacherid)?.teachername || "",
        groups
      };
    }
  }
  return null;
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

function normalizeDaySelection(value) {
  const rawValues = toSelectionValues(value);
  const normalized = rawValues.map(normalizeDay);
  const invalid = rawValues.filter((item, index) => !normalized[index]);
  const selected = new Set(normalized.filter(Boolean));
  return {
    values: DAY_ORDER.filter(day => selected.has(day)),
    invalid
  };
}

function normalizeGroup(value) {
  const text = clean(value).toUpperCase();
  if (text === "ALL") return "ALL";
  return /^[1-9]\d*$/.test(text) ? String(Number(text)) : "";
}

function normalizeGroupSelection(value) {
  const rawValues = toSelectionValues(value);
  const normalized = rawValues.map(normalizeGroup);
  const invalid = rawValues.filter((item, index) => !normalized[index]);
  const values = Array.from(new Set(normalized.filter(Boolean))).sort((left, right) => {
    if (left === "ALL") return -1;
    if (right === "ALL") return 1;
    return Number(left) - Number(right);
  });
  return { values, invalid };
}

function normalizeUniqueIdSelection(value) {
  if (!Array.isArray(value)) return { values: [], invalid: true };
  const cleaned = value.map(clean);
  if (cleaned.some(item => !item)) return { values: [], invalid: true };
  const values = Array.from(new Set(cleaned));
  return { values, invalid: values.length !== cleaned.length };
}

function toSelectionValues(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  const text = clean(value);
  if (!text) return [];
  return text.includes(",") ? text.split(",").map(clean).filter(Boolean) : [text];
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

function builderDataReadErrorResponse(error) {
  if (isRetryableGoogleSheetsError(error)) {
    return json({
      success: false,
      error: "Google Sheets is temporarily busy. Please wait a moment and try again.",
      code: "TIMETABLE_SERVICE_BUSY",
      retryable: true
    }, 503);
  }

  return json({
    success: false,
    error: "Timetable Builder Sheet setup is incomplete. Create Courses, TimeSlots, TimetableSessions, TimetableCourseState, TimetablePublications and PublishedTimetableSessions using the V101.4.4 migration headers."
  }, 503);
}

function clean(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}
