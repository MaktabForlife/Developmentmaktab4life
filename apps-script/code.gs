/*
===============================================================================
MAKTABHELPER — APPS SCRIPT ACTIVE BRIDGE
Last updated: 5 August 2026
Migration milestone: V98.14
===============================================================================

SOURCE OF TRUTH:
- This repository file is authoritative.
- Synchronize the complete file to the bound Apps Script project; do not
  maintain an independent dashboard copy.

V98.14 OWNERSHIP:
- All migrated application data routes are direct Cloudflare Worker-to-Google
  Sheets API operations. Their retired Apps Script actions and implementations
  have been removed.
- Apps Script remains only for the explicitly retained utilities below and the
  Weekly Planner PNG-to-Google-Drive bridge.

CALLABLE doPost ACTIONS:
- registerAdmin
- getAdminByUsername
- createTaskResource
- listTaskResources
- updateTaskResource
- populateAllStudentTasks
- getStudentTaskById
- saveWeeklyPlannerPreviewToDrive

MANUAL DEPLOYMENT / MAINTENANCE FUNCTIONS:
- authorizeM4LServices
- testPopulateAllStudentTasksDryRun
- testPopulateAllStudentTasksReal

Do not add a migrated Sheets action back to doPost. A future utility migration
or retirement must update apps-script/MIGRATION-CHANGELOG.md and the automated
Apps Script cleanup test in the same change.
===============================================================================
*/

const SYSTEM_CONFIG_SHEET_NAME = "SystemConfig";
const WEEKLY_PLANNER_DRIVE_FOLDER_ID_CONFIG_KEY = "WeeklyPlannerDriveFolderId";
const WEEKLY_PLANNER_DRIVE_FOLDER_LABEL_CONFIG_KEY = "WeeklyPlannerDriveFolderLabel";
const DEFAULT_WEEKLY_PLANNER_DRIVE_FOLDER_LABEL = "Weekly Planner";

/* =========================
   ADMIN MAINTENANCE UTILITIES
========================= */

function generateUniqueId() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let id = "";

  for (let i = 0; i < 10; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return id;
}

function registerAdmin(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName("AdminRecords");

  const adminId = generateAdminId();
  const uniqueId = generateUniqueId();
  const now = new Date().toISOString();

  const row = [
    adminId,                  // adminid
    data.username,            // username
    uniqueId,                 // uniqueid
    false,                    // pinsetup
    "",                       // pinhash
    data.role,                // role
    data.assignedgroup,       // assignedgroup
    true,                     // active
    now,                      // createdate
    ""                        // lastlogin
  ];

  sheet.appendRow(row);

  return {
    success: true,
    adminid: adminId,
    username: data.username,
    uniqueid: uniqueId,
    role: data.role
  };
}

function generateAdminId() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName("SystemConfig");

  const data = sheet.getDataRange().getValues();

  for (let i = 0; i < data.length; i++) {
    if (data[i][0] === "NextAdminNumber") {

      const current = Number(data[i][1]);

      sheet.getRange(i + 1, 2).setValue(current + 1);

      return "ADMIN" + current;
    }
  }

  throw new Error("NextAdminNumber not found");
}

function getAdminByUsername(username) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName("AdminRecords");

  const data = sheet.getDataRange().getValues();
  const searchUsername = String(username).trim().toLowerCase();

  for (let i = 1; i < data.length; i++) {
    const rowUsername = String(data[i][1]).trim().toLowerCase();

    if (rowUsername === searchUsername) {
      return {
        row: i + 1,
        adminid: data[i][0],
        username: data[i][1],
        uniqueid: data[i][2],
        pinsetup: data[i][3],
        pinhash: data[i][4],
        role: data[i][5],
        assignedgroup: data[i][6],
        active: data[i][7],
        createdate: data[i][8],
        lastlogin: data[i][9]
      };
    }
  }

  return null;
}


/* =========================
   TASK RESOURCE ADMINISTRATION
========================= */

function generateTaskResourceId() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName("SystemConfig");

  const data = sheet.getDataRange().getValues();

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === "NextTaskResourceNumber") {
      const current = Number(data[i][1]);

      sheet.getRange(i + 1, 2).setValue(current + 1);

      return "TRES" + current;
    }
  }

  throw new Error("NextTaskResourceNumber not found");
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")   // remove accents
    .replace(/[^a-z0-9]/g, "");        // remove spaces, apostrophes, punctuation
}

