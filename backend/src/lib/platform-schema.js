/* M4L V103.1.0.5 - Central schema with optional V102.0.9 Global Course AccessModel extension. */

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
    "ModifiedDate",
    "CourseRecordID"
  ]),
  UserGlobalSubjectAccess: Object.freeze([
    "SubjectAccessID",
    "AccountID",
    "SubjectID",
    "Active",
    "CreatedDate",
    "CreatedByAccountID",
    "CreatedByAccountName",
    "ModifiedByAccountID",
    "ModifiedByAccountName",
    "ModifiedDate"
  ]),
  GlobalSubjectAccessMatrix: Object.freeze([
    "AccountID"
  ]),
  GlobalSubjectAccessPolicy: Object.freeze([
    "SubjectPolicyID",
    "SubjectID",
    "AccessModel",
    "Active",
    "CreatedDate",
    "CreatedByAccountID",
    "CreatedByAccountName",
    "ModifiedByAccountID",
    "ModifiedByAccountName",
    "ModifiedDate"
  ]),
  GlobalSubjectRuns: Object.freeze([
    "RunID",
    "SubjectID",
    "RunName",
    "StartDate",
    "EndDate",
    "Timezone",
    "Active",
    "CreatedDate",
    "CreatedByAccountID",
    "CreatedByAccountName",
    "ModifiedByAccountID",
    "ModifiedByAccountName",
    "ModifiedDate",
    "AccessModel"
  ]),
  GlobalTimetableSessions: Object.freeze([
    "SessionID", "RunID", "SubjectID", "ModuleID", "SessionDate", "StartTime", "EndTime",
    "TeacherAccountID", "ZoomLink", "Active", "CreatedDate", "CreatedByAccountID",
    "CreatedByAccountName", "ModifiedByAccountID", "ModifiedByAccountName", "ModifiedDate"
  ]),
  GlobalTimetableRunState: Object.freeze([
    "RunID", "Stage", "CurrentPublicationID", "CreatedDate", "CreatedByAccountID",
    "CreatedByAccountName", "ModifiedByAccountID", "ModifiedByAccountName", "ModifiedDate"
  ]),
  GlobalTimetablePublications: Object.freeze([
    "PublicationID", "RunID", "SubjectID", "VersionNo", "PublishedDate",
    "PublishedByAccountID", "PublishedByAccountName", "SessionCount"
  ]),
  GlobalTimetableSessionLifecycle: Object.freeze([
    "SessionLifecycleID", "SessionID", "PublicationID", "Status",
    "RescheduledFromSessionID", "RescheduledToSessionID",
    "CreatedDate", "CreatedByAccountID", "CreatedByAccountName",
    "ModifiedByAccountID", "ModifiedByAccountName", "ModifiedDate"
  ]),
  PublishedGlobalTimetableSessions: Object.freeze([
    "PublishedSessionID", "PublicationID", "SourceSessionID", "RunID", "SubjectID", "ModuleID",
    "SessionDate", "StartTime", "EndTime", "TeacherAccountID", "ZoomLink", "PublishedDate",
    "PublishedByAccountID", "PublishedByAccountName", "RunName", "SubjectName", "ModuleName",
    "TeacherName", "Timezone"
  ]),
  AcademyCalendar: Object.freeze([
    "CalendarEventID",
    "EventType",
    "Description",
    "StartDate",
    "EndDate",
    "AlternateDate",
    "TeachingImpact",
    "Active",
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
  GlobalResources: Object.freeze([
    "ResourceID",
    "SubjectID",
    "ModuleID",
    "TaskID",
    "ResourceName",
    "ResourceType",
    "ResourceFormat",
    "ResourceDescription",
    "ResourceLink",
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
  ])
});

export const PLATFORM_CONFIG_KEYS = Object.freeze([
  "AccountLoginBaseUrl",
  "PlatformSchemaVersion",
  "GlobalCurriculumVersion",
  "GlobalTimetableVersion",
  "PlatformTimezone"
]);

