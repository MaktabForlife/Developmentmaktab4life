import { requireAdminOrSenior } from "../lib/auth.js";
import {
  appendGoogleSheetValues,
  readGoogleSheetValues
} from "../lib/google-sheets.js";
import { json } from "../lib/http.js";
import { nextSequentialIds } from "../lib/sequential-ids.js";

const STUDENT_RECORDS_SHEET = "StudentRecords";
const STUDENT_TASKS_SHEET = "StudentTasks";
const TASK_LIST_SHEET = "TaskList";
const FULL_SHEET_RANGE = "A:ZZ";

export async function assignTasksGoogleSheetsEndpoint(request, env) {
  const permission = await requireAdminOrSenior(request, env);

  if (!permission.ok) {
    return permission.response;
  }

  const body = await request.json();
  const assignmentMode = clean(body.assignmentMode).toLowerCase();
  const options = {
    assignedBy: clean(
      permission.user.adminid ||
      permission.user.username ||
      permission.user.uniqueid
    ),
    taskids: Array.isArray(body.taskids) ? body.taskids.map(String) : [],
    studentids: Array.isArray(body.studentids) ? body.studentids.map(String) : [],
    classgroup: clean(body.classgroup),
    assignAllStudents: body.assignAllStudents === true,
    assignAllTasks: body.assignAllTasks === true || assignmentMode === "all",
    assignAllTasksForSubject: body.assignAllTasksForSubject === true,
    subjectid: clean(body.subjectid),
    selectedModules: normalizeSelectedModules(body.selectedModules)
  };

  if (!options.assignedBy) {
    return json({ success: false, error: "Missing assignedBy" });
  }

  const result = await assignTasksToStudents(env, options);
  return json(result);
}

async function assignTasksToStudents(env, options) {
  let finalTaskIds = uniqueCleanValues(options.taskids);
  let finalStudentIds = uniqueCleanValues(options.studentids);
  let taskRows;
  let studentRows;

  if (
    options.assignAllTasks ||
    options.selectedModules.length > 0 ||
    options.assignAllTasksForSubject
  ) {
    taskRows = await readTaskAssignmentSheet(env, TASK_LIST_SHEET);

    if (taskRows === null) {
      return missingSheetResult(TASK_LIST_SHEET);
    }

    if (options.assignAllTasks) {
      finalTaskIds = getActiveTaskIds(taskRows);
    } else if (options.selectedModules.length > 0) {
      finalTaskIds = getActiveTaskIdsByModules(taskRows, options.selectedModules);
    } else {
      if (!options.subjectid) {
        return {
          success: false,
          error: "Missing subjectid for assignAllTasksForSubject"
        };
      }

      finalTaskIds = getActiveTaskIdsBySubject(taskRows, options.subjectid);
    }
  }

  if (options.assignAllStudents || options.classgroup) {
    studentRows = await readTaskAssignmentSheet(env, STUDENT_RECORDS_SHEET);

    if (studentRows === null) {
      return missingSheetResult(STUDENT_RECORDS_SHEET);
    }

    finalStudentIds = getActiveStudentIdsByGroup(
      studentRows,
      options.assignAllStudents ? "ALL" : options.classgroup
    );
  }

  if (finalTaskIds.length === 0) {
    return { success: false, error: "No active tasks selected" };
  }

  if (finalStudentIds.length === 0) {
    return { success: false, error: "No students selected" };
  }

  if (!taskRows) {
    taskRows = await readTaskAssignmentSheet(env, TASK_LIST_SHEET);

    if (taskRows === null) {
      return missingSheetResult(TASK_LIST_SHEET);
    }
  }

  if (!studentRows) {
    studentRows = await readTaskAssignmentSheet(env, STUDENT_RECORDS_SHEET);

    if (studentRows === null) {
      return missingSheetResult(STUDENT_RECORDS_SHEET);
    }
  }

  const studentTaskRows = await readTaskAssignmentSheet(env, STUDENT_TASKS_SHEET);

  if (studentTaskRows === null) {
    return missingSheetResult(STUDENT_TASKS_SHEET);
  }

  const studentTaskHeaders = studentTaskRows[0] || [];
  const studentTaskHeaderMap = buildHeaderMap(studentTaskHeaders);
  const studentTaskColumns = {
    id: findColumn(studentTaskHeaderMap, ["StudentTaskID", "StudentTaskId", "studenttaskid"]),
    studentid: findColumn(studentTaskHeaderMap, ["StudentID", "StudentId", "studentid"]),
    taskid: findColumn(studentTaskHeaderMap, ["TaskID", "TaskId", "taskid"])
  };

  if (
    studentTaskHeaders.length === 0 ||
    studentTaskColumns.id === -1 ||
    studentTaskColumns.studentid === -1 ||
    studentTaskColumns.taskid === -1
  ) {
    return {
      success: false,
      error: "StudentTasks sheet is missing StudentTaskID, StudentID or TaskID"
    };
  }

  const validTasks = getTaskMapByIds(taskRows, finalTaskIds);
  const validStudents = getStudentMapByIds(studentRows, finalStudentIds);

  if (validTasks.size === 0) {
    return { success: false, error: "No active tasks selected" };
  }

  if (validStudents.size === 0) {
    return { success: false, error: "Selected student is inactive or not found" };
  }

  const existingAssignments = getExistingStudentTaskPairs(
    studentTaskRows,
    studentTaskColumns
  );
  const assignedDate = new Date().toISOString();
  const assignments = [];
  let skippedDuplicate = 0;
  let skippedInvalidTask = 0;
  let skippedInvalidStudent = 0;

  finalStudentIds.forEach(studentid => {
    const student = validStudents.get(studentid);

    if (!student) {
      skippedInvalidStudent += 1;
      return;
    }

    finalTaskIds.forEach(taskid => {
      const task = validTasks.get(taskid);

      if (!task) {
        skippedInvalidTask += 1;
        return;
      }

      const pairKey = `${studentid}|${taskid}`;

      if (existingAssignments.has(pairKey)) {
        skippedDuplicate += 1;
        return;
      }

      existingAssignments.add(pairKey);
      assignments.push({ studentid, task, assignedDate });
    });
  });

  if (assignments.length > 0) {
    const studentTaskIds = nextSequentialIds(
      studentTaskRows,
      "STASK",
      assignments.length,
      { idColumn: studentTaskColumns.id }
    );

    const rowsToAdd = assignments.map((assignment, index) => (
      buildStudentTaskRow(
        studentTaskHeaders,
        studentTaskHeaderMap,
        {
          studenttaskid: studentTaskIds[index],
          studentid: assignment.studentid,
          task: assignment.task,
          assignedBy: options.assignedBy,
          assignedDate: assignment.assignedDate
        }
      )
    ));

    await appendGoogleSheetValues(
      env,
      `${STUDENT_TASKS_SHEET}!A:${columnIndexToA1(studentTaskHeaders.length - 1)}`,
      rowsToAdd
    );
  }

  return {
    success: true,
    message: assignments.length > 0
      ? "Task assignment completed"
      : "All selected tasks were already assigned",
    assignedCount: assignments.length,
    skippedDuplicate,
    skippedInvalidTask,
    skippedInvalidStudent
  };
}

