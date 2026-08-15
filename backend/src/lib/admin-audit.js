import {
  appendGoogleSheetValues,
  readGoogleSheetValues
} from "./google-sheets.js";

export const ADMIN_AUDIT_LOG_SHEET = "AdminAuditLog";
export const ADMIN_AUDIT_LOG_HEADERS = Object.freeze([
  "AuditID",
  "DateStamp",
  "AdminID",
  "AdminName",
  "Role",
  "Action",
  "RecordType",
  "RecordID",
  "ChangedFields"
]);
export const ROW_AUDIT_HEADERS = Object.freeze([
  "CreatedByAdminID",
  "CreatedByAdminName",
  "CreatedDate",
  "ModifiedByAdminID",
  "ModifiedByAdminName",
  "ModifiedDate"
]);

const SENSITIVE_FIELD_PATTERN = /pin|hash|secret|token|credential/i;
const ROW_AUDIT_HEADER_ALIASES = Object.freeze({
  CreatedByAdminID: ["CreatedByAdminID"],
  CreatedByAdminName: ["CreatedByAdminName"],
  CreatedDate: ["CreatedDate", "CreateDate", "AssignedDate", "Date"],
  ModifiedByAdminID: ["ModifiedByAdminID"],
  ModifiedByAdminName: ["ModifiedByAdminName"],
  ModifiedDate: ["ModifiedDate", "UpdatedDate"]
});

export async function prepareAdminAudit(env, user) {
  const actor = buildAdminAuditActor(user);

  if (!actor.ok) return actor;

  let rows;

  try {
    rows = await readGoogleSheetValues(
      env,
      `${ADMIN_AUDIT_LOG_SHEET}!A1:I1`
    );
  } catch (error) {
    return {
      ok: false,
      error: `${ADMIN_AUDIT_LOG_SHEET} sheet is required before audited writes can be enabled`
    };
  }

  const headers = Array.isArray(rows[0]) ? rows[0] : [];
  const valid = ADMIN_AUDIT_LOG_HEADERS.every((header, index) => (
    normalizeHeader(headers[index]) === normalizeHeader(header)
  ));

  if (!valid) {
    return {
      ok: false,
      error: `${ADMIN_AUDIT_LOG_SHEET} must use the documented A:I headers`
    };
  }

  return {
    ok: true,
    actor: actor.actor,
    timestamp: new Date().toISOString()
  };
}

export function buildAdminAuditActor(user = {}) {
  const adminid = clean(user.adminid);
  const adminname = clean(user.username || user.name);
  const role = clean(user.role).toUpperCase();

  if (!adminid || !adminname) {
    return {
      ok: false,
      error: "Authenticated Admin ID and Admin name are required for audited writes"
    };
  }

  return {
    ok: true,
    actor: { adminid, adminname, role }
  };
}

export function getRequiredRowAuditColumns(headers = []) {
  const headerMap = new Map();

  headers.forEach((header, index) => {
    const key = normalizeHeader(header);
    if (key && !headerMap.has(key)) headerMap.set(key, index);
  });

  const columns = {};
  const missing = [];

  ROW_AUDIT_HEADERS.forEach(header => {
    const aliases = ROW_AUDIT_HEADER_ALIASES[header] || [header];
    const index = aliases
      .map(alias => headerMap.get(normalizeHeader(alias)))
      .find(candidate => candidate !== undefined);

    if (index === undefined) {
      missing.push(header);
      return;
    }

    columns[toPropertyName(header)] = index;
  });

  return missing.length > 0
    ? {
        ok: false,
        error: `Missing required audit columns: ${missing.join(", ")}`,
        missing
      }
    : { ok: true, columns };
}

export function stampCreatedRow(row, auditColumns, actor, timestamp) {
  const output = Array.isArray(row) ? row : [];
  const columns = auditColumns || {};

  output[columns.createdByAdminID] = actor.adminid;
  output[columns.createdByAdminName] = actor.adminname;
  output[columns.createdDate] = timestamp;
  output[columns.modifiedByAdminID] = "";
  output[columns.modifiedByAdminName] = "";
  output[columns.modifiedDate] = "";
  return output;
}

