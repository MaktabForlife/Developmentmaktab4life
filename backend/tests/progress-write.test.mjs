import assert from "node:assert/strict";
import worker from "../src/worker.js";

const studentRows = [
  ["StudentID", "Username", "ClassGroup", "Active"],
  ["ST1", "Amina", "2", true],
  ["ST2", "Bilal", "3", true],
  ["ST0", "System", "0", true],
  ["ST3", "Inactive", "2", false]
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
  ["STASK1", "ST1", "T1", "SUB1", "M1", "First", "", "", "", "", "Admin", "2026-07-01"],
  ["STASK2", "ST1", "T2", "SUB1", "M2", "Second", "COMPLETE", "2026-07-02", "VERIFIED", "2026-07-03", "Admin", "2026-07-01"],
  ["STASK3", "ST2", "T1", "SUB1", "M1", "First", "", "", "", "", "Admin", "2026-07-01"],
  ["STASK4", "ST0", "T1", "SUB1", "M1", "First", "", "", "", "", "System", "2026-07-01"],
  ["STASK5", "ST3", "T1", "SUB1", "M1", "First", "", "", "", "", "Admin", "2026-07-01"],
  ["STASKD", "ST1", "T3", "SUB1", "M3", "Third", "", "", "", "", "Admin", "2026-07-01"],
  ["STASKD", "ST1", "T4", "SUB1", "M4", "Fourth", "", "", "", "", "Admin", "2026-07-01"]
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
const sessionSecret = "progress-write-test-secret";
const directEnv = {
  SESSION_SECRET: sessionSecret,
  GOOGLE_SPREADSHEET_ID: "test-spreadsheet",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "progress-write-test@example.iam.gserviceaccount.com",
    private_key_id: "progress-write-test-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"),
    token_uri: "https://oauth2.googleapis.com/token"
  }),
  M4L_BACKEND_PROGRESS_WRITE: "google-sheets"
};
const studentToken = await makeSessionToken({
  type: "student",
  studentid: "ST1",
  username: "Amina"
}, sessionSecret);
const otherStudentToken = await makeSessionToken({
  type: "student",
  studentid: "ST2",
  username: "Bilal"
}, sessionSecret);
const teacherToken = await makeSessionToken({
  type: "admin",
  adminid: "TEACHER1",
  username: "Teacher",
  role: "TEACHER",
  assignedgroup: "2"
}, sessionSecret);
const adminToken = await makeSessionToken({
  type: "admin",
  adminid: "ADMIN1",
  username: "Admin",
  role: "ADMIN",
  assignedgroup: "ALL"
}, sessionSecret);

const originalFetch = globalThis.fetch;
const batchPayloads = [];
let requestedRanges = [];
let missingSheetName = "";

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));

  if (url.hostname === "oauth2.googleapis.com") {
    return response({ access_token: "mock-progress-write-token", expires_in: 3600 });
  }

  if (url.hostname === "sheets.googleapis.com") {
    assert.equal(init.headers.Authorization, "Bearer mock-progress-write-token");

    if (url.pathname.endsWith("/values:batchUpdate")) {
      const payload = JSON.parse(init.body);
      assert.equal(payload.valueInputOption, "RAW");
      batchPayloads.push(payload);
      return response({ totalUpdatedCells: payload.data.length });
    }

    const range = decodeURIComponent(url.pathname.split("/values/")[1] || "");
    requestedRanges.push(range);

    if (missingSheetName && range.startsWith(`${missingSheetName}!`)) {
      return response({ error: { message: `Unable to parse range: ${range}` } }, 400);
    }

    if (range === "StudentTasks!A:ZZ") return response({ values: studentTaskRows });
    if (range === "StudentRecords!A:ZZ") return response({ values: studentRows });

    throw new Error(`Unexpected Progress write range: ${range}`);
  }

  throw new Error(`Unexpected direct Progress write fetch: ${url}`);
};

