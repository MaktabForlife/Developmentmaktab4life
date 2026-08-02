import assert from "node:assert/strict";
import worker from "../src/worker.js";

const studentRows = [
  [
    "StudentID",
    "Username",
    "WhatsAppLast6",
    "UniqueID",
    "PinSetup",
    "PinHash",
    "ClassGroup",
    "CreateDate",
    "LastLogin",
    "FailedAttempts",
    "Active",
    "RegisteredBy"
  ],
  ["SYSTEM1", "Maktab Day", "999999", "SYSTEM", false, "", "ALL", "", "", 0, true, "SYSTEM"],
  ["ST3", "Zayd", "789012", "LINK-ZAYD", true, "secret-z", "10", "2026-07-03", "", 0, true, "Admin"],
  ["ST1", "Ahmad", "012345", "LINK-AHMAD", true, "secret-a", "2", "2026-07-01", "2026-07-20", 0, true, "Admin"],
  ["ST2", "Ahmad1", "654321", "LINK-AHMAD1", true, "secret-b", "2", "2026-07-02", "", 0, "FALSE", "Senior"],
  ["ST4", "Ahmad2", "222222", "LINK-AHMAD2", false, "secret-c", "3", "2026-07-04", "", 0, true, "Admin"]
];

const subjectRows = [
  ["SubjectID", "SubjectName", "Active"],
  ["SUB2", "Inactive Subject", false],
  ["SUB1", "Aqidah", true]
];

const moduleRows = [
  ["ModuleID", "ModuleName", "SubjectID", "SubjectName", "Sort Order", "Active"],
  ["M2", "Second Module", "SUB1", "Aqidah", 2, true],
  ["M1", "First Module", "SUB1", "Aqidah", 1, true],
  ["M3", "Hidden Module", "SUB2", "Inactive Subject", 1, true]
];

const taskRows = [
  [
    "TaskID",
    "SubjectID",
    "TaskName",
    "AudioLink",
    "VisualLink",
    "VideoLink",
    "PDFLink",
    "Active",
    "CreateDate",
    "ModuleID",
    "ModuleName",
    "SubjectName"
  ],
  ["TASK2", "SUB1", "Second", "", "", "", "", true, "", "M2", "Second Module", "Aqidah"],
  ["TASK1", "SUB1", "First", "", "", "", "", "TRUE", "", "M1", "First Module", "Aqidah"],
  ["TASK3", "SUB1", "General", "", "", "", "", true, "", "", "", "Aqidah"],
  ["TASK4", "SUB2", "Hidden", "", "", "", "", true, "", "M3", "Hidden Module", "Inactive Subject"],
  ["TASK5", "SUB1", "Inactive", "", "", "", "", false, "", "M1", "First Module", "Aqidah"]
];

const systemConfigRows = [
  ["StudentLoginBaseUrl", "https://development.example.test/student/"]
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
const sessionSecret = "student-management-test-secret";
const directEnv = {
  SESSION_SECRET: sessionSecret,
  GOOGLE_SPREADSHEET_ID: "test-spreadsheet",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "student-management-test@example.iam.gserviceaccount.com",
    private_key_id: "student-management-test-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"),
    token_uri: "https://oauth2.googleapis.com/token"
  }),
  M4L_BACKEND_STUDENT_MANAGEMENT_READ: "google-sheets",
  M4L_BACKEND_STUDENT_MANAGEMENT_UPDATE: "google-sheets",
  M4L_BACKEND_TASK_ASSIGNMENT_READ: "google-sheets"
};
const adminToken = await makeSessionToken({
  type: "admin",
  adminid: "ADMIN1",
  username: "Admin User",
  role: "ADMIN"
}, sessionSecret);
const originalFetch = globalThis.fetch;
const requestedRanges = [];
const batchUpdates = [];
let missingSheetName = "";

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));

  if (url.hostname === "oauth2.googleapis.com") {
    return response({ access_token: "mock-student-management-token", expires_in: 3600 });
  }

  if (url.hostname === "sheets.googleapis.com") {
    assert.equal(init.headers.Authorization, "Bearer mock-student-management-token");

    if (url.pathname.endsWith("/values:batchUpdate")) {
      const payload = JSON.parse(init.body);
      batchUpdates.push(payload);
      return response({ totalUpdatedRows: payload.data.length });
    }

    const range = decodeURIComponent(url.pathname.split("/values/")[1] || "");
    requestedRanges.push(range);

    if (missingSheetName && range.startsWith(`${missingSheetName}!`)) {
      return response({ error: { message: `Unable to parse range: ${range}` } }, 400);
    }

    if (range === "StudentRecords!A:ZZ") return response({ values: studentRows });
    if (range === "SubjectList!A:ZZ") return response({ values: subjectRows });
    if (range === "ModuleList!A:ZZ") return response({ values: moduleRows });
    if (range === "TaskList!A:ZZ") return response({ values: taskRows });
    if (range === "SystemConfig!A:D") return response({ values: systemConfigRows });

    throw new Error(`Unexpected student-management range: ${range}`);
  }

  throw new Error(`Unexpected direct student-management fetch: ${url}`);
};

