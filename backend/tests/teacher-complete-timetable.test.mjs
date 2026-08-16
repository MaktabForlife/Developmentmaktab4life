import assert from "node:assert/strict";
import { createSessionToken } from "../src/lib/auth.js";
import {
  PUBLISHED_TIMETABLE_SESSION_HEADERS,
  TIMETABLE_PUBLICATION_HEADERS,
  TIMETABLE_STATE_HEADERS
} from "../src/lib/timetable-publication.js";
import { getTimetableGoogleSheetsEndpoint } from "../src/routes/timetable.js";

const courseId = "COURSE1";
const publicationId = "PUBLICATION-1";
const stateRows = [
  [...TIMETABLE_STATE_HEADERS],
  [courseId, "PUBLISHED", publicationId, "2026-08-16T00:00:00.000Z", "ADMIN1", "Admin User", "", "", ""]
];
const publicationRows = [
  [...TIMETABLE_PUBLICATION_HEADERS],
  [publicationId, courseId, 1, "2026-08-16T10:00:00.000Z", "ADMIN1", "Admin User", 2]
];
const publishedRows = [
  [...PUBLISHED_TIMETABLE_SESSION_HEADERS],
  ["PSESSION-1", publicationId, "SESSION-1", courseId, "SLOT1", "Mon", "SUB1", "", "1", "TEACH1", "https://zoom.test/one", "2026-08-16T10:00:00.000Z", "ADMIN1", "Admin User", "Reboot Your Maktab", "09:00", "10:00", "Qur'an", "", "Teacher One"],
  ["PSESSION-2", publicationId, "SESSION-2", courseId, "SLOT2", "Tue", "SUB2", "", "2", "TEACH2", "https://zoom.test/two", "2026-08-16T10:00:00.000Z", "ADMIN1", "Admin User", "Reboot Your Maktab", "10:00", "11:00", "Fiqh", "", "Teacher Two"]
];
const systemConfigRows = [
  ["GlobalZoomLink", "https://zoom.test/global", "2026-08-01T00:00:00.000Z", "ADMIN0", "Earlier Admin"],
  ["TimetableLiveSource", "PUBLISHED_TIMETABLE", "2026-08-16T00:00:00.000Z", "ADMIN1", "Admin User"]
];

const keyPair = await crypto.subtle.generateKey({
  name: "RSASSA-PKCS1-v1_5",
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: "SHA-256"
}, true, ["sign", "verify"]);
const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey));
const env = {
  SESSION_SECRET: "teacher-complete-timetable-secret",
  GOOGLE_SPREADSHEET_ID: "course-spreadsheet",
  M4L_AUTHENTICATED_COURSE_ID: courseId,
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "teacher-timetable@example.iam.gserviceaccount.com",
    private_key_id: "teacher-timetable-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"),
    token_uri: "https://oauth2.googleapis.com/token"
  })
};
const teacherToken = await createSessionToken({
  type: "admin",
  adminid: "TEACH2",
  username: "Teacher Two",
  role: "TEACHER"
}, env);

const requestedRanges = [];
const originalFetch = globalThis.fetch;

globalThis.fetch = async input => {
  const url = new URL(String(input));
  if (url.hostname === "oauth2.googleapis.com") {
    return jsonResponse({ access_token: "teacher-timetable-token", expires_in: 3600 });
  }
  if (url.hostname !== "sheets.googleapis.com") {
    throw new Error(`Unexpected fetch ${url}`);
  }
  if (url.pathname.endsWith("/values:batchGet")) {
    const ranges = url.searchParams.getAll("ranges");
    requestedRanges.push(...ranges);
    return jsonResponse({
      valueRanges: ranges.map(range => ({ range, values: valuesForRange(range) }))
    });
  }

  const range = decodeURIComponent(url.pathname.split("/values/")[1] || "");
  requestedRanges.push(range);
  return jsonResponse({ values: valuesForRange(range) });
};

try {
  const response = await getTimetableGoogleSheetsEndpoint(new Request("https://worker.test/api/timetable/get", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${teacherToken}`
    },
    body: JSON.stringify({ teacherId: "TEACH2", groupNo: "2" })
  }), env);
  const data = await response.json();

  assert.equal(response.status, 200);
  assert.deepEqual(data.sessions.map(session => session.sessionid), ["SESSION-1", "SESSION-2"]);
  assert.equal(data.viewerrole, "TEACHER");
  assert.equal(data.teacherid, "ALL");
  assert.equal(data.groupno, "ALL");
  assert.equal(data.teacheronly, false);
  assert.equal(data.viewerhasassignments, true);
  assert.equal(data.showgrouplabels, true);
  assert.equal(requestedRanges.includes("TeacherAssign!A:ZZ"), false);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Teacher complete read-only timetable regression test passed.");

function valuesForRange(range) {
  if (range === "SystemConfig!A:E") return systemConfigRows;
  if (range === "TimetableCourseState!A:ZZ") return stateRows;
  if (range === "TimetablePublications!A:ZZ") return publicationRows;
  if (range === "PublishedTimetableSessions!A:ZZ") return publishedRows;
  throw new Error(`Unexpected range ${range}`);
}

function toPem(bytes, label) {
  const base64 = Buffer.from(bytes).toString("base64");
  return `-----BEGIN ${label}-----\n${base64.match(/.{1,64}/g).join("\n")}\n-----END ${label}-----\n`;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
