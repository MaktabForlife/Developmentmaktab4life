import assert from "node:assert/strict";
import worker from "../src/worker.js";
import { createSaltedPinHash, createSessionToken, getAuthUser } from "../src/lib/auth.js";

const pinSecret = "admin-management-pin-secret";
const sessionSecret = "admin-management-session-secret";
const adminOneHash = await createSaltedPinHash("1234", pinSecret);
const adminTwoHash = await createSaltedPinHash("5678", pinSecret);
const headers = [
  "AdminID", "Username", "UniqueID", "PinSetup", "PinHash", "Role",
  "AssignedGroup", "Active", "CreateDate", "LastLogin"
];
const rows = [
  headers,
  ["ADMIN1", "Main Admin", "MAIN-LINK", true, adminOneHash, "ADMIN", "ALL", true, "", ""],
  ["ADMIN2", "Senior User", "SENIOR-LINK", true, adminTwoHash, "SENIOR", "2", true, "", ""]
];
const systemConfigRows = [["NextAdminNumber", 3]];
const reads = [];
const writes = [];

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
  GOOGLE_SPREADSHEET_ID: "test-spreadsheet",
  GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({
    type: "service_account",
    client_email: "admin-management@example.iam.gserviceaccount.com",
    private_key_id: "admin-management-key",
    private_key: toPem(pkcs8, "PRIVATE KEY"),
    token_uri: "https://oauth2.googleapis.com/token"
  }),
  M4L_BACKEND_ADMIN_MANAGEMENT_READ: "google-sheets",
  M4L_BACKEND_ADMIN_MANAGEMENT_WRITE: "google-sheets",
  M4L_BACKEND_ADMIN_MANAGEMENT_UPDATE: "google-sheets",
  M4L_REQUIRE_CREDENTIAL_BOUND_SESSIONS: "true"
};

const adminToken = await createSessionToken({
  type: "admin",
  adminid: "ADMIN1",
  username: "Main Admin",
  role: "ADMIN",
  assignedgroup: "ALL",
  authrow: 2,
  credentialHash: adminOneHash
}, env);
const seniorToken = await createSessionToken({
  type: "admin",
  adminid: "ADMIN2",
  username: "Senior User",
  role: "SENIOR",
  assignedgroup: "2",
  authrow: 3,
  credentialHash: adminTwoHash
}, env);

const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input));

  if (url.hostname === "oauth2.googleapis.com") {
    return response({ access_token: "mock-token", expires_in: 3600 });
  }

  if (url.hostname !== "sheets.googleapis.com") {
    throw new Error(`Unexpected fetch: ${url}`);
  }

  if (url.pathname.endsWith("/values:batchUpdate")) {
    const payload = JSON.parse(init.body);
    payload.data.forEach(update => applyUpdate(update.range, update.values));
    writes.push(...payload.data);
    return response({ totalUpdatedRows: payload.data.length });
  }

  const rawRange = decodeURIComponent(url.pathname.split("/values/")[1] || "");
  const range = rawRange.replace(/:append$/, "");

  if (init.method === "GET") {
    reads.push(range);
    if (range === "AdminRecords!A:ZZ") return response({ values: rows });
    if (range === "SystemConfig!A:B") return response({ values: systemConfigRows });
    const match = /^AdminRecords!A(\d+):J\1$/.exec(range);
    if (match) return response({ values: [rows[Number(match[1]) - 1] || []] });
    throw new Error(`Unexpected read range: ${range}`);
  }

  if (init.method === "POST" && rawRange.endsWith(":append")) {
    const payload = JSON.parse(init.body);
    rows.push(payload.values[0]);
    writes.push({ range, values: payload.values });
    return response({ updates: { updatedRows: 1 } });
  }

  if (init.method === "PUT") {
    const payload = JSON.parse(init.body);
    if (range.startsWith("SystemConfig!")) {
      const match = /^SystemConfig!B(\d+)$/.exec(range);
      if (!match) throw new Error(`Unexpected SystemConfig update: ${range}`);
      systemConfigRows[Number(match[1]) - 1][1] = payload.values[0][0];
    } else {
      applyUpdate(range, payload.values);
    }
    writes.push({ range, values: payload.values });
    return response({ updatedRows: 1 });
  }

  throw new Error(`Unexpected Sheets request: ${init.method} ${range}`);
};

