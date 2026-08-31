import { getAuthUser } from "../lib/auth.js";
import { batchReadGoogleSheetValues } from "../lib/google-sheets.js";
import { json } from "../lib/http.js";

const FULL_SHEET_RANGE = "A:ZZ";
const STUDENT_TASKS_SHEET = "StudentTasks";
const TASK_LIST_SHEET = "TaskList";
const SUBJECT_LIST_SHEET = "SubjectList";
const TASK_RESOURCES_SHEET = "TaskResources";
const STUDENT_RECORDS_SHEET = "StudentRecords";

export async function getStudentTasksGoogleSheetsEndpoint(request, env) {
  const authUser = await getAuthUser(request, env);

  if (!authUser) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  const body = await request.json();
  let studentid = String(body.studentid || "").trim();
  const subjectid = String(body.subjectid || "ALL").trim();

  if (authUser.type === "student") {
    studentid = authUser.studentid;
  }

  if (authUser.type === "admin" && !studentid) {
    return json({ success: false, error: "Missing studentid" }, 400);
  }

  if (!studentid) {
    return json({ success: false, error: "Missing studentid" }, 400);
  }

  const sheets = await readRequiredProgressSheets(env, [
    STUDENT_TASKS_SHEET,
    TASK_LIST_SHEET,
    SUBJECT_LIST_SHEET,
    TASK_RESOURCES_SHEET
  ]);

  if (!sheets.ok) {
    return missingSheetResponse(sheets.missingSheet);
  }

  return json(buildStudentTasksResponse({
    studentTaskRows: sheets.rows[STUDENT_TASKS_SHEET],
    taskRows: sheets.rows[TASK_LIST_SHEET],
    subjectRows: sheets.rows[SUBJECT_LIST_SHEET],
    taskResourceRows: sheets.rows[TASK_RESOURCES_SHEET],
    studentid,
    subjectid
  }));
}

export async function taskProgressReportGoogleSheetsEndpoint(request, env) {
  const authUser = await getAuthUser(request, env);

  if (!authUser) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  const body = await request.json();
  let studentid = String(body.studentid || "ALL").trim();
  let classgroup = String(body.classgroup || "ALL").trim();
  const subjectid = String(body.subjectid || "ALL").trim();

  if (authUser.type === "student") {
    studentid = authUser.studentid;
    classgroup = "ALL";
  }

  if (authUser.type === "admin" && authUser.role === "TEACHER") {
    classgroup = authUser.assignedgroup;
  }

  const sheets = await readRequiredProgressSheets(env, [
    STUDENT_TASKS_SHEET,
    TASK_LIST_SHEET,
    SUBJECT_LIST_SHEET,
    STUDENT_RECORDS_SHEET
  ]);

  if (!sheets.ok) {
    return missingSheetResponse(sheets.missingSheet);
  }

  return json(buildTaskProgressReportResponse({
    studentTaskRows: sheets.rows[STUDENT_TASKS_SHEET],
    taskRows: sheets.rows[TASK_LIST_SHEET],
    subjectRows: sheets.rows[SUBJECT_LIST_SHEET],
    studentRows: sheets.rows[STUDENT_RECORDS_SHEET],
    studentid,
    classgroup,
    subjectid
  }));
}

