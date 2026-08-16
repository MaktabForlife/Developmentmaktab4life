import assert from "node:assert/strict";
import { createSessionToken } from "../src/lib/auth.js";
import {
  LEGACY_PUBLISHED_TIMETABLE_SESSION_HEADERS,
  PUBLISHED_TIMETABLE_SESSION_HEADERS,
  TIMETABLE_PUBLICATION_HEADERS,
  TIMETABLE_STATE_HEADERS,
  resolveCurrentPublishedTimetable,
  validatePublishedTimetableHeaders
} from "../src/lib/timetable-publication.js";
import {
  buildTimetableIntegrationPreview,
  comparePublishedAndTeacherAssign
} from "../src/routes/timetable-integration.js";
import worker from "../src/worker.js";

const courseId = "COURSE1";
const publicationId = "PUBLICATION-1";
const stateRows = [
  [...TIMETABLE_STATE_HEADERS],
  [courseId, "DEVELOPMENT", publicationId, "2026-08-16T00:00:00.000Z", "ADMIN1", "Admin User", "", "", ""]
];
const publicationRows = [
  [...TIMETABLE_PUBLICATION_HEADERS],
  [publicationId, courseId, 4, "2026-08-16T10:00:00.000Z", "ADMIN1", "Admin User", 2]
];
const publishedRows = [
  [...PUBLISHED_TIMETABLE_SESSION_HEADERS],
  ["PSESSION-1", publicationId, "SESSION-1", courseId, "SLOT1", "Mon", "SUB1", "MOD1", "1", "TEACH1", "https://zoom.test/one", "2026-08-16T10:00:00.000Z", "ADMIN1", "Admin User", "Reboot Your Maktab", "09:00", "10:00", "Qur'an", "Qa'idah", "Teacher One"],
  ["PSESSION-2", publicationId, "SESSION-2", courseId, "SLOT2", "Tue", "SUB2", "", "2", "TEACH2", "", "2026-08-16T10:00:00.000Z", "ADMIN1", "Admin User", "Reboot Your Maktab", "10:00", "11:00", "Fiqh", "", "Teacher Two"]
];
const teacherRows = [
  ["SessionID", "SubjectID", "SubjectName", "DayofWeek", "StartTime", "ZoomLink", "GroupNo", "AssignedTeacher", "CourseID", "Active", "ModuleID", "ModuleName"],
  ["TA-1", "SUB1", "Qur'an", "Mon", "09:00", "https://zoom.test/one", "1", "TEACH1", courseId, true, "MOD1", "Qa'idah"],
  ["TA-2", "SUB2", "Fiqh", "Tue", "10:00", "", "2", "TEACH2", courseId, true, "", ""]
];

assert.equal(validatePublishedTimetableHeaders([[...LEGACY_PUBLISHED_TIMETABLE_SESSION_HEADERS]]).ok, true);
assert.equal(validatePublishedTimetableHeaders([[...LEGACY_PUBLISHED_TIMETABLE_SESSION_HEADERS]]).current, false);
assert.equal(validatePublishedTimetableHeaders([[...PUBLISHED_TIMETABLE_SESSION_HEADERS]], { requireCurrent: true }).current, true);

const current = resolveCurrentPublishedTimetable({ stateRows, publicationRows, publishedSessionRows: publishedRows }, courseId, {
  requireCurrentHeaders: true,
  requireDisplayValues: true
});
assert.equal(current.ok, true);
assert.equal(current.publication.versionno, 4);
assert.equal(current.sessions[0].subjectname, "Qur'an");
assert.equal(current.sessions[0].teachername, "Teacher One");

const legacyCurrent = resolveCurrentPublishedTimetable({
  stateRows,
  publicationRows,
  publishedSessionRows: [[...LEGACY_PUBLISHED_TIMETABLE_SESSION_HEADERS], ...publishedRows.slice(1).map(row => row.slice(0, 14))]
}, courseId, { requireCurrentHeaders: true });
assert.equal(legacyCurrent.ok, false);
assert.equal(legacyCurrent.code, "PUBLISHED_TIMETABLE_SCHEMA_NOT_READY");

const comparison = comparePublishedAndTeacherAssign(current.sessions, teacherRows, courseId);
assert.deepEqual({
  matching: comparison.matchingCount,
  publishedOnly: comparison.publishedOnlyCount,
  teacherOnly: comparison.teacherAssignOnlyCount
}, { matching: 2, publishedOnly: 0, teacherOnly: 0 });

const preview = buildTimetableIntegrationPreview({
  stateRows,
  publicationRows,
  publishedSessionRows: publishedRows,
  teacherAssignRows: teacherRows,
  systemConfigRows: [["TimetableLiveSource", "TEACHER_ASSIGN"]]
}, courseId);
assert.equal(preview.success, true);
assert.equal(preview.readyToActivate, true);
assert.equal(preview.requiredConfirmation, "ACTIVATE PUBLISHED TIMETABLE");
assert.equal(preview.publication.publicationid, publicationId);