function getTaskMapByIds(taskIds) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName("TaskList");

  const rows = sheet.getDataRange().getValues();
  const wanted = new Set(taskIds.map(id => String(id).trim()));
  const map = {};

  for (let i = 1; i < rows.length; i++) {
    const taskId = String(rows[i][0]).trim();
    const active = rows[i][7];

    if (!wanted.has(taskId)) {
      continue;
    }

    if (active !== true) {
      continue;
    }

    map[taskId] = {
      taskid: taskId,
      subjectid: rows[i][1],
      taskname: rows[i][2]
    };
  }

  return map;
}

function findTaskResourceByTaskAndName(taskId, taskResourceName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName("TaskResources");

  const rows = sheet.getDataRange().getValues();

  const targetTaskId = String(taskId || "").trim();
  const targetResourceName = normalizeText(taskResourceName);

  for (let i = 1; i < rows.length; i++) {
    const rowTaskId = String(rows[i][1]).trim();
    const rowResourceName = normalizeText(rows[i][2]);

    if (
      rowTaskId === targetTaskId &&
      rowResourceName === targetResourceName
    ) {
      return {
        row: i + 1,
        taskresourceid: rows[i][0],
        taskid: rows[i][1],
        taskresourcename: rows[i][2],
        resourcetype: rows[i][3],
        resourcelink: rows[i][4],
        active: rows[i][5],
        createdate: rows[i][6]
      };
    }
  }

  return null;
}

function findTaskResourceByTaskAndNameExcludingId(taskId, taskResourceName, taskResourceId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName("TaskResources");

  const rows = sheet.getDataRange().getValues();

  const targetTaskId = String(taskId || "").trim();
  const targetResourceName = normalizeText(taskResourceName);
  const excludeResourceId = String(taskResourceId || "").trim();

  for (let i = 1; i < rows.length; i++) {
    const rowResourceId = String(rows[i][0]).trim();
    const rowTaskId = String(rows[i][1]).trim();
    const rowResourceName = normalizeText(rows[i][2]);

    if (
      rowResourceId !== excludeResourceId &&
      rowTaskId === targetTaskId &&
      rowResourceName === targetResourceName
    ) {
      return {
        row: i + 1,
        taskresourceid: rows[i][0],
        taskid: rows[i][1],
        taskresourcename: rows[i][2],
        resourcetype: rows[i][3],
        resourcelink: rows[i][4],
        active: rows[i][5],
        createdate: rows[i][6]
      };
    }
  }

  return null;
}

function createTaskResource(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName("TaskResources");

  const taskId = String(data.taskid || "").trim();
  const taskResourceName = String(data.taskResourceName || "").trim();
  const resourceType = String(data.resourceType || "").trim().toUpperCase();
  const resourceLink = String(data.resourceLink || "").trim();
  const subjectId = String(data.subjectid || "").trim();

  if (!taskId) {
    return { success: false, error: "Missing taskid" };
  }

if (!subjectId) {
  return { success: false, error: "Missing subjectid" };
}

  if (!taskResourceName) {
    return { success: false, error: "Missing taskResourceName" };
  }

  if (!resourceType) {
    return { success: false, error: "Missing resourceType" };
  }

  if (!resourceLink) {
    return { success: false, error: "Missing resourceLink" };
  }

  const allowedTypes = ["PDF", "AUDIO", "VIDEO", "IMAGE", "LINK", "TEXT", "OTHER"];

  if (!allowedTypes.includes(resourceType)) {
    return {
      success: false,
      error: "Invalid resourceType"
    };
  }

  const taskMap = getTaskMapByIds([taskId]);

  if (!taskMap[taskId]) {
    return {
      success: false,
      error: "Task not found or inactive"
    };
  }

  const duplicate = findTaskResourceByTaskAndName(taskId, taskResourceName);

  if (duplicate) {
    return {
      success: false,
      duplicate: true,
      error: "Task resource already exists for this task",
      resource: duplicate
    };
  }

  const taskResourceId = generateTaskResourceId();
  const now = new Date().toISOString();

  sheet.appendRow([
  taskResourceId,
  taskId,
  taskResourceName,
  resourceType,
  resourceLink,
  true,
  now,
  subjectId
]);

  return {
    success: true,
    resource: {
      taskresourceid: taskResourceId,
      taskid: taskId,
      taskresourcename: taskResourceName,
      subjectid: subjectId,
      resourcetype: resourceType,
      resourcelink: resourceLink,
      active: true,
      createdate: now
    }
  };
}

