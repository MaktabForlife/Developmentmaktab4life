import { requireSystemAdmin } from "../lib/auth.js";
import {
  appendGoogleSheetValues,
  batchUpdateGoogleSheetValues,
  readGoogleSheetValues,
  updateGoogleSheetValues
} from "../lib/google-sheets.js";
import { json } from "../lib/http.js";

const ADMIN_RECORDS_SHEET = "AdminRecords";
const SYSTEM_CONFIG_SHEET = "SystemConfig";
const FULL_SHEET_RANGE = `${ADMIN_RECORDS_SHEET}!A:ZZ`;
const APPEND_RANGE = `${ADMIN_RECORDS_SHEET}!A:J`;
const UNIQUE_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const VALID_ROLES = new Set(["ADMIN", "SENIOR", "TEACHER"]);

export async function searchAdminsGoogleSheetsEndpoint(request, env) {
  const permission = await requireSystemAdmin(request, env);
  if (!permission.ok) return permission.response;

  const body = await request.json();
  const query = clean(body.query);
  const listAll = body.listAll === true;

  if (!query && !listAll) {
    return json({ success: false, error: "Enter an admin name or ID" }, 400);
  }

  const rows = await readAdminRows(env);
  return json(buildAdminSearchResponse(rows, {
    query,
    listAll,
    currentAdminId: permission.user.adminid
  }));
}

export async function registerAdminGoogleSheetsEndpoint(request, env) {
  const permission = await requireSystemAdmin(request, env);
  if (!permission.ok) return permission.response;

  const body = await request.json();
  const username = clean(body.username);
  const role = normalizeRole(body.role);
  const assignedgroup = clean(body.assignedgroup || "ALL");

  if (!username) {
    return json({ success: false, error: "Admin name is required" }, 400);
  }

  if (!role) {
    return json({ success: false, error: "Role must be ADMIN, SENIOR, or TEACHER" }, 400);
  }

  if (!assignedgroup) {
    return json({ success: false, error: "Assigned group is required" }, 400);
  }

  const rows = await readAdminRows(env);
  const adminIdResult = await reserveAdminId(env);

  if (!adminIdResult.ok) {
    return json({ success: false, error: adminIdResult.error }, 503);
  }

  const adminid = adminIdResult.adminid;
  const uniqueid = generateUniqueId(rows);
  const createdate = new Date().toISOString();

  await appendGoogleSheetValues(env, APPEND_RANGE, [[
    adminid,
    username,
    uniqueid,
    false,
    "",
    role,
    assignedgroup,
    true,
    createdate,
    ""
  ]]);

  return json({
    success: true,
    message: "Admin account created successfully",
    admin: {
      adminid,
      username,
      uniqueid,
      pinsetup: false,
      role,
      assignedgroup,
      active: true,
      createdate,
      isSelf: false
    }
  });
}

