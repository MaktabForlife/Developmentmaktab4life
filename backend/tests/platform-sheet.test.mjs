import assert from "node:assert/strict";
import {
  AUTHORITY_ORDER,
  isGlobalAdminAccount,
  PLATFORM_SHEET_HEADERS,
  validatePlatformSheetRows
} from "../src/lib/platform-schema.js";
import {
  assertActiveCourseRoleMembership,
  assertActiveGlobalSubjectAccess,
  assertCourseContextAccess,
  getPlatformSpreadsheetId,
  readPlatformSheet,
  resolveActiveCourseRegistration,
  selectAutomaticAccountContext,
  selectAutomaticCourseContext
} from "../src/lib/platform-sheet.js";

assert.deepEqual(AUTHORITY_ORDER, ["GLOBAL_ADMIN", "ADMIN", "SENIOR", "TEACHER", "STUDENT"]);
assert.equal(Object.keys(PLATFORM_SHEET_HEADERS).length, 19);
assert.deepEqual(Object.keys(PLATFORM_SHEET_HEADERS), [
  "CourseRegistry",
  "UserAccounts",
  "UserCourseAccess",
  "UserGlobalSubjectAccess",
  "GlobalSubjectAccessMatrix",
  "GlobalSubjectAccessPolicy",
  "GlobalSubjectRuns",
  "GlobalTimetableSessions",
  "GlobalTimetableRunState",
  "GlobalTimetablePublications",
  "GlobalTimetableSessionLifecycle",
  "PublishedGlobalTimetableSessions",
  "AcademyCalendar",
  "GlobalSubjectList",
  "GlobalModuleList",
  "GlobalTaskList",
  "GlobalResources",
  "PlatformConfig",
  "PlatformAuditLog"
]);
assert.equal(PLATFORM_SHEET_HEADERS.UserAccounts.at(-1), "PlatformRole");
assert.equal(PLATFORM_SHEET_HEADERS.UserAccounts.length, 14);
assert.equal(PLATFORM_SHEET_HEADERS.UserCourseAccess.at(-1), "CourseRecordID");
assert.equal(PLATFORM_SHEET_HEADERS.UserCourseAccess.length, 14);
assert.equal(PLATFORM_SHEET_HEADERS.UserGlobalSubjectAccess[0], "SubjectAccessID");
assert.equal(PLATFORM_SHEET_HEADERS.UserGlobalSubjectAccess.length, 10);
assert.equal(PLATFORM_SHEET_HEADERS.GlobalSubjectAccessMatrix[0], "AccountID");
const matrixRecords = validatePlatformSheetRows("GlobalSubjectAccessMatrix", [
  ["AccountID", "GSUBJ1", "GSUBJ2"],
  ["ACCOUNT1", true, false]
]);
assert.equal(matrixRecords[0].AccountID, "ACCOUNT1");
assert.equal(matrixRecords[0]._subjectAccess.GSUBJ1, true);
assert.equal(matrixRecords[0]._subjectAccess.GSUBJ2, false);
assert.deepEqual(matrixRecords._subjectColumns.map(column => column.subjectId), ["GSUBJ1", "GSUBJ2"]);
assert.deepEqual(PLATFORM_SHEET_HEADERS.GlobalSubjectAccessPolicy, [
  "SubjectPolicyID", "SubjectID", "AccessModel", "Active", "CreatedDate",
  "CreatedByAccountID", "CreatedByAccountName", "ModifiedByAccountID", "ModifiedByAccountName", "ModifiedDate"
]);
assert.equal(PLATFORM_SHEET_HEADERS.GlobalSubjectRuns.length, 13);
assert.equal(PLATFORM_SHEET_HEADERS.GlobalTimetableSessions.length, 16);
assert.equal(PLATFORM_SHEET_HEADERS.GlobalTimetableRunState.length, 9);
assert.equal(PLATFORM_SHEET_HEADERS.GlobalTimetablePublications.length, 8);
assert.deepEqual(PLATFORM_SHEET_HEADERS.GlobalTimetableSessionLifecycle, [
  "SessionLifecycleID", "SessionID", "PublicationID", "Status",
  "RescheduledFromSessionID", "RescheduledToSessionID",
  "CreatedDate", "CreatedByAccountID", "CreatedByAccountName",
  "ModifiedByAccountID", "ModifiedByAccountName", "ModifiedDate"
]);
assert.equal(PLATFORM_SHEET_HEADERS.PublishedGlobalTimetableSessions.length, 19);
assert.deepEqual(PLATFORM_SHEET_HEADERS.AcademyCalendar, [
  "CalendarEventID", "EventType", "Description", "StartDate", "EndDate", "AlternateDate",
  "TeachingImpact", "Active", "CreatedDate", "CreatedByAccountID", "CreatedByAccountName",
  "ModifiedByAccountID", "ModifiedByAccountName", "ModifiedDate"
]);
assert.equal(PLATFORM_SHEET_HEADERS.GlobalResources.at(-1), "ModifiedDate");
assert.equal(PLATFORM_SHEET_HEADERS.GlobalResources.length, 16);

