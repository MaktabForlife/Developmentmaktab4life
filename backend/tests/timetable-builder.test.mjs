import assert from "node:assert/strict";
import { createSessionToken } from "../src/lib/auth.js";
import {
  COURSE_HEADERS,
  PUBLISHED_TIMETABLE_SESSION_HEADERS,
  TIMETABLE_PUBLICATION_HEADERS,
  TIMETABLE_SESSION_HEADERS,
  TIMETABLE_STATE_HEADERS,
  TIME_SLOT_HEADERS
} from "../src/routes/timetable-builder.js";
import worker from "../src/worker.js";

const courseRows = [
  [...COURSE_HEADERS],
  ["COURSE1", "Evening Maktab", true, "2026-08-01T00:00:00.000Z", "ADMIN0", "Earlier Admin", "", "", ""]
];
const timeSlotRows = [
  [...TIME_SLOT_HEADERS],
  ["SLOT1", "COURSE1", "09:00", "10:00", true, "2026-08-01T00:00:00.000Z", "ADMIN0", "Earlier Admin", "", "", ""],
  ["SLOT2", "COURSE1", "09:30", "10:30", true, "2026-08-01T00:00:00.000Z", "ADMIN0", "Earlier Admin", "", "", ""]
];
const sessionRows = [
  [...TIMETABLE_SESSION_HEADERS],
  ["SESSION-LEGACY-1", "COURSE1", "SLOT1", "Mon", "SUB1", "MOD1", "1", "TEACH1", "", true,
    "2026-08-01T00:00:00.000Z", "ADMIN0", "Earlier Admin", "", "", ""]
];
const stateRows = [[...TIMETABLE_STATE_HEADERS]];
const publicationRows = [[...TIMETABLE_PUBLICATION_HEADERS]];
const publishedSessionRows = [[...PUBLISHED_TIMETABLE_SESSION_HEADERS.slice(0, 14)]];
const subjectRows = [
  ["SubjectID", "SubjectName", "Active", "CreatedDate"],
  ["SUB1", "Qur'an", true, "2026-08-01T00:00:00.000Z"],
  ["SUB2", "Islamic Studies", true, "2026-08-01T00:00:00.000Z"]
];
const moduleRows = [
  ["ModuleID", "ModuleName", "SubjectID", "SubjectName", "SortOrder", "ClassGroup", "Active", "CreatedDate"],
  ["MOD2", "Surah al-Fatihah", "SUB1", "Qur'an", 2, "ALL", true, "2026-08-01T00:00:00.000Z"],
  ["MOD1", "Qa'idah", "SUB1", "Qur'an", 1, "ALL", true, "2026-08-01T00:00:00.000Z"]
];
const adminRows = [
  ["AdminID", "Username", "Role", "Active"],
  ["ADMIN1", "Admin User", "ADMIN", true],
  ["TEACH1", "Teacher One", "TEACHER", true],
  ["TEACH2", "Teacher Two", "TEACHER", true],
  ["TEACH3", "Teacher Three", "TEACHER", true]
];
const studentRows = [
  ["StudentID", "StudentName", "ClassGroup", "Active"],
  ["STU1", "Student One", "1", true],
  ["STU2", "Student Two", "2", true]
];
const systemConfigRows = [
  ["GlobalZoomLink", "https://zoom.test/j/global", "2026-08-01T00:00:00.000Z", "ADMIN0", "Earlier Admin"]
];
const taskRows = [
  ["TaskID", "SubjectID", "TaskName", "ModuleID", "ModuleName", "Active"],
  ["TASK1", "SUB1", "Read Qa'idah", "MOD1", "Qa'idah", true]
];
const auditRows = [[
  "AuditID", "DateStamp", "AdminID", "AdminName", "Role", "Action",
  "RecordType", "RecordID", "ChangedFields"
]];