try {
  const duplicate = await postAdmin(
    "/api/admin/check-student-duplicate",
    adminToken,
    { username: "Ah mad", whatsapp6: "012345", classgroup: "2" },
    directEnv
  );
  assert.equal(duplicate.response.status, 200);
  assert.equal(duplicate.response.headers.get("X-M4L-Feature"), "student-management-read");
  assert.equal(duplicate.response.headers.get("X-M4L-Backend"), "google-sheets");
  assert.equal(
    duplicate.response.headers.get("X-M4L-Backend-Source"),
    "M4L_BACKEND_STUDENT_MANAGEMENT_READ"
  );
  assert.equal(duplicate.data.duplicate, true);
  assert.equal(duplicate.data.matches.length, 1);
  assert.equal(duplicate.data.matches[0].studentid, "ST1");
  assert.equal(duplicate.data.suggestedUsername, "Ah mad3");
  assert.equal("pinhash" in duplicate.data.matches[0], false);

  const students = await postAdmin(
    "/api/admin/students/search",
    adminToken,
    { listAll: true },
    directEnv
  );
  assert.equal(students.response.status, 200);
  assert.equal(students.response.headers.get("X-M4L-Feature"), "student-management-read");
  assert.equal(students.data.count, 4);
  assert.deepEqual(
    students.data.students.map(student => student.studentid),
    ["ST1", "ST2", "ST4", "ST3"]
  );
  assert.equal(students.data.students[0].loginUrl, "https://development.example.test/student/LINK-AHMAD");
  assert.equal(students.data.students[1].active, false);
  assert.equal(students.data.students.some(student => student.studentid === "SYSTEM1"), false);
  assert.equal(students.data.students.some(student => "pinhash" in student), false);

  const updatedStudent = await postAdmin(
    "/api/admin/update-student",
    adminToken,
    {
      uniqueid: "LINK-AHMAD",
      username: "  Ahmad Updated  ",
      whatsapp6: "12 34",
      classgroup: " 5 ",
      active: false
    },
    directEnv
  );
  assert.equal(updatedStudent.response.status, 200);
  assert.equal(
    updatedStudent.response.headers.get("X-M4L-Feature"),
    "student-management-update"
  );
  assert.equal(updatedStudent.response.headers.get("X-M4L-Backend"), "google-sheets");
  assert.equal(
    updatedStudent.response.headers.get("X-M4L-Backend-Source"),
    "M4L_BACKEND_STUDENT_MANAGEMENT_UPDATE"
  );
  assert.deepEqual(updatedStudent.data, {
    success: true,
    message: "Student updated successfully",
    studentid: "ST1",
    uniqueid: "LINK-AHMAD",
    username: "Ahmad Updated",
    whatsapp6: "001234",
    classgroup: "5",
    active: false
  });
  assert.equal(batchUpdates.length, 1);
  assert.deepEqual(batchUpdates[0], {
    valueInputOption: "RAW",
    data: [
      { range: "StudentRecords!B4", majorDimension: "ROWS", values: [["Ahmad Updated"]] },
      { range: "StudentRecords!C4", majorDimension: "ROWS", values: [["001234"]] },
      { range: "StudentRecords!G4", majorDimension: "ROWS", values: [["5"]] },
      { range: "StudentRecords!K4", majorDimension: "ROWS", values: [[false]] }
    ]
  });
  assert.equal(
    batchUpdates[0].data.some(update => /StudentRecords![EFJ]4$/.test(update.range)),
    false,
    "Student updates must not overwrite PIN or failed-attempt fields"
  );

  const unchangedStudent = await postAdmin(
    "/api/admin/update-student",
    adminToken,
    { uniqueid: "LINK-AHMAD" },
    directEnv
  );
  assert.equal(unchangedStudent.data.success, true);
  assert.equal(unchangedStudent.data.username, "Ahmad");
  assert.equal(batchUpdates.length, 1, "An empty update must not call the write API");

  const missingStudent = await postAdmin(
    "/api/admin/update-student",
    adminToken,
    { uniqueid: "NOT-FOUND", username: "Nobody" },
    directEnv
  );
  assert.deepEqual(missingStudent.data, { success: false, error: "Student not found" });
  assert.equal(batchUpdates.length, 1);

  const invalidActive = await postAdmin(
    "/api/admin/update-student",
    adminToken,
    { uniqueid: "LINK-AHMAD", active: "false" },
    directEnv
  );
  assert.equal(invalidActive.response.status, 400);
  assert.deepEqual(invalidActive.data, {
    success: false,
    error: "active must be true or false"
  });

  const phoneSearch = await postAdmin(
    "/api/admin/search-students",
    adminToken,
    { whatsapp6: "345" },
    directEnv
  );
  assert.equal(phoneSearch.data.count, 0, "The explicit WhatsApp field requires the last six digits");

  const querySearch = await postAdmin(
    "/api/admin/student/search",
    adminToken,
    { query: "2345" },
    directEnv
  );
  assert.deepEqual(querySearch.data.students.map(student => student.studentid), ["ST1"]);

  const assignmentOptions = await postAdmin(
    "/api/admin/students/assignment-options",
    adminToken,
    {},
    directEnv
  );
  assert.equal(assignmentOptions.response.status, 200);
  assert.equal(assignmentOptions.response.headers.get("X-M4L-Feature"), "task-assignment-read");
  assert.equal(assignmentOptions.response.headers.get("X-M4L-Backend"), "google-sheets");
  assert.equal(
    assignmentOptions.response.headers.get("X-M4L-Backend-Source"),
    "M4L_BACKEND_TASK_ASSIGNMENT_READ"
  );
  assert.deepEqual(assignmentOptions.data, {
    success: true,
    subjects: [
      {
        subjectid: "SUB1",
        subjectname: "Aqidah",
        modules: [
          { moduleid: "M1", modulename: "First Module", sortorder: 1, taskCount: 1 },
          { moduleid: "M2", modulename: "Second Module", sortorder: 2, taskCount: 1 },
          { moduleid: "NO_MODULE", modulename: "General", sortorder: 999999, taskCount: 1 }
        ]
      }
    ]
  });

  missingSheetName = "StudentRecords";
  const missingStudents = await postAdmin(
    "/api/admin/students/search",
    adminToken,
    { listAll: true },
    directEnv
  );
  assert.deepEqual(missingStudents.data, {
    success: false,
    error: "StudentRecords sheet not found"
  });
  missingSheetName = "";

  assert.deepEqual(
    new Set(requestedRanges),
    new Set([
      "StudentRecords!A:ZZ",
      "SubjectList!A:ZZ",
      "ModuleList!A:ZZ",
      "TaskList!A:ZZ",
      "SystemConfig!A:D"
    ])
  );
} finally {
  globalThis.fetch = originalFetch;
}

