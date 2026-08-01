import assert from "node:assert/strict";
import worker from "../src/worker.js";
import { hashPin, verifySessionToken } from "../src/lib/auth.js";

const STUDENT_HEADERS = [
  "StudentID", "Username", "WhatsAppLast6", "UniqueID", "PinSetup", "PinHash",
  "ClassGroup", "CreateDate", "LastLogin", "FailedAttempts", "Active", "RegisteredBy"
];
const ADMIN_HEADERS = [
  "AdminID", "Username", "UniqueID", "PinSetup", "PinHash", "Role",
  "AssignedGroup", "Active", "CreateDate", "LastLogin", "URL"
];
const pinSecret = "auth-pin-test-secret";
const sessionSecret = "auth-session-test-secret";
const studentHash = await hashPin("1234", pinSecret);
const adminHash = await hashPin("4321", pinSecret);

let studentRows;
let adminRows;
let reads = [];
let updates = [];
let batchUpdates = [];
let missingSheetName = "";

function resetSheets() {
  studentRows = [
    STUDENT_HEADERS,
    ["ST1", "Student One", "111111", "STUDENT-LINK", true, studentHash, "2", "", "", 4, true, "Admin"],
    ["ST2", "Student Two", "222222", "STUDENT-SETUP", false, "", "3", "", "", 7, true, "Admin"],
    ["ST3", "Disabled Student", "333333", "STUDENT-DISABLED", true, studentHash, "4", "", "", 0, false, "Admin"],
    ["ST4", "String Boolean", "444444", "STUDENT-STRING", "TRUE", studentHash, "5", "", "", 0, "TRUE", "Admin"]
  ];
  adminRows = [
    ADMIN_HEADERS,
    ["ADMIN1", "Admin One", "ADMIN-LINK", true, adminHash, "ADMIN", "ALL", true, "", "", ""],
    ["ADMIN2", "Senior Two", "ADMIN-SETUP", false, "", "SENIOR", "2", true, "", "", ""],
    ["ADMIN3", "Disabled Admin", "ADMIN-DISABLED", true, adminHash, "ADMIN", "ALL", false, "", "", ""],
    ["ADMIN4", "Teacher Four", "TEACHER-LINK", true, adminHash, "TEACHER", "4", true, "", "", ""]
  ];
  reads = [];
  updates = [];
  batchUpdates = [];
  missingSheetName = "";
}

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
const directEnv = {
  PIN_SECRET: pinSecret,
  SESSION_SECRET: sessionSecret,
  GOOGLE_SPREADSHEET_ID: "test-spreadsheet",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "auth-test@example.iam.gserviceaccount.com",
    private_key_id: "auth-test-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"),
    token_uri: "https://oauth2.googleapis.com/token"
  }),
  M4L_BACKEND_AUTH: "google-sheets"
};

resetSheets();
const originalFetch = globalThis.fetch;

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));

  if (url.hostname === "oauth2.googleapis.com") {
    return response({ access_token: "mock-auth-token", expires_in: 3600 });
  }

  if (url.hostname !== "sheets.googleapis.com") {
    throw new Error(`Unexpected authentication fetch: ${url}`);
  }

  assert.equal(init.headers.Authorization, "Bearer mock-auth-token");

  if (url.pathname.endsWith("/values:batchUpdate")) {
    assert.equal(init.method, "POST");
    const payload = JSON.parse(init.body);
    batchUpdates.push(...payload.data);
    payload.data.forEach(applySheetUpdate);
    return response({ totalUpdatedRows: payload.data.length });
  }

  const range = decodeURIComponent(url.pathname.split("/values/")[1] || "");

  if (init.method === "GET") {
    reads.push(range);

    if (missingSheetName && range.startsWith(`${missingSheetName}!`)) {
      return response({ error: { message: `Unable to parse range: ${range}` } }, 400);
    }

    if (range === "StudentRecords!A:ZZ") return response({ values: studentRows });
    if (range === "AdminRecords!A:ZZ") return response({ values: adminRows });
    throw new Error(`Unexpected authentication range: ${range}`);
  }

  if (init.method === "PUT") {
    const payload = JSON.parse(init.body);
    updates.push({ range, payload });
    applySheetUpdate({ range, values: payload.values });
    return response({ updatedRange: range, updatedRows: 1 });
  }

  throw new Error(`Unexpected Sheets request: ${init.method} ${range}`);
};

