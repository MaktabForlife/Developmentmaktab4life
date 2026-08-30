/* M4L V103.1 - Preview-first permanent AccountID links from Reboot operational records to central identity. */

import { requireSystemAdmin } from "../lib/auth.js";
import {
  batchUpdateGoogleSheetValues,
  readGoogleSheetValues
} from "../lib/google-sheets.js";
import { json } from "../lib/http.js";
import {
  getPlatformSpreadsheetId,
  readPlatformSheet
} from "../lib/platform-sheet.js";
import {
  isActivePlatformValue,
  normalizePlatformIdentifier
} from "../lib/platform-schema.js";

const VALID_COURSE_ROLES = new Set(["ADMIN", "SENIOR", "TEACHER", "STUDENT"]);

export async function platformIdentityLinkEndpoint(request, env) {
  const permission = await requireSystemAdmin(request, env);
  if (!permission.ok) return permission.response;

  try {
    const body = await request.json();
    const action = normalizePlatformIdentifier(body.action || "PREVIEW");
    if (action !== "PREVIEW" && action !== "COMMIT") {
      return json({ success: false, error: "Identity-link action must be PREVIEW or COMMIT" }, 400);
    }

    const snapshot = await loadIdentityLinkSnapshot(env, permission.user);
    const previewToken = await signPreviewState(snapshot.fingerprint, env.SESSION_SECRET);
    const response = publicIdentityLinkPreview(snapshot, previewToken);

    if (action === "PREVIEW") {
      return json({
        success: true,
        service: "platform-identity-link",
        version: "103.1",
        mode: "preview",
        ...response
      });
    }

    if (!snapshot.canCommit) {
      return json({
        success: false,
        error: snapshot.linkCurrent
          ? "Identity links are already current"
          : "Identity linking is blocked",
        ...response
      }, 409);
    }

    if (!constantTimeEqual(String(body.previewToken || ""), previewToken)) {
      return json({
        success: false,
        error: "Identity-link data changed. Run Preview Identity Links again."
      }, 409);
    }

    if (String(body.confirmationText || "").trim().toUpperCase() !== snapshot.confirmationText) {
      return json({
        success: false,
        error: `Enter ${snapshot.confirmationText} to confirm identity linking.`
      }, 400);
    }

    const result = await commitIdentityLinkSnapshot(env, snapshot);
    return json({
      success: true,
      service: "platform-identity-link",
      version: "103.1",
      mode: "committed",
      message: "Reboot operational records are now linked to central AccountID values. Existing operational behaviour remains unchanged.",
      ...result,
      centralIdentityLinked: true,
      centralIdentityAuthorityActive: false,
      existingOperationalBehaviourPreserved: true
    });
  } catch (error) {
    return json({
      success: false,
      error: "Platform identity linking failed",
      detail: safeIdentityLinkDetail(error, env)
    }, 503);
  }
}

export async function loadIdentityLinkSnapshot(env, actor) {
  const platformSpreadsheetId = getPlatformSpreadsheetId(env);
  const courseSpreadsheetId = String(env.GOOGLE_SPREADSHEET_ID || "").trim();
  if (!courseSpreadsheetId) {
    throw new Error("Missing GOOGLE_SPREADSHEET_ID Worker variable");
  }

  const [registry, accounts, accessRows, auditRows, adminRows, studentRows] = await Promise.all([
    readPlatformSheet(env, "CourseRegistry"),
    readPlatformSheet(env, "UserAccounts"),
    readPlatformSheet(env, "UserCourseAccess"),
    readPlatformSheet(env, "PlatformAuditLog"),
    readGoogleSheetValues(env, "AdminRecords!A:ZZ", { spreadsheetId: courseSpreadsheetId }),
    readGoogleSheetValues(env, "StudentRecords!A:ZZ", { spreadsheetId: courseSpreadsheetId })
  ]);

  const courseMatches = registry.filter(course => (
    isActivePlatformValue(course.Active) &&
    String(course.SpreadsheetID || "").trim() === courseSpreadsheetId
  ));
  if (courseMatches.length !== 1) {
    throw new Error("The current course Sheet must resolve exactly once in CourseRegistry");
  }

  return buildIdentityLinkSnapshot({
    course: courseMatches[0],
    actor,
    accounts,
    accessRows,
    auditRows,
    adminRows,
    studentRows,
    platformSpreadsheetId,
    courseSpreadsheetId
  });
}

