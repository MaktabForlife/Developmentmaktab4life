import assert from "node:assert/strict";
import { createSaltedPinHash, createSessionToken } from "../src/lib/auth.js";
import { resolveCurrentPublishedGlobalTimetable } from "../src/lib/global-timetable.js";
import { PLATFORM_SHEET_HEADERS, validatePlatformSheetRows } from "../src/lib/platform-schema.js";
import worker from "../src/worker.js";

const pinSecret = "v10453-pin-secret";
const sessionSecret = "v10453-session-secret";
const credentialHash = await createSaltedPinHash("2468", pinSecret);
const tables = Object.fromEntries(Object.entries(PLATFORM_SHEET_HEADERS).map(([name, headers]) => [name, [headers]]));

tables.UserAccounts.push([
  "ACCOUNT1", "Global Admin", "GLOBAL-ADMIN", true, credentialHash, true, "", "2026-09-01T00:00:00.000Z",
  "", "", "", "", "", "GLOBAL_ADMIN"
]);
tables.GlobalSubjectList.push(["GSUBJ-HIFZ", "Hifz", true, "", "", "", "", "", ""]);
tables.GlobalSubjectAccessPolicy.push(["GSPOL-HIFZ", "GSUBJ-HIFZ", "SUBSCRIPTION", true, "", "", "", "", "", ""]);
tables.GlobalSubjectRuns.push([
  "GSRUN-HIFZ", "GSUBJ-HIFZ", "Hifz", "", "", "Africa/Johannesburg", true,
  "", "", "", "", "", "", "PAID", "DERIVED",
  JSON.stringify([{ rulekey: "HIFZ-RULE", days: ["MON", "TUE", "WED", "THU"], starttime: "04:00", endtime: "05:00", moduleid: "", teacheraccountid: "", zoomlink: "https://zoom.example.test/hifz" }])
]);
tables.GlobalTimetableRunState.push([
  "GSRUN-HIFZ", "DEVELOPMENT", "", "2026-09-01T00:00:00.000Z", "ACCOUNT1", "Global Admin", "", "", "", "", ""
]);
tables.PlatformConfig.push(["PlatformSchemaVersion", "102.0.12"]);
tables.PlatformConfig.push(["GlobalCurriculumVersion", 1]);
tables.PlatformConfig.push(["GlobalTimetableVersion", 1]);
tables.PlatformConfig.push(["PlatformTimezone", "Africa/Johannesburg"]);

const keyPair = await crypto.subtle.generateKey({
  name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256"
}, true, ["sign", "verify"]);
const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey));
const env = {
  PIN_SECRET: pinSecret,
  SESSION_SECRET: sessionSecret,
  PLATFORM_SPREADSHEET_ID: "v10453-platform-sheet",
  GOOGLE_SPREADSHEET_ID: "legacy-sheet",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account", client_email: "v10453@example.iam.gserviceaccount.com", private_key_id: "v10453-key",
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
  if (url.hostname !== "sheets.googleapis.com") throw new Error(`Unexpected V104.5.3 fetch: ${url}`);
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
  throw new Error(`Unexpected V104.5.3 range: ${range}`);
};

