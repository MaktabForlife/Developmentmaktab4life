import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
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
  GOOGLE_SPREADSHEET_ID: "reboot-course-sheet",
  PLATFORM_SPREADSHEET_ID: "central-platform-sheet",
  SESSION_SECRET: "v1031-identity-link-session-secret",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "v1031-identity-link@example.iam.gserviceaccount.com",
    private_key_id: "v1031-identity-link-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"),
    token_uri: "https://oauth2.googleapis.com/token"
  })
};

const adminHeader = [
  "AdminID", "Username", "UniqueID", "PinSetup", "PinHash", "Role",
  "AssignedGroup", "Active", "CreateDate", "LastLogin",
  "CreatedByAdminID", "CreatedByAdminName", "ModifiedByAdminID",
  "ModifiedByAdminName", "ModifiedDate"
];
const studentHeader = [
  "StudentID", "Username", "WhatsAppLast6", "UniqueID", "PinSetup", "PinHash",
  "ClassGroup", "CreateDate", "LastLogin", "FailedAttempts", "Active", "RegisteredBy",
  "CreatedByAdminID", "CreatedByAdminName", "ModifiedByAdminID",
  "ModifiedByAdminName", "ModifiedDate"
];
let adminRows = [
  adminHeader,
  ["ADMIN1", "Main Admin", "ADMINURL", true, "hash", "ADMIN", "ALL", true, "", ""],
  ["ADMIN2", "Teacher User", "TEACHERURL", true, "hash", "TEACHER", "2", true, "", ""]
];
let studentRows = [
  studentHeader,
  ["SYSTEM1", "Maktab Day", "", "SYSTEM", false, "", "0", "", "", 0, true],
  ["MAKTAB2", "Student One", "", "STUDENT1", true, "hash", "1", "", "", 0, true],
  ["MAKTAB3", "Student Two", "", "STUDENT2", true, "hash", "2", "", "", 0, true]
];

const platformTables = Object.fromEntries(Object.entries(PLATFORM_SHEET_HEADERS).map(([name, headers]) => (
  [name, [headers]]
)));
platformTables.CourseRegistry = [
  PLATFORM_SHEET_HEADERS.CourseRegistry,
  ["COURSE1", "Reboot Your Maktab", "reboot-course-sheet", true, "101.4.3"]
];
platformTables.UserAccounts = [
  PLATFORM_SHEET_HEADERS.UserAccounts,
  ["ACC-ADMIN1", "Main Admin", "ADMINURL", true, "", true, "", "", "", "", "", "", "", "GLOBAL_ADMIN"],
  ["ACC-TEACH1", "Teacher User", "TEACHERURL", true, "", true],
  ["ACC-STUDENT1", "Student One", "STUDENT1", true, "", true],
  ["ACC-STUDENT2", "Student Two", "STUDENT2", true, "", true]
];
platformTables.UserCourseAccess = [
  PLATFORM_SHEET_HEADERS.UserCourseAccess,
  ["ACCESS1", "ACC-ADMIN1", "COURSE1", "ADMIN", true, true, "", "", "", "", "", "", "", "ADMIN1"],
  ["ACCESS2", "ACC-TEACH1", "COURSE1", "TEACHER", true, false, "", "", "", "", "", "", "", "ADMIN2"],
  ["ACCESS3", "ACC-STUDENT1", "COURSE1", "STUDENT", true, false, "", "", "", "", "", "", "", "MAKTAB2"],
  ["ACCESS4", "ACC-STUDENT2", "COURSE1", "STUDENT", true, false, "", "", "", "", "", "", "", "MAKTAB3"]
];
platformTables.PlatformAuditLog = [PLATFORM_SHEET_HEADERS.PlatformAuditLog];

