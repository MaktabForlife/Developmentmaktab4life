/* M4L V102.2 - Preview-first migration from course-local legacy accounts. */

import { requireSystemAdmin } from "../lib/auth.js";
import {
  batchUpdateGoogleSheetValues,
  readGoogleSheetValues
} from "../lib/google-sheets.js";
import { json } from "../lib/http.js";
import { globalSubjectAccessMatrixColumns } from "../lib/global-subject-delivery.js";
import {
  getPlatformSpreadsheetId,
  readPlatformSheet
} from "../lib/platform-sheet.js";
import {
  isActivePlatformValue,
  normalizePlatformIdentifier
} from "../lib/platform-schema.js";

const SUPPORTED_PLATFORM_SCHEMA_VERSIONS = new Set(["102.0.3", "102.0.4", "102.0.5", "102.0.6", "102.0.7"]);
const VALID_COURSE_ROLES = new Set(["ADMIN", "SENIOR", "TEACHER", "STUDENT"]);
const LEGACY_PIN_HASH_PATTERN = /^[a-f0-9]{64}$/i;
const SALTED_PIN_HASH_PATTERN = /^v2\$pbkdf2-sha256\$\d+\$[A-Za-z0-9_-]+\$[a-f0-9]{64}$/i;

export async function platformAccountMigrationEndpoint(request, env) {
  const permission = await requireSystemAdmin(request, env);
  if (!permission.ok) return permission.response;

  try {
    const body = await request.json();
    const action = normalizePlatformIdentifier(body.action || "PREVIEW");
    const grantGlobalAdmin = body.grantGlobalAdmin === true;
    if (action !== "PREVIEW" && action !== "COMMIT") {
      return json({ success: false, error: "Migration action must be PREVIEW or COMMIT" }, 400);
    }

    const snapshot = await loadMigrationSnapshot(env, permission.user, grantGlobalAdmin);
    const previewToken = await signPreviewState(snapshot.fingerprint, env.SESSION_SECRET);
    const response = publicMigrationPreview(snapshot, previewToken);

    if (action === "PREVIEW") {
      return json({
        success: true,
        service: "platform-account-migration",
        mode: "preview",
        ...response
      });
    }

    if (!snapshot.canCommit) {
      return json({
        success: false,
        error: "Account migration is blocked",
        ...response
      }, 409);
    }

    if (!constantTimeEqual(String(body.previewToken || ""), previewToken)) {
      return json({
        success: false,
        error: "Migration data changed. Run Preview Account Migration again."
      }, 409);
    }

    if (String(body.confirmationText || "").trim().toUpperCase() !== snapshot.confirmationText) {
      return json({
        success: false,
        error: `Enter ${snapshot.confirmationText} to confirm the migration.`
      }, 400);
    }

    const result = await commitMigrationSnapshot(env, snapshot);
    return json({
      success: true,
      service: "platform-account-migration",
      mode: "committed",
      message: "Central account migration completed. Existing login routes remain active.",
      ...result,
      centralAccountVerificationAvailable: true,
      unifiedOperationalAccessActive: false
    });
  } catch (error) {
    return json({
      success: false,
      error: "Platform account migration failed",
      detail: safeMigrationDetail(error, env)
    }, 503);
  }
}

