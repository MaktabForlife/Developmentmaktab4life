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
    "RegisteredBy",
    "CreatedByAdminID",
    "CreatedByAdminName",
    "ModifiedByAdminID",
    "ModifiedByAdminName",
    "ModifiedDate"
  ],
  ["SYSTEM1", "Maktab Day", "999999", "SYSTEM", false, "", "ALL", "", "", 0, true, "SYSTEM"],
  ["MAKTAB197", "Ahmad", "012345", "LINK-AHMAD", true, "secret", "2", "2026-07-01", "", 0, true, "Admin"],
  ["MAKTAB198", "Ahmad1", "111111", "LINK-AHMAD1", true, "secret", "2", "2026-07-02", "", 0, true, "Admin"],
  ["MAKTAB199", "Ahmad2", "222222", "LINK-AHMAD2", true, "secret", "2", "2026-07-03", "", 0, true, "Admin"]
];
const systemConfigRows = [
  ["StudentLoginBaseUrl", "https://development.example.test/student/"]
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
  ["TASK1", "SUB1", "First", "", "", "", "", true, "", "MOD1", "Module 1", "Aqidah"],
  ["TASK2", "SUB1", "Second", "", "", "", "", "TRUE", "", "MOD2", "Module 2", "Aqidah"],
  ["TASK3", "SUB1", "Inactive", "", "", "", "", false, "", "MOD1", "Module 1", "Aqidah"]
];
const studentTaskRows = [
  [
    "StudentTaskID",
    "StudentID",
    "TaskID",
    "SubjectID",
    "SubjectName",
    "ModuleID",
    "ModuleName",
    "TaskName",
    "CompleteStatus",
    "CompleteDate",
    "VerifyStatus",
    "VerifyDate",
    "AssignedBy",
    "AssignedDate"
  ]
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
const sessionSecret = "student-registration-test-secret";
const directEnv = {
  SESSION_SECRET: sessionSecret,
  GOOGLE_SPREADSHEET_ID: "test-spreadsheet",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "student-registration-test@example.iam.gserviceaccount.com",
    private_key_id: "student-registration-test-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"),
    token_uri: "https://oauth2.googleapis.com/token"
  }),
  M4L_BACKEND_STUDENT_MANAGEMENT_WRITE: "google-sheets"
};
const adminToken = await makeSessionToken({
  type: "admin",
  adminid: "ADMIN1",
  username: "Admin User",
  role: "ADMIN"
}, sessionSecret);
const seniorToken = await makeSessionToken({
  type: "admin",
  adminid: "SENIOR1",
  username: "Senior User",
  role: "SENIOR"
}, sessionSecret);
const teacherToken = await makeSessionToken({
  type: "admin",
  adminid: "TEACHER1",
  username: "Teacher User",
  role: "TEACHER",
  assignedgroup: "2"
}, sessionSecret);
const originalFetch = globalThis.fetch;
const reads = [];
const updates = [];
const appends = [];
const auditRows = [[
  "AuditID", "DateStamp", "AdminID", "AdminName", "Role", "Action",
  "RecordType", "RecordID", "ChangedFields"
]];
let missingSheetName = "";

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));

  if (url.hostname === "oauth2.googleapis.com") {
    return response({ access_token: "mock-registration-token", expires_in: 3600 });
  }

  if (url.hostname !== "sheets.googleapis.com") {
    throw new Error(`Unexpected registration fetch: ${url}`);
  }

  assert.equal(init.headers.Authorization, "Bearer mock-registration-token");

  const rangeAndAction = decodeURIComponent(url.pathname.split("/values/")[1] || "");
  const isAppend = rangeAndAction.endsWith(":append");
  const range = isAppend ? rangeAndAction.slice(0, -":append".length) : rangeAndAction;

  if (init.method === "GET") {
    reads.push(range);

    if (missingSheetName && range.startsWith(`${missingSheetName}!`)) {
      return response({ error: { message: `Unable to parse range: ${range}` } }, 400);
    }

    if (range === "StudentRecords!A:ZZ") return response({ values: studentRows });
    if (range === "SystemConfig!A:E") return response({ values: systemConfigRows });
    if (range === "AdminAuditLog!A1:I1") return response({ values: [auditRows[0]] });
    if (range === "TaskList!A:ZZ") return response({ values: taskRows });
    if (range === "StudentTasks!A:ZZ") return response({ values: studentTaskRows });

    throw new Error(`Unexpected registration range: ${range}`);
  }

  const payload = JSON.parse(init.body);

  if (init.method === "PUT") {
    updates.push({ range, payload });

    return response({ updatedRange: range, updatedRows: 1 });
  }

  if (init.method === "POST" && isAppend) {
    if (range === "AdminAuditLog!A:I") {
      auditRows.push(...payload.values);
      return response({ updates: { updatedRows: payload.values.length } });
    }
    appends.push({ range, payload });

    if (range === "StudentRecords!A:Q") {
      studentRows.push(...payload.values);
    } else if (range === "StudentTasks!A:N") {
      studentTaskRows.push(...payload.values);
    }

    return response({ updates: { updatedRows: payload.values.length } });
  }

  throw new Error(`Unexpected Sheets request: ${init.method} ${rangeAndAction}`);
};