try {
  const search = await post("/api/admin/admins/search", { listAll: true }, adminToken);
  assert.equal(search.response.status, 200);
  assert.equal(search.data.count, 2);
  assert.equal(search.data.admins[0].isSelf, true);
  assert.equal(JSON.stringify(search.data).includes(adminOneHash), false);

  const forbiddenSearch = await post("/api/admin/admins/search", { listAll: true }, seniorToken);
  assert.equal(forbiddenSearch.response.status, 403);
  assert.equal(forbiddenSearch.data.error, "Forbidden");

  const registered = await post("/api/admin/register-admin", {
    username: "Teacher Three",
    role: "TEACHER",
    assignedgroup: "3"
  }, adminToken);
  assert.equal(registered.response.status, 200);
  assert.equal(registered.data.admin.username, "Teacher Three");
  assert.equal(registered.data.admin.role, "TEACHER");
  assert.equal(registered.data.admin.pinsetup, false);
  assert.equal(registered.data.admin.adminid, "ADMIN3");
  assert.match(registered.data.admin.uniqueid, /^[A-Z2-9]{10}$/);
  assert.equal(systemConfigRows[0][1], 4);
  assert.equal(rows.length, 4);

  const newAdminId = registered.data.admin.adminid;
  const updated = await post("/api/admin/update-admin", {
    adminid: newAdminId,
    username: "Senior Three",
    role: "SENIOR",
    assignedgroup: "ALL",
    active: false
  }, adminToken);
  assert.equal(updated.response.status, 200);
  assert.equal(updated.data.admin.role, "SENIOR");
  assert.equal(updated.data.admin.active, false);
  assert.equal(rows[3][1], "Senior Three");
  assert.equal(rows[3][5], "SENIOR");
  assert.equal(rows[3][7], false);

  const selfSecurityChange = await post("/api/admin/update-admin", {
    adminid: "ADMIN1",
    role: "TEACHER"
  }, adminToken);
  assert.equal(selfSecurityChange.response.status, 409);
  assert.equal(selfSecurityChange.data.code, "SELF_SECURITY_CHANGE_BLOCKED");

  const selfNameChange = await post("/api/admin/update-admin", {
    adminid: "ADMIN1",
    username: "Main Admin Updated"
  }, adminToken);
  assert.equal(selfNameChange.response.status, 200);
  assert.equal(rows[1][1], "Main Admin Updated");

  const selfPinReset = await post("/api/admin/reset-admin-pin", { adminid: "ADMIN1" }, adminToken);
  assert.equal(selfPinReset.response.status, 409);
  assert.equal(selfPinReset.data.code, "SELF_PIN_RESET_BLOCKED");

  const resetOther = await post("/api/admin/reset-admin-pin", { adminid: "ADMIN2" }, adminToken);
  assert.equal(resetOther.response.status, 200);
  assert.equal(rows[2][3], false);
  assert.equal(rows[2][4], "");

  // Restore ADMIN2 credentials, then prove a role update invalidates its old token.
  rows[2][3] = true;
  rows[2][4] = adminTwoHash;
  const downgrade = await post("/api/admin/update-admin", {
    adminid: "ADMIN2",
    role: "TEACHER",
    assignedgroup: "2",
    active: true
  }, adminToken);
  assert.equal(downgrade.response.status, 200);
  const staleSeniorSession = await getAuthUser(new Request("https://worker.test/api/protected", {
    headers: { Authorization: `Bearer ${seniorToken}` }
  }), env);
  assert.equal(staleSeniorSession, null, "Role changes must invalidate existing admin sessions");

  assert.ok(reads.includes("AdminRecords!A2:J2"));
  assert.ok(writes.length >= 4);
} finally {
  globalThis.fetch = originalFetch;
}

console.log("Admin account management tests passed.");

async function post(path, body, token) {
  const responseObject = await worker.fetch(new Request(`https://worker.test${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(body)
  }), env);
  return { response: responseObject, data: await responseObject.json() };
}

function applyUpdate(range, values) {
  const match = /^AdminRecords!([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/.exec(range);
  if (!match) throw new Error(`Unexpected update range: ${range}`);
  const rowIndex = Number(match[2]) - 1;
  const columnIndex = columnNumber(match[1]) - 1;
  values[0].forEach((value, offset) => { rows[rowIndex][columnIndex + offset] = value; });
}

function columnNumber(column) {
  return Array.from(column).reduce((total, char) => total * 26 + char.charCodeAt(0) - 64, 0);
}

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

function toPem(bytes, label) {
  const base64 = Buffer.from(bytes).toString("base64").match(/.{1,64}/g).join("\n");
  return `-----BEGIN ${label}-----\n${base64}\n-----END ${label}-----`;
}
