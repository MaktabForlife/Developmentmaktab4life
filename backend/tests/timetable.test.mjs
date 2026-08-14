import assert from "node:assert/strict";
import worker from "../src/worker.js";
import { buildTimetableResponse } from "../src/routes/timetable.js";

const teacherRows = [
  [
    "SessionID",
    "SubjectID",
    "SubjectName",
    "DayofWeek",
    "StartTime",
    "ZoomLink",
    "GroupNo",
    "AssignedTeacher",
    "CoureName",
    "Active",
    "ModuleID",
    "ModuleName",
    "ModuleNo"
  ],
  ["TA1", "SUB1", "Quraan", "Mon", "09:00", "https://zoom.test/session-quran", "1", "ADMIN1", "Course A", true, "MOD1", "Entered name", "99"],
  ["TA2", "SUB1", "Quran", "Mon", "09:00", "", "2", "ADMIN2", "Course A", true, "", "", ""],
  ["TA3", "SUB2", "Fiqh", "Tue", "10:00", "", "ALL", "ADMIN1", "Course A", true, "MOD404", "Unknown", "4"],
  ["TA4", "SUB3", "Hadith", "Wed", "11:00", "", "1", "ADMIN3", "Course A", true, "MOD3", "Entered Hadith", "3"],
  ["TA5", "SUB4", "History", "Thur", "12:00", "", "2", "ADMIN404", "Course A", true, "", "", ""],
  ["TA6", "SUB5", "Review", "Fri", "13:00", "", "0", "ADMIN2", "Course A", true, "", "", ""],
  ["TA7", "SUB6", "Inactive row", "Fri", "14:00", "", "1", "ADMIN1", "Course A", false, "", "", ""],
  ["TA8", "SUB2", "Fiqh", "Tue", "10:30", "", "1", "ADMIN1", "Course A", true, "", "", ""],
  ["TA9", "SUB2", "Fiqh", "Tue", "10:30", "", "1", "ADMIN2", "Course A", true, "", "", ""]
];

const adminRows = [
  ["adminid", "username", "uniqueid", "pinsetup", "pinhash", "role", "assignedgroup", "active"],
  ["ADMIN1", "Teacher A", "A", true, "hash", "ADMIN", "ALL", true],
  ["ADMIN2", "Teacher B", "B", true, "hash", "ADMIN", "1", true],
  ["ADMIN3", "Inactive Teacher", "C", true, "hash", "TEACHER", "1", false]
];

const subjectRows = [
  ["SubjectID", "SubjectName", "Active"],
  ["SUB1", "Quran", true],
  ["SUB2", "Fiqh", true],
  ["SUB3", "Hadith", true],
  ["SUB4", "History", true],
  ["SUB5", "Review", true],
  ["SUB6", "Inactive row", true]
];

const moduleRows = [
  ["ModuleID", "ModuleName", "SubjectID", "SubjectName", "Sort Order", "Active"],
  ["MOD1", "Part-1", "SUB1", "Quran", 1, true],
  ["MOD2", "Part-2", "SUB1", "Quran", 2, true],
  ["MOD3", "Hadith foundations", "SUB3", "Hadith", 1, true],
  ["MOD4", "Inactive module", "SUB2", "Fiqh", 2, false]
];

const legacyRows = [
  ["SessionID", "SubjectID", "SubjectName", "DayofWeek", "StartTime", "ZoomLink", "GroupNo", "AssignedTeacher"],
  ["S1", "SUB1", "Quran", "Mon", "09:00", "https://zoom.test/global", "ALL", "ALL"]
];

const transformed = buildTimetableResponse(teacherRows, {
  adminRows,
  subjectRows,
  moduleRows,
  legacyRows,
  groupNo: " 1 ",
  teacherId: "ALL",
  viewerAdminId: "ADMIN1"
});

