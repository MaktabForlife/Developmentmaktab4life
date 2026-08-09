import { normalizeWhatsapp6, requireAdminOrSenior } from "../lib/auth.js";
import {
  batchUpdateGoogleSheetValues,
  readGoogleSheetValues
} from "../lib/google-sheets.js";
import { json } from "../lib/http.js";
import { getStudentLoginBaseUrl } from "../lib/system-config.js";

const STUDENT_RECORDS_SHEET = "StudentRecords";
const SUBJECT_LIST_SHEET = "SubjectList";
const MODULE_LIST_SHEET = "ModuleList";
const TASK_LIST_SHEET = "TaskList";
const FULL_SHEET_RANGE = "A:ZZ";

export async function checkStudentDuplicateGoogleSheetsEndpoint(request, env) {
  const permission = await requireAdminOrSenior(request, env);

  if (!permission.ok) {
    return permission.response;
  }

  const body = await request.json();
  const username = body.username;
  const whatsapp6 = normalizeWhatsapp6(body.whatsapp6);
  const classgroup = clean(body.classgroup);

  if (!username) {
    return json({ success: false, error: "Missing username" }, 400);
  }

  if (!classgroup) {
    return json({ success: false, error: "Missing classgroup" }, 400);
  }

  if (!isValidStudentClassGroup(classgroup)) {
    return json({
      success: false,
      error: "classgroup must be 0 (ALL) or a positive whole number"
    }, 400);
  }

  const rows = await readStudentManagementSheet(env, STUDENT_RECORDS_SHEET);

  if (rows === null) {
    return missingSheetResponse(STUDENT_RECORDS_SHEET);
  }

  return json(buildStudentDuplicateResponse(rows, { username, whatsapp6 }));
}

export async function searchStudentsGoogleSheetsEndpoint(request, env) {
  const permission = await requireAdminOrSenior(request, env);

  if (!permission.ok) {
    return permission.response;
  }

  const body = await request.json();
  const query = clean(body.query);
  const whatsapp6 = String(body.whatsapp6 || "").replace(/\D/g, "").slice(-6);
  const listAll = body.listAll === true;

  if (!query && !whatsapp6 && !listAll) {
    return json({
      success: false,
      error: "Enter a name or WhatsApp last 6 digits"
    }, 400);
  }

  const rows = await readStudentManagementSheet(env, STUDENT_RECORDS_SHEET);

  if (rows === null) {
    return missingSheetResponse(STUDENT_RECORDS_SHEET);
  }

  let studentLoginBaseUrl;

  try {
    studentLoginBaseUrl = await getStudentLoginBaseUrl(env);
  } catch (error) {
    return json({
      success: false,
      error: error && error.message
        ? error.message
        : "Student login URL is not configured in System Settings"
    }, 503);
  }

  return json(buildStudentSearchResponse(rows, {
    query,
    whatsapp6,
    listAll,
    studentLoginBase: studentLoginBaseUrl
  }));
}

