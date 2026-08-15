import assert from "node:assert/strict";
import {
  createSaltedPinHash,
  getAuthUser,
  verifySessionToken
} from "../src/lib/auth.js";
import { PLATFORM_SHEET_HEADERS } from "../src/lib/platform-schema.js";
import { buildAvailableContexts } from "../src/routes/account-auth.js";
import worker from "../src/worker.js";

const pinSecret = "account-pin-secret";
const sessionSecret = "account-session-secret";
const adminHash = await createSaltedPinHash("4321", pinSecret);
const globalHash = await createSaltedPinHash("2468", pinSecret);
const disabledHash = await createSaltedPinHash("9999", pinSecret);

const tables = {
  CourseRegistry: [
    PLATFORM_SHEET_HEADERS.CourseRegistry,
    ["COURSE1", "Reboot Your Maktab", "course-sheet-one", true, "101.4.3"],
    ["COURSE2", "Aalimiyah", "course-sheet-two", true, "101.4.3"],
    ["COURSE3", "Inactive Course", "course-sheet-three", false, "101.4.3"]
  ],
  UserAccounts: [
    PLATFORM_SHEET_HEADERS.UserAccounts,
    ["ACCOUNT1", "Admin One", "ADMIN-LINK", true, adminHash, true, "", "2026-08-15T00:00:00.000Z", "", "", "", "", "", ""],
    ["ACCOUNT2", "Global Admin", "GLOBAL-LINK", true, globalHash, true, "", "2026-08-15T00:00:00.000Z", "", "", "", "", "", "GLOBAL_ADMIN"],
    ["ACCOUNT3", "Disabled", "DISABLED-LINK", true, disabledHash, false, "", "2026-08-15T00:00:00.000Z", "", "", "", "", "", ""],
    ["ACCOUNT4", "New Student", "SETUP-LINK", false, "", true, "", "2026-08-15T00:00:00.000Z", "", "", "", "", "", ""]
  ],
  UserCourseAccess: [
    PLATFORM_SHEET_HEADERS.UserCourseAccess,
    ["ACCESS1", "ACCOUNT1", "COURSE1", "ADMIN", true, false, "2026-08-13T12:00:00.000Z", "", "", "", "", "", "", "ADMIN1"],
    ["ACCESS2", "ACCOUNT1", "COURSE2", "ADMIN", true, true, "2026-08-14T12:00:00.000Z", "", "", "", "", "", "", "ADMIN9"],
    ["ACCESS3", "ACCOUNT1", "COURSE1", "TEACHER", true, false, "2026-08-15T12:00:00.000Z", "", "", "", "", "", "", "ADMIN1"],
    ["ACCESS4", "ACCOUNT4", "COURSE1", "STUDENT", true, true, "", "", "", "", "", "", "", "STUDENT4"]
  ],
  PlatformConfig: [
    PLATFORM_SHEET_HEADERS.PlatformConfig,
    ["AccountLoginBaseUrl", "https://development.example.test/account/"],
    ["PlatformSchemaVersion", "102.0.3"],
    ["GlobalCurriculumVersion", "1"]
  ],
  PlatformAuditLog: [
    PLATFORM_SHEET_HEADERS.PlatformAuditLog
  ]
};

const plainContexts = buildAvailableContexts(
  record(tables.UserAccounts, 2),
  [record(tables.UserCourseAccess, 2), record(tables.UserCourseAccess, 3), record(tables.UserCourseAccess, 4)],
  [record(tables.CourseRegistry, 2), record(tables.CourseRegistry, 3), record(tables.CourseRegistry, 4)]
);
assert.deepEqual(plainContexts.map(context => `${context.courseId}:${context.role}`), [
  "COURSE2:ADMIN",
  "COURSE1:ADMIN",
  "COURSE1:TEACHER"
]);
const globalContexts = buildAvailableContexts(
  record(tables.UserAccounts, 3),
  [],
  [record(tables.CourseRegistry, 2), record(tables.CourseRegistry, 3), record(tables.CourseRegistry, 4)]
);
assert.deepEqual(globalContexts.map(context => `${context.scope}:${context.courseId}:${context.role}`), [
  "PLATFORM::GLOBAL_ADMIN",
  "COURSE:COURSE1:GLOBAL_ADMIN",
  "COURSE:COURSE2:GLOBAL_ADMIN"
]);

const keyPair = await crypto.subtle.generateKey({
  name: "RSASSA-PKCS1-v1_5",
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256"
}, true, ["sign", "verify"]);
const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey));
const env = {
  PIN_SECRET: pinSecret,
  SESSION_SECRET: sessionSecret,
  PLATFORM_SPREADSHEET_ID: "platform-sheet-test",
  GOOGLE_SPREADSHEET_ID: "legacy-course-sheet",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "account-test@example.iam.gserviceaccount.com",
    private_key_id: "account-test-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"),
    token_uri: "https://oauth2.googleapis.com/token"
  }),
  M4L_REQUIRE_CREDENTIAL_BOUND_SESSIONS: "true",
  M4L_ACCOUNT_AUTH_DIAGNOSTICS: "true"
};