function listTaskResources(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName("TaskResources");

  const rows = sheet.getDataRange().getValues();

  const requestedTaskId = String((data && data.taskid) || "ALL").trim();
  const activeOnly = data && data.activeOnly === true;

  const resources = [];

  for (let i = 1; i < rows.length; i++) {
    const rowTaskId = String(rows[i][1]).trim();
    const active = rows[i][5];

    if (requestedTaskId !== "ALL" && rowTaskId !== requestedTaskId) {
      continue;
    }

    if (activeOnly && active !== true) {
      continue;
    }

    resources.push({
      taskresourceid: rows[i][0],
      taskid: rows[i][1],
      taskresourcename: rows[i][2],
      resourcetype: rows[i][3],
      resourcelink: rows[i][4],
      active: rows[i][5],
      createdate: rows[i][6]
    });
  }

  resources.sort((a, b) => {
    const taskCompare = String(a.taskid).localeCompare(String(b.taskid));
    if (taskCompare !== 0) return taskCompare;

    return String(a.taskresourcename).localeCompare(String(b.taskresourcename));
  });

  return {
    success: true,
    taskid: requestedTaskId,
    count: resources.length,
    resources
  };
}

function updateTaskResource(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet()
    .getSheetByName("TaskResources");

  const taskResourceId = String(data.taskresourceid || "").trim();

  if (!taskResourceId) {
    return { success: false, error: "Missing taskresourceid" };
  }

  const rows = sheet.getDataRange().getValues();
  const allowedTypes = ["PDF", "AUDIO", "VIDEO", "IMAGE", "LINK", "TEXT", "OTHER"];

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]).trim() === taskResourceId) {
      const currentTaskId = String(rows[i][1]).trim();

      if (data.taskid !== undefined) {
        const taskId = String(data.taskid || "").trim();

        if (!taskId) {
          return { success: false, error: "taskid cannot be empty" };
        }

        const taskMap = getTaskMapByIds([taskId]);

        if (!taskMap[taskId]) {
          return {
            success: false,
            error: "Task not found or inactive"
          };
        }
      }

      if (data.taskResourceName !== undefined) {
        const taskResourceName = String(data.taskResourceName || "").trim();

        if (!taskResourceName) {
          return { success: false, error: "taskResourceName cannot be empty" };
        }

        const taskIdToCheck = data.taskid !== undefined
          ? String(data.taskid || "").trim()
          : currentTaskId;

        const duplicate = findTaskResourceByTaskAndNameExcludingId(
          taskIdToCheck,
          taskResourceName,
          taskResourceId
        );

        if (duplicate) {
          return {
            success: false,
            duplicate: true,
            error: "Another task resource with that name already exists for this task",
            resource: duplicate
          };
        }
      }

      if (data.resourceType !== undefined) {
        const resourceType = String(data.resourceType || "").trim().toUpperCase();

        if (!allowedTypes.includes(resourceType)) {
          return { success: false, error: "Invalid resourceType" };
        }
      }

      if (data.resourceLink !== undefined) {
        const resourceLink = String(data.resourceLink || "").trim();

        if (!resourceLink) {
          return { success: false, error: "resourceLink cannot be empty" };
        }
      }

      if (data.active !== undefined) {
        if (typeof data.active !== "boolean") {
          return { success: false, error: "active must be true or false" };
        }
      }

      if (data.taskid !== undefined) {
        sheet.getRange(i + 1, 2).setValue(String(data.taskid || "").trim());
      }

      if (data.taskResourceName !== undefined) {
        sheet.getRange(i + 1, 3).setValue(String(data.taskResourceName || "").trim());
      }

      if (data.resourceType !== undefined) {
        sheet.getRange(i + 1, 4).setValue(String(data.resourceType || "").trim().toUpperCase());
      }

      if (data.resourceLink !== undefined) {
        sheet.getRange(i + 1, 5).setValue(String(data.resourceLink || "").trim());
      }

      if (data.active !== undefined) {
        sheet.getRange(i + 1, 6).setValue(data.active);
      }

      return {
        success: true,
        message: "Task resource updated successfully",
        taskresourceid: taskResourceId
      };
    }
  }

  return {
    success: false,
    error: "Task resource not found"
  };
}


/* =========================
   STUDENTTASK POPULATION UTILITIES
========================= */

