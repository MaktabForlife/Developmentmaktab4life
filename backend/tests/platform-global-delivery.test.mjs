import assert from "node:assert/strict";
import { createSaltedPinHash, createSessionToken } from "../src/lib/auth.js";
import { PLATFORM_SHEET_HEADERS } from "../src/lib/platform-schema.js";
import worker from "../src/worker.js";

const pinSecret = "delivery-pin-secret";
const sessionSecret = "delivery-session-secret";
const credentialHash = await createSaltedPinHash("2468", pinSecret);
const tables = Object.fromEntries(Object.entries(PLATFORM_SHEET_HEADERS).map(([name, headers]) => [name, [headers]]));
// Start deliberately on the deployed V103.1.0.4 / PlatformSchema 102.0.8 shape.
tables.GlobalSubjectRuns = [PLATFORM_SHEET_HEADERS.GlobalSubjectRuns.slice(0, 13)];
tables.GlobalTimetableSessions = [PLATFORM_SHEET_HEADERS.GlobalTimetableSessions.slice(0, 16)];
tables.GlobalTimetablePublications = [PLATFORM_SHEET_HEADERS.GlobalTimetablePublications.slice(0, 8)];
tables.PublishedGlobalTimetableSessions = [PLATFORM_SHEET_HEADERS.PublishedGlobalTimetableSessions.slice(0, 19)];
tables.UserAccounts.push([
  "ACCOUNT1", "Global Admin", "GLOBAL-LINK", true, credentialHash, true, "", "2026-08-17T00:00:00.000Z",
  "", "", "", "", "", "GLOBAL_ADMIN"
]);
tables.GlobalSubjectList.push(["GSUBJ1", "Global Tajweed", true, "", "", "", "", "", ""]);
tables.GlobalSubjectAccessPolicy.push(["GSPOL1", "GSUBJ1", "SUBSCRIPTION", true, "", "", "", "", "", ""]);
tables.GlobalSubjectRuns.push([
  "GSRUN-PAST", "GSUBJ1", "July Course", "2026-07-01", "2026-07-31", "Africa/Johannesburg", true,
  "", "", "", "", "", ""
]);
tables.UserGlobalSubjectAccess.push(["GSACCESS1", "ACCOUNT2", "GSUBJ1", true]);
tables.GlobalSubjectAccessMatrix = [["AccountID", "GSUBJ1"], ["ACCOUNT1", false], ["ACCOUNT2", true]];
tables.GlobalResources.push(["GRES1", "GSUBJ1", "", "", "Archive PDF", "EBOOK", "PDF", "", "https://example.test/archive.pdf", true]);
tables.PlatformConfig.push(["PlatformSchemaVersion", "102.0.8"]);
tables.PlatformConfig.push(["GlobalCurriculumVersion", 5]);
tables.PlatformConfig.push(["PlatformTimezone", "Africa/Johannesburg"]);

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
  PLATFORM_SPREADSHEET_ID: "platform-delivery-sheet",
  GOOGLE_SPREADSHEET_ID: "legacy-sheet",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "delivery-test@example.iam.gserviceaccount.com",
    private_key_id: "delivery-test-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"),
    token_uri: "https://oauth2.googleapis.com/token"
  }),
  M4L_ACCOUNT_AUTH_DIAGNOSTICS: "true"
};
const token = await createSessionToken({
  type: "account",
  accountid: "ACCOUNT1",
  uniqueid: "GLOBAL-LINK",
  username: "Global Admin",
  role: "GLOBAL_ADMIN",
  scope: "PLATFORM",
  authrow: 2,
  credentialHash
}, env);

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  if (url.hostname === "oauth2.googleapis.com") {
    return response({ access_token: "delivery-google-token", expires_in: 3600 });
  }
  if (url.hostname !== "sheets.googleapis.com") throw new Error(`Unexpected delivery fetch: ${url}`);
  assert.match(url.pathname, /spreadsheets\/platform-delivery-sheet/);

  if (url.pathname.endsWith("/values:batchUpdate")) {
    const payload = JSON.parse(init.body);
    payload.data.forEach(applyWrite);
    return response({ totalUpdatedRanges: payload.data.length });
  }

  const range = decodeURIComponent(url.pathname.split("/values/")[1] || "");
  const accountRow = /^UserAccounts!A(\d+):N\1$/.exec(range);
  if (accountRow) return response({ values: [tables.UserAccounts[Number(accountRow[1]) - 1] || []] });
  const full = /^'([^']+)'!A:[A-Z]+$/.exec(range);
  if (full && tables[full[1]]) return response({ values: tables[full[1]] });
  throw new Error(`Unexpected delivery range: ${range}`);
};

