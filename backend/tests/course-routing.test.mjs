import assert from "node:assert/strict";
import {
  createSaltedPinHash,
  createSessionToken
} from "../src/lib/auth.js";
import { PLATFORM_SHEET_HEADERS } from "../src/lib/platform-schema.js";
import worker from "../src/worker.js";

const pinSecret = "course-routing-pin-secret";
const sessionSecret = "course-routing-session-secret";
const adminHash = await createSaltedPinHash("4321", pinSecret);
const globalHash = await createSaltedPinHash("2468", pinSecret);
const platformTables = {
  CourseRegistry: [
    PLATFORM_SHEET_HEADERS.CourseRegistry,
    ["COURSE1", "Reboot Your Maktab", "course-sheet-one", true, "101.4.3"],
    ["COURSE2", "Aalimiyah", "course-sheet-two", true, "101.4.3"]
  ],
  UserAccounts: [
    PLATFORM_SHEET_HEADERS.UserAccounts,
    ["ACCOUNT1", "Admin One", "ADMIN-LINK", true, adminHash, true, "", "", "", "", "", "", "", ""],
    ["ACCOUNT2", "Global Admin", "GLOBAL-LINK", true, globalHash, true, "", "", "", "", "", "", "", "GLOBAL_ADMIN"]
  ],
  UserCourseAccess: [
    PLATFORM_SHEET_HEADERS.UserCourseAccess,
    ["ACCESS1", "ACCOUNT1", "COURSE2", "ADMIN", true, true, "", "", "", "", "", "", "", "ADMIN9"]
  ]
};
const adminHeaders = [
  "AdminID", "Username", "UniqueID", "PINSetup", "PINHash", "Role",
  "AssignedGroup", "Active", "CreateDate", "LastLogin"
];
const courseTables = {
  "course-sheet-one": {
    AdminRecords: [adminHeaders]
  },
  "course-sheet-two": {
    AdminRecords: [
      adminHeaders,
      ["ADMIN9", "Admin One Local", "ADMIN-LINK", true, "local-hash", "ADMIN", "ALL", true, "", ""]
    ]
  }
};

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
  GOOGLE_SPREADSHEET_ID: "legacy-static-sheet",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "course-routing@example.iam.gserviceaccount.com",
    private_key_id: "course-routing-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"),
    token_uri: "https://oauth2.googleapis.com/token"
  }),
  M4L_REQUIRE_CREDENTIAL_BOUND_SESSIONS: "true"
};

const requests = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  if (url.hostname === "oauth2.googleapis.com") {
    return response({ access_token: "mock-course-routing-token", expires_in: 3600 });
  }
  if (url.hostname !== "sheets.googleapis.com") {
    throw new Error(`Unexpected course-routing fetch: ${url}`);
  }
  assert.equal(init.headers.Authorization, "Bearer mock-course-routing-token");
  const spreadsheetId = decodeURIComponent(
    url.pathname.match(/\/spreadsheets\/([^/]+)/)?.[1] || ""
  );
  const range = decodeURIComponent(url.pathname.split("/values/")[1] || "");
  requests.push({ spreadsheetId, range });

  if (spreadsheetId === "platform-sheet-test") {
    const fullMatch = /^'([^']+)'!A:[A-Z]+$/.exec(range);
    if (fullMatch && platformTables[fullMatch[1]]) {
      return response({ values: platformTables[fullMatch[1]] });
    }
    const rowMatch = /^(UserAccounts|UserCourseAccess)!A(\d+):[A-Z]+\2$/.exec(range);
    if (rowMatch) {
      return response({
        values: [platformTables[rowMatch[1]][Number(rowMatch[2]) - 1] || []]
      });
    }
  }

  const courseSheet = courseTables[spreadsheetId];
  const courseMatch = /^(AdminRecords|StudentRecords)!A:[A-Z]+$/.exec(range);
  if (courseSheet && courseMatch && courseSheet[courseMatch[1]]) {
    return response({ values: courseSheet[courseMatch[1]] });
  }

  throw new Error(`Unexpected Sheets read ${spreadsheetId} ${range}`);
};

