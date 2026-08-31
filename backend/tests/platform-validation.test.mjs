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
  SESSION_SECRET: "platform-validation-session-secret",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "platform-validation@example.iam.gserviceaccount.com",
    private_key_id: "platform-validation-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"),
    token_uri: "https://oauth2.googleapis.com/token"
  })
};
const baseTables = Object.fromEntries(Object.entries(PLATFORM_SHEET_HEADERS).map(([name, headers]) => (
  [name, [headers]]
)));
baseTables.CourseRegistry = [
  PLATFORM_SHEET_HEADERS.CourseRegistry,
  ["COURSE1", "Reboot Your Maktab", "reboot-course-sheet", true, "101.4.3"]
];
baseTables.PlatformConfig = [
  PLATFORM_SHEET_HEADERS.PlatformConfig,
  ["AccountLoginBaseUrl", "https://development.example.test/account/"],
  ["PlatformSchemaVersion", "102.0.10"],
  ["GlobalCurriculumVersion", 1],
  ["GlobalTimetableVersion", 1],
  ["PlatformTimezone", "Africa/Johannesburg"]
];

let tables = structuredClone(baseTables);
const calls = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  calls.push({ url, init });
  if (url.hostname === "oauth2.googleapis.com") {
    return response({ access_token: "platform-validation-token", expires_in: 3600 });
  }
  if (url.hostname === "sheets.googleapis.com") {
    assert.equal(
      url.pathname.startsWith("/v4/spreadsheets/central-platform-sheet/values/"),
      true,
      "Validation must read only PLATFORM_SPREADSHEET_ID"
    );
    const range = decodeURIComponent(url.pathname.split("/values/")[1]);
    const match = /^'([^']+)'!/.exec(range);
    assert.ok(match, `Unexpected Platform Sheet range: ${range}`);
    return response({ values: tables[match[1]] });
  }
  throw new Error(`Unexpected fetch: ${url}`);
};