function normalizeHeaderKeyForTasks_(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function buildHeaderMapForTasks_(headers) {
  const map = {};
  headers.forEach((header, index) => {
    const key = normalizeHeaderKeyForTasks_(header);
    if (key && map[key] === undefined) {
      map[key] = index;
    }
  });
  return map;
}

function findTaskColumn_(headerMap, possibleHeaders) {
  for (let i = 0; i < possibleHeaders.length; i++) {
    const key = normalizeHeaderKeyForTasks_(possibleHeaders[i]);
    if (headerMap[key] !== undefined) {
      return headerMap[key];
    }
  }
  return -1;
}

function getTaskCell_(row, headerMap, possibleHeaders, fallback) {
  const col = findTaskColumn_(headerMap, possibleHeaders);
  if (col === -1) {
    return fallback === undefined ? "" : fallback;
  }
  const value = row[col];
  if (value === undefined || value === null) {
    return fallback === undefined ? "" : fallback;
  }
  return value;
}

function isTaskActiveValue_(value) {
  if (value === undefined || value === null || value === "") {
    return true;
  }
  if (value === true) {
    return true;
  }
  const text = String(value).trim().toLowerCase();
  return text === "true" || text === "1" || text === "yes" || text === "active";
}

function setBulkStudentTaskCell_(row, headerMap, possibleHeaders, value) {
  const col = findTaskColumn_(headerMap, possibleHeaders);
  if (col !== -1) {
    row[col] = value;
  }
}

function reserveStudentTaskIds_(count) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("SystemConfig");

  if (!sheet) {
    throw new Error("SystemConfig sheet not found");
  }

  const data = sheet.getDataRange().getValues();

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][0]).trim() === "NextStudentTaskNumber") {
      const current = Number(data[i][1]);

      if (!current || current < 1) {
        throw new Error("NextStudentTaskNumber is invalid");
      }

      const ids = [];

      for (let n = 0; n < count; n++) {
        ids.push("STASK" + (current + n));
      }

      sheet.getRange(i + 1, 2).setValue(current + count);

      return ids;
    }
  }

  throw new Error("NextStudentTaskNumber not found");
}

