import assert from "node:assert/strict";
import worker from "../src/worker.js";

const systemConfigRows = [
  [
    "StudentLoginBaseUrl",
    "https://old.example.test/student/",
    "2026-07-01T00:00:00.000Z",
    "ADMIN0",
    "Old Admin"
  ]
];

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
const sessionSecret = "system-settings-test-secret";
const directEnv = {
  SESSION_SECRET: sessionSecret,
  GOOGLE_SPREADSHEET_ID: "test-spreadsheet",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "system-settings-test@example.iam.gserviceaccount.com",
    private_key_id: "system-settings-test-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"),
    token_uri: "https://oauth2.googleapis.com/token"
  }),
  M4L_BACKEND_SYSTEM_SETTINGS: "google-sheets"
};
const adminToken = await makeSessionToken({
  type: "admin",
  adminid: "ADMIN1",
  username: "Admin User",
  role: "ADMIN"
}, sessionSecret);
const seniorToken = await makeSessionToken({
  type: "admin",
  adminid: "SENIOR1",
  username: "Senior User",
  role: "SENIOR"
}, sessionSecret);
const teacherToken = await makeSessionToken({
  type: "admin",
  adminid: "TEACHER1",
  username: "Teacher User",
  role: "TEACHER"
}, sessionSecret);
const originalFetch = globalThis.fetch;
const reads = [];
const batchUpdates = [];
const appends = [];
const auditRows = [[
  "AuditID", "DateStamp", "AdminID", "AdminName", "Role", "Action",
  "RecordType", "RecordID", "ChangedFields"
]];

globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));

  if (url.hostname === "oauth2.googleapis.com") {
    return response({ access_token: "mock-system-settings-token", expires_in: 3600 });
  }

  if (url.hostname !== "sheets.googleapis.com") {
    throw new Error(`Unexpected System Settings fetch: ${url}`);
  }

  assert.equal(init.headers.Authorization, "Bearer mock-system-settings-token");

  if (url.pathname.endsWith("/values:batchUpdate")) {
    const payload = JSON.parse(init.body);
    batchUpdates.push(payload);

    payload.data.forEach(update => {
      const match = update.range.match(/^SystemConfig!B(\d+):E\1$/);
      assert.ok(match, `Unexpected SystemConfig update range: ${update.range}`);
      const rowIndex = Number(match[1]) - 1;
      systemConfigRows[rowIndex].splice(1, 4, ...update.values[0]);
    });

    return response({ totalUpdatedRows: payload.data.length });
  }

  const rangeAndAction = decodeURIComponent(url.pathname.split("/values/")[1] || "");
  const isAppend = rangeAndAction.endsWith(":append");
  const range = isAppend ? rangeAndAction.slice(0, -":append".length) : rangeAndAction;

  if (init.method === "GET") {
    reads.push(range);
    if (range === "AdminAuditLog!A1:I1") {
      return response({ values: [auditRows[0]] });
    }
    assert.equal(range, "SystemConfig!A:E");
    return response({ values: systemConfigRows });
  }

  if (init.method === "POST" && isAppend) {
    const payload = JSON.parse(init.body);
    if (range === "AdminAuditLog!A:I") {
      auditRows.push(...payload.values);
      return response({ updates: { updatedRows: payload.values.length } });
    }
    appends.push({ range, payload });
    systemConfigRows.push(...payload.values);
    return response({ updates: { updatedRows: payload.values.length } });
  }

  throw new Error(`Unexpected System Settings Sheets request: ${init.method} ${rangeAndAction}`);
};

