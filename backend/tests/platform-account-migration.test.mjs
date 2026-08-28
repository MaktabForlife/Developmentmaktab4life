import assert from "node:assert/strict";
import { createSessionToken } from "../src/lib/auth.js";
import { PLATFORM_SHEET_HEADERS } from "../src/lib/platform-schema.js";
import worker from "../src/worker.js";

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
  GOOGLE_SPREADSHEET_ID: "legacy-course-sheet",
  PLATFORM_SPREADSHEET_ID: "central-platform-sheet",
  SESSION_SECRET: "platform-account-migration-session-secret",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "platform-migration@example.iam.gserviceaccount.com",
    private_key_id: "platform-migration-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"),
    token_uri: "https://oauth2.googleapis.com/token"
  })
};

const platformTables = Object.fromEntries(Object.entries(PLATFORM_SHEET_HEADERS).map(([name, headers]) => (
  [name, [headers]]
)));
platformTables.CourseRegistry = [
  PLATFORM_SHEET_HEADERS.CourseRegistry,
  ["COURSE1", "Reboot Your Maktab", "legacy-course-sheet", true, "101.4.3"]
];
platformTables.PlatformConfig = [
  PLATFORM_SHEET_HEADERS.PlatformConfig,
  ["AccountLoginBaseUrl", "https://development.example.test/account/"],
  ["PlatformSchemaVersion", "102.0.3"],
  ["GlobalCurriculumVersion", 1]
];

const adminHeader = [
  "adminid", "username", "uniqueid", "pinsetup", "pinhash", "role",
  "assignedgroup", "active", "createdate", "lastlogin"
];
const studentHeader = [
  "studentid", "username", "whatsapp6", "uniqueid", "pinsetup", "pinhash",
  "classgroup", "createdate", "lastlogin", "failed attempts", "active"
];
const saltedHash = `v2$pbkdf2-sha256$100000$abcdefghijklmnop$${"a".repeat(64)}`;
const adminRows = [
  adminHeader,
  ["ADMIN1", "Admin User", "ADMINURL", true, saltedHash, "ADMIN", "ALL", true, "2026-08-01T00:00:00.000Z", ""],
  ["ADMIN2", "Teacher User", "TEACHERURL", false, "", "TEACHER", "2", true, "2026-08-02T00:00:00.000Z", ""]
];
let studentRows = [
  studentHeader,
  ["SYSTEM1", "daycounter", "", "", false, "", "0", "", "", 0, true],
  ["MAKTAB2", "Test Student", "", "ADMINURL", true, saltedHash, "1", "2026-08-03T00:00:00.000Z", "", 0, true],
  ["MAKTAB3", "PIN Reset Student", "", "STUDENT2", true, "", "2", "2026-08-04T00:00:00.000Z", "", 0, true]
];

const batchPayloads = [];
const calls = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  calls.push({ url, init });
  if (url.hostname === "oauth2.googleapis.com") {
    return response({ access_token: "platform-migration-token", expires_in: 3600 });
  }
  if (url.hostname !== "sheets.googleapis.com") {
    throw new Error(`Unexpected fetch: ${url}`);
  }

  if (url.pathname.endsWith("/values:batchUpdate")) {
    assert.equal(url.pathname.includes("central-platform-sheet"), true);
    batchPayloads.push(JSON.parse(init.body));
    return response({ totalUpdatedRows: 9 });
  }

  const pathMatch = /^\/v4\/spreadsheets\/([^/]+)\/values\/(.+)$/.exec(url.pathname);
  assert.ok(pathMatch, `Unexpected Sheets request: ${url.pathname}`);
  const spreadsheetId = decodeURIComponent(pathMatch[1]);
  const range = decodeURIComponent(pathMatch[2]);
  if (spreadsheetId === "legacy-course-sheet") {
    if (range === "AdminRecords!A:ZZ") return response({ values: adminRows });
    if (range === "StudentRecords!A:ZZ") return response({ values: studentRows });
    throw new Error(`Unexpected course range: ${range}`);
  }
  assert.equal(spreadsheetId, "central-platform-sheet");
  const sheetMatch = /^'([^']+)'!/.exec(range);
  assert.ok(sheetMatch, `Unexpected Platform range: ${range}`);
  return response({ values: platformTables[sheetMatch[1]] });
};

