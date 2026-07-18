import {
  appendGoogleSheetValues,
  readGoogleSheetValues,
  updateGoogleSheetValues
} from "../lib/google-sheets.js";
import { getAuthUser } from "../lib/auth.js";
import { json } from "../lib/http.js";

/* =========================
   WEEKLY PLANNERS - V95.0
   Direct Google Sheets API path. Existing Apps Script routes remain unchanged.
========================= */

const WEEKLY_PLANNER_SHEET_NAME = "WeeklyPlanners";
const WEEKLY_PLANNER_ADMIN_SHEET_NAME = "AdminRecords";
const WEEKLY_PLANNER_HEADERS = Object.freeze([
  "PlannerID",
  "TeacherID",
  "TeacherName",
  "WeekStart",
  "WeekEnd",
  "Month",
  "GroupNo",
  "Status",
  "PlannerData",
  "Feedback",
  "FeedbackBy",
  "CreatedDate",
  "UpdatedDate",
  "PublishedDate"
]);

async function requireWeeklyPlannerAdmin(request, env) {
  const authUser = await getAuthUser(request, env);

  if (!authUser || authUser.type !== "admin") {
    return {
      ok: false,
      response: json({ success: false, error: "Unauthorized" }, 401)
    };
  }

  return {
    ok: true,
    user: authUser
  };
}

export async function weeklyPlannerHealthEndpoint(request, env) {
  const auth = await requireWeeklyPlannerAdmin(request, env);

  if (!auth.ok) {
    return auth.response;
  }

  const rows = await readGoogleSheetValues(
    env,
    `${WEEKLY_PLANNER_SHEET_NAME}!A1:N1`
  );
  validateSheetHeaders(rows[0] || [], WEEKLY_PLANNER_HEADERS, WEEKLY_PLANNER_SHEET_NAME);

  return json({
    success: true,
    service: "weekly-planner",
    connection: "google-sheets-direct",
    sheet: WEEKLY_PLANNER_SHEET_NAME,
    columns: WEEKLY_PLANNER_HEADERS.length
  });
}

export async function weeklyPlannerTeachersEndpoint(request, env) {
  const auth = await requireWeeklyPlannerAdmin(request, env);

  if (!auth.ok) {
    return auth.response;
  }

  const teachers = await readWeeklyPlannerTeachers(env);
  const role = String(auth.user.role || "").trim().toUpperCase();
  const scopedTeachers = role === "TEACHER"
    ? teachers.filter(teacher => teacher.teacherId === String(auth.user.adminid || ""))
    : teachers;

  if (role === "TEACHER" && scopedTeachers.length === 0) {
    scopedTeachers.push({
      teacherId: String(auth.user.adminid || "").trim(),
      teacherName: String(auth.user.username || "").trim(),
      role,
      assignedGroup: String(auth.user.assignedgroup || "").trim(),
      active: true
    });
  }

  return json({
    success: true,
    teachers: scopedTeachers
  });
}

export async function getWeeklyPlannerEndpoint(request, env) {
  const auth = await requireWeeklyPlannerAdmin(request, env);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const teacher = await resolveWeeklyPlannerTeacher(env, auth.user, body);

  if (!teacher) {
    return json({ success: false, error: "Teacher not found" }, 404);
  }

  const week = getWeeklyPlannerWeek(body.weekStart);
  const records = await readWeeklyPlannerRecords(env);
  const teacherRecords = records.filter(record => record.teacherId === teacher.teacherId);
  const planner = teacherRecords
    .filter(record => record.weekStart === week.weekStart)
    .sort(compareWeeklyPlannerRecordsNewestFirst)[0] || null;
  const previousPlanner = teacherRecords
    .filter(record => record.weekStart && record.weekStart < week.weekStart)
    .sort((a, b) => {
      return String(b.weekStart).localeCompare(String(a.weekStart)) ||
        compareWeeklyPlannerRecordsNewestFirst(a, b);
    })[0] || null;

  return json({
    success: true,
    teacher,
    week,
    planner: planner ? getWeeklyPlannerClientRecord(planner) : null,
    previousPlanner: previousPlanner ? getWeeklyPlannerClientRecord(previousPlanner) : null
  });
}