export async function updateStudentGoogleSheetsEndpoint(request, env) {
  const permission = await requireAdminOrSenior(request, env);

  if (!permission.ok) {
    return permission.response;
  }

  const body = await request.json();
  const uniqueid = body.uniqueid;

  if (!uniqueid) {
    return json({ success: false, error: "Missing uniqueid" }, 400);
  }

  if (body.username !== undefined && String(body.username).trim() === "") {
    return json({ success: false, error: "Username cannot be empty" }, 400);
  }

  const requestedClassGroup = body.classgroup === undefined
    ? null
    : clean(body.classgroup);

  if (requestedClassGroup !== null && !requestedClassGroup) {
    return json({ success: false, error: "classgroup cannot be empty" }, 400);
  }

  if (requestedClassGroup !== null && !isValidStudentClassGroup(requestedClassGroup)) {
    return json({
      success: false,
      error: "classgroup must be 0 (ALL) or a positive whole number"
    }, 400);
  }

  if (body.active !== undefined && typeof body.active !== "boolean") {
    return json({ success: false, error: "active must be true or false" }, 400);
  }

  const rows = await readStudentManagementSheet(env, STUDENT_RECORDS_SHEET);

  if (rows === null) {
    return missingSheetResponse(STUDENT_RECORDS_SHEET);
  }

  const headerMap = buildHeaderMap(rows[0] || []);
  const columns = {
    studentid: findHeaderIndex(headerMap, ["StudentID", "StudentId", "studentid"]),
    username: findHeaderIndex(headerMap, ["Username", "Name", "StudentName"]),
    whatsapp6: findHeaderIndex(headerMap, [
      "WhatsAppLast6",
      "WhatsApp6",
      "WhatsApp Last 6",
      "whatsapp6"
    ]),
    uniqueid: findHeaderIndex(headerMap, ["UniqueID", "UniqueId", "uniqueid"]),
    classgroup: findHeaderIndex(headerMap, ["ClassGroup", "Group", "classgroup"]),
    active: findHeaderIndex(headerMap, ["Active", "active"])
  };

  if (Object.values(columns).some(index => index === -1)) {
    return json({
      success: false,
      error: "StudentRecords required columns not found"
    });
  }

  const rowIndex = rows.slice(1).findIndex(row => (
    String(getValue(row, columns.uniqueid)).trim() === uniqueid
  ));

  if (rowIndex === -1) {
    return json({ success: false, error: "Student not found" });
  }

  const studentRow = rows[rowIndex + 1];
  const sheetRow = rowIndex + 2;
  const updates = [];
  const updatedValues = {};
  const currentClassGroup = clean(getValue(studentRow, columns.classgroup));
  const currentActive = normalizeBooleanCell(getValue(studentRow, columns.active));
  const resultingClassGroup = requestedClassGroup === null
    ? currentClassGroup
    : requestedClassGroup;
  const resultingActive = body.active === undefined
    ? currentActive
    : body.active;
  const grantsAllGroupsAccess = resultingClassGroup === "0" &&
    resultingActive === true &&
    (currentClassGroup !== "0" || currentActive !== true);

  if (
    ((requestedClassGroup === "0" && currentClassGroup !== "0") || grantsAllGroupsAccess) &&
    !isFullAdmin(permission.user)
  ) {
    return json({
      success: false,
      error: "Only an Admin can assign Group 0 (ALL) access"
    }, 403);
  }

  if (body.username !== undefined) {
    updatedValues.username = String(body.username).trim();
    updates.push(singleCellUpdate(columns.username, sheetRow, updatedValues.username));
  }

  if (body.whatsapp6 !== undefined) {
    updatedValues.whatsapp6 = normalizeWhatsapp6(body.whatsapp6);
    updates.push(singleCellUpdate(columns.whatsapp6, sheetRow, updatedValues.whatsapp6));
  }

  if (body.classgroup !== undefined) {
    updatedValues.classgroup = requestedClassGroup;
    updates.push(singleCellUpdate(columns.classgroup, sheetRow, updatedValues.classgroup));
  }

  if (body.active !== undefined) {
    updatedValues.active = body.active;
    updates.push(singleCellUpdate(columns.active, sheetRow, updatedValues.active));
  }

  if (updates.length > 0) {
    await batchUpdateGoogleSheetValues(env, updates);
  }

  return json({
    success: true,
    message: "Student updated successfully",
    studentid: getValue(studentRow, columns.studentid),
    uniqueid: getValue(studentRow, columns.uniqueid),
    username: body.username !== undefined
      ? updatedValues.username
      : getValue(studentRow, columns.username),
    whatsapp6: body.whatsapp6 !== undefined
      ? updatedValues.whatsapp6
      : getValue(studentRow, columns.whatsapp6),
    classgroup: body.classgroup !== undefined
      ? updatedValues.classgroup
      : getValue(studentRow, columns.classgroup),
    active: body.active !== undefined
      ? updatedValues.active
      : getValue(studentRow, columns.active)
  });
}

export async function getStudentAssignmentOptionsGoogleSheetsEndpoint(request, env) {
  const permission = await requireAdminOrSenior(request, env);

  if (!permission.ok) {
    return permission.response;
  }

  const [subjectRows, moduleRows, taskRows] = await Promise.all([
    readStudentManagementSheet(env, SUBJECT_LIST_SHEET),
    readStudentManagementSheet(env, MODULE_LIST_SHEET),
    readStudentManagementSheet(env, TASK_LIST_SHEET)
  ]);

  if (subjectRows === null) {
    return missingSheetResponse(SUBJECT_LIST_SHEET);
  }

  if (taskRows === null) {
    return missingSheetResponse(TASK_LIST_SHEET);
  }

  return json(buildStudentAssignmentOptionsResponse(
    subjectRows,
    moduleRows || [],
    taskRows
  ));
}