const courseHeaders = PLATFORM_SHEET_HEADERS.CourseRegistry;
const courseRows = [
  courseHeaders,
  [
    "COURSE1",
    "Reboot Your Maktab",
    "reboot-course-sheet",
    true,
    "101.4.3",
    "2026-08-15T10:00:00.000Z",
    "ACCOUNT1",
    "MI Hajira",
    "",
    "",
    ""
  ]
];
assert.deepEqual(validatePlatformSheetRows("CourseRegistry", courseRows)[0], {
  _rowNumber: 2,
  CourseID: "COURSE1",
  CourseName: "Reboot Your Maktab",
  SpreadsheetID: "reboot-course-sheet",
  Active: true,
  SchemaVersion: "101.4.3",
  CreatedDate: "2026-08-15T10:00:00.000Z",
  CreatedByAccountID: "ACCOUNT1",
  CreatedByAccountName: "MI Hajira",
  ModifiedByAccountID: "",
  ModifiedByAccountName: "",
  ModifiedDate: ""
});

await assert.rejects(
  async () => validatePlatformSheetRows("CourseRegistry", [["CourseId", ...courseHeaders.slice(1)]]),
  /CourseRegistry header A1 must be CourseID; found CourseId/
);
await assert.rejects(
  async () => validatePlatformSheetRows("UnknownTab", [["Header"]]),
  /Unknown Platform Sheet tab/
);
await assert.rejects(
  async () => validatePlatformSheetRows("CourseRegistry", [[...courseHeaders, "Unexpected"]]),
  /unexpected header in L1/
);
assert.throws(
  () => getPlatformSpreadsheetId({}),
  /Missing PLATFORM_SPREADSHEET_ID/
);

const globalAdminAccount = {
  AccountID: "ACCOUNT-GLOBAL",
  Active: true,
  PlatformRole: "GLOBAL_ADMIN"
};
assert.equal(isGlobalAdminAccount(globalAdminAccount), true);
assert.equal(isGlobalAdminAccount({ ...globalAdminAccount, Active: false }), false);
assert.deepEqual(selectAutomaticAccountContext(globalAdminAccount, []), {
  accessId: "",
  accountId: "ACCOUNT-GLOBAL",
  courseId: "",
  courseRecordId: "",
  role: "GLOBAL_ADMIN",
  scope: "PLATFORM"
});
assert.deepEqual(
  assertCourseContextAccess(globalAdminAccount, [], "ACCOUNT-GLOBAL", "COURSE9", "GLOBAL_ADMIN"),
  {
    accessId: "",
    accountId: "ACCOUNT-GLOBAL",
    courseId: "COURSE9",
    courseRecordId: "",
    role: "GLOBAL_ADMIN",
    scope: "COURSE"
  }
);
assert.throws(
  () => assertCourseContextAccess(
    { AccountID: "ACCOUNT1", Active: true, PlatformRole: "" },
    [],
    "ACCOUNT1",
    "COURSE1",
    "ADMIN"
  ),
  /did not resolve exactly once/
);

const defaultContext = selectAutomaticCourseContext([
  access("ACCESS1", "ACCOUNT1", "COURSE1", "STUDENT", true, ""),
  access("ACCESS2", "ACCOUNT1", "COURSE2", "ADMIN", false, ""),
  access("ACCESS3", "ACCOUNT1", "COURSE3", "ADMIN", true, "")
]);
assert.deepEqual(defaultContext, {
  accessId: "ACCESS3",
  accountId: "ACCOUNT1",
  courseId: "COURSE3",
  courseRecordId: "ADMIN-COURSE3",
  role: "ADMIN"
});

const lastUsedContext = selectAutomaticCourseContext([
  access("ACCESS2", "ACCOUNT1", "COURSE2", "ADMIN", true, "2026-08-13T12:00:00.000Z"),
  access("ACCESS3", "ACCOUNT1", "COURSE3", "ADMIN", false, "2026-08-14T12:00:00.000Z"),
  access("ACCESS4", "ACCOUNT1", "COURSE4", "TEACHER", false, "2026-08-15T12:00:00.000Z")
]);
assert.equal(lastUsedContext.courseId, "COURSE3");
assert.equal(lastUsedContext.role, "ADMIN");