const reads = [];
const writes = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  if (url.hostname === "oauth2.googleapis.com") {
    return response({ access_token: "mock-account-token", expires_in: 3600 });
  }
  if (url.hostname !== "sheets.googleapis.com") {
    throw new Error(`Unexpected account test fetch: ${url}`);
  }
  assert.equal(init.headers.Authorization, "Bearer mock-account-token");
  assert.match(url.pathname, /spreadsheets\/platform-sheet-test/);

  if (url.pathname.endsWith("/values:batchUpdate")) {
    const payload = JSON.parse(init.body);
    writes.push(...payload.data);
    payload.data.forEach(applyUpdate);
    return response({ totalUpdatedRows: payload.data.length });
  }

  const range = decodeURIComponent(url.pathname.split("/values/")[1] || "");
  if (init.method !== "GET") throw new Error(`Unexpected Sheets operation: ${init.method} ${range}`);
  reads.push(range);
  const fullMatch = /^'([^']+)'!A:([A-Z]+)$/.exec(range);
  if (fullMatch && tables[fullMatch[1]]) return response({ values: tables[fullMatch[1]] });
  const rowMatch = /^(UserAccounts|UserCourseAccess)!A(\d+):[A-Z]+\2$/.exec(range);
  if (rowMatch) {
    return response({ values: [tables[rowMatch[1]][Number(rowMatch[2]) - 1] || []] });
  }
  throw new Error(`Unexpected account authentication range: ${range}`);
};

