import assert from "node:assert/strict";
import worker from "../src/worker.js";

const STUDENT_HEADERS = [
  "StudentID", "Username", "WhatsAppLast6", "UniqueID", "PinSetup", "PinHash",
  "ClassGroup", "CreateDate", "LastLogin", "FailedAttempts", "Active", "RegisteredBy"
];
const TASK_HEADERS = [
  "TaskID", "SubjectID", "TaskName", "AudioLink", "VisualLink", "VideoLink",
  "PDFLink", "Active", "CreateDate", "ModuleID", "ModuleName", "SubjectName"
];
const STUDENT_TASK_HEADERS = [
  "StudentTaskID", "StudentID", "TaskID", "SubjectID", "CompleteStatus",
  "CompleteDate", "VerifyStatus", "VerifyDate", "AssignedBy", "AssignedDate"
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
const sessionSecret = "task-assignment-write-test-secret";
const directEnv = {
  SESSION_SECRET: sessionSecret,
  GOOGLE_SPREADSHEET_ID: "test-spreadsheet",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "task-assignment-write-test@example.iam.gserviceaccount.com",
    private_key_id: "task-assignment-write-test-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"),
    token_uri: "https://oauth2.googleapis.com/token"
  }),
  M4L_BACKEND_TASK_ASSIGNMENT_WRITE: "google-sheets"
};
const adminToken = await makeSessionToken({
  type: "admin",
  adminid: "ADMIN1",
  username: "Admin User",
  role: "ADMIN"
}, sessionSecret);
const teacherToken = await makeSessionToken({
  type: "admin",
  adminid: "TEACHER1",
  username: "Teacher User",
  role: "TEACHER",
  assignedgroup: "2"
}, sessionSecret);

let studentRows;
let taskRows;
let studentTaskRows;
let systemConfigRows;
let missingSheetName = "";
let reads = [];
let updates = [];
let appends = [];

function resetSheets() {
  studentRows = [
    STUDENT_HEADERS,
    ["SYSTEM1", "Maktab Day", "999999", "SYSTEM", false, "", "ALL", "", "", 0, true, "SYSTEM"],
    ["ST1", "First Student", "111111", "LINK1", true, "", "2", "", "", 0, true, "Admin"],
    ["ST2", "Second Student", "222222", "LINK2", true, "", "2", "", 0, 0, true, "Admin"],
    ["ST3", "Inactive Student", "333333", "LINK3", true, "", "2", "", "", 0, false, "Admin"],
    ["ST4", "String Active", "444444", "LINK4", true, "", "2", "", "", 0, "TRUE", "Admin"]
  ];
  taskRows = [
    TASK_HEADERS,
    ["TASK1", "SUB1", "First", "", "", "", "", true, "", "MOD1", "Module 1", "Aqidah"],
    ["TASK2", "SUB1", "Second", "", "", "", "", true, "", "MOD2", "Module 2", "Aqidah"],
    ["TASK3", "SUB1", "Inactive", "", "", "", "", false, "", "MOD3", "Module 3", "Aqidah"],
    ["TASK4", "SUB1", "String Active", "", "", "", "", "TRUE", "", "MOD4", "Module 4", "Aqidah"],
    ["TASK5", "SUB2", "Other Subject", "", "", "", "", true, "", "MOD5", "Module 5", "Fiqh"]
  ];
  studentTaskRows = [
    STUDENT_TASK_HEADERS,
    ["STASK1", "ST1", "TASK1", "SUB1", "", "", "", "", "ADMIN0", "2026-07-01T00:00:00.000Z"]
  ];
  systemConfigRows = [
    ["OtherSetting", "value"],
    ["NextStudentTaskNumber", 100]
  ];
  missingSheetName = "";
  reads = [];
  updates = [];
  appends = [];
}

resetSheets();
const originalFetch = globalThis.fetch;

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));

  if (url.hostname === "oauth2.googleapis.com") {
    return response({ access_token: "mock-task-assignment-token", expires_in: 3600 });
  }

  if (url.hostname !== "sheets.googleapis.com") {
    throw new Error(`Unexpected task-assignment fetch: ${url}`);
  }

  assert.equal(init.headers.Authorization, "Bearer mock-task-assignment-token");
  const rangeAndAction = decodeURIComponent(url.pathname.split("/values/")[1] || "");
  const isAppend = rangeAndAction.endsWith(":append");
  const range = isAppend ? rangeAndAction.slice(0, -":append".length) : rangeAndAction;

  if (init.method === "GET") {
    reads.push(range);

    if (missingSheetName && range.startsWith(`${missingSheetName}!`)) {
      return response({ error: { message: `Unable to parse range: ${range}` } }, 400);
    }

    if (range === "StudentRecords!A:ZZ") return response({ values: studentRows });
    if (range === "TaskList!A:ZZ") return response({ values: taskRows });
    if (range === "StudentTasks!A:ZZ") return response({ values: studentTaskRows });
    if (range === "SystemConfig!A:ZZ") return response({ values: systemConfigRows });

    throw new Error(`Unexpected task-assignment range: ${range}`);
  }

  const payload = JSON.parse(init.body);

  if (init.method === "PUT") {
    updates.push({ range, payload });

    if (range === "SystemConfig!B2") {
      systemConfigRows[1][1] = payload.values[0][0];
    }

    return response({ updatedRange: range, updatedRows: 1 });
  }

  if (init.method === "POST" && isAppend) {
    appends.push({ range, payload });

    if (range === "StudentTasks!A:J") {
      studentTaskRows.push(...payload.values);
    }

    return response({ updates: { updatedRows: payload.values.length } });
  }

  throw new Error(`Unexpected Sheets request: ${init.method} ${rangeAndAction}`);
};