export function stampModifiedRow(row, auditColumns, actor, timestamp) {
  const output = Array.isArray(row) ? row : [];
  const columns = auditColumns || {};

  output[columns.modifiedByAdminID] = actor.adminid;
  output[columns.modifiedByAdminName] = actor.adminname;
  output[columns.modifiedDate] = timestamp;
  return output;
}

export function buildModifiedAuditCellUpdates(sheetName, sheetRow, auditColumns, actor, timestamp) {
  const columns = auditColumns || {};

  return [
    cellUpdate(sheetName, columns.modifiedByAdminID, sheetRow, actor.adminid),
    cellUpdate(sheetName, columns.modifiedByAdminName, sheetRow, actor.adminname),
    cellUpdate(sheetName, columns.modifiedDate, sheetRow, timestamp)
  ];
}

export function buildCreatedAuditCellUpdates(sheetName, sheetRow, auditColumns, actor, timestamp) {
  const columns = auditColumns || {};

  return [
    cellUpdate(sheetName, columns.createdByAdminID, sheetRow, actor.adminid),
    cellUpdate(sheetName, columns.createdByAdminName, sheetRow, actor.adminname),
    cellUpdate(sheetName, columns.createdDate, sheetRow, timestamp)
  ];
}

export async function appendAdminAuditLog(env, preparedAudit, event) {
  return appendAdminAuditLogs(env, preparedAudit, [event]);
}

export async function appendAdminAuditLogs(env, preparedAudit, events = []) {
  if (!preparedAudit || preparedAudit.ok !== true || !preparedAudit.actor) {
    throw new Error("Admin audit was not prepared before the data write");
  }

  const validEvents = events.filter(Boolean);
  if (validEvents.length === 0) return;

  const rows = buildAdminAuditRows(preparedAudit, validEvents);

  await appendGoogleSheetValues(
    env,
    `${ADMIN_AUDIT_LOG_SHEET}!A:I`,
    rows
  );
}

export function buildAdminAuditRows(preparedAudit, events = []) {
  if (!preparedAudit || preparedAudit.ok !== true || !preparedAudit.actor) {
    throw new Error("Admin audit was not prepared before the data write");
  }

  return events.filter(Boolean).map((event, index) => {
    const action = clean(event.action).toUpperCase();
    const recordType = clean(event.recordType).toUpperCase();
    const recordId = clean(event.recordId);

    if (!action || !recordType || !recordId) {
      throw new Error("Audit action, record type and record ID are required");
    }

    return [
      createAuditId(preparedAudit.timestamp, index),
      preparedAudit.timestamp,
      preparedAudit.actor.adminid,
      preparedAudit.actor.adminname,
      preparedAudit.actor.role,
      action,
      recordType,
      recordId,
      normalizeChangedFields(event.changedFields)
    ];
  });
}

export function columnIndexToA1(index) {
  let value = Number(index) + 1;

  if (!Number.isInteger(value) || value < 1) {
    throw new Error("Invalid zero-based sheet column index");
  }

  let result = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }

  return result;
}

function normalizeChangedFields(value) {
  const fields = Array.isArray(value)
    ? value
    : String(value || "").split(",");
  const unique = new Set();

  fields.forEach(field => {
    const cleaned = clean(field);
    if (!cleaned || SENSITIVE_FIELD_PATTERN.test(cleaned)) return;
    unique.add(cleaned);
  });

  return Array.from(unique).sort((left, right) => left.localeCompare(right)).join(", ");
}

function createAuditId(timestamp, index) {
  const randomId = typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.parse(timestamp)}-${index}-${Math.random().toString(36).slice(2, 12)}`;

  return `AUDIT-${randomId}`;
}

function cellUpdate(sheetName, columnIndex, sheetRow, value) {
  const column = columnIndexToA1(columnIndex);
  return {
    range: `${sheetName}!${column}${sheetRow}`,
    majorDimension: "ROWS",
    values: [[value]]
  };
}

function normalizeHeader(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function toPropertyName(header) {
  return header.charAt(0).toLowerCase() + header.slice(1);
}

function clean(value) {
  return String(value ?? "").trim();
}
