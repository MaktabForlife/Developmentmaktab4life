import assert from "node:assert/strict";
import worker from "../src/worker.js";

const studentRows = [
  ["StudentID", "Username", "ClassGroup", "Active"],
  ["ST1", "Amina", "2", true],
  ["ST2", "Bilal", "3", true],
  ["ST0", "System", "0", true],
  ["ST3", "Inactive", "2", false]
];

const subjectRows = [
  ["SubjectID", "SubjectName", "Active"],
  ["SUB2", "Fiqh", true],
  ["SUB1", "Aqidah", true]
];

const taskRows = [
  [
    "TaskID",
    "SubjectID",
    "SubjectName",
    "ModuleID",
    "ModuleName",
    "TaskName",
    "AudioLink",
    "GraphicLink",
    "VisualLink",
    "VideoLink",
    "PDFLink",
    "Active"
  ],
  ["T2", "SUB1", "Aqidah", "M2", "Second", "Z Task", "audio-2", "", "", "", "pdf-2", true],
  ["T1", "SUB1", "Aqidah", "M1", "First", "A Task", "audio-1", "graphic-1", "visual-1", "video-1", "pdf-1", true],
  ["T3", "SUB2", "Fiqh", "M3", "Third", "Fiqh Task", "", "", "", "", "", false]
];

const studentTaskRows = [
  [
    "StudentTaskID",
    "StudentID",
    "TaskID",
    "SubjectID",
    "ModuleID",
    "ModuleName",
    "CompleteStatus",
    "CompleteDate",
    "VerifyStatus",
    "VerifyDate",
    "AssignedBy",
    "AssignedDate"
  ],
  ["STASK1", "ST1", "T2", "SUB1", "M2", "Second", "", "", "", "", "Admin", "2026-07-01"],
  ["STASK2", "ST1", "T1", "SUB1", "M1", "First", "COMPLETE", "2026-07-02", "VERIFIED", "2026-07-03", "Admin", "2026-07-01"],
  ["STASK3", "ST2", "T1", "SUB1", "M1", "First", "COMPLETE", "2026-07-04", "", "", "Admin", "2026-07-01"],
  ["STASK4", "ST0", "T1", "SUB1", "M1", "First", "COMPLETE", "", "VERIFIED", "", "System", "2026-07-01"],
  ["STASK5", "ST3", "T1", "SUB1", "M1", "First", "COMPLETE", "", "VERIFIED", "", "Admin", "2026-07-01"],
  ["STASK6", "ST1", "UNKNOWN", "SUB1", "M1", "First", "COMPLETE", "", "", "", "Admin", "2026-07-01"]
];

const taskResourceRows = [
  ["TaskResourceID", "TaskID", "TaskResourceName", "ResourceType", "ResourceLink", "Active", "CreateDate"],
  ["RES2", "T1", "Zulu Resource", "PDF", "https://example.test/zulu", true, "2026-07-02"],
  ["RES1", "T1", "Alpha Resource", "LINK", "https://example.test/alpha", true, "2026-07-01"],
  ["RES3", "T1", "Hidden Resource", "PDF", "https://example.test/hidden", false, "2026-07-03"],
  ["RES4", "T2", "Task Two Resource", "PDF", "https://example.test/two", true, "2026-07-04"]
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
const sessionSecret = "progress-read-test-secret";
const directEnv = {
  SESSION_SECRET: sessionSecret,
  GOOGLE_SPREADSHEET_ID: "test-spreadsheet",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "progress-read-test@example.iam.gserviceaccount.com",
    private_key_id: "progress-read-test-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"),
    token_uri: "https://oauth2.googleapis.com/token"
  }),
  M4L_BACKEND_PROGRESS_READ: "google-sheets"
};
const studentToken = await makeSessionToken({
  type: "student",
  studentid: "ST1",
  username: "Amina"
}, sessionSecret);
const adminToken = await makeSessionToken({
  type: "admin",
  adminid: "ADMIN1",
  username: "Admin",
  role: "ADMIN",
  assignedgroup: "ALL"
}, sessionSecret);
const teacherToken = await makeSessionToken({
  type: "admin",
  adminid: "TEACHER1",
  username: "Teacher",
  role: "TEACHER",
  assignedgroup: "2"
}, sessionSecret);
const originalFetch = globalThis.fetch;
const requestedRanges = [];
let missingSheetName = "";

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));

  if (url.hostname === "oauth2.googleapis.com") {
    return response({ access_token: "mock-progress-token", expires_in: 3600 });
  }

  if (url.hostname === "sheets.googleapis.com") {
    assert.equal(init.headers.Authorization, "Bearer mock-progress-token");
    if (url.pathname.endsWith("/values:batchGet")) {
      const ranges = url.searchParams.getAll("ranges");
      requestedRanges.push(...ranges);
      const missingRange = ranges.find(range => missingSheetName && range.startsWith(`${missingSheetName}!`));
      if (missingRange) {
        return response({ error: { message: `Unable to parse range: ${missingRange}` } }, 400);
      }
      return response({
        valueRanges: ranges.map(range => ({ range, values: progressRowsForRange(range) }))
      });
    }
    const range = decodeURIComponent(url.pathname.split("/values/")[1] || "");
    requestedRanges.push(range);

    if (missingSheetName && range.startsWith(`${missingSheetName}!`)) {
      return response({ error: { message: `Unable to parse range: ${range}` } }, 400);
    }

    const rows = progressRowsForRange(range);
    if (rows) return response({ values: rows });

    throw new Error(`Unexpected Progress range: ${range}`);
  }

  throw new Error(`Unexpected direct Progress fetch: ${url}`);
};