export function buildStudentDuplicateResponse(rows = [], options = {}) {
  const username = options.username;
  const targetName = normalizeUsername(username);
  const targetWhatsapp6 = clean(options.whatsapp6);
  const matches = [];

  rows.slice(1).forEach(row => {
    const rowName = normalizeUsername(getValue(row, 1));
    const rowWhatsapp6 = clean(getValue(row, 2));

    if (rowName === targetName && rowWhatsapp6 === targetWhatsapp6) {
      matches.push({
        studentid: getValue(row, 0),
        username: getValue(row, 1),
        whatsapp6: getValue(row, 2),
        uniqueid: getValue(row, 3),
        classgroup: getValue(row, 6),
        createdate: getValue(row, 7),
        lastlogin: getValue(row, 8),
        active: normalizeBooleanCell(getValue(row, 10))
      });
    }
  });

  return {
    success: true,
    duplicate: matches.length > 0,
    matches,
    suggestedUsername: matches.length > 0
      ? getNextAvailableUsername(rows, username)
      : username
  };
}

export function buildStudentSearchResponse(rows = [], options = {}) {
  const rawQuery = clean(options.query);
  const listAll = options.listAll === true;
  const normalizedQuery = normalizeStudentSearchText(rawQuery);
  const queryWords = normalizedQuery ? normalizedQuery.split(" ").filter(Boolean) : [];
  const queryDigits = rawQuery.replace(/\D/g, "");
  const whatsapp6 = String(options.whatsapp6 || "").replace(/\D/g, "").slice(-6);

  if (!normalizedQuery && !queryDigits && !whatsapp6 && !listAll) {
    return { success: true, students: [], count: 0 };
  }

  const headerMap = buildHeaderMap(rows[0] || []);
  const loginBase = ensureTrailingSlash(options.studentLoginBase);
  const matches = [];

  rows.slice(1).forEach(row => {
    const studentid = clean(getCell(row, headerMap, [
      "studentid",
      "StudentID",
      "StudentId"
    ], ""));
    const username = clean(getCell(row, headerMap, [
      "username",
      "Username",
      "Name",
      "StudentName"
    ], ""));
    const rawWhatsapp = clean(getCell(row, headerMap, [
      "whatsapp6",
      "WhatsAppLast6",
      "WhatsApp6",
      "WhatsApp Last 6"
    ], ""));
    const whatsappDigits = rawWhatsapp.replace(/\D/g, "");
    const rowWhatsapp6 = whatsappDigits.length > 6
      ? whatsappDigits.slice(-6)
      : whatsappDigits;
    const uniqueid = clean(getCell(row, headerMap, [
      "uniqueid",
      "UniqueID",
      "UniqueId"
    ], ""));
    const classgroup = clean(getCell(row, headerMap, [
      "classgroup",
      "ClassGroup",
      "Group",
      "group"
    ], ""));
    const createdate = getCell(row, headerMap, [
      "createdate",
      "CreatedDate",
      "Created Date"
    ], "");
    const lastlogin = getCell(row, headerMap, [
      "lastlogin",
      "LastLogin",
      "Last Login"
    ], "");
    const active = getCell(row, headerMap, ["active", "Active"], true);
    const registeredby = clean(getCell(row, headerMap, [
      "registeredby",
      "RegisteredBy",
      "Registered By"
    ], ""));

    if (!studentid || studentid === "SYSTEM1") {
      return;
    }

    const normalizedName = normalizeStudentSearchText(username);
    const nameMatches = Boolean(normalizedQuery) && (
      normalizedName.includes(normalizedQuery) ||
      queryWords.every(word => normalizedName.includes(word))
    );
    const whatsappMatches = Boolean(
      (whatsapp6 && rowWhatsapp6 && rowWhatsapp6 === whatsapp6) ||
      (
        queryDigits &&
        rowWhatsapp6 &&
        (
          rowWhatsapp6 === queryDigits ||
          rowWhatsapp6.endsWith(queryDigits) ||
          rowWhatsapp6.includes(queryDigits)
        )
      )
    );

    if (listAll || nameMatches || whatsappMatches) {
      matches.push({
        studentid,
        username,
        whatsapp6: rowWhatsapp6,
        uniqueid,
        classgroup,
        createdate,
        lastlogin,
        active: normalizeBooleanCell(active) === true,
        registeredby,
        loginUrl: `${loginBase}${uniqueid}`
      });
    }
  });

  matches.sort((a, b) => {
    const groupCompare = String(a.classgroup || "").localeCompare(
      String(b.classgroup || ""),
      undefined,
      { numeric: true, sensitivity: "base" }
    );

    return groupCompare !== 0
      ? groupCompare
      : String(a.username || "").localeCompare(
        String(b.username || ""),
        undefined,
        { numeric: true, sensitivity: "base" }
      );
  });

  const maxResults = listAll ? 500 : 50;

  return {
    success: true,
    count: matches.length,
    students: matches.slice(0, maxResults)
  };
}