try {
  const registered = await postAdmin(
    "/api/admin/register-student",
    adminToken,
    {
      username: "  New Student  ",
      whatsapp6: "12 34 56",
      classgroup: " 4 ",
      assignmentMode: "selected",
      selectedModules: []
    },
    directEnv
  );

  assert.equal(registered.response.status, 200);
  assert.equal(registered.response.headers.get("X-M4L-Feature"), "student-management-write");
  assert.equal(registered.response.headers.get("X-M4L-Backend"), "google-sheets");
  assert.equal(
    registered.response.headers.get("X-M4L-Backend-Source"),
    "fixed"
  );
  assert.equal(registered.data.success, true);
  assert.equal(registered.data.studentid, "MAKTAB200");
  assert.equal(registered.data.username, "New Student");
  assert.equal(registered.data.whatsapp6, "123456");
  assert.equal(registered.data.classgroup, "4");
  assert.equal(registered.data.registeredby, "Admin User");
  assert.match(registered.data.uniqueid, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{10}$/);
  assert.equal(
    registered.data.loginUrl,
    `https://development.example.test/student/${registered.data.uniqueid}`
  );
  assert.equal(registered.data.taskAssignmentPending, true);
  assert.equal("assignment" in registered.data, false);

  assert.deepEqual(updates, [], "Registration must not write SystemConfig counters");
  assert.equal(appends.length, 1);
  assert.equal(appends[0].range, "StudentRecords!A:Q");
  assert.deepEqual(appends[0].payload.values[0].slice(0, 4), [
    "MAKTAB200",
    "New Student",
    "123456",
    registered.data.uniqueid
  ]);
  assert.deepEqual(appends[0].payload.values[0].slice(4, 12), [
    false,
    "",
    "4",
    appends[0].payload.values[0][7],
    "",
    0,
    true,
    "Admin User"
  ]);
  assert.match(appends[0].payload.values[0][7], /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(appends[0].payload.values[0][12], "ADMIN1");
  assert.equal(appends[0].payload.values[0][13], "Admin User");
  assert.ok(auditRows.some(row => row[5] === "CREATE" && row[7] === "MAKTAB200"));

  assert.equal(
    appends.some(item => item.range.startsWith("StudentTasks!")),
    false,
    "Registration must not create StudentTasks rows"
  );

  const writeCountBeforeDuplicate = updates.length + appends.length;
  const duplicate = await postAdmin(
    "/api/admin/register-student",
    adminToken,
    {
      username: "NewStudent",
      whatsapp6: "123456",
      classgroup: "4"
    },
    directEnv
  );

  assert.deepEqual(duplicate.data, {
    success: false,
    duplicate: true,
    matches: [
      {
        studentid: "MAKTAB200",
        username: "New Student",
        whatsapp6: "123456",
        uniqueid: registered.data.uniqueid,
        classgroup: "4",
        createdate: appends[0].payload.values[0][7],
        lastlogin: "",
        active: true
      }
    ],
    suggestedUsername: "NewStudent1",
    error: "Duplicate student found. Confirmation required."
  });
  assert.equal(
    updates.length + appends.length,
    writeCountBeforeDuplicate,
    "Duplicate validation must not reserve IDs or write rows"
  );

  const confirmed = await postAdmin(
    "/api/admin/register-student",
    adminToken,
    {
      username: "Ahmad",
      whatsapp6: "012345",
      classgroup: "2",
      confirmDuplicate: true,
      assignmentMode: "selected",
      selectedModules: [{ subjectid: "SUB1", moduleid: "MOD2" }]
    },
    directEnv
  );

  assert.equal(confirmed.data.success, true);
  assert.equal(confirmed.data.username, "Ahmad3");
  assert.equal(confirmed.data.studentid, "MAKTAB201");
  assert.equal(confirmed.data.taskAssignmentPending, true);
  assert.equal(appends.at(-1).range, "StudentRecords!A:Q");

  const allGroupsRegistration = await postAdmin(
    "/api/admin/register-student",
    adminToken,
    {
      username: "Visiting Student",
      whatsapp6: "444444",
      classgroup: 0
    },
    directEnv
  );
  assert.equal(allGroupsRegistration.response.status, 200);
  assert.equal(allGroupsRegistration.data.success, true);
  assert.equal(allGroupsRegistration.data.classgroup, "0", "Numeric Group 0 must be preserved as ALL access");

  const writesBeforeSeniorAllGroupsAttempt = updates.length + appends.length;
  const seniorAllGroupsAttempt = await postAdmin(
    "/api/admin/register-student",
    seniorToken,
    {
      username: "Senior ALL Attempt",
      whatsapp6: "666666",
      classgroup: "0"
    },
    directEnv
  );
  assert.equal(seniorAllGroupsAttempt.response.status, 403);
  assert.equal(seniorAllGroupsAttempt.data.error, "Only an Admin can assign Group 0 (ALL) access");
  assert.equal(
    updates.length + appends.length,
    writesBeforeSeniorAllGroupsAttempt,
    "A Senior Group 0 registration attempt must not write data"
  );

  const invalidGroup = await postAdmin(
    "/api/admin/register-student",
    adminToken,
    {
      username: "Invalid Group",
      whatsapp6: "777777",
      classgroup: "1.5"
    },
    directEnv
  );
  assert.equal(invalidGroup.response.status, 400);
  assert.equal(invalidGroup.data.error, "classgroup must be 0 (ALL) or a positive whole number");

  missingSheetName = "StudentRecords";
  const missingStudents = await postAdmin(
    "/api/admin/register-student",
    adminToken,
    { username: "Missing Sheet", whatsapp6: "555555", classgroup: "1" },
    directEnv
  );
  assert.deepEqual(missingStudents.data, {
    success: false,
    error: "StudentRecords sheet not found"
  });
  missingSheetName = "";

  const forbidden = await postAdmin(
    "/api/admin/register-student",
    teacherToken,
    { username: "Teacher Attempt", whatsapp6: "555555", classgroup: "2" },
    directEnv
  );
  assert.equal(forbidden.response.status, 403);
  assert.equal(forbidden.data.success, false);

  assert.deepEqual(
    new Set(reads),
    new Set([
      "StudentRecords!A:ZZ",
      "SystemConfig!A:E",
      "AdminAuditLog!A1:I1"
    ])
  );
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Direct Student Registration tests passed.");

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
