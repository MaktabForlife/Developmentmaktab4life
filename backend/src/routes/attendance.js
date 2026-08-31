import { callAppsScript } from "../lib/apps-script.js";
import {
  appendAdminAuditLog,
  prepareAdminAudit
} from "../lib/admin-audit.js";
import { getAuthUser } from "../lib/auth.js";
import {
  appendGoogleSheetValues,
  batchReadGoogleSheetValues,
  readGoogleSheetValues,
  updateGoogleSheetValues
} from "../lib/google-sheets.js";
import { json } from "../lib/http.js";

const ATTENDANCE_SHEET_NAME = "Attendance";
const ATTENDANCE_SHEET_RANGE = `${ATTENDANCE_SHEET_NAME}!A:ZZ`;
const STUDENT_RECORDS_SHEET_NAME = "StudentRecords";
const STUDENT_RECORDS_SHEET_RANGE = `${STUDENT_RECORDS_SHEET_NAME}!A:ZZ`;
const ATTENDANCE_TIMEZONE = "Africa/Johannesburg";
const ATTENDANCE_HEADERS = Object.freeze([
  "AttendanceDate",
  "StudentID",
  "Username",
  "ClassGroup",
  "Status",
  "Notes",
  "AdminID",
  "DateStamp",
  "AdminName"
]);

export async function submitAbsentAttendance(request, env) {
  const context = await getAttendanceSubmissionContext(request, env);

  if (!context.ok) {
    return context.response;
  }

  const result = await callAppsScript(env, {
    action: "submitAbsentStudents",
    data: {
      date: context.date,
      absentStudents: context.absentStudents,
      adminid: context.authUser.adminid
    }
  });

  return json(result);
}