export function buildIdentityLinkSnapshot(input) {
  const blockers = [];
  const warnings = [];
  const excluded = [];
  const courseId = String(input.course.CourseID || "").trim();
  const courseName = String(input.course.CourseName || "").trim();

  const centralState = indexCentralState(input.accounts, input.accessRows, courseId, blockers);
  const staffSheet = parseOperationalSheet("AdminRecords", input.adminRows, blockers, excluded);
  const studentSheet = parseOperationalSheet("StudentRecords", input.studentRows, blockers, excluded);
  const sourceRecords = [...staffSheet.records, ...studentSheet.records];
  const plannedLinks = [];
  const usedAccessRows = new Set();

  for (const source of sourceRecords) {
    if (source.blocked) continue;
    const recordKey = normalizePlatformIdentifier(source.courseRecordId);
    const matches = centralState.accessByCourseRecord.get(recordKey) || [];
    const roleMatches = matches.filter(access => (
      normalizePlatformIdentifier(access.Role) === source.role
    ));

    if (roleMatches.length === 0) {
      const message = matches.length > 0
        ? `${sourceLabel(source)} has central membership data, but its role does not match ${source.role}.`
        : `${sourceLabel(source)} has no matching UserCourseAccess membership. Run/repair central account migration before linking identities.`;
      blockers.push(issue(
        matches.length > 0 ? "COURSE_ROLE_MISMATCH" : "MISSING_CENTRAL_MEMBERSHIP",
        message,
        [publicSourceReference(source)]
      ));
      source.blocked = true;
      continue;
    }

    if (roleMatches.length !== 1) {
      blockers.push(issue(
        "AMBIGUOUS_CENTRAL_MEMBERSHIP",
        `${sourceLabel(source)} resolves to more than one central membership.`,
        [publicSourceReference(source)]
      ));
      source.blocked = true;
      continue;
    }

    const membership = roleMatches[0];
    usedAccessRows.add(Number(membership._rowNumber) || 0);
    const accountIdKey = normalizePlatformIdentifier(membership.AccountID);
    const account = centralState.accountsById.get(accountIdKey);
    if (!account) {
      blockers.push(issue(
        "CENTRAL_ACCOUNT_NOT_FOUND",
        `${sourceLabel(source)} points to a UserCourseAccess AccountID that does not resolve exactly once in UserAccounts.`,
        [publicSourceReference(source)]
      ));
      source.blocked = true;
      continue;
    }

    if (
      normalizePlatformIdentifier(account.UniqueID) !==
      normalizePlatformIdentifier(source.uniqueId)
    ) {
      blockers.push(issue(
        "CENTRAL_UNIQUE_ID_MISMATCH",
        `${sourceLabel(source)} does not match the UniqueID of its central account.`,
        [publicSourceReference(source)]
      ));
      source.blocked = true;
      continue;
    }

    if (
      normalizePlatformIdentifier(account.DisplayName) !==
      normalizePlatformIdentifier(source.displayName)
    ) {
      warnings.push(issue(
        "DISPLAY_NAME_DIFFERS",
        `${sourceLabel(source)} has a different display name from UserAccounts; the AccountID link is still safe because UniqueID and membership match.`,
        [publicSourceReference(source)]
      ));
    }

    if (
      isActivePlatformValue(membership.Active) !== source.active ||
      isActivePlatformValue(account.Active) !== source.active
    ) {
      warnings.push(issue(
        "ACTIVE_STATE_DIFFERS",
        `${sourceLabel(source)} has a different Active state from its central identity or membership. V103.1 will link identity only and will not change either state.`,
        [publicSourceReference(source)]
      ));
    }

    const expectedAccountId = String(account.AccountID || "").trim();
    if (source.existingAccountId) {
      if (
        normalizePlatformIdentifier(source.existingAccountId) !==
        normalizePlatformIdentifier(expectedAccountId)
      ) {
        blockers.push(issue(
          "EXISTING_ACCOUNT_LINK_CONFLICT",
          `${sourceLabel(source)} already contains a different AccountID. V103.1 will never overwrite an existing conflicting identity link.`,
          [publicSourceReference(source)]
        ));
        source.blocked = true;
      } else {
        source.expectedAccountId = expectedAccountId;
        source.linked = true;
      }
      continue;
    }

    source.expectedAccountId = expectedAccountId;
    plannedLinks.push(source);
  }

  addDuplicateIdentityLinkIssues(sourceRecords, blockers);
  addOrphanMembershipIssues(
    centralState.courseAccessRows,
    usedAccessRows,
    sourceRecords,
    blockers
  );

  const headerWrites = [staffSheet, studentSheet].filter(sheet => sheet.needsAccountIdHeader);
  const writeCount = plannedLinks.length + headerWrites.length;
  const canCommit = blockers.length === 0 && writeCount > 0;
  const linkCurrent = blockers.length === 0 && writeCount === 0;
  const confirmationText = `LINK ${normalizePlatformIdentifier(courseId)}`;

  return {
    courseId,
    courseName,
    actor: input.actor,
    accounts: input.accounts,
    accessRows: input.accessRows,
    auditRows: input.auditRows,
    sourceRecords,
    plannedLinks,
    headerWrites,
    staffSheet,
    studentSheet,
    blockers,
    warnings,
    excluded,
    canCommit,
    linkCurrent,
    confirmationText,
    platformSpreadsheetId: input.platformSpreadsheetId,
    courseSpreadsheetId: input.courseSpreadsheetId,
    fingerprint: {
      courseId: normalizePlatformIdentifier(courseId),
      sourceSheets: [staffSheet, studentSheet].map(sheet => ({
        sheetName: sheet.sheetName,
        accountIdColumnIndex: sheet.accountIdColumnIndex,
        needsAccountIdHeader: sheet.needsAccountIdHeader,
        header: sheet.header.map(value => String(value ?? "")),
        records: sheet.records.map(sourceFingerprint)
      })),
      centralAccounts: input.accounts.map(centralAccountFingerprint),
      centralAccess: input.accessRows.map(centralAccessFingerprint)
    }
  };
}