let appsScriptPayload = null;
globalThis.fetch = async (input, init = {}) => {
  assert.equal(String(input), "https://script.example.test/exec");
  appsScriptPayload = JSON.parse(init.body);
  return response({ success: true, students: [], subjects: [] });
};

try {
  const fallbackEnv = {
    SESSION_SECRET: sessionSecret,
    APPS_SCRIPT_URL: "https://script.example.test/exec"
  };

  const legacySearch = await postAdmin(
    "/api/admin/students/search",
    adminToken,
    { query: "Ahmad" },
    fallbackEnv
  );
  assert.equal(legacySearch.response.headers.get("X-M4L-Feature"), "student-management-read");
  assert.equal(legacySearch.response.headers.get("X-M4L-Backend"), "apps-script");
  assert.deepEqual(appsScriptPayload, {
    action: "searchStudents",
    data: { query: "Ahmad", whatsapp6: "", listAll: false }
  });

  const legacyOptions = await postAdmin(
    "/api/admin/students/assignment-options",
    adminToken,
    {},
    fallbackEnv
  );
  assert.equal(legacyOptions.response.headers.get("X-M4L-Feature"), "task-assignment-read");
  assert.equal(legacyOptions.response.headers.get("X-M4L-Backend"), "apps-script");
  assert.deepEqual(appsScriptPayload, { action: "getStudentAssignmentOptions" });

  const legacyRegister = await postAdmin(
    "/api/admin/register-student",
    adminToken,
    { username: "New Student", whatsapp6: "123456", classgroup: "2" },
    {
      ...fallbackEnv,
      M4L_BACKEND_STUDENT_MANAGEMENT_READ: "google-sheets",
      M4L_BACKEND_STUDENT_MANAGEMENT_UPDATE: "google-sheets"
    }
  );
  assert.equal(legacyRegister.response.headers.get("X-M4L-Feature"), "student-management-write");
  assert.equal(legacyRegister.response.headers.get("X-M4L-Backend"), "apps-script");
  assert.equal(appsScriptPayload.action, "registerStudent");
  assert.equal(appsScriptPayload.data.username, "New Student");

  const legacyUpdate = await postAdmin(
    "/api/admin/update-student",
    adminToken,
    { uniqueid: "LINK-AHMAD", username: "Legacy Update" },
    fallbackEnv
  );
  assert.equal(legacyUpdate.response.headers.get("X-M4L-Feature"), "student-management-update");
  assert.equal(legacyUpdate.response.headers.get("X-M4L-Backend"), "apps-script");
  assert.deepEqual(appsScriptPayload, {
    action: "updateStudent",
    data: { uniqueid: "LINK-AHMAD", username: "Legacy Update" }
  });

  const legacyAssign = await postAdmin(
    "/api/admin/tasks/assign",
    adminToken,
    { studentids: ["ST1"], assignmentMode: "all" },
    {
      ...fallbackEnv,
      M4L_BACKEND_TASK_ASSIGNMENT_READ: "google-sheets"
    }
  );
  assert.equal(legacyAssign.response.headers.get("X-M4L-Feature"), "task-assignment-write");
  assert.equal(legacyAssign.response.headers.get("X-M4L-Backend"), "apps-script");
  assert.equal(appsScriptPayload.action, "assignTasksToStudents");
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Direct Student Management read/update tests passed.");

async function postAdmin(path, token, body, env) {
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
