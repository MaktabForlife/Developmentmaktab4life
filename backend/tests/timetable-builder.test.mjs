import assert from "node:assert/strict";
import { createSessionToken } from "../src/lib/auth.js";
import {
  COURSE_HEADERS,
  TIME_SLOT_HEADERS,
  TIMETABLE_SESSION_HEADERS
} from "../src/routes/timetable-builder.js";
import worker from "../src/worker.js";

const courseRows = [
  [...COURSE_HEADERS],
  ["COURSE1", "Evening Maktab", true, "2026-08-01T00:00:00.000Z", "ADMIN0", "Earlier Admin", "", "", ""]
];
const timeSlotRows = [
  [...TIME_SLOT_HEADERS],
  ["SLOT1", "COURSE1", "09:00", "10:00", true, "2026-08-01T00:00:00.000Z", "ADMIN0", "Earlier Admin", "", "", ""]
];
const sessionRows = [
  [...TIMETABLE_SESSION_HEADERS],
  ["SESSION1", "COURSE1", "SLOT1", "Mon", "SUB1", "MOD1", "1", "TEACH1", "", true,
    "2026-08-01T00:00:00.000Z", "ADMIN0", "Earlier Admin", "", "", ""]
];
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
  ["TEACH2", "Teacher Two", "TEACHER", true]
];
const studentRows = [
  ["StudentID", "StudentName", "ClassGroup", "Active"],
  ["STU1", "Student One", "1", true],
  ["STU2", "Student Two", "2", true],
  ["STU3", "Inactive Student", "4", false]
];
const systemConfigRows = [
  ["GlobalZoomLink", "https://zoom.test/j/global", "2026-08-01T00:00:00.000Z", "ADMIN0", "Earlier Admin"]
];
const auditRows = [[
  "AuditID", "DateStamp", "AdminID", "AdminName", "Role", "Action",
  "RecordType", "RecordID", "ChangedFields"
]];

const keyPair = await crypto.subtle.generateKey(
  {
    name: "RSASSA-PKCS1-v1_5",
    modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]),
    hash: "SHA-256"
  },
  true,
  ["sign", "verify"]
);
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
  type: "admin",
  adminid: "ADMIN1",
  username: "Admin User",
  role: "ADMIN"
}, env);
const teacherToken = await createSessionToken({
  type: "admin",
  adminid: "TEACH1",
  username: "Teacher One",
  role: "TEACHER"
}, env);

const originalFetch = globalThis.fetch;
const writes = [];

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  if (url.hostname === "oauth2.googleapis.com") {
    return jsonResponse({ access_token: "mock-timetable-builder-token", expires_in: 3600 });
  }
  if (url.hostname !== "sheets.googleapis.com") {
    throw new Error(`Unexpected Timetable Builder fetch: ${url}`);
  }

  assert.equal(init.headers.Authorization, "Bearer mock-timetable-builder-token");
  const encoded = url.pathname.split("/values/")[1] || "";
  const append = encoded.endsWith(":append");
  const range = decodeURIComponent(append ? encoded.slice(0, -7) : encoded);
  const method = String(init.method || "GET").toUpperCase();
  const body = init.body ? JSON.parse(init.body) : null;

  if (method === "GET") {
    const rowsByRange = {
      "Courses!A:ZZ": courseRows,
      "TimeSlots!A:ZZ": timeSlotRows,
      "TimetableSessions!A:ZZ": sessionRows,
      "SubjectList!A:ZZ": subjectRows,
      "ModuleList!A:ZZ": moduleRows,
      "AdminRecords!A:ZZ": adminRows,
      "StudentRecords!A:ZZ": studentRows,
      "SystemConfig!A:E": systemConfigRows,
      "AdminAuditLog!A1:I1": [auditRows[0]]
    };
    if (!rowsByRange[range]) throw new Error(`Unexpected Timetable Builder read: ${range}`);
    return jsonResponse({ values: rowsByRange[range] });
  }

  if (method === "POST" && append) {
    writes.push({ method, range, values: body.values });
    if (range === "Courses!A:I") courseRows.push(...body.values);
    if (range === "TimeSlots!A:K") timeSlotRows.push(...body.values);
    if (range === "TimetableSessions!A:P") sessionRows.push(...body.values);
    if (range === "AdminAuditLog!A:I") auditRows.push(...body.values);
    return jsonResponse({ updates: { updatedRange: range, updatedRows: body.values.length } });
  }

  if (method === "PUT") {
    writes.push({ method, range, values: body.values });
    return jsonResponse({ updatedRange: range, updatedRows: body.values.length });
  }

  throw new Error(`Unexpected Timetable Builder request: ${method} ${range}`);
};

