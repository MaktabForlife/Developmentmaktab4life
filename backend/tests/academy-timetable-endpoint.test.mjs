import assert from "node:assert/strict";
import { createSaltedPinHash, createSessionToken } from "../src/lib/auth.js";
import { PLATFORM_SHEET_HEADERS } from "../src/lib/platform-schema.js";
import { PUBLISHED_TIMETABLE_SESSION_HEADERS, TIMETABLE_PUBLICATION_HEADERS, TIMETABLE_STATE_HEADERS } from "../src/lib/timetable-publication.js";
import worker from "../src/worker.js";
import { assertSheetsReadBudget, createSheetsReadMetrics } from "./helpers/sheets-read-metrics.mjs";

const pinSecret = "academy-pin-secret";
const sessionSecret = "academy-session-secret";
const accountHash = await createSaltedPinHash("1234", pinSecret);
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
  PLATFORM_SPREADSHEET_ID: "platform-sheet",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "academy-test@example.iam.gserviceaccount.com",
    private_key_id: "academy-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"),
    token_uri: "https://oauth2.googleapis.com/token"
  }),
  M4L_REQUIRE_CREDENTIAL_BOUND_SESSIONS: "true"
};

const tables = {
  platform: {
    UserAccounts: [
      PLATFORM_SHEET_HEADERS.UserAccounts,
      ["ACCOUNT1", "Global Admin", "ACADEMY-LINK", true, accountHash, true, "", "", "", "", "", "", "", "GLOBAL_ADMIN"],
      ["ACCOUNT2", "Student Two", "STUDENT-LINK", true, accountHash, true, "", "", "", "", "", "", "", ""]
    ],
    PlatformConfig: [
      PLATFORM_SHEET_HEADERS.PlatformConfig,
      ["PlatformSchemaVersion", "102.0.8", "", "", ""],
      ["PlatformTimezone", "Africa/Johannesburg", "", "", ""],
      ["GlobalCurriculumVersion", "25", "", "", ""],
      ["GlobalTimetableVersion", "2", "", "", ""]
    ],
    CourseRegistry: [
      PLATFORM_SHEET_HEADERS.CourseRegistry,
      ["COURSE1", "Reboot Your Maktab", "course-sheet-one", true, "101.4.3", "", "", "", "", "", ""]
    ],
    UserCourseAccess: [
      PLATFORM_SHEET_HEADERS.UserCourseAccess,
      ["ACCESS2", "ACCOUNT2", "COURSE1", "STUDENT", true, true, "", "", "", "", "", "", "", "STUD1"]
    ],
    GlobalSubjectList: [
      PLATFORM_SHEET_HEADERS.GlobalSubjectList,
      ["GSUBJ1", "Steps to My Rabb", true, "", "", "", "", "", "", ""],
      ["GSUBJ2", "Mothers of the Ummah", true, "", "", "", "", "", "", ""]
    ],
    GlobalSubjectAccessPolicy: [
      PLATFORM_SHEET_HEADERS.GlobalSubjectAccessPolicy,
      ["GSPOL1", "GSUBJ1", "FREE", true, "", "", "", "", "", ""],
      ["GSPOL2", "GSUBJ2", "PAID", true, "", "", "", "", "", ""]
    ],
    GlobalSubjectAccessMatrix: [
      ["AccountID", "GSUBJ1", "GSUBJ2"],
      ["ACCOUNT1", false, false]
    ],
    GlobalSubjectRuns: [
      PLATFORM_SHEET_HEADERS.GlobalSubjectRuns,
      ["GSRUN1", "GSUBJ1", "Steps to My Rabb Term 3", "2026-08-01", "2026-11-30", "Africa/Johannesburg", true, "", "", "", "", "", ""],
      ["GSRUN2", "GSUBJ2", "Mothers of the Ummah 2026", "2026-08-01", "2026-11-30", "Africa/Johannesburg", true, "", "", "", "", "", ""]
    ],
    GlobalTimetableRunState: [
      PLATFORM_SHEET_HEADERS.GlobalTimetableRunState,
      ["GSRUN1", "PUBLISHED", "GTPUB1", "", "", "", "", "", ""],
      ["GSRUN2", "PUBLISHED", "GTPUB2", "", "", "", "", "", ""]
    ],
    GlobalTimetablePublications: [
      PLATFORM_SHEET_HEADERS.GlobalTimetablePublications,
      ["GTPUB1", "GSRUN1", "GSUBJ1", 1, "2026-08-01T00:00:00Z", "ACCOUNT1", "Global Admin", 1],
      ["GTPUB2", "GSRUN2", "GSUBJ2", 1, "2026-08-01T00:00:00Z", "ACCOUNT1", "Global Admin", 1]
    ],
    GlobalTimetableSessionLifecycle: [
      PLATFORM_SHEET_HEADERS.GlobalTimetableSessionLifecycle,
      ["GSLIFE1", "GTSES1", "GTPUB1", "SCHEDULED", "", "", "", "", "", "", "", ""],
      ["GSLIFE2", "GTSES2", "GTPUB2", "SCHEDULED", "", "", "", "", "", "", "", ""]
    ],
    AcademyCalendar: [PLATFORM_SHEET_HEADERS.AcademyCalendar],
    PublishedGlobalTimetableSessions: [
      PLATFORM_SHEET_HEADERS.PublishedGlobalTimetableSessions,
      ["GTPS1", "GTPUB1", "GTSES1", "GSRUN1", "GSUBJ1", "GMOD1", "2026-08-27", "20:00", "21:00", "ACCOUNT1", "https://zoom.test/global", "2026-08-01T00:00:00Z", "ACCOUNT1", "Global Admin", "Steps to My Rabb Term 3", "Steps to My Rabb", "Hearts Connected", "Global Admin", "Africa/Johannesburg"],
      ["GTPS2", "GTPUB2", "GTSES2", "GSRUN2", "GSUBJ2", "", "2026-08-27", "9:30", "10:30", "ACCOUNT1", "", "2026-08-01T00:00:00Z", "ACCOUNT1", "Global Admin", "Mothers of the Ummah 2026", "Mothers of the Ummah", "", "Global Admin", "Africa/Johannesburg"]
    ]
  },
  course: {
    SystemConfig: [
      ["ConfigKey", "ConfigValue", "ModifiedDate", "ModifiedByAdminID", "ModifiedByAdminName"],
      ["TimetableLiveSource", "PUBLISHED_TIMETABLE", "", "", ""],
      ["GlobalZoomLink", "https://zoom.test/program-default", "", "", ""]
    ],
    TimetableCourseState: [
      TIMETABLE_STATE_HEADERS,
      ["COURSE1", "PUBLISHED", "TTPUB1", "", "", "", "", "", ""]
    ],
    TimetablePublications: [
      TIMETABLE_PUBLICATION_HEADERS,
      ["TTPUB1", "COURSE1", 1, "2026-08-01T00:00:00Z", "ADMIN1", "Admin", 1]
    ],
    PublishedTimetableSessions: [
      PUBLISHED_TIMETABLE_SESSION_HEADERS,
      ["TTPS1", "TTPUB1", "TTSES1", "COURSE1", "TS1", "Thu", "SUB1", "MOD1", "ALL", "ADMIN1", "", "2026-08-01T00:00:00Z", "ADMIN1", "Admin", "Reboot Your Maktab", "09:00", "10:00", "Fiqh", "Purification", "Muallimah One"]
    ],
    StudentRecords: [
      ["StudentID", "Username", "WhatsApp", "UniqueID", "PIN", "CreatedDate", "ClassGroup", "RegisteredBy", "PINSetup", "ModifiedDate", "Active"],
      ["STUD1", "Student Two", "", "STUDENT-LINK", "", "", "1", "", "", "", true]
    ]
  }
};