try {
  const checkedStudent = await post("/api/check-student", {
    uniqueid: "STUDENT-LINK"
  }, directEnv);
  assert.equal(checkedStudent.response.status, 200);
  assertRoutingHeaders(checkedStudent.response);
  assert.deepEqual(checkedStudent.data, {
    success: true,
    student: {
      studentid: "ST1",
      username: "Student One",
      classgroup: "2",
      pinsetup: true
    }
  });
  assert.equal(JSON.stringify(checkedStudent.data).includes(studentHash), false);

  const checkedAdmin = await post("/api/admin/check-admin", {
    uniqueid: " ADMIN-LINK "
  }, directEnv);
  assert.equal(checkedAdmin.response.status, 200);
  assert.deepEqual(checkedAdmin.data, {
    success: true,
    admin: {
      adminid: "ADMIN1",
      username: "Admin One",
      uniqueid: "ADMIN-LINK",
      role: "ADMIN",
      assignedgroup: "ALL",
      pinsetup: true
    }
  });
  assert.equal(JSON.stringify(checkedAdmin.data).includes(adminHash), false);

  const studentWhitespace = await post("/api/check-student", {
    uniqueid: " STUDENT-LINK "
  }, directEnv);
  assert.equal(studentWhitespace.response.status, 404);
  assert.equal(studentWhitespace.data.error, "Invalid login link");

  const disabledStudent = await post("/api/check-student", {
    uniqueid: "STUDENT-DISABLED"
  }, directEnv);
  assert.equal(disabledStudent.response.status, 403);
  assert.equal(disabledStudent.data.error, "Account disabled");

  const disabledAdmin = await post("/api/admin/check-admin", {
    uniqueid: "ADMIN-DISABLED"
  }, directEnv);
  assert.equal(disabledAdmin.response.status, 403);
  assert.equal(disabledAdmin.data.error, "Admin account disabled");

  const studentLogin = await post("/api/login", {
    uniqueid: "STUDENT-LINK",
    pin: "1234"
  }, directEnv);
  assert.equal(studentLogin.response.status, 200);
  assert.equal(studentLogin.data.success, true);
  assert.equal(studentLogin.data.message, "Login successful");
  assert.deepEqual(studentLogin.data.student, {
    studentid: "ST1",
    username: "Student One",
    classgroup: "2"
  });
  assert.equal(JSON.stringify(studentLogin.data).includes(studentHash), false);
  const studentSession = await verifySessionToken(studentLogin.data.token, directEnv);
  assert.equal(studentSession.type, "student");
  assert.equal(studentSession.studentid, "ST1");
  assert.equal(studentSession.classgroup, "2");

  const wrongStudentPin = await post("/api/login", {
    uniqueid: "STUDENT-LINK",
    pin: "9999"
  }, directEnv);
  assert.equal(wrongStudentPin.response.status, 401);
  assert.equal(wrongStudentPin.data.error, "Incorrect PIN");

  const studentNeedsSetup = await post("/api/login", {
    uniqueid: "STUDENT-SETUP",
    pin: "2468"
  }, directEnv);
  assert.equal(studentNeedsSetup.response.status, 403);
  assert.equal(studentNeedsSetup.data.error, "PIN not set up yet");

  const adminLogin = await post("/api/admin/login", {
    uniqueid: "ADMIN-LINK",
    pin: "4321"
  }, directEnv);
  assert.equal(adminLogin.response.status, 200);
  assert.equal(adminLogin.data.success, true);
  assert.equal(adminLogin.data.message, "Admin login successful");
  assert.deepEqual(adminLogin.data.admin, {
    adminid: "ADMIN1",
    username: "Admin One",
    uniqueid: "ADMIN-LINK",
    role: "ADMIN",
    assignedgroup: "ALL"
  });
  assert.equal(JSON.stringify(adminLogin.data).includes(adminHash), false);
  const adminSession = await verifySessionToken(adminLogin.data.token, directEnv);
  assert.equal(adminSession.type, "admin");
  assert.equal(adminSession.adminid, "ADMIN1");
  assert.equal(adminSession.role, "ADMIN");

  const studentSetup = await post("/api/setup-pin", {
    uniqueid: "STUDENT-SETUP",
    pin: "2468"
  }, directEnv);
  assert.deepEqual(studentSetup.data, {
    success: true,
    studentid: "ST2",
    username: "Student Two"
  });
  const expectedStudentSetupHash = await hashPin("2468", pinSecret);
  assert.deepEqual(batchUpdates.slice(-2), [
    {
      range: "StudentRecords!E3:F3",
      majorDimension: "ROWS",
      values: [[true, expectedStudentSetupHash]]
    },
    {
      range: "StudentRecords!J3",
      majorDimension: "ROWS",
      values: [[0]]
    }
  ]);
  assert.equal(studentRows[2][4], true);
  assert.equal(studentRows[2][5], expectedStudentSetupHash);
  assert.equal(studentRows[2][9], 0);

  const setupStudentLogin = await post("/api/login", {
    uniqueid: "STUDENT-SETUP",
    pin: "2468"
  }, directEnv);
  assert.equal(setupStudentLogin.data.success, true);

  const adminSetup = await post("/api/admin/setup-pin", {
    uniqueid: "ADMIN-SETUP",
    pin: "8642"
  }, directEnv);
  assert.deepEqual(adminSetup.data, {
    success: true,
    adminid: "ADMIN2",
    username: "Senior Two",
    role: "SENIOR",
    assignedgroup: "2"
  });
  const expectedAdminSetupHash = await hashPin("8642", pinSecret);
  assert.deepEqual(updates.at(-1), {
    range: "AdminRecords!D3:E3",
    payload: {
      range: "AdminRecords!D3:E3",
      majorDimension: "ROWS",
      values: [[true, expectedAdminSetupHash]]
    }
  });
  assert.equal(adminRows[2][3], true);
  assert.equal(adminRows[2][4], expectedAdminSetupHash);

  const resetStudent = await post(
    "/api/admin/reset-pin",
    { uniqueid: "STUDENT-LINK" },
    directEnv,
    adminLogin.data.token
  );
  assert.deepEqual(resetStudent.data, {
    success: true,
    message: "PIN reset successfully",
    studentid: "ST1",
    username: "Student One"
  });
  assert.deepEqual(batchUpdates.slice(-2), [
    {
      range: "StudentRecords!E2:F2",
      majorDimension: "ROWS",
      values: [[false, ""]]
    },
    {
      range: "StudentRecords!J2",
      majorDimension: "ROWS",
      values: [[0]]
    }
  ]);

  const teacherLogin = await post("/api/admin/login", {
    uniqueid: "TEACHER-LINK",
    pin: "4321"
  }, directEnv);
  assert.equal(teacherLogin.data.success, true);
  const readCountBeforeForbiddenReset = reads.length;
  const forbiddenReset = await post(
    "/api/admin/reset-pin",
    { uniqueid: "STUDENT-SETUP" },
    directEnv,
    teacherLogin.data.token
  );
  assert.equal(forbiddenReset.response.status, 403);
  assert.equal(forbiddenReset.data.error, "Forbidden");
  assert.equal(reads.length, readCountBeforeForbiddenReset);

  const invalidPin = await post("/api/setup-pin", {
    uniqueid: "STUDENT-SETUP",
    pin: "12ab"
  }, directEnv);
  assert.equal(invalidPin.response.status, 400);
  assert.equal(invalidPin.data.error, "PIN must be 4 digits");

  missingSheetName = "StudentRecords";
  const missingStudents = await post("/api/check-student", {
    uniqueid: "STUDENT-LINK"
  }, directEnv);
  assert.deepEqual(missingStudents.data, {
    success: false,
    error: "StudentRecords sheet not found"
  });
  missingSheetName = "AdminRecords";
  const missingAdmins = await post("/api/admin/check-admin", {
    uniqueid: "ADMIN-LINK"
  }, directEnv);
  assert.deepEqual(missingAdmins.data, {
    success: false,
    error: "AdminRecords sheet not found"
  });
} finally {
  globalThis.fetch = originalFetch;
}

