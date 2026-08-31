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
let batchUpdateRequests = 0;
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  if (url.hostname === "oauth2.googleapis.com") return response({ access_token: "google-token", expires_in: 3600 });
  if (url.hostname !== "sheets.googleapis.com") throw new Error(`Unexpected global timetable fetch: ${url}`);
  assert.match(url.pathname, /spreadsheets\/platform-global-timetable-sheet/);

  if (url.pathname.endsWith("/values:batchUpdate")) {
    batchUpdateRequests += 1;
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
  assert.equal(initial.data.version, "104.2");
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

  // Retire these planning-only TBA rows so the main publication-history scenario below stays focused.
  // A dedicated TBA publication assertion is exercised after the revision-history scenario.
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

  // V102.12.8 session editing is draft-first: cancellation and date/time edits commit together in one batch.
  const cancelSource = generated.data.sessions[1];
  const movedSource = generated.data.sessions[3];
  const beforeInvalidSessionBatch = batchUpdateRequests;
  const invalidSessionBatch = await post("/api/admin/platform/global/timetable/session/batch-save", {
    runId: "GSRUN1",
    changes: [
      {
        sessionId: cancelSource.sessionid, sessionDate: cancelSource.sessiondate, startTime: cancelSource.starttime, endTime: cancelSource.endtime,
        moduleId: cancelSource.moduleid, teacherAccountId: cancelSource.teacheraccountid, zoomLink: cancelSource.zoomlink, active: true, status: "CANCELLED"
      },
      {
        sessionId: movedSource.sessionid, sessionDate: "2026-10-04", startTime: "16:00", endTime: "17:00",
        moduleId: movedSource.moduleid, teacherAccountId: movedSource.teacheraccountid, zoomLink: movedSource.zoomlink, active: true, status: "SCHEDULED"
      }
    ]
  }, token);
  assert.equal(invalidSessionBatch.response.status, 400);
  assert.equal(batchUpdateRequests, beforeInvalidSessionBatch, "An invalid session batch must not write any partial changes");
  assert.equal(tables.PlatformAuditLog.some(row => row[6] === "CANCEL_GLOBAL_TIMETABLE_SESSION"), false);

  const beforeSessionBatchRequests = batchUpdateRequests;
  const batchEdited = await post("/api/admin/platform/global/timetable/session/batch-save", {
    runId: "GSRUN1",
    changes: [
      {
        sessionId: cancelSource.sessionid,
        sessionDate: cancelSource.sessiondate,
        startTime: cancelSource.starttime,
        endTime: cancelSource.endtime,
        moduleId: cancelSource.moduleid,
        teacherAccountId: cancelSource.teacheraccountid,
        zoomLink: cancelSource.zoomlink,
        active: true,
        status: "CANCELLED"
      },
      {
        sessionId: movedSource.sessionid,
        sessionDate: "2026-09-04",
        startTime: "16:00",
        endTime: "17:00",
        moduleId: movedSource.moduleid,
        teacherAccountId: movedSource.teacheraccountid,
        zoomLink: "https://zoom.example.test/date-change",
        active: true,
        status: "SCHEDULED"
      }
    ]
  }, token);
  assert.equal(batchEdited.response.status, 200, JSON.stringify(batchEdited.data));
  assert.equal(batchEdited.data.changed, 2);
  assert.equal(batchUpdateRequests, beforeSessionBatchRequests + 1, "Multiple session edits must commit in one Google Sheets batchUpdate request");
  assert.equal(batchEdited.data.lifecycles.find(item => item.sessionid === cancelSource.sessionid)?.status, "CANCELLED");
  const movedResult = batchEdited.data.sessions.find(item => item.sessionid === movedSource.sessionid);
  assert.equal(movedResult?.sessiondate, "2026-09-04", "Changing the date updates the same session rather than creating a separate reschedule record");
  assert.equal(batchEdited.data.lifecycles.find(item => item.sessionid === movedSource.sessionid)?.status, "SCHEDULED");
  assert.equal(tables.PlatformAuditLog.some(row => row[6] === "RESCHEDULE_GLOBAL_TIMETABLE_SESSION"), false, "A direct date change is audited as an update, not as legacy rescheduling");

  // Legacy reschedule remains API-compatible, although the V102.12.8 editor no longer exposes a separate Reschedule action.
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

  // V102.12.8: TBA is a valid publishable teacher state. Keep TeacherAccountID blank and snapshot TeacherName as TBA.
  tables.GlobalSubjectRuns.push([
    "GSRUN-TBA", "GSUBJ1", "October TBA run", "2026-10-01", "2026-10-31", "Africa/Johannesburg", true,
    "", "", "", "", "", ""
  ]);
  const publishableTbaDraft = await post("/api/admin/platform/global/timetable/generate", {
    runId: "GSRUN-TBA", moduleId: "GMOD1", weekdays: ["FRI"], startTime: "12:00", endTime: "13:00"
  }, token);
  assert.equal(publishableTbaDraft.response.status, 200, JSON.stringify(publishableTbaDraft.data));
  assert.equal(publishableTbaDraft.data.sessions.length, 5);
  assert.equal(publishableTbaDraft.data.sessions.every(item => !item.teacheraccountid), true);

  const tbaPublication = await post("/api/admin/platform/global/timetable/publish", { runId: "GSRUN-TBA" }, token);
  assert.equal(tbaPublication.response.status, 200, JSON.stringify(tbaPublication.data));
  assert.equal(tbaPublication.data.publication.versionno, 1);
  assert.equal(tbaPublication.data.publication.sessioncount, 5);
  assert.equal(Number(tables.PlatformConfig[2][1]), 4);
  const tbaPublicationId = tbaPublication.data.publication.publicationid;
  const publicationIdIndex = PLATFORM_SHEET_HEADERS.PublishedGlobalTimetableSessions.indexOf("PublicationID");
  const teacherIdIndex = PLATFORM_SHEET_HEADERS.PublishedGlobalTimetableSessions.indexOf("TeacherAccountID");
  const teacherNameIndex = PLATFORM_SHEET_HEADERS.PublishedGlobalTimetableSessions.indexOf("TeacherName");
  const tbaSnapshots = tables.PublishedGlobalTimetableSessions.slice(1).filter(row => row[publicationIdIndex] === tbaPublicationId);
  assert.equal(tbaSnapshots.length, 5);
  assert.equal(tbaSnapshots.every(row => !row[teacherIdIndex]), true, "TBA must not create a fake teacher AccountID");
  assert.equal(tbaSnapshots.every(row => row[teacherNameIndex] === "TBA"), true, "Published TBA sessions must keep an immutable TBA display label");
  assert.equal(tables.PlatformAuditLog.filter(row => row[6] === "PUBLISH_GLOBAL_TIMETABLE").length, 3);

  // V102.12.8: ongoing Global Courses have no course-level start/end dates. A temporary generation window
  // creates exact dated sessions, and those sessions may later move beyond that generation window.
  tables.GlobalSubjectRuns.push([
    "GSRUN-ONGOING", "GSUBJ1", "Ongoing Hifz-style course", "", "", "Africa/Johannesburg", true,
    "", "", "", "", "", ""
  ]);
  const missingOngoingWindow = await post("/api/admin/platform/global/timetable/generate", {
    runId: "GSRUN-ONGOING", moduleId: "GMOD1", weekdays: ["MON"], startTime: "08:00", endTime: "09:00"
  }, token);
  assert.equal(missingOngoingWindow.response.status, 400);
  assert.match(missingOngoingWindow.data.error, /Ongoing courses require valid Generate from and Generate through dates/);

  const ongoingGenerated = await post("/api/admin/platform/global/timetable/generate", {
    runId: "GSRUN-ONGOING",
    moduleId: "GMOD1",
    weekdays: ["MON", "WED"],
    startTime: "08:00",
    endTime: "09:00",
    generationStartDate: "2026-11-01",
    generationEndDate: "2026-11-07"
  }, token);
  assert.equal(ongoingGenerated.response.status, 200, JSON.stringify(ongoingGenerated.data));
  assert.deepEqual(ongoingGenerated.data.sessions.map(item => item.sessiondate), ["2026-11-02", "2026-11-04"]);
  assert.equal(ongoingGenerated.data.sessions.every(item => !item.teacheraccountid), true);

  // Courses Save may re-ensure an already prepared recurring window. Exact equivalent
  // sessions are skipped rather than duplicated or treated as conflicts.
  const ensuredAgain = await post("/api/admin/platform/global/timetable/generate", {
    runId: "GSRUN-ONGOING",
    moduleId: "GMOD1",
    weekdays: ["MON", "WED"],
    startTime: "08:00",
    endTime: "09:00",
    generationStartDate: "2026-11-01",
    generationEndDate: "2026-11-07",
    skipExistingEquivalent: true
  }, token);
  assert.equal(ensuredAgain.response.status, 200, JSON.stringify(ensuredAgain.data));
  assert.equal(ensuredAgain.data.sessions.length, 0);
  assert.match(ensuredAgain.data.message, /already prepared/);

  const ongoingFirst = ongoingGenerated.data.sessions[0];
  const ongoingMoved = await post("/api/admin/platform/global/timetable/session/batch-save", {
    runId: "GSRUN-ONGOING",
    changes: [{
      sessionId: ongoingFirst.sessionid,
      sessionDate: "2027-01-04",
      startTime: ongoingFirst.starttime,
      endTime: ongoingFirst.endtime,
      moduleId: ongoingFirst.moduleid,
      teacherAccountId: "",
      zoomLink: ongoingFirst.zoomlink,
      active: true,
      status: "SCHEDULED"
    }]
  }, token);
  assert.equal(ongoingMoved.response.status, 200, JSON.stringify(ongoingMoved.data));
  assert.equal(ongoingMoved.data.sessions.find(item => item.sessionid === ongoingFirst.sessionid)?.sessiondate, "2027-01-04");

  const missingOngoingPublishWindow = await post("/api/admin/platform/global/timetable/publish", { runId: "GSRUN-ONGOING" }, token);
  assert.equal(missingOngoingPublishWindow.response.status, 400);
  assert.match(missingOngoingPublishWindow.data.error, /Publish From and Publish Through/);

  const ongoingPublication = await post("/api/admin/platform/global/timetable/publish", {
    runId: "GSRUN-ONGOING", publishStartDate: "2026-11-01", publishEndDate: "2026-11-07"
  }, token);
  assert.equal(ongoingPublication.response.status, 200, JSON.stringify(ongoingPublication.data));
  assert.equal(ongoingPublication.data.publication.versionno, 1);
  assert.equal(ongoingPublication.data.publication.sessioncount, 1, "Only sessions inside the selected ongoing publication range are published");
  assert.equal(Number(tables.PlatformConfig[2][1]), 5);
  assert.equal(tables.PlatformAuditLog.filter(row => row[6] === "PUBLISH_GLOBAL_TIMETABLE").length, 4);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("V103.1.0.5 Global Course publication windows, ensure-generation, batch editing and immutable TBA publication tests passed.");

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
