import { getAuthUser } from "../lib/auth.js";
import { readGoogleSheetValues } from "../lib/google-sheets.js";
import { json } from "../lib/http.js";

const SUBJECT_LIST_SHEET = "SubjectList";
const TASK_LIST_SHEET = "TaskList";
const SUBJECT_RESOURCES_SHEET = "SubjectResources";
const FULL_SHEET_RANGE = "A:ZZ";

export async function listSubjectsGoogleSheetsEndpoint(request, env) {
  const auth = await requireAdminRead(request, env);

  if (!auth.ok) {
    return auth.response;
  }

  const rows = await readCurriculumSheet(env, SUBJECT_LIST_SHEET);

  if (rows === null) {
    return json({ success: false, error: `${SUBJECT_LIST_SHEET} sheet not found` });
  }

  return json(buildSubjectsResponse(rows));
}

export async function listTasksGoogleSheetsEndpoint(request, env) {
  const auth = await requireAdminRead(request, env);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const subjectid = clean(body.subjectid || "ALL");
  const activeOnly = body.activeOnly === true;
  const rows = await readCurriculumSheet(env, TASK_LIST_SHEET);

  if (rows === null) {
    return json({ success: false, error: `${TASK_LIST_SHEET} sheet not found` });
  }

  return json(buildTasksResponse(rows, { subjectid, activeOnly }));
}

export async function listSubjectResourcesGoogleSheetsEndpoint(request, env) {
  const auth = await requireAdminRead(request, env);

  if (!auth.ok) {
    return auth.response;
  }

  const body = await request.json();
  const subjectid = clean(body.subjectid || "ALL");
  const rows = await readCurriculumSheet(env, SUBJECT_RESOURCES_SHEET);

  if (rows === null) {
    return json({ success: false, error: `${SUBJECT_RESOURCES_SHEET} sheet not found` });
  }

  return json(buildSubjectResourcesResponse(rows, subjectid));
}

export function buildSubjectsResponse(rows = []) {
  const subjects = rows.slice(1).map(row => ({
    subjectid: getValue(row, 0),
    subjectname: getValue(row, 1),
    active: normalizeBooleanCell(getValue(row, 2)),
    createdate: getValue(row, 3)
  }));

  subjects.sort((a, b) => String(a.subjectname).localeCompare(String(b.subjectname)));

  return {
    success: true,
    count: subjects.length,
    subjects
  };
}

export function buildTasksResponse(rows = [], options = {}) {
  const requestedSubjectId = clean(options.subjectid || "ALL");
  const activeOnly = options.activeOnly === true;
  const tasks = [];

  rows.slice(1).forEach(row => {
    const subjectid = clean(getValue(row, 1));
    const active = normalizeBooleanCell(getValue(row, 7));

    if (requestedSubjectId !== "ALL" && subjectid !== requestedSubjectId) {
      return;
    }

    if (activeOnly && active !== true) {
      return;
    }

    tasks.push({
      taskid: getValue(row, 0),
      subjectid: getValue(row, 1),
      taskname: getValue(row, 2),
      audiolink: getValue(row, 3),
      visuallink: getValue(row, 4),
      videolink: getValue(row, 5),
      pdflink: getValue(row, 6),
      active,
      createdate: getValue(row, 8)
    });
  });

  tasks.sort((a, b) => {
    const subjectCompare = String(a.subjectid).localeCompare(String(b.subjectid));
    return subjectCompare !== 0
      ? subjectCompare
      : String(a.taskname).localeCompare(String(b.taskname));
  });

  return {
    success: true,
    subjectid: requestedSubjectId,
    count: tasks.length,
    tasks
  };
}

export function buildSubjectResourcesResponse(rows = [], subjectid = "ALL") {
  const requestedSubjectId = clean(subjectid || "ALL");
  const resources = [];

  rows.slice(1).forEach(row => {
    const rowSubjectId = clean(getValue(row, 1));

    if (requestedSubjectId !== "ALL" && rowSubjectId !== requestedSubjectId) {
      return;
    }

    resources.push({
      resourceid: getValue(row, 0),
      subjectid: getValue(row, 1),
      resourcename: getValue(row, 2),
      resourcetype: getValue(row, 3),
      resourcelink: getValue(row, 4),
      active: normalizeBooleanCell(getValue(row, 5)),
      createdate: getValue(row, 6)
    });
  });

  resources.sort((a, b) => {
    const subjectCompare = String(a.subjectid).localeCompare(String(b.subjectid));
    return subjectCompare !== 0
      ? subjectCompare
      : String(a.resourcename).localeCompare(String(b.resourcename));
  });

  return {
    success: true,
    subjectid: requestedSubjectId,
    count: resources.length,
    resources
  };
}

async function requireAdminRead(request, env) {
  const authUser = await getAuthUser(request, env);

  if (!authUser || authUser.type !== "admin") {
    return {
      ok: false,
      response: json({ success: false, error: "Unauthorized" }, 401)
    };
  }

  return { ok: true, user: authUser };
}

async function readCurriculumSheet(env, sheetName) {
  try {
    return await readGoogleSheetValues(env, `${sheetName}!${FULL_SHEET_RANGE}`);
  } catch (error) {
    if (isMissingSheetError(error, sheetName)) {
      return null;
    }

    throw error;
  }
}

function normalizeBooleanCell(value) {
  if (value === true || value === false) {
    return value;
  }

  const text = clean(value).toUpperCase();

  if (text === "TRUE") {
    return true;
  }

  if (text === "FALSE") {
    return false;
  }

  return value;
}

function getValue(row, index) {
  const value = Array.isArray(row) ? row[index] : "";
  return value === null || value === undefined ? "" : value;
}

function isMissingSheetError(error, sheetName) {
  const message = error && error.message ? error.message : String(error || "");
  return message.includes("Google Sheets API error 400:") &&
    message.includes("Unable to parse range") &&
    message.toLowerCase().includes(String(sheetName).toLowerCase());
}

function clean(value) {
  return String(value === null || value === undefined ? "" : value).trim();
}
