/* M4L V102 - Authoritative central Platform Sheet schema and context rules. */

export const AUTHORITY_ORDER = Object.freeze([
  "GLOBAL_ADMIN",
  "ADMIN",
  "SENIOR",
  "TEACHER",
  "STUDENT"
]);

export const PLATFORM_SHEET_HEADERS = Object.freeze({
  CourseRegistry: Object.freeze([
    "CourseID",
    "CourseName",
    "SpreadsheetID",
    "Active",
    "SchemaVersion",
    "CreatedDate",
    "CreatedByAccountID",
    "CreatedByAccountName",
    "ModifiedByAccountID",
    "ModifiedByAccountName",
    "ModifiedDate"
  ]),
  UserAccounts: Object.freeze([
    "AccountID",
    "DisplayName",
    "UniqueID",
    "PINSetup",
    "PINHash",
    "Active",
    "LastLoginDate",
    "CreatedDate",
    "CreatedByAccountID",
    "CreatedByAccountName",
    "ModifiedByAccountID",
    "ModifiedByAccountName",
    "ModifiedDate",
    "PlatformRole"
  ]),
  UserCourseAccess: Object.freeze([
    "AccessID",
    "AccountID",
    "CourseID",
    "Role",
    "Active",
    "IsDefault",
    "LastUsedDate",
    "CreatedDate",
    "CreatedByAccountID",
    "CreatedByAccountName",
    "ModifiedByAccountID",
    "ModifiedByAccountName",
    "ModifiedDate"
  ]),
  GlobalSubjectList: Object.freeze([
    "SubjectID",
    "SubjectName",
    "Active",
    "CreatedDate",
    "CreatedByAccountID",
    "CreatedByAccountName",
    "ModifiedByAccountID",
    "ModifiedByAccountName",
    "ModifiedDate"
  ]),
  GlobalModuleList: Object.freeze([
    "ModuleID",
    "SubjectID",
    "ModuleName",
    "SortOrder",
    "Active",
    "CreatedDate",
    "CreatedByAccountID",
    "CreatedByAccountName",
    "ModifiedByAccountID",
    "ModifiedByAccountName",
    "ModifiedDate"
  ]),
  GlobalTaskList: Object.freeze([
    "TaskID",
    "SubjectID",
    "ModuleID",
    "TaskName",
    "Active",
    "CreatedDate",
    "CreatedByAccountID",
    "CreatedByAccountName",
    "ModifiedByAccountID",
    "ModifiedByAccountName",
    "ModifiedDate"
  ]),
  PlatformConfig: Object.freeze([
    "ConfigKey",
    "ConfigValue",
    "UpdatedDate",
    "UpdatedByAccountID",
    "UpdatedByAccountName"
  ]),
  PlatformAuditLog: Object.freeze([
    "AuditID",
    "DateStamp",
    "AccountID",
    "AccountName",
    "Authority",
    "CourseID",
    "Action",
    "RecordType",
    "RecordID",
    "ChangedFields"
  ]),
  TeacherScheduleIndex: Object.freeze([
    "IndexEntryID",
    "SourceSessionID",
    "CourseID",
    "TeacherAccountID",
    "DayOfWeek",
    "StartTime",
    "EndTime",
    "TimeZone",
    "Active",
    "SourceModifiedDate",
    "IndexedDate"
  ])
});

export const PLATFORM_CONFIG_KEYS = Object.freeze([
  "AccountLoginBaseUrl",
  "PlatformSchemaVersion",
  "GlobalCurriculumVersion"
]);

export function validatePlatformSheetRows(sheetName, rows) {
  const expectedHeaders = PLATFORM_SHEET_HEADERS[sheetName];
  if (!expectedHeaders) {
    throw new Error(`Unknown Platform Sheet tab: ${sheetName}`);
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`${sheetName} is missing its header row`);
  }

  const actualHeaders = expectedHeaders.map((unused, index) => String(rows[0]?.[index] || "").trim());
  const mismatch = expectedHeaders.findIndex((header, index) => actualHeaders[index] !== header);
  if (mismatch !== -1) {
    const actual = actualHeaders[mismatch] || "(blank)";
    throw new Error(
      `${sheetName} header ${columnName(mismatch + 1)}1 must be ${expectedHeaders[mismatch]}; found ${actual}`
    );
  }

  const extraHeaderIndex = (Array.isArray(rows[0]) ? rows[0] : []).findIndex((value, index) => (
    index >= expectedHeaders.length && String(value ?? "").trim() !== ""
  ));
  if (extraHeaderIndex !== -1) {
    throw new Error(`${sheetName} has an unexpected header in ${columnName(extraHeaderIndex + 1)}1`);
  }

  return rows.slice(1).filter(row => rowHasValue(row)).map((row, rowIndex) => {
    const record = { _rowNumber: rowIndex + 2 };
    expectedHeaders.forEach((header, columnIndex) => {
      record[header] = row?.[columnIndex] ?? "";
    });
    return record;
  });
}

export function isActivePlatformValue(value) {
  if (value === true || value === 1) return true;
  return ["TRUE", "YES", "ACTIVE", "1"].includes(String(value || "").trim().toUpperCase());
}

export function normalizePlatformIdentifier(value) {
  return String(value || "").trim().toUpperCase();
}

export function authorityRank(role) {
  const rank = AUTHORITY_ORDER.indexOf(normalizePlatformIdentifier(role));
  return rank === -1 ? Number.POSITIVE_INFINITY : rank;
}

export function isGlobalAdminAccount(accountRecord) {
  return Boolean(
    accountRecord &&
    isActivePlatformValue(accountRecord.Active) &&
    normalizePlatformIdentifier(accountRecord.PlatformRole) === "GLOBAL_ADMIN"
  );
}

function rowHasValue(row) {
  return Array.isArray(row) && row.some(value => String(value ?? "").trim() !== "");
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