try {
  const checked = await post("/api/account/check", { uniqueid: "ADMIN-LINK" });
  assert.equal(checked.response.status, 200, JSON.stringify(checked.data));
  assert.equal(checked.response.headers.get("X-M4L-Feature"), "account-auth");
  assert.deepEqual(checked.data, {
    success: true,
    account: { displayName: "Admin One", uniqueid: "ADMIN-LINK", pinsetup: true },
    unifiedLoginStage: "CENTRAL_CONTEXT_VERIFICATION"
  });
  assert.equal(JSON.stringify(checked.data).includes(adminHash), false);

  const invalid = await post("/api/account/check", { uniqueid: "UNKNOWN" });
  assert.equal(invalid.response.status, 404);
  const disabled = await post("/api/account/login", { uniqueid: "DISABLED-LINK", pin: "9999" });
  assert.equal(disabled.response.status, 403);

  const wrongPin = await post("/api/account/login", { uniqueid: "ADMIN-LINK", pin: "0000" });
  assert.equal(wrongPin.response.status, 401);

  const login = await post("/api/account/login", { uniqueid: "ADMIN-LINK", pin: "4321" });
  assert.equal(login.response.status, 200);
  assert.equal(login.data.success, true);
  assert.deepEqual(login.data.account, { displayName: "Admin One", uniqueid: "ADMIN-LINK" });
  assert.deepEqual(login.data.context, {
    scope: "COURSE",
    courseId: "COURSE2",
    courseName: "Aalimiyah",
    role: "ADMIN"
  });
  assert.equal(login.data.operationalAccessActive, true);
  assert.equal(login.data.contexts.length, 3);
  const loginToken = await verifySessionToken(login.data.token, env);
  assert.equal(loginToken.type, "account");
  assert.equal(loginToken.accountid, "ACCOUNT1");
  assert.equal(loginToken.accessid, "ACCESS2");
  assert.equal(loginToken.accessrow, 3);
  assert.equal(loginToken.courserecordid, "ADMIN9");
  assert.equal(loginToken.authrow, 2);
  assert.equal(typeof loginToken.cv, "string");
  assert.equal(JSON.stringify(login.data).includes("platform-sheet-test"), false);

  const session = await post("/api/account/session", {}, login.data.token);
  assert.equal(session.response.status, 200);
  assert.deepEqual(session.data.context, login.data.context);
  assert.equal(Object.hasOwn(session.data, "token"), false);

  const switched = await post("/api/account/switch-context", {
    scope: "COURSE",
    courseId: "COURSE1",
    role: "TEACHER"
  }, login.data.token);
  assert.equal(switched.response.status, 200);
  assert.deepEqual(switched.data.context, {
    scope: "COURSE",
    courseId: "COURSE1",
    courseName: "Reboot Your Maktab",
    role: "TEACHER"
  });
  const switchedToken = await verifySessionToken(switched.data.token, env);
  assert.equal(switchedToken.accessid, "ACCESS3");
  assert.equal(switchedToken.courserecordid, "ADMIN1");

  const unauthorizedSwitch = await post("/api/account/switch-context", {
    scope: "COURSE",
    courseId: "COURSE2",
    role: "TEACHER"
  }, login.data.token);
  assert.equal(unauthorizedSwitch.response.status, 403);

  const globalLogin = await post("/api/account/login", { uniqueid: "GLOBAL-LINK", pin: "2468" });
  assert.equal(globalLogin.response.status, 200);
  assert.deepEqual(globalLogin.data.context, {
    scope: "PLATFORM",
    courseId: "",
    courseName: "M4L Platform",
    role: "GLOBAL_ADMIN"
  });
  const globalCourse = await post("/api/account/switch-context", {
    scope: "COURSE",
    courseId: "COURSE1",
    role: "GLOBAL_ADMIN"
  }, globalLogin.data.token);
  assert.equal(globalCourse.response.status, 200);
  assert.equal(globalCourse.data.context.courseId, "COURSE1");
  assert.equal(globalCourse.data.context.role, "GLOBAL_ADMIN");

  const setup = await post("/api/account/setup-pin", {
    uniqueid: "SETUP-LINK",
    pin: "1357",
    pinConfirmation: "1357"
  });
  assert.equal(setup.response.status, 200);
  assert.equal(tables.UserAccounts[4][3], true);
  assert.match(String(tables.UserAccounts[4][4]), /^v2\$pbkdf2-sha256\$/);
  assert.equal(setup.data.context.role, "STUDENT");
  assert.equal(setup.data.context.courseId, "COURSE1");
  assert.equal(tables.PlatformAuditLog[1][6], "ACCOUNT_PIN_SETUP_SELF");
  assert.equal(tables.PlatformAuditLog[1][7], "USER_ACCOUNT");
  assert.equal(String(tables.PlatformAuditLog[1][9]).includes("AuthenticationCredential"), true);
  assert.equal(JSON.stringify(tables.PlatformAuditLog).includes(tables.UserAccounts[4][4]), false);

  const centralTokenOnLegacyAdmin = await post(
    "/api/admin/platform/validate",
    {},
    globalLogin.data.token
  );
  assert.equal(centralTokenOnLegacyAdmin.response.status, 403);

  const switchedRequest = new Request("https://worker.test/api/account/session", {
    method: "POST",
    headers: { Authorization: `Bearer ${switched.data.token}` }
  });
  assert.equal((await getAuthUser(switchedRequest, env)).role, "TEACHER");
  tables.UserCourseAccess[3][4] = false;
  assert.equal(await getAuthUser(switchedRequest, env), null, "Membership deactivation must revoke its scoped token");
  tables.UserCourseAccess[3][4] = true;

  tables.UserAccounts[1][5] = false;
  const loginRequest = new Request("https://worker.test/api/account/session", {
    method: "POST",
    headers: { Authorization: `Bearer ${login.data.token}` }
  });
  assert.equal(await getAuthUser(loginRequest, env), null, "Account deactivation must revoke every central token");
  tables.UserAccounts[1][5] = true;

  assert.ok(writes.some(write => write.range === "'UserAccounts'!G2"));
  assert.ok(writes.some(write => write.range === "'UserCourseAccess'!G3"));
  assert.ok(reads.includes("UserAccounts!A2:N2"));
} finally {
  globalThis.fetch = originalFetch;
}

console.log("V102.4 central account authentication tests passed.");

async function post(path, body, token = "") {
  const responseValue = await worker.fetch(new Request(`https://worker.test${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  }), env);
  return { response: responseValue, data: await responseValue.json() };
}

function applyUpdate(update) {
  const match = /^'(UserAccounts|UserCourseAccess|PlatformAuditLog)'!([A-Z]+)(\d+)(?::([A-Z]+)\3)?$/.exec(update.range);
  if (!match) throw new Error(`Unexpected account update range: ${update.range}`);
  const [, sheetName, startColumn, rowText] = match;
  const rowIndex = Number(rowText) - 1;
  if (!tables[sheetName][rowIndex]) tables[sheetName][rowIndex] = [];
  const row = tables[sheetName][rowIndex];
  const start = columnIndex(startColumn);
  (update.values[0] || []).forEach((value, offset) => { row[start + offset] = value; });
}

function record(rows, rowNumber) {
  const output = { _rowNumber: rowNumber };
  rows[0].forEach((header, index) => { output[header] = rows[rowNumber - 1][index] ?? ""; });
  return output;
}

function columnIndex(name) {
  return String(name).split("").reduce((total, letter) => (
    total * 26 + letter.charCodeAt(0) - 64
  ), 0) - 1;
}

function response(data, status = 200) {
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