const rangeRows = {
  "Courses!A:ZZ": courseRows,
  "TimeSlots!A:ZZ": timeSlotRows,
  "TimetableSessions!A:ZZ": sessionRows,
  "TimetableCourseState!A:ZZ": stateRows,
  "TimetablePublications!A:ZZ": publicationRows,
  "PublishedTimetableSessions!A:ZZ": publishedSessionRows,
  "SubjectList!A:ZZ": subjectRows,
  "ModuleList!A:ZZ": moduleRows,
  "AdminRecords!A:ZZ": adminRows,
  "StudentRecords!A:ZZ": studentRows,
  "SystemConfig!A:E": systemConfigRows,
  "TaskList!A:ZZ": taskRows,
  "AdminAuditLog!A1:I1": [auditRows[0]]
};
const appendRows = {
  "Courses!A:I": courseRows,
  "TimeSlots!A:K": timeSlotRows,
  "TimetableSessions!A:P": sessionRows,
  "TimetableCourseState!A:I": stateRows,
  "TimetablePublications!A:G": publicationRows,
  "PublishedTimetableSessions!A:T": publishedSessionRows,
  "AdminAuditLog!A:I": auditRows
};
const sheetIds = new Map([
  ["Courses", 1], ["TimeSlots", 2], ["TimetableSessions", 3],
  ["TimetableCourseState", 4], ["TimetablePublications", 5],
  ["PublishedTimetableSessions", 6], ["AdminAuditLog", 10]
]);
const rowsBySheetId = new Map([
  [1, courseRows], [2, timeSlotRows], [3, sessionRows], [4, stateRows],
  [5, publicationRows], [6, publishedSessionRows], [10, auditRows]
]);

const keyPair = await crypto.subtle.generateKey({
  name: "RSASSA-PKCS1-v1_5",
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256"
}, true, ["sign", "verify"]);
const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey));
const env = {
  SESSION_SECRET: "timetable-builder-test-secret",
  GOOGLE_SPREADSHEET_ID: "timetable-builder-spreadsheet",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "timetable-builder@example.iam.gserviceaccount.com",
    private_key_id: "timetable-builder-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"),
    token_uri: "https://oauth2.googleapis.com/token"
  })
};
const adminToken = await createSessionToken({
  type: "admin", adminid: "ADMIN1", username: "Admin User", role: "ADMIN"
}, env);
const teacherToken = await createSessionToken({
  type: "admin", adminid: "TEACH1", username: "Teacher One", role: "TEACHER"
}, env);

const originalFetch = globalThis.fetch;
const spreadsheetBatches = [];
const valueBatchGets = [];

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  if (url.hostname === "oauth2.googleapis.com") {
    return jsonResponse({ access_token: "mock-timetable-builder-token", expires_in: 3600 });
  }
  if (url.hostname !== "sheets.googleapis.com") throw new Error(`Unexpected fetch: ${url}`);
  assert.equal(init.headers.Authorization, "Bearer mock-timetable-builder-token");
  const method = String(init.method || "GET").toUpperCase();

  if (method === "GET" && url.pathname.endsWith("/values:batchGet")) {
    const ranges = url.searchParams.getAll("ranges");
    valueBatchGets.push(ranges);
    return jsonResponse({
      valueRanges: ranges.map(range => {
        if (!rangeRows[range]) throw new Error(`Unexpected Timetable Builder batch read: ${range}`);
        return { range, values: rangeRows[range] };
      })
    });
  }

  if (method === "GET" && !url.pathname.includes("/values/")) {
    return jsonResponse({ sheets: Array.from(sheetIds, ([title, sheetId]) => ({ properties: { title, sheetId } })) });
  }

  const encoded = url.pathname.split("/values/")[1] || "";
  const append = encoded.endsWith(":append");
  const range = decodeURIComponent(append ? encoded.slice(0, -7) : encoded);
  const body = init.body ? JSON.parse(init.body) : null;

  if (method === "GET") {
    if (!rangeRows[range]) throw new Error(`Unexpected Timetable Builder read: ${range}`);
    return jsonResponse({ values: rangeRows[range] });
  }
  if (method === "POST" && append) {
    if (!appendRows[range]) throw new Error(`Unexpected append: ${range}`);
    appendRows[range].push(...body.values);
    return jsonResponse({ updates: { updatedRange: range, updatedRows: body.values.length } });
  }
  if (method === "PUT") {
    applyValuesUpdate(range, body.values);
    return jsonResponse({ updatedRange: range, updatedRows: body.values.length });
  }
  if (method === "POST" && url.pathname.endsWith(":batchUpdate")) {
    spreadsheetBatches.push(body.requests);
    body.requests.forEach(applySpreadsheetRequest);
    return jsonResponse({ replies: body.requests.map(() => ({})) });
  }
  throw new Error(`Unexpected Timetable Builder request: ${method} ${url}`);
};

