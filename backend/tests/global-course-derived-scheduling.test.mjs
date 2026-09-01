import assert from "node:assert/strict";
import { createSaltedPinHash, createSessionToken } from "../src/lib/auth.js";
import { resolveCurrentPublishedGlobalTimetable } from "../src/lib/global-timetable.js";
import { PLATFORM_SHEET_HEADERS, validatePlatformSheetRows } from "../src/lib/platform-schema.js";
import worker from "../src/worker.js";

const pinSecret = "v1045-pin-secret";
const sessionSecret = "v1045-session-secret";
const credentialHash = await createSaltedPinHash("2468", pinSecret);
const tables = Object.fromEntries(Object.entries(PLATFORM_SHEET_HEADERS).map(([name, headers]) => [name, [headers]]));

tables.UserAccounts.push([
  "ACCOUNT1", "Global Admin", "GLOBAL-ADMIN", true, credentialHash, true, "", "2026-08-31T00:00:00.000Z",
  "", "", "", "", "", "GLOBAL_ADMIN"
]);
tables.UserAccounts.push([
  "TEACHER1", "Ml Teacher", "TEACHER", true, "hash", true, "", "2026-08-31T00:00:00.000Z",
  "", "", "", "", "", ""
]);
tables.GlobalSubjectList.push(["GSUBJ1", "Workshop Subject", true, "", "", "", "", "", ""]);
tables.GlobalModuleList.push(["GMOD1", "GSUBJ1", "Module 1", 1, true, "", "", "", "", "", ""]);
tables.GlobalSubjectRuns.push([
  "GSRUN-DERIVED", "GSUBJ1", "Derived September Course", "2026-09-01", "2026-09-30", "Africa/Johannesburg", true,
  "", "", "", "", "", "", "FREE", "DERIVED",
  JSON.stringify([{ rulekey: "RULE1", days: ["MON"], starttime: "09:00", endtime: "10:00", moduleid: "GMOD1", teacheraccountid: "TEACHER1", zoomlink: "https://zoom.example.test/derived" }])
]);
tables.GlobalSubjectRuns.push([
  "GSRUN-WORKSHOP", "GSUBJ1", "Four Session Workshop", "2026-09-01", "2026-09-30", "Africa/Johannesburg", true,
  "", "", "", "", "", "", "FREE", "EXPLICIT", "[]"
]);
tables.PlatformConfig.push(["PlatformSchemaVersion", "102.0.12"]);
tables.PlatformConfig.push(["GlobalTimetableVersion", 1]);
tables.PlatformConfig.push(["GlobalCurriculumVersion", 1]);
tables.PlatformConfig.push(["PlatformTimezone", "Africa/Johannesburg"]);

const keyPair = await crypto.subtle.generateKey({
  name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256"
}, true, ["sign", "verify"]);
const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey));
const env = {
  PIN_SECRET: pinSecret,
  SESSION_SECRET: sessionSecret,
  PLATFORM_SPREADSHEET_ID: "v1045-platform-sheet",
  GOOGLE_SPREADSHEET_ID: "legacy-sheet",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account", client_email: "v1045@example.iam.gserviceaccount.com", private_key_id: "v1045-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"), token_uri: "https://oauth2.googleapis.com/token"
  }),
  M4L_ACCOUNT_AUTH_DIAGNOSTICS: "true"
};
const token = await createSessionToken({
  type: "account", accountid: "ACCOUNT1", uniqueid: "GLOBAL-ADMIN", username: "Global Admin",
  role: "GLOBAL_ADMIN", scope: "PLATFORM", authrow: 2, credentialHash
}, env);

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  if (url.hostname === "oauth2.googleapis.com") return response({ access_token: "token", expires_in: 3600 });
  if (url.hostname !== "sheets.googleapis.com") throw new Error(`Unexpected V104.5 fetch: ${url}`);
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
  throw new Error(`Unexpected V104.5 range: ${range}`);
};