export function validatePlatformSheetRows(sheetName, rows) {
  const expectedHeaders = PLATFORM_SHEET_HEADERS[sheetName];
  if (!expectedHeaders) {
    throw new Error(`Unknown Platform Sheet tab: ${sheetName}`);
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error(`${sheetName} is missing its header row`);
  }

  if (sheetName === "GlobalSubjectAccessMatrix") {
    return validateGlobalSubjectAccessMatrixRows(rows);
  }
  if (sheetName === "GlobalSubjectRuns") {
    return validateGlobalSubjectRunRows(rows, expectedHeaders);
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

function validateGlobalSubjectRunRows(rows, expectedHeaders) {
  const requiredHeaders = expectedHeaders.slice(0, -1);
  const headerRow = Array.isArray(rows[0]) ? rows[0] : [];
  const actualRequired = requiredHeaders.map((unused, index) => String(headerRow[index] || "").trim());
  const mismatch = requiredHeaders.findIndex((header, index) => actualRequired[index] !== header);
  if (mismatch !== -1) {
    const actual = actualRequired[mismatch] || "(blank)";
    throw new Error(`GlobalSubjectRuns header ${columnName(mismatch + 1)}1 must be ${requiredHeaders[mismatch]}; found ${actual}`);
  }
  const accessHeader = String(headerRow[requiredHeaders.length] || "").trim();
  if (accessHeader && accessHeader !== "AccessModel") {
    throw new Error(`GlobalSubjectRuns header ${columnName(requiredHeaders.length + 1)}1 must be AccessModel when present; found ${accessHeader}`);
  }
  const extraHeaderIndex = headerRow.findIndex((value, index) => (
    index >= expectedHeaders.length && String(value ?? "").trim() !== ""
  ));
  if (extraHeaderIndex !== -1) {
    throw new Error(`GlobalSubjectRuns has an unexpected header in ${columnName(extraHeaderIndex + 1)}1`);
  }
  const records = rows.slice(1).filter(row => rowHasValue(row)).map((row, rowIndex) => {
    const record = { _rowNumber: rowIndex + 2 };
    expectedHeaders.forEach((header, columnIndex) => {
      record[header] = row?.[columnIndex] ?? "";
    });
    return record;
  });
  Object.defineProperty(records, "_courseAccessSchemaReady", {
    value: accessHeader === "AccessModel",
    enumerable: false
  });
  return records;
}

function validateGlobalSubjectAccessMatrixRows(rows) {
  const headerRow = Array.isArray(rows[0]) ? rows[0] : [];
  const firstHeader = String(headerRow[0] || "").trim();
  if (firstHeader !== "AccountID") {
    throw new Error(`GlobalSubjectAccessMatrix header A1 must be AccountID; found ${firstHeader || "(blank)"}`);
  }

  let lastHeaderIndex = 0;
  headerRow.forEach((value, index) => {
    if (String(value ?? "").trim() !== "") lastHeaderIndex = index;
  });
  const subjectColumns = [];
  const seenSubjects = new Set();
  for (let index = 1; index <= lastHeaderIndex; index += 1) {
    const subjectId = String(headerRow[index] ?? "").trim();
    if (!subjectId) {
      throw new Error(`GlobalSubjectAccessMatrix header ${columnName(index + 1)}1 cannot be blank between subject columns`);
    }
    const normalized = normalizePlatformIdentifier(subjectId);
    if (!normalized || seenSubjects.has(normalized)) {
      throw new Error(`GlobalSubjectAccessMatrix has a blank or duplicate SubjectID header in ${columnName(index + 1)}1`);
    }
    seenSubjects.add(normalized);
    subjectColumns.push(Object.freeze({
      subjectId,
      normalizedSubjectId: normalized,
      columnNumber: index + 1,
      columnName: columnName(index + 1)
    }));
  }

  const records = rows.slice(1).filter(row => rowHasValue(row)).map((row, rowIndex) => {
    const subjectAccess = Object.create(null);
    for (const column of subjectColumns) {
      subjectAccess[column.normalizedSubjectId] = row?.[column.columnNumber - 1] ?? "";
    }
    return {
      _rowNumber: rowIndex + 2,
      AccountID: row?.[0] ?? "",
      _subjectAccess: subjectAccess
    };
  });
  Object.defineProperty(records, "_subjectColumns", {
    value: Object.freeze(subjectColumns),
    enumerable: false
  });
  return records;
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