export async function saveWeeklyPlannerEndpoint(request, env) {
  const auth = await requireWeeklyPlannerAdmin(request, env);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const teacher = await resolveWeeklyPlannerTeacher(env, auth.user, body);

  if (!teacher) {
    return json({ success: false, error: "Teacher not found" }, 404);
  }

  const week = getWeeklyPlannerWeek(body.weekStart);
  const status = String(body.status || "READY").trim().toUpperCase();

  if (!new Set(["DRAFT", "READY"]).has(status)) {
    return json({ success: false, error: "Status must be DRAFT or READY" }, 400);
  }

  let plannerDataText = "";

  try {
    plannerDataText = normalizeWeeklyPlannerDataForStorage(body.plannerData);
  } catch (error) {
    return json({
      success: false,
      error: error && error.message ? error.message : "Invalid planner data"
    }, 400);
  }

  const feedback = String(body.feedback || "").trim();
  const groupNo = String(body.groupNo || teacher.assignedGroup || "").trim();

  if (feedback.length > 20000) {
    return json({ success: false, error: "Feedback is too long" }, 400);
  }

  if (groupNo.length > 80) {
    return json({ success: false, error: "Group is too long" }, 400);
  }

  const records = await readWeeklyPlannerRecords(env);
  const existing = records
    .filter(record => {
      return record.teacherId === teacher.teacherId && record.weekStart === week.weekStart;
    })
    .sort(compareWeeklyPlannerRecordsNewestFirst)[0] || null;
  const expectedUpdatedDate = String(body.expectedUpdatedDate || "").trim();

  if (existing && expectedUpdatedDate && existing.updatedDate !== expectedUpdatedDate) {
    return json({
      success: false,
      error: "This planner was updated by someone else. Reload it before saving.",
      conflict: true,
      planner: getWeeklyPlannerClientRecord(existing)
    }, 409);
  }

  if (!existing && expectedUpdatedDate) {
    return json({
      success: false,
      error: "This planner has changed. Reload it before saving.",
      conflict: true
    }, 409);
  }

  const now = new Date().toISOString();
  const plannerId = existing
    ? existing.plannerId
    : buildWeeklyPlannerId(teacher.teacherId, week.weekStart);
  const record = {
    plannerId,
    teacherId: teacher.teacherId,
    teacherName: teacher.teacherName,
    weekStart: week.weekStart,
    weekEnd: week.weekEnd,
    month: week.month,
    groupNo,
    status,
    plannerData: parseWeeklyPlannerData(plannerDataText),
    plannerDataText,
    feedback,
    feedbackBy: String(auth.user.username || "").trim(),
    createdDate: existing ? existing.createdDate : now,
    updatedDate: now,
    publishedDate: status === "READY" ? now : (existing ? existing.publishedDate : "")
  };
  const values = [weeklyPlannerRecordToRow(record)];

  if (existing) {
    await updateGoogleSheetValues(
      env,
      `${WEEKLY_PLANNER_SHEET_NAME}!A${existing.rowNumber}:N${existing.rowNumber}`,
      values
    );
  } else {
    await appendGoogleSheetValues(
      env,
      `${WEEKLY_PLANNER_SHEET_NAME}!A:N`,
      values
    );
  }

  return json({
    success: true,
    message: status === "READY" ? "Weekly planner saved" : "Weekly planner draft saved",
    teacher,
    week,
    planner: getWeeklyPlannerClientRecord(record)
  });
}

async function resolveWeeklyPlannerTeacher(env, authUser, body = {}) {
  const teachers = await readWeeklyPlannerTeachers(env);
  const role = String(authUser.role || "").trim().toUpperCase();
  const ownTeacherId = String(authUser.adminid || "").trim();
  const requestedTeacherId = role === "TEACHER"
    ? ownTeacherId
    : String(body.teacherId || ownTeacherId).trim();
  const matched = teachers.find(teacher => teacher.teacherId === requestedTeacherId);

  if (matched) {
    return matched;
  }

  if (requestedTeacherId === ownTeacherId && ownTeacherId) {
    return {
      teacherId: ownTeacherId,
      teacherName: String(authUser.username || "").trim(),
      role,
      assignedGroup: String(authUser.assignedgroup || "").trim(),
      active: true
    };
  }

  return null;
}

