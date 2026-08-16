import assert from "node:assert/strict";
import { createSaltedPinHash, createSessionToken } from "../src/lib/auth.js";
import { PLATFORM_SHEET_HEADERS } from "../src/lib/platform-schema.js";
import worker from "../src/worker.js";

const pinSecret = "global-management-pin-secret";
const sessionSecret = "global-management-session-secret";
const globalHash = await createSaltedPinHash("2468", pinSecret);
const tables = Object.fromEntries(Object.entries(PLATFORM_SHEET_HEADERS).map(([name, headers]) => (
  [name, [headers]]
)));
tables.CourseRegistry.push(["COURSE1", "Reboot Your Maktab", "course-sheet-one", true, "101.4.3"]);
tables.UserAccounts.push([
  "ACCOUNT1", "Global Admin", "GLOBAL-LINK", true, globalHash, true, "", "2026-08-15T00:00:00.000Z",
  "", "", "", "", "", "GLOBAL_ADMIN"
]);
tables.UserAccounts.push([
  "ACCOUNT2", "Subscriber", "STUDENT-LINK", true, globalHash, true, "", "2026-08-15T00:00:00.000Z"
]);
tables.UserAccounts.push([
  "ACCOUNT3", "Course Admin", "ADMIN-LINK", true, globalHash, true, "", "2026-08-15T00:00:00.000Z"
]);
tables.UserCourseAccess.push([
  "ACCESS3", "ACCOUNT3", "COURSE1", "ADMIN", true, true, "", "2026-08-15T00:00:00.000Z",
  "", "", "", "", "", "ADMIN3"
]);
tables.PlatformConfig.push(["AccountLoginBaseUrl", "https://development.example.test/account/"]);
tables.PlatformConfig.push(["PlatformSchemaVersion", "102.0.4"]);
tables.PlatformConfig.push(["GlobalCurriculumVersion", 1]);

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
  PLATFORM_SPREADSHEET_ID: "platform-global-management-sheet",
  GOOGLE_SPREADSHEET_ID: "legacy-course-sheet",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "global-management@example.iam.gserviceaccount.com",
    private_key_id: "global-management-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"),
    token_uri: "https://oauth2.googleapis.com/token"
  }),
  M4L_ACCOUNT_AUTH_DIAGNOSTICS: "true"
};

const globalToken = await createSessionToken({
  type: "account",
  accountid: "ACCOUNT1",
  uniqueid: "GLOBAL-LINK",
  username: "Global Admin",
  role: "GLOBAL_ADMIN",
  scope: "PLATFORM",
  authrow: 2,
  credentialHash: globalHash
}, env);
const legacyAdminToken = await createSessionToken({
  type: "admin",
  adminid: "ADMIN1",
  username: "Course Admin",
  role: "ADMIN"
}, env);
const centralAdminToken = await createSessionToken({
  type: "account",
  accountid: "ACCOUNT3",
  uniqueid: "ADMIN-LINK",
  username: "Course Admin",
  role: "ADMIN",
  scope: "COURSE",
  accessid: "ACCESS3",
  accessrow: 2,
  courseid: "COURSE1",
  coursename: "Reboot Your Maktab",
  courserecordid: "ADMIN3",
  authrow: 4,
  credentialHash: globalHash
}, env);

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  if (url.hostname === "oauth2.googleapis.com") {
    return response({ access_token: "global-management-token", expires_in: 3600 });
  }
  if (url.hostname !== "sheets.googleapis.com") {
    throw new Error(`Unexpected global-management fetch: ${url}`);
  }
  assert.match(url.pathname, /spreadsheets\/platform-global-management-sheet/);
  if (url.pathname.endsWith("/values:batchUpdate")) {
    const payload = JSON.parse(init.body);
    payload.data.forEach(applyWrite);
    return response({ totalUpdatedRanges: payload.data.length });
  }
  const range = decodeURIComponent(url.pathname.split("/values/")[1] || "");
  const rowMatch = /^(UserAccounts|UserCourseAccess)!A(\d+):N\2$/.exec(range);
  if (rowMatch) {
    return response({ values: [tables[rowMatch[1]][Number(rowMatch[2]) - 1] || []] });
  }
  const fullMatch = /^'([^']+)'!A:[A-Z]+$/.exec(range);
  if (fullMatch && tables[fullMatch[1]]) {
    return response({ values: tables[fullMatch[1]] });
  }
  throw new Error(`Unexpected global-management range: ${range}`);
};