export async function updateAdminGoogleSheetsEndpoint(request, env) {
  const permission = await requireSystemAdmin(request, env);
  if (!permission.ok) return permission.response;

  const body = await request.json();
  const adminid = clean(body.adminid);

  if (!adminid) {
    return json({ success: false, error: "Missing adminid" }, 400);
  }

  if (body.username !== undefined && !clean(body.username)) {
    return json({ success: false, error: "Admin name cannot be empty" }, 400);
  }

  const requestedRole = body.role === undefined ? undefined : normalizeRole(body.role);
  if (body.role !== undefined && !requestedRole) {
    return json({ success: false, error: "Role must be ADMIN, SENIOR, or TEACHER" }, 400);
  }

  if (body.assignedgroup !== undefined && !clean(body.assignedgroup)) {
    return json({ success: false, error: "Assigned group cannot be empty" }, 400);
  }

  if (body.active !== undefined && typeof body.active !== "boolean") {
    return json({ success: false, error: "active must be true or false" }, 400);
  }

  const rows = await readAdminRows(env);
  const target = findAdminById(rows, adminid);

  if (!target) {
    return json({ success: false, error: "Admin account not found" }, 404);
  }

  const isSelf = target.adminid === String(permission.user.adminid || "");
  const nextRole = requestedRole === undefined ? target.role : requestedRole;
  const nextActive = body.active === undefined ? target.active : body.active;
  const nextAssignedGroup = body.assignedgroup === undefined
    ? target.assignedgroup
    : clean(body.assignedgroup);

  if (isSelf && (nextRole !== target.role || nextActive !== target.active || nextAssignedGroup !== target.assignedgroup)) {
    return json({
      success: false,
      error: "You cannot change your own role, assigned group, or active status from this screen.",
      code: "SELF_SECURITY_CHANGE_BLOCKED"
    }, 409);
  }

  if (
    target.role === "ADMIN" &&
    target.active === true &&
    (nextRole !== "ADMIN" || nextActive !== true) &&
    countOtherActiveAdmins(rows, target.adminid) === 0
  ) {
    return json({
      success: false,
      error: "At least one other active ADMIN account is required before this account can be downgraded or disabled.",
      code: "LAST_ACTIVE_ADMIN"
    }, 409);
  }

  const updates = [];
  if (body.username !== undefined) updates.push(cellUpdate("B", target.row, clean(body.username)));
  if (body.role !== undefined) updates.push(cellUpdate("F", target.row, nextRole));
  if (body.assignedgroup !== undefined) updates.push(cellUpdate("G", target.row, nextAssignedGroup));
  if (body.active !== undefined) updates.push(cellUpdate("H", target.row, nextActive));

  if (updates.length > 0) {
    await batchUpdateGoogleSheetValues(env, updates);
  }

  return json({
    success: true,
    message: "Admin account updated successfully. Existing sessions are revalidated on their next request.",
    admin: {
      adminid: target.adminid,
      username: body.username === undefined ? target.username : clean(body.username),
      uniqueid: target.uniqueid,
      pinsetup: target.pinsetup,
      role: nextRole,
      assignedgroup: nextAssignedGroup,
      active: nextActive,
      createdate: target.createdate,
      lastlogin: target.lastlogin,
      isSelf
    }
  });
}

export async function resetAdminPinGoogleSheetsEndpoint(request, env) {
  const permission = await requireSystemAdmin(request, env);
  if (!permission.ok) return permission.response;

  const body = await request.json();
  const adminid = clean(body.adminid);

  if (!adminid) {
    return json({ success: false, error: "Missing adminid" }, 400);
  }

  const rows = await readAdminRows(env);
  const target = findAdminById(rows, adminid);

  if (!target) {
    return json({ success: false, error: "Admin account not found" }, 404);
  }

  if (target.adminid === String(permission.user.adminid || "")) {
    return json({
      success: false,
      error: "You cannot reset your own PIN from the Admin management screen.",
      code: "SELF_PIN_RESET_BLOCKED"
    }, 409);
  }

  await updateGoogleSheetValues(env, `${ADMIN_RECORDS_SHEET}!D${target.row}:E${target.row}`, [[false, ""]]);

  return json({
    success: true,
    message: "Admin PIN reset successfully. Existing sessions are now invalid.",
    adminid: target.adminid,
    username: target.username
  });
}