function parseOperationalSheet(sheetName, rows, blockers, excluded) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`${sheetName} is missing its header row`);
  }

  const header = Array.isArray(rows[0]) ? rows[0] : [];
  const normalizedHeaders = header.map(normalizeHeader);
  const accountIdHeaderIndexes = normalizedHeaders
    .map((value, index) => value === "ACCOUNTID" ? index : -1)
    .filter(index => index >= 0);
  if (accountIdHeaderIndexes.length > 1) {
    blockers.push(issue(
      "DUPLICATE_ACCOUNT_ID_HEADER",
      `${sheetName} contains more than one AccountID header.`
    ));
  }

  const headerIndex = indexHeaders(header);
  const isAdmin = sheetName === "AdminRecords";
  const required = isAdmin
    ? ["ADMINID", "USERNAME", "UNIQUEID", "ROLE", "ACTIVE"]
    : ["STUDENTID", "USERNAME", "UNIQUEID", "ACTIVE"];
  for (const requiredHeader of required) {
    if (!headerIndex.has(requiredHeader)) {
      throw new Error(`${sheetName} is missing required header ${requiredHeader}`);
    }
  }

  const existingAccountIdIndex = accountIdHeaderIndexes.length === 1
    ? accountIdHeaderIndexes[0]
    : -1;
  const accountIdColumnIndex = existingAccountIdIndex >= 0
    ? existingAccountIdIndex
    : Math.max(0, lastNonBlankHeaderIndex(header) + 1);
  const needsAccountIdHeader = existingAccountIdIndex < 0;
  if (needsAccountIdHeader) {
    const conflictingRow = rows.slice(1).findIndex(row => (
      Array.isArray(row) && row.slice(accountIdColumnIndex).some(value => cleanCell(value) !== "")
    ));
    if (conflictingRow >= 0) {
      blockers.push(issue(
        "UNHEADED_DATA_CONFLICT",
        `${sheetName} contains data beyond its last named header. Add/repair the missing header before V103.1 can append AccountID safely.`
      ));
    }
  }
  const records = [];

  rows.slice(1).forEach((row, offset) => {
    if (!rowHasValue(row)) return;
    const rowNumber = offset + 2;
    const courseRecordId = cleanCell(row[headerIndex.get(isAdmin ? "ADMINID" : "STUDENTID")]);
    if (!isAdmin && normalizePlatformIdentifier(courseRecordId).startsWith("SYSTEM")) {
      excluded.push(issue(
        "SYSTEM_ROW_EXCLUDED",
        `${sheetName} row ${rowNumber} (${courseRecordId || "system row"}) is excluded from identity linking.`
      ));
      return;
    }

    const displayName = cleanCell(row[headerIndex.get("USERNAME")]);
    const uniqueId = cleanCell(row[headerIndex.get("UNIQUEID")]);
    const role = isAdmin
      ? normalizePlatformIdentifier(row[headerIndex.get("ROLE")])
      : "STUDENT";
    const active = isActivePlatformValue(row[headerIndex.get("ACTIVE")]);
    const existingAccountId = existingAccountIdIndex >= 0
      ? cleanCell(row[existingAccountIdIndex])
      : "";

    const source = {
      sheetName,
      rowNumber,
      courseRecordId,
      displayName,
      uniqueId,
      role,
      active,
      existingAccountId,
      accountIdColumnIndex,
      linked: false,
      expectedAccountId: "",
      blocked: false
    };

    if (!courseRecordId || !displayName || !uniqueId) {
      blockers.push(issue(
        "INCOMPLETE_OPERATIONAL_IDENTITY",
        `${sourceLabel(source)} requires a record ID, display name and UniqueID before it can be linked.`,
        [publicSourceReference(source)]
      ));
      source.blocked = true;
    }
    if (!VALID_COURSE_ROLES.has(role) || (isAdmin && role === "STUDENT")) {
      blockers.push(issue(
        "INVALID_OPERATIONAL_ROLE",
        `${sourceLabel(source)} has an unsupported role.`,
        [publicSourceReference(source)]
      ));
      source.blocked = true;
    }
    records.push(source);
  });

  return {
    sheetName,
    header,
    records,
    accountIdColumnIndex,
    accountIdColumnName: columnName(accountIdColumnIndex + 1),
    needsAccountIdHeader
  };
}