export async function submitAbsentAttendanceGoogleSheetsEndpoint(request, env) {
  const context = await getAttendanceSubmissionContext(request, env);

  if (!context.ok) {
    return context.response;
  }

  let rows;

  try {
    rows = await readAttendanceRowsWithHeaders(env);
  } catch (error) {
    if (!isMissingSheetError(error, ATTENDANCE_SHEET_NAME)) {
      throw error;
    }

    return json({ success: false, error: "Attendance sheet not found" });
  }

  const date = normalizeAttendanceDate(context.date);
  const headerMap = buildAttendanceHeaderMap(rows[0] || []);
  const dateCol = findAttendanceColumn(headerMap, ["AttendanceDate", "Date"]);
  const studentIdCol = findAttendanceColumn(headerMap, ["StudentID", "StudentId", "studentid"]);
  const usernameCol = findAttendanceColumn(headerMap, ["Username", "StudentName", "Name"]);
  const statusCol = findAttendanceColumn(headerMap, ["Status", "AttendanceStatus"]);
  const adminNameCol = findAttendanceColumn(headerMap, ["AdminName", "MarkedByName"]);

  if (!date) {
    return json({ success: false, error: "Missing date" });
  }

  if (
    dateCol === -1 ||
    studentIdCol === -1 ||
    usernameCol === -1 ||
    statusCol === -1 ||
    adminNameCol === -1
  ) {
    return json({ success: false, error: "Attendance sheet is missing required headers" });
  }

  const audit = await prepareAdminAudit(env, context.authUser);

  if (!audit.ok) {
    return json({ success: false, error: audit.error }, 503);
  }

  const existingStudentDatePairs = new Set();

  rows.slice(1).forEach(row => {
    const existingDate = normalizeAttendanceDate(row[dateCol]);
    const existingStudentId = clean(row[studentIdCol]);

    if (!existingDate || !existingStudentId || existingStudentId === "SYSTEM1") {
      return;
    }

    existingStudentDatePairs.add(`${existingDate}|${existingStudentId}`);
  });

  const now = formatAttendanceTimestamp(new Date());
  const adminId = audit.actor.adminid;
  const adminName = audit.actor.adminname;
  const outputRows = [];
  const submittedPairs = new Set();

  context.absentStudents.forEach(student => {
    const studentId = clean(student.studentid || student.StudentID);
    const pairKey = `${date}|${studentId}`;

    if (existingStudentDatePairs.has(pairKey) || submittedPairs.has(pairKey)) {
      return;
    }

    submittedPairs.add(pairKey);

    const row = new Array(rows[0].length).fill("");
    setAttendanceCell(row, headerMap, ["AttendanceDate", "Date"], date);
    setAttendanceCell(row, headerMap, ["StudentID", "StudentId", "studentid"], studentId);
    setAttendanceCell(row, headerMap, ["Username", "StudentName", "Name"], student.username || student.Username || "");
    setAttendanceCell(row, headerMap, ["ClassGroup", "classgroup", "Group"], student.classgroup || student.ClassGroup || "");
    setAttendanceCell(row, headerMap, ["Status", "AttendanceStatus"], "ABSENT");
    setAttendanceCell(row, headerMap, ["Notes"], "");
    setAttendanceCell(row, headerMap, ["AdminID", "AdminId", "adminid", "MarkedBy"], adminId);
    setAttendanceCell(row, headerMap, ["AdminName", "MarkedByName"], adminName);
    setAttendanceCell(row, headerMap, ["DateStamp", "Datestamp", "Timestamp", "MarkedDate"], now);
    outputRows.push(row);
  });

  const realAbsentCount = outputRows.length;
  const systemRow = new Array(rows[0].length).fill("");
  setAttendanceCell(systemRow, headerMap, ["AttendanceDate", "Date"], date);
  setAttendanceCell(systemRow, headerMap, ["StudentID", "StudentId", "studentid"], "SYSTEM1");
  setAttendanceCell(systemRow, headerMap, ["Username", "StudentName", "Name"], "daycounter");
  setAttendanceCell(systemRow, headerMap, ["ClassGroup", "classgroup", "Group"], "SYSTEM");
  setAttendanceCell(systemRow, headerMap, ["Status", "AttendanceStatus"], "ABSENT");
  setAttendanceCell(systemRow, headerMap, ["DayCounter", "Day Counter"], "daycounter");
  setAttendanceCell(
    systemRow,
    headerMap,
    ["Notes"],
    context.absentStudents.length === 0 ? "All students present" : "Register marked"
  );
  setAttendanceCell(systemRow, headerMap, ["AdminID", "AdminId", "adminid", "MarkedBy"], adminId);
  setAttendanceCell(systemRow, headerMap, ["AdminName", "MarkedByName"], adminName);
  setAttendanceCell(systemRow, headerMap, ["DateStamp", "Datestamp", "Timestamp", "MarkedDate"], now);
  outputRows.push(systemRow);

  await appendGoogleSheetValues(env, ATTENDANCE_SHEET_RANGE, outputRows);
  await appendAdminAuditLog(env, audit, {
    action: "SUBMIT",
    recordType: "ATTENDANCE",
    recordId: date,
    changedFields: ["Status", "Notes"]
  });

  return json({
    success: true,
    message: "Attendance submitted",
    date,
    absentCount: realAbsentCount,
    rowsAdded: outputRows.length,
    systemDayCounterAdded: true,
    adminid: adminId,
    datestamp: now,
    skippedDuplicateCount: context.absentStudents.length - realAbsentCount
  });
}

export async function attendanceStudents(request, env) {
  const context = await getAttendanceReadContext(request, env);

  if (!context.ok) {
    return context.response;
  }

  const result = await callAppsScript(env, {
    action: "getStudentsForAttendance",
    classgroup: context.classgroup
  });

  return json(result);
}

export async function attendanceStudentsGoogleSheetsEndpoint(request, env) {
  const context = await getAttendanceReadContext(request, env);

  if (!context.ok) {
    return context.response;
  }

  let rows;

  try {
    rows = await readGoogleSheetValues(env, STUDENT_RECORDS_SHEET_RANGE);
  } catch (error) {
    if (!isMissingSheetError(error, STUDENT_RECORDS_SHEET_NAME)) {
      throw error;
    }

    return json({ success: false, error: "StudentRecords sheet not found" });
  }

  return json(buildAttendanceStudentsResponse(rows, context.classgroup));
}

export async function attendanceReport(request, env) {
  const context = await getAttendanceReportContext(request, env);

  if (!context.ok) {
    return context.response;
  }

  const result = await callAppsScript(env, {
    action: "getAttendanceReport",
    data: {
      startDate: context.startDate,
      endDate: context.endDate,
      classgroup: context.classgroup
    }
  });

  return json(result);
}