try {
  batchPayloads.length = 0;
  requestedRanges = [];
  const studentComplete = await post(
    "/api/tasks/update-complete",
    studentToken,
    {
      updates: [
        { studenttaskid: "STASK1", complete: true },
        { studenttaskid: "STASK2", complete: false }
      ]
    },
    directEnv
  );
  assert.equal(studentComplete.response.status, 200);
  assert.equal(studentComplete.response.headers.get("X-M4L-Feature"), "progress-write");
  assert.equal(studentComplete.response.headers.get("X-M4L-Backend"), "google-sheets");
  assert.equal(
    studentComplete.response.headers.get("X-M4L-Backend-Source"),
    "fixed"
  );
  assert.equal(studentComplete.data.success, true);
  assert.equal(studentComplete.data.updatedCount, 2);
  assert.deepEqual(requestedRanges.sort(), ["StudentRecords!A:ZZ", "StudentTasks!A:ZZ"]);
  assert.equal(batchPayloads.length, 1);

  const completeCells = cellMap(batchPayloads[0]);
  assert.equal(completeCells.get("StudentTasks!G2"), "COMPLETE");
  assert.match(completeCells.get("StudentTasks!H2"), /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(completeCells.get("StudentTasks!G3"), "");
  assert.equal(completeCells.get("StudentTasks!H3"), "");
  assert.equal(completeCells.has("StudentTasks!I2"), false);

  batchPayloads.length = 0;
  const adminVerify = await post(
    "/api/admin/tasks/verify",
    adminToken,
    {
      updates: [
        { studenttaskid: "STASK1", verified: true },
        { studenttaskid: "STASK2", verified: false }
      ]
    },
    directEnv
  );
  assert.equal(adminVerify.data.success, true);
  assert.equal(adminVerify.data.updatedCount, 2);
  const verifyCells = cellMap(batchPayloads[0]);
  assert.equal(verifyCells.get("StudentTasks!I2"), "VERIFIED");
  assert.match(verifyCells.get("StudentTasks!J2"), /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(verifyCells.get("StudentTasks!I3"), "");
  assert.equal(verifyCells.get("StudentTasks!J3"), "");
  assert.equal(verifyCells.has("StudentTasks!G2"), false);

  batchPayloads.length = 0;
  const teacherOwnGroup = await post(
    "/api/tasks/update-complete",
    teacherToken,
    { studenttaskid: "STASK1", completeStatus: "completed" },
    directEnv
  );
  assert.equal(teacherOwnGroup.data.success, true);
  assert.equal(cellMap(batchPayloads[0]).get("StudentTasks!G2"), "COMPLETE");

  batchPayloads.length = 0;
  const teacherOtherGroup = await post(
    "/api/tasks/update-complete",
    teacherToken,
    { studenttaskid: "STASK3", complete: true },
    directEnv
  );
  assert.equal(teacherOtherGroup.data.success, false);
  assert.equal(teacherOtherGroup.data.error, "Forbidden");
  assert.equal(batchPayloads.length, 0, "Forbidden batches must not write any cells");

  const studentOtherTask = await post(
    "/api/tasks/update-complete",
    otherStudentToken,
    { studenttaskid: "STASK1", complete: true },
    directEnv
  );
  assert.equal(studentOtherTask.data.success, false);
  assert.equal(studentOtherTask.data.error, "Forbidden");
  assert.equal(batchPayloads.length, 0);

  const studentVerification = await post(
    "/api/tasks/update-complete",
    studentToken,
    { studenttaskid: "STASK1", verified: true },
    directEnv
  );
  assert.equal(studentVerification.response.status, 400);
  assert.equal(studentVerification.data.error, "Students cannot verify tasks");

  const studentAdminVerification = await post(
    "/api/admin/tasks/verify",
    studentToken,
    { studenttaskid: "STASK1", verified: true },
    directEnv
  );
  assert.equal(studentAdminVerification.response.status, 401);

  const duplicateRequest = await post(
    "/api/tasks/update-complete",
    studentToken,
    {
      updates: [
        { studenttaskid: "STASK1", complete: true },
        { studenttaskid: "STASK1", complete: false }
      ]
    },
    directEnv
  );
  assert.equal(duplicateRequest.data.success, false);
  assert.equal(duplicateRequest.data.error, "Duplicate studenttaskid in request");
  assert.equal(batchPayloads.length, 0);

  const missingTask = await post(
    "/api/tasks/update-complete",
    studentToken,
    {
      updates: [
        { studenttaskid: "STASK1", complete: true },
        { studenttaskid: "MISSING", complete: true }
      ]
    },
    directEnv
  );
  assert.equal(missingTask.data.success, false);
  assert.equal(missingTask.data.error, "Student task not found");
  assert.equal(missingTask.data.results[0].error, "Batch not applied because another update failed");
  assert.equal(batchPayloads.length, 0, "Mixed valid/invalid batches must be all-or-nothing");

  const duplicateSheetTask = await post(
    "/api/tasks/update-complete",
    studentToken,
    { studenttaskid: "STASKD", complete: true },
    directEnv
  );
  assert.equal(duplicateSheetTask.data.success, false);
  assert.equal(duplicateSheetTask.data.error, "Duplicate StudentTaskID in StudentTasks sheet");
  assert.equal(batchPayloads.length, 0);

  missingSheetName = "StudentRecords";
  const missingStudents = await post(
    "/api/tasks/update-complete",
    studentToken,
    { studenttaskid: "STASK1", complete: true },
    directEnv
  );
  assert.deepEqual(missingStudents.data, {
    success: false,
    error: "StudentRecords sheet not found"
  });
  missingSheetName = "";
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Direct Progress write tests passed.");

function cellMap(payload) {
  return new Map(payload.data.map(item => [item.range, item.values[0][0]]));
}

async function post(path, token, body, env) {
  const responseValue = await worker.fetch(new Request(`https://worker.test${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  }), env);

  return { response: responseValue, data: await responseValue.json() };
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