function populateAllStudentTasks(data) {
  data = data || {};

  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const studentTaskSheet = ss.getSheetByName("StudentTasks");
  const studentSheet = ss.getSheetByName("StudentRecords");
  const taskSheet = ss.getSheetByName("TaskList");

  if (!studentTaskSheet) return { success: false, error: "StudentTasks sheet not found" };
  if (!studentSheet) return { success: false, error: "StudentRecords sheet not found" };
  if (!taskSheet) return { success: false, error: "TaskList sheet not found" };

  const assignedBy = String(data.assignedBy || "SYSTEM").trim();
  const requestedGroup = String(data.classgroup || "ALL").trim();
  const requestedSubjectId = String(data.subjectid || "ALL").trim();
  const dryRun = data.dryRun === true;

  const studentTaskRows = studentTaskSheet.getDataRange().getValues();
  const studentTaskHeaders = studentTaskRows[0] || [];
  const studentTaskHeaderMap = buildHeaderMapForTasks_(studentTaskHeaders);

  const studentRows = studentSheet.getDataRange().getValues();
  const studentHeaderMap = buildHeaderMapForTasks_(studentRows[0] || []);

  const taskRows = taskSheet.getDataRange().getValues();
  const taskHeaderMap = buildHeaderMapForTasks_(taskRows[0] || []);

  const studentTaskIdCol = findTaskColumn_(studentTaskHeaderMap, [
    "StudentTaskID",
    "StudentTaskId",
    "studenttaskid"
  ]);

  const studentTaskStudentIdCol = findTaskColumn_(studentTaskHeaderMap, [
    "StudentID",
    "StudentId",
    "studentid"
  ]);

  const studentTaskTaskIdCol = findTaskColumn_(studentTaskHeaderMap, [
    "TaskID",
    "TaskId",
    "taskid"
  ]);

  if (studentTaskIdCol === -1) {
    return { success: false, error: "StudentTasks is missing StudentTaskID column" };
  }

  if (studentTaskStudentIdCol === -1) {
    return { success: false, error: "StudentTasks is missing StudentID column" };
  }

  if (studentTaskTaskIdCol === -1) {
    return { success: false, error: "StudentTasks is missing TaskID column" };
  }

  const existingPairs = new Set();

  for (let i = 1; i < studentTaskRows.length; i++) {
    const studentId = String(studentTaskRows[i][studentTaskStudentIdCol] || "").trim();
    const taskId = String(studentTaskRows[i][studentTaskTaskIdCol] || "").trim();

    if (studentId && taskId) {
      existingPairs.add(studentId + "|" + taskId);
    }
  }

  const activeStudents = [];

  for (let i = 1; i < studentRows.length; i++) {
    const studentId = String(getTaskCell_(studentRows[i], studentHeaderMap, [
      "StudentID",
      "StudentId",
      "studentid"
    ])).trim();

    const username = String(getTaskCell_(studentRows[i], studentHeaderMap, [
      "Username",
      "StudentName",
      "Name",
      "username"
    ], "")).trim();

    const classgroup = String(getTaskCell_(studentRows[i], studentHeaderMap, [
      "classgroup",
      "ClassGroup",
      "Group",
      "GroupNo"
    ], "")).trim();

    const active = getTaskCell_(studentRows[i], studentHeaderMap, [
      "Active",
      "Status"
    ], true);

    if (!studentId) continue;
    if (!isTaskActiveValue_(active)) continue;
    if (requestedGroup !== "ALL" && classgroup !== requestedGroup) continue;

    activeStudents.push({
      studentid: studentId,
      username: username,
      classgroup: classgroup
    });
  }

  const activeTasks = [];

  for (let i = 1; i < taskRows.length; i++) {
    const taskId = String(getTaskCell_(taskRows[i], taskHeaderMap, [
      "TaskID",
      "TaskId",
      "taskid"
    ])).trim();

    const subjectId = String(getTaskCell_(taskRows[i], taskHeaderMap, [
      "SubjectID",
      "SubjectId",
      "subjectid"
    ])).trim();

    const subjectName = String(getTaskCell_(taskRows[i], taskHeaderMap, [
      "SubjectName",
      "Subject",
      "subjectname"
    ], "")).trim();

    const moduleId = String(getTaskCell_(taskRows[i], taskHeaderMap, [
      "ModuleID",
      "ModuleId",
      "moduleid",
      "ModuletID"
    ], "")).trim();

    const moduleName = String(getTaskCell_(taskRows[i], taskHeaderMap, [
      "ModuleName",
      "Module",
      "modulename"
    ], "")).trim();

    const taskName = String(getTaskCell_(taskRows[i], taskHeaderMap, [
      "TaskName",
      "Task",
      "taskname"
    ], taskId)).trim();

    const active = getTaskCell_(taskRows[i], taskHeaderMap, [
      "Active",
      "Status"
    ], true);

    if (!taskId) continue;
    if (!subjectId) continue;
    if (!isTaskActiveValue_(active)) continue;
    if (requestedSubjectId !== "ALL" && subjectId !== requestedSubjectId) continue;

    activeTasks.push({
      taskid: taskId,
      subjectid: subjectId,
      subjectname: subjectName,
      moduleid: moduleId,
      modulename: moduleName,
      taskname: taskName
    });
  }

  let missingCount = 0;
  let skippedDuplicate = 0;

  activeStudents.forEach(student => {
    activeTasks.forEach(task => {
      const pairKey = student.studentid + "|" + task.taskid;

      if (existingPairs.has(pairKey)) {
        skippedDuplicate++;
      } else {
        missingCount++;
      }
    });
  });

  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      message: "Dry run completed. No rows were added.",
      activeStudentCount: activeStudents.length,
      activeTaskCount: activeTasks.length,
      existingAssignmentCount: existingPairs.size,
      rowsThatWouldBeAdded: missingCount,
      skippedDuplicate: skippedDuplicate
    };
  }

  if (missingCount === 0) {
    return {
      success: true,
      dryRun: false,
      message: "No missing StudentTasks to add.",
      activeStudentCount: activeStudents.length,
      activeTaskCount: activeTasks.length,
      existingAssignmentCount: existingPairs.size,
      rowsAdded: 0,
      skippedDuplicate: skippedDuplicate
    };
  }

  const newIds = reserveStudentTaskIds_(missingCount);
  let nextIdIndex = 0;

  const now = new Date().toISOString();
  const rowsToAdd = [];
  const livePairs = new Set(existingPairs);

  activeStudents.forEach(student => {
    activeTasks.forEach(task => {
      const pairKey = student.studentid + "|" + task.taskid;

      if (livePairs.has(pairKey)) {
        return;
      }

      livePairs.add(pairKey);

      const newRow = new Array(studentTaskHeaders.length).fill("");

      setBulkStudentTaskCell_(newRow, studentTaskHeaderMap, ["StudentTaskID", "StudentTaskId", "studenttaskid"], newIds[nextIdIndex++]);
      setBulkStudentTaskCell_(newRow, studentTaskHeaderMap, ["StudentID", "StudentId", "studentid"], student.studentid);
      setBulkStudentTaskCell_(newRow, studentTaskHeaderMap, ["TaskID", "TaskId", "taskid"], task.taskid);
      setBulkStudentTaskCell_(newRow, studentTaskHeaderMap, ["SubjectID", "SubjectId", "subjectid"], task.subjectid);
      setBulkStudentTaskCell_(newRow, studentTaskHeaderMap, ["SubjectName", "Subject", "subjectname"], task.subjectname);
      setBulkStudentTaskCell_(newRow, studentTaskHeaderMap, ["ModuleID", "ModuleId", "moduleid", "ModuletID"], task.moduleid);
      setBulkStudentTaskCell_(newRow, studentTaskHeaderMap, ["ModuleName", "Module", "modulename"], task.modulename);
      setBulkStudentTaskCell_(newRow, studentTaskHeaderMap, ["TaskName", "Task", "taskname"], task.taskname);

      setBulkStudentTaskCell_(newRow, studentTaskHeaderMap, ["CompleteStatus", "Complete", "Completed", "completestatus"], "");
      setBulkStudentTaskCell_(newRow, studentTaskHeaderMap, ["CompleteDate", "CompletedDate", "completedate"], "");
      setBulkStudentTaskCell_(newRow, studentTaskHeaderMap, ["VerifyStatus", "Verified", "verifystatus"], "");
      setBulkStudentTaskCell_(newRow, studentTaskHeaderMap, ["VerifyDate", "VerifiedDate", "verifydate"], "");

      setBulkStudentTaskCell_(newRow, studentTaskHeaderMap, ["AssignedBy", "assignedby"], assignedBy);
      setBulkStudentTaskCell_(newRow, studentTaskHeaderMap, ["AssignedDate", "assigneddate"], now);

      rowsToAdd.push(newRow);
    });
  });

  if (rowsToAdd.length > 0) {
    studentTaskSheet
      .getRange(
        studentTaskSheet.getLastRow() + 1,
        1,
        rowsToAdd.length,
        studentTaskHeaders.length
      )
      .setValues(rowsToAdd);
  }

  return {
    success: true,
    dryRun: false,
    message: "StudentTasks populated successfully.",
    activeStudentCount: activeStudents.length,
    activeTaskCount: activeTasks.length,
    existingAssignmentCount: existingPairs.size,
    rowsAdded: rowsToAdd.length,
    skippedDuplicate: skippedDuplicate
  };
}

