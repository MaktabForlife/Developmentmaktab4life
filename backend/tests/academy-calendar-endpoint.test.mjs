import assert from "node:assert/strict";
import { createSaltedPinHash, createSessionToken } from "../src/lib/auth.js";
import { PLATFORM_SHEET_HEADERS } from "../src/lib/platform-schema.js";
import worker from "../src/worker.js";

const pinSecret = "calendar-pin-secret";
const sessionSecret = "calendar-session-secret";
const credentialHash = await createSaltedPinHash("2468", pinSecret);
const tables = Object.fromEntries(Object.entries(PLATFORM_SHEET_HEADERS).map(([name, headers]) => [name, [headers]]));

tables.UserAccounts.push([
  "ACCOUNT1", "Global Admin", "CAL-LINK", true, credentialHash, true, "", "2026-08-29T00:00:00.000Z",
  "", "", "", "", "", "GLOBAL_ADMIN"
]);
tables.PlatformConfig.push(["PlatformSchemaVersion", "102.0.8"]);
tables.AcademyCalendar.push([
  "ACEVT-TARAWEEH", "ISLAMIC_DAY", "First Taraweeh", "2026-02-18", "2026-02-18", "2026-02-19", "INFORMATION", true,
  "", "", "", "", "", ""
]);
tables.AcademyCalendar.push([
  "ACEVT-FAST", "ISLAMIC_DAY", "First Fast", "2026-02-19", "2026-02-19", "2026-02-20", "INFORMATION", true,
  "", "", "", "", "", ""
]);
tables.AcademyCalendar.push([
  "ACEVT-FITR", "ISLAMIC_DAY", "Eid-ul-Fitr", "2026-03-21", "2026-03-21", "2026-03-20", "INFORMATION", true,
  "", "", "", "", "", ""
]);

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
  PLATFORM_SPREADSHEET_ID: "academy-calendar-sheet",
  GOOGLE_SPREADSHEET_ID: "legacy-sheet",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "calendar-test@example.iam.gserviceaccount.com",
    private_key_id: "calendar-test-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"),
    token_uri: "https://oauth2.googleapis.com/token"
  }),
  DEBUG_ERRORS: "true"
};
const token = await createSessionToken({
  type: "account",
  accountid: "ACCOUNT1",
  uniqueid: "CAL-LINK",
  username: "Global Admin",
  role: "GLOBAL_ADMIN",
  scope: "PLATFORM",
  authrow: 2,
  credentialHash
}, env);

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  if (url.hostname === "oauth2.googleapis.com") return response({ access_token: "calendar-google-token", expires_in: 3600 });
  if (url.hostname !== "sheets.googleapis.com") throw new Error(`Unexpected Academy Calendar fetch: ${url}`);
  assert.match(url.pathname, /spreadsheets\/academy-calendar-sheet/);

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
  throw new Error(`Unexpected Academy Calendar range: ${range}`);
};

