import { callAppsScript } from "../lib/apps-script.js";
import { getAuthUser, requireAdminOrSenior } from "../lib/auth.js";
import {
  readGoogleSheetValues,
  updateGoogleSheetValues
} from "../lib/google-sheets.js";
import { json } from "../lib/http.js";

const TIMETABLE_SHEET_NAME = "TimeTable";
const TIMETABLE_SHEET_RANGE = `${TIMETABLE_SHEET_NAME}!A:ZZ`;

export async function getTimetableAppsScriptEndpoint(request, env) {
  const context = await getTimetableRequestContext(request, env);

  if (!context.ok) {
    return context.response;
  }

  const result = await callAppsScript(env, {
    action: "getTimetable",
    data: {
      groupNo: context.groupNo,
      assignedTeacher: context.assignedTeacher,
      userType: context.authUser.type,
      role: context.authUser.role || ""
    }
  });

  return json(result);
}

// Retained for modules that imported the original timetable route name.
export const getTimetableEndpoint = getTimetableAppsScriptEndpoint;

export async function getTimetableGoogleSheetsEndpoint(request, env) {
  const context = await getTimetableRequestContext(request, env);

  if (!context.ok) {
    return context.response;
  }

  let rows;

  try {
    rows = await readGoogleSheetValues(env, TIMETABLE_SHEET_RANGE);
  } catch (error) {
    if (!isMissingTimetableSheetError(error)) {
      throw error;
    }

    return json(missingTimetableSheetResponse());
  }

  return json(buildTimetableResponse(rows, {
    groupNo: context.groupNo,
    assignedTeacher: context.assignedTeacher
  }));
}

export function buildTimetableResponse(rows = [], options = {}) {
  if (!Array.isArray(rows) || rows.length < 2) {
    return {
      success: true,
      sessions: [],
      zoomlink: "",
      count: 0
    };
  }

  const headerMap = buildHeaderMap(rows[0] || []);
  const columns = {
    sessionId: findColumn(headerMap, ["SessionID", "SessionId", "Session"]),
    subjectId: findColumn(headerMap, ["SubjectID", "SubjectId"]),
    subjectName: findColumn(headerMap, ["SubjectName", "Subject"]),
    day: findColumn(headerMap, ["DayofWeek", "DayOfWeek", "Day", "DayName"]),
    startTime: findColumn(headerMap, ["StartTime", "start time", "Start Time", "Time"]),
    zoomLink: findColumn(headerMap, ["ZoomLink", "Zoom Link", "ClassLink", "MeetingLink"]),
    groupNo: findColumn(headerMap, ["GroupNo", "Group", "ClassGroup", "Class Group"]),
    assignedTeacher: findColumn(headerMap, ["AssignedTeacher", "Assigned Teacher", "Teacher"])
  };

  if (columns.subjectName < 0 || columns.day < 0 || columns.startTime < 0) {
    return {
      success: false,
      error: "TimeTable sheet must include SubjectName, DayofWeek and StartTime columns",
      sessions: [],
      zoomlink: ""
    };
  }

  const requestedGroup = clean(
    options.groupNo || options.classgroup || options.group || "ALL"
  );
  const requestedTeacher = clean(
    options.assignedTeacher || options.teacher || "ALL"
  );
  const globalZoomLink = columns.zoomLink >= 0
    ? getCell(rows[1] || [], columns.zoomLink)
    : "";
  const sessions = [];

  rows.slice(1).forEach((row, index) => {
    const subjectName = getCell(row, columns.subjectName);
    const dayOfWeek = getCell(row, columns.day);
    const startTime = getCell(row, columns.startTime);

    if (!subjectName || !dayOfWeek || !startTime) {
      return;
    }

    const groupNo = getCell(row, columns.groupNo);
    const assignedTeacher = getCell(row, columns.assignedTeacher);

    if (!filterMatches(groupNo, requestedGroup)) {
      return;
    }

    if (!filterMatches(assignedTeacher, requestedTeacher)) {
      return;
    }

    sessions.push({
      row: index + 2,
      sessionid: getCell(row, columns.sessionId),
      subjectid: getCell(row, columns.subjectId),
      subjectname: subjectName,
      dayofweek: dayOfWeek,
      starttime: startTime,
      zoomlink: columns.zoomLink >= 0 ? getCell(row, columns.zoomLink) : "",
      groupno: groupNo || "ALL",
      assignedteacher: assignedTeacher || "ALL"
    });
  });

  return {
    success: true,
    sessions,
    zoomlink: globalZoomLink,
    groupno: requestedGroup,
    assignedteacher: requestedTeacher,
    count: sessions.length
  };
}

export async function updateTimetableZoomLinkEndpoint(request, env) {
  const auth = await requireAdminOrSenior(request, env);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const zoomlink = String(body.zoomlink || body.zoomLink || body.link || "").trim();

  const result = await callAppsScript(env, {
    action: "updateTimetableZoomLink",
    data: {
      zoomlink,
      updatedBy: auth.user.username || "",
      groupNo: "ALL",
      assignedTeacher: "ALL"
    }
  });

  return json(result);
}