export async function taskProgressDetailGoogleSheetsEndpoint(request, env) {
  const authUser = await getAuthUser(request, env);

  if (!authUser) {
    return json({ success: false, error: "Unauthorized" }, 401);
  }

  const body = await request.json();
  let studentid = String(body.studentid || "ALL").trim();
  let classgroup = String(body.classgroup || "ALL").trim();
  const subjectid = String(body.subjectid || "ALL").trim();
  const taskid = String(body.taskid || "ALL").trim();

  if (authUser.type === "student") {
    studentid = authUser.studentid;
    classgroup = "ALL";
  }

  if (authUser.type === "admin" && authUser.role === "TEACHER") {
    classgroup = authUser.assignedgroup;
  }

  const sheets = await readRequiredProgressSheets(env, [
    STUDENT_TASKS_SHEET,
    TASK_LIST_SHEET,
    SUBJECT_LIST_SHEET,
    STUDENT_RECORDS_SHEET
  ]);

  if (!sheets.ok) {
    return missingSheetResponse(sheets.missingSheet);
  }

  return json(buildTaskProgressDetailResponse({
    studentTaskRows: sheets.rows[STUDENT_TASKS_SHEET],
    taskRows: sheets.rows[TASK_LIST_SHEET],
    subjectRows: sheets.rows[SUBJECT_LIST_SHEET],
    studentRows: sheets.rows[STUDENT_RECORDS_SHEET],
    studentid,
    classgroup,
    subjectid,
    taskid
  }));
}

export function buildStudentTasksResponse(options = {}) {
  const studentid = clean(options.studentid);
  const subjectid = clean(options.subjectid) || "ALL";
  const taskMap = buildTaskLookup(options.taskRows || []);
  const subjectMap = buildSubjectLookup(options.subjectRows || []);
  const taskResourcesMap = buildActiveTaskResourcesMap(options.taskResourceRows || []);
  const studentTaskRows = options.studentTaskRows || [];
  const headerMap = buildHeaderMap(studentTaskRows[0] || []);
  const tasks = [];

  studentTaskRows.slice(1).forEach(row => {
    const rowStudentId = clean(getCell(row, headerMap, ["StudentID", "StudentId", "studentid"]));
    const rowTaskId = clean(getCell(row, headerMap, ["TaskID", "TaskId", "taskid"]));

    if (rowStudentId !== studentid) return;

    const task = taskMap[rowTaskId];
    if (!task) return;

    const taskSubjectId = clean(
      task.subjectid || getCell(row, headerMap, ["SubjectID", "SubjectId", "subjectid"])
    );

    if (subjectid !== "ALL" && taskSubjectId !== subjectid) return;

    const subject = subjectMap[taskSubjectId] || {};
    const completeStatus = getCell(
      row,
      headerMap,
      ["CompleteStatus", "Complete", "Completed", "completestatus"],
      ""
    );
    const verifyStatus = getCell(
      row,
      headerMap,
      ["VerifyStatus", "Verified", "verifystatus"],
      ""
    );

    tasks.push({
      studenttaskid: getCell(row, headerMap, ["StudentTaskID", "StudentTaskId", "studenttaskid"], ""),
      studentid: rowStudentId,
      taskid: rowTaskId,
      subjectid: taskSubjectId,
      subjectname: task.subjectname || subject.subjectname || taskSubjectId,
      moduleid: task.moduleid || clean(getCell(row, headerMap, ["ModuleID", "ModuleId", "moduleid"])),
      modulename: task.modulename || getCell(row, headerMap, ["ModuleName", "Module", "modulename"], ""),
      taskname: task.taskname,
      completestatus: completeStatus,
      completedate: getCell(row, headerMap, ["CompleteDate", "CompletedDate", "completedate"], ""),
      verifystatus: verifyStatus,
      verifydate: getCell(row, headerMap, ["VerifyDate", "VerifiedDate", "verifydate"], ""),
      displayCompleteStatus: completeStatus ? completeStatus : "to be completed",
      displayVerifyStatus: verifyStatus ? verifyStatus : "not verified",
      audiolink: task.audiolink,
      graphiclink: task.graphiclink,
      visuallink: task.visuallink,
      videolink: task.videolink,
      pdflink: task.pdflink,
      resources: taskResourcesMap[rowTaskId] || [],
      assignedby: getCell(row, headerMap, ["AssignedBy", "assignedby"], ""),
      assigneddate: getCell(row, headerMap, ["AssignedDate", "assigneddate"], "")
    });
  });

  tasks.sort((a, b) => {
    const subjectCompare = compareText(a.subjectname, b.subjectname);
    if (subjectCompare !== 0) return subjectCompare;

    const moduleCompare = compareText(a.modulename, b.modulename);
    if (moduleCompare !== 0) return moduleCompare;

    return compareText(a.taskname, b.taskname);
  });

  return {
    success: true,
    studentid,
    subjectid,
    count: tasks.length,
    tasks
  };
}