export function buildStudentAssignmentOptionsResponse(
  subjectRows = [],
  moduleRows = [],
  taskRows = []
) {
  const subjectHeaderMap = buildHeaderMap(subjectRows[0] || []);
  const subjectMap = {};
  const knownSubjectIds = new Set();

  subjectRows.slice(1).forEach(row => {
    const subjectid = clean(getCell(row, subjectHeaderMap, [
      "SubjectID",
      "SubjectId",
      "subjectid"
    ], ""));
    const subjectname = clean(getCell(row, subjectHeaderMap, [
      "SubjectName",
      "Subject",
      "subjectname"
    ], subjectid));
    const active = getCell(row, subjectHeaderMap, ["Active", "Status", "active"], true);

    if (!subjectid) return;

    knownSubjectIds.add(subjectid);

    if (!isActiveValue(active)) return;

    subjectMap[subjectid] = createAssignmentSubject(subjectid, subjectname);
  });

  if (moduleRows.length > 0) {
    const moduleHeaderMap = buildHeaderMap(moduleRows[0] || []);

    moduleRows.slice(1).forEach(row => {
      const moduleid = clean(getCell(row, moduleHeaderMap, [
        "ModuleID",
        "ModuleId",
        "moduleid"
      ], ""));
      const modulename = clean(getCell(row, moduleHeaderMap, [
        "ModuleName",
        "Module",
        "modulename"
      ], moduleid));
      const subjectid = clean(getCell(row, moduleHeaderMap, [
        "SubjectID",
        "SubjectId",
        "subjectid"
      ], ""));
      const subjectname = clean(getCell(row, moduleHeaderMap, [
        "SubjectName",
        "Subject",
        "subjectname"
      ], ""));
      const rawSortOrder = getCell(row, moduleHeaderMap, [
        "Sort Order",
        "SortOrder",
        "ModuleSortOrder",
        "sortorder"
      ], "");
      const active = getCell(row, moduleHeaderMap, ["Active", "Status", "active"], true);

      if (!moduleid || !subjectid || !isActiveValue(active)) return;
      if (knownSubjectIds.has(subjectid) && !subjectMap[subjectid]) return;

      if (!subjectMap[subjectid]) {
        subjectMap[subjectid] = createAssignmentSubject(subjectid, subjectname);
      }

      addAssignmentModule(
        subjectMap[subjectid],
        moduleid,
        modulename,
        rawSortOrder
      );
    });
  }

  const taskHeaderMap = buildHeaderMap(taskRows[0] || []);

  taskRows.slice(1).forEach(row => {
    const taskid = clean(getCell(row, taskHeaderMap, ["TaskID", "TaskId", "taskid"], ""));
    const subjectid = clean(getCell(row, taskHeaderMap, [
      "SubjectID",
      "SubjectId",
      "subjectid"
    ], ""));
    const subjectname = clean(getCell(row, taskHeaderMap, [
      "SubjectName",
      "Subject",
      "subjectname"
    ], subjectid));
    const moduleid = clean(getCell(row, taskHeaderMap, [
      "ModuleID",
      "ModuleId",
      "moduleid",
      "ModuletID"
    ], ""));
    const modulename = clean(getCell(row, taskHeaderMap, [
      "ModuleName",
      "Module",
      "modulename"
    ], moduleid));
    const active = getCell(row, taskHeaderMap, ["Active", "Status", "active"], true);

    if (!taskid || !subjectid || !isActiveValue(active)) return;
    if (knownSubjectIds.has(subjectid) && !subjectMap[subjectid]) return;

    if (!subjectMap[subjectid]) {
      subjectMap[subjectid] = createAssignmentSubject(subjectid, subjectname);
    }

    const safeModuleId = moduleid || "NO_MODULE";
    const safeModuleName = modulename || "General";
    const module = addAssignmentModule(
      subjectMap[subjectid],
      safeModuleId,
      safeModuleName,
      "",
      999999
    );
    module.taskCount += 1;
  });

  const subjects = Object.keys(subjectMap).map(subjectid => {
    const subject = subjectMap[subjectid];

    subject.modules = subject.modules
      .filter(module => module.taskCount > 0)
      .sort((a, b) => {
        if (a.sortorder !== b.sortorder) return a.sortorder - b.sortorder;
        return String(a.moduleid || "").localeCompare(
          String(b.moduleid || ""),
          undefined,
          { numeric: true, sensitivity: "base" }
        );
      });

    delete subject._moduleMap;
    return subject;
  }).filter(subject => subject.modules.length > 0)
    .sort((a, b) => String(a.subjectid || "").localeCompare(
      String(b.subjectid || ""),
      undefined,
      { numeric: true, sensitivity: "base" }
    ));

  return { success: true, subjects };
}