function testPopulateAllStudentTasksDryRun() {
  const result = populateAllStudentTasks({
    assignedBy: "SYSTEM",
    classgroup: "ALL",
    subjectid: "ALL",
    dryRun: true
  });

  Logger.log(JSON.stringify(result, null, 2));
}

function testPopulateAllStudentTasksReal() {
  const result = populateAllStudentTasks({
    assignedBy: "SYSTEM",
    classgroup: "ALL",
    subjectid: "ALL",
    dryRun: false
  });

  Logger.log(JSON.stringify(result, null, 2));
}


/* =========================
   STUDENTTASK COMPATIBILITY LOOKUP
========================= */

function buildStudentLookupForTasks_(requestedStudentId, requestedGroup) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("StudentRecords");
  const rows = sheet.getDataRange().getValues();
  const headerMap = buildHeaderMapForTasks_(rows[0] || []);
  const map = {};

  for (let i = 1; i < rows.length; i++) {
    const studentid = String(getTaskCell_(rows[i], headerMap, ["StudentID", "StudentId", "studentid"])).trim();
    const username = getTaskCell_(rows[i], headerMap, ["Username", "Name", "StudentName"], "");
    const classgroup = String(getTaskCell_(rows[i], headerMap, ["classgroup", "ClassGroup", "Group", "GroupNo"], "")).trim();
    const active = getTaskCell_(rows[i], headerMap, ["Active", "Status"], true);

    if (!studentid) continue;
    if (!isTaskActiveValue_(active)) continue;
    if (classgroup === "0") continue;
    if (requestedStudentId && requestedStudentId !== "ALL" && studentid !== requestedStudentId) continue;
    if (requestedGroup && requestedGroup !== "ALL" && classgroup !== requestedGroup) continue;

    map[studentid] = {
      studentid,
      username,
      classgroup,
      active
    };
  }

  return map;
}