function progressRowsForRange(range) {
  if (range === "StudentTasks!A:ZZ") return studentTaskRows;
  if (range === "TaskList!A:ZZ") return taskRows;
  if (range === "SubjectList!A:ZZ") return subjectRows;
  if (range === "TaskResources!A:ZZ") return taskResourceRows;
  if (range === "StudentRecords!A:ZZ") return studentRows;
  return [];
}

try {
  const studentTasks = await post(
    "/api/tasks/student",
    studentToken,
    { studentid: "ST2", subjectid: "ALL" },
    directEnv
  );
  assert.equal(studentTasks.response.status, 200);
  assert.equal(studentTasks.response.headers.get("X-M4L-Feature"), "progress-read");
  assert.equal(studentTasks.response.headers.get("X-M4L-Backend"), "google-sheets");
  assert.equal(
    studentTasks.response.headers.get("X-M4L-Backend-Source"),
    "fixed"
  );
  assert.equal(studentTasks.data.studentid, "ST1", "Students must only receive their own tasks");
  assert.equal(studentTasks.data.count, 2);
  assert.deepEqual(
    studentTasks.data.tasks.map(task => task.studenttaskid),
    ["STASK2", "STASK1"]
  );
  assert.deepEqual(
    studentTasks.data.tasks[0].resources.map(resource => resource.taskresourceid),
    ["RES1", "RES2"]
  );
  assert.equal(studentTasks.data.tasks[0].displayCompleteStatus, "COMPLETE");
  assert.equal(studentTasks.data.tasks[1].displayCompleteStatus, "to be completed");
  assert.equal(studentTasks.data.tasks[0].graphiclink, "graphic-1");

  const teacherReport = await post(
    "/api/progress/tasks",
    teacherToken,
    { studentid: "ALL", classgroup: "ALL", subjectid: "ALL" },
    directEnv
  );
  assert.deepEqual(teacherReport.data.filters, {
    studentid: "ALL",
    classgroup: "2",
    subjectid: "ALL"
  });
  assert.deepEqual(teacherReport.data.summary, {
    assignedCount: 2,
    completedCount: 1,
    verifiedCount: 1,
    completedPercent: 50,
    verifiedPercent: 50
  });
  assert.deepEqual(teacherReport.data.students.map(student => student.studentid), ["ST1"]);
  assert.deepEqual(teacherReport.data.groups.map(group => group.classgroup), ["2"]);

  const adminDetail = await post(
    "/api/progress/task-detail",
    adminToken,
    { studentid: "ALL", classgroup: "ALL", subjectid: "ALL", taskid: "ALL" },
    directEnv
  );
  assert.equal(adminDetail.data.success, true);
  assert.deepEqual(adminDetail.data.filters, {
    studentid: "ALL",
    classgroup: "ALL",
    subjectid: "ALL",
    moduleid: "ALL",
    taskid: "ALL"
  });
  assert.deepEqual(adminDetail.data.modules.map(module => module.moduleid), ["M1", "M2"]);
  assert.deepEqual(adminDetail.data.tasks.map(task => task.taskid), ["T1", "T2"]);
  assert.equal(adminDetail.data.students.length, 3);
  assert.equal(adminDetail.data.students.some(row => row.studentid === "ST0"), false);
  assert.equal(adminDetail.data.students.some(row => row.studentid === "ST3"), false);
  assert.deepEqual(adminDetail.data.modules[0], {
    subjectid: "M1",
    subjectname: "First",
    moduleid: "M1",
    modulename: "First",
    assignedCount: 2,
    completedCount: 2,
    verifiedCount: 1,
    completedPercent: 100,
    verifiedPercent: 50
  });

  const studentDetail = await post(
    "/api/progress/task-detail",
    studentToken,
    { studentid: "ST2", classgroup: "3", subjectid: "ALL", taskid: "ALL" },
    directEnv
  );
  assert.equal(studentDetail.data.filters.studentid, "ST1");
  assert.equal(studentDetail.data.filters.classgroup, "ALL");
  assert.equal(studentDetail.data.students.every(row => row.studentid === "ST1"), true);

  missingSheetName = "TaskResources";
  const missingResources = await post(
    "/api/tasks/student",
    studentToken,
    { subjectid: "ALL" },
    directEnv
  );
  assert.deepEqual(missingResources.data, {
    success: false,
    error: "TaskResources sheet not found"
  });
  missingSheetName = "";

  assert.deepEqual(new Set(requestedRanges), new Set([
    "StudentTasks!A:ZZ",
    "TaskList!A:ZZ",
    "SubjectList!A:ZZ",
    "TaskResources!A:ZZ",
    "StudentRecords!A:ZZ"
  ]));
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Direct Progress read tests passed.");

async function post(path, token, body, env) {
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