try {
  const adminToken = await createSessionToken({
    type: "admin",
    role: "ADMIN",
    uniqueid: "admin-platform-validator"
  }, env);
  const seniorToken = await createSessionToken({
    type: "admin",
    role: "SENIOR",
    uniqueid: "senior-platform-validator"
  }, env);

  const unauthorized = await worker.fetch(validationRequest(""), env);
  assert.equal(unauthorized.status, 401);

  const forbidden = await worker.fetch(validationRequest(seniorToken), env);
  assert.equal(forbidden.status, 403);

  const valid = await worker.fetch(validationRequest(adminToken), env);
  assert.equal(valid.status, 200);
  assert.equal(valid.headers.get("X-M4L-Feature"), "platform-validation");
  assert.equal(valid.headers.get("X-M4L-Backend"), "worker");
  const result = await valid.json();
  assert.deepEqual(result, {
    success: true,
    service: "platform-validation",
    status: "ready",
    platformSchemaVersion: "102.0.10",
    courseAccessSchemaReady: true,
    courseScheduleSchemaReady: true,
    globalCurriculumVersion: 1,
    globalTimetableVersion: 1,
    tabCount: 19,
    rowCounts: {
      CourseRegistry: 1,
      UserAccounts: 0,
      UserCourseAccess: 0,
      UserGlobalSubjectAccess: 0,
      GlobalSubjectAccessMatrix: 0,
      GlobalSubjectAccessPolicy: 0,
      GlobalSubjectRuns: 0,
      GlobalTimetableSessions: 0,
      GlobalTimetableRunState: 0,
      GlobalTimetablePublications: 0,
      GlobalTimetableSessionLifecycle: 0,
      PublishedGlobalTimetableSessions: 0,
      AcademyCalendar: 0,
      GlobalSubjectList: 0,
      GlobalModuleList: 0,
      GlobalTaskList: 0,
      GlobalResources: 0,
      PlatformConfig: 5,
      PlatformAuditLog: 0
    },
    activeCourseCount: 1,
    accountCount: 0,
    courseAccessCount: 0,
    globalSubjectCount: 0,
    globalSubjectAccessCount: 0,
    globalSubjectAccessMatrixRowCount: 0,
    activeGlobalSubjectAccessCount: 0,
    legacyGlobalSubjectAccessRowCount: 0,
    legacyActiveGlobalSubjectAccessCount: 0,
    globalSubjectPolicyCount: 0,
    activeGlobalSubjectPolicyCount: 0,
    globalSubjectRunCount: 0,
    activeGlobalSubjectRunCount: 0,
    globalTimetableSessionCount: 0,
    globalTimetableRunStateCount: 0,
    globalTimetablePublicationCount: 0,
    globalTimetableSessionLifecycleCount: 0,
    publishedGlobalTimetableSessionCount: 0,
    academyCalendarEventCount: 0,
    academyCalendarTermCount: 0,
    academyCalendarIslamicDayCount: 0,
    globalResourceCount: 0,
    globalAdminCount: 0,
    globalResourceDriveConfigured: false,
    readyForAccountMigration: true,
    readyForUnifiedLogin: false
  });
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("central-platform-sheet"), false);
  assert.equal(serialized.includes("reboot-course-sheet"), false);

  // Migration compatibility: 102.0.8 and 102.0.9 remain valid only with
  // their historical Course headers. V104.5 scheduling columns belong only to 102.0.10.
  tables = structuredClone(baseTables);
  tables.PlatformConfig[2][1] = "102.0.8";
  useLegacyCourseSchedulingHeaders(tables, { includeAccessModel: false });
  const legacyReady = await worker.fetch(validationRequest(adminToken), env);
  assert.equal(legacyReady.status, 200);
  const legacyResult = await legacyReady.json();
  assert.equal(legacyResult.platformSchemaVersion, "102.0.8");
  assert.equal(legacyResult.courseAccessSchemaReady, false);
  assert.equal(legacyResult.courseScheduleSchemaReady, false);

  tables = structuredClone(baseTables);
  tables.PlatformConfig[2][1] = "102.0.9";
  useLegacyCourseSchedulingHeaders(tables, { includeAccessModel: true });
  const accessReady = await worker.fetch(validationRequest(adminToken), env);
  assert.equal(accessReady.status, 200);
  const accessResult = await accessReady.json();
  assert.equal(accessResult.platformSchemaVersion, "102.0.9");
  assert.equal(accessResult.courseAccessSchemaReady, true);
  assert.equal(accessResult.courseScheduleSchemaReady, false);

  tables = structuredClone(baseTables);
  tables.PlatformConfig.push(["GlobalResourceDriveRootFolderID", "GLOBAL_ROOT_FOLDER_123"]);
  const configuredDrive = await worker.fetch(validationRequest(adminToken), env);
  assert.equal(configuredDrive.status, 200);
  assert.equal((await configuredDrive.json()).globalResourceDriveConfigured, true);

  tables = structuredClone(baseTables);
  tables.PlatformConfig.push(["GlobalResourceDriveRootFolderID", "bad folder/id"]);
  const invalidDrive = await worker.fetch(validationRequest(adminToken), env);
  assert.equal(invalidDrive.status, 503);
  assert.match((await invalidDrive.json()).detail, /GlobalResourceDriveRootFolderID is invalid/);

  tables = structuredClone(baseTables);
  tables.CourseRegistry[0][0] = "CourseId";
  const badHeader = await worker.fetch(validationRequest(adminToken), env);
  assert.equal(badHeader.status, 503);
  assert.match((await badHeader.json()).detail, /header A1 must be CourseID/);

  tables = structuredClone(baseTables);
  tables.CourseRegistry[1][2] = "reboot-course-sheet/";
  const badSpreadsheetId = await worker.fetch(validationRequest(adminToken), env);
  assert.equal(badSpreadsheetId.status, 503);
  assert.match((await badSpreadsheetId.json()).detail, /invalid SpreadsheetID/);

  tables = structuredClone(baseTables);
  tables.UserAccounts.push([
    "ACCOUNT1", "Admin User", "ADMINURL", false, "", true, "", "", "", "", "", "", "", ""
  ]);
  tables.UserCourseAccess.push([
    "ACCESS1", "ACCOUNT1", "COURSE1", "ADMIN", true, true, "", "", "", "", "", "", "", ""
  ]);
  const missingCourseRecord = await worker.fetch(validationRequest(adminToken), env);
  assert.equal(missingCourseRecord.status, 503);
  assert.match((await missingCourseRecord.json()).detail, /requires CourseRecordID/);

  tables = structuredClone(baseTables);
  tables.UserAccounts.push([
    "ACCOUNT1", "Subscriber", "SUBSCRIBER1", false, "", true
  ]);
  tables.UserGlobalSubjectAccess.push([
    "GSACCESS1", "ACCOUNT1", "GSUBJ-MISSING", true
  ]);
  const badGlobalSubjectAccess = await worker.fetch(validationRequest(adminToken), env);
  assert.equal(badGlobalSubjectAccess.status, 503);
  assert.match((await badGlobalSubjectAccess.json()).detail, /invalid global SubjectID/);

  tables = structuredClone(baseTables);
  tables.UserAccounts.push([
    "ACCOUNT1", "Subscriber", "SUBSCRIBER1", false, "", true
  ]);
  tables.GlobalSubjectList.push(["GSUBJ1", "Global Tajweed", true]);
  tables.GlobalSubjectAccessMatrix = [["AccountID", "GSUBJ1"]];
  tables.GlobalSubjectAccessPolicy.push(["GSPOL1", "GSUBJ1", "SUBSCRIPTION", true]);
  tables.GlobalSubjectRuns.push(["GSRUN1", "GSUBJ1", "Term 1", "2026-08-01", "2026-08-31", "Africa/Johannesburg", true, "", "", "", "", "", "", "PAID", "EXPLICIT", "[]"]);
  tables.GlobalModuleList.push(["GMOD1", "GSUBJ1", "Module 1", 1, true]);
  tables.GlobalTaskList.push(["GTASK1", "GSUBJ1", "GMOD1", "Task 1", true]);
  tables.GlobalResources.push([
    "GRES1", "GSUBJ1", "GMOD1", "GTASK1", "Lesson PDF", "EBOOK", "PDF", "", "https://example.test/lesson.pdf", true
  ]);
  tables.UserGlobalSubjectAccess.push([
    "GSACCESS1", "ACCOUNT1", "GSUBJ1", true
  ]);
  tables.GlobalSubjectAccessMatrix = [["AccountID", "GSUBJ1"], ["ACCOUNT1", true]];
  tables.GlobalTimetableSessions.push([
    "GTS1", "GSRUN1", "GSUBJ1", "GMOD1", "2026-08-10", "09:00", "10:00", "ACCOUNT1", "https://zoom.example.test/lesson", true,
    "", "", "", "", "", "", "EXPLICIT", "", ""
  ]);
  tables.GlobalTimetableRunState.push(["GSRUN1", "PUBLISHED", "GTPUB1", "2026-08-01T00:00:00.000Z", "ACCOUNT1", "Subscriber"]);
  tables.GlobalTimetablePublications.push([
    "GTPUB1", "GSRUN1", "GSUBJ1", 1, "2026-08-02T00:00:00.000Z", "ACCOUNT1", "Subscriber", 1,
    "EXPLICIT", "2026-08-01", "2026-08-31", "[]", "Term 1", "Global Tajweed", "Africa/Johannesburg"
  ]);
  tables.PublishedGlobalTimetableSessions.push([
    "GTPSESSION1", "GTPUB1", "GTS1", "GSRUN1", "GSUBJ1", "GMOD1", "2026-08-10", "09:00", "10:00",
    "ACCOUNT1", "https://zoom.example.test/lesson", "2026-08-02T00:00:00.000Z", "ACCOUNT1", "Subscriber",
    "Term 1", "Global Tajweed", "Module 1", "Subscriber", "Africa/Johannesburg", "EXPLICIT", "", ""
  ]);
  const validSubscriptionSchema = await worker.fetch(validationRequest(adminToken), env);
  assert.equal(validSubscriptionSchema.status, 200);
  const subscriptionResult = await validSubscriptionSchema.json();
  assert.equal(subscriptionResult.globalSubjectCount, 1);
  assert.equal(subscriptionResult.globalSubjectAccessCount, 1);
  assert.equal(subscriptionResult.globalSubjectAccessMatrixRowCount, 1);
  assert.equal(subscriptionResult.activeGlobalSubjectAccessCount, 1);
  assert.equal(subscriptionResult.legacyGlobalSubjectAccessRowCount, 1);
  assert.equal(subscriptionResult.legacyActiveGlobalSubjectAccessCount, 1);
  assert.equal(subscriptionResult.globalSubjectPolicyCount, 1);
  assert.equal(subscriptionResult.activeGlobalSubjectPolicyCount, 1);
  assert.equal(subscriptionResult.globalSubjectRunCount, 1);
  assert.equal(subscriptionResult.activeGlobalSubjectRunCount, 1);
  assert.equal(subscriptionResult.globalTimetableSessionCount, 1);
  assert.equal(subscriptionResult.globalTimetableRunStateCount, 1);
  assert.equal(subscriptionResult.globalTimetablePublicationCount, 1);
  assert.equal(subscriptionResult.globalTimetableSessionLifecycleCount, 0);
  assert.equal(subscriptionResult.publishedGlobalTimetableSessionCount, 1);
  assert.equal(subscriptionResult.globalResourceCount, 1);

  // V102.12.8: a published scheduled session may remain TBA without a fake TeacherAccountID.
  tables.GlobalTimetableSessions[1][7] = "";
  tables.PublishedGlobalTimetableSessions[1][9] = "";
  tables.PublishedGlobalTimetableSessions[1][17] = "TBA";
  const validTbaPublication = await worker.fetch(validationRequest(adminToken), env);
  assert.equal(validTbaPublication.status, 200, await validTbaPublication.text());

  tables.PublishedGlobalTimetableSessions[1][11] = "2026-08-03T00:00:00.000Z";
  const badSnapshotAudit = await worker.fetch(validationRequest(adminToken), env);
  assert.equal(badSnapshotAudit.status, 503);
  assert.match((await badSnapshotAudit.json()).detail, /does not match its publication audit data/);

  tables = structuredClone(baseTables);
  tables.GlobalSubjectList.push(["GSUBJ1", "Global Tajweed", true]);
  tables.GlobalSubjectAccessMatrix = [["AccountID", "GSUBJ1"]];
  const missingPolicy = await worker.fetch(validationRequest(adminToken), env);
  assert.equal(missingPolicy.status, 503);
  assert.match((await missingPolicy.json()).detail, /requires exactly one active access policy/);

  tables.GlobalSubjectAccessPolicy.push(["GSPOL1", "GSUBJ1", "FREE", true]);
  tables.GlobalSubjectAccessPolicy.push(["GSPOL2", "GSUBJ1", "SUBSCRIPTION", true]);
  const duplicatePolicy = await worker.fetch(validationRequest(adminToken), env);
  assert.equal(duplicatePolicy.status, 503);
  assert.match((await duplicatePolicy.json()).detail, /duplicates an active policy/);

  tables = structuredClone(baseTables);
  tables.GlobalSubjectList.push(["GSUBJ1", "Global Tajweed", true]);
  tables.GlobalSubjectAccessMatrix = [["AccountID", "GSUBJ1"]];
  tables.GlobalSubjectAccessPolicy.push(["GSPOL1", "GSUBJ1", "SUBSCRIPTION", true]);
  tables.GlobalSubjectRuns.push(["GSRUN1", "GSUBJ1", "Ongoing run", "", "", "Africa/Johannesburg", true, "", "", "", "", "", "", "FREE", "DERIVED", "[]"]);
  const validOngoingRun = await worker.fetch(validationRequest(adminToken), env);
  assert.equal(validOngoingRun.status, 200, await validOngoingRun.text());

  tables.GlobalSubjectRuns[1][3] = "2026-08-01";
  const partialOngoingRun = await worker.fetch(validationRequest(adminToken), env);
  assert.equal(partialOngoingRun.status, 503);
  assert.match((await partialOngoingRun.json()).detail, /both YYYY-MM-DD StartDate and EndDate, or both blank for Ongoing/);

  tables = structuredClone(baseTables);
  tables.GlobalSubjectList.push(["GSUBJ1", "Global Tajweed", true]);
  tables.GlobalSubjectAccessMatrix = [["AccountID", "GSUBJ1"]];
  tables.GlobalSubjectAccessPolicy.push(["GSPOL1", "GSUBJ1", "SUBSCRIPTION", true]);
  tables.GlobalSubjectRuns.push(["GSRUN1", "GSUBJ1", "Broken run", "2026-08-20", "2026-08-10", "Africa/Johannesburg", true, "", "", "", "", "", "", "PAID", "DERIVED", "[]"]);
  const invalidRun = await worker.fetch(validationRequest(adminToken), env);
  assert.equal(invalidRun.status, 503);
  assert.match((await invalidRun.json()).detail, /EndDate cannot precede StartDate/);

  const sheetsCalls = calls.filter(call => call.url.hostname === "sheets.googleapis.com");
  assert.equal(sheetsCalls.some(call => decodeURIComponent(call.url.pathname).includes("GlobalSubjectAccessPolicy")), true);
  assert.equal(sheetsCalls.some(call => decodeURIComponent(call.url.pathname).includes("GlobalSubjectRuns")), true);
  assert.equal(sheetsCalls.some(call => decodeURIComponent(call.url.pathname).includes("TeacherScheduleIndex")), false);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("V104.5 Platform validation accepts staged Course access/scheduling schemas and validates derived/explicit Courses.");

function useLegacyCourseSchedulingHeaders(target, { includeAccessModel }) {
  target.GlobalSubjectRuns = [PLATFORM_SHEET_HEADERS.GlobalSubjectRuns.slice(0, includeAccessModel ? 14 : 13)];
  target.GlobalTimetableSessions = [PLATFORM_SHEET_HEADERS.GlobalTimetableSessions.slice(0, 16)];
  target.GlobalTimetablePublications = [PLATFORM_SHEET_HEADERS.GlobalTimetablePublications.slice(0, 8)];
  target.PublishedGlobalTimetableSessions = [PLATFORM_SHEET_HEADERS.PublishedGlobalTimetableSessions.slice(0, 19)];
}

function validationRequest(token) {
  return new Request("https://worker.test/api/admin/platform/validate", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {}
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
