import assert from "node:assert/strict";
import worker from "../src/worker.js";
import { assertSheetsReadBudget, createSheetsReadMetrics } from "./helpers/sheets-read-metrics.mjs";

const studentRows = [
  ["StudentID", "Username", "ClassGroup", "Active"],
  ["S2", "Yusuf 2", "2", true],
  ["S1", "Zayd 10", "1", "TRUE"],
  ["S3", "Ahmad 2", "1", "ACTIVE"],
  ["S6", "Maryam", "1", "YES"],
  ["S4", "Inactive", "1", "FALSE"],
  ["S5", "System Group", "0", true]
];

const attendanceHeaders = [
  "AttendanceDate",
  "StudentID",
  "Username",
  "ClassGroup",
  "Status",
  "DayCounter",
  "Notes",
  "AdminID",
  "DateStamp",
  "AdminName"
];
const attendanceRowsFixture = [
  attendanceHeaders,
  ["2026-07-27", "SYSTEM1", "daycounter", "SYSTEM", "ABSENT", "daycounter"],
  ["2026-07-27", "S1", "Zayd 10", "1", "ABSENT"],
  ["2026-07-27", "S1", "Zayd 10", "1", "ABSENT"],
  ["28/07/2026", "SYSTEM1", "daycounter", "SYSTEM", "ABSENT", "daycounter"],
  ["28 Jul 2026", "S3", "Ahmad 2", "1", "ABSENT"]
];

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
const sessionSecret = "attendance-test-secret";
const directEnv = {
  SESSION_SECRET: sessionSecret,
  GOOGLE_SPREADSHEET_ID: "test-spreadsheet",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "attendance-test@example.iam.gserviceaccount.com",
    private_key_id: "attendance-test-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"),
    token_uri: "https://oauth2.googleapis.com/token"
  }),
  M4L_BACKEND_ATTENDANCE_READ: "google-sheets",
  M4L_BACKEND_ATTENDANCE_WRITE: "google-sheets"
};
const teacherToken = await makeSessionToken({
  type: "admin",
  adminid: "ADMIN-T1",
  username: "Teacher A",
  role: "TEACHER",
  assignedgroup: "1"
}, sessionSecret);
const seniorToken = await makeSessionToken({
  type: "admin",
  adminid: "ADMIN-S1",
  username: "Senior Admin",
  role: "SENIOR",
  assignedgroup: "ALL"
}, sessionSecret);

const originalFetch = globalThis.fetch;
const sheetUpdates = [];
const sheetAppends = [];
const auditRows = [[
  "AuditID", "DateStamp", "AdminID", "AdminName", "Role", "Action",
  "RecordType", "RecordID", "ChangedFields"
]];
let attendanceRows = attendanceRowsFixture.map(row => row.slice());
let missingSheetName = "";
const sheetsReadMetrics = createSheetsReadMetrics();

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));

  if (url.hostname === "oauth2.googleapis.com") {
    return response({ access_token: "mock-attendance-token", expires_in: 3600 });
  }

  if (url.hostname === "sheets.googleapis.com") {
    sheetsReadMetrics.record(url, init);
    assert.equal(init.headers.Authorization, "Bearer mock-attendance-token");

    if (url.pathname.endsWith("/values:batchGet")) {
      const ranges = url.searchParams.getAll("ranges");
      const missingRange = ranges.find(range => missingSheetName && range.startsWith(`${missingSheetName}!`));
      if (missingRange) {
        return response({ error: { message: `Unable to parse range: ${missingRange}` } }, 400);
      }
      return response({
        valueRanges: ranges.map(range => ({
          range,
          values: range === "StudentRecords!A:ZZ"
            ? studentRows
            : range === "Attendance!A:ZZ"
              ? attendanceRows
              : []
        }))
      });
    }

    const rawRange = decodeURIComponent(url.pathname.split("/values/")[1] || "");
    const range = rawRange.replace(/:append$/, "");

    if (missingSheetName && range.startsWith(`${missingSheetName}!`)) {
      return response({
        error: { message: `Unable to parse range: ${range}` }
      }, 400);
    }

    if ((init.method || "GET") === "PUT") {
      sheetUpdates.push({ range, body: JSON.parse(init.body) });
      return response({ updatedRows: 1 });
    }

    if ((init.method || "GET") === "POST") {
      const body = JSON.parse(init.body);
      sheetAppends.push({ range, body });
      if (range === "AdminAuditLog!A:I") auditRows.push(...body.values);
      return response({ updates: { updatedRows: body.values.length } });
    }

    if (range === "StudentRecords!A:ZZ") {
      return response({ values: studentRows });
    }

    if (range === "Attendance!A:ZZ") {
      return response({ values: attendanceRows });
    }

    if (range === "AdminAuditLog!A1:I1") {
      return response({ values: [auditRows[0]] });
    }

    throw new Error(`Unexpected attendance range: ${range}`);
  }

  throw new Error(`Unexpected direct-attendance fetch: ${url}`);
};