try {
  const unauthorised = await post("/api/admin/platform/calendar/get", { year: 2026 }, "");
  assert.equal(unauthorised.response.status, 401);

  const initial = await post("/api/admin/platform/calendar/get", { year: 2026 }, token);
  assert.equal(initial.response.status, 200, JSON.stringify(initial.data));
  assert.equal(initial.data.version, "102.12.5");
  assert.equal(initial.data.year, 2026);
  assert.equal(initial.data.events.some(event => event.eventType === "PUBLIC_HOLIDAY" && event.startDate === "2026-08-09" && event.description === "Public Holiday"), true);
  assert.equal(initial.data.events.some(event => event.eventType === "PUBLIC_HOLIDAY" && event.startDate === "2026-08-10" && event.description === "Public Holiday"), true);
  assert.equal(initial.data.events.some(event => event.eventType === "RELIGIOUS_PERIOD" && event.description === "Ramadaan" && event.startDate === "2026-02-19" && event.endDate === "2026-03-20"), true);
  assert.equal(initial.data.events.some(event => event.description === "First Fast"), false, "First Fast is suppressed from Academy Calendar delivery");
  assert.equal(initial.data.storedEvents.some(event => event.description === "First Fast"), false, "First Fast is suppressed from Admin Calendar list");
  assert.equal(initial.data.storedEvents.find(event => event.id === "ACEVT-TARAWEEH")?.islamicDate, "1 Ramadaan 1447");

  const renamedGeneratedHoliday = await post("/api/admin/platform/calendar/save", {
    eventId: "SA-PUBLIC-HOLIDAY-2026-09-24",
    eventType: "PUBLIC_HOLIDAY",
    description: "Heritage Weekend",
    startDate: "2026-09-24",
    active: true
  }, token);
  assert.equal(renamedGeneratedHoliday.response.status, 200, JSON.stringify(renamedGeneratedHoliday.data));
  const afterRename = await post("/api/admin/platform/calendar/get", { year: 2026 }, token);
  assert.equal(afterRename.data.events.some(event => event.eventType === "PUBLIC_HOLIDAY" && event.startDate === "2026-09-24" && event.description === "Heritage Weekend"), true, "Generated South African holidays must allow an editable description");

  const created = await post("/api/admin/platform/calendar/save", {
    eventType: "TERM",
    description: "Term 3",
    startDate: "2026-07-20",
    endDate: "2026-09-25",
    teachingImpact: "INFORMATION",
    active: true
  }, token);
  assert.equal(created.response.status, 200, JSON.stringify(created.data));
  assert.match(created.data.event.id, /^ACEVT-/);
  assert.equal(created.data.event.eventType, "TERM");
  assert.equal(tables.AcademyCalendar.at(-1)[2], "Term 3");
  assert.equal(tables.PlatformAuditLog.at(-1)[6], "CREATE_ACADEMY_CALENDAR_EVENT");

  const updatedIslamic = await post("/api/admin/platform/calendar/save", {
    eventId: "ACEVT-TARAWEEH",
    startDate: "2026-02-19",
    alternateDate: "2026-02-18",
    teachingImpact: "NO_TEACHING",
    active: true
  }, token);
  assert.equal(updatedIslamic.response.status, 200, JSON.stringify(updatedIslamic.data));
  assert.equal(updatedIslamic.data.event.description, "First Taraweeh");
  assert.equal(updatedIslamic.data.event.startDate, "2026-02-19");
  assert.equal(updatedIslamic.data.event.alternateDate, "", "Alternate Islamic dates are no longer exposed");
  assert.equal(updatedIslamic.data.event.teachingImpact, "INFORMATION", "Islamic dates are informational only");
  assert.equal(tables.PlatformAuditLog.at(-1)[6], "UPDATE_ACADEMY_CALENDAR_EVENT");

  const movedPublic = await post("/api/admin/platform/calendar/save", {
    eventId: "SA-PUBLIC-HOLIDAY-2026-08-09",
    eventType: "PUBLIC_HOLIDAY",
    originalDate: "2026-08-09",
    description: "Academy Holiday",
    startDate: "2026-08-11",
    active: true
  }, token);
  assert.equal(movedPublic.response.status, 200, JSON.stringify(movedPublic.data));
  assert.equal(tables.PlatformAuditLog.at(-1)[6], "MOVE_ACADEMY_PUBLIC_HOLIDAY");

  const afterMove = await post("/api/admin/platform/calendar/get", { year: 2026 }, token);
  assert.equal(afterMove.data.events.some(event => event.eventType === "PUBLIC_HOLIDAY" && event.startDate === "2026-08-09"), false);
  assert.equal(afterMove.data.events.some(event => event.eventType === "PUBLIC_HOLIDAY" && event.startDate === "2026-08-11" && event.description === "Academy Holiday"), true);

  const deletedObserved = await post("/api/admin/platform/calendar/save", {
    eventId: "SA-PUBLIC-HOLIDAY-2026-08-10",
    eventType: "PUBLIC_HOLIDAY",
    startDate: "2026-08-10",
    active: false
  }, token);
  assert.equal(deletedObserved.response.status, 200, JSON.stringify(deletedObserved.data));
  assert.equal(tables.PlatformAuditLog.at(-1)[6], "DELETE_ACADEMY_PUBLIC_HOLIDAY");

  const addedPublic = await post("/api/admin/platform/calendar/save", {
    eventType: "PUBLIC_HOLIDAY",
    description: "Mid-term Break",
    startDate: "2026-08-12",
    active: true
  }, token);
  assert.equal(addedPublic.response.status, 200, JSON.stringify(addedPublic.data));
  assert.equal(addedPublic.data.event.eventType, "PUBLIC_HOLIDAY");
  assert.equal(addedPublic.data.event.startDate, "2026-08-12");
  assert.equal(addedPublic.data.event.description, "Mid-term Break");
  assert.equal(tables.PlatformAuditLog.at(-1)[6], "CREATE_ACADEMY_PUBLIC_HOLIDAY");

  const finalCalendar = await post("/api/admin/platform/calendar/get", { year: 2026 }, token);
  assert.equal(finalCalendar.data.events.some(event => event.eventType === "PUBLIC_HOLIDAY" && event.startDate === "2026-08-10"), false);
  assert.equal(finalCalendar.data.events.some(event => event.eventType === "PUBLIC_HOLIDAY" && event.startDate === "2026-08-12" && event.description === "Mid-term Break"), true);

  const blockedNewIslamic = await post("/api/admin/platform/calendar/save", {
    eventType: "ISLAMIC_DAY",
    description: "First Taraweeh",
    startDate: "2031-01-01",
    alternateDate: "2030-12-31",
    active: true
  }, token);
  assert.equal(blockedNewIslamic.response.status, 400);
  assert.match(blockedNewIslamic.data.error, /Terms or Public Holidays/);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("V102.12.5 Academic Calendar informational Islamic dates and editable Holiday description tests passed.");

async function post(path, body, bearer) {
  const responseValue = await worker.fetch(new Request(`https://worker.test${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
    body: JSON.stringify(body)
  }), env);
  return { response: responseValue, data: await responseValue.json() };
}

function applyWrite(write) {
  const fullRow = /^'([^']+)'!A(\d+):[A-Z]+\2$/.exec(write.range);
  if (!fullRow) throw new Error(`Unexpected Academy Calendar write: ${write.range}`);
  const sheetName = fullRow[1];
  const rowNumber = Number(fullRow[2]);
  tables[sheetName][rowNumber - 1] = [...write.values[0]];
}

function toPem(bytes, label) {
  const base64 = Buffer.from(bytes).toString("base64");
  const lines = base64.match(/.{1,64}/g).join("\n");
  return `-----BEGIN ${label}-----\n${lines}\n-----END ${label}-----\n`;
}
function response(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}