const token = await createSessionToken({
  type: "account",
  accountid: "ACCOUNT1",
  uniqueid: "ACADEMY-LINK",
  username: "Global Admin",
  role: "GLOBAL_ADMIN",
  scope: "PLATFORM",
  courseid: "",
  courserecordid: "",
  accessid: "",
  credentialHash: accountHash,
  authrow: 2
}, env);

const studentToken = await createSessionToken({
  type: "account",
  accountid: "ACCOUNT2",
  uniqueid: "STUDENT-LINK",
  username: "Student Two",
  role: "STUDENT",
  scope: "COURSE",
  courseid: "COURSE1",
  courserecordid: "STUD1",
  accessid: "ACCESS2",
  accessrow: 2,
  credentialHash: accountHash,
  authrow: 3
}, env);

const originalFetch = globalThis.fetch;
const sheetsRequests = [];
const sheetsReadMetrics = createSheetsReadMetrics();
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  if (url.hostname === "oauth2.googleapis.com") {
    return response({ access_token: "academy-oauth", expires_in: 3600 });
  }
  if (url.hostname !== "sheets.googleapis.com") throw new Error(`Unexpected fetch ${url}`);
  sheetsReadMetrics.record(url, init);
  sheetsRequests.push(url);
  assert.equal(init.headers.Authorization, "Bearer academy-oauth");
  const spreadsheet = /spreadsheets\/([^/]+)/.exec(url.pathname)?.[1] || "";
  if (url.pathname.endsWith("/values:batchGet")) {
    const ranges = url.searchParams.getAll("ranges");
    return response({
      spreadsheetId: spreadsheet,
      valueRanges: ranges.map(range => ({
        range,
        majorDimension: "ROWS",
        values: lookupRange(spreadsheet, range)
      }))
    });
  }
  const range = decodeURIComponent(url.pathname.split("/values/")[1] || "");
  const rows = lookupRange(spreadsheet, range);
  return response({ range, majorDimension: "ROWS", values: rows });
};