try {
  const explicit = await postAdmin(
    adminToken,
    {
      studentids: [" ST1 ", "ST2", "BAD-STUDENT"],
      taskids: [" TASK1 ", "TASK2", "BAD-TASK"]
    },
    directEnv
  );

  assert.equal(explicit.response.status, 200);
  assert.equal(explicit.response.headers.get("X-M4L-Feature"), "task-assignment-write");
  assert.equal(explicit.response.headers.get("X-M4L-Backend"), "google-sheets");
  assert.equal(
    explicit.response.headers.get("X-M4L-Backend-Source"),
    "M4L_BACKEND_TASK_ASSIGNMENT_WRITE"
  );
  assert.deepEqual(explicit.data, {
    success: true,
    message: "Task assignment completed",
    assignedCount: 3,
    skippedDuplicate: 1,
    skippedInvalidTask: 2,
    skippedInvalidStudent: 1
  });
  assert.deepEqual(updates, [{
    range: "SystemConfig!B2",
    payload: {
      range: "SystemConfig!B2",
      majorDimension: "ROWS",
      values: [[103]]
    }
  }]);
  assert.equal(appends.length, 1);
  assert.equal(appends[0].range, "StudentTasks!A:J");
  assert.deepEqual(
    appends[0].payload.values.map(row => [row[0], row[1], row[2], row[3], row[8]]),
    [
      ["STASK100", "ST1", "TASK2", "SUB1", "ADMIN1"],
      ["STASK101", "ST2", "TASK1", "SUB1", "ADMIN1"],
      ["STASK102", "ST2", "TASK2", "SUB1", "ADMIN1"]
    ]
  );
  assert.ok(appends[0].payload.values.every(row => row.length === 10));
  assert.ok(appends[0].payload.values.every(row => row[9] === appends[0].payload.values[0][9]));
  assert.match(appends[0].payload.values[0][9], /^\d{4}-\d{2}-\d{2}T/);

  resetSheets();
  const allStudents = await postAdmin(
    adminToken,
    { assignAllStudents: true, taskids: ["TASK1"] },
    directEnv
  );
  assert.deepEqual(allStudents.data, {
    success: true,
    message: "Task assignment completed",
    assignedCount: 2,
    skippedDuplicate: 1,
    skippedInvalidTask: 0,
    skippedInvalidStudent: 0
  });
  assert.deepEqual(
    appends[0].payload.values.map(row => [row[1], row[2]]),
    [["SYSTEM1", "TASK1"], ["ST2", "TASK1"]]
  );

  resetSheets();
  const subjectAndGroup = await postAdmin(
    adminToken,
    {
      classgroup: "2",
      assignAllTasksForSubject: true,
      subjectid: "SUB1"
    },
    directEnv
  );
  assert.deepEqual(subjectAndGroup.data, {
    success: true,
    message: "Task assignment completed",
    assignedCount: 3,
    skippedDuplicate: 1,
    skippedInvalidTask: 0,
    skippedInvalidStudent: 0
  });
  assert.deepEqual(
    appends[0].payload.values.map(row => [row[1], row[2]]),
    [["ST1", "TASK2"], ["ST2", "TASK1"], ["ST2", "TASK2"]]
  );
  assert.equal(
    appends[0].payload.values.some(row => row[2] === "TASK3" || row[2] === "TASK4"),
    false,
    "The direct handler must preserve Apps Script's strict active === true rule"
  );

  resetSheets();
  const noTasks = await postAdmin(adminToken, { studentids: ["ST1"] }, directEnv);
  assert.deepEqual(noTasks.data, { success: false, error: "No tasks selected" });
  assert.equal(updates.length + appends.length, 0);

  resetSheets();
  missingSheetName = "StudentTasks";
  const missingStudentTasks = await postAdmin(
    adminToken,
    { studentids: ["ST1"], taskids: ["TASK1"] },
    directEnv
  );
  assert.deepEqual(missingStudentTasks.data, {
    success: false,
    error: "StudentTasks sheet not found"
  });
  assert.equal(updates.length + appends.length, 0);

  resetSheets();
  systemConfigRows = [["OtherSetting", "value"]];
  const missingCounter = await postAdmin(
    adminToken,
    { studentids: ["ST2"], taskids: ["TASK1"] },
    directEnv
  );
  assert.deepEqual(missingCounter.data, {
    success: false,
    error: "NextStudentTaskNumber not found"
  });
  assert.equal(updates.length + appends.length, 0);

  resetSheets();
  const forbidden = await postAdmin(
    teacherToken,
    { studentids: ["ST2"], taskids: ["TASK1"] },
    directEnv
  );
  assert.equal(forbidden.response.status, 403);
  assert.equal(forbidden.data.success, false);
  assert.equal(reads.length + updates.length + appends.length, 0);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Direct Task Assignment Write tests passed.");

async function postAdmin(token, body, env) {
  const response = await worker.fetch(new Request(
    "https://worker.test/api/admin/tasks/assign",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    }
  ), env);

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
  return btoa(value)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function toPem(bytes, label) {
  let binary = "";
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte);
  });
  const encoded = btoa(binary).match(/.{1,64}/g).join("\n");
  return `-----BEGIN ${label}-----\n${encoded}\n-----END ${label}-----`;
}

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