export async function loadMigrationSnapshot(env, actor, grantGlobalAdmin) {
  const platformSpreadsheetId = getPlatformSpreadsheetId(env);
  const currentCourseSpreadsheetId = String(env.GOOGLE_SPREADSHEET_ID || "").trim();
  if (!currentCourseSpreadsheetId) {
    throw new Error("Missing GOOGLE_SPREADSHEET_ID Worker variable");
  }

  const [registry, config, centralAccounts, centralAccess, centralGlobalAccessMatrix, centralAudit] = await Promise.all([
    readPlatformSheet(env, "CourseRegistry"),
    readPlatformSheet(env, "PlatformConfig"),
    readPlatformSheet(env, "UserAccounts"),
    readPlatformSheet(env, "UserCourseAccess"),
    readPlatformSheet(env, "GlobalSubjectAccessMatrix"),
    readPlatformSheet(env, "PlatformAuditLog")
  ]);
  assertMigrationSchemaVersion(config);

  const courseMatches = registry.filter(course => (
    isActivePlatformValue(course.Active) &&
    String(course.SpreadsheetID || "").trim() === currentCourseSpreadsheetId
  ));
  if (courseMatches.length !== 1) {
    throw new Error("The current course Sheet must resolve exactly once in CourseRegistry");
  }
  const course = courseMatches[0];

  const [adminRows, studentRows] = await Promise.all([
    readGoogleSheetValues(env, "AdminRecords!A:ZZ", { spreadsheetId: currentCourseSpreadsheetId }),
    readGoogleSheetValues(env, "StudentRecords!A:ZZ", { spreadsheetId: currentCourseSpreadsheetId })
  ]);

  return buildMigrationSnapshot({
    course,
    actor,
    grantGlobalAdmin,
    adminRows,
    studentRows,
    centralAccounts,
    centralAccess,
    centralGlobalAccessMatrix,
    centralAudit,
    platformSpreadsheetId
  });
}