export async function updateTimetableZoomLinkGoogleSheetsEndpoint(request, env) {
  const auth = await requireAdminOrSenior(request, env);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const zoomlink = clean(body.zoomlink || body.zoomLink || body.link || "");
  let rows;

  try {
    rows = await readGoogleSheetValues(env, TIMETABLE_SHEET_RANGE);
  } catch (error) {
    if (!isMissingTimetableSheetError(error)) {
      throw error;
    }

    return json(missingTimetableSheetResponse());
  }

  const headers = Array.isArray(rows[0]) ? rows[0].slice() : [];
  const headerMap = buildHeaderMap(headers);
  let zoomLinkColumn = findColumn(
    headerMap,
    ["ZoomLink", "Zoom Link", "ClassLink", "MeetingLink"]
  );

  if (zoomLinkColumn < 0) {
    zoomLinkColumn = headers.length;
    const headerRange = `${TIMETABLE_SHEET_NAME}!${columnName(zoomLinkColumn)}1`;
    await updateGoogleSheetValues(env, headerRange, [["ZoomLink"]]);
    headers[zoomLinkColumn] = "ZoomLink";
  }

  const zoomLinkRange = `${TIMETABLE_SHEET_NAME}!${columnName(zoomLinkColumn)}2`;
  await updateGoogleSheetValues(env, zoomLinkRange, [[zoomlink]]);

  const updatedRows = rows.map(row => Array.isArray(row) ? row.slice() : []);
  updatedRows[0] = headers;
  updatedRows[1] = updatedRows[1] || [];
  updatedRows[1][zoomLinkColumn] = zoomlink;

  const timetable = buildTimetableResponse(updatedRows, {
    groupNo: "ALL",
    assignedTeacher: "ALL"
  });
  timetable.message = "Zoom link saved";

  return json(timetable);
}

async function getTimetableRequestContext(request, env) {
  const authUser = await getAuthUser(request, env);

  if (!authUser) {
    return {
      ok: false,
      response: json({ success: false, error: "Unauthorized" }, 401)
    };
  }

  const body = await request.json();
  let groupNo = clean(body.groupNo || body.classgroup || body.group || "ALL");
  let assignedTeacher = clean(body.assignedTeacher || body.teacher || "ALL");

  if (authUser.type === "student") {
    const studentGroup = clean(
      authUser.classgroup === null || authUser.classgroup === undefined
        ? groupNo || "ALL"
        : authUser.classgroup
    );

    // V100.8: translate only an authenticated student's ClassGroup 0 to the
    // timetable ALL scope. TimeTable GroupNo 0 and Admin AssignedGroup 0 keep
    // their literal meanings and never become general all-groups grants.
    groupNo = studentGroup === "0" ? "ALL" : studentGroup || "ALL";
    assignedTeacher = "ALL";
  }

  if (authUser.type === "admin" && authUser.role === "TEACHER") {
    groupNo = clean(authUser.assignedgroup || groupNo || "ALL");
    assignedTeacher = clean(authUser.username || assignedTeacher || "ALL");
  }

  return {
    ok: true,
    authUser,
    groupNo,
    assignedTeacher
  };
}

function missingTimetableSheetResponse() {
  return {
    success: false,
    error: `${TIMETABLE_SHEET_NAME} sheet not found`,
    sessions: [],
    zoomlink: ""
  };
}

function clean(value) {
  return String(value === null || value === undefined ? "" : value).trim();
}

function normalizeHeader(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function normalizeMatch(value) {
  return clean(value).toLowerCase().replace(/\s+/g, "");
}

function buildHeaderMap(headers) {
  return headers.reduce((map, header, index) => {
    const key = normalizeHeader(header);

    if (key && map[key] === undefined) {
      map[key] = index;
    }

    return map;
  }, {});
}

function findColumn(headerMap, possibleHeaders) {
  for (const header of possibleHeaders) {
    const key = normalizeHeader(header);

    if (headerMap[key] !== undefined) {
      return headerMap[key];
    }
  }

  return -1;
}

function getCell(row, columnIndex) {
  return columnIndex >= 0 ? clean(row[columnIndex]) : "";
}

function filterMatches(rowValue, requestedValue) {
  const rowText = normalizeMatch(rowValue);
  const requestedText = normalizeMatch(requestedValue);

  if (!rowText || rowText === "all") {
    return true;
  }

  if (!requestedText || requestedText === "all") {
    return true;
  }

  return rowText === requestedText;
}

function isMissingTimetableSheetError(error) {
  const message = error && error.message ? error.message : String(error || "");
  return message.includes("Google Sheets API error 400:") &&
    message.includes("Unable to parse range") &&
    message.toLowerCase().includes(TIMETABLE_SHEET_NAME.toLowerCase());
}

function columnName(columnIndex) {
  let value = Number(columnIndex) + 1;
  let result = "";

  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }

  return result;
}