export function buildTaskProgressReportResponse(options = {}) {
  const requestedStudentId = clean(options.studentid) || "ALL";
  const requestedGroup = clean(options.classgroup) || "ALL";
  const requestedSubjectId = clean(options.subjectid) || "ALL";
  const activeStudents = buildStudentLookup(
    options.studentRows || [],
    requestedStudentId,
    requestedGroup
  );
  const taskMap = buildTaskLookup(options.taskRows || []);
  const subjectMap = buildSubjectLookup(options.subjectRows || []);
  const studentTaskRows = options.studentTaskRows || [];
  const headerMap = buildHeaderMap(studentTaskRows[0] || []);
  const studentProgressMap = {};
  const subjectProgressMap = {};
  const groupProgressMap = {};
  let totalAssigned = 0;
  let totalCompleted = 0;
  let totalVerified = 0;

  studentTaskRows.slice(1).forEach(row => {
    const studentid = clean(getCell(row, headerMap, ["StudentID", "StudentId", "studentid"]));
    const taskid = clean(getCell(row, headerMap, ["TaskID", "TaskId", "taskid"]));
    const completeStatus = clean(getCell(
      row,
      headerMap,
      ["CompleteStatus", "Complete", "Completed", "completestatus"],
      ""
    ));
    const verifyStatus = clean(getCell(
      row,
      headerMap,
      ["VerifyStatus", "Verified", "verifystatus"],
      ""
    ));
    const student = activeStudents[studentid];

    if (!student) return;

    const task = taskMap[taskid];
    if (!task) return;

    const subjectid = clean(
      task.subjectid || getCell(row, headerMap, ["SubjectID", "SubjectId", "subjectid"])
    );

    if (requestedSubjectId !== "ALL" && subjectid !== requestedSubjectId) return;

    const subject = subjectMap[subjectid] || {};
    const subjectname = task.subjectname || subject.subjectname || subjectid;
    const completed = completeStatus !== "";
    const verified = verifyStatus !== "";

    totalAssigned += 1;
    if (completed) totalCompleted += 1;
    if (verified) totalVerified += 1;

    if (!studentProgressMap[studentid]) {
      studentProgressMap[studentid] = {
        studentid,
        username: student.username,
        classgroup: student.classgroup,
        assignedCount: 0,
        completedCount: 0,
        verifiedCount: 0,
        subjects: {}
      };
    }

    incrementProgress(studentProgressMap[studentid], completed, verified);

    if (!studentProgressMap[studentid].subjects[subjectid]) {
      studentProgressMap[studentid].subjects[subjectid] = createProgressSummary({
        subjectid,
        subjectname
      });
    }
    incrementProgress(studentProgressMap[studentid].subjects[subjectid], completed, verified);

    const groupKey = student.classgroup || "Ungrouped";
    if (!groupProgressMap[groupKey]) {
      groupProgressMap[groupKey] = createProgressSummary({ classgroup: groupKey });
    }
    incrementProgress(groupProgressMap[groupKey], completed, verified);

    if (!subjectProgressMap[subjectid]) {
      subjectProgressMap[subjectid] = createProgressSummary({ subjectid, subjectname });
    }
    incrementProgress(subjectProgressMap[subjectid], completed, verified);
  });

  const students = Object.values(studentProgressMap).map(student => {
    const subjects = Object.values(student.subjects)
      .map(withProgressPercentages)
      .sort((a, b) => compareText(a.subjectid, b.subjectid) || compareText(a.subjectname, b.subjectname));

    return {
      studentid: student.studentid,
      username: student.username,
      classgroup: student.classgroup,
      assignedCount: student.assignedCount,
      completedCount: student.completedCount,
      verifiedCount: student.verifiedCount,
      completedPercent: percent(student.completedCount, student.assignedCount),
      verifiedPercent: percent(student.verifiedCount, student.assignedCount),
      subjects
    };
  }).sort((a, b) => compareText(a.classgroup, b.classgroup) || compareText(a.username, b.username));

  const groups = Object.values(groupProgressMap)
    .map(withProgressPercentages)
    .sort((a, b) => compareText(a.classgroup, b.classgroup));

  const subjects = Object.values(subjectProgressMap)
    .map(withProgressPercentages)
    .sort((a, b) => compareText(a.subjectid, b.subjectid) || compareText(a.subjectname, b.subjectname));

  return {
    success: true,
    filters: {
      studentid: requestedStudentId,
      classgroup: requestedGroup,
      subjectid: requestedSubjectId
    },
    summary: {
      assignedCount: totalAssigned,
      completedCount: totalCompleted,
      verifiedCount: totalVerified,
      completedPercent: percent(totalCompleted, totalAssigned),
      verifiedPercent: percent(totalVerified, totalAssigned)
    },
    groups,
    subjects,
    students
  };
}