export function buildMigrationSnapshot(input) {
  const blockers = [];
  const warnings = [];
  const excluded = [];
  const sourceAccounts = [
    ...parseLegacyAccounts("AdminRecords", input.adminRows, blockers, warnings, excluded),
    ...parseLegacyAccounts("StudentRecords", input.studentRows, blockers, warnings, excluded)
  ];
  const courseId = String(input.course.CourseID || "").trim();
  const courseName = String(input.course.CourseName || "").trim();
  const actorAdminId = normalizePlatformIdentifier(input.actor?.adminid);
  const actorSource = sourceAccounts.find(record => (
    record.sourceSheet === "AdminRecords" &&
    normalizePlatformIdentifier(record.courseRecordId) === actorAdminId
  ));

  if (!actorSource) {
    blockers.push(issue(
      "CURRENT_ADMIN_NOT_FOUND",
      "The signed-in Admin could not be resolved in the current course AdminRecords sheet."
    ));
  }

  addDuplicateSourceIssues(sourceAccounts, blockers);
  const centralState = indexCentralState(input.centralAccounts, input.centralAccess, blockers);
  const newAccounts = [];
  const newAccess = [];
  const platformRoleUpdates = [];

  for (const source of sourceAccounts) {
    if (source.blocked) continue;
    const existingAccount = centralState.accountsByUniqueId.get(source.uniqueIdKey);
    const displayNameMatches = centralState.accountsByDisplayName.get(
      normalizePlatformIdentifier(source.displayName).replace(/\s+/g, " ")
    ) || [];
    if (!existingAccount && displayNameMatches.length > 0) {
      blockers.push(issue(
        "POSSIBLE_EXISTING_CENTRAL_IDENTITY",
        `${sourceLabel(source)} has the same display name as an existing central account but a different UniqueID. Review and link the identity manually before migration.`,
        [publicSourceReference(source)]
      ));
      source.blocked = true;
      continue;
    }
    const accountRef = existingAccount
      ? { kind: "existing", accountId: String(existingAccount.AccountID || "").trim() }
      : { kind: "new", sourceKey: source.sourceKey };

    if (!existingAccount) {
      newAccounts.push({ source, platformRole: "" });
    } else if (
      normalizePlatformIdentifier(existingAccount.DisplayName) !==
      normalizePlatformIdentifier(source.displayName)
    ) {
      warnings.push(issue(
        "CENTRAL_DISPLAY_NAME_PRESERVED",
        `${sourceLabel(source)} matches an existing central UniqueID; the central display name will be preserved.`,
        [publicSourceReference(source)]
      ));
    }

    const accountKey = existingAccount
      ? normalizePlatformIdentifier(existingAccount.AccountID)
      : `NEW:${source.sourceKey}`;
    const accessKey = `${accountKey}|${normalizePlatformIdentifier(courseId)}|${source.role}`;
    const existingAccess = centralState.accessByKey.get(accessKey);
    if (existingAccess) {
      if (
        normalizePlatformIdentifier(existingAccess.CourseRecordID) !==
        normalizePlatformIdentifier(source.courseRecordId)
      ) {
        blockers.push(issue(
          "COURSE_RECORD_LINK_CONFLICT",
          `${sourceLabel(source)} conflicts with the existing CourseRecordID for this central membership.`,
          [publicSourceReference(source)]
        ));
      }
    } else {
      newAccess.push({ source, accountRef });
    }
  }

  const existingGlobalAdmins = input.centralAccounts.filter(account => (
    isActivePlatformValue(account.Active) &&
    normalizePlatformIdentifier(account.PlatformRole) === "GLOBAL_ADMIN"
  ));
  if (input.grantGlobalAdmin && actorSource && !actorSource.blocked) {
    const actorExisting = centralState.accountsByUniqueId.get(actorSource.uniqueIdKey);
    if (actorExisting) {
      if (normalizePlatformIdentifier(actorExisting.PlatformRole) !== "GLOBAL_ADMIN") {
        platformRoleUpdates.push({
          rowNumber: actorExisting._rowNumber,
          accountId: String(actorExisting.AccountID || "").trim()
        });
      }
    } else {
      const actorNew = newAccounts.find(item => item.source.sourceKey === actorSource.sourceKey);
      if (actorNew) actorNew.platformRole = "GLOBAL_ADMIN";
    }
  }

  if (existingGlobalAdmins.length === 0 && !input.grantGlobalAdmin) {
    blockers.push(issue(
      "GLOBAL_ADMIN_REQUIRED",
      "The first migration must grant GLOBAL_ADMIN to the currently signed-in Admin."
    ));
  }

  const writeCount = newAccounts.length + newAccess.length + platformRoleUpdates.length;
  const canCommit = blockers.length === 0 && writeCount > 0;
  const migrationCurrent = blockers.length === 0 && writeCount === 0;
  const confirmationText = `MIGRATE ${normalizePlatformIdentifier(courseId)}`;
  const fingerprint = {
    courseId: normalizePlatformIdentifier(courseId),
    actorAdminId,
    grantGlobalAdmin: input.grantGlobalAdmin === true,
    sourceAccounts: sourceAccounts.map(source => ({
      sourceKey: source.sourceKey,
      uniqueId: source.uniqueIdKey,
      displayName: source.displayName,
      pinSetup: source.pinSetup,
      pinHash: source.pinHash,
      role: source.role,
      courseRecordId: source.courseRecordId,
      active: source.active,
      createdDate: source.createdDate,
      lastLoginDate: source.lastLoginDate
    })),
    centralAccounts: input.centralAccounts.map(record => centralFingerprint(record)),
    centralAccess: input.centralAccess.map(record => centralFingerprint(record)),
    centralGlobalAccessMatrix: globalAccessMatrixFingerprint(input.centralGlobalAccessMatrix)
  };

  return {
    courseId,
    courseName,
    actor: input.actor,
    actorSource,
    grantGlobalAdmin: input.grantGlobalAdmin === true,
    sourceAccounts,
    newAccounts,
    newAccess,
    platformRoleUpdates,
    blockers,
    warnings,
    excluded,
    centralAccounts: input.centralAccounts,
    centralAccess: input.centralAccess,
    centralGlobalAccessMatrix: input.centralGlobalAccessMatrix,
    centralAudit: input.centralAudit,
    platformSpreadsheetId: input.platformSpreadsheetId,
    canCommit,
    migrationCurrent,
    confirmationText,
    fingerprint
  };
}