let appsScriptPayload = null;
globalThis.fetch = async (input, init = {}) => {
  assert.equal(String(input), "https://script.example.test/exec");
  appsScriptPayload = JSON.parse(init.body);
  return response({
    success: true,
    student: {
      studentid: "LEGACY1",
      username: "Legacy Student",
      classgroup: "1",
      pinsetup: true,
      active: true
    }
  });
};

try {
  const fallback = await post("/api/check-student", {
    uniqueid: "LEGACY-LINK"
  }, {
    PIN_SECRET: pinSecret,
    SESSION_SECRET: sessionSecret,
    APPS_SCRIPT_URL: "https://script.example.test/exec"
  });

  assert.equal(fallback.response.headers.get("X-M4L-Feature"), "auth");
  assert.equal(fallback.response.headers.get("X-M4L-Backend"), "apps-script");
  assert.equal(fallback.response.headers.get("X-M4L-Backend-Source"), "default");
  assert.deepEqual(appsScriptPayload, {
    action: "getStudentByUniqueId",
    uniqueid: "LEGACY-LINK"
  });
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Direct Authentication tests passed.");

function applySheetUpdate(update) {
  const match = /^([^!]+)!([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/.exec(update.range);

  if (!match) {
    throw new Error(`Unexpected update range: ${update.range}`);
  }

  const [, sheetName, startColumn, rowText] = match;
  const rows = sheetName === "StudentRecords" ? studentRows : adminRows;
  const rowIndex = Number(rowText) - 1;
  const columnIndex = columnNumber(startColumn) - 1;

  update.values[0].forEach((value, offset) => {
    rows[rowIndex][columnIndex + offset] = value;
  });
}

function columnNumber(column) {
  return Array.from(column).reduce(
    (number, character) => number * 26 + character.charCodeAt(0) - 64,
    0
  );
}

function assertRoutingHeaders(responseObject) {
  assert.equal(responseObject.headers.get("X-M4L-Feature"), "auth");
  assert.equal(responseObject.headers.get("X-M4L-Backend"), "google-sheets");
  assert.equal(responseObject.headers.get("X-M4L-Backend-Source"), "M4L_BACKEND_AUTH");
}

async function post(path, body, env, token = "") {
  const headers = { "Content-Type": "application/json" };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const responseObject = await worker.fetch(new Request(`https://worker.test${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  }), env);

  return { response: responseObject, data: await responseObject.json() };
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