export async function attendanceReportGoogleSheetsEndpoint(request, env) {
  const context = await getAttendanceReportContext(request, env);

  if (!context.ok) {
    return context.response;
  }

  try {
    const [studentRows, rawAttendanceRows] = await batchReadGoogleSheetValues(env, [
      STUDENT_RECORDS_SHEET_RANGE,
      ATTENDANCE_SHEET_RANGE
    ]);
    const attendanceRows = await normalizeAttendanceRowsWithHeaders(env, rawAttendanceRows);
    return json(buildAttendanceReportResponse(studentRows, attendanceRows, context));
  } catch (error) {
    if (isMissingSheetError(error, STUDENT_RECORDS_SHEET_NAME)) {
      return json({ success: false, error: "StudentRecords sheet not found" });
    }
    if (isMissingSheetError(error, ATTENDANCE_SHEET_NAME)) {
      return json({ success: false, error: "Attendance sheet not found" });
    }
    throw error;
  }
}

export function buildAttendanceStudentsResponse(rows = [], classgroup = "ALL") {
  const requestedGroup = clean(classgroup || "ALL");
  const headerMap = buildAttendanceHeaderMap(rows[0] || []);
  const students = activeAttendanceStudents(rows, headerMap, requestedGroup);

  return {
    success: true,
    classgroup: requestedGroup,
    count: students.length,
    students
  };
}

export function buildAttendanceReportResponse(
  studentRows = [],
  attendanceRows = [],
  options = {}
) {
  const startDate = normalizeAttendanceDate(options.startDate);
  const endDate = normalizeAttendanceDate(options.endDate);
  const requestedGroup = clean(options.classgroup || "ALL");

  if (!startDate || !endDate) {
    return { success: false, error: "Missing startDate or endDate" };
  }

  if (startDate > endDate) {
    return { success: false, error: "Start date cannot be after end date" };
  }

  const studentHeaderMap = buildAttendanceHeaderMap(studentRows[0] || []);
  const activeStudents = activeAttendanceStudents(studentRows, studentHeaderMap, requestedGroup);
  const attendanceHeaderMap = buildAttendanceHeaderMap(attendanceRows[0] || []);
  const dateCol = findAttendanceColumn(attendanceHeaderMap, ["AttendanceDate", "Date"]);
  const studentIdCol = findAttendanceColumn(attendanceHeaderMap, ["StudentID", "StudentId", "studentid"]);
  const usernameCol = findAttendanceColumn(attendanceHeaderMap, ["Username", "StudentName", "Name"]);

  if (dateCol === -1 || studentIdCol === -1 || usernameCol === -1) {
    return { success: false, error: "Attendance sheet is missing required headers" };
  }

  const maktabDays = new Set();
  const absentDateSetByStudentId = {};
  const seenAbsentPairs = new Set();

  attendanceRows.slice(1).forEach(row => {
    const rowDate = normalizeAttendanceDate(row[dateCol]);
    const studentid = clean(row[studentIdCol]);

    if (!rowDate || rowDate < startDate || rowDate > endDate) {
      return;
    }

    maktabDays.add(rowDate);

    if (!studentid || studentid === "SYSTEM1") {
      return;
    }

    const pairKey = `${rowDate}|${studentid}`;

    if (seenAbsentPairs.has(pairKey)) {
      return;
    }

    seenAbsentPairs.add(pairKey);

    if (!absentDateSetByStudentId[studentid]) {
      absentDateSetByStudentId[studentid] = new Set();
    }

    absentDateSetByStudentId[studentid].add(rowDate);
  });

  const totalMaktabDays = maktabDays.size;
  const students = activeStudents.map(student => {
    const absentDateSet = absentDateSetByStudentId[student.studentid] || new Set();
    const absentDates = Array.from(absentDateSet).sort();
    const absentDays = absentDates.length;
    const attendancePercent = totalMaktabDays === 0
      ? 0
      : roundAttendancePercent(((totalMaktabDays - absentDays) / totalMaktabDays) * 100);

    return {
      studentid: student.studentid,
      username: student.username,
      classgroup: student.classgroup,
      absentDays,
      absentDates,
      attendancePercent
    };
  });

  sortAttendanceStudents(students);

  const groupMap = {};

  students.forEach(student => {
    if (!groupMap[student.classgroup]) {
      groupMap[student.classgroup] = [];
    }

    groupMap[student.classgroup].push(student);
  });

  const groupAverages = Object.keys(groupMap)
    .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }))
    .map(group => {
      const groupStudents = groupMap[group];
      const averageAttendancePercent = groupStudents.length === 0
        ? 0
        : roundAttendancePercent(
            groupStudents.reduce((sum, student) => sum + student.attendancePercent, 0) /
              groupStudents.length
          );

      return {
        classgroup: group,
        studentCount: groupStudents.length,
        averageAttendancePercent
      };
    });

  const registerAverageAttendancePercent = students.length === 0
    ? 0
    : roundAttendancePercent(
        students.reduce((sum, student) => sum + student.attendancePercent, 0) /
          students.length
      );
  const perfectAttendanceStudents = students
    .filter(student => student.absentDays === 0 && totalMaktabDays > 0)
    .map(student => ({
      studentid: student.studentid,
      username: student.username,
      classgroup: student.classgroup
    }));

  return {
    success: true,
    startDate,
    endDate,
    classgroup: requestedGroup,
    totalMaktabDays,
    registerAverageAttendancePercent,
    debug: {
      activeStudentCount: activeStudents.length,
      attendanceRowCount: Math.max(0, attendanceRows.length - 1),
      uniqueMaktabDays: Array.from(maktabDays).sort(),
      uniqueAbsentStudentDatePairCount: seenAbsentPairs.size
    },
    groupAverages,
    perfectAttendanceStudents,
    students
  };
}