function parseLegacyAccounts(sheetName, rows, blockers, warnings, excluded) {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`${sheetName} is missing its header row`);
  }
  const headerIndex = indexHeaders(rows[0]);
  const isAdmin = sheetName === "AdminRecords";
  const required = isAdmin
    ? ["ADMINID", "USERNAME", "UNIQUEID", "PINSETUP", "PINHASH", "ROLE", "ACTIVE"]
    : ["STUDENTID", "USERNAME", "UNIQUEID", "PINSETUP", "PINHASH", "ACTIVE"];
  for (const header of required) {
    if (!headerIndex.has(header)) {
      throw new Error(`${sheetName} is missing required header ${header}`);
    }
  }

  const output = [];
  rows.slice(1).forEach((row, offset) => {
    if (!rowHasValue(row)) return;
    const rowNumber = offset + 2;
    const recordId = cleanCell(row[headerIndex.get(isAdmin ? "ADMINID" : "STUDENTID")]);
    const displayName = cleanCell(row[headerIndex.get("USERNAME")]);
    const uniqueId = cleanCell(row[headerIndex.get("UNIQUEID")]);
    const role = isAdmin
      ? normalizePlatformIdentifier(row[headerIndex.get("ROLE")])
      : "STUDENT";

    if (!isAdmin && normalizePlatformIdentifier(recordId).startsWith("SYSTEM")) {
      excluded.push(issue(
        "SYSTEM_ROW_EXCLUDED",
        `${sheetName} row ${rowNumber} (${recordId || "system row"}) is excluded from account migration.`
      ));
      return;
    }

    if (!recordId || !displayName || !uniqueId) {
      blockers.push(issue(
        "INCOMPLETE_SOURCE_ACCOUNT",
        `${sheetName} row ${rowNumber} requires a record ID, display name and UniqueID.`,
        [{ sheet: sheetName, row: rowNumber, recordId, role }]
      ));
      return;
    }
    if (!VALID_COURSE_ROLES.has(role) || (isAdmin && role === "STUDENT")) {
      blockers.push(issue(
        "INVALID_SOURCE_ROLE",
        `${sheetName} row ${rowNumber} has an unsupported role.`,
        [{ sheet: sheetName, row: rowNumber, recordId, role }]
      ));
      return;
    }

    const sourceKey = `${sheetName}:${rowNumber}`;
    const requestedPinSetup = isActivePlatformValue(row[headerIndex.get("PINSETUP")]);
    const rawPinHash = cleanCell(row[headerIndex.get("PINHASH")]);
    const pinHashSupported = isSupportedPinHash(rawPinHash);
    const pinSetup = requestedPinSetup && pinHashSupported;
    const pinHash = pinSetup ? rawPinHash : "";
    if (requestedPinSetup && !pinHashSupported) {
      warnings.push(issue(
        "PIN_RESET_REQUIRED",
        `${sheetName} row ${rowNumber} (${recordId}) has PINSetup without a supported PIN hash; the central account will require PIN setup.`,
        [{ sheet: sheetName, row: rowNumber, recordId, role }]
      ));
    }

    output.push({
      sourceKey,
      sourceSheet: sheetName,
      sourceRow: rowNumber,
      courseRecordId: recordId,
      displayName,
      uniqueId,
      uniqueIdKey: normalizePlatformIdentifier(uniqueId),
      role,
      pinSetup,
      pinHash,
      active: isActivePlatformValue(row[headerIndex.get("ACTIVE")]),
      createdDate: cleanCell(readOptional(row, headerIndex, "CREATEDATE")),
      lastLoginDate: cleanCell(readOptional(row, headerIndex, "LASTLOGIN")),
      blocked: false
    });
  });
  return output;
}

function addDuplicateSourceIssues(sourceAccounts, blockers) {
  const byUniqueId = groupBy(sourceAccounts, source => source.uniqueIdKey);
  for (const matches of byUniqueId.values()) {
    if (matches.length < 2) continue;
    matches.forEach(source => { source.blocked = true; });
    blockers.push(issue(
      "DUPLICATE_SOURCE_UNIQUE_ID",
      `${matches.map(sourceLabel).join(" and ")} share the same UniqueID. Change one legacy record before migration; accounts are never merged automatically.`,
      matches.map(publicSourceReference)
    ));
  }

  const byRecord = groupBy(sourceAccounts, source => (
    `${source.sourceSheet}|${normalizePlatformIdentifier(source.courseRecordId)}`
  ));
  for (const matches of byRecord.values()) {
    if (matches.length < 2) continue;
    matches.forEach(source => { source.blocked = true; });
    blockers.push(issue(
      "DUPLICATE_SOURCE_RECORD_ID",
      `${matches.map(sourceLabel).join(" and ")} duplicate the same course-local record ID.`,
      matches.map(publicSourceReference)
    ));
  }

  const byDisplayName = groupBy(sourceAccounts, source => (
    normalizePlatformIdentifier(source.displayName).replace(/\s+/g, " ")
  ));
  for (const matches of byDisplayName.values()) {
    const sourceSheets = new Set(matches.map(source => source.sourceSheet));
    const uniqueIds = new Set(matches.map(source => source.uniqueIdKey));
    if (matches.length < 2 || sourceSheets.size < 2 || uniqueIds.size < 2) continue;
    matches.forEach(source => { source.blocked = true; });
    blockers.push(issue(
      "POSSIBLE_MIXED_ROLE_IDENTITY",
      `${matches.map(sourceLabel).join(" and ")} have the same display name but different UniqueIDs. Review whether they are one person before migration; accounts are never merged by name.`,
      matches.map(publicSourceReference)
    ));
  }
}