export function buildTaskProgressDetailResponse(options = {}) {
  const requestedStudentId = clean(options.studentid) || "ALL";
  const requestedGroup = clean(options.classgroup) || "ALL";
  // The existing API field remains subjectid, but the UI uses it as ModuleID.
  const requestedModuleId = clean(options.subjectid) || "ALL";
  const requestedTaskId = clean(options.taskid) || "ALL";
  const activeStudents = buildStudentLookup(
    options.studentRows || [],
    requestedStudentId,
    requestedGroup
  );
  const taskMap = buildTaskLookup(options.taskRows || []);
  const subjectMap = buildSubjectLookup(options.subjectRows || []);
  const studentTaskRows = options.studentTaskRows || [];
  const headerMap = buildHeaderMap(studentTaskRows[0] || []);
  const moduleSummaryMap = {};
  const taskSummaryMap = {};
  const studentTaskDetails = [];

  studentTaskRows.slice(1).forEach(row => {
    const studenttaskid = clean(getCell(
      row,
      headerMap,
      ["StudentTaskID", "StudentTaskId", "studenttaskid"]
    ));
    const studentid = clean(getCell(row, headerMap, ["StudentID", "StudentId", "studentid"]));
    const taskid = clean(getCell(row, headerMap, ["TaskID", "TaskId", "taskid"]));
    const student = activeStudents[studentid];

    if (!student) return;

    const task = taskMap[taskid];
    if (!task) return;

    const subjectid = clean(
      task.subjectid || getCell(row, headerMap, ["SubjectID", "SubjectId", "subjectid"])
    );
    const subject = subjectMap[subjectid] || {};
    const subjectname = task.subjectname || subject.subjectname || subjectid;
    const moduleid = clean(
      task.moduleid ||
      getCell(row, headerMap, ["ModuleID", "ModuleId", "moduleid"]) ||
      subjectid ||
      "GENERAL"
    );
    const modulename = clean(
      task.modulename ||
      getCell(row, headerMap, ["ModuleName", "Module", "modulename"]) ||
      subjectname ||
      "General"
    );

    if (requestedModuleId !== "ALL" && moduleid !== requestedModuleId) return;
    if (requestedTaskId !== "ALL" && taskid !== requestedTaskId) return;

    const completestatus = clean(getCell(
      row,
      headerMap,
      ["CompleteStatus", "Complete", "Completed", "completestatus"],
      ""
    ));
    const completedate = getCell(
      row,
      headerMap,
      ["CompleteDate", "CompletedDate", "completedate"],
      ""
    );
    const verifystatus = clean(getCell(
      row,
      headerMap,
      ["VerifyStatus", "Verified", "verifystatus"],
      ""
    ));
    const verifydate = getCell(
      row,
      headerMap,
      ["VerifyDate", "VerifiedDate", "verifydate"],
      ""
    );
    const completed = completestatus !== "";
    const verified = verifystatus !== "";

    if (!moduleSummaryMap[moduleid]) {
      moduleSummaryMap[moduleid] = createProgressSummary({
        subjectid: moduleid,
        subjectname: modulename,
        moduleid,
        modulename
      });
    }
    incrementProgress(moduleSummaryMap[moduleid], completed, verified);

    if (!taskSummaryMap[taskid]) {
      taskSummaryMap[taskid] = createProgressSummary({
        taskid,
        taskname: task.taskname,
        subjectid,
        subjectname,
        moduleid,
        modulename
      });
    }
    incrementProgress(taskSummaryMap[taskid], completed, verified);

    studentTaskDetails.push({
      studenttaskid,
      studentid,
      username: student.username,
      classgroup: student.classgroup,
      taskid,
      taskname: task.taskname,
      subjectid,
      subjectname,
      moduleid,
      modulename,
      completestatus,
      completedate,
      verifystatus,
      verifydate,
      displayCompleteStatus: completed ? "COMPLETE" : "to be completed",
      displayVerifyStatus: verified ? "VERIFIED" : "not verified"
    });
  });

  const subjects = Object.values(moduleSummaryMap)
    .map(withProgressPercentages)
    .sort((a, b) => compareText(a.moduleid, b.moduleid) || compareText(a.modulename, b.modulename));

  const tasks = Object.values(taskSummaryMap)
    .map(withProgressPercentages)
    .sort((a, b) => (
      compareText(a.moduleid, b.moduleid) ||
      compareText(a.taskid, b.taskid) ||
      compareText(a.taskname, b.taskname)
    ));

  studentTaskDetails.sort((a, b) => (
    compareText(a.classgroup, b.classgroup) || compareText(a.username, b.username)
  ));

  return {
    success: true,
    filters: {
      studentid: requestedStudentId,
      classgroup: requestedGroup,
      subjectid: requestedModuleId,
      moduleid: requestedModuleId,
      taskid: requestedTaskId
    },
    subjects,
    modules: subjects,
    tasks,
    students: studentTaskDetails
  };
}