async function readWeeklyPlannerTeachers(env) {
  const rows = await readGoogleSheetValues(
    env,
    `${WEEKLY_PLANNER_ADMIN_SHEET_NAME}!A:K`
  );
  const headers = rows[0] || [];
  const requiredHeaders = ["adminid", "username", "role", "assignedgroup", "active"];
  validateSheetContainsHeaders(headers, requiredHeaders, WEEKLY_PLANNER_ADMIN_SHEET_NAME);

  const index = getSheetHeaderIndex(headers);

  return rows.slice(1).map(row => {
    return {
      teacherId: String(row[index.adminid] || "").trim(),
      teacherName: String(row[index.username] || "").trim(),
      role: String(row[index.role] || "").trim().toUpperCase(),
      assignedGroup: String(row[index.assignedgroup] || "").trim(),
      active: isGoogleSheetTrue(row[index.active])
    };
  }).filter(teacher => {
    return teacher.teacherId && teacher.teacherName && teacher.active;
  }).sort((a, b) => {
    return a.teacherName.localeCompare(b.teacherName, undefined, {
      numeric: true,
      sensitivity: "base"
    });
  });
}

async function readWeeklyPlannerRecords(env) {
  const rows = await readGoogleSheetValues(
    env,
    `${WEEKLY_PLANNER_SHEET_NAME}!A:N`
  );
  validateSheetHeaders(rows[0] || [], WEEKLY_PLANNER_HEADERS, WEEKLY_PLANNER_SHEET_NAME);

  return rows.slice(1).map((row, index) => {
    const plannerDataText = String(row[8] || "").trim();

    return {
      rowNumber: index + 2,
      plannerId: String(row[0] || "").trim(),
      teacherId: String(row[1] || "").trim(),
      teacherName: String(row[2] || "").trim(),
      weekStart: String(row[3] || "").trim(),
      weekEnd: String(row[4] || "").trim(),
      month: String(row[5] || "").trim(),
      groupNo: String(row[6] || "").trim(),
      status: String(row[7] || "").trim().toUpperCase(),
      plannerData: parseWeeklyPlannerData(plannerDataText),
      plannerDataText,
      feedback: String(row[9] || "").trim(),
      feedbackBy: String(row[10] || "").trim(),
      createdDate: String(row[11] || "").trim(),
      updatedDate: String(row[12] || "").trim(),
      publishedDate: String(row[13] || "").trim()
    };
  }).filter(record => record.plannerId && record.teacherId && record.weekStart);
}

function weeklyPlannerRecordToRow(record) {
  return [
    record.plannerId,
    record.teacherId,
    record.teacherName,
    record.weekStart,
    record.weekEnd,
    record.month,
    record.groupNo,
    record.status,
    record.plannerDataText || JSON.stringify(record.plannerData || {}),
    record.feedback,
    record.feedbackBy,
    record.createdDate,
    record.updatedDate,
    record.publishedDate
  ];
}

function getWeeklyPlannerClientRecord(record) {
  return {
    plannerId: record.plannerId,
    teacherId: record.teacherId,
    teacherName: record.teacherName,
    weekStart: record.weekStart,
    weekEnd: record.weekEnd,
    month: record.month,
    groupNo: record.groupNo,
    status: record.status,
    plannerData: record.plannerData || { version: 1, days: [] },
    feedback: record.feedback,
    feedbackBy: record.feedbackBy,
    createdDate: record.createdDate,
    updatedDate: record.updatedDate,
    publishedDate: record.publishedDate
  };
}

function compareWeeklyPlannerRecordsNewestFirst(a, b) {
  return String(b.updatedDate || b.createdDate || "")
    .localeCompare(String(a.updatedDate || a.createdDate || ""));
}