function indexCentralState(accounts, accessRows, blockers) {
  const accountsByUniqueId = new Map();
  const accountsByDisplayName = new Map();
  const accountIds = new Set();
  for (const account of accounts) {
    const accountId = normalizePlatformIdentifier(account.AccountID);
    const uniqueId = normalizePlatformIdentifier(account.UniqueID);
    const platformRole = normalizePlatformIdentifier(account.PlatformRole);
    if (
      !accountId ||
      !uniqueId ||
      !cleanCell(account.DisplayName) ||
      (platformRole && platformRole !== "GLOBAL_ADMIN") ||
      accountIds.has(accountId) ||
      accountsByUniqueId.has(uniqueId)
    ) {
      blockers.push(issue(
        "CENTRAL_ACCOUNT_CONFLICT",
        `UserAccounts row ${account._rowNumber} has an invalid or duplicate central identity.`
      ));
      continue;
    }
    accountIds.add(accountId);
    accountsByUniqueId.set(uniqueId, account);
    const nameKey = normalizePlatformIdentifier(account.DisplayName).replace(/\s+/g, " ");
    if (!accountsByDisplayName.has(nameKey)) accountsByDisplayName.set(nameKey, []);
    accountsByDisplayName.get(nameKey).push(account);
  }

  const accessByKey = new Map();
  const courseRecords = new Set();
  const accessIds = new Set();
  for (const access of accessRows) {
    const accessId = normalizePlatformIdentifier(access.AccessID);
    const accountId = normalizePlatformIdentifier(access.AccountID);
    const role = normalizePlatformIdentifier(access.Role);
    const key = [access.AccountID, access.CourseID, access.Role]
      .map(normalizePlatformIdentifier)
      .join("|");
    const courseRecordKey = [access.CourseID, access.Role, access.CourseRecordID]
      .map(normalizePlatformIdentifier)
      .join("|");
    if (
      !normalizePlatformIdentifier(access.AccessID) ||
      !accountIds.has(accountId) ||
      !VALID_COURSE_ROLES.has(role) ||
      !normalizePlatformIdentifier(access.CourseRecordID) ||
      accessIds.has(accessId) ||
      accessByKey.has(key) ||
      courseRecords.has(courseRecordKey)
    ) {
      blockers.push(issue(
        "CENTRAL_ACCESS_CONFLICT",
        `UserCourseAccess row ${access._rowNumber} has a blank identifier or duplicate central/course-local mapping.`
      ));
      continue;
    }
    accessIds.add(accessId);
    accessByKey.set(key, access);
    courseRecords.add(courseRecordKey);
  }
  return { accountsByUniqueId, accountsByDisplayName, accessByKey };
}