async function readRequiredProgressSheets(env, sheetNames) {
  const ranges = sheetNames.map(sheetName => `${sheetName}!${FULL_SHEET_RANGE}`);
  try {
    const rowSets = await batchReadGoogleSheetValues(env, ranges);
    return {
      ok: true,
      rows: Object.fromEntries(sheetNames.map((sheetName, index) => [sheetName, rowSets[index] || []]))
    };
  } catch (error) {
    const missingSheet = sheetNames.find(sheetName => isMissingSheetError(error, sheetName));
    if (missingSheet) {
      return { ok: false, missingSheet, rows: {} };
    }
    throw error;
  }
}

function buildSubjectLookup(rows) {
  const headerMap = buildHeaderMap(rows[0] || []);
  const map = {};

  rows.slice(1).forEach(row => {
    const subjectid = clean(getCell(row, headerMap, ["SubjectID", "SubjectId", "subjectid"]));
    if (!subjectid) return;

    map[subjectid] = {
      subjectid,
      subjectname: getCell(
        row,
        headerMap,
        ["SubjectName", "Subject", "subjectname"],
        subjectid
      ),
      active: getCell(row, headerMap, ["Active", "Status"], true)
    };
  });

  return map;
}

function buildTaskLookup(rows) {
  const headerMap = buildHeaderMap(rows[0] || []);
  const map = {};

  rows.slice(1).forEach(row => {
    const taskid = clean(getCell(row, headerMap, ["TaskID", "TaskId", "taskid"]));
    if (!taskid) return;

    map[taskid] = {
      taskid,
      subjectid: clean(getCell(row, headerMap, ["SubjectID", "SubjectId", "subjectid"])),
      subjectname: getCell(row, headerMap, ["SubjectName", "Subject", "subjectname"], ""),
      moduleid: clean(getCell(
        row,
        headerMap,
        ["ModuleID", "ModuleId", "moduleid", "ModuletID"]
      )),
      modulename: getCell(row, headerMap, ["ModuleName", "Module", "modulename"], ""),
      taskname: getCell(row, headerMap, ["TaskName", "Task", "taskname"], taskid),
      audiolink: getCell(row, headerMap, ["AudioLink", "Audio", "audiolink"], ""),
      graphiclink: getCell(
        row,
        headerMap,
        ["GraphicLink", "GraphicsLink", "Graphic", "ImageLink", "graphiclink"],
        ""
      ),
      visuallink: getCell(row, headerMap, ["VisualLink", "Visual", "visuallink"], ""),
      videolink: getCell(row, headerMap, ["VideoLink", "Video", "videolink"], ""),
      pdflink: getCell(row, headerMap, ["PDFLink", "PdfLink", "PDF", "pdflink"], ""),
      active: getCell(row, headerMap, ["Active", "Status"], true)
    };
  });

  return map;
}