try {
  const generated = await post("/api/admin/platform/global/timetable/generate", {
    runId: "GSRUN-DERIVED", weekdays: ["MON"], startTime: "09:00", endTime: "10:00"
  });
  assert.equal(generated.response.status, 409);
  assert.match(generated.data.error, /DERIVED Courses store recurring rules/);

  const timetable = await post("/api/admin/platform/global/timetable/get", {});
  assert.equal(timetable.response.status, 200, JSON.stringify(timetable.data));
  assert.equal(timetable.data.calendarEvents.some(event => event.startDate === "2026-09-24" && event.eventType === "PUBLIC_HOLIDAY"), true,
    "Fixed derived Courses must still receive Academy Calendar/public-holiday context without materialised sessions");

  const publish1 = await post("/api/admin/platform/global/timetable/publish", { runId: "GSRUN-DERIVED" });
  assert.equal(publish1.response.status, 200, JSON.stringify(publish1.data));
  assert.equal(publish1.data.publication.schedulemode, "DERIVED");
  assert.equal(publish1.data.publication.sessioncount, 4);
  assert.equal(tables.GlobalTimetableSessions.length, 1, "Normal derived occurrences must not create source session rows");
  assert.equal(tables.PublishedGlobalTimetableSessions.length, 1, "Normal derived occurrences must not create publication snapshot rows");

  const parsed1 = parsedTables();
  const resolved1 = resolveCurrentPublishedGlobalTimetable(parsed1, "GSRUN-DERIVED");
  assert.equal(resolved1.ok, true, JSON.stringify(resolved1));
  assert.deepEqual(resolved1.sessions.map(item => item.sessiondate), ["2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28"]);
  assert.equal(resolved1.sessions.every(item => item.derived === true), true);

  const revise = await post("/api/admin/platform/global/timetable/revise", { runId: "GSRUN-DERIVED" });
  assert.equal(revise.response.status, 200, JSON.stringify(revise.data));

  const cancelled = await post("/api/admin/platform/global/timetable/session/materialize", {
    runId: "GSRUN-DERIVED", scheduleRuleKey: "RULE1", occurrenceDate: "2026-09-14", status: "CANCELLED"
  });
  assert.equal(cancelled.response.status, 200, JSON.stringify(cancelled.data));
  assert.equal(cancelled.data.session.sessionkind, "EXCEPTION");
  assert.equal(cancelled.data.session.occurrencedate, "2026-09-14");
  assert.equal(cancelled.data.lifecycle.status, "CANCELLED");
  assert.equal(tables.GlobalTimetableSessions.length, 2, "One changed occurrence must create exactly one exception row");

  const exceptionId = cancelled.data.session.sessionid;
  const singleConflict = await post("/api/admin/platform/global/timetable/session/save", {
    sessionId: exceptionId, sessionDate: "2026-09-21", startTime: "09:00", endTime: "10:00", status: "SCHEDULED"
  });
  assert.equal(singleConflict.response.status, 409);
  assert.match(singleConflict.data.error, /Derived Course sessions overlap/);

  const batchConflict = await post("/api/admin/platform/global/timetable/session/batch-save", {
    runId: "GSRUN-DERIVED",
    changes: [{ sessionId: exceptionId, sessionDate: "2026-09-21", startTime: "09:00", endTime: "10:00", status: "SCHEDULED" }]
  });
  assert.equal(batchConflict.response.status, 409);
  assert.match(batchConflict.data.error, /Derived Course sessions overlap/);

  const invalidReschedule = await post("/api/admin/platform/global/timetable/session/reschedule", {
    sessionId: exceptionId, sessionDate: "2026-09-15", startTime: "09:00", endTime: "10:00"
  });
  assert.equal(invalidReschedule.response.status, 409);
  assert.match(invalidReschedule.data.error, /exceptions are moved by editing/);

  const publish2 = await post("/api/admin/platform/global/timetable/publish", { runId: "GSRUN-DERIVED" });
  assert.equal(publish2.response.status, 200, JSON.stringify(publish2.data));
  assert.equal(publish2.data.publication.sessioncount, 4, "Cancelled occurrences remain represented in the dated publication view");
  const publication2Id = publish2.data.publication.publicationid;
  const pubIdIndex = PLATFORM_SHEET_HEADERS.PublishedGlobalTimetableSessions.indexOf("PublicationID");
  const pub2Snapshots = tables.PublishedGlobalTimetableSessions.slice(1).filter(row => row[pubIdIndex] === publication2Id);
  assert.equal(pub2Snapshots.length, 1, "Derived publication must snapshot only the one materialised exception");

  const parsed2 = parsedTables();
  const resolved2 = resolveCurrentPublishedGlobalTimetable(parsed2, "GSRUN-DERIVED");
  assert.equal(resolved2.ok, true, JSON.stringify(resolved2));
  assert.equal(resolved2.sessions.length, 4);
  const cancelledIndex = resolved2.sessions.findIndex(item => item.sessiondate === "2026-09-14");
  assert.ok(cancelledIndex >= 0);
  assert.equal(resolved2.sessions[cancelledIndex].sessionkind, "EXCEPTION");
  assert.equal(resolved2.lifecycles[cancelledIndex].status, "CANCELLED");

  const workshop = await post("/api/admin/platform/global/timetable/generate", {
    runId: "GSRUN-WORKSHOP", moduleId: "GMOD1", weekdays: ["FRI"], startTime: "09:00", endTime: "10:00",
    teacherAccountId: "TEACHER1", zoomLink: "https://zoom.example.test/workshop"
  });
  assert.equal(workshop.response.status, 200, JSON.stringify(workshop.data));
  assert.equal(workshop.data.sessions.length, 4, "EXPLICIT workshop mode must materialise the four exact September Friday sessions");
  assert.deepEqual(workshop.data.sessions.map(item => item.sessiondate), ["2026-09-04", "2026-09-11", "2026-09-18", "2026-09-25"]);
  assert.equal(workshop.data.sessions.every(item => item.sessionkind === "EXPLICIT"), true);

  const workshopDescriptions = [
    "Foundations and workshop orientation",
    "Building the core practice",
    "Review, correction and consolidation",
    "Final integration, next steps and Q&A"
  ];
  const describedWorkshop = await post("/api/admin/platform/global/timetable/session/batch-save", {
    runId: "GSRUN-WORKSHOP",
    changes: workshop.data.sessions.map((session, index) => ({
      sessionId: session.sessionid,
      sessionDescription: workshopDescriptions[index]
    }))
  });
  assert.equal(describedWorkshop.response.status, 200, JSON.stringify(describedWorkshop.data));
  assert.deepEqual(describedWorkshop.data.sessions.map(item => item.sessiondescription), workshopDescriptions);

  const workshopPublication = await post("/api/admin/platform/global/timetable/publish", { runId: "GSRUN-WORKSHOP" });
  assert.equal(workshopPublication.response.status, 200, JSON.stringify(workshopPublication.data));
  assert.equal(workshopPublication.data.publication.schedulemode, "EXPLICIT");
  assert.equal(workshopPublication.data.publication.sessioncount, 4);
  const workshopPublicationId = workshopPublication.data.publication.publicationid;
  const workshopSnapshots = tables.PublishedGlobalTimetableSessions.slice(1).filter(row => row[pubIdIndex] === workshopPublicationId);
  assert.equal(workshopSnapshots.length, 4, "EXPLICIT workshop publication must retain all four exact dated session snapshots");
  const descriptionIndex = PLATFORM_SHEET_HEADERS.PublishedGlobalTimetableSessions.indexOf("SessionDescription");
  assert.deepEqual(workshopSnapshots.map(row => row[descriptionIndex]), workshopDescriptions, "Published workshop snapshots must preserve each short session description");
} finally {
  globalThis.fetch = originalFetch;
}