async function commitMigrationSnapshot(env, snapshot) {
  const timestamp = new Date().toISOString();
  const accountIdsBySource = new Map();
  for (const account of snapshot.newAccounts) {
    accountIdsBySource.set(account.source.sourceKey, createUuid());
  }
  for (const access of snapshot.newAccess) {
    if (access.accountRef.kind === "existing") continue;
    if (!accountIdsBySource.has(access.accountRef.sourceKey)) {
      throw new Error("A new course access row could not resolve its central AccountID");
    }
  }

  const actorExisting = snapshot.actorSource
    ? snapshot.centralAccounts.find(account => (
      normalizePlatformIdentifier(account.UniqueID) === snapshot.actorSource.uniqueIdKey
    ))
    : null;
  const actorAccountId = actorExisting
    ? String(actorExisting.AccountID || "").trim()
    : accountIdsBySource.get(snapshot.actorSource?.sourceKey);
  if (!actorAccountId) {
    throw new Error("The migration actor could not resolve a central AccountID");
  }
  const actorName = String(snapshot.actor?.username || snapshot.actorSource?.displayName || "Admin").trim();

  const accountRows = snapshot.newAccounts.map(item => {
    const source = item.source;
    return [
      accountIdsBySource.get(source.sourceKey),
      source.displayName,
      source.uniqueId,
      source.pinSetup,
      source.pinHash,
      source.active,
      source.lastLoginDate,
      source.createdDate || timestamp,
      actorAccountId,
      actorName,
      "",
      "",
      "",
      item.platformRole
    ];
  });

  const accessRows = snapshot.newAccess.map(item => {
    const source = item.source;
    const accountId = item.accountRef.kind === "existing"
      ? item.accountRef.accountId
      : accountIdsBySource.get(item.accountRef.sourceKey);
    const hasExistingDefault = snapshot.centralAccess.some(access => (
      normalizePlatformIdentifier(access.AccountID) === normalizePlatformIdentifier(accountId) &&
      isActivePlatformValue(access.Active) &&
      isActivePlatformValue(access.IsDefault)
    ));
    return [
      createUuid(),
      accountId,
      snapshot.courseId,
      source.role,
      source.active,
      !hasExistingDefault,
      source.lastLoginDate,
      source.createdDate || timestamp,
      actorAccountId,
      actorName,
      "",
      "",
      "",
      source.courseRecordId
    ];
  });

  const matrixColumns = globalSubjectAccessMatrixColumns(snapshot.centralGlobalAccessMatrix);
  const globalAccessMatrixRows = snapshot.newAccounts.map(item => [
    accountIdsBySource.get(item.source.sourceKey),
    ...matrixColumns.map(() => false)
  ]);

  const writes = [];
  if (accountRows.length > 0) {
    const startRow = nextPlatformRow(snapshot.centralAccounts);
    writes.push(valueRange("UserAccounts", startRow, 14, accountRows));
  }
  if (globalAccessMatrixRows.length > 0) {
    const startRow = nextPlatformRow(snapshot.centralGlobalAccessMatrix);
    writes.push(valueRange("GlobalSubjectAccessMatrix", startRow, 1 + matrixColumns.length, globalAccessMatrixRows));
  }
  if (accessRows.length > 0) {
    const startRow = nextPlatformRow(snapshot.centralAccess);
    writes.push(valueRange("UserCourseAccess", startRow, 14, accessRows));
  }
  for (const update of snapshot.platformRoleUpdates) {
    writes.push({
      range: `'UserAccounts'!N${update.rowNumber}`,
      majorDimension: "ROWS",
      values: [["GLOBAL_ADMIN"]]
    });
  }

  const auditRow = [
    createUuid(),
    timestamp,
    actorAccountId,
    actorName,
    snapshot.grantGlobalAdmin ? "GLOBAL_ADMIN" : "ADMIN",
    snapshot.courseId,
    "MIGRATE_COURSE_ACCOUNTS",
    "COURSE_ACCOUNT_MIGRATION",
    snapshot.courseId,
    JSON.stringify({
      userAccountsCreated: accountRows.length,
      globalAccessMatrixRowsCreated: globalAccessMatrixRows.length,
      courseAccessCreated: accessRows.length,
      platformRolesUpdated: snapshot.platformRoleUpdates.length
    })
  ];
  writes.push(valueRange("PlatformAuditLog", nextPlatformRow(snapshot.centralAudit), 10, [auditRow]));

  await batchUpdateGoogleSheetValues(env, writes, {
    spreadsheetId: snapshot.platformSpreadsheetId
  });
  return {
    courseId: snapshot.courseId,
    courseName: snapshot.courseName,
    accountsCreated: accountRows.length,
    globalAccessMatrixRowsCreated: globalAccessMatrixRows.length,
    courseAccessCreated: accessRows.length,
    platformRolesUpdated: snapshot.platformRoleUpdates.length,
    globalAdminGranted: snapshot.grantGlobalAdmin
  };
}

