import assert from "node:assert/strict";
import { createSaltedPinHash, createSessionToken } from "../src/lib/auth.js";
import { PLATFORM_SHEET_HEADERS } from "../src/lib/platform-schema.js";
import worker from "../src/worker.js";

const pinSecret = "global-timetable-pin-secret";
const sessionSecret = "global-timetable-session-secret";
const credentialHash = await createSaltedPinHash("2468", pinSecret);
const tables = Object.fromEntries(Object.entries(PLATFORM_SHEET_HEADERS).map(([name, headers]) => [name, [headers]]));
tables.UserAccounts.push([
  "ACCOUNT1", "Global Admin", "GLOBAL-ADMIN", true, credentialHash, true, "", "2026-08-28T00:00:00.000Z",
  "", "", "", "", "", "GLOBAL_ADMIN"
]);
tables.UserAccounts.push([
  "TEACHER1", "Ml Teacher", "TEACHER-LINK", true, "hash", true, "", "2026-08-28T00:00:00.000Z",
  "", "", "", "", "", ""
]);
tables.GlobalSubjectList.push(["GSUBJ1", "Steps to My Rabb", true, "", "", "", "", "", ""]);
tables.GlobalModuleList.push(["GMOD1", "GSUBJ1", "Opening module", 1, true, "", "", "", "", "", ""]);
tables.GlobalSubjectRuns.push([
  "GSRUN1", "GSUBJ1", "September 2026", "2026-09-01", "2026-09-30", "Africa/Johannesburg", true,
  "", "", "", "", "", ""
]);
tables.PlatformConfig.push(["PlatformSchemaVersion", "102.0.6"]);
tables.PlatformConfig.push(["GlobalTimetableVersion", 1]);

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
  PLATFORM_SPREADSHEET_ID: "platform-global-timetable-sheet",
  GOOGLE_SPREADSHEET_ID: "legacy-sheet",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "global-timetable-test@example.iam.gserviceaccount.com",
    private_key_id: "global-timetable-test-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"),
    token_uri: "https://oauth2.googleapis.com/token"
  }),
  M4L_ACCOUNT_AUTH_DIAGNOSTICS: "true"
};
const token = await createSessionToken({
  type: "account",
  accountid: "ACCOUNT1",
  uniqueid: "GLOBAL-ADMIN",
  username: "Global Admin",
  role: "GLOBAL_ADMIN",
  scope: "PLATFORM",
  authrow: 2,
  credentialHash
}, env);

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  if (url.hostname === "oauth2.googleapis.com") return response({ access_token: "google-token", expires_in: 3600 });
  if (url.hostname !== "sheets.googleapis.com") throw new Error(`Unexpected global timetable fetch: ${url}`);
  assert.match(url.pathname, /spreadsheets\/platform-global-timetable-sheet/);

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
  throw new Error(`Unexpected global timetable range: ${range}`);
};