try {
  const firstRequestMetricMark = sheetsReadMetrics.mark();
  const result = await worker.fetch(new Request("https://worker.test/api/academy/timetable", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ startDate: "2026-08-27" })
  }), env);
  const body = await result.json();
  assert.equal(result.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.version, "104.5");
  assert.equal(body.weekStart, "2026-08-24");
  assert.equal(body.viewStart, "2026-08-27");
  assert.equal(body.viewEnd, "2026-08-28");
  assert.equal(body.weekEnd, "2026-08-30");
  assert.equal(body.timezone, "Africa/Johannesburg");
  assert.equal(body.sessions.length, 3);
  const program = body.sessions.find(item => item.kind === "PROGRAM");
  const global = body.sessions.find(item => item.kind === "GLOBAL" && item.title === "Steps to My Rabb");
  const mothers = body.sessions.find(item => item.kind === "GLOBAL" && item.title === "Mothers of the Ummah");
  assert.equal(program.visibilityLevel, "DETAIL");
  assert.equal(program.relevant, false, "Global Admin receives expandable Program detail but not a directly relevant Home session");
  assert.equal(program.title, "Fiqh");
  assert.equal(program.date, "2026-08-27");
  assert.equal(program.canOpenZoom, false, "non-current Program sessions must not expose Zoom on Academy Home");
  assert.equal(program.zoomLink, "");
  assert.equal(mothers.visibilityLevel, "DETAIL");
  assert.equal(mothers.startTime, "09:30", "unpadded Global times must normalize and remain before later evening activity");
  assert.equal(mothers.date, "2026-08-27");
  assert.equal(global.visibilityLevel, "DETAIL");
  assert.equal(global.title, "Steps to My Rabb");
  assert.equal(global.subjectName, "Steps to My Rabb");
  assert.equal(global.moduleName, "Hearts Connected");
  assert.equal(global.teacherName, "Global Admin");
  assert.equal("globalCourseName" in global, false, "Global Course internal/run name must not be delivered to Academy Home");
  assert.equal(global.date, "2026-08-27");
  assert.equal(global.canOpenZoom, false, "non-current Global sessions must not expose Zoom on Academy Home");
  assert.equal(global.zoomLink, "");
  assert.deepEqual(
    body.sessions.map(item => [item.startTime, item.title]),
    [["09:00", "Fiqh"], ["09:30", "Mothers of the Ummah"], ["20:00", "Steps to My Rabb"]],
    "busy days must retain every Program/Global session in chronological order"
  );
  assert.deepEqual(body.sessions.map(item => item.eventKey), ["AE0001", "AE0002", "AE0003"]);

  const firstRequestSheetsCalls = sheetsRequests.slice();
  const firstRequestPlatformCalls = firstRequestSheetsCalls.filter(url => url.pathname.includes("/spreadsheets/platform-sheet/"));
  const firstRequestCourseCalls = firstRequestSheetsCalls.filter(url => url.pathname.includes("/spreadsheets/course-sheet-one/"));
  assert.equal(firstRequestPlatformCalls.length, 2, "Platform-scope Academy Home should use one credential-row read plus one Platform batchGet");
  assert.equal(firstRequestCourseCalls.length, 2, "V104.4 budget should retain one Program profile/config batch plus one live timetable-source batch");
  const platformBatch = firstRequestPlatformCalls.find(url => url.pathname.endsWith("/values:batchGet"));
  assert.ok(platformBatch, "Academy Home must use Platform batchGet");
  assert.equal(platformBatch.searchParams.getAll("ranges").length, 13, "Academy Home Platform state should be fetched in one 13-range batch");
  const courseBatches = firstRequestCourseCalls.filter(url => url.pathname.endsWith("/values:batchGet"));
  assert.equal(courseBatches.length, 2, "Both Program reads should use values:batchGet");
  assert.deepEqual(
    courseBatches[0].searchParams.getAll("ranges"),
    ["SystemConfig!A:E"],
    "Global Admin Program profile/config load should need only SystemConfig"
  );
  assert.deepEqual(
    courseBatches[1].searchParams.getAll("ranges"),
    [
      "TimetableCourseState!A:ZZ",
      "TimetablePublications!A:ZZ",
      "PublishedTimetableSessions!A:ZZ"
    ],
    "Published Program timetable state should be fetched in one batch"
  );
  const firstRequestBudget = assertSheetsReadBudget(sheetsReadMetrics, firstRequestMetricMark, {
    totalRequests: 4,
    batchGets: 3,
    directReads: 1,
    rangeCount: 18,
    spreadsheets: {
      "platform-sheet": 2,
      "course-sheet-one": 2
    }
  }, "Academy timetable one-Program request");

  const sevenDayMetricMark = sheetsReadMetrics.mark();
  const sevenDayResult = await worker.fetch(new Request("https://worker.test/api/academy/timetable", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ startDate: "2026-08-27", days: 7 })
  }), env);
  const sevenDayBody = await sevenDayResult.json();
  assert.equal(sevenDayResult.status, 200);
  assert.equal(sevenDayBody.viewStart, "2026-08-27");
  assert.equal(sevenDayBody.viewEnd, "2026-09-02");
  assert.equal(sevenDayBody.viewDays, 7);
  assert.equal(sevenDayBody.weekStart, "2026-08-24");
  assert.equal(sevenDayBody.weekEnd, "2026-09-06", "rolling seven-day loads may span two timetable weeks");
  const sevenDayBudget = assertSheetsReadBudget(sheetsReadMetrics, sevenDayMetricMark, {
    totalRequests: 4,
    batchGets: 3,
    directReads: 1,
    rangeCount: 18,
    spreadsheets: {
      "platform-sheet": 2,
      "course-sheet-one": 2
    }
  }, "Academy timetable rolling seven-day request");
  assert.deepEqual(sevenDayBudget, firstRequestBudget, "Seven-day loading must not multiply Sheets reads compared with the normal Academy request shape");

  const studentRequestStart = sheetsRequests.length;
  const studentResult = await worker.fetch(new Request("https://worker.test/api/academy/timetable", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({ startDate: "2026-08-27" })
  }), env);
  const studentBody = await studentResult.json();
  assert.equal(studentResult.status, 200);
  const studentProgram = studentBody.sessions.find(item => item.kind === "PROGRAM");
  assert.equal(studentProgram.visibilityLevel, "DETAIL", "matching active local StudentRecords identity may receive Program detail");
  const studentRequestCalls = sheetsRequests.slice(studentRequestStart);
  const studentProgramCalls = studentRequestCalls.filter(url => url.pathname.includes("/spreadsheets/course-sheet-one/"));
  assert.equal(studentProgramCalls.length, 2, "Student Academy loads should also use two Program batch requests");
  assert.deepEqual(
    studentProgramCalls[0].searchParams.getAll("ranges"),
    ["SystemConfig!A:E", "StudentRecords!A:K"],
    "Student Program identity and timetable source config should share one batch"
  );

  tables.course.StudentRecords[1][3] = "DIFFERENT-LINK";
  const staleMembershipResult = await worker.fetch(new Request("https://worker.test/api/academy/timetable", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${studentToken}`
    },
    body: JSON.stringify({ startDate: "2026-08-27" })
  }), env);
  const staleMembershipBody = await staleMembershipResult.json();
  assert.equal(staleMembershipResult.status, 200);
  const staleProgram = staleMembershipBody.sessions.find(item => item.kind === "PROGRAM");
  assert.equal(staleProgram.visibilityLevel, "LABEL", "stale central membership must fail closed when the local Program identity no longer matches");
  assert.equal("subjectName" in staleProgram, false);
  assert.equal("zoomLink" in staleProgram, false);
  tables.course.StudentRecords[1][3] = "STUDENT-LINK";

  tables.course.PublishedTimetableSessions[1][5] = "Mon";
  const sundayWindowResult = await worker.fetch(new Request("https://worker.test/api/academy/timetable", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({ startDate: "2026-08-30" })
  }), env);
  const sundayWindowBody = await sundayWindowResult.json();
  assert.equal(sundayWindowResult.status, 200);
  assert.equal(sundayWindowBody.viewStart, "2026-08-30");
  assert.equal(sundayWindowBody.viewEnd, "2026-08-31");
  assert.ok(
    sundayWindowBody.sessions.some(item => item.kind === "PROGRAM" && item.date === "2026-08-31"),
    "The two-day Academy Home window must carry Monday sessions across a Sunday week boundary"
  );
  tables.course.PublishedTimetableSessions[1][5] = "Thu";
} finally {
  globalThis.fetch = originalFetch;
}

console.log("V104.4 Academy timetable read-budget + rolling timetable integration test passed.");

function lookupRange(spreadsheet, range) {
  if (spreadsheet === "platform-sheet") {
    const rowMatch = /^UserAccounts!A(\d+):N\1$/.exec(range);
    if (rowMatch) {
      const rowNumber = Number(rowMatch[1]);
      return tables.platform.UserAccounts[rowNumber - 1] ? [tables.platform.UserAccounts[rowNumber - 1]] : [];
    }
    const accessMatch = /^UserCourseAccess!A(\d+):N\1$/.exec(range);
    if (accessMatch) {
      const rowNumber = Number(accessMatch[1]);
      return tables.platform.UserCourseAccess[rowNumber - 1] ? [tables.platform.UserCourseAccess[rowNumber - 1]] : [];
    }
    const sheet = range.split("!")[0].replace(/^'|'$/g, "");
    if (tables.platform[sheet]) return tables.platform[sheet];
  }
  if (spreadsheet === "course-sheet-one") {
    const sheet = range.split("!")[0].replace(/^'|'$/g, "");
    if (tables.course[sheet]) return tables.course[sheet];
  }
  throw new Error(`Unhandled Sheets range ${spreadsheet} ${range}`);
}

function response(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

function toPem(bytes, label) {
  const base64 = Buffer.from(bytes).toString("base64");
  const lines = base64.match(/.{1,64}/g) || [];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----`;
}