try {
  const adminToken = await createSessionToken({
    type: "admin",
    role: "ADMIN",
    adminid: "ADMIN1",
    username: "Admin User",
    uniqueid: "ADMINURL"
  }, env);
  const seniorToken = await createSessionToken({
    type: "admin",
    role: "SENIOR",
    adminid: "ADMIN9",
    username: "Senior User",
    uniqueid: "SENIORURL"
  }, env);

  const unauthorized = await worker.fetch(migrationRequest("", { action: "PREVIEW" }), env);
  assert.equal(unauthorized.status, 401);

  const forbidden = await worker.fetch(migrationRequest(seniorToken, { action: "PREVIEW" }), env);
  assert.equal(forbidden.status, 403);

  const blockedPreviewResponse = await worker.fetch(migrationRequest(adminToken, {
    action: "PREVIEW",
    grantGlobalAdmin: true
  }), env);
  assert.equal(blockedPreviewResponse.status, 200);
  assert.equal(blockedPreviewResponse.headers.get("X-M4L-Feature"), "platform-account-migration");
  assert.equal(blockedPreviewResponse.headers.get("X-M4L-Backend"), "worker");
  const blockedPreview = await blockedPreviewResponse.json();
  assert.equal(blockedPreview.success, true);
  assert.equal(blockedPreview.canCommit, false);
  assert.equal(blockedPreview.migrationCurrent, false);
  assert.equal(blockedPreview.previewToken, "");
  assert.equal(blockedPreview.blockerCount, 1);
  assert.equal(blockedPreview.blockers[0].code, "DUPLICATE_SOURCE_UNIQUE_ID");
  assert.match(blockedPreview.blockers[0].message, /AdminRecords row 2 \(ADMIN1\)/);
  assert.match(blockedPreview.blockers[0].message, /StudentRecords row 3 \(MAKTAB2\)/);
  assert.equal(JSON.stringify(blockedPreview).includes(saltedHash), false);
  assert.equal(batchPayloads.length, 0);

  studentRows = structuredClone(studentRows);
  studentRows[2][3] = "STUDENT1";
  studentRows[2][1] = "Admin User";
  const mixedRolePreviewResponse = await worker.fetch(migrationRequest(adminToken, {
    action: "PREVIEW",
    grantGlobalAdmin: true
  }), env);
  assert.equal(mixedRolePreviewResponse.status, 200);
  const mixedRolePreview = await mixedRolePreviewResponse.json();
  assert.equal(mixedRolePreview.canCommit, false);
  assert.equal(
    mixedRolePreview.blockers.some(blocker => blocker.code === "POSSIBLE_MIXED_ROLE_IDENTITY"),
    true
  );
  studentRows[2][1] = "Test Student";

  const readyPreviewResponse = await worker.fetch(migrationRequest(adminToken, {
    action: "PREVIEW",
    grantGlobalAdmin: true
  }), env);
  assert.equal(readyPreviewResponse.status, 200);
  const readyPreview = await readyPreviewResponse.json();
  assert.equal(readyPreview.canCommit, true);
  assert.equal(readyPreview.migrationCurrent, false);
  assert.equal(readyPreview.sourceCounts.staff, 2);
  assert.equal(readyPreview.sourceCounts.students, 2);
  assert.equal(readyPreview.sourceCounts.excludedSystemRows, 1);
  assert.deepEqual(readyPreview.plannedWrites, {
    userAccounts: 4,
    globalAccessMatrixRows: 4,
    courseAccess: 4,
    platformRoleUpdates: 0
  });
  assert.equal(readyPreview.warningCount, 1);
  assert.equal(readyPreview.warnings[0].code, "PIN_RESET_REQUIRED");
  assert.equal(readyPreview.confirmationText, "MIGRATE COURSE1");
  assert.match(readyPreview.previewToken, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(readyPreview).includes("ADMINURL"), false);
  assert.equal(JSON.stringify(readyPreview).includes("STUDENT1"), false);
  assert.equal(JSON.stringify(readyPreview).includes(saltedHash), false);

  studentRows[2][1] = "Changed After Preview";
  const stalePreview = await worker.fetch(migrationRequest(adminToken, {
    action: "COMMIT",
    grantGlobalAdmin: true,
    previewToken: readyPreview.previewToken,
    confirmationText: "MIGRATE COURSE1"
  }), env);
  assert.equal(stalePreview.status, 409);
  assert.match((await stalePreview.json()).error, /Run Preview Account Migration again/);
  assert.equal(batchPayloads.length, 0);
  studentRows[2][1] = "Test Student";

  const wrongToken = await worker.fetch(migrationRequest(adminToken, {
    action: "COMMIT",
    grantGlobalAdmin: true,
    previewToken: "0".repeat(64),
    confirmationText: "MIGRATE COURSE1"
  }), env);
  assert.equal(wrongToken.status, 409);
  assert.match((await wrongToken.json()).error, /Run Preview Account Migration again/);
  assert.equal(batchPayloads.length, 0);

  const committedResponse = await worker.fetch(migrationRequest(adminToken, {
    action: "COMMIT",
    grantGlobalAdmin: true,
    previewToken: readyPreview.previewToken,
    confirmationText: "MIGRATE COURSE1"
  }), env);
  assert.equal(committedResponse.status, 200);
  const committed = await committedResponse.json();
  assert.deepEqual(committed, {
    success: true,
    service: "platform-account-migration",
    mode: "committed",
    message: "Central account migration completed. Existing login routes remain active.",
    courseId: "COURSE1",
    courseName: "Reboot Your Maktab",
    accountsCreated: 4,
    globalAccessMatrixRowsCreated: 4,
    courseAccessCreated: 4,
    platformRolesUpdated: 0,
    globalAdminGranted: true,
    centralAccountVerificationAvailable: true,
    unifiedOperationalAccessActive: false
  });
  assert.equal(batchPayloads.length, 1);
  const writes = batchPayloads[0].data;
  assert.deepEqual(writes.map(write => write.range), [
    "'UserAccounts'!A2:N5",
    "'GlobalSubjectAccessMatrix'!A2:A5",
    "'UserCourseAccess'!A2:N5",
    "'PlatformAuditLog'!A2:J2"
  ]);
  const accountRows = writes[0].values;
  const matrixRows = writes[1].values;
  const accessRows = writes[2].values;
  assert.equal(accountRows.find(row => row[2] === "ADMINURL")[13], "GLOBAL_ADMIN");
  assert.equal(accountRows.find(row => row[2] === "STUDENT2")[3], false);
  assert.equal(accountRows.find(row => row[2] === "STUDENT2")[4], "");
  assert.deepEqual(accessRows.map(row => row[13]), ["ADMIN1", "ADMIN2", "MAKTAB2", "MAKTAB3"]);
  assert.equal(JSON.stringify(committed).includes(saltedHash), false);

  platformTables.UserAccounts = [PLATFORM_SHEET_HEADERS.UserAccounts, ...accountRows];
  platformTables.GlobalSubjectAccessMatrix = [PLATFORM_SHEET_HEADERS.GlobalSubjectAccessMatrix, ...matrixRows];
  platformTables.UserCourseAccess = [PLATFORM_SHEET_HEADERS.UserCourseAccess, ...accessRows];
  platformTables.PlatformAuditLog = [PLATFORM_SHEET_HEADERS.PlatformAuditLog, ...writes[3].values];
  const currentPreviewResponse = await worker.fetch(migrationRequest(adminToken, {
    action: "PREVIEW",
    grantGlobalAdmin: true
  }), env);
  assert.equal(currentPreviewResponse.status, 200);
  const currentPreview = await currentPreviewResponse.json();
  assert.equal(currentPreview.canCommit, false);
  assert.equal(currentPreview.migrationCurrent, true);
  assert.deepEqual(currentPreview.plannedWrites, {
    userAccounts: 0,
    globalAccessMatrixRows: 0,
    courseAccess: 0,
    platformRoleUpdates: 0
  });
  assert.equal(currentPreview.previewToken, "");

  const courseReads = calls.filter(call => call.url.pathname.includes("legacy-course-sheet/values/"));
  assert.equal(courseReads.length >= 6, true);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Platform account migration endpoint tests passed.");

function migrationRequest(token, body) {
  return new Request("https://worker.test/api/admin/platform/accounts/migrate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
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
