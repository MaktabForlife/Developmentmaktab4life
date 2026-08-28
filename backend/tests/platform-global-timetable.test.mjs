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
tables.PlatformConfig.push(["PlatformSchemaVersion", "102.0.7"]);
tables.PlatformConfig.push(["GlobalTimetableVersion", 1]);
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
  tables.PlatformConfig[1][1] = "102.0.6";
  const preCutover = await post("/api/admin/platform/global/timetable/get", {}, token);
  assert.equal(preCutover.response.status, 503);
  assert.match(preCutover.data.detail, /requires PlatformSchemaVersion 102\.0\.7/);
  tables.PlatformConfig[1][1] = "102.0.7";

  const initial = await post("/api/admin/platform/global/timetable/get", {}, token);
  assert.equal(initial.response.status, 200, JSON.stringify(initial.data));
  assert.equal(initial.data.version, "102.11.2");
  assert.equal(initial.data.globalTimetableVersion, 1);
  assert.equal(initial.data.runs.length, 1);
  assert.equal(initial.data.teachers.some(item => item.accountid === "TEACHER1"), true);

  // DEVELOPMENT allows TBA/blank teacher so dates can be planned before staffing is final.
  const tbaDraft = await post("/api/admin/platform/global/timetable/generate", {
    runId: "GSRUN1", moduleId: "GMOD1", weekdays: ["FRI"], startTime: "12:00", endTime: "13:00"
  }, token);
  assert.equal(tbaDraft.response.status, 200, JSON.stringify(tbaDraft.data));
  assert.equal(tbaDraft.data.sessions.length, 4);
  assert.equal(tbaDraft.data.sessions.every(item => !item.teacheraccountid), true);

  const blockedPublishWithoutTeacher = await post("/api/admin/platform/global/timetable/publish", { runId: "GSRUN1" }, token);
  assert.equal(blockedPublishWithoutTeacher.response.status, 400);
  assert.match(blockedPublishWithoutTeacher.data.error, /Assign a teacher before publishing/);
  assert.equal(Number(tables.PlatformConfig[2][1]), 1, "Blocked publication must not change GlobalTimetableVersion");

  // Retire the TBA-only draft rows so the main publication can proceed.
  for (const session of tbaDraft.data.sessions) {
    const retired = await post("/api/admin/platform/global/timetable/session/save", {
      sessionId: session.sessionid,
      sessionDate: session.sessiondate,
      startTime: session.starttime,
      endTime: session.endtime,
      moduleId: session.moduleid,
      teacherAccountId: "",
      zoomLink: session.zoomlink,
      active: false,
      status: "SCHEDULED"
    }, token);
    assert.equal(retired.response.status, 200, JSON.stringify(retired.data));
  }

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

  const first = generated.data.sessions[0];
  const edited = await post("/api/admin/platform/global/timetable/session/save", {
    sessionId: first.sessionid,
    sessionDate: "2026-09-03",
    startTime: "09:15",
    endTime: "10:15",
    moduleId: "GMOD1",
    teacherAccountId: "TEACHER1",
    zoomLink: "https://zoom.example.test/exception",
    active: false,
    status: "SCHEDULED"
  }, token);
  assert.equal(edited.response.status, 200, JSON.stringify(edited.data));
  assert.equal(edited.data.session.sessiondate, "2026-09-03");
  assert.equal(edited.data.session.active, false);

  const publish1 = await post("/api/admin/platform/global/timetable/publish", { runId: "GSRUN1" }, token);
  assert.equal(publish1.response.status, 200, JSON.stringify(publish1.data));
  assert.equal(publish1.data.publication.versionno, 1);
  assert.equal(publish1.data.publication.sessioncount, 8, "Inactive draft sessions must not be published");
  assert.equal(Number(tables.PlatformConfig[2][1]), 2);
  assert.equal(tables.GlobalTimetableRunState[1][1], "PUBLISHED");
  const publication1Id = tables.GlobalTimetableRunState[1][2];
  assert.equal(publication1Id, publish1.data.publication.publicationid);
  const publication1Snapshots = structuredClone(tables.PublishedGlobalTimetableSessions.slice(1));
  const publication1Lifecycle = structuredClone(tables.GlobalTimetableSessionLifecycle.filter(row => row[2] === publication1Id));
  assert.equal(publication1Snapshots.length, 8);
  assert.equal(publication1Lifecycle.length, 8);
  assert.equal(publication1Lifecycle.every(row => row[3] === "SCHEDULED"), true);

  // A published course is immutable until an explicit revision is opened.
  const lockedSource = generated.data.sessions[1];
  const blockedPublishedEdit = await post("/api/admin/platform/global/timetable/session/save", {
    sessionId: lockedSource.sessionid,
    sessionDate: lockedSource.sessiondate,
    startTime: "10:30",
    endTime: "11:30",
    moduleId: lockedSource.moduleid,
    teacherAccountId: "TEACHER1",
    zoomLink: lockedSource.zoomlink,
    active: true,
    status: "SCHEDULED"
  }, token);
  assert.equal(blockedPublishedEdit.response.status, 409);
  assert.match(blockedPublishedEdit.data.error, /Revise timetable before modifying a published course/);
  assert.deepEqual(tables.PublishedGlobalTimetableSessions.slice(1), publication1Snapshots);

  const revised = await post("/api/admin/platform/global/timetable/revise", { runId: "GSRUN1" }, token);
  assert.equal(revised.response.status, 200, JSON.stringify(revised.data));
  assert.equal(revised.data.state.stage, "DEVELOPMENT");
  assert.equal(revised.data.state.currentpublicationid, publication1Id);
  assert.equal(tables.GlobalTimetableRunState[1][1], "DEVELOPMENT");

  // One published occurrence can remain visible as CANCELLED in the next publication.
  const cancelSource = generated.data.sessions[1];
  const cancelled = await post("/api/admin/platform/global/timetable/session/save", {
    sessionId: cancelSource.sessionid,
    sessionDate: cancelSource.sessiondate,
    startTime: cancelSource.starttime,
    endTime: cancelSource.endtime,
    moduleId: cancelSource.moduleid,
    teacherAccountId: cancelSource.teacheraccountid,
    zoomLink: cancelSource.zoomlink,
    active: true,
    status: "CANCELLED"
  }, token);
  assert.equal(cancelled.response.status, 200, JSON.stringify(cancelled.data));
  assert.equal(cancelled.data.lifecycle.status, "CANCELLED");

  // A reschedule keeps the original occurrence and links it to a new exact-dated replacement.
  const rescheduleSource = generated.data.sessions[2];
  const rescheduled = await post("/api/admin/platform/global/timetable/session/reschedule", {
    sessionId: rescheduleSource.sessionid,
    sessionDate: "2026-09-05",
    startTime: "14:00",
    endTime: "15:00",
    moduleId: rescheduleSource.moduleid,
    teacherAccountId: "TEACHER1",
    zoomLink: "https://zoom.example.test/rescheduled"
  }, token);
  assert.equal(rescheduled.response.status, 200, JSON.stringify(rescheduled.data));
  assert.equal(rescheduled.data.sourceLifecycle.status, "RESCHEDULED");
  assert.equal(rescheduled.data.sourceLifecycle.rescheduledtosessionid, rescheduled.data.replacement.sessionid);
  assert.equal(rescheduled.data.replacementLifecycle.status, "SCHEDULED");
  assert.equal(rescheduled.data.replacementLifecycle.rescheduledfromsessionid, rescheduleSource.sessionid);
  assert.equal(rescheduled.data.replacement.sessiondate, "2026-09-05");

  const publish2 = await post("/api/admin/platform/global/timetable/publish", { runId: "GSRUN1" }, token);
  assert.equal(publish2.response.status, 200, JSON.stringify(publish2.data));
  assert.equal(publish2.data.publication.versionno, 2);
  assert.notEqual(publish2.data.publication.publicationid, publication1Id);
  assert.equal(publish2.data.publication.sessioncount, 9, "Cancelled/rescheduled originals remain visible and the replacement is added");
  assert.equal(Number(tables.PlatformConfig[2][1]), 3);
  assert.deepEqual(tables.PublishedGlobalTimetableSessions.slice(1, 9), publication1Snapshots, "Revision must not alter publication 1");
  assert.deepEqual(tables.GlobalTimetableSessionLifecycle.filter(row => row[2] === publication1Id), publication1Lifecycle, "Revision must not alter publication 1 lifecycle history");

  const publication2Id = publish2.data.publication.publicationid;
  const publication2Lifecycle = tables.GlobalTimetableSessionLifecycle.filter(row => row[2] === publication2Id);
  assert.equal(publication2Lifecycle.length, 9);
  assert.equal(publication2Lifecycle.filter(row => row[3] === "CANCELLED").length, 1);
  assert.equal(publication2Lifecycle.filter(row => row[3] === "RESCHEDULED").length, 1);
  assert.equal(publication2Lifecycle.filter(row => row[3] === "SCHEDULED").length, 7);
  assert.equal(tables.PlatformAuditLog.some(row => row[6] === "RESCHEDULE_GLOBAL_TIMETABLE_SESSION"), true);
  assert.equal(tables.PlatformAuditLog.filter(row => row[6] === "PUBLISH_GLOBAL_TIMETABLE").length, 2);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("V102.11.2 Global Course draft/revision/cancel/reschedule/immutable publication tests passed.");

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