async function readStudentManagementSheet(env, sheetName) {
  try {
    return await readGoogleSheetValues(env, `${sheetName}!${FULL_SHEET_RANGE}`);
  } catch (error) {
    if (isMissingSheetError(error, sheetName)) {
      return null;
    }

    throw error;
  }
}

function getNextAvailableUsername(rows, baseUsername) {
  const existingNames = new Set(
    rows.slice(1).map(row => normalizeUsername(getValue(row, 1)))
  );
  let counter = 1;
  let candidate = `${clean(baseUsername)}${counter}`;

  while (existingNames.has(normalizeUsername(candidate))) {
    counter += 1;
    candidate = `${clean(baseUsername)}${counter}`;
  }

  return candidate;
}

function createAssignmentSubject(subjectid, subjectname) {
  return {
    subjectid,
    subjectname: subjectname || subjectid,
    modules: [],
    _moduleMap: {}
  };
}

function addAssignmentModule(
  subject,
  moduleid,
  modulename,
  rawSortOrder,
  defaultSortOrder
) {
  if (!subject._moduleMap[moduleid]) {
    const numericSortOrder = Number(rawSortOrder);
    const sortorder = defaultSortOrder !== undefined
      ? defaultSortOrder
      : Number.isFinite(numericSortOrder) ? numericSortOrder : 999999;

    subject._moduleMap[moduleid] = {
      moduleid,
      modulename: modulename || moduleid,
      sortorder,
      taskCount: 0
    };
    subject.modules.push(subject._moduleMap[moduleid]);
  }

  return subject._moduleMap[moduleid];
}

function buildHeaderMap(headers) {
  const map = {};

  headers.forEach((header, index) => {
    const key = normalizeHeader(header);

    if (key && map[key] === undefined) {
      map[key] = index;
    }
  });

  return map;
}

function findHeaderIndex(headerMap, names) {
  for (const name of names) {
    const index = headerMap[normalizeHeader(name)];

    if (index !== undefined) {
      return index;
    }
  }

  return -1;
}

function singleCellUpdate(columnIndex, rowNumber, value) {
  return {
    range: `${STUDENT_RECORDS_SHEET}!${columnIndexToA1(columnIndex)}${rowNumber}`,
    majorDimension: "ROWS",
    values: [[value]]
  };
}

function columnIndexToA1(index) {
  let value = Number(index) + 1;
  let label = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    label = String.fromCharCode(65 + remainder) + label;
    value = Math.floor((value - 1) / 26);
  }

  return label;
}

function getCell(row, headerMap, names, fallback = "") {
  for (const name of names) {
    const index = headerMap[normalizeHeader(name)];

    if (index !== undefined) {
      const value = Array.isArray(row) ? row[index] : undefined;
      return value === undefined || value === null ? fallback : value;
    }
  }

  return fallback;
}

function getValue(row, index) {
  const value = Array.isArray(row) ? row[index] : "";
  return value === undefined || value === null ? "" : value;
}

function normalizeUsername(value) {
  return clean(value)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function normalizeStudentSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeHeader(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeBooleanCell(value) {
  return value === true || String(value).trim().toLowerCase() === "true";
}

function isActiveValue(value) {
  if (value === undefined || value === null || value === "") return true;
  if (value === true) return true;

  const text = String(value).trim().toLowerCase();
  return ["true", "1", "yes", "active"].includes(text);
}

function ensureTrailingSlash(value) {
  const text = clean(value);
  return text.endsWith("/") ? text : `${text}/`;
}

function missingSheetResponse(sheetName) {
  return json({ success: false, error: `${sheetName} sheet not found` });
}

function isMissingSheetError(error, sheetName) {
  const message = error && error.message ? error.message : String(error || "");
  return message.includes("Google Sheets API error 400:") &&
    message.includes("Unable to parse range") &&
    message.toLowerCase().includes(String(sheetName).toLowerCase());
}

function clean(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}

function isValidStudentClassGroup(value) {
  return /^(0|[1-9]\d*)$/.test(clean(value));
}

function isFullAdmin(user) {
  return clean(user && user.role).toUpperCase() === "ADMIN";
}