try {
  const forbidden = await post("/api/admin/timetable-builder/get", teacherToken, {});
  assert.equal(forbidden.response.status, 403);
  assert.deepEqual(forbidden.data, { success: false, error: "Forbidden" });

  const initial = await post("/api/admin/timetable-builder/get", adminToken, {});
  assert.equal(initial.response.status, 200);
  assert.equal(initial.response.headers.get("X-M4L-Feature"), "timetable-builder");
  assert.equal(initial.data.success, true);
  assert.equal(initial.data.liveSource, "TeacherAssign");
  assert.equal(initial.data.builderSource, "TimetableSessions");
  assert.equal(initial.data.published, false);
  assert.deepEqual(initial.data.days, ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]);
  assert.equal(initial.data.globalzoomlink, "https://zoom.test/j/global");
  assert.deepEqual(initial.data.groups, ["ALL", "1", "2"]);
  assert.deepEqual(initial.data.modules.map(module => module.moduleid), ["MOD1", "MOD2"]);
  assert.equal(initial.data.sessions[0].teachername, "Teacher One");

  const invalidSlot = await post("/api/admin/timetable-builder/time-slot/save", adminToken, {
    courseid: "COURSE1",
    startTime: "11:00",
    endTime: "10:00"
  });
  assert.equal(invalidSlot.response.status, 400);
  assert.match(invalidSlot.data.error, /End time/);

  const course = await post("/api/admin/timetable-builder/course/save", adminToken, {
    courseName: "Weekend Maktab",
    active: true
  });
  assert.equal(course.data.success, true);
  assert.equal(course.data.course.courseid, "COURSE2");
  assert.equal(courseRows.at(-1)[4], "ADMIN1");
  assert.equal(courseRows.at(-1)[5], "Admin User");

  const slot = await post("/api/admin/timetable-builder/time-slot/save", adminToken, {
    courseid: "COURSE1",
    startTime: "09:30",
    endTime: "10:30",
    active: true
  });
  assert.equal(slot.data.success, true);
  assert.equal(slot.data.timeslot.timeslotid, "SLOT2");
  assert.equal(slot.data.timeslot.endtime, "10:30");

  const sessionWritesBeforeConflict = writes.filter(write => write.range === "TimetableSessions!A:P").length;
  const conflict = await post("/api/admin/timetable-builder/session/save", adminToken, {
    courseid: "COURSE1",
    timeslotid: "SLOT2",
    dayofweek: "Monday",
    subjectid: "SUB1",
    moduleid: "MOD1",
    groupno: "2",
    teacherid: "TEACH1",
    active: true
  });
  assert.equal(conflict.response.status, 409);
  assert.equal(conflict.data.conflict, true);
  assert.equal(conflict.data.conflicts[0].type, "TEACHER");
  assert.match(conflict.data.error, /Teacher One/);
  assert.match(conflict.data.error, /Mon/);
  assert.match(conflict.data.error, /09:00–10:00/);
  assert.match(conflict.data.error, /Evening Maktab/);
  assert.equal(
    writes.filter(write => write.range === "TimetableSessions!A:P").length,
    sessionWritesBeforeConflict,
    "A conflict must not write any session rows"
  );

  const groupConflict = await post("/api/admin/timetable-builder/session/save", adminToken, {
    courseid: "COURSE1",
    timeslotid: "SLOT2",
    daysofweek: ["Mon", "Wed"],
    subjectid: "SUB2",
    groupnos: ["1", "2"],
    teacherid: "TEACH2",
    active: true
  });
  assert.equal(groupConflict.response.status, 409);
  assert.equal(groupConflict.data.conflict, true);
  assert.ok(groupConflict.data.conflicts.some(item => item.type === "GROUP"));
  assert.ok(groupConflict.data.conflicts.some(item => /Group 1/.test(item.message)));
  assert.ok(groupConflict.data.conflicts.some(item => /Mon/.test(item.message) && /09:00–10:00/.test(item.message)));
  assert.equal(
    writes.filter(write => write.range === "TimetableSessions!A:P").length,
    sessionWritesBeforeConflict,
    "One conflicting combination must prevent the complete bulk write"
  );

  const multiLessonConflict = await post("/api/admin/timetable-builder/session/save", adminToken, {
    courseid: "COURSE1",
    timeslotid: "SLOT2",
    daysofweek: ["Mon"],
    groupnos: ["2"],
    lessons: [
      { subjectid: "SUB2", teacherid: "TEACH2", zoomlink: "" },
      { subjectid: "SUB2", teacherid: "TEACH1", zoomlink: "" }
    ],
    active: true
  });
  assert.equal(multiLessonConflict.response.status, 409);
  assert.equal(multiLessonConflict.data.conflict, true);
  assert.ok(multiLessonConflict.data.conflicts.some(item => item.lessonindex === 2));
  assert.ok(multiLessonConflict.data.conflicts.some(item => /Lesson 2 \(Islamic Studies\)/.test(item.message)));
  assert.equal(
    writes.filter(write => write.range === "TimetableSessions!A:P").length,
    sessionWritesBeforeConflict,
    "A conflict in one lesson must prevent every lesson in the batch from being written"
  );

  const invalidAllSelection = await post("/api/admin/timetable-builder/session/save", adminToken, {
    courseid: "COURSE1",
    timeslotid: "SLOT2",
    daysofweek: ["Wed"],
    subjectid: "SUB1",
    groupnos: ["ALL", "1"],
    teacherid: "TEACH2",
    active: true
  });
  assert.equal(invalidAllSelection.response.status, 400);
  assert.match(invalidAllSelection.data.error, /ALL by itself/);

  const session = await post("/api/admin/timetable-builder/session/save", adminToken, {
    courseid: "COURSE1",
    timeslotid: "SLOT2",
    dayofweek: "Tuesday",
    subjectid: "SUB1",
    moduleid: "MOD2",
    groupno: "ALL",
    teacherid: "TEACH2",
    zoomlink: "",
    active: true
  });
  assert.equal(session.data.success, true);
  assert.equal(session.data.session.sessionid, "SESSION2");
  assert.equal(session.data.session.dayofweek, "Tue");
  assert.equal(session.data.session.zoomlink, "");
  assert.equal(sessionRows.at(-1)[11], "ADMIN1");
  assert.equal(sessionRows.at(-1)[12], "Admin User");

  const bulk = await post("/api/admin/timetable-builder/session/save", adminToken, {
    courseid: "COURSE1",
    timeslotid: "SLOT2",
    daysofweek: ["Thursday", "Wednesday", "Wednesday"],
    subjectid: "SUB1",
    moduleid: "MOD1",
    groupnos: ["2", "1", "2"],
    teacherid: "TEACH1",
    active: true
  });
  assert.equal(bulk.response.status, 200);
  assert.equal(bulk.data.success, true);
  assert.equal(bulk.data.count, 4);
  assert.equal(bulk.data.message, "4 sessions created");
  assert.deepEqual(bulk.data.sessions.map(item => [item.sessionid, item.dayofweek, item.groupno]), [
    ["SESSION3", "Wed", "1"],
    ["SESSION4", "Wed", "2"],
    ["SESSION5", "Thu", "1"],
    ["SESSION6", "Thu", "2"]
  ]);
  assert.deepEqual(sessionRows.slice(-4).map(row => [row[3], row[6]]), [
    ["Wed", "1"], ["Wed", "2"], ["Thu", "1"], ["Thu", "2"]
  ]);
  assert.ok(sessionRows.slice(-4).every(row => row[11] === "ADMIN1" && row[12] === "Admin User"));

  const sessionWritesBeforeDuplicateLessons = writes.filter(write => write.range === "TimetableSessions!A:P").length;
  const duplicateLessons = await post("/api/admin/timetable-builder/session/save", adminToken, {
    courseid: "COURSE1",
    timeslotid: "SLOT2",
    daysofweek: ["Fri"],
    groupnos: ["1"],
    lessons: [
      { subjectid: "SUB1", moduleid: "MOD1", teacherid: "TEACH1", zoomlink: "" },
      { subjectid: "SUB1", moduleid: "MOD1", teacherid: "TEACH1", zoomlink: "" }
    ],
    active: true
  });
  assert.equal(duplicateLessons.response.status, 400);
  assert.match(duplicateLessons.data.error, /Lesson 2 duplicates lesson 1/);
  assert.equal(
    writes.filter(write => write.range === "TimetableSessions!A:P").length,
    sessionWritesBeforeDuplicateLessons
  );

  const multiLesson = await post("/api/admin/timetable-builder/session/save", adminToken, {
    courseid: "COURSE1",
    timeslotid: "SLOT2",
    daysofweek: ["Fri"],
    groupnos: ["2", "1"],
    lessons: [
      { subjectid: "SUB1", moduleid: "MOD1", teacherid: "TEACH1", zoomlink: "" },
      { subjectid: "SUB2", moduleid: "", teacherid: "TEACH2", zoomlink: "https://zoom.test/j/islamic" }
    ],
    active: true
  });
  assert.equal(multiLesson.response.status, 200);
  assert.equal(multiLesson.data.success, true);
  assert.equal(multiLesson.data.count, 4);
  assert.equal(multiLesson.data.lessoncount, 2);
  assert.equal(multiLesson.data.message, "4 sessions created");
  assert.deepEqual(multiLesson.data.sessions.map(item => [
    item.sessionid, item.dayofweek, item.groupno, item.subjectid, item.moduleid, item.teacherid
  ]), [
    ["SESSION7", "Fri", "1", "SUB1", "MOD1", "TEACH1"],
    ["SESSION8", "Fri", "1", "SUB2", "", "TEACH2"],
    ["SESSION9", "Fri", "2", "SUB1", "MOD1", "TEACH1"],
    ["SESSION10", "Fri", "2", "SUB2", "", "TEACH2"]
  ]);
  assert.equal(multiLesson.data.sessions[1].zoomlink, "https://zoom.test/j/islamic");
  assert.equal(
    writes.filter(write => write.range === "TimetableSessions!A:P").length,
    sessionWritesBeforeDuplicateLessons + 1,
    "Every generated lesson/day/group row must be appended in one Sheet write"
  );
  assert.ok(sessionRows.slice(-4).every(row => row[11] === "ADMIN1" && row[12] === "Admin User"));

  const existingBatchLesson = await post("/api/admin/timetable-builder/session/save", adminToken, {
    sessionid: "SESSION7",
    courseid: "COURSE1",
    timeslotid: "SLOT2",
    dayofweek: "Fri",
    groupno: "1",
    lessons: [
      { subjectid: "SUB1", moduleid: "MOD1", teacherid: "TEACH1", zoomlink: "" }
    ],
    active: true
  });
  assert.equal(existingBatchLesson.response.status, 200);
  assert.equal(existingBatchLesson.data.success, true);
  assert.equal(existingBatchLesson.data.message, "No session changes requested");

  assert.ok(auditRows.some(row => row[5] === "CREATE" && row[6] === "COURSE" && row[7] === "COURSE2"));
  assert.ok(auditRows.some(row => row[5] === "CREATE" && row[6] === "TIME_SLOT" && row[7] === "SLOT2"));
  assert.ok(auditRows.some(row => row[5] === "CREATE" && row[6] === "TIMETABLE_SESSION" && row[7] === "SESSION2"));
  assert.equal(auditRows.filter(row => /^SESSION[3-6]$/.test(row[7])).length, 4);
  assert.equal(auditRows.filter(row => /^SESSION(?:7|8|9|10)$/.test(row[7])).length, 4);
  assert.equal(writes.filter(write => write.range === "TimetableSessions!A:P").length, 3);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Timetable Builder backend tests passed.");

async function post(path, token, body) {
  const response = await worker.fetch(new Request(`https://worker.test${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  }), env);
  return { response, data: await response.json() };
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function toPem(bytes, label) {
  const base64 = Buffer.from(bytes).toString("base64");
  const lines = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
}