const keyPair = await crypto.subtle.generateKey({
  name: "RSASSA-PKCS1-v1_5",
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256"
}, true, ["sign", "verify"]);
const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey));
const env = {
  SESSION_SECRET: "timetable-integration-test-secret",
  GOOGLE_SPREADSHEET_ID: "course-spreadsheet",
  M4L_AUTHENTICATED_COURSE_ID: courseId,
  M4L_BACKEND_TIMETABLE_READ: "google-sheets",
  M4L_BACKEND_TIMETABLE_BUILDER: "google-sheets",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "timetable-integration@example.iam.gserviceaccount.com",
    private_key_id: "timetable-integration-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"),
    token_uri: "https://oauth2.googleapis.com/token"
  })
};
const adminToken = await createSessionToken({
  type: "admin", adminid: "ADMIN1", username: "Admin User", role: "ADMIN"
}, env);
const studentToken = await createSessionToken({
  type: "student", studentid: "STUDENT1", username: "Student One", classgroup: "1", role: "STUDENT"
}, env);
const teacherToken = await createSessionToken({
  type: "admin", adminid: "TEACH2", username: "Teacher Two", role: "TEACHER"
}, env);
const auditRows = [["AuditID", "DateStamp", "AdminID", "AdminName", "Role", "Action", "RecordType", "RecordID", "ChangedFields"]];
const systemConfigRows = [
  ["GlobalZoomLink", "https://zoom.test/global", "2026-08-01T00:00:00.000Z", "ADMIN0", "Earlier Admin"],
  ["TimetableLiveSource", "PUBLISHED_TIMETABLE", "2026-08-16T00:00:00.000Z", "ADMIN1", "Admin User"]
];
const sheetIds = new Map([["SystemConfig", 1], ["AdminAuditLog", 2]]);
const batches = [];
const requestedRanges = [];
const originalFetch = globalThis.fetch;

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  if (url.hostname === "oauth2.googleapis.com") {
    return response({ access_token: "mock-integration-token", expires_in: 3600 });
  }
  if (url.hostname !== "sheets.googleapis.com") throw new Error(`Unexpected fetch ${url}`);
  const method = String(init.method || "GET").toUpperCase();
  if (method === "GET" && url.pathname.endsWith("/values:batchGet")) {
    const ranges = url.searchParams.getAll("ranges");
    requestedRanges.push(...ranges);
    return response({ valueRanges: ranges.map(range => ({ range, values: valuesForRange(range) })) });
  }
  if (method === "GET" && !url.pathname.includes("/values/")) {
    return response({ sheets: Array.from(sheetIds, ([title, sheetId]) => ({ properties: { title, sheetId } })) });
  }
  if (method === "POST" && url.pathname.endsWith(":batchUpdate")) {
    const body = JSON.parse(init.body);
    batches.push(body.requests);
    body.requests.forEach(applySpreadsheetRequest);
    return response({ replies: body.requests.map(() => ({})) });
  }
  const range = decodeURIComponent(url.pathname.split("/values/")[1] || "");
  requestedRanges.push(range);
  if (method === "GET") return response({ values: valuesForRange(range) });
  throw new Error(`Unexpected Sheets request ${method} ${url}`);
};