assert.equal(transformed.success, true);
assert.equal(transformed.timetablesource, "TeacherAssign");
assert.equal(transformed.zoomlink, "https://zoom.test/global");
assert.equal(transformed.zoomsource, "TimeTable");
assert.equal(transformed.viewerhasassignments, true);
assert.equal(transformed.showgrouplabels, false);
assert.deepEqual(
  transformed.sessions.map(session => session.sessionid),
  ["TA1", "TA3", "TA4", "TA8", "TA9"]
);
assert.equal(transformed.sessions[0].subjectname, "Quran", "SubjectID must resolve the canonical SubjectList name");
assert.equal(transformed.sessions[0].teacherid, "ADMIN1");
assert.equal(transformed.sessions[0].teachername, "Teacher A");
assert.equal(transformed.sessions[0].zoomlink, "https://zoom.test/session-quran", "TeacherAssign ZoomLink must remain session-specific");
assert.equal(transformed.sessions[0].moduleid, "MOD1");
assert.equal(transformed.sessions[0].modulename, "Part-1", "ModuleID must resolve the canonical ModuleList name");
assert.equal(transformed.sessions[0].moduleno, "1", "ModuleID must resolve the canonical ModuleList order");
assert.equal(transformed.sessions[0].moduleassigned, true);
assert.equal(transformed.sessions.find(session => session.sessionid === "TA4").assignmentstatus, "teacher-inactive");
assert.equal(transformed.sessions.find(session => session.sessionid === "TA4").teachername, "Teacher not assigned");
assert.equal(transformed.sessions.find(session => session.sessionid === "TA8").assignmentconflict, true);
assert.equal(transformed.sessions.find(session => session.sessionid === "TA9").assignmentconflict, true);
assert.equal(transformed.warnings.some(warning => warning.code === "MODULE_NOT_FOUND"), true);
assert.equal(transformed.warnings.some(warning => warning.code === "MULTIPLE_TEACHER_ASSIGNMENTS"), true);
assert.equal(transformed.sessions.some(session => session.sessionid === "TA7"), false, "Inactive TeacherAssign rows must be excluded");

const systemConfiguredZoom = buildTimetableResponse(teacherRows, {
  adminRows,
  subjectRows,
  moduleRows,
  legacyRows,
  globalZoomLink: "https://zoom.test/system-config",
  globalZoomConfigured: true,
  groupNo: "1"
});
assert.equal(systemConfiguredZoom.zoomlink, "https://zoom.test/system-config");
assert.equal(systemConfiguredZoom.zoomsource, "SystemConfig");

const oversight = buildTimetableResponse(teacherRows, {
  adminRows,
  subjectRows,
  moduleRows,
  legacyRows,
  groupNo: "ALL",
  viewerAdminId: "ADMIN9",
  showGroupLabels: true
});
assert.equal(oversight.viewerhasassignments, false, "An oversight-only admin must not trigger greying");
assert.equal(oversight.showgrouplabels, true);

const literalGroupZero = buildTimetableResponse(teacherRows, {
  adminRows,
  subjectRows,
  moduleRows,
  groupNo: "0"
});
assert.deepEqual(
  literalGroupZero.sessions.map(session => session.sessionid),
  ["TA3", "TA6"],
  "A literal GroupNo 0 filter must include only ALL and Group 0 rows"
);

const allGroupsStudent = buildTimetableResponse(teacherRows, {
  adminRows,
  subjectRows,
  moduleRows,
  groupNo: "ALL",
  allGroupsStudent: true,
  showGroupLabels: true
});
assert.deepEqual(
  allGroupsStudent.sessions.map(session => session.sessionid),
  ["TA1", "TA2", "TA3", "TA4", "TA5", "TA6", "TA8", "TA9"],
  "Student ClassGroup 0 must receive every active TeacherAssign group"
);
assert.equal(allGroupsStudent.sessions.find(session => session.sessionid === "TA5").assignmentstatus, "teacher-not-found");

assert.equal(buildTimetableResponse([]).success, true);
assert.equal(buildTimetableResponse([]).count, 0);