try {
  const unauthorised = await post("/api/admin/platform/global/delivery/get", {}, "");
  assert.equal(unauthorised.response.status, 401);

  const initial = await post("/api/admin/platform/global/delivery/get", {}, token);
  assert.equal(initial.response.status, 200, JSON.stringify(initial.data));
  assert.equal(initial.data.platformSchemaVersion, "102.0.8");
  assert.equal(initial.data.courseAccessSchemaReady, false);
  assert.equal(initial.data.runs[0].accessmodel, "PAID", "Legacy Course access is derived without widening access");

  const blockedBeforeMigration = await post("/api/admin/platform/global/run/save", {
    runId: "GSRUN-PAST", subjectId: "GSUBJ1", runName: "July Course", startDate: "2026-07-01", endDate: "2026-07-31", active: true
  }, token);
  assert.equal(blockedBeforeMigration.response.status, 409);
  assert.match(blockedBeforeMigration.data.error, /Course access migration/);

  const preview = await post("/api/admin/platform/global/courses/migrate-access", { commit: false }, token);
  assert.equal(preview.response.status, 200, JSON.stringify(preview.data));
  assert.equal(preview.data.canCommit, true);
  assert.equal(preview.data.targetPlatformSchemaVersion, "102.0.9");
  assert.equal(preview.data.courses[0].accessmodel, "PAID");

  const migrated = await post("/api/admin/platform/global/courses/migrate-access", {
    commit: true, confirmation: "MIGRATE COURSES"
  }, token);
  assert.equal(migrated.response.status, 200, JSON.stringify(migrated.data));
  assert.equal(tables.GlobalSubjectRuns[0].at(-1), "AccessModel");
  assert.equal(tables.GlobalSubjectRuns[1].at(-1), "PAID");
  assert.equal(tables.PlatformConfig[1][1], "102.0.9");
  assert.equal(tables.PlatformAuditLog.at(-1)[6], "MIGRATE_GLOBAL_COURSE_ACCESS_MODEL");

  const schedulePreview = await post("/api/admin/platform/global/courses/migrate-scheduling", { commit: false }, token);
  assert.equal(schedulePreview.response.status, 200, JSON.stringify(schedulePreview.data));
  assert.equal(schedulePreview.data.canCommit, true);
  assert.equal(schedulePreview.data.targetPlatformSchemaVersion, "102.0.12");
  assert.equal(schedulePreview.data.existingCoursesPreservedAs, "EXPLICIT");
  assert.equal(schedulePreview.data.newCourseDefault, "DERIVED");

  const scheduleMigrated = await post("/api/admin/platform/global/courses/migrate-scheduling", {
    commit: true, confirmation: "MIGRATE COURSE SCHEDULING"
  }, token);
  assert.equal(scheduleMigrated.response.status, 200, JSON.stringify(scheduleMigrated.data));
  assert.equal(tables.GlobalSubjectRuns[0].at(-2), "ScheduleMode");
  assert.equal(tables.GlobalSubjectRuns[0].at(-1), "ScheduleDefinition");
  assert.equal(tables.GlobalSubjectRuns[1][14], "EXPLICIT");
  assert.equal(tables.GlobalTimetableSessions[0].at(-1), "SessionDescription");
  assert.equal(tables.PublishedGlobalTimetableSessions[0].at(-1), "SessionDescription");
  assert.deepEqual(tables.GlobalTimetableRunState[0].slice(-2), ["DraftPublishStartDate", "DraftPublishEndDate"]);
  assert.equal(tables.PlatformConfig[1][1], "102.0.12");
  assert.equal(tables.PlatformAuditLog.at(-1)[6], "MIGRATE_GLOBAL_COURSE_SCHEDULING");

  // Subject FREE/PAID and Course FREE/PAID are separate concerns.
  const freeSubject = await post("/api/admin/platform/global/policy/save", { subjectId: "GSUBJ1", accessModel: "FREE" }, token);
  assert.equal(freeSubject.response.status, 200, JSON.stringify(freeSubject.data));
  const afterSubjectFree = await post("/api/admin/platform/global/delivery/get", {}, token);
  assert.equal(afterSubjectFree.data.runs[0].accessmodel, "PAID", "Changing the Subject policy must not silently change the Course property");

  const created = await post("/api/admin/platform/global/run/save", {
    subjectId: "GSUBJ1",
    runName: "Reusable fixed Course",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    ongoing: false,
    accessModel: "FREE",
    active: true
  }, token);
  assert.equal(created.response.status, 200, JSON.stringify(created.data));
  assert.match(created.data.run.runid, /^GSRUN-/);
  assert.equal(created.data.run.accessmodel, "FREE");
  assert.equal(created.data.run.schedulemode, "DERIVED", "New Courses default to derived scheduling after V104.5 migration");
  const createdRunId = created.data.run.runid;

  // A completed fixed Course is reusable. Existing historical sessions do not block a new delivery period.
  tables.GlobalTimetableSessions.push([
    "GTS-HISTORY", createdRunId, "GSUBJ1", "", "2026-03-15", "09:00", "10:00", "ACCOUNT1", "", true
  ]);
  const repeatWindow = await post("/api/admin/platform/global/run/save", {
    runId: createdRunId,
    subjectId: "GSUBJ1",
    runName: "Reusable fixed Course",
    startDate: "2027-01-01",
    endDate: "2027-03-31",
    ongoing: false,
    accessModel: "FREE",
    active: true
  }, token);
  assert.equal(repeatWindow.response.status, 200, JSON.stringify(repeatWindow.data));
  assert.equal(repeatWindow.data.run.startdate, "2027-01-01");
  assert.equal(tables.GlobalTimetableSessions.at(-1)[4], "2026-03-15", "Historical source session remains preserved");

  const inactive = await post("/api/admin/platform/global/run/save", {
    runId: createdRunId,
    subjectId: "GSUBJ1",
    runName: "Reusable fixed Course",
    startDate: "2027-01-01",
    endDate: "2027-03-31",
    ongoing: false,
    accessModel: "FREE",
    active: false
  }, token);
  assert.equal(inactive.response.status, 200, JSON.stringify(inactive.data));
  assert.equal(inactive.data.run.status, "INACTIVE", "Archiving remains an explicit user action");

  const ongoing = await post("/api/admin/platform/global/run/save", {
    subjectId: "GSUBJ1",
    runName: "Ongoing Course",
    ongoing: true,
    accessModel: "PAID",
    active: true
  }, token);
  assert.equal(ongoing.response.status, 200, JSON.stringify(ongoing.data));
  assert.equal(ongoing.data.run.startdate, "");
  assert.equal(ongoing.data.run.enddate, "");
  assert.equal(ongoing.data.run.ongoing, true);
  assert.equal(ongoing.data.run.accessmodel, "PAID");
  assert.equal(ongoing.data.run.status, "CURRENT");

  const invalidDates = await post("/api/admin/platform/global/run/save", {
    subjectId: "GSUBJ1", runName: "Invalid", startDate: "2026-09-01", endDate: "2026-08-01", ongoing: false, accessModel: "PAID", active: true
  }, token);
  assert.equal(invalidDates.response.status, 400);
  assert.match(invalidDates.data.error, /cannot precede/);

  // A Development workbook that already ran the earlier 102.0.10 V104.5 migration
  // can upgrade in place: retain Course modes/publications and add only SessionDescription storage.
  tables.PlatformConfig[1][1] = "102.0.10";
  tables.GlobalTimetableSessions = tables.GlobalTimetableSessions.map(row => row.slice(0, -1));
  tables.PublishedGlobalTimetableSessions = tables.PublishedGlobalTimetableSessions.map(row => row.slice(0, -1));
  const descriptionUpgradePreview = await post("/api/admin/platform/global/courses/migrate-scheduling", { commit: false }, token);
  assert.equal(descriptionUpgradePreview.response.status, 200, JSON.stringify(descriptionUpgradePreview.data));
  assert.equal(descriptionUpgradePreview.data.targetPlatformSchemaVersion, "102.0.12");
  assert.equal(descriptionUpgradePreview.data.existingCoursesPreservedAs, "CURRENT");
  const modesBeforeDescriptionUpgrade = tables.GlobalSubjectRuns.slice(1).map(row => row[14]);
  const descriptionUpgrade = await post("/api/admin/platform/global/courses/migrate-scheduling", {
    commit: true, confirmation: "MIGRATE COURSE SCHEDULING"
  }, token);
  assert.equal(descriptionUpgrade.response.status, 200, JSON.stringify(descriptionUpgrade.data));
  assert.equal(tables.PlatformConfig[1][1], "102.0.12");
  assert.equal(tables.GlobalTimetableSessions[0].at(-1), "SessionDescription");
  assert.equal(tables.PublishedGlobalTimetableSessions[0].at(-1), "SessionDescription");
  assert.deepEqual(tables.GlobalSubjectRuns.slice(1).map(row => row[14]), modesBeforeDescriptionUpgrade);

  // A V104.5.1/5.2 Platform already at 102.0.11 upgrades only the draft-window state columns.
  tables.PlatformConfig[1][1] = "102.0.11";
  tables.GlobalTimetableRunState = tables.GlobalTimetableRunState.map(row => row.slice(0, 9));
  const draftWindowUpgradePreview = await post("/api/admin/platform/global/courses/migrate-scheduling", { commit: false }, token);
  assert.equal(draftWindowUpgradePreview.response.status, 200, JSON.stringify(draftWindowUpgradePreview.data));
  assert.equal(draftWindowUpgradePreview.data.targetPlatformSchemaVersion, "102.0.12");
  assert.equal(draftWindowUpgradePreview.data.canCommit, true);
  const draftWindowUpgrade = await post("/api/admin/platform/global/courses/migrate-scheduling", {
    commit: true, confirmation: "MIGRATE COURSE SCHEDULING"
  }, token);
  assert.equal(draftWindowUpgrade.response.status, 200, JSON.stringify(draftWindowUpgrade.data));
  assert.equal(tables.PlatformConfig[1][1], "102.0.12");
  assert.deepEqual(tables.GlobalTimetableRunState[0].slice(-2), ["DraftPublishStartDate", "DraftPublishEndDate"]);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("V104.5 Course access + derived scheduling migrations, defaults and reusable Course tests passed.");

async function post(path, body, bearer) {
  const responseValue = await worker.fetch(new Request(`https://worker.test${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
    body: JSON.stringify(body)
  }), env);
  return { response: responseValue, data: await responseValue.json() };
}

function applyWrite(write) {
  const wholeTable = /^'([^']+)'!A1:[A-Z]+(\d+)$/.exec(write.range);
  if (wholeTable) {
    tables[wholeTable[1]] = write.values.map(row => [...row]);
    return;
  }
  const multiRow = /^'([^']+)'!A(\d+):[A-Z]+(\d+)$/.exec(write.range);
  if (multiRow && Number(multiRow[3]) > Number(multiRow[2])) {
    const sheetName = multiRow[1];
    const startRow = Number(multiRow[2]);
    write.values.forEach((values, offset) => { tables[sheetName][startRow + offset - 1] = [...values]; });
    return;
  }
  const fullRow = /^'([^']+)'!A(\d+):[A-Z]+\2$/.exec(write.range);
  if (fullRow) {
    const sheetName = fullRow[1];
    const rowNumber = Number(fullRow[2]);
    tables[sheetName][rowNumber - 1] = [...write.values[0]];
    return;
  }
  const config = /^'PlatformConfig'!B(\d+):E\1$/.exec(write.range);
  if (config) {
    const row = tables.PlatformConfig[Number(config[1]) - 1] || [];
    write.values[0].forEach((value, index) => { row[index + 1] = value; });
    tables.PlatformConfig[Number(config[1]) - 1] = row;
    return;
  }
  throw new Error(`Unexpected delivery write: ${write.range}`);
}

function toPem(bytes, label) {
  const base64 = Buffer.from(bytes).toString("base64");
  const lines = base64.match(/.{1,64}/g).join("\n");
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----\n`;
}
function response(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