async function getAttendanceSubmissionContext(request, env) {
  const authUser = await getAuthUser(request, env);

  if (!authUser || authUser.type !== "admin") {
    return {
      ok: false,
      response: json({ success: false, error: "Unauthorized" }, 401)
    };
  }

  const body = await request.json();
  const date = clean(body.date);
  const absentStudents = Array.isArray(body.absentStudents) ? body.absentStudents : [];

  if (!date) {
    return {
      ok: false,
      response: json({ success: false, error: "Missing date" }, 400)
    };
  }

  for (const student of absentStudents) {
    if (!student.studentid) {
      return {
        ok: false,
        response: json({
          success: false,
          error: "Missing studentid in absent list"
        }, 400)
      };
    }

    if (authUser.role === "TEACHER" && student.classgroup !== authUser.assignedgroup) {
      return {
        ok: false,
        response: json({
          success: false,
          error: "Teacher cannot submit attendance for another group"
        }, 403)
      };
    }
  }

  return { ok: true, authUser, date, absentStudents };
}

async function getAttendanceReadContext(request, env) {
  const authUser = await getAuthUser(request, env);

  if (!authUser || authUser.type !== "admin") {
    return {
      ok: false,
      response: json({ success: false, error: "Unauthorized" }, 401)
    };
  }

  const body = await request.json();
  let classgroup = clean(body.classgroup || "ALL");

  if (authUser.role === "TEACHER") {
    classgroup = clean(authUser.assignedgroup);
  }

  return { ok: true, authUser, classgroup };
}

async function getAttendanceReportContext(request, env) {
  const authUser = await getAuthUser(request, env);

  if (!authUser || authUser.type !== "admin") {
    return {
      ok: false,
      response: json({ success: false, error: "Unauthorized" }, 401)
    };
  }

  const body = await request.json();
  const startDate = clean(body.startDate);
  const endDate = clean(body.endDate);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
    return {
      ok: false,
      response: json({ success: false, error: "startDate must be YYYY-MM-DD" }, 400)
    };
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
    return {
      ok: false,
      response: json({ success: false, error: "endDate must be YYYY-MM-DD" }, 400)
    };
  }

  let classgroup = clean(body.classgroup || "ALL");

  if (authUser.role === "TEACHER") {
    classgroup = clean(authUser.assignedgroup);
  }

  return { ok: true, authUser, startDate, endDate, classgroup };
}

async function readAttendanceRowsWithHeaders(env) {
  const rows = await readGoogleSheetValues(env, ATTENDANCE_SHEET_RANGE);
  return normalizeAttendanceRowsWithHeaders(env, rows);
}

async function normalizeAttendanceRowsWithHeaders(env, rows) {
  const firstRow = Array.isArray(rows[0]) ? rows[0] : [];
  const headerMap = buildAttendanceHeaderMap(firstRow);
  const hasDate = findAttendanceColumn(headerMap, ["AttendanceDate", "Date"]) !== -1;

  if (rows.length > 0 && hasDate) {
    return rows;
  }

  await updateGoogleSheetValues(
    env,
    `${ATTENDANCE_SHEET_NAME}!A1:I1`,
    [ATTENDANCE_HEADERS.slice()]
  );

  if (rows.length === 0) {
    return [ATTENDANCE_HEADERS.slice()];
  }

  const updatedRows = rows.map(row => Array.isArray(row) ? row.slice() : []);
  const repairedHeaders = firstRow.slice();

  ATTENDANCE_HEADERS.forEach((header, index) => {
    repairedHeaders[index] = header;
  });

  updatedRows[0] = repairedHeaders;
  return updatedRows;
}