const badHeaders = buildTimetableResponse([
  ["SubjectName", "DayofWeek"],
  ["Quran", "Monday"]
]);
assert.equal(badHeaders.success, false);
assert.match(badHeaders.error, /TeacherAssign sheet must include/);

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
const sessionSecret = "timetable-test-secret";
const directEnv = {
  SESSION_SECRET: sessionSecret,
  GOOGLE_SPREADSHEET_ID: "test-spreadsheet",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "timetable-test@example.iam.gserviceaccount.com",
    private_key_id: "timetable-test-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"),
    token_uri: "https://oauth2.googleapis.com/token"
  }),
  M4L_BACKEND_TIMETABLE_READ: "google-sheets",
  M4L_BACKEND_TIMETABLE_WRITE: "google-sheets"
};
const studentToken = await makeSessionToken({
  type: "student",
  studentid: "STUDENT1",
  classgroup: "1"
}, sessionSecret);
const allGroupsStudentToken = await makeSessionToken({
  type: "student",
  studentid: "STUDENT0",
  classgroup: "0"
}, sessionSecret);
const teachingAdminToken = await makeSessionToken({
  type: "admin",
  adminid: "ADMIN1",
  username: "Teacher A",
  role: "ADMIN",
  assignedgroup: "ALL"
}, sessionSecret);
const teacherToken = await makeSessionToken({
  type: "admin",
  adminid: "ADMIN2",
  username: "Teacher B",
  role: "TEACHER",
  assignedgroup: "1"
}, sessionSecret);
const oversightAdminToken = await makeSessionToken({
  type: "admin",
  adminid: "ADMIN9",
  username: "Oversight Admin",
  role: "ADMIN",
  assignedgroup: "0"
}, sessionSecret);
const seniorToken = await makeSessionToken({
  type: "admin",
  adminid: "ADMIN8",
  username: "Senior Admin",
  role: "SENIOR",
  assignedgroup: "ALL"
}, sessionSecret);
const originalFetch = globalThis.fetch;
const requestedRanges = [];
const sheetUpdates = [];
const sheetAppends = [];
const auditRows = [[
  "AuditID", "DateStamp", "AdminID", "AdminName", "Role", "Action",
  "RecordType", "RecordID", "ChangedFields"
]];
let missingSheetName = "";
let directLegacyRows = legacyRows.map(row => row.slice());
const systemConfigRows = [
  ["StudentLoginBaseUrl", "https://development.example.test/student/"]
];

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));

  if (url.hostname === "oauth2.googleapis.com") {
    return response({ access_token: "mock-timetable-token", expires_in: 3600 });
  }

  if (url.hostname === "sheets.googleapis.com") {
    assert.equal(init.headers.Authorization, "Bearer mock-timetable-token");
    const rangeAndAction = decodeURIComponent(url.pathname.split("/values/")[1] || "");
    const isAppend = rangeAndAction.endsWith(":append");
    const range = isAppend ? rangeAndAction.slice(0, -":append".length) : rangeAndAction;

    if ((init.method || "GET") === "PUT") {
      sheetUpdates.push({ range, body: JSON.parse(init.body) });
      return response({ updatedRows: 1 });
    }

    if ((init.method || "GET") === "POST" && isAppend) {
      const payload = JSON.parse(init.body);

      if (range === "AdminAuditLog!A:I") {
        auditRows.push(...payload.values);
        return response({ updates: { updatedRows: payload.values.length } });
      }

      sheetAppends.push({ range, body: payload });

      if (range === "SystemConfig!A:E") {
        systemConfigRows.push(...payload.values);
        return response({ updates: { updatedRows: payload.values.length } });
      }

      throw new Error(`Unexpected Sheets append range: ${range}`);
    }

    requestedRanges.push(range);

    if (missingSheetName && range.startsWith(`${missingSheetName}!`)) {
      return response({
        error: { message: `Unable to parse range: ${range}` }
      }, 400);
    }

    if (range === "TeacherAssign!A:ZZ") return response({ values: teacherRows });
    if (range === "AdminRecords!A:ZZ") return response({ values: adminRows });
    if (range === "SubjectList!A:ZZ") return response({ values: subjectRows });
    if (range === "ModuleList!A:ZZ") return response({ values: moduleRows });
    if (range === "TimeTable!A:ZZ") return response({ values: directLegacyRows });
    if (range === "SystemConfig!A:E") return response({ values: systemConfigRows });
    if (range === "AdminAuditLog!A1:I1") return response({ values: [auditRows[0]] });
    throw new Error(`Unexpected Sheets range: ${range}`);
  }

  throw new Error(`Unexpected direct-timetable fetch: ${url}`);
};