function normalizeSelectedModules(value) {
  if (!Array.isArray(value)) return [];

  const unique = new Map();

  value.forEach(item => {
    const source = item || {};
    const subjectid = clean(source.subjectid || source.SubjectID || source.subjectId);
    const moduleid = clean(source.moduleid || source.ModuleID || source.moduleId) || "NO_MODULE";

    if (!subjectid) return;

    unique.set(`${subjectid}|${moduleid}`, { subjectid, moduleid });
  });

  return Array.from(unique.values());
}

function getActiveTaskIds(rows) {
  return readActiveTasks(rows).map(task => task.taskid);
}

function getActiveTaskIdsBySubject(rows, subjectid) {
  const requestedSubject = clean(subjectid);

  return readActiveTasks(rows)
    .filter(task => task.subjectid === requestedSubject)
    .map(task => task.taskid);
}

function getActiveTaskIdsByModules(rows, selectedModules) {
  const selectedKeys = new Set(
    selectedModules.map(item => `${item.subjectid}|${item.moduleid || "NO_MODULE"}`)
  );

  return readActiveTasks(rows)
    .filter(task => selectedKeys.has(`${task.subjectid}|${task.moduleid || "NO_MODULE"}`))
    .map(task => task.taskid);
}

function readActiveTasks(rows) {
  const headerMap = buildHeaderMap(rows[0] || []);
  const tasks = [];

  rows.slice(1).forEach(row => {
    const task = readTask(row, headerMap);

    if (task.taskid && task.subjectid && isActiveValue(task.active)) {
      tasks.push(task);
    }
  });

  return tasks;
}

function readTask(row, headerMap) {
  const taskid = clean(getCell(row, headerMap, ["TaskID", "TaskId", "taskid"]));

  return {
    taskid,
    subjectid: clean(getCell(row, headerMap, ["SubjectID", "SubjectId", "subjectid"])),
    subjectname: clean(getCell(row, headerMap, ["SubjectName", "Subject", "subjectname"])),
    moduleid: clean(getCell(row, headerMap, ["ModuleID", "ModuleId", "moduleid", "ModuletID"])),
    modulename: clean(getCell(row, headerMap, ["ModuleName", "Module", "modulename"])),
    taskname: clean(getCell(row, headerMap, ["TaskName", "Task", "taskname"], taskid)),
    active: getCell(row, headerMap, ["Active", "Status", "active"], true)
  };
}

function getActiveStudentIdsByGroup(rows, classgroup) {
  const requestedGroup = clean(classgroup || "ALL");
  const headerMap = buildHeaderMap(rows[0] || []);
  const studentIds = [];

  rows.slice(1).forEach(row => {
    const active = getCell(row, headerMap, ["Active", "Status", "active"], true);
    const rowGroup = clean(getCell(row, headerMap, ["ClassGroup", "Group", "classgroup"]));
    const studentid = clean(getCell(row, headerMap, ["StudentID", "StudentId", "studentid"]));

    if (!studentid || !isActiveValue(active)) return;
    if (requestedGroup !== "ALL" && rowGroup !== requestedGroup) return;

    studentIds.push(studentid);
  });

  return studentIds;
}