function activeAttendanceStudents(rows, headerMap, requestedGroup) {
  const students = [];

  rows.slice(1).forEach(row => {
    const studentId = clean(getAttendanceCell(row, headerMap, ["StudentID", "StudentId", "studentid"]));
    const username = clean(getAttendanceCell(row, headerMap, ["Username", "StudentName", "Name", "username"], ""));
    const classgroup = clean(getAttendanceCell(row, headerMap, ["classgroup", "ClassGroup", "Group", "GroupNo"], ""));
    const active = getAttendanceCell(row, headerMap, ["Active", "Status"], true);

    if (!studentId || !isAttendanceActiveValue(active) || classgroup === "0") {
      return;
    }

    if (requestedGroup !== "ALL" && classgroup !== requestedGroup) {
      return;
    }

    students.push({ studentid: studentId, username, classgroup });
  });

  sortAttendanceStudents(students);
  return students;
}

function sortAttendanceStudents(students) {
  students.sort((a, b) => {
    const groupCompare = String(a.classgroup).localeCompare(
      String(b.classgroup),
      undefined,
      { numeric: true }
    );

    if (groupCompare !== 0) {
      return groupCompare;
    }

    return String(a.username).localeCompare(String(b.username), undefined, {
      numeric: true,
      sensitivity: "base"
    });
  });
}

function buildAttendanceHeaderMap(headers) {
  const map = {};

  headers.forEach((header, index) => {
    const key = normalizeAttendanceHeaderKey(header);

    if (key) {
      map[key] = index;
    }
  });

  return map;
}

function normalizeAttendanceHeaderKey(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findAttendanceColumn(headerMap, possibleHeaders) {
  for (const header of possibleHeaders) {
    const key = normalizeAttendanceHeaderKey(header);

    if (Object.prototype.hasOwnProperty.call(headerMap, key)) {
      return headerMap[key];
    }
  }

  return -1;
}

function getAttendanceCell(row, headerMap, possibleHeaders, fallback) {
  const col = findAttendanceColumn(headerMap, possibleHeaders);

  if (col === -1) {
    return fallback;
  }

  const value = row[col];
  return value === "" || value === null || value === undefined ? fallback : value;
}

function setAttendanceCell(row, headerMap, possibleHeaders, value) {
  const col = findAttendanceColumn(headerMap, possibleHeaders);

  if (col !== -1) {
    row[col] = value;
  }
}

function isAttendanceActiveValue(value) {
  if (value === true) {
    return true;
  }

  const text = clean(value).toUpperCase();
  return ["TRUE", "ACTIVE", "YES", "1"].includes(text);
}

function normalizeAttendanceDate(value) {
  if (!value) {
    return "";
  }

  if (Object.prototype.toString.call(value) === "[object Date]" && !Number.isNaN(value.getTime())) {
    return formatAttendanceDate(value);
  }

  const text = clean(value);

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return text;
  }

  let match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})$/);

  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    let year = Number(match[3]);

    if (year < 100) {
      year += 2000;
    }

    const day = first > 12 ? first : second > 12 ? second : first;
    const month = first > 12 ? second : second > 12 ? first : second;
    return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  match = text.match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/);

  if (match) {
    const months = {
      jan: 1,
      feb: 2,
      mar: 3,
      apr: 4,
      may: 5,
      jun: 6,
      jul: 7,
      aug: 8,
      sep: 9,
      oct: 10,
      nov: 11,
      dec: 12
    };
    const month = months[match[2].toLowerCase().slice(0, 3)];

    if (month) {
      return `${match[3]}-${String(month).padStart(2, "0")}-${String(Number(match[1])).padStart(2, "0")}`;
    }
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? text : formatAttendanceDate(parsed);
}

function formatAttendanceDate(date) {
  const parts = dateTimeParts(date, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function formatAttendanceTimestamp(date) {
  const parts = dateTimeParts(date, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  });
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

function dateTimeParts(date, options) {
  return new Intl.DateTimeFormat("en-GB", {
    ...options,
    timeZone: ATTENDANCE_TIMEZONE
  }).formatToParts(date).reduce((parts, part) => {
    if (part.type !== "literal") {
      parts[part.type] = part.value;
    }

    return parts;
  }, {});
}

function roundAttendancePercent(value) {
  return Math.round(Number(value || 0) * 10) / 10;
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