assert.throws(
  () => selectAutomaticCourseContext([
    access("ACCESS2", "ACCOUNT1", "COURSE2", "ADMIN", false, ""),
    access("ACCESS3", "ACCOUNT1", "COURSE3", "ADMIN", false, "")
  ]),
  /requires exactly one default context/
);
assert.throws(
  () => selectAutomaticCourseContext([]),
  /no active course access/
);

const membership = assertActiveCourseRoleMembership([
  access("ACCESS1", "ACCOUNT1", "COURSE1", "STUDENT", true, ""),
  access("ACCESS2", "ACCOUNT1", "COURSE2", "ADMIN", true, "")
], "account1", "course2", "admin");
assert.equal(membership.accessId, "ACCESS2");
const subjectAccess = assertActiveGlobalSubjectAccess([
  {
    SubjectAccessID: "GSACCESS1",
    AccountID: "ACCOUNT1",
    SubjectID: "GSUBJ1",
    Active: true
  }
], "account1", "gsubj1");
assert.deepEqual(subjectAccess, {
  subjectAccessId: "GSACCESS1",
  accountId: "ACCOUNT1",
  subjectId: "GSUBJ1"
});
assert.throws(
  () => assertActiveGlobalSubjectAccess([], "ACCOUNT1", "GSUBJ1"),
  /did not resolve exactly once/
);
assert.deepEqual(
  selectAutomaticAccountContext(
    { AccountID: "ACCOUNT1", Active: true, PlatformRole: "" },
    [access("ACCESS2", "ACCOUNT1", "COURSE2", "ADMIN", true, "")]
  ),
  {
    accessId: "ACCESS2",
    accountId: "ACCOUNT1",
    courseId: "COURSE2",
    courseRecordId: "ADMIN-COURSE2",
    role: "ADMIN",
    scope: "COURSE"
  }
);
assert.throws(
  () => assertActiveCourseRoleMembership([
    access("ACCESS1", "ACCOUNT1", "COURSE1", "STUDENT", true, "")
  ], "ACCOUNT1", "COURSE1", "ADMIN"),
  /did not resolve exactly once/
);

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
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "platform-sheet-test@example.iam.gserviceaccount.com",
    private_key_id: "platform-test-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"),
    token_uri: "https://oauth2.googleapis.com/token"
  })
};
const calls = [];
let sheetsValues = courseRows;
const originalFetch = globalThis.fetch;

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  calls.push({ url, init });
  if (url.hostname === "oauth2.googleapis.com") {
    return response({ access_token: "platform-token", expires_in: 3600 });
  }
  if (url.hostname === "sheets.googleapis.com") {
    return response({ values: sheetsValues });
  }
  throw new Error(`Unexpected fetch: ${url}`);
};

try {
  const rows = await readPlatformSheet(env, "CourseRegistry");
  assert.equal(rows.length, 1);
  const registration = await resolveActiveCourseRegistration(env, "course1");
  assert.deepEqual(registration, {
    courseId: "COURSE1",
    courseName: "Reboot Your Maktab",
    spreadsheetId: "reboot-course-sheet",
    schemaVersion: "101.4.3"
  });

  sheetsValues = [
    courseHeaders,
    ["COURSE1", "Reboot Your Maktab", "reboot-course-sheet/", true, "101.4.3"]
  ];
  await assert.rejects(
    () => resolveActiveCourseRegistration(env, "COURSE1"),
    /SpreadsheetID has an invalid format/
  );
  sheetsValues = courseRows;

  const sheetsCalls = calls.filter(call => call.url.hostname === "sheets.googleapis.com");
  assert.equal(sheetsCalls.length, 3);
  sheetsCalls.forEach(call => {
    assert.equal(
      call.url.pathname.startsWith("/v4/spreadsheets/central-platform-sheet/values/"),
      true,
      "Platform reads must never fall back to GOOGLE_SPREADSHEET_ID"
    );
  });
  assert.equal(sheetsCalls[0].url.pathname.endsWith("/values/'CourseRegistry'!A%3AK"), true);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Platform Sheet schema, context selection and routing tests passed.");

function access(accessId, accountId, courseId, role, isDefault, lastUsedDate) {
  return {
    AccessID: accessId,
    AccountID: accountId,
    CourseID: courseId,
    Role: role,
    Active: true,
    IsDefault: isDefault,
    LastUsedDate: lastUsedDate,
    CourseRecordID: `${role === "STUDENT" ? "STUDENT" : "ADMIN"}-${courseId}`
  };
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