const courseBatchPayloads = [];
const platformBatchPayloads = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  if (url.hostname === "oauth2.googleapis.com") {
    return response({ access_token: "v1031-token", expires_in: 3600 });
  }
  if (url.hostname !== "sheets.googleapis.com") {
    throw new Error(`Unexpected fetch: ${url}`);
  }

  if (url.pathname.endsWith("/values:batchUpdate")) {
    const spreadsheetId = decodeURIComponent(url.pathname.split("/spreadsheets/")[1].split("/values:batchUpdate")[0]);
    const payload = JSON.parse(init.body);
    if (spreadsheetId === "reboot-course-sheet") {
      courseBatchPayloads.push(payload);
      applyCourseWrites(payload.data);
      return response({ totalUpdatedRows: payload.data.length });
    }
    assert.equal(spreadsheetId, "central-platform-sheet");
    platformBatchPayloads.push(payload);
    return response({ totalUpdatedRows: payload.data.length });
  }

  if (url.pathname.endsWith("/values:batchGet")) {
    const spreadsheetId = decodeURIComponent(url.pathname.split("/spreadsheets/")[1].split("/values:batchGet")[0]);
    const ranges = url.searchParams.getAll("ranges");
    if (spreadsheetId === "reboot-course-sheet") {
      return response({
        valueRanges: ranges.map(range => ({
          range,
          values: range === "AdminRecords!A:ZZ"
            ? adminRows
            : range === "StudentRecords!A:ZZ"
              ? studentRows
              : []
        }))
      });
    }
    throw new Error(`Unexpected batch spreadsheet: ${spreadsheetId}`);
  }

  const match = /^\/v4\/spreadsheets\/([^/]+)\/values\/(.+)$/.exec(url.pathname);
  assert.ok(match, `Unexpected Sheets request: ${url.pathname}`);
  const spreadsheetId = decodeURIComponent(match[1]);
  const range = decodeURIComponent(match[2]);
  if (spreadsheetId === "reboot-course-sheet") {
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
    username: "Main Admin",
    uniqueid: "ADMINURL"
  }, env);
  const seniorToken = await createSessionToken({
    type: "admin",
    role: "SENIOR",
    adminid: "ADMIN9",
    username: "Senior User"
  }, env);

  const unauthorized = await worker.fetch(identityLinkRequest("", { action: "PREVIEW" }), env);
  assert.equal(unauthorized.status, 401);

  const forbidden = await worker.fetch(identityLinkRequest(seniorToken, { action: "PREVIEW" }), env);
  assert.equal(forbidden.status, 403);

  // Missing central membership blocks linking rather than guessing an identity.
  const removedMembership = platformTables.UserCourseAccess.pop();
  const blockedMissingResponse = await worker.fetch(identityLinkRequest(adminToken, { action: "PREVIEW" }), env);
  assert.equal(blockedMissingResponse.status, 200);
  const blockedMissing = await blockedMissingResponse.json();
  assert.equal(blockedMissing.canCommit, false);
  assert.equal(blockedMissing.blockers.some(item => item.code === "MISSING_CENTRAL_MEMBERSHIP"), true);
  platformTables.UserCourseAccess.push(removedMembership);

  // The migration never appends AccountID over unnamed existing Sheet data.
  studentRows[2][17] = "UNNAMED-DATA";
  const unnamedDataResponse = await worker.fetch(identityLinkRequest(adminToken, { action: "PREVIEW" }), env);
  assert.equal(unnamedDataResponse.status, 200);
  const unnamedData = await unnamedDataResponse.json();
  assert.equal(unnamedData.canCommit, false);
  assert.equal(unnamedData.blockers.some(item => item.code === "UNHEADED_DATA_CONFLICT"), true);
  studentRows[2].splice(17);

  const readyResponse = await worker.fetch(identityLinkRequest(adminToken, { action: "PREVIEW" }), env);
  assert.equal(readyResponse.status, 200);
  assert.equal(readyResponse.headers.get("X-M4L-Feature"), "platform-identity-link");
  assert.equal(readyResponse.headers.get("X-M4L-Backend"), "worker");
  const ready = await readyResponse.json();
  assert.equal(ready.success, true);
  assert.equal(ready.canCommit, true);
  assert.equal(ready.linkCurrent, false);
  assert.deepEqual(ready.sourceCounts, { staff: 2, students: 2, excludedSystemRows: 1 });
  assert.deepEqual(ready.linkedCounts, { staff: 0, students: 0 });
  assert.deepEqual(ready.plannedWrites, { accountIdHeaders: 2, staffLinks: 2, studentLinks: 2 });
  assert.equal(ready.confirmationText, "LINK COURSE1");
  assert.match(ready.previewToken, /^[a-f0-9]{64}$/);
  assert.equal(ready.centralIdentityAuthorityActive, false);
  assert.equal(ready.existingOperationalBehaviourPreserved, true);
  assert.equal(JSON.stringify(ready).includes("ACC-ADMIN1"), false, "Preview must not expose AccountID values");

  // Any source change invalidates the signed preview.
  studentRows[2][1] = "Changed After Preview";
  const stale = await worker.fetch(identityLinkRequest(adminToken, {
    action: "COMMIT",
    previewToken: ready.previewToken,
    confirmationText: ready.confirmationText
  }), env);
  assert.equal(stale.status, 409);
  assert.match((await stale.json()).error, /Run Preview Identity Links again/);
  assert.equal(courseBatchPayloads.length, 0);
  studentRows[2][1] = "Student One";

  const committedResponse = await worker.fetch(identityLinkRequest(adminToken, {
    action: "COMMIT",
    previewToken: ready.previewToken,
    confirmationText: ready.confirmationText
  }), env);
  assert.equal(committedResponse.status, 200);
  const committed = await committedResponse.json();
  assert.equal(committed.success, true);
  assert.equal(committed.service, "platform-identity-link");
  assert.equal(committed.accountIdHeadersAdded, 2);
  assert.equal(committed.staffLinksWritten, 2);
  assert.equal(committed.studentLinksWritten, 2);
  assert.equal(committed.recordsLinked, 4);
  assert.equal(committed.centralIdentityLinked, true);
  assert.equal(committed.centralIdentityAuthorityActive, false);
  assert.equal(committed.existingOperationalBehaviourPreserved, true);

  assert.equal(courseBatchPayloads.length, 1, "Course identity links should be written in one Sheets batch");
  assert.deepEqual(courseBatchPayloads[0].data.map(item => item.range), [
    "'AdminRecords'!P1",
    "'StudentRecords'!R1",
    "'AdminRecords'!P2",
    "'AdminRecords'!P3",
    "'StudentRecords'!R3",
    "'StudentRecords'!R4"
  ]);
  assert.equal(adminRows[0][15], "AccountID");
  assert.equal(studentRows[0][17], "AccountID");
  assert.equal(adminRows[1][15], "ACC-ADMIN1");
  assert.equal(adminRows[2][15], "ACC-TEACH1");
  assert.equal(studentRows[1][17] || "", "", "System row must remain unlinked");
  assert.equal(studentRows[2][17], "ACC-STUDENT1");
  assert.equal(studentRows[3][17], "ACC-STUDENT2");

  assert.equal(platformBatchPayloads.length, 1, "Identity-link audit should be recorded centrally");
  assert.equal(platformBatchPayloads[0].data[0].range, "'PlatformAuditLog'!A2:J2");
  assert.equal(platformBatchPayloads[0].data[0].values[0][6], "LINK_OPERATIONAL_IDENTITIES");
  assert.equal(platformBatchPayloads[0].data[0].values[0][7], "COURSE_IDENTITY_LINK");

  const currentResponse = await worker.fetch(identityLinkRequest(adminToken, { action: "PREVIEW" }), env);
  assert.equal(currentResponse.status, 200);
  const current = await currentResponse.json();
  assert.equal(current.linkCurrent, true);
  assert.equal(current.canCommit, false);
  assert.deepEqual(current.linkedCounts, { staff: 2, students: 2 });
  assert.deepEqual(current.plannedWrites, { accountIdHeaders: 0, staffLinks: 0, studentLinks: 0 });
  assert.equal(current.previewToken, "");

  // A conflicting existing AccountID is a hard blocker and is never overwritten.
  studentRows[2][17] = "ACC-ADMIN1";
  const conflictResponse = await worker.fetch(identityLinkRequest(adminToken, { action: "PREVIEW" }), env);
  assert.equal(conflictResponse.status, 200);
  const conflict = await conflictResponse.json();
  assert.equal(conflict.canCommit, false);
  assert.equal(conflict.blockers.some(item => item.code === "EXISTING_ACCOUNT_LINK_CONFLICT"), true);
  studentRows[2][17] = "ACC-STUDENT1";

  // V103.1 UI exposes a separate preview/commit flow and explicitly preserves operational behaviour.
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const adminHtml = fs.readFileSync(path.join(root, "admin/index.html"), "utf8");
  const settingsJs = fs.readFileSync(path.join(root, "js/m4l-system-settings.js"), "utf8");
  assert.match(adminHtml, /V103\.1 Identity links/);
  assert.match(adminHtml, /data-system-settings-action="preview-identity-links"/);
  assert.match(adminHtml, /data-system-settings-action="commit-identity-links"/);
  assert.match(adminHtml, /does not change login, attendance, progress, planner, timetable or resource behaviour/i);
  assert.match(settingsJs, /\/api\/admin\/platform\/identity-links/);
  assert.match(settingsJs, /Existing operational behaviour remains unchanged/);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("V103.1 central-to-Reboot identity-link migration and safeguard tests passed.");

function identityLinkRequest(token, body) {
  return new Request("https://worker.test/api/admin/platform/identity-links", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: JSON.stringify(body)
  });
}

function applyCourseWrites(writes) {
  for (const write of writes) {
    const match = /^'(AdminRecords|StudentRecords)'!([A-Z]+)(\d+)$/.exec(write.range);
    assert.ok(match, `Unexpected course identity-link range: ${write.range}`);
    const [, sheetName, columnName, rowText] = match;
    const rows = sheetName === "AdminRecords" ? adminRows : studentRows;
    const rowIndex = Number(rowText) - 1;
    const columnIndex = columnNumber(columnName) - 1;
    while (rows[rowIndex].length <= columnIndex) rows[rowIndex].push("");
    rows[rowIndex][columnIndex] = write.values[0][0];
  }
}

function columnNumber(name) {
  return String(name).split("").reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0);
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