try {
  const forbidden = await post("/api/admin/timetable-builder/get", teacherToken, {});
  assert.equal(forbidden.response.status, 403);

  const initial = await post("/api/admin/timetable-builder/get", adminToken, {});
  assert.equal(initial.response.status, 200);
  assert.equal(initial.data.liveSource, "TEACHER_ASSIGN");
  assert.equal(initial.data.publishedSnapshotSchemaReady, false);
  assert.equal(initial.data.publishedSnapshotSource, "PublishedTimetableSessions");
  assert.equal(initial.data.timetablestates[0].stage, "DEVELOPMENT");
  assert.deepEqual(initial.data.groups, ["ALL", "1", "2"]);
  assert.equal(initial.data.globalzoomlink, "https://zoom.test/j/global");
  assert.equal(initial.data.tasks.length, 1);
  assert.equal(initial.data.tasks[0].taskid, "TASK1");
  assert.equal(valueBatchGets.length, 1, "The complete builder load should use one Sheets values batch read");
  assert.equal(valueBatchGets[0].length, 12);
  assert.ok(valueBatchGets[0].includes("TaskList!A:ZZ"));

  const blockedLegacyPublish = await post("/api/admin/timetable-builder/publish", adminToken, { courseid: "COURSE1" });
  assert.equal(blockedLegacyPublish.response.status, 503);
  assert.equal(blockedLegacyPublish.data.code, "PUBLISHED_TIMETABLE_SCHEMA_NOT_READY");
  assert.equal(publicationRows.length, 1, "A blocked publication must not write a publication row");

  const invalidAll = await post("/api/admin/timetable-builder/session/save", adminToken, {
    courseid: "COURSE1", timeslotid: "SLOT2", daysofweek: ["Wed"], subjectid: "SUB1",
    groupassignments: [
      { groupno: "ALL", teacherid: "TEACH1" },
      { groupno: "1", teacherid: "TEACH2" }
    ]
  });
  assert.equal(invalidAll.response.status, 400);
  assert.match(invalidAll.data.error, /ALL by itself/);

  const repeatedTeacher = await post("/api/admin/timetable-builder/session/save", adminToken, {
    courseid: "COURSE1", timeslotid: "SLOT2", daysofweek: ["Wed"], subjectid: "SUB1",
    groupassignments: [
      { groupno: "1", teacherid: "TEACH1" },
      { groupno: "2", teacherid: "TEACH1" }
    ]
  });
  assert.equal(repeatedTeacher.response.status, 409);
  assert.match(repeatedTeacher.data.error, /Teacher One/);
  assert.match(repeatedTeacher.data.error, /groups 1 and 2/);

  const teacherConflict = await post("/api/admin/timetable-builder/session/save", adminToken, {
    courseid: "COURSE1", timeslotid: "SLOT2", daysofweek: ["Mon"], subjectid: "SUB2",
    groupassignments: [{ groupno: "2", teacherid: "TEACH1" }]
  });
  assert.equal(teacherConflict.response.status, 409);
  assert.equal(teacherConflict.data.conflicts[0].type, "TEACHER");
  assert.match(teacherConflict.data.error, /09:00–10:00/);

  const groupConflict = await post("/api/admin/timetable-builder/session/save", adminToken, {
    courseid: "COURSE1", timeslotid: "SLOT2", daysofweek: ["Mon"], subjectid: "SUB2",
    groupassignments: [{ groupno: "1", teacherid: "TEACH2" }]
  });
  assert.equal(groupConflict.response.status, 409);
  assert.ok(groupConflict.data.conflicts.some(conflict => conflict.type === "GROUP"));

  const oldLessons = await post("/api/admin/timetable-builder/session/save", adminToken, {
    courseid: "COURSE1", timeslotid: "SLOT2", daysofweek: ["Wed"],
    lessons: [{ subjectid: "SUB1", teacherid: "TEACH1" }], groupnos: ["1"]
  });
  assert.equal(oldLessons.response.status, 400);
  assert.match(oldLessons.data.error, /replaced by one Subject\/Module/);

  const bulk = await post("/api/admin/timetable-builder/session/save", adminToken, {
    courseid: "COURSE1",
    timeslotid: "SLOT2",
    daysofweek: ["Thursday", "Wednesday", "Wednesday"],
    subjectid: "SUB1",
    moduleid: "MOD2",
    groupassignments: [
      { groupno: "2", teacherid: "TEACH2", zoomlink: "https://zoom.test/j/group2" },
      { groupno: "1", teacherid: "TEACH1", zoomlink: "" }
    ]
  });
  assert.equal(bulk.response.status, 200);
  assert.equal(bulk.data.count, 4);
  assert.deepEqual(bulk.data.sessions.map(session => [session.dayofweek, session.groupno, session.teacherid]), [
    ["Wed", "1", "TEACH1"], ["Wed", "2", "TEACH2"],
    ["Thu", "1", "TEACH1"], ["Thu", "2", "TEACH2"]
  ]);
  assert.ok(bulk.data.sessions.every(session => session.subjectid === "SUB1" && session.moduleid === "MOD2"));
  assert.ok(bulk.data.sessions.every(session => /^SESSION-[0-9a-f-]{20,}$/i.test(session.sessionid)));
  assert.equal(bulk.data.sessions.find(session => session.groupno === "2").zoomlink, "https://zoom.test/j/group2");

  const teacherBulkTargets = bulk.data.sessions.filter(session => session.groupno === "1");
  const teacherOnlyBulk = await post("/api/admin/timetable-builder/session/bulk-update", adminToken, {
    courseid: "COURSE1",
    sessionids: teacherBulkTargets.map(session => session.sessionid),
    applyteacher: true,
    teacherid: "TEACH3"
  });
  assert.equal(teacherOnlyBulk.response.status, 200);
  assert.equal(teacherOnlyBulk.data.count, 2);
  assert.ok(teacherOnlyBulk.data.sessions.every(session => session.teacherid === "TEACH3"));
  assert.ok(teacherOnlyBulk.data.sessions.every(session => session.subjectid === "SUB1"));
  assert.ok(teacherOnlyBulk.data.sessions.every(session => session.moduleid === "MOD2"));
  assert.ok(teacherOnlyBulk.data.sessions.every(session => session.zoomlink === ""));
  assert.ok(auditRows.filter(row => row[5] === "BULK_UPDATE").length >= 2);

  const subjectModuleBulk = await post("/api/admin/timetable-builder/session/bulk-update", adminToken, {
    courseid: "COURSE1",
    sessionids: teacherBulkTargets.map(session => session.sessionid),
    applysubjectmodule: true,
    subjectid: "SUB2",
    moduleid: ""
  });
  assert.equal(subjectModuleBulk.response.status, 200);
  assert.ok(subjectModuleBulk.data.sessions.every(session => session.subjectid === "SUB2"));
  assert.ok(subjectModuleBulk.data.sessions.every(session => session.moduleid === ""));
  assert.ok(subjectModuleBulk.data.sessions.every(session => session.teacherid === "TEACH3"));

  const zoomBulkTargets = bulk.data.sessions.filter(session => session.groupno === "2");
  const clearZoomBulk = await post("/api/admin/timetable-builder/session/bulk-update", adminToken, {
    courseid: "COURSE1",
    sessionids: zoomBulkTargets.map(session => session.sessionid),
    applyzoom: true,
    zoomlink: ""
  });
  assert.equal(clearZoomBulk.response.status, 200);
  assert.ok(clearZoomBulk.data.sessions.every(session => session.zoomlink === ""));
  assert.ok(clearZoomBulk.data.sessions.every(session => session.subjectid === "SUB1"));

  const batchesBeforeNoOp = spreadsheetBatches.length;
  const noOpBulk = await post("/api/admin/timetable-builder/session/bulk-update", adminToken, {
    courseid: "COURSE1",
    sessionids: zoomBulkTargets.map(session => session.sessionid),
    applyzoom: true,
    zoomlink: ""
  });
  assert.equal(noOpBulk.response.status, 200);
  assert.equal(noOpBulk.data.changed, false);
  assert.equal(noOpBulk.data.count, 0);
  assert.equal(
    spreadsheetBatches.length,
    batchesBeforeNoOp,
    "A no-op bulk edit must not write rows or move the timetable stage"
  );

  const wedSessions = sessionRows.slice(1)
    .filter(row => row[3] === "Wed" && row[2] === "SLOT2")
    .map(row => row[0]);
  const conflictingTeacherBefore = sessionRows.find(row => row[0] === wedSessions[1])[7];
  const batchesBeforeConflict = spreadsheetBatches.length;
  const conflictBulk = await post("/api/admin/timetable-builder/session/bulk-update", adminToken, {
    courseid: "COURSE1",
    sessionids: wedSessions,
    applyteacher: true,
    teacherid: "TEACH3"
  });
  assert.equal(conflictBulk.response.status, 409);
  assert.equal(conflictBulk.data.conflict, true);
  assert.equal(spreadsheetBatches.length, batchesBeforeConflict, "A rejected bulk edit must not write any row");
  assert.equal(sessionRows.find(row => row[0] === wedSessions[1])[7], conflictingTeacherBefore);

  publishedSessionRows[0] = [...PUBLISHED_TIMETABLE_SESSION_HEADERS];
  const publish = await post("/api/admin/timetable-builder/publish", adminToken, { courseid: "COURSE1" });
  assert.equal(publish.response.status, 200);
  assert.equal(publish.data.publication.versionno, 1);
  assert.equal(publish.data.publication.sessioncount, 5);
  assert.equal(publish.data.liveSource, "TEACHER_ASSIGN");
  assert.equal(publish.data.publicationBecomesLive, false);
  assert.equal(publicationRows.length, 2);
  assert.equal(publishedSessionRows.length, 6);
  assert.ok(publishedSessionRows.slice(1).every(row => row.length === 20));
  const immutableLegacySnapshot = publishedSessionRows.find(row => row[2] === "SESSION-LEGACY-1");
  assert.deepEqual(immutableLegacySnapshot.slice(14), [
    "Evening Maktab", "09:00", "10:00", "Qur'an", "Qa'idah", "Teacher One"
  ]);
  assert.equal(stateRows[1][1], "PUBLISHED");
  assert.equal(stateRows[1][2], publish.data.publication.publicationid);
  assert.ok(spreadsheetBatches.some(requests => requests.length === 4));

  const publishedGet = await post("/api/admin/timetable-builder/get", adminToken, {});
  assert.equal(publishedGet.data.timetablestates[0].stage, "PUBLISHED");
  assert.equal(publishedGet.data.timetablestates[0].versionno, 1);
  assert.ok(publishedGet.data.sessions.every(session => session.everpublished));

  const draftAddition = await post("/api/admin/timetable-builder/session/save", adminToken, {
    courseid: "COURSE1", timeslotid: "SLOT2", daysofweek: ["Fri"], subjectid: "SUB2",
    groupassignments: [{ groupno: "ALL", teacherid: "TEACH2", zoomlink: "" }]
  });
  assert.equal(draftAddition.response.status, 200);
  assert.equal(stateRows[1][1], "DEVELOPMENT");
  assert.equal(stateRows[1][2], publish.data.publication.publicationid, "Draft edits preserve the snapshot pointer");
  const draftSessionId = draftAddition.data.session.sessionid;

  const hardDelete = await post("/api/admin/timetable-builder/session/delete", adminToken, {
    sessionid: draftSessionId, mode: "HARD"
  });
  assert.equal(hardDelete.response.status, 200);
  assert.equal(hardDelete.data.deletionmode, "HARD");
  assert.equal(sessionRows.some(row => row[0] === draftSessionId), false);
  assert.ok(auditRows.some(row => row[5] === "HARD_DELETE" && row[7] === draftSessionId));

  const publishedSessionId = bulk.data.sessions[0].sessionid;
  const prohibitedHardDelete = await post("/api/admin/timetable-builder/session/delete", adminToken, {
    sessionid: publishedSessionId, mode: "HARD"
  });
  assert.equal(prohibitedHardDelete.response.status, 409);
  assert.equal(prohibitedHardDelete.data.deletionmode, "SOFT");

  const softDelete = await post("/api/admin/timetable-builder/session/delete", adminToken, {
    sessionid: publishedSessionId
  });
  assert.equal(softDelete.response.status, 200);
  assert.equal(softDelete.data.deletionmode, "SOFT");
  assert.equal(sessionRows.find(row => row[0] === publishedSessionId)[9], false);

  const restore = await post("/api/admin/timetable-builder/session/restore", adminToken, { sessionid: publishedSessionId });
  assert.equal(restore.response.status, 200);
  assert.equal(sessionRows.find(row => row[0] === publishedSessionId)[9], true);
  assert.ok(auditRows.some(row => row[5] === "RESTORE" && row[7] === publishedSessionId));
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Timetable Builder backend tests passed.");

function applyValuesUpdate(range, values) {
  const match = /^([^!]+)!A(\d+):[A-Z]+\d+$/.exec(range);
  if (!match) throw new Error(`Unsupported values update: ${range}`);
  const sheetName = match[1];
  const rowIndex = Number(match[2]) - 1;
  const rows = rowsBySheetId.get(sheetIds.get(sheetName));
  if (!rows) throw new Error(`Unknown update sheet: ${sheetName}`);
  rows[rowIndex] = [...values[0]];
}

function applySpreadsheetRequest(request) {
  if (request.appendCells) {
    rowsBySheetId.get(request.appendCells.sheetId).push(...request.appendCells.rows.map(decodeCellRow));
    return;
  }
  if (request.updateCells) {
    rowsBySheetId.get(request.updateCells.range.sheetId)[request.updateCells.range.startRowIndex] = decodeCellRow(request.updateCells.rows[0]);
    return;
  }
  if (request.deleteDimension) {
    rowsBySheetId.get(request.deleteDimension.range.sheetId).splice(
      request.deleteDimension.range.startIndex,
      request.deleteDimension.range.endIndex - request.deleteDimension.range.startIndex
    );
    return;
  }
  throw new Error(`Unsupported spreadsheet request: ${JSON.stringify(request)}`);
}

function decodeCellRow(row) {
  return row.values.map(cell => {
    const value = cell.userEnteredValue || {};
    if (Object.hasOwn(value, "boolValue")) return value.boolValue;
    if (Object.hasOwn(value, "numberValue")) return value.numberValue;
    return value.stringValue || "";
  });
}

async function post(path, token, body) {
  const response = await worker.fetch(new Request(`https://worker.test${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  }), env);
  return { response, data: await response.json() };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

function toPem(bytes, label) {
  const base64 = Buffer.from(bytes).toString("base64");
  const lines = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
}
