import assert from "node:assert/strict";
import worker from "../src/worker.js";

const weeklyHeaders = [
  "PlannerID", "TeacherID", "TeacherName", "WeekStart", "WeekEnd", "Month",
  "GroupNo", "Status", "PlannerData", "Feedback", "FeedbackBy", "CreatedDate",
  "UpdatedDate", "PublishedDate"
];
const adminRows = [
  ["adminid", "username", "uniqueid", "pinsetup", "pinhash", "role", "assignedgroup", "active", "createdate", "lastlogin", "URL"],
  ["ADMIN1", "Test Teacher", "ABCDEFG", true, "", "TEACHER", "2", true, "", "", ""],
  ["ADMIN2", "Other Teacher", "HIJKLMN", true, "", "TEACHER", "3", true, "", "", ""]
];
const weeklyRows = [weeklyHeaders];
const calls = [];

const keyPair = await crypto.subtle.generateKey(
  { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
  true,
  ["sign", "verify"]
);
const pkcs8 = new Uint8Array(await crypto.subtle.exportKey("pkcs8", keyPair.privateKey));
const privateKey = toPem(pkcs8, "PRIVATE KEY");
const sessionSecret = "weekly-planner-test-secret";
const env = {
  SESSION_SECRET: sessionSecret,
  GOOGLE_SPREADSHEET_ID: "test-spreadsheet",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "weekly-planner-test@example.iam.gserviceaccount.com",
    private_key_id: "test-key",
    private_key: privateKey,
    token_uri: "https://oauth2.googleapis.com/token"
  })
};

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));
  calls.push({ url: url.toString(), method: init.method || "GET", body: init.body || "" });

  if (url.hostname === "oauth2.googleapis.com") {
    return response({ access_token: "mock-google-token", expires_in: 3600 });
  }

  if (url.hostname === "sheets.googleapis.com") {
    assert.equal(init.headers.Authorization, "Bearer mock-google-token");
    const rangeAndAction = url.pathname.split("/values/")[1] || "";
    const isAppendRequest = rangeAndAction.endsWith(":append");
    const encodedRange = isAppendRequest
      ? rangeAndAction.slice(0, -":append".length)
      : rangeAndAction;
    const range = decodeURIComponent(encodedRange);

    if (range.startsWith("AdminRecords!")) {
      return response({ values: adminRows });
    }

    if (range === "WeeklyPlanners!A1:N1") {
      return response({ values: [weeklyHeaders] });
    }

    if (range === "WeeklyPlanners!A:N" && (init.method || "GET") === "GET") {
      return response({ values: weeklyRows });
    }

    if (range === "WeeklyPlanners!A:N" && init.method === "POST" && isAppendRequest) {
      const payload = JSON.parse(init.body);
      weeklyRows.push(payload.values[0]);
      return response({ updates: { updatedRows: 1 } });
    }

    if (/^WeeklyPlanners!A\d+:N\d+$/.test(range) && init.method === "PUT") {
      const rowNumber = Number(range.match(/A(\d+)/)[1]);
      const payload = JSON.parse(init.body);
      weeklyRows[rowNumber - 1] = payload.values[0];
      return response({ updatedRows: 1 });
    }
  }

  throw new Error(`Unexpected fetch: ${url}`);
};

const token = await makeSessionToken({
  type: "admin",
  adminid: "ADMIN1",
  username: "Test Teacher",
  role: "TEACHER",
  assignedgroup: "2"
}, sessionSecret);

const health = await callWorker("/api/admin/weekly-planner/health", {}, token);
assert.equal(health.status, 200);
assert.equal(health.data.connection, "google-sheets-direct");
assert.equal(health.headers.get("X-M4L-Feature"), "weekly-planner");
assert.equal(health.headers.get("X-M4L-Backend"), "google-sheets");

const routing = await callWorker("/api/admin/backend-routing", {}, token);
assert.equal(routing.status, 200);
assert.equal(routing.data.features.auth.backend, "apps-script");
assert.equal(routing.data.features.progress.backend, "apps-script");
assert.equal(routing.data.features["weekly-planner"].backend, "google-sheets");
assert.equal(routing.data.routingLogsEnabled, false);

const teachers = await callWorker("/api/admin/weekly-planner/teachers", {}, token);
assert.equal(teachers.status, 200);
assert.deepEqual(
  teachers.data.teachers.map(item => item.teacherId).sort(),
  ["ADMIN1", "ADMIN2"],
  "Every authenticated planner user may browse active teachers"
);

const initial = await callWorker("/api/admin/weekly-planner/get", {
  teacherId: "ADMIN1",
  weekStart: "2026-07-13"
}, token);
assert.equal(initial.status, 200);
assert.equal(initial.data.teacher.teacherId, "ADMIN1");
assert.equal(initial.data.canEdit, true);
assert.equal(initial.data.planner, null);

const otherInitial = await callWorker("/api/admin/weekly-planner/get", {
  teacherId: "ADMIN2",
  weekStart: "2026-07-13"
}, token);
assert.equal(otherInitial.status, 200);
assert.equal(otherInitial.data.teacher.teacherId, "ADMIN2");
assert.equal(otherInitial.data.canEdit, false, "Another user's planner must be read only");
assert.equal(otherInitial.data.planner, null);