function indexCentralState(accounts, accessRows, courseId, blockers) {
  const accountsById = new Map();
  const uniqueIds = new Set();
  for (const account of accounts) {
    const accountId = normalizePlatformIdentifier(account.AccountID);
    const uniqueId = normalizePlatformIdentifier(account.UniqueID);
    if (!accountId || !uniqueId || accountsById.has(accountId) || uniqueIds.has(uniqueId)) {
      blockers.push(issue(
        "CENTRAL_ACCOUNT_CONFLICT",
        `UserAccounts row ${account._rowNumber} has a blank or duplicate AccountID/UniqueID.`
      ));
      continue;
    }
    accountsById.set(accountId, account);
    uniqueIds.add(uniqueId);
  }

  const courseAccessRows = accessRows.filter(access => (
    normalizePlatformIdentifier(access.CourseID) === normalizePlatformIdentifier(courseId)
  ));
  const accessIds = new Set();
  const accessKeys = new Set();
  const accessByCourseRecord = new Map();
  for (const access of courseAccessRows) {
    const accessId = normalizePlatformIdentifier(access.AccessID);
    const accountId = normalizePlatformIdentifier(access.AccountID);
    const role = normalizePlatformIdentifier(access.Role);
    const recordId = normalizePlatformIdentifier(access.CourseRecordID);
    const key = [accountId, normalizePlatformIdentifier(courseId), role]
      .join("|");
    if (
      !accessId ||
      !accountId ||
      !accountsById.has(accountId) ||
      !VALID_COURSE_ROLES.has(role) ||
      !recordId ||
      accessIds.has(accessId) ||
      accessKeys.has(key)
    ) {
      blockers.push(issue(
        "CENTRAL_ACCESS_CONFLICT",
        `UserCourseAccess row ${access._rowNumber} has invalid or duplicate central membership data.`
      ));
      continue;
    }
    accessIds.add(accessId);
    accessKeys.add(key);
    if (!accessByCourseRecord.has(recordId)) accessByCourseRecord.set(recordId, []);
    accessByCourseRecord.get(recordId).push(access);
  }

  return { accountsById, courseAccessRows, accessByCourseRecord };
}

function addDuplicateIdentityLinkIssues(sourceRecords, blockers) {
  const byExpectedAccount = new Map();
  for (const source of sourceRecords) {
    const accountId = normalizePlatformIdentifier(source.expectedAccountId || source.existingAccountId);
    if (!accountId || source.blocked) continue;
    if (!byExpectedAccount.has(accountId)) byExpectedAccount.set(accountId, []);
    byExpectedAccount.get(accountId).push(source);
  }

  for (const matches of byExpectedAccount.values()) {
    if (matches.length < 2) continue;
    matches.forEach(source => { source.blocked = true; });
    blockers.push(issue(
      "DUPLICATE_OPERATIONAL_ACCOUNT_LINK",
      `${matches.map(sourceLabel).join(" and ")} resolve to the same central AccountID. V103.1 requires one Reboot operational record per central identity.`,
      matches.map(publicSourceReference)
    ));
  }
}

