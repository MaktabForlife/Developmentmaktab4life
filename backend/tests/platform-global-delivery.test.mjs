import assert from "node:assert/strict";
import { createSaltedPinHash, createSessionToken } from "../src/lib/auth.js";
import { PLATFORM_SHEET_HEADERS } from "../src/lib/platform-schema.js";
import worker from "../src/worker.js";

const pinSecret = "delivery-pin-secret";
const sessionSecret = "delivery-session-secret";
const credentialHash = await createSaltedPinHash("2468", pinSecret);
const tables = Object.fromEntries(Object.entries(PLATFORM_SHEET_HEADERS).map(([name, headers]) => [name, [headers]]));
tables.UserAccounts.push([
  "ACCOUNT1", "Global Admin", "GLOBAL-LINK", true, credentialHash, true, "", "2026-08-17T00:00:00.000Z",
  "", "", "", "", "", "GLOBAL_ADMIN"
]);
tables.GlobalSubjectList.push(["GSUBJ1", "Global Tajweed", true, "", "", "", "", "", ""]);
tables.GlobalSubjectAccessPolicy.push(["GSPOL1", "GSUBJ1", "SUBSCRIPTION", true, "", "", "", "", "", ""]);
tables.GlobalSubjectRuns.push([
  "GSRUN-PAST", "GSUBJ1", "July run", "2026-07-01", "2026-07-31", "Africa/Johannesburg", true,
  "", "", "", "", "", ""
]);
tables.UserGlobalSubjectAccess.push(["GSACCESS1", "ACCOUNT2", "GSUBJ1", true]);
tables.GlobalSubjectAccessMatrix = [["AccountID", "GSUBJ1"], ["ACCOUNT1", false], ["ACCOUNT2", true]];
tables.GlobalResources.push(["GRES1", "GSUBJ1", "", "", "Archive PDF", "EBOOK", "PDF", "", "https://example.test/archive.pdf", true]);
tables.PlatformConfig.push(["PlatformSchemaVersion", "102.0.5"]);
tables.PlatformConfig.push(["GlobalCurriculumVersion", 5]);

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
  assert.equal(initial.data.globalCurriculumVersion, 5);
  assert.deepEqual(initial.data.subjects[0], {
    subjectid: "GSUBJ1",
    subjectname: "Global Tajweed",
    active: true,
    accessmodel: "SUBSCRIPTION",
    policyconfigured: true,
    deliverystatus: "PAST",
    dependencies: { subscriptions: 1, resources: 1, runs: 1 }
  });
  assert.equal(initial.data.runs[0].status, "ENDED");

  const free = await post("/api/admin/platform/global/policy/save", {
    subjectId: "GSUBJ1",
    accessModel: "FREE"
  }, token);
  assert.equal(free.response.status, 200, JSON.stringify(free.data));
  assert.equal(free.data.policy.accessmodel, "FREE");
  assert.equal(tables.GlobalSubjectAccessPolicy[1][2], "FREE");
  assert.equal(Number(tables.PlatformConfig[2][1]), 6);
  assert.equal(tables.PlatformAuditLog.at(-1)[6], "UPDATE_GLOBAL_SUBJECT_ACCESS_POLICY");

  const freeAgain = await post("/api/admin/platform/global/policy/save", {
    subjectId: "GSUBJ1", accessModel: "FREE"
  }, token);
  assert.equal(freeAgain.response.status, 200);
  assert.equal(Number(tables.PlatformConfig[2][1]), 6, "No-op policy saves must not bump GlobalCurriculumVersion");

  const created = await post("/api/admin/platform/global/run/save", {
    subjectId: "GSUBJ1",
    runName: "Long current run",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    timezone: "Africa/Johannesburg",
    active: true
  }, token);
  assert.equal(created.response.status, 200, JSON.stringify(created.data));
  assert.match(created.data.run.runid, /^GSRUN-/);
  assert.equal(created.data.run.status, "CURRENT");
  assert.equal(Number(tables.PlatformConfig[2][1]), 7);
  assert.equal(tables.PlatformAuditLog.at(-1)[6], "CREATE_GLOBAL_SUBJECT_RUN");
  const createdRunId = created.data.run.runid;

  tables.GlobalTimetableSessions.push([
    "GTS-BOUNDARY", createdRunId, "GSUBJ1", "", "2026-11-15", "09:00", "10:00", "ACCOUNT1", "", true
  ]);
  const blockedBoundaryShrink = await post("/api/admin/platform/global/run/save", {
    runId: createdRunId,
    subjectId: "GSUBJ1",
    runName: "Long current run",
    startDate: "2026-12-01",
    endDate: "2026-12-31",
    timezone: "Africa/Johannesburg",
    active: true
  }, token);
  assert.equal(blockedBoundaryShrink.response.status, 409);
  assert.match(blockedBoundaryShrink.data.error, /cannot exclude 1 existing global timetable session/);

  const invalidDates = await post("/api/admin/platform/global/run/save", {
    subjectId: "GSUBJ1",
    runName: "Invalid",
    startDate: "2026-09-01",
    endDate: "2026-08-01",
    timezone: "Africa/Johannesburg",
    active: true
  }, token);
  assert.equal(invalidDates.response.status, 400);
  assert.match(invalidDates.data.error, /cannot precede/);
  assert.equal(Number(tables.PlatformConfig[2][1]), 7);

  const inactive = await post("/api/admin/platform/global/run/save", {
    runId: createdRunId,
    subjectId: "GSUBJ1",
    runName: "Long current run",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    timezone: "Africa/Johannesburg",
    active: false
  }, token);
  assert.equal(inactive.response.status, 200, JSON.stringify(inactive.data));
  assert.equal(inactive.data.run.status, "INACTIVE");
  assert.equal(Number(tables.PlatformConfig[2][1]), 8);
  assert.equal(tables.PlatformAuditLog.at(-1)[6], "UPDATE_GLOBAL_SUBJECT_RUN");

  tables.GlobalSubjectList[1][2] = false;
  const activeOnInactiveSubject = await post("/api/admin/platform/global/run/save", {
    subjectId: "GSUBJ1",
    runName: "Blocked",
    startDate: "2026-09-01",
    endDate: "2026-09-30",
    timezone: "Africa/Johannesburg",
    active: true
  }, token);
  assert.equal(activeOnInactiveSubject.response.status, 409);
  assert.match(activeOnInactiveSubject.data.error, /active global subject/);
  tables.GlobalSubjectList[1][2] = true;

  tables.GlobalSubjectAccessPolicy.push(["GSPOL2", "GSUBJ1", "SUBSCRIPTION", true]);
  const duplicatePolicy = await post("/api/admin/platform/global/policy/save", {
    subjectId: "GSUBJ1", accessModel: "SUBSCRIPTION"
  }, token);
  assert.equal(duplicatePolicy.response.status, 409);
  assert.match(duplicatePolicy.data.error, /duplicate active access policies/);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("V102.10 global-subject Delivery API policy/run/audit tests passed.");

async function post(path, body, bearer) {
  const responseValue = await worker.fetch(new Request(`https://worker.test${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {})
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
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
