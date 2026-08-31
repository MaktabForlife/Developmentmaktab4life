/* M4L V104.5.1 - Central schema with derived/explicit Global Course scheduling extension. */

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
    "AccessModel",
    "ScheduleMode",
    "ScheduleDefinition"
  ]),
  GlobalTimetableSessions: Object.freeze([
    "SessionID", "RunID", "SubjectID", "ModuleID", "SessionDate", "StartTime", "EndTime",
    "TeacherAccountID", "ZoomLink", "Active", "CreatedDate", "CreatedByAccountID",
    "CreatedByAccountName", "ModifiedByAccountID", "ModifiedByAccountName", "ModifiedDate",
    "SessionKind", "ScheduleRuleKey", "OccurrenceDate", "SessionDescription"
  ]),
  GlobalTimetableRunState: Object.freeze([
    "RunID", "Stage", "CurrentPublicationID", "CreatedDate", "CreatedByAccountID",
    "CreatedByAccountName", "ModifiedByAccountID", "ModifiedByAccountName", "ModifiedDate"
  ]),
  GlobalTimetablePublications: Object.freeze([
    "PublicationID", "RunID", "SubjectID", "VersionNo", "PublishedDate",
    "PublishedByAccountID", "PublishedByAccountName", "SessionCount",
    "ScheduleMode", "PublishStartDate", "PublishEndDate", "ScheduleDefinition",
    "RunName", "SubjectName", "Timezone"
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
    "TeacherName", "Timezone", "SessionKind", "ScheduleRuleKey", "OccurrenceDate", "SessionDescription"
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
  if (["GlobalTimetableSessions", "GlobalTimetablePublications", "PublishedGlobalTimetableSessions"].includes(sheetName)) {
    return validateCourseSchedulingEvolutionRows(sheetName, rows, expectedHeaders);
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
  const legacyHeaders = expectedHeaders.slice(0, 13);
  const headerRow = Array.isArray(rows[0]) ? rows[0] : [];
  assertHeaderPrefix("GlobalSubjectRuns", headerRow, legacyHeaders);

  const accessHeader = String(headerRow[13] || "").trim();
  const scheduleModeHeader = String(headerRow[14] || "").trim();
  const scheduleDefinitionHeader = String(headerRow[15] || "").trim();
  if (accessHeader && accessHeader !== "AccessModel") {
    throw new Error(`GlobalSubjectRuns header N1 must be AccessModel when present; found ${accessHeader}`);
  }
  if (scheduleModeHeader && scheduleModeHeader !== "ScheduleMode") {
    throw new Error(`GlobalSubjectRuns header O1 must be ScheduleMode when present; found ${scheduleModeHeader}`);
  }
  if (scheduleDefinitionHeader && scheduleDefinitionHeader !== "ScheduleDefinition") {
    throw new Error(`GlobalSubjectRuns header P1 must be ScheduleDefinition when present; found ${scheduleDefinitionHeader}`);
  }
  if ((scheduleModeHeader || scheduleDefinitionHeader) && accessHeader !== "AccessModel") {
    throw new Error("GlobalSubjectRuns scheduling columns require AccessModel first");
  }
  if (Boolean(scheduleModeHeader) !== Boolean(scheduleDefinitionHeader)) {
    throw new Error("GlobalSubjectRuns ScheduleMode and ScheduleDefinition must be added together");
  }
  assertNoUnexpectedHeaders("GlobalSubjectRuns", headerRow, expectedHeaders.length);

  const records = rowsToRecords(rows, expectedHeaders);
  Object.defineProperty(records, "_courseAccessSchemaReady", {
    value: accessHeader === "AccessModel",
    enumerable: false
  });
  Object.defineProperty(records, "_courseScheduleSchemaReady", {
    value: scheduleModeHeader === "ScheduleMode" && scheduleDefinitionHeader === "ScheduleDefinition",
    enumerable: false
  });
  return records;
}

function validateCourseSchedulingEvolutionRows(sheetName, rows, expectedHeaders) {
  const legacyLengths = {
    GlobalTimetableSessions: 16,
    GlobalTimetablePublications: 8,
    PublishedGlobalTimetableSessions: 19
  };
  const legacyLength = legacyLengths[sheetName];
  const legacyHeaders = expectedHeaders.slice(0, legacyLength);
  const headerRow = Array.isArray(rows[0]) ? rows[0] : [];
  assertHeaderPrefix(sheetName, headerRow, legacyHeaders);

  const optionalHeaders = expectedHeaders.slice(legacyLength);
  const hasSessionDescription = ["GlobalTimetableSessions", "PublishedGlobalTimetableSessions"].includes(sheetName);
  const scheduleHeaders = hasSessionDescription ? optionalHeaders.slice(0, -1) : optionalHeaders;
  const descriptionHeader = hasSessionDescription ? optionalHeaders.at(-1) : "";
  const actualSchedule = scheduleHeaders.map((unused, index) => String(headerRow[legacyLength + index] || "").trim());
  const anySchedule = actualSchedule.some(Boolean);
  const scheduleReady = actualSchedule.every((value, index) => value === scheduleHeaders[index]);
  if (anySchedule && !scheduleReady) {
    const mismatch = actualSchedule.findIndex((value, index) => value !== scheduleHeaders[index]);
    throw new Error(`${sheetName} header ${columnName(legacyLength + mismatch + 1)}1 must be ${scheduleHeaders[mismatch]}; found ${actualSchedule[mismatch] || "(blank)"}`);
  }

  let sessionDescriptionReady = !hasSessionDescription;
  if (hasSessionDescription) {
    const descriptionIndex = legacyLength + scheduleHeaders.length;
    const actualDescription = String(headerRow[descriptionIndex] || "").trim();
    if (actualDescription && actualDescription !== descriptionHeader) {
      throw new Error(`${sheetName} header ${columnName(descriptionIndex + 1)}1 must be ${descriptionHeader}; found ${actualDescription}`);
    }
    if (actualDescription && !scheduleReady) {
      throw new Error(`${sheetName} SessionDescription requires the V104.5 scheduling columns first`);
    }
    sessionDescriptionReady = scheduleReady && actualDescription === descriptionHeader;
  }

  assertNoUnexpectedHeaders(sheetName, headerRow, expectedHeaders.length);
  const records = rowsToRecords(rows, expectedHeaders);
  Object.defineProperty(records, "_courseScheduleSchemaReady", { value: scheduleReady, enumerable: false });
  Object.defineProperty(records, "_sessionDescriptionSchemaReady", { value: sessionDescriptionReady, enumerable: false });
  return records;
}

function assertHeaderPrefix(sheetName, headerRow, expectedHeaders) {
  const actual = expectedHeaders.map((unused, index) => String(headerRow[index] || "").trim());
  const mismatch = expectedHeaders.findIndex((header, index) => actual[index] !== header);
  if (mismatch !== -1) {
    throw new Error(`${sheetName} header ${columnName(mismatch + 1)}1 must be ${expectedHeaders[mismatch]}; found ${actual[mismatch] || "(blank)"}`);
  }
}

function assertNoUnexpectedHeaders(sheetName, headerRow, expectedLength) {
  const extraHeaderIndex = headerRow.findIndex((value, index) => (
    index >= expectedLength && String(value ?? "").trim() !== ""
  ));
  if (extraHeaderIndex !== -1) {
    throw new Error(`${sheetName} has an unexpected header in ${columnName(extraHeaderIndex + 1)}1`);
  }
}

function rowsToRecords(rows, expectedHeaders) {
  return rows.slice(1).filter(row => rowHasValue(row)).map((row, rowIndex) => {
    const record = { _rowNumber: rowIndex + 2 };
    expectedHeaders.forEach((header, columnIndex) => {
      record[header] = row?.[columnIndex] ?? "";
    });
    return record;
  });
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