function addOrphanMembershipIssues(courseAccessRows, usedAccessRows, sourceRecords, blockers) {
  const sourceKeys = new Set(sourceRecords.map(source => (
    `${normalizePlatformIdentifier(source.courseRecordId)}|${source.role}`
  )));
  for (const access of courseAccessRows) {
    const rowNumber = Number(access._rowNumber) || 0;
    if (usedAccessRows.has(rowNumber)) continue;
    const role = normalizePlatformIdentifier(access.Role);
    const recordId = normalizePlatformIdentifier(access.CourseRecordID);
    if (!recordId || !VALID_COURSE_ROLES.has(role)) continue;
    const key = `${recordId}|${role}`;
    if (sourceKeys.has(key)) continue;
    blockers.push(issue(
      "ORPHAN_CENTRAL_MEMBERSHIP",
      `UserCourseAccess row ${access._rowNumber} points to ${String(access.CourseRecordID || "").trim()}, but no matching Reboot operational record exists for role ${role}.`
    ));
  }
}

async function commitIdentityLinkSnapshot(env, snapshot) {
  const courseWrites = [];
  for (const sheet of snapshot.headerWrites) {
    courseWrites.push({
      range: `'${sheet.sheetName}'!${sheet.accountIdColumnName}1`,
      majorDimension: "ROWS",
      values: [["AccountID"]]
    });
  }
  for (const source of snapshot.plannedLinks) {
    courseWrites.push({
      range: `'${source.sheetName}'!${columnName(source.accountIdColumnIndex + 1)}${source.rowNumber}`,
      majorDimension: "ROWS",
      values: [[source.expectedAccountId]]
    });
  }

  if (courseWrites.length === 0) {
    throw new Error("Identity-link commit has no course writes");
  }

  await batchUpdateGoogleSheetValues(env, courseWrites, {
    spreadsheetId: snapshot.courseSpreadsheetId
  });

  const timestamp = new Date().toISOString();
  const actorAdminId = normalizePlatformIdentifier(snapshot.actor?.adminid);
  const actorSource = snapshot.sourceRecords.find(source => (
    source.sheetName === "AdminRecords" &&
    normalizePlatformIdentifier(source.courseRecordId) === actorAdminId
  ));
  const actorAccountId = String(
    snapshot.actor?.accountid || actorSource?.expectedAccountId || actorSource?.existingAccountId || ""
  ).trim();
  if (!actorAccountId) {
    throw new Error("The identity-link actor could not resolve a central AccountID");
  }
  const actorName = String(snapshot.actor?.username || "Admin").trim();
  const auditRow = [
    createUuid(),
    timestamp,
    actorAccountId,
    actorName,
    normalizePlatformIdentifier(snapshot.actor?.platformrole || snapshot.actor?.role || "ADMIN"),
    snapshot.courseId,
    "LINK_OPERATIONAL_IDENTITIES",
    "COURSE_IDENTITY_LINK",
    snapshot.courseId,
    JSON.stringify({
      staffLinksWritten: snapshot.plannedLinks.filter(source => source.sheetName === "AdminRecords").length,
      studentLinksWritten: snapshot.plannedLinks.filter(source => source.sheetName === "StudentRecords").length,
      accountIdHeadersAdded: snapshot.headerWrites.map(sheet => sheet.sheetName)
    })
  ];

  await batchUpdateGoogleSheetValues(env, [valueRange(
    "PlatformAuditLog",
    nextPlatformRow(snapshot.auditRows),
    10,
    [auditRow]
  )], {
    spreadsheetId: snapshot.platformSpreadsheetId
  });

  return {
    courseId: snapshot.courseId,
    courseName: snapshot.courseName,
    accountIdHeadersAdded: snapshot.headerWrites.length,
    staffLinksWritten: snapshot.plannedLinks.filter(source => source.sheetName === "AdminRecords").length,
    studentLinksWritten: snapshot.plannedLinks.filter(source => source.sheetName === "StudentRecords").length,
    recordsLinked: snapshot.plannedLinks.length
  };
}