try {
  const saved = await post("/api/admin/platform/global/run/save", {
    runId: "GSRUN-HIFZ",
    subjectId: "GSUBJ-HIFZ",
    runName: "Hifz",
    ongoing: true,
    accessModel: "PAID",
    scheduleMode: "DERIVED",
    scheduleDefinition: [{
      rulekey: "HIFZ-RULE", days: ["MON", "TUE", "WED", "THU"], starttime: "04:00", endtime: "05:00",
      moduleid: "", teacheraccountid: "", zoomlink: "https://zoom.example.test/hifz"
    }],
    draftPublishStartDate: "2026-09-01",
    draftPublishEndDate: "2026-09-01",
    active: true
  });
  assert.equal(saved.response.status, 200, JSON.stringify(saved.data));
  assert.equal(saved.data.run.draftpublishstartdate, "2026-09-01", "save response must immediately return the authoritative draft window");
  assert.equal(saved.data.run.draftpublishenddate, "2026-09-01");

  const stateHeader = PLATFORM_SHEET_HEADERS.GlobalTimetableRunState;
  const state = tables.GlobalTimetableRunState.slice(1).find(row => row[stateHeader.indexOf("RunID")] === "GSRUN-HIFZ");
  assert.ok(state, "Hifz timetable state must remain authoritative after save");
  assert.equal(state[stateHeader.indexOf("DraftPublishStartDate")], "2026-09-01");
  assert.equal(state[stateHeader.indexOf("DraftPublishEndDate")], "2026-09-01");

  const cleared = await post("/api/admin/platform/global/run/save", {
    runId: "GSRUN-HIFZ",
    subjectId: "GSUBJ-HIFZ",
    runName: "Hifz",
    ongoing: true,
    accessModel: "PAID",
    scheduleMode: "DERIVED",
    scheduleDefinition: [{
      rulekey: "HIFZ-RULE", days: ["MON", "TUE", "WED", "THU"], starttime: "04:00", endtime: "05:00",
      moduleid: "", teacheraccountid: "", zoomlink: "https://zoom.example.test/hifz"
    }],
    draftPublishStartDate: "",
    draftPublishEndDate: "",
    active: true
  });
  assert.equal(cleared.response.status, 200, JSON.stringify(cleared.data));
  assert.equal(cleared.data.run.draftpublishstartdate, "");
  assert.equal(cleared.data.run.draftpublishenddate, "");
  const clearedState = tables.GlobalTimetableRunState.slice(1).find(row => row[stateHeader.indexOf("RunID")] === "GSRUN-HIFZ");
  assert.equal(clearedState[stateHeader.indexOf("DraftPublishStartDate")], "");
  assert.equal(clearedState[stateHeader.indexOf("DraftPublishEndDate")], "");

  const restored = await post("/api/admin/platform/global/run/save", {
    runId: "GSRUN-HIFZ",
    subjectId: "GSUBJ-HIFZ",
    runName: "Hifz",
    ongoing: true,
    accessModel: "PAID",
    scheduleMode: "DERIVED",
    scheduleDefinition: [{
      rulekey: "HIFZ-RULE", days: ["MON", "TUE", "WED", "THU"], starttime: "04:00", endtime: "05:00",
      moduleid: "", teacheraccountid: "", zoomlink: "https://zoom.example.test/hifz"
    }],
    draftPublishStartDate: "2026-09-01",
    draftPublishEndDate: "2026-09-01",
    active: true
  });
  assert.equal(restored.response.status, 200, JSON.stringify(restored.data));

  const delivery = await post("/api/admin/platform/global/delivery/get", {});
  assert.equal(delivery.response.status, 200, JSON.stringify(delivery.data));
  const hifz = delivery.data.runs.find(run => run.runid === "GSRUN-HIFZ");
  assert.equal(hifz.draftpublishstartdate, "2026-09-01");
  assert.equal(hifz.draftpublishenddate, "2026-09-01");
  assert.equal(hifz.schedulemode, "DERIVED");

  const mismatch = await post("/api/admin/platform/global/timetable/publish", {
    runId: "GSRUN-HIFZ", publishStartDate: "2026-09-01", publishEndDate: "2026-09-02"
  });
  assert.equal(mismatch.response.status, 409);
  assert.match(mismatch.data.error, /Save the ONGOING Course publication window/);

  const published = await post("/api/admin/platform/global/timetable/publish", { runId: "GSRUN-HIFZ" });
  assert.equal(published.response.status, 200, JSON.stringify(published.data));
  assert.equal(published.data.publication.publishstartdate, "2026-09-01");
  assert.equal(published.data.publication.publishenddate, "2026-09-01");
  assert.equal(published.data.publication.sessioncount, 1, "Tuesday 1 Sep must derive exactly one Hifz occurrence from the saved Mon-Thu rule");

  const parsed = parsedTables();
  const resolved = resolveCurrentPublishedGlobalTimetable(parsed, "GSRUN-HIFZ");
  assert.equal(resolved.ok, true, JSON.stringify(resolved));
  assert.deepEqual(resolved.sessions.map(item => item.sessiondate), ["2026-09-01"]);
  assert.equal(resolved.sessions[0].starttime, "04:00");
  assert.equal(resolved.sessions[0].endtime, "05:00");
  assert.equal(resolved.sessions[0].derived, true);

  const publishedState = tables.GlobalTimetableRunState.slice(1).find(row => row[stateHeader.indexOf("RunID")] === "GSRUN-HIFZ");
  assert.equal(publishedState[stateHeader.indexOf("Stage")], "PUBLISHED");
  assert.equal(publishedState[stateHeader.indexOf("DraftPublishStartDate")], "2026-09-01", "Publishing must retain the authoritative saved draft window");
  assert.equal(publishedState[stateHeader.indexOf("DraftPublishEndDate")], "2026-09-01");
} finally {
  globalThis.fetch = originalFetch;
}

console.log("V104.5.3 ONGOING DERIVED draft-window persistence and one-day Hifz publication regression passed.");

async function post(path, body) {
  const responseValue = await worker.fetch(new Request(`https://worker.test${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body)
  }), env);
  return { response: responseValue, data: await responseValue.json() };
}

function parsedTables() {
  return Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, validatePlatformSheetRows(name, rows)]));
}

function applyWrite(write) {
  const whole = /^'([^']+)'!A1:[A-Z]+(\d+)$/.exec(write.range);
  if (whole) {
    tables[whole[1]] = write.values.map(row => [...row]);
    return;
  }
  const single = /^'([^']+)'!A(\d+):[A-Z]+\2$/.exec(write.range);
  if (single) {
    const sheet = single[1];
    const rowNo = Number(single[2]);
    while (tables[sheet].length < rowNo) tables[sheet].push([]);
    tables[sheet][rowNo - 1] = [...write.values[0]];
    return;
  }
  const multi = /^'([^']+)'!A(\d+):[A-Z]+(\d+)$/.exec(write.range);
  if (multi) {
    const sheet = multi[1];
    const start = Number(multi[2]);
    write.values.forEach((row, index) => {
      while (tables[sheet].length < start + index) tables[sheet].push([]);
      tables[sheet][start + index - 1] = [...row];
    });
    return;
  }
  const config = /^'PlatformConfig'!B(\d+):E\1$/.exec(write.range);
  if (config) {
    const rowNo = Number(config[1]);
    const row = tables.PlatformConfig[rowNo - 1] || [];
    write.values[0].forEach((value, index) => { row[index + 1] = value; });
    tables.PlatformConfig[rowNo - 1] = row;
    return;
  }
  throw new Error(`Unhandled V104.5.3 write: ${write.range}`);
}

function toPem(bytes, label) {
  const base64 = Buffer.from(bytes).toString("base64");
  return `-----BEGIN ${label}-----\n${base64.match(/.{1,64}/g).join("\n")}\n-----END ${label}-----\n`;
}

function response(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