export function buildAdminSearchResponse(rows = [], options = {}) {
  const query = normalizeSearch(options.query);
  const listAll = options.listAll === true;
  const currentAdminId = clean(options.currentAdminId);
  const admins = [];

  rows.slice(1).forEach((row, index) => {
    const admin = mapAdminRow(row, index + 2);
    if (!admin.adminid || !admin.uniqueid) return;

    const haystack = normalizeSearch(`${admin.username} ${admin.adminid} ${admin.role} ${admin.assignedgroup}`);
    if (!listAll && query && !haystack.includes(query)) return;

    admins.push({
      adminid: admin.adminid,
      username: admin.username,
      uniqueid: admin.uniqueid,
      pinsetup: admin.pinsetup,
      role: admin.role,
      assignedgroup: admin.assignedgroup,
      active: admin.active,
      createdate: admin.createdate,
      lastlogin: admin.lastlogin,
      isSelf: admin.adminid === currentAdminId
    });
  });

  admins.sort((left, right) => {
    const roleOrder = { ADMIN: 0, SENIOR: 1, TEACHER: 2 };
    const roleCompare = (roleOrder[left.role] ?? 9) - (roleOrder[right.role] ?? 9);
    return roleCompare || left.username.localeCompare(right.username, undefined, { sensitivity: "base", numeric: true });
  });

  return { success: true, count: admins.length, admins: admins.slice(0, listAll ? 500 : 50) };
}

async function readAdminRows(env) {
  return readGoogleSheetValues(env, FULL_SHEET_RANGE);
}

function findAdminById(rows, adminid) {
  for (let index = 1; index < rows.length; index += 1) {
    const admin = mapAdminRow(rows[index], index + 1);
    if (admin.adminid === adminid) return admin;
  }
  return null;
}

function mapAdminRow(row, sheetRow) {
  return {
    row: sheetRow,
    adminid: clean(row?.[0]),
    username: clean(row?.[1]),
    uniqueid: clean(row?.[2]),
    pinsetup: normalizeBoolean(row?.[3]),
    role: normalizeRole(row?.[5]),
    assignedgroup: clean(row?.[6]),
    active: normalizeBoolean(row?.[7]),
    createdate: row?.[8] ?? "",
    lastlogin: row?.[9] ?? ""
  };
}

function countOtherActiveAdmins(rows, excludedAdminId) {
  return rows.slice(1).map((row, index) => mapAdminRow(row, index + 2)).filter(admin => (
    admin.adminid &&
    admin.adminid !== excludedAdminId &&
    admin.active === true &&
    admin.role === "ADMIN"
  )).length;
}

async function reserveAdminId(env) {
  const rows = await readGoogleSheetValues(env, `${SYSTEM_CONFIG_SHEET}!A:B`);
  const rowIndex = rows.findIndex(row => clean(row?.[0]) === "NextAdminNumber");

  if (rowIndex === -1) {
    return { ok: false, error: "NextAdminNumber not found in SystemConfig" };
  }

  const current = Number(rows[rowIndex]?.[1]);

  if (!Number.isInteger(current) || current < 1) {
    return { ok: false, error: "NextAdminNumber is invalid" };
  }

  await updateGoogleSheetValues(env, `${SYSTEM_CONFIG_SHEET}!B${rowIndex + 1}`, [[current + 1]]);
  return { ok: true, adminid: `ADMIN${current}` };
}

function generateUniqueId(rows) {
  const existing = new Set(rows.slice(1).map(row => clean(row?.[2])));
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = randomToken(10);
    if (!existing.has(candidate)) return candidate;
  }
  throw new Error("Unable to generate a unique admin login ID");
}

function randomToken(length) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let value = "";
  for (const byte of bytes) value += UNIQUE_ID_ALPHABET[byte % UNIQUE_ID_ALPHABET.length];
  return value;
}

function cellUpdate(column, row, value) {
  return {
    range: `${ADMIN_RECORDS_SHEET}!${column}${row}`,
    majorDimension: "ROWS",
    values: [[value]]
  };
}

function normalizeRole(value) {
  const role = clean(value).toUpperCase();
  return VALID_ROLES.has(role) ? role : "";
}

function normalizeBoolean(value) {
  if (value === true) return true;
  if (value === false || value === null || value === undefined) return false;
  return ["true", "yes", "1"].includes(String(value).trim().toLowerCase());
}

function normalizeSearch(value) {
  return clean(value).toLowerCase().replace(/\s+/g, " ");
}

function clean(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}