function publicIdentityLinkPreview(snapshot, previewToken) {
  const staffRecords = snapshot.sourceRecords.filter(source => source.sheetName === "AdminRecords");
  const studentRecords = snapshot.sourceRecords.filter(source => source.sheetName === "StudentRecords");
  return {
    courseId: snapshot.courseId,
    courseName: snapshot.courseName,
    sourceCounts: {
      staff: staffRecords.length,
      students: studentRecords.length,
      excludedSystemRows: snapshot.excluded.length
    },
    linkedCounts: {
      staff: staffRecords.filter(source => source.linked).length,
      students: studentRecords.filter(source => source.linked).length
    },
    plannedWrites: {
      accountIdHeaders: snapshot.headerWrites.length,
      staffLinks: snapshot.plannedLinks.filter(source => source.sheetName === "AdminRecords").length,
      studentLinks: snapshot.plannedLinks.filter(source => source.sheetName === "StudentRecords").length
    },
    blockerCount: snapshot.blockers.length,
    warningCount: snapshot.warnings.length,
    blockers: snapshot.blockers,
    warnings: snapshot.warnings,
    canCommit: snapshot.canCommit,
    linkCurrent: snapshot.linkCurrent,
    confirmationText: snapshot.confirmationText,
    previewToken: snapshot.canCommit ? previewToken : "",
    centralIdentityAuthorityActive: false,
    existingOperationalBehaviourPreserved: true
  };
}

function sourceFingerprint(source) {
  return {
    rowNumber: source.rowNumber,
    courseRecordId: normalizePlatformIdentifier(source.courseRecordId),
    displayName: source.displayName,
    uniqueId: normalizePlatformIdentifier(source.uniqueId),
    role: source.role,
    active: source.active,
    existingAccountId: normalizePlatformIdentifier(source.existingAccountId)
  };
}

function centralAccountFingerprint(account) {
  return {
    rowNumber: account._rowNumber,
    accountId: normalizePlatformIdentifier(account.AccountID),
    displayName: String(account.DisplayName || "").trim(),
    uniqueId: normalizePlatformIdentifier(account.UniqueID),
    active: isActivePlatformValue(account.Active),
    platformRole: normalizePlatformIdentifier(account.PlatformRole)
  };
}

function centralAccessFingerprint(access) {
  return {
    rowNumber: access._rowNumber,
    accessId: normalizePlatformIdentifier(access.AccessID),
    accountId: normalizePlatformIdentifier(access.AccountID),
    courseId: normalizePlatformIdentifier(access.CourseID),
    role: normalizePlatformIdentifier(access.Role),
    active: isActivePlatformValue(access.Active),
    courseRecordId: normalizePlatformIdentifier(access.CourseRecordID)
  };
}

async function signPreviewState(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(String(secret || "")),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(JSON.stringify(value))
  );
  return Array.from(new Uint8Array(signature), byte => byte.toString(16).padStart(2, "0")).join("");
}

function valueRange(sheetName, startRow, columnCount, values) {
  const endRow = startRow + values.length - 1;
  return {
    range: `'${sheetName}'!A${startRow}:${columnName(columnCount)}${endRow}`,
    majorDimension: "ROWS",
    values
  };
}

function nextPlatformRow(records) {
  return Math.max(1, ...(records || []).map(record => Number(record._rowNumber) || 1)) + 1;
}

function createUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex.slice(6, 8).join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10).join("")}`;
}

function indexHeaders(headerRow) {
  const result = new Map();
  (Array.isArray(headerRow) ? headerRow : []).forEach((header, index) => {
    const normalized = normalizeHeader(header);
    if (normalized && !result.has(normalized)) result.set(normalized, index);
  });
  return result;
}

function normalizeHeader(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function lastNonBlankHeaderIndex(header) {
  for (let index = header.length - 1; index >= 0; index -= 1) {
    if (cleanCell(header[index])) return index;
  }
  return -1;
}

function rowHasValue(row) {
  return Array.isArray(row) && row.some(value => cleanCell(value) !== "");
}

function cleanCell(value) {
  return String(value ?? "").trim();
}

function sourceLabel(source) {
  return `${source.sheetName} row ${source.rowNumber} (${source.courseRecordId || "record"})`;
}

function publicSourceReference(source) {
  return {
    sheet: source.sheetName,
    row: source.rowNumber,
    recordId: source.courseRecordId,
    displayName: source.displayName,
    role: source.role
  };
}

function issue(code, message, records = []) {
  return { code, message, records };
}

function constantTimeEqual(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}

function columnName(columnNumber) {
  let value = columnNumber;
  let name = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function safeIdentityLinkDetail(error, env) {
  let detail = String(error?.message || "Identity-link error").replace(/[\r\n\t]+/g, " ");
  for (const value of [env?.PLATFORM_SPREADSHEET_ID, env?.GOOGLE_SPREADSHEET_ID]) {
    const sensitive = String(value || "").trim();
    if (sensitive) detail = detail.split(sensitive).join("[redacted]");
  }
  return detail.slice(0, 240);
}