console.log("V104.5 derived Course, one-row exception, explicit workshop and per-session description regressions passed.");

function parsedTables() {
  return Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, validatePlatformSheetRows(name, rows)]));
}

async function post(path, body) {
  const res = await worker.fetch(new Request(`https://worker.test${path}`, {
    method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify(body)
  }), env);
  return { response: res, data: await res.json() };
}

function applyWrite(write) {
  const config = /^'PlatformConfig'!B(\d+):E\1$/.exec(write.range);
  if (config) {
    const row = tables.PlatformConfig[Number(config[1]) - 1] || [];
    write.values[0].forEach((value, index) => { row[index + 1] = value; });
    tables.PlatformConfig[Number(config[1]) - 1] = row;
    return;
  }
  const range = /^'([^']+)'!A(\d+):([A-Z]+)(\d+)$/.exec(write.range);
  if (range) {
    const [, sheetName, startText, , endText] = range;
    const start = Number(startText); const end = Number(endText);
    assert.equal(write.values.length, end - start + 1, `Unexpected row count for ${write.range}`);
    write.values.forEach((values, offset) => { tables[sheetName][start + offset - 1] = [...values]; });
    return;
  }
  throw new Error(`Unexpected V104.5 write: ${write.range}`);
}

function toPem(bytes, label) {
  const base64 = Buffer.from(bytes).toString("base64");
  return `-----BEGIN ${label}-----\n${base64.match(/.{1,64}/g).join("\n")}\n-----END ${label}-----\n`;
}
function response(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } }); }
