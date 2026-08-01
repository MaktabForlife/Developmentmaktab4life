import { requireAdminOrSenior } from "../lib/auth.js";
import {
  appendGoogleSheetValues,
  readGoogleSheetValues,
  updateGoogleSheetValues
} from "../lib/google-sheets.js";
import { json } from "../lib/http.js";

const STUDENT_RECORDS_SHEET = "StudentRecords";
const STUDENT_TASKS_SHEET = "StudentTasks";
const TASK_LIST_SHEET = "TaskList";
const SYSTEM_CONFIG_SHEET = "SystemConfig";
const FULL_SHEET_RANGE = "A:ZZ";
const STUDENT_TASKS_APPEND_RANGE = `${STUDENT_TASKS_SHEET}!A:J`;

export async function assignTasksGoogleSheetsEndpoint(request, env) {
  const permission = await requireAdminOrSenior(request, env);

  if (!permission.ok) {
    return permission.response;
  }

  const body = await request.json();
  const options = {
    assignedBy: clean(permission.user.adminid),
    taskids: Array.isArray(body.taskids) ? body.taskids.map(String) : [],
    studentids: Array.isArray(body.studentids) ? body.studentids.map(String) : [],
    classgroup: clean(body.classgroup),
    assignAllStudents: body.assignAllStudents === true,
    assignAllTasksForSubject: body.assignAllTasksForSubject === true,
    subjectid: clean(body.subjectid)
  };

  if (!options.assignedBy) {
    return json({ success: false, error: "Missing assignedBy" });
  }

  const result = await assignTasksToStudents(env, options);
  return json(result);
}

async function assignTasksToStudents(env, options) {
  let finalTaskIds = options.taskids.map(clean).filter(Boolean);
  let finalStudentIds = options.studentids.map(clean).filter(Boolean);
  let taskRows;
  let studentRows;

  if (options.assignAllTasksForSubject) {
    if (!options.subjectid) {
      return {
        success: false,
        error: "Missing subjectid for assignAllTasksForSubject"
      };
    }

    taskRows = await readTaskAssignmentSheet(env, TASK_LIST_SHEET);

    if (taskRows === null) {
      return missingSheetResult(TASK_LIST_SHEET);
    }

    finalTaskIds = getActiveTaskIdsBySubject(taskRows, options.subjectid);
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
    return { success: false, error: "No tasks selected" };
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

  const validTasks = getTaskMapByIds(taskRows, finalTaskIds);
  const validStudents = getStudentMapByIds(studentRows, finalStudentIds);
  const existingAssignments = getExistingStudentTaskPairs(studentTaskRows);
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
    const idResult = await reserveStudentTaskIds(env, assignments.length);

    if (!idResult.ok) {
      return { success: false, error: idResult.error };
    }

    const rowsToAdd = assignments.map((assignment, index) => [
      idResult.ids[index],
      assignment.studentid,
      assignment.task.taskid,
      assignment.task.subjectid,
      "",
      "",
      "",
      "",
      options.assignedBy,
      assignment.assignedDate
    ]);

    await appendGoogleSheetValues(env, STUDENT_TASKS_APPEND_RANGE, rowsToAdd);
  }

  return {
    success: true,
    message: "Task assignment completed",
    assignedCount: assignments.length,
    skippedDuplicate,
    skippedInvalidTask,
    skippedInvalidStudent
  };
}

function getActiveTaskIdsBySubject(rows, subjectid) {
  const taskIds = [];

  rows.slice(1).forEach(row => {
    const rowSubjectId = clean(getValue(row, 1));
    const active = getValue(row, 7);

    if (rowSubjectId === subjectid && active === true) {
      taskIds.push(clean(getValue(row, 0)));
    }
  });

  return taskIds;
}

function getActiveStudentIdsByGroup(rows, classgroup) {
  const requestedGroup = clean(classgroup || "ALL");
  const studentIds = [];

  rows.slice(1).forEach(row => {
    const active = getValue(row, 10);
    const rowGroup = clean(getValue(row, 6));

    if (active !== true) return;
    if (requestedGroup !== "ALL" && rowGroup !== requestedGroup) return;

    studentIds.push(clean(getValue(row, 0)));
  });

  return studentIds;
}

function getTaskMapByIds(rows, taskIds) {
  const wanted = new Set(taskIds.map(clean));
  const map = new Map();

  rows.slice(1).forEach(row => {
    const taskid = clean(getValue(row, 0));
    const active = getValue(row, 7);

    if (!wanted.has(taskid) || active !== true) return;

    map.set(taskid, {
      taskid,
      subjectid: getValue(row, 1),
      taskname: getValue(row, 2)
    });
  });

  return map;
}

function getStudentMapByIds(rows, studentIds) {
  const wanted = new Set(studentIds.map(clean));
  const map = new Map();

  rows.slice(1).forEach(row => {
    const studentid = clean(getValue(row, 0));
    const active = getValue(row, 10);

    if (!wanted.has(studentid) || active !== true) return;

    map.set(studentid, {
      studentid,
      username: getValue(row, 1),
      classgroup: getValue(row, 6)
    });
  });

  return map;
}

function getExistingStudentTaskPairs(rows) {
  const pairs = new Set();

  rows.slice(1).forEach(row => {
    const studentid = clean(getValue(row, 1));
    const taskid = clean(getValue(row, 2));

    if (studentid && taskid) {
      pairs.add(`${studentid}|${taskid}`);
    }
  });

  return pairs;
}

async function reserveStudentTaskIds(env, count) {
  const rows = await readTaskAssignmentSheet(env, SYSTEM_CONFIG_SHEET);

  if (rows === null) {
    return { ok: false, error: "SystemConfig sheet not found" };
  }

  const rowIndex = rows.findIndex(row => clean(getValue(row, 0)) === "NextStudentTaskNumber");

  if (rowIndex === -1) {
    return { ok: false, error: "NextStudentTaskNumber not found" };
  }

  const current = Number(getValue(rows[rowIndex], 1));
  const ids = Array.from({ length: count }, (_, index) => `STASK${current + index}`);

  await updateGoogleSheetValues(
    env,
    `${SYSTEM_CONFIG_SHEET}!B${rowIndex + 1}`,
    [[current + count]]
  );

  return { ok: true, ids };
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