function getStudentTaskSheetRows_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("StudentTasks");
  const rows = sheet.getDataRange().getValues();
  const headerMap = buildHeaderMapForTasks_(rows[0] || []);
  return { sheet, rows, headerMap };
}

function getStudentTaskById(studentTaskId) {
  const studentTaskData = getStudentTaskSheetRows_();
  const rows = studentTaskData.rows;
  const headerMap = studentTaskData.headerMap;
  const studentMap = buildStudentLookupForTasks_("ALL", "ALL");

  const targetId = String(studentTaskId || "").trim();

  for (let i = 1; i < rows.length; i++) {
    const rowStudentTaskId = String(getTaskCell_(rows[i], headerMap, ["StudentTaskID", "StudentTaskId", "studenttaskid"])).trim();

    if (rowStudentTaskId === targetId) {
      const studentId = String(getTaskCell_(rows[i], headerMap, ["StudentID", "StudentId", "studentid"])).trim();
      const student = studentMap[studentId] || {};

      return {
        studenttaskid: rowStudentTaskId,
        studentid: studentId,
        taskid: getTaskCell_(rows[i], headerMap, ["TaskID", "TaskId", "taskid"], ""),
        moduleid: getTaskCell_(rows[i], headerMap, ["ModuleID", "ModuleId", "moduleid"], ""),
        modulename: getTaskCell_(rows[i], headerMap, ["ModuleName", "Module", "modulename"], ""),
        subjectid: getTaskCell_(rows[i], headerMap, ["SubjectID", "SubjectId", "subjectid"], ""),
        completestatus: getTaskCell_(rows[i], headerMap, ["CompleteStatus", "Complete", "Completed", "completestatus"], ""),
        completedate: getTaskCell_(rows[i], headerMap, ["CompleteDate", "CompletedDate", "completedate"], ""),
        verifystatus: getTaskCell_(rows[i], headerMap, ["VerifyStatus", "Verified", "verifystatus"], ""),
        verifydate: getTaskCell_(rows[i], headerMap, ["VerifyDate", "VerifiedDate", "verifydate"], ""),
        assignedby: getTaskCell_(rows[i], headerMap, ["AssignedBy", "assignedby"], ""),
        assigneddate: getTaskCell_(rows[i], headerMap, ["AssignedDate", "assigneddate"], ""),
        username: student.username || "",
        classgroup: student.classgroup || "",
        active: student.active
      };
    }
  }

  return null;
}


/* =========================
   UI-MANAGED DRIVE CONFIGURATION
========================= */

function getSystemConfigValue_(key, required) {
  const configKey = String(key || "").trim();
  const sheet = SpreadsheetApp
    .getActiveSpreadsheet()
    .getSheetByName(SYSTEM_CONFIG_SHEET_NAME);

  if (!sheet) {
    throw new Error("SystemConfig sheet not found");
  }

  const lastRow = sheet.getLastRow();

  if (lastRow < 1) {
    if (required) throw new Error("SystemConfig is empty");
    return "";
  }

  const rows = sheet.getRange(1, 1, lastRow, 2).getDisplayValues();
  const matches = rows.filter(function(row) {
    return String(row[0] || "").trim() === configKey;
  });

  if (matches.length > 1) {
    throw new Error("SystemConfig contains duplicate " + configKey + " rows");
  }

  const value = matches.length ? String(matches[0][1] || "").trim() : "";

  if (required && !value) {
    throw new Error(configKey + " is not configured in System Settings");
  }

  return value;
}

function getWeeklyPlannerDriveConfig_() {
  const folderId = getSystemConfigValue_(
    WEEKLY_PLANNER_DRIVE_FOLDER_ID_CONFIG_KEY,
    true
  );

  if (!/^[A-Za-z0-9_-]{10,128}$/.test(folderId)) {
    throw new Error("WeeklyPlannerDriveFolderId is invalid in System Settings");
  }

  const folderLabel = getSystemConfigValue_(
    WEEKLY_PLANNER_DRIVE_FOLDER_LABEL_CONFIG_KEY,
    false
  ) || DEFAULT_WEEKLY_PLANNER_DRIVE_FOLDER_LABEL;

  return {
    folderId: folderId,
    folderLabel: folderLabel,
    folderUrl: "https://drive.google.com/drive/folders/" + encodeURIComponent(folderId)
  };
}


/* =========================
   WEEKLY PLANNER PNG-TO-DRIVE BRIDGE
========================= */