try {
  const initial = await postAdmin("/api/admin/system-settings/get", adminToken, {}, directEnv);
  assert.equal(initial.response.status, 200);
  assert.equal(initial.response.headers.get("X-M4L-Feature"), "system-settings");
  assert.equal(initial.response.headers.get("X-M4L-Backend"), "google-sheets");
  assert.equal(
    initial.response.headers.get("X-M4L-Backend-Source"),
    "fixed"
  );
  assert.deepEqual(initial.data, {
    success: true,
    settings: {
      studentLoginBaseUrl: "https://old.example.test/student/",
      studentLoginBaseSource: "system-config",
      weeklyPlannerDriveFolderId: "",
      weeklyPlannerDriveFolderUrl: "",
      weeklyPlannerDriveFolderLabel: "Weekly Planner",
      globalZoomLink: "",
      configured: {
        studentLoginBaseUrl: true,
        weeklyPlannerDriveFolderId: false,
        weeklyPlannerDriveFolderLabel: false,
        globalZoomLink: false
      }
    }
  });

  const saved = await postAdmin("/api/admin/system-settings/save", adminToken, {
    studentLoginBaseUrl: "https://new.example.test/student",
    weeklyPlannerDriveFolder: "https://drive.google.com/drive/folders/1AbCdEfGhIjKlMn",
    weeklyPlannerDriveFolderLabel: "Planner Archive",
    globalZoomLink: "https://zoom.test/j/123456?pwd=abc"
  }, directEnv);

  assert.equal(saved.response.status, 200);
  assert.equal(saved.data.success, true);
  assert.equal(saved.data.settings.studentLoginBaseUrl, "https://new.example.test/student/");
  assert.equal(saved.data.settings.studentLoginBaseSource, "system-config");
  assert.equal(saved.data.settings.weeklyPlannerDriveFolderId, "1AbCdEfGhIjKlMn");
  assert.equal(
    saved.data.settings.weeklyPlannerDriveFolderUrl,
    "https://drive.google.com/drive/folders/1AbCdEfGhIjKlMn"
  );
  assert.equal(saved.data.settings.weeklyPlannerDriveFolderLabel, "Planner Archive");
  assert.equal(saved.data.settings.globalZoomLink, "https://zoom.test/j/123456?pwd=abc");
  assert.equal(saved.data.settings.updatedBy, "ADMIN1");
  assert.equal(saved.data.settings.updatedByName, "Admin User");
  assert.match(saved.data.settings.updatedAt, /^\d{4}-\d{2}-\d{2}T/);

  assert.equal(batchUpdates.length, 1);
  assert.equal(batchUpdates[0].valueInputOption, "RAW");
  assert.equal(batchUpdates[0].data.length, 1);
  assert.equal(batchUpdates[0].data[0].range, "SystemConfig!B1:E1");
  assert.equal(batchUpdates[0].data[0].values[0][0], "https://new.example.test/student/");
  assert.equal(batchUpdates[0].data[0].values[0][2], "ADMIN1");
  assert.equal(batchUpdates[0].data[0].values[0][3], "Admin User");

  assert.equal(appends.length, 1);
  assert.equal(appends[0].range, "SystemConfig!A:E");
  assert.deepEqual(
    appends[0].payload.values.map(row => [row[0], row[1], row[3]]),
    [
      ["WeeklyPlannerDriveFolderId", "1AbCdEfGhIjKlMn", "ADMIN1"],
      ["WeeklyPlannerDriveFolderLabel", "Planner Archive", "ADMIN1"],
      ["GlobalZoomLink", "https://zoom.test/j/123456?pwd=abc", "ADMIN1"]
    ]
  );
  assert.ok(auditRows.some(row => (
    row[5] === "UPDATE" && row[6] === "SYSTEM_CONFIG" && row[7] === "SYSTEM_CONFIG"
  )));

  const reloaded = await postAdmin("/api/admin/system-settings/get", adminToken, {}, directEnv);
  assert.equal(reloaded.data.settings.configured.studentLoginBaseUrl, true);
  assert.equal(reloaded.data.settings.configured.weeklyPlannerDriveFolderId, true);
  assert.equal(reloaded.data.settings.configured.weeklyPlannerDriveFolderLabel, true);
  assert.equal(reloaded.data.settings.configured.globalZoomLink, true);
  assert.equal(reloaded.data.settings.weeklyPlannerDriveFolderLabel, "Planner Archive");
  assert.equal(reloaded.data.settings.globalZoomLink, "https://zoom.test/j/123456?pwd=abc");

  const readCountBeforeInvalid = reads.length;
  const invalid = await postAdmin("/api/admin/system-settings/save", adminToken, {
    studentLoginBaseUrl: "http://not-secure.example.test/student/",
    weeklyPlannerDriveFolder: "1AbCdEfGhIjKlMn"
  }, directEnv);
  assert.equal(invalid.response.status, 400);
  assert.match(invalid.data.error, /must use https/);
  assert.equal(reads.length, readCountBeforeInvalid, "Invalid settings must not reach Google Sheets");

  const invalidZoom = await postAdmin("/api/admin/system-settings/save", adminToken, {
    studentLoginBaseUrl: "https://valid.example.test/student/",
    weeklyPlannerDriveFolder: "1AbCdEfGhIjKlMn",
    globalZoomLink: "ftp://zoom.test/meeting"
  }, directEnv);
  assert.equal(invalidZoom.response.status, 400);
  assert.match(invalidZoom.data.error, /Zoom link must use https/);

  const writesBeforeInvalidAuditSchema = batchUpdates.length + appends.length + auditRows.length;
  auditRows[0][0] = "WrongHeader";
  const invalidAuditSchema = await postAdmin("/api/admin/system-settings/save", adminToken, {
    studentLoginBaseUrl: "https://valid.example.test/student/",
    weeklyPlannerDriveFolder: "1AbCdEfGhIjKlMn",
    weeklyPlannerDriveFolderLabel: "Planner Archive",
    globalZoomLink: "https://zoom.test/j/123456?pwd=abc"
  }, directEnv);
  assert.equal(invalidAuditSchema.response.status, 503);
  assert.match(invalidAuditSchema.data.error, /AdminAuditLog must use/);
  assert.equal(
    batchUpdates.length + appends.length + auditRows.length,
    writesBeforeInvalidAuditSchema,
    "Invalid audit headers must stop the settings write"
  );
  auditRows[0][0] = "AuditID";

  const senior = await postAdmin("/api/admin/system-settings/get", seniorToken, {}, directEnv);
  assert.equal(senior.response.status, 403);
  assert.deepEqual(senior.data, { success: false, error: "Forbidden" });

  const teacher = await postAdmin("/api/admin/system-settings/save", teacherToken, {
    studentLoginBaseUrl: "https://blocked.example.test/student/",
    weeklyPlannerDriveFolder: "1AbCdEfGhIjKlMn"
  }, directEnv);
  assert.equal(teacher.response.status, 403);
  assert.deepEqual(teacher.data, { success: false, error: "Forbidden" });

  const unauthenticated = await worker.fetch(new Request(
    "https://worker.test/api/admin/system-settings/get",
    { method: "POST" }
  ), directEnv);
  assert.equal(unauthenticated.status, 401);

  assert.equal(reads.every(range => (
    range === "SystemConfig!A:E" || range === "AdminAuditLog!A1:I1"
  )), true);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Direct System Settings tests passed.");

async function postAdmin(path, token, body, env) {
  const response = await worker.fetch(new Request(`https://worker.test${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  }), env);

  return {
    response,
    data: await response.json()
  };
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
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data))
  );
  const hex = Array.from(signature)
    .map(value => value.toString(16).padStart(2, "0"))
    .join("");
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