function getTaskMapByIds(rows, taskIds) {
  const wanted = new Set(uniqueCleanValues(taskIds));
  const map = new Map();

  readActiveTasks(rows).forEach(task => {
    if (wanted.has(task.taskid)) {
      map.set(task.taskid, task);
    }
  });

  return map;
}

function getStudentMapByIds(rows, studentIds) {
  const wanted = new Set(uniqueCleanValues(studentIds));
  const headerMap = buildHeaderMap(rows[0] || []);
  const map = new Map();

  rows.slice(1).forEach(row => {
    const studentid = clean(getCell(row, headerMap, ["StudentID", "StudentId", "studentid"]));
    const active = getCell(row, headerMap, ["Active", "Status", "active"], true);

    if (!wanted.has(studentid) || !isActiveValue(active)) return;

    map.set(studentid, {
      studentid,
      username: getCell(row, headerMap, ["Username", "Name", "username"]),
      classgroup: getCell(row, headerMap, ["ClassGroup", "Group", "classgroup"])
    });
  });

  return map;
}

function getExistingStudentTaskPairs(rows, columns) {
  const pairs = new Set();

  rows.slice(1).forEach(row => {
    const studentid = clean(getValue(row, columns.studentid));
    const taskid = clean(getValue(row, columns.taskid));

    if (studentid && taskid) {
      pairs.add(`${studentid}|${taskid}`);
    }
  });

  return pairs;
}

function buildStudentTaskRow(headers, headerMap, options) {
  const row = new Array(headers.length).fill("");
  const task = options.task;

  setCell(row, headerMap, ["StudentTaskID", "StudentTaskId", "studenttaskid"], options.studenttaskid);
  setCell(row, headerMap, ["StudentID", "StudentId", "studentid"], options.studentid);
  setCell(row, headerMap, ["TaskID", "TaskId", "taskid"], task.taskid);
  setCell(row, headerMap, ["SubjectID", "SubjectId", "subjectid"], task.subjectid);
  setCell(row, headerMap, ["SubjectName", "Subject", "subjectname"], task.subjectname);
  setCell(row, headerMap, ["ModuleID", "ModuleId", "moduleid", "ModuletID"], task.moduleid);
  setCell(row, headerMap, ["ModuleName", "Module", "modulename"], task.modulename);
  setCell(row, headerMap, ["TaskName", "Task", "taskname"], task.taskname);
  setCell(row, headerMap, ["CompleteStatus", "Complete", "Completed", "completestatus"], "");
  setCell(row, headerMap, ["CompleteDate", "CompletedDate", "completedate"], "");
  setCell(row, headerMap, ["VerifyStatus", "Verified", "verifystatus"], "");
  setCell(row, headerMap, ["VerifyDate", "VerifiedDate", "verifydate"], "");
  setCell(row, headerMap, ["AssignedBy", "assignedby"], options.assignedBy);
  setCell(row, headerMap, ["AssignedDate", "assigneddate"], options.assignedDate);

  return row;
}

async function readTaskAssignmentSheet(env, sheetName) {
  try {
    return await readGoogleSheetValues(env, `${sheetName}!${FULL_SHEET_RANGE}`);
  } catch (error) {
    if (isMissingSheetError(error, sheetName)) {
      return null;
    }

    throw error;
  }
}

function missingSheetResult(sheetName) {
  return { success: false, error: `${sheetName} sheet not found` };
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

function findColumn(headerMap, names) {
  for (const name of names) {
    const index = headerMap[normalizeHeader(name)];

    if (index !== undefined) return index;
  }

  return -1;
}

function getCell(row, headerMap, names, fallback = "") {
  const column = findColumn(headerMap, names);

  if (column === -1) return fallback;

  const value = Array.isArray(row) ? row[column] : undefined;
  return value === undefined || value === null ? fallback : value;
}

function setCell(row, headerMap, names, value) {
  const column = findColumn(headerMap, names);

  if (column !== -1) {
    row[column] = value;
  }
}

function isActiveValue(value) {
  if (value === undefined || value === null || value === "") return true;
  if (value === true) return true;

  return ["true", "1", "yes", "active"].includes(clean(value).toLowerCase());
}

function uniqueCleanValues(values) {
  return Array.from(new Set((values || []).map(clean).filter(Boolean)));
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

function normalizeHeader(value) {
  return clean(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isMissingSheetError(error, sheetName) {
  const message = error && error.message ? error.message : String(error || "");
  return message.includes("Google Sheets API error 400:") &&
    message.includes("Unable to parse range") &&
    message.toLowerCase().includes(String(sheetName).toLowerCase());
}

function getValue(row, index) {
  const value = Array.isArray(row) ? row[index] : "";
  return value === undefined || value === null ? "" : value;
}

function clean(value) {
  return String(value === undefined || value === null ? "" : value).trim();
}