try {
  const unauthorized = await worker.fetch(new Request(
    "https://worker.test/api/timetable/get",
    { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }
  ), directEnv);
  assert.equal(unauthorized.status, 401);
  assert.equal(unauthorized.headers.get("X-M4L-Feature"), "timetable-read");
  assert.equal(unauthorized.headers.get("X-M4L-Backend"), "google-sheets");

  const studentResult = await postTimetable(
    "/api/student/timetable/get",
    studentToken,
    { groupNo: "2", teacherId: "ADMIN2" },
    directEnv
  );
  assert.equal(studentResult.response.status, 200);
  assert.equal(studentResult.data.groupno, "1", "Student reads must use the authenticated group");
  assert.equal(studentResult.data.teacherid, "ALL", "Students must not filter out other teachers");
  assert.deepEqual(
    studentResult.data.sessions.map(session => session.sessionid),
    ["TA1", "TA3", "TA4", "TA8", "TA9"]
  );

  const allGroupsResult = await postTimetable(
    "/api/student/timetable/get",
    allGroupsStudentToken,
    { groupNo: "1", teacherId: "ADMIN1" },
    directEnv
  );
  assert.equal(allGroupsResult.data.groupno, "ALL");
  assert.equal(allGroupsResult.data.showgrouplabels, true);
  assert.equal(allGroupsResult.data.count, 8, "Student Group 0 must receive all active timetable rows");

  const teachingAdminResult = await postTimetable(
    "/api/admin/timetable/get",
    teachingAdminToken,
    {},
    directEnv
  );
  assert.equal(teachingAdminResult.data.groupno, "ALL");
  assert.equal(teachingAdminResult.data.vieweradminid, "ADMIN1");
  assert.equal(teachingAdminResult.data.viewerhasassignments, true);
  assert.equal(teachingAdminResult.data.count, 8, "Teaching admins must receive the complete timetable for visual greying");

  const teacherOnlyResult = await postTimetable(
    "/api/admin/timetable/get",
    teacherToken,
    { groupNo: "1", teacherId: "ADMIN1" },
    directEnv
  );
  assert.equal(teacherOnlyResult.data.groupno, "ALL");
  assert.equal(teacherOnlyResult.data.teacherid, "ADMIN2");
  assert.equal(teacherOnlyResult.data.viewerrole, "TEACHER");
  assert.equal(teacherOnlyResult.data.teacheronly, true);
  assert.equal(teacherOnlyResult.data.showgrouplabels, true);
  assert.deepEqual(
    teacherOnlyResult.data.sessions.map(session => session.sessionid),
    ["TA2", "TA6", "TA9"],
    "A TEACHER request must be restricted to the authenticated AdminID across its assigned groups"
  );

  const oversightResult = await postTimetable(
    "/api/admin/timetable/get",
    oversightAdminToken,
    {},
    directEnv
  );
  assert.equal(oversightResult.data.viewerhasassignments, false);
  assert.equal(oversightResult.data.count, 8, "AssignedGroup 0 must not restrict or grant scope; oversight policy supplies the full board");

  const selectedTeacherResult = await postTimetable(
    "/api/timetable/get",
    teachingAdminToken,
    { groupNo: "2", teacherId: "ADMIN2" },
    directEnv
  );
  assert.deepEqual(
    selectedTeacherResult.data.sessions.map(session => session.sessionid),
    ["TA2"],
    "Weekly Planner filtering must use the stable teacher AdminID"
  );

  missingSheetName = "TeacherAssign";
  const missingResult = await postTimetable(
    "/api/timetable/get",
    studentToken,
    {},
    directEnv
  );
  assert.deepEqual(missingResult.data, {
    success: false,
    error: "TeacherAssign sheet not found",
    sessions: [],
    zoomlink: "",
    timetablesource: "TeacherAssign"
  });

  missingSheetName = "";
  sheetUpdates.length = 0;
  sheetAppends.length = 0;
  directLegacyRows = legacyRows.map(row => row.slice());

  const forbiddenSeniorZoomWrite = await postTimetable(
    "/api/admin/timetable/update-zoom",
    seniorToken,
    { zoomlink: "https://zoom.test/senior-blocked" },
    directEnv
  );
  assert.equal(forbiddenSeniorZoomWrite.response.status, 403);

  const directZoomWrite = await postTimetable(
    "/api/admin/timetable/update-zoom",
    teachingAdminToken,
    { zoomlink: "https://zoom.test/direct-global" },
    directEnv
  );
  assert.equal(directZoomWrite.response.status, 200);
  assert.equal(directZoomWrite.data.success, true);
  assert.equal(directZoomWrite.data.zoomlink, "https://zoom.test/direct-global");
  assert.equal(directZoomWrite.data.zoomsource, "SystemConfig");
  assert.equal(directZoomWrite.data.systemconfigzoomsaved, true);
  assert.equal(directZoomWrite.data.sessions[0].zoomlink, "https://zoom.test/session-quran", "Global saves must not overwrite session Zoom links");
  assert.deepEqual(sheetUpdates, [], "Global Zoom saves must not write TimeTable");
  assert.equal(sheetAppends.length, 1);
  assert.equal(sheetAppends[0].range, "SystemConfig!A:E");
  assert.deepEqual(sheetAppends[0].body.values[0].slice(0, 2), [
    "GlobalZoomLink",
    "https://zoom.test/direct-global"
  ]);
  assert.equal(sheetAppends[0].body.values[0][3], "ADMIN1");
  assert.equal(sheetAppends[0].body.values[0][4], "Teacher A");
  assert.ok(auditRows.some(row => (
    row[5] === "UPDATE" && row[6] === "SYSTEM_CONFIG" && row[7] === "GlobalZoomLink"
  )));

  requestedRanges.length = 0;
  const configuredRead = await postTimetable(
    "/api/admin/timetable/get",
    teachingAdminToken,
    {},
    directEnv
  );
  assert.equal(configuredRead.data.zoomsource, "SystemConfig");
  assert.equal(configuredRead.data.zoomlink, "https://zoom.test/direct-global");
  assert.equal(requestedRanges.includes("TimeTable!A:ZZ"), false, "Configured reads must not depend on TimeTable");

  const requiredRanges = new Set([
    "TeacherAssign!A:ZZ",
    "AdminRecords!A:ZZ",
    "SubjectList!A:ZZ",
    "ModuleList!A:ZZ",
    "SystemConfig!A:E"
  ]);
  assert.deepEqual(new Set(requestedRanges), requiredRanges);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("TeacherAssign timetable read, identity, greying and Zoom-link tests passed.");

async function postTimetable(path, token, body, env) {
  const response = await worker.fetch(new Request(`https://worker.test${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  }), env);

  return {
    response,
    data: await response.json()
  };
}

async function makeSessionToken(payload, secret) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify({ ...payload, iat: now, exp: now + 3600 }));
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data))
  );
  const hex = Array.from(signature)
    .map(value => value.toString(16).padStart(2, "0"))
    .join("");
  return `${data}.${hex}`;
}

function base64url(value) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function toPem(bytes, label) {
  const base64 = Buffer.from(bytes).toString("base64");
  const lines = base64.match(/.{1,64}/g).join("\n");
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----\n`;
}

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