const plannerData = {
  version: 1,
  days: ["Monday", "Tuesday", "Wednesday", "Thursday"].map((label, index) => ({
    key: label.toLowerCase(),
    label,
    date: `2026-07-${String(13 + index).padStart(2, "0")}`,
    periods: [{ id: "period-1", label: "Period One", subject: "Quran", entries: ["Revision"] }]
  }))
};
const rejectedOtherSave = await callWorker("/api/admin/weekly-planner/save", {
  teacherId: "ADMIN2",
  weekStart: "2026-07-13",
  groupNo: "3",
  status: "READY",
  plannerData,
  expectedExists: false
}, token);
assert.equal(rejectedOtherSave.status, 403);
assert.match(rejectedOtherSave.data.error, /only save your own/i);
assert.equal(weeklyRows.length, 1, "A rejected cross-user save must not write a row");

const saved = await callWorker("/api/admin/weekly-planner/save", {
  teacherId: "ADMIN1",
  weekStart: "2026-07-13",
  groupNo: "2",
  status: "READY",
  plannerData,
  feedback: "Good preparation",
  expectedExists: false
}, token);
assert.equal(saved.status, 200);
assert.equal(saved.data.canEdit, true);
assert.equal(saved.data.planner.status, "READY");
assert.equal(weeklyRows.length, 2);
assert.equal(weeklyRows[1].length, 14);

const appendCall = calls.find(call => {
  return call.method === "POST" && call.url.includes("WeeklyPlanners!A%3AN:append");
});
assert.ok(appendCall, "New planners must use the Sheets values:append endpoint for one A:N row");
assert.equal(
  calls.some(call => call.method === "POST" && /WeeklyPlanners!A%3AN\?/.test(call.url)),
  false,
  "New planners must not POST to the ordinary values range endpoint"
);

const creationConflict = await callWorker("/api/admin/weekly-planner/save", {
  teacherId: "ADMIN1",
  weekStart: "2026-07-13",
  groupNo: "2",
  status: "READY",
  plannerData,
  expectedUpdatedDate: "",
  expectedExists: false
}, token);
assert.equal(creationConflict.status, 409);
assert.equal(creationConflict.data.conflict, true);
assert.equal(
  creationConflict.data.planner.plannerId,
  saved.data.planner.plannerId,
  "A client that loaded an absent planner must not overwrite a planner created meanwhile"
);

const missingConflict = await callWorker("/api/admin/weekly-planner/save", {
  teacherId: "ADMIN1",
  weekStart: "2026-07-20",
  groupNo: "2",
  status: "READY",
  plannerData,
  expectedUpdatedDate: saved.data.planner.updatedDate,
  expectedExists: true
}, token);
assert.equal(missingConflict.status, 409);
assert.equal(missingConflict.data.conflict, true);

await new Promise(resolve => setTimeout(resolve, 2));
const updated = await callWorker("/api/admin/weekly-planner/save", {
  teacherId: "ADMIN1",
  weekStart: "2026-07-13",
  groupNo: "2",
  status: "READY",
  plannerData,
  feedback: "Updated preparation",
  expectedUpdatedDate: saved.data.planner.updatedDate,
  expectedExists: true
}, token);
assert.equal(updated.status, 200);
assert.equal(weeklyRows.length, 2, "Updating must not append another planner row");
const boundedUpdateCall = calls.find(call => {
  return call.method === "PUT" && call.url.includes("WeeklyPlanners!A2%3AN2");
});
assert.ok(boundedUpdateCall, "Existing planners must update only their A:N row");

const conflict = await callWorker("/api/admin/weekly-planner/save", {
  teacherId: "ADMIN1",
  weekStart: "2026-07-13",
  groupNo: "2",
  status: "READY",
  plannerData,
  expectedUpdatedDate: saved.data.planner.updatedDate,
  expectedExists: true
}, token);
assert.equal(conflict.status, 409);
assert.equal(conflict.data.conflict, true);

const otherToken = await makeSessionToken({
  type: "admin",
  adminid: "ADMIN2",
  username: "Other Teacher",
  role: "TEACHER",
  assignedgroup: "3"
}, sessionSecret);
const otherSaved = await callWorker("/api/admin/weekly-planner/save", {
  teacherId: "ADMIN2",
  weekStart: "2026-07-13",
  groupNo: "3",
  status: "READY",
  plannerData,
  feedback: "Other teacher feedback",
  expectedExists: false
}, otherToken);
assert.equal(otherSaved.status, 200);
assert.equal(weeklyRows.length, 3);

const viewedOther = await callWorker("/api/admin/weekly-planner/get", {
  teacherId: "ADMIN2",
  weekStart: "2026-07-13"
}, token);
assert.equal(viewedOther.status, 200);
assert.equal(viewedOther.data.canEdit, false);
assert.equal(viewedOther.data.planner.plannerId, otherSaved.data.planner.plannerId);

const rejectedOtherEdit = await callWorker("/api/admin/weekly-planner/save", {
  teacherId: "ADMIN2",
  weekStart: "2026-07-13",
  groupNo: "3",
  status: "READY",
  plannerData,
  expectedUpdatedDate: otherSaved.data.planner.updatedDate,
  expectedExists: true
}, token);
assert.equal(rejectedOtherEdit.status, 403);
assert.equal(weeklyRows.length, 3, "Viewing another planner must never grant write access");

console.log("Weekly Planner Worker tests passed.");

async function callWorker(path, body, bearerToken) {
  const request = new Request(`https://worker.test${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearerToken}`
    },
    body: JSON.stringify(body)
  });
  const result = await worker.fetch(request, env);
  return { status: result.status, headers: result.headers, data: await result.json() };
}

async function makeSessionToken(payload, secret) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify({ ...payload, iat: now, exp: now + 3600 }));
  const data = `${header}.${body}`;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
  const hex = Array.from(signature).map(value => value.toString(16).padStart(2, "0")).join("");
  return `${data}.${hex}`;
}

function base64url(value) {
  return Buffer.from(value, "utf8").toString("base64url");
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