function parseWeeklyPlannerData(value) {
  if (value && typeof value === "object") {
    return value;
  }

  const text = String(value || "").trim();

  if (!text) {
    return { version: 1, days: [] };
  }

  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === "object"
      ? parsed
      : { version: 1, days: [] };
  } catch (error) {
    return { version: 1, days: [] };
  }
}

function normalizeWeeklyPlannerDataForStorage(value) {
  let plannerData = value;

  if (typeof plannerData === "string") {
    try {
      plannerData = JSON.parse(plannerData);
    } catch (error) {
      throw new Error("Planner data is not valid JSON");
    }
  }

  if (!plannerData || typeof plannerData !== "object" || !Array.isArray(plannerData.days)) {
    throw new Error("Planner data must contain four day cards");
  }

  if (plannerData.days.length !== 4) {
    throw new Error("Planner data must contain Monday to Thursday");
  }

  const text = JSON.stringify(plannerData);

  if (text.length > 120000) {
    throw new Error("Planner data is too large");
  }

  return text;
}

function buildWeeklyPlannerId(teacherId, weekStart) {
  const safeTeacher = String(teacherId || "teacher")
    .replace(/[^A-Za-z0-9_-]/g, "")
    .slice(0, 40) || "teacher";
  const safeWeek = String(weekStart || "").replace(/[^0-9]/g, "");
  return `WPL-${safeTeacher}-${safeWeek}`;
}

function getWeeklyPlannerWeek(value) {
  const source = String(value || "").trim();
  const date = source && /^\d{4}-\d{2}-\d{2}$/.test(source)
    ? new Date(`${source}T00:00:00.000Z`)
    : new Date();

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid week start date");
  }

  const utcDate = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  ));
  const daysSinceMonday = (utcDate.getUTCDay() + 6) % 7;
  utcDate.setUTCDate(utcDate.getUTCDate() - daysSinceMonday);

  const endDate = new Date(utcDate);
  endDate.setUTCDate(endDate.getUTCDate() + 3);

  return {
    weekStart: formatWeeklyPlannerIsoDate(utcDate),
    weekEnd: formatWeeklyPlannerIsoDate(endDate),
    month: formatWeeklyPlannerMonth(utcDate, endDate)
  };
}

function formatWeeklyPlannerIsoDate(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatWeeklyPlannerMonth(startDate, endDate) {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const startLabel = monthNames[startDate.getUTCMonth()];
  const endLabel = monthNames[endDate.getUTCMonth()];
  const year = startDate.getUTCFullYear();

  if (startDate.getUTCMonth() === endDate.getUTCMonth()) {
    return `${startLabel} ${year}`;
  }

  return `${startLabel} / ${endLabel} ${year}`;
}

function getSheetHeaderIndex(headers) {
  return (headers || []).reduce((index, header, position) => {
    index[String(header || "").trim().toLowerCase()] = position;
    return index;
  }, {});
}

function validateSheetHeaders(actualHeaders, expectedHeaders, sheetName) {
  const actual = (actualHeaders || []).map(value => String(value || "").trim());
  const mismatches = expectedHeaders.filter((header, index) => actual[index] !== header);

  if (mismatches.length > 0) {
    throw new Error(
      `${sheetName} header mismatch. Expected: ${expectedHeaders.join(", ")}`
    );
  }
}

function validateSheetContainsHeaders(actualHeaders, requiredHeaders, sheetName) {
  const normalized = new Set(
    (actualHeaders || []).map(value => String(value || "").trim().toLowerCase())
  );
  const missing = requiredHeaders.filter(header => !normalized.has(header.toLowerCase()));

  if (missing.length > 0) {
    throw new Error(`${sheetName} is missing columns: ${missing.join(", ")}`);
  }
}

function isGoogleSheetTrue(value) {
  if (value === true || value === 1) return true;
  return new Set(["true", "yes", "1", "active"])
    .has(String(value || "").trim().toLowerCase());
}