try {
  const studentsResult = await postAttendance(
    "/api/attendance/students",
    teacherToken,
    { classgroup: "2" },
    directEnv
  );
  assert.equal(studentsResult.response.status, 200);
  assert.equal(studentsResult.response.headers.get("X-M4L-Feature"), "attendance-read");
  assert.equal(studentsResult.response.headers.get("X-M4L-Backend"), "google-sheets");
  assert.equal(
    studentsResult.response.headers.get("X-M4L-Backend-Source"),
    "fixed"
  );
  assert.equal(studentsResult.data.classgroup, "1", "Teachers must be restricted to their group");
  assert.deepEqual(
    studentsResult.data.students,
    [
      { studentid: "S3", username: "Ahmad 2", classgroup: "1" },
      { studentid: "S6", username: "Maryam", classgroup: "1" },
      { studentid: "S1", username: "Zayd 10", classgroup: "1" }
    ]
  );

  const reportMetricMark = sheetsReadMetrics.mark();
  const reportResult = await postAttendance(
    "/api/attendance/report",
    teacherToken,
    {
      startDate: "2026-07-27",
      endDate: "2026-07-28",
      classgroup: "2"
    },
    directEnv
  );
  assert.equal(reportResult.response.status, 200);
  assert.equal(reportResult.response.headers.get("X-M4L-Feature"), "attendance-read");
  assertSheetsReadBudget(sheetsReadMetrics, reportMetricMark, {
    totalRequests: 1,
    batchGets: 1,
    directReads: 0,
    rangeCount: 2,
    spreadsheets: { "test-spreadsheet": 1 }
  }, "Attendance report");
  assert.equal(reportResult.data.classgroup, "1");
  assert.equal(reportResult.data.totalMaktabDays, 2);
  assert.equal(reportResult.data.registerAverageAttendancePercent, 66.7);
  assert.deepEqual(reportResult.data.groupAverages, [{
    classgroup: "1",
    studentCount: 3,
    averageAttendancePercent: 66.7
  }]);
  assert.deepEqual(reportResult.data.perfectAttendanceStudents, [{
    studentid: "S6",
    username: "Maryam",
    classgroup: "1"
  }]);
  assert.deepEqual(reportResult.data.debug, {
    activeStudentCount: 3,
    attendanceRowCount: 5,
    uniqueMaktabDays: ["2026-07-27", "2026-07-28"],
    uniqueAbsentStudentDatePairCount: 2
  });
  assert.deepEqual(
    reportResult.data.students.map(student => ({
      studentid: student.studentid,
      absentDays: student.absentDays,
      absentDates: student.absentDates,
      attendancePercent: student.attendancePercent
    })),
    [
      { studentid: "S3", absentDays: 1, absentDates: ["2026-07-28"], attendancePercent: 50 },
      { studentid: "S6", absentDays: 0, absentDates: [], attendancePercent: 100 },
      { studentid: "S1", absentDays: 1, absentDates: ["2026-07-27"], attendancePercent: 50 }
    ]
  );

  const submitResult = await postAttendance(
    "/api/attendance/submit-absent",
    teacherToken,
    {
      date: "2026-07-28",
      absentStudents: [
        { studentid: "S3", username: "Ahmad 2", classgroup: "1" },
        { studentid: "S1", username: "Zayd 10", classgroup: "1" },
        { studentid: "S1", username: "Zayd 10", classgroup: "1" }
      ]
    },
    directEnv
  );
  assert.equal(submitResult.response.status, 200);
  assert.equal(submitResult.response.headers.get("X-M4L-Feature"), "attendance-write");
  assert.equal(submitResult.response.headers.get("X-M4L-Backend"), "google-sheets");
  assert.equal(
    submitResult.response.headers.get("X-M4L-Backend-Source"),
    "fixed"
  );
  assert.equal(submitResult.data.success, true);
  assert.equal(submitResult.data.absentCount, 1);
  assert.equal(submitResult.data.rowsAdded, 2);
  assert.equal(submitResult.data.skippedDuplicateCount, 2);
  assert.equal(submitResult.data.adminid, "ADMIN-T1");
  assert.match(submitResult.data.datestamp, /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  const attendanceAppends = sheetAppends.filter(item => item.range === "Attendance!A:ZZ");
  assert.equal(attendanceAppends.length, 1);
  const submittedRows = attendanceAppends[0].body.values;
  assert.deepEqual(submittedRows[0].slice(0, 7), [
    "2026-07-28", "S1", "Zayd 10", "1", "ABSENT", "", ""
  ]);
  assert.equal(submittedRows[0][7], "ADMIN-T1");
  assert.equal(submittedRows[0][9], "Teacher A");
  assert.deepEqual(submittedRows[1].slice(0, 8), [
    "2026-07-28", "SYSTEM1", "daycounter", "SYSTEM", "ABSENT", "daycounter", "Register marked", "ADMIN-T1"
  ]);
  assert.ok(auditRows.some(row => row[5] === "SUBMIT" && row[7] === "2026-07-28"));

  const forbidden = await postAttendance(
    "/api/attendance/submit-absent",
    teacherToken,
    {
      date: "2026-07-28",
      absentStudents: [{ studentid: "S2", username: "Yusuf 2", classgroup: "2" }]
    },
    directEnv
  );
  assert.equal(forbidden.response.status, 403);
  assert.match(forbidden.data.error, /another group/);

  attendanceRows = [];
  sheetUpdates.length = 0;
  sheetAppends.length = 0;

  const allPresent = await postAttendance(
    "/api/attendance/submit-absent",
    seniorToken,
    { date: "2026-07-29", absentStudents: [] },
    directEnv
  );
  assert.equal(allPresent.data.absentCount, 0);
  assert.equal(allPresent.data.rowsAdded, 1);
  assert.deepEqual(sheetUpdates, [{
    range: "Attendance!A1:I1",
    body: {
      range: "Attendance!A1:I1",
      majorDimension: "ROWS",
      values: [[
        "AttendanceDate",
        "StudentID",
        "Username",
        "ClassGroup",
        "Status",
        "Notes",
        "AdminID",
        "DateStamp",
        "AdminName"
      ]]
    }
  }]);
  assert.equal(
    sheetAppends.find(item => item.range === "Attendance!A:ZZ").body.values[0][5],
    "All students present"
  );

  attendanceRows = attendanceRowsFixture.map(row => row.slice());
  missingSheetName = "StudentRecords";
  const missingStudents = await postAttendance(
    "/api/attendance/students",
    seniorToken,
    { classgroup: "ALL" },
    directEnv
  );
  assert.deepEqual(missingStudents.data, {
    success: false,
    error: "StudentRecords sheet not found"
  });
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Direct Attendance read/write tests passed.");

async function postAttendance(path, token, body, env) {
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