function extractWeeklyPlannerPreviewBase64_(data) {
  const directBase64 = String(data.base64 || "").replace(/\s/g, "");

  if (directBase64) {
    return directBase64;
  }

  const dataUrl = String(data.dataUrl || "").trim();
  const match = dataUrl.match(/^data:image\/png;base64,([A-Za-z0-9+/=\r\n]+)$/);

  return match ? match[1].replace(/\s/g, "") : "";
}

function sanitizeWeeklyPlannerDriveFileName_(value) {
  let name = String(value || "")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!name) {
    return "";
  }

  if (!/\.png$/i.test(name)) {
    name += ".png";
  }

  return name.slice(0, 140);
}

function saveWeeklyPlannerPreviewToDrive(data) {
  data = data || {};

  const mimeType = String(data.mimeType || "image/png").trim();

  if (mimeType !== "image/png") {
    return { success: false, error: "Only PNG planner previews are supported" };
  }

  const fileName = sanitizeWeeklyPlannerDriveFileName_(data.fileName);

  if (!fileName) {
    return { success: false, error: "Missing fileName" };
  }

  const base64 = extractWeeklyPlannerPreviewBase64_(data);

  if (!base64) {
    return { success: false, error: "Missing preview image data" };
  }

  let driveConfig = {
    folderId: "",
    folderLabel: DEFAULT_WEEKLY_PLANNER_DRIVE_FOLDER_LABEL,
    folderUrl: ""
  };

  try {
    driveConfig = getWeeklyPlannerDriveConfig_();
    const bytes = Utilities.base64Decode(base64);
    const blob = Utilities.newBlob(bytes, mimeType, fileName);
    const folder = DriveApp.getFolderById(driveConfig.folderId);
    const file = folder.createFile(blob);

    return {
      success: true,
      message: "Weekly planner preview saved to Google Drive",
      fileName: file.getName(),
      fileId: file.getId(),
      fileUrl: file.getUrl(),
      folderId: driveConfig.folderId,
      destinationLabel: driveConfig.folderLabel,
      destinationUrl: driveConfig.folderUrl,
      teacherName: String(data.teacherName || "").trim(),
      saveDate: String(data.saveDate || "").trim(),
      weekStart: String(data.weekStart || "").trim(),
      requestedBy: String(data.requestedBy || "").trim(),
      requestedByAdminId: String(data.requestedByAdminId || "").trim()
    };
  } catch (error) {
    console.error("Weekly planner Drive save failed", error);

    return {
      success: false,
      error: error && error.message
        ? error.message
        : "Unable to save Weekly Planner. Verify the configured Google Drive folder and Apps Script access.",
      destinationLabel: driveConfig.folderLabel,
      destinationUrl: driveConfig.folderUrl
    };
  }
}

function authorizeM4LServices() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error("This Apps Script project is not bound to a Google Sheet");
  }

  const driveConfig = getWeeklyPlannerDriveConfig_();
  const folder = DriveApp.getFolderById(driveConfig.folderId);

  const result = {
    success: true,
    spreadsheetId: spreadsheet.getId(),
    spreadsheetName: spreadsheet.getName(),
    folderId: folder.getId(),
    folderName: folder.getName(),
    folderUrl: driveConfig.folderUrl
  };

  console.log(JSON.stringify(result));
  return result;
}

/* =========================
   WEB APP ENTRY POINTS
========================= */

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);

    switch (body.action) {
      case "registerAdmin":
        return jsonResponse(registerAdmin(body.data));

      case "getAdminByUsername":
        return jsonResponse({
          success: true,
          admin: getAdminByUsername(body.username)
        });

      case "createTaskResource":
        return jsonResponse(createTaskResource(body.data));

      case "listTaskResources":
        return jsonResponse(listTaskResources(body.data));

      case "updateTaskResource":
        return jsonResponse(updateTaskResource(body.data));

      case "populateAllStudentTasks":
        return jsonResponse(populateAllStudentTasks(body.data));

      case "getStudentTaskById":
        return jsonResponse({
          success: true,
          task: getStudentTaskById(body.studenttaskid)
        });

      case "saveWeeklyPlannerPreviewToDrive":
        return jsonResponse(saveWeeklyPlannerPreviewToDrive(body.data));

      default:
        return jsonResponse({
          success: false,
          error: "Unknown action"
        });
    }
  } catch (err) {
    return jsonResponse({
      success: false,
      error: err && err.message ? err.message : "Apps Script request failed"
    });
  }
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet() {
  return jsonResponse({
    status: "success",
    message: "Connected to M4L Apps Script active bridge",
    milestone: "V98.14"
  });
}