try {
  const unauthorized = await post("/api/admin/platform/global/get", {}, "");
  assert.equal(unauthorized.response.status, 401);

  const ordinaryAdmin = await post("/api/admin/platform/global/get", {}, legacyAdminToken);
  assert.equal(ordinaryAdmin.response.status, 403);
  assert.match(ordinaryAdmin.data.error, /GLOBAL_ADMIN/);

  const centralCourseAdmin = await post("/api/admin/platform/global/get", {}, centralAdminToken);
  assert.equal(centralCourseAdmin.response.status, 200, JSON.stringify(centralCourseAdmin.data));

  const empty = await post("/api/admin/platform/global/get", {}, globalToken);
  assert.equal(empty.response.status, 200, JSON.stringify(empty.data));
  assert.equal(empty.response.headers.get("X-M4L-Feature"), "platform-global-management");
  assert.equal(empty.data.globalCurriculumVersion, 1);
  assert.equal(empty.data.subjects.length, 0);
  assert.equal(empty.data.accounts.length, 3);
  assert.equal(JSON.stringify(empty.data).includes(globalHash), false);

  const subjectCreate = await post("/api/admin/platform/global/subject/save", {
    subjectName: "Global Tajweed",
    active: true
  }, globalToken);
  assert.equal(subjectCreate.response.status, 200, JSON.stringify(subjectCreate.data));
  assert.match(subjectCreate.data.subject.subjectid, /^GSUBJ-[0-9a-f-]{36}$/i);
  assert.equal(subjectCreate.data.subject.scope, "GLOBAL");
  assert.equal(Number(tables.PlatformConfig[3][1]), 2);
  assert.equal(tables.PlatformAuditLog.at(-1)[6], "CREATE_GLOBAL_SUBJECT");
  const subjectId = subjectCreate.data.subject.subjectid;

  const duplicateSubject = await post("/api/admin/platform/global/subject/save", {
    subjectName: " global tajweed ",
    active: true
  }, globalToken);
  assert.equal(duplicateSubject.response.status, 409);

  const moduleCreate = await post("/api/admin/platform/global/module/save", {
    subjectId,
    moduleName: "Foundations",
    sortOrder: 1,
    active: true
  }, globalToken);
  assert.equal(moduleCreate.response.status, 200, JSON.stringify(moduleCreate.data));
  const moduleId = moduleCreate.data.module.moduleid;
  assert.match(moduleId, /^GMOD-/);
  assert.equal(Number(tables.PlatformConfig[3][1]), 3);

  const taskCreate = await post("/api/admin/platform/global/task/save", {
    subjectId,
    moduleId,
    taskName: "Read Lesson One",
    active: true
  }, globalToken);
  assert.equal(taskCreate.response.status, 200, JSON.stringify(taskCreate.data));
  const taskId = taskCreate.data.task.taskid;
  assert.equal(Number(tables.PlatformConfig[3][1]), 4);

  const resourceCreate = await post("/api/admin/platform/global/resource/save", {
    subjectId,
    moduleId,
    taskId,
    resourceName: "Lesson One PDF",
    resourceType: "EBOOK",
    resourceFormat: "PDF",
    resourceDescription: "Central learner copy",
    resourceLink: "https://example.test/global/lesson-one.pdf",
    active: true
  }, globalToken);
  assert.equal(resourceCreate.response.status, 200, JSON.stringify(resourceCreate.data));
  assert.match(resourceCreate.data.resource.resourceid, /^GRES-/);
  assert.equal(Number(tables.PlatformConfig[3][1]), 5);

  const unsafeResource = await post("/api/admin/platform/global/resource/save", {
    subjectId,
    resourceName: "Unsafe",
    resourceType: "OTHER",
    resourceLink: "http://example.test/unsafe",
    active: true
  }, globalToken);
  assert.equal(unsafeResource.response.status, 400);

  const accessCreate = await post("/api/admin/platform/global/access/save", {
    accountId: "ACCOUNT2",
    subjectId,
    active: true
  }, globalToken);
  assert.equal(accessCreate.response.status, 200, JSON.stringify(accessCreate.data));
  assert.match(accessCreate.data.access.subjectaccessid, /^GSACCESS-/);
  assert.equal(Number(tables.PlatformConfig[3][1]), 5, "Access changes must not change curriculum version");
  assert.equal(tables.PlatformAuditLog.at(-1)[6], "ACTIVATE_GLOBAL_SUBJECT_ACCESS");

  const subjectDeactivate = await post("/api/admin/platform/global/subject/save", {
    subjectId,
    subjectName: "Global Tajweed",
    active: false
  }, globalToken);
  assert.equal(subjectDeactivate.response.status, 200, JSON.stringify(subjectDeactivate.data));
  assert.deepEqual(subjectDeactivate.data.dependencies, {
    modules: 1,
    tasks: 1,
    resources: 1,
    subscriptions: 1
  });
  assert.equal(Number(tables.PlatformConfig[3][1]), 6);

  const reactivateAccessWhileSubjectInactive = await post("/api/admin/platform/global/access/save", {
    accountId: "ACCOUNT2",
    subjectId,
    active: true
  }, globalToken);
  assert.equal(reactivateAccessWhileSubjectInactive.response.status, 409);

  const accessDeactivate = await post("/api/admin/platform/global/access/save", {
    accountId: "ACCOUNT2",
    subjectId,
    active: false
  }, globalToken);
  assert.equal(accessDeactivate.response.status, 200, JSON.stringify(accessDeactivate.data));
  assert.equal(Number(tables.PlatformConfig[3][1]), 6);

  const finalList = await post("/api/admin/platform/global/get", {}, globalToken);
  assert.equal(finalList.response.status, 200);
  assert.equal(finalList.data.subjects.length, 1);
  assert.equal(finalList.data.modules.length, 1);
  assert.equal(finalList.data.tasks.length, 1);
  assert.equal(finalList.data.resources.length, 1);
  assert.equal(finalList.data.subjectAccess.length, 1);
  assert.equal(finalList.data.subjectAccess[0].active, false);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("V102.6 platform global curriculum and access management tests passed.");

async function post(path, body, token) {
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

function applyWrite(write) {
  const fullRow = /^'([^']+)'!A(\d+):[A-Z]+\2$/.exec(write.range);
  if (fullRow) {
    const sheetName = fullRow[1];
    const rowNumber = Number(fullRow[2]);
    tables[sheetName][rowNumber - 1] = [...write.values[0]];
    return;
  }
  const config = /^'PlatformConfig'!B(\d+):E\1$/.exec(write.range);
  if (config) {
    const rowNumber = Number(config[1]);
    const row = tables.PlatformConfig[rowNumber - 1] || [];
    write.values[0].forEach((value, index) => { row[index + 1] = value; });
    tables.PlatformConfig[rowNumber - 1] = row;
    return;
  }
  throw new Error(`Unexpected global-management write: ${write.range}`);
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