try {
  tables.PlatformConfig[1][1] = "102.0.5";
  const preCutover = await post("/api/admin/platform/global/timetable/get", {}, token);
  assert.equal(preCutover.response.status, 503);
  assert.match(preCutover.data.detail, /requires PlatformSchemaVersion 102\.0\.6/);
  tables.PlatformConfig[1][1] = "102.0.6";

  const initial = await post("/api/admin/platform/global/timetable/get", {}, token);
  assert.equal(initial.response.status, 200, JSON.stringify(initial.data));
  assert.equal(initial.data.globalTimetableVersion, 1);
  assert.equal(initial.data.runs.length, 1);
  assert.equal(initial.data.teachers.some(item => item.accountid === "TEACHER1"), true);

  const missingTeacher = await post("/api/admin/platform/global/timetable/generate", {
    runId: "GSRUN1", moduleId: "GMOD1", weekdays: ["MON"], startTime: "09:00", endTime: "10:00"
  }, token);
  assert.equal(missingTeacher.response.status, 400);
  assert.match(missingTeacher.data.error, /Select teacher/);

  const generated = await post("/api/admin/platform/global/timetable/generate", {
    runId: "GSRUN1",
    moduleId: "GMOD1",
    weekdays: ["MON", "WED"],
    startTime: "09:00",
    endTime: "10:00",
    teacherAccountId: "TEACHER1",
    zoomLink: "https://zoom.example.test/global"
  }, token);
  assert.equal(generated.response.status, 200, JSON.stringify(generated.data));
  assert.equal(generated.data.sessions.length, 9);
  assert.deepEqual(generated.data.sessions.map(item => item.sessiondate), [
    "2026-09-02", "2026-09-07", "2026-09-09", "2026-09-14", "2026-09-16",
    "2026-09-21", "2026-09-23", "2026-09-28", "2026-09-30"
  ]);
  assert.equal(tables.GlobalTimetableRunState[1][1], "DEVELOPMENT");
  assert.equal(Number(tables.PlatformConfig[2][1]), 1, "Draft generation must not change GlobalTimetableVersion");

  const firstSessionId = tables.GlobalTimetableSessions[1][0];
  const edited = await post("/api/admin/platform/global/timetable/session/save", {
    sessionId: firstSessionId,
    sessionDate: "2026-09-03",
    startTime: "09:15",
    endTime: "10:15",
    moduleId: "GMOD1",
    teacherAccountId: "TEACHER1",
    zoomLink: "https://zoom.example.test/exception",
    active: false
  }, token);
  assert.equal(edited.response.status, 200, JSON.stringify(edited.data));
  assert.equal(edited.data.session.sessiondate, "2026-09-03");
  assert.equal(edited.data.session.active, false);
  assert.equal(Number(tables.PlatformConfig[2][1]), 1);

  const publish1 = await post("/api/admin/platform/global/timetable/publish", { runId: "GSRUN1" }, token);
  assert.equal(publish1.response.status, 200, JSON.stringify(publish1.data));
  assert.equal(publish1.data.publication.versionno, 1);
  assert.equal(publish1.data.publication.sessioncount, 8, "Inactive draft session must not be published");
  assert.equal(Number(tables.PlatformConfig[2][1]), 2);
  assert.equal(tables.GlobalTimetableRunState[1][1], "PUBLISHED");
  const publication1Id = tables.GlobalTimetableRunState[1][2];
  assert.equal(publication1Id, publish1.data.publication.publicationid);
  const publication1Snapshots = structuredClone(tables.PublishedGlobalTimetableSessions.slice(1));
  assert.equal(publication1Snapshots.length, 8);
  assert.equal(publication1Snapshots.every(row => row[14] === "September 2026" && row[15] === "Steps to My Rabb" && row[17] === "Ml Teacher"), true);

  const activeSource = tables.GlobalTimetableSessions[2];
  const postPublishEdit = await post("/api/admin/platform/global/timetable/session/save", {
    sessionId: activeSource[0],
    sessionDate: activeSource[4],
    startTime: "10:30",
    endTime: "11:30",
    moduleId: activeSource[3],
    teacherAccountId: "TEACHER1",
    zoomLink: activeSource[8],
    active: true
  }, token);
  assert.equal(postPublishEdit.response.status, 200, JSON.stringify(postPublishEdit.data));
  assert.equal(tables.GlobalTimetableRunState[1][1], "DEVELOPMENT");
  assert.equal(tables.GlobalTimetableRunState[1][2], publication1Id, "Draft edit must preserve current immutable publication pointer");
  assert.deepEqual(tables.PublishedGlobalTimetableSessions.slice(1, 9), publication1Snapshots, "Draft edit must not mutate the previous publication snapshot");
  assert.equal(Number(tables.PlatformConfig[2][1]), 2);

  const publish2 = await post("/api/admin/platform/global/timetable/publish", { runId: "GSRUN1" }, token);
  assert.equal(publish2.response.status, 200, JSON.stringify(publish2.data));
  assert.equal(publish2.data.publication.versionno, 2);
  assert.notEqual(publish2.data.publication.publicationid, publication1Id);
  assert.equal(Number(tables.PlatformConfig[2][1]), 3);
  assert.deepEqual(tables.PublishedGlobalTimetableSessions.slice(1, 9), publication1Snapshots, "Republish must append rather than alter publication 1");
  assert.equal(tables.PublishedGlobalTimetableSessions.length - 1, 16);
  assert.equal(tables.PlatformAuditLog.some(row => row[6] === "PUBLISH_GLOBAL_TIMETABLE"), true);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("V102.11 exact-dated global timetable generation/edit/immutable publication tests passed.");

async function post(path, body, bearer) {
  const responseValue = await worker.fetch(new Request(`https://worker.test${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
    body: JSON.stringify(body)
  }), env);
  return { response: responseValue, data: await responseValue.json() };
}

function applyWrite(write) {
  const range = write.range;
  const multi = /^'([^']+)'!A(\d+):([A-Z]+)(\d+)$/.exec(range);
  if (multi) {
    const [, sheetName, startText, , endText] = multi;
    const start = Number(startText);
    const end = Number(endText);
    assert.equal(write.values.length, end - start + 1, `Unexpected row count for ${range}`);
    write.values.forEach((values, offset) => { tables[sheetName][start + offset - 1] = [...values]; });
    return;
  }
  const config = /^'PlatformConfig'!B(\d+):E\1$/.exec(range);
  if (config) {
    const row = tables.PlatformConfig[Number(config[1]) - 1] || [];
    write.values[0].forEach((value, index) => { row[index + 1] = value; });
    tables.PlatformConfig[Number(config[1]) - 1] = row;
    return;
  }
  throw new Error(`Unexpected global timetable write: ${range}`);
}

function toPem(bytes, label) {
  const base64 = Buffer.from(bytes).toString("base64");
  const lines = base64.match(/.{1,64}/g).join("\n");
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----\n`;
}
function response(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