function buildStudentLookup(rows, requestedStudentId, requestedGroup) {
  const headerMap = buildHeaderMap(rows[0] || []);
  const map = {};

  rows.slice(1).forEach(row => {
    const studentid = clean(getCell(row, headerMap, ["StudentID", "StudentId", "studentid"]));
    const username = getCell(row, headerMap, ["Username", "Name", "StudentName"], "");
    const classgroup = clean(getCell(
      row,
      headerMap,
      ["classgroup", "ClassGroup", "Group", "GroupNo"],
      ""
    ));
    const active = getCell(row, headerMap, ["Active", "Status"], true);

    if (!studentid || !isActiveValue(active) || classgroup === "0") return;
    if (requestedStudentId !== "ALL" && studentid !== requestedStudentId) return;
    if (requestedGroup !== "ALL" && classgroup !== requestedGroup) return;

    map[studentid] = { studentid, username, classgroup, active };
  });

  return map;
}

function buildActiveTaskResourcesMap(rows) {
  const map = {};

  rows.slice(1).forEach(row => {
    if (row[5] !== true) return;

    const taskid = clean(row[1]);
    if (!map[taskid]) map[taskid] = [];

    map[taskid].push({
      taskresourceid: valueAt(row, 0),
      taskid: valueAt(row, 1),
      taskresourcename: valueAt(row, 2),
      resourcetype: valueAt(row, 3),
      resourcelink: valueAt(row, 4),
      active: valueAt(row, 5),
      createdate: valueAt(row, 6)
    });
  });

  Object.values(map).forEach(resources => {
    resources.sort((a, b) => String(a.taskresourcename).localeCompare(
      String(b.taskresourcename)
    ));
  });

  return map;
}

function createProgressSummary(identity) {
  return {
    ...identity,
    assignedCount: 0,
    completedCount: 0,
    verifiedCount: 0
  };
}

function incrementProgress(summary, completed, verified) {
  summary.assignedCount += 1;
  if (completed) summary.completedCount += 1;
  if (verified) summary.verifiedCount += 1;
}

function withProgressPercentages(summary) {
  return {
    ...summary,
    completedPercent: percent(summary.completedCount, summary.assignedCount),
    verifiedPercent: percent(summary.verifiedCount, summary.assignedCount)
  };
}

function percent(part, total) {
  if (!total || total === 0) return 0;
  return Math.round((part / total) * 1000) / 10;
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

function valueAt(row, index) {
  const value = Array.isArray(row) ? row[index] : undefined;
  return value === undefined || value === null ? "" : value;
}

function isActiveValue(value) {
  if (value === undefined || value === null || value === "") return true;
  if (value === true) return true;
  const text = clean(value).toLowerCase();
  return ["true", "1", "yes", "active"].includes(text);
}

function compareText(a, b) {
  return String(a || "").localeCompare(String(b || ""), undefined, {
    numeric: true,
    sensitivity: "base"
  });
}

function normalizeHeader(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
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