function publicMigrationPreview(snapshot, previewToken) {
  return {
    courseId: snapshot.courseId,
    courseName: snapshot.courseName,
    sourceCounts: {
      staff: snapshot.sourceAccounts.filter(record => record.sourceSheet === "AdminRecords").length,
      students: snapshot.sourceAccounts.filter(record => record.sourceSheet === "StudentRecords").length,
      excludedSystemRows: snapshot.excluded.length
    },
    plannedWrites: {
      userAccounts: snapshot.newAccounts.length,
      globalAccessMatrixRows: snapshot.newAccounts.length,
      courseAccess: snapshot.newAccess.length,
      platformRoleUpdates: snapshot.platformRoleUpdates.length
    },
    blockerCount: snapshot.blockers.length,
    warningCount: snapshot.warnings.length,
    blockers: snapshot.blockers,
    warnings: snapshot.warnings,
    canCommit: snapshot.canCommit,
    migrationCurrent: snapshot.migrationCurrent,
    confirmationText: snapshot.confirmationText,
    previewToken: snapshot.canCommit ? previewToken : "",
    existingLoginsRemainActive: true,
    centralAccountVerificationAvailable: true,
    unifiedOperationalAccessActive: false
  };
}

function assertMigrationSchemaVersion(configRows) {
  const matches = configRows.filter(row => (
    normalizePlatformIdentifier(row.ConfigKey) === "PLATFORMSCHEMAVERSION"
  ));
  const schemaVersion = String(matches[0]?.ConfigValue || "").trim();
  if (matches.length !== 1 || !SUPPORTED_PLATFORM_SCHEMA_VERSIONS.has(schemaVersion)) {
    throw new Error("PlatformConfig PlatformSchemaVersion is not supported by this migration release");
  }
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

function isSupportedPinHash(value) {
  const text = String(value || "").trim();
  return SALTED_PIN_HASH_PATTERN.test(text) || LEGACY_PIN_HASH_PATTERN.test(text);
}

function indexHeaders(headerRow) {
  return new Map((Array.isArray(headerRow) ? headerRow : []).map((header, index) => (
    [normalizeHeader(header), index]
  )).filter(([header]) => header));
}

function normalizeHeader(value) {
  return String(value || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function readOptional(row, headers, header) {
  return headers.has(header) ? row[headers.get(header)] : "";
}

function cleanCell(value) {
  return String(value ?? "").trim();
}

function rowHasValue(row) {
  return Array.isArray(row) && row.some(value => cleanCell(value) !== "");
}

function groupBy(values, keyFor) {
  const groups = new Map();
  for (const value of values) {
    const key = keyFor(value);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(value);
  }
  return groups;
}

function sourceLabel(source) {
  return `${source.sourceSheet} row ${source.sourceRow} (${source.courseRecordId})`;
}

function publicSourceReference(source) {
  return {
    sheet: source.sourceSheet,
    row: source.sourceRow,
    recordId: source.courseRecordId,
    displayName: source.displayName,
    role: source.role
  };
}

function issue(code, message, records = []) {
  return { code, message, records };
}

function globalAccessMatrixFingerprint(rows) {
  return {
    subjects: globalSubjectAccessMatrixColumns(rows).map(column => column.subjectId),
    accounts: (rows || []).map(row => normalizePlatformIdentifier(row.AccountID))
  };
}

function centralFingerprint(record) {
  return Object.fromEntries(Object.entries(record).sort(([left], [right]) => left.localeCompare(right)));
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

function safeMigrationDetail(error, env) {
  let detail = String(error?.message || "Migration error").replace(/[\r\n\t]+/g, " ");
  for (const value of [env?.PLATFORM_SPREADSHEET_ID, env?.GOOGLE_SPREADSHEET_ID]) {
    const sensitive = String(value || "").trim();
    if (sensitive) detail = detail.split(sensitive).join("[redacted]");
  }
  return detail.slice(0, 240);
}