try {
  const student = await post("/api/student/timetable/get", studentToken, {});
  assert.equal(student.response.status, 200);
  assert.equal(student.data.timetablesource, "PublishedTimetableSessions");
  assert.equal(student.data.liveSource, "PUBLISHED_TIMETABLE");
  assert.equal(student.data.publicationversion, 4);
  assert.deepEqual(student.data.sessions.map(session => session.sessionid), ["SESSION-1"]);
  assert.equal(student.data.sessions[0].subjectname, "Qur'an");
  assert.equal(student.data.sessions[0].teachername, "Teacher One");
  assert.equal(requestedRanges.includes("TeacherAssign!A:ZZ"), false, "Published live reads must not read TeacherAssign");

  const teacher = await post("/api/admin/timetable/get", teacherToken, {});
  assert.deepEqual(teacher.data.sessions.map(session => session.sessionid), ["SESSION-1", "SESSION-2"]);
  assert.equal(teacher.data.teacheronly, false);
  assert.equal(teacher.data.viewerhasassignments, true);
  assert.equal(teacher.data.showgrouplabels, true);

  const review = await post("/api/admin/timetable-builder/integration/preview", adminToken, { courseid: courseId });
  assert.equal(review.response.status, 200);
  assert.equal(review.data.currentSource, "PUBLISHED_TIMETABLE");
  assert.equal(review.data.readyToActivate, true);
  assert.equal(review.data.requiredConfirmation, "RETURN TO TEACHERASSIGN");

  const batchesBeforeBadConfirmation = batches.length;
  const badConfirmation = await post("/api/admin/timetable-builder/integration/source/save", adminToken, {
    courseid: courseId,
    source: "TEACHER_ASSIGN",
    confirmation: "RETURN"
  });
  assert.equal(badConfirmation.response.status, 400);
  assert.equal(batches.length, batchesBeforeBadConfirmation);

  const rollback = await post("/api/admin/timetable-builder/integration/source/save", adminToken, {
    courseid: courseId,
    source: "TEACHER_ASSIGN",
    confirmation: "RETURN TO TEACHERASSIGN"
  });
  assert.equal(rollback.response.status, 200);
  assert.equal(rollback.data.liveSource, "TEACHER_ASSIGN");
  assert.equal(systemConfigRows[1][1], "TEACHER_ASSIGN");
  assert.ok(auditRows.some(row => row[5] === "ROLLBACK" && row[6] === "TIMETABLE_LIVE_SOURCE"));

  const wrongPublication = await post("/api/admin/timetable-builder/integration/source/save", adminToken, {
    courseid: courseId,
    source: "PUBLISHED_TIMETABLE",
    publicationid: "OLD-PUBLICATION",
    confirmation: "ACTIVATE PUBLISHED TIMETABLE"
  });
  assert.equal(wrongPublication.response.status, 409);
  assert.equal(wrongPublication.data.code, "TIMETABLE_PUBLICATION_CHANGED");

  const activation = await post("/api/admin/timetable-builder/integration/source/save", adminToken, {
    courseid: courseId,
    source: "PUBLISHED_TIMETABLE",
    publicationid: publicationId,
    confirmation: "ACTIVATE PUBLISHED TIMETABLE"
  });
  assert.equal(activation.response.status, 200);
  assert.equal(systemConfigRows[1][1], "PUBLISHED_TIMETABLE");
  assert.ok(auditRows.some(row => row[5] === "ACTIVATE" && row[6] === "TIMETABLE_LIVE_SOURCE"));

  const originalTeacherName = publishedRows[1][19];
  publishedRows[1][19] = "";
  const failedClosed = await post("/api/student/timetable/get", studentToken, {});
  assert.equal(failedClosed.response.status, 503);
  assert.equal(failedClosed.data.fallbackUsed, false);
  assert.equal(failedClosed.data.code, "PUBLISHED_TIMETABLE_DISPLAY_VALUES_MISSING");
  publishedRows[1][19] = originalTeacherName;
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Published timetable integration, activation, rollback and fail-closed tests passed.");

function valuesForRange(range) {
  if (range === "SystemConfig!A:E") return systemConfigRows;
  if (range === "TimetableCourseState!A:ZZ") return stateRows;
  if (range === "TimetablePublications!A:ZZ") return publicationRows;
  if (range === "PublishedTimetableSessions!A:ZZ") return publishedRows;
  if (range === "TeacherAssign!A:ZZ") return teacherRows;
  if (range === "TimeTable!A:ZZ") return [];
  if (range === "AdminAuditLog!A1:I1") return [auditRows[0]];
  throw new Error(`Unexpected range ${range}`);
}

function applySpreadsheetRequest(request) {
  if (request.updateCells?.range?.sheetId === sheetIds.get("SystemConfig")) {
    systemConfigRows[request.updateCells.range.startRowIndex] = decodeRow(request.updateCells.rows[0]);
    return;
  }
  if (request.appendCells?.sheetId === sheetIds.get("SystemConfig")) {
    systemConfigRows.push(...request.appendCells.rows.map(decodeRow));
    return;
  }
  if (request.appendCells?.sheetId === sheetIds.get("AdminAuditLog")) {
    auditRows.push(...request.appendCells.rows.map(decodeRow));
    return;
  }
  throw new Error(`Unexpected spreadsheet request ${JSON.stringify(request)}`);
}

function decodeRow(row) {
  return row.values.map(cell => {
    const value = cell.userEnteredValue || {};
    if (Object.hasOwn(value, "stringValue")) return value.stringValue;
    if (Object.hasOwn(value, "numberValue")) return value.numberValue;
    if (Object.hasOwn(value, "boolValue")) return value.boolValue;
    return "";
  });
}

async function post(path, token, body) {
  const responseValue = await worker.fetch(new Request(`https://worker.test${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  }), env);
  return { response: responseValue, data: await responseValue.json() };
}

function toPem(bytes, label) {
  const base64 = Buffer.from(bytes).toString("base64");
  return `-----BEGIN ${label}-----\n${base64.match(/.{1,64}/g).join("\n")}\n-----END ${label}-----\n`;
}

function response(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