try {
  const adminToken = await createSessionToken({
    type: "account",
    accountid: "ACCOUNT1",
    uniqueid: "ADMIN-LINK",
    username: "Admin One",
    role: "ADMIN",
    scope: "COURSE",
    accessid: "ACCESS1",
    accessrow: 2,
    courseid: "COURSE2",
    coursename: "Aalimiyah",
    courserecordid: "ADMIN9",
    authrow: 2,
    credentialHash: adminHash
  }, env);

  const workspace = await postWorkspace(adminToken, { courseId: "COURSE1", role: "STUDENT" });
  assert.equal(workspace.response.status, 200, JSON.stringify(workspace.data));
  assert.equal(workspace.response.headers.get("X-M4L-Course-ID"), "COURSE2");
  assert.equal(workspace.data.workspace.path, "/admin/ADMIN-LINK");
  assert.equal(workspace.data.admin.adminid, "ADMIN9");
  assert.equal(workspace.data.admin.role, "ADMIN");
  assert.equal(workspace.data.context.courseId, "COURSE2");
  assert.ok(requests.some(item => (
    item.spreadsheetId === "course-sheet-two" && item.range === "AdminRecords!A:J"
  )));
  assert.equal(
    requests.some(item => item.spreadsheetId === "course-sheet-one"),
    false,
    "A submitted CourseID must never change the authenticated Sheet target"
  );
  assert.equal(
    requests.some(item => item.spreadsheetId === "legacy-static-sheet"),
    false,
    "A central course token must not fall back to GOOGLE_SPREADSHEET_ID"
  );

  courseTables["course-sheet-two"].AdminRecords[1][5] = "TEACHER";
  const mismatchedRole = await postWorkspace(adminToken);
  assert.equal(mismatchedRole.response.status, 403);
  assert.equal(mismatchedRole.data.code, "COURSE_PROFILE_NOT_AUTHORISED");
  courseTables["course-sheet-two"].AdminRecords[1][5] = "ADMIN";

  const platformToken = await createSessionToken({
    type: "account",
    accountid: "ACCOUNT2",
    uniqueid: "GLOBAL-LINK",
    username: "Global Admin",
    role: "GLOBAL_ADMIN",
    scope: "PLATFORM",
    authrow: 3,
    credentialHash: globalHash
  }, env);
  const platformWorkspace = await postWorkspace(platformToken);
  assert.equal(platformWorkspace.response.status, 403);
  assert.equal(platformWorkspace.data.code, "COURSE_CONTEXT_REQUIRED");

  const globalCourseToken = await createSessionToken({
    type: "account",
    accountid: "ACCOUNT2",
    uniqueid: "GLOBAL-LINK",
    username: "Global Admin",
    role: "GLOBAL_ADMIN",
    scope: "COURSE",
    courseid: "COURSE1",
    coursename: "Reboot Your Maktab",
    authrow: 3,
    credentialHash: globalHash
  }, env);
  const globalWorkspace = await postWorkspace(globalCourseToken);
  assert.equal(globalWorkspace.response.status, 200, JSON.stringify(globalWorkspace.data));
  assert.equal(globalWorkspace.data.admin.adminid, "ACCOUNT2");
  assert.equal(globalWorkspace.data.admin.platformrole, "GLOBAL_ADMIN");
  assert.equal(globalWorkspace.data.context.role, "GLOBAL_ADMIN");
  assert.equal(globalWorkspace.response.headers.get("X-M4L-Course-ID"), "COURSE1");
} finally {
  globalThis.fetch = originalFetch;
}

console.log("V102.4 authenticated course routing tests passed.");

async function postWorkspace(token, body = {}) {
  const responseValue = await worker.fetch(new Request("https://worker.test/api/account/workspace", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  }), env);
  return { response: responseValue, data: await responseValue.json() };
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
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----\n`;
}
