import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const code = readFileSync(new URL("../../apps-script/code.gs", import.meta.url), "utf8");
const manifest = JSON.parse(readFileSync(
  new URL("../../apps-script/appsscript.json", import.meta.url),
  "utf8"
));

const EXPECTED_ACTIONS = [
  "createTaskResource",
  "getAdminByUsername",
  "getStudentTaskById",
  "listTaskResources",
  "populateAllStudentTasks",
  "registerAdmin",
  "saveWeeklyPlannerPreviewToDrive",
  "updateTaskResource"
].sort();

const RETAINED_FUNCTIONS = [
  "authorizeM4LServices",
  "createTaskResource",
  "doGet",
  "doPost",
  "getAdminByUsername",
  "getStudentTaskById",
  "listTaskResources",
  "populateAllStudentTasks",
  "registerAdmin",
  "saveWeeklyPlannerPreviewToDrive",
  "testPopulateAllStudentTasksDryRun",
  "testPopulateAllStudentTasksReal",
  "updateTaskResource"
];

const RETIRED_ACTION_FUNCTIONS = [
  "assignTasksToStudents",
  "checkStudentDuplicate",
  "createSubject",
  "createSubjectResource",
  "createTask",
  "getAdminByUniqueId",
  "getAttendanceReport",
  "getStudentAssignmentOptions",
  "getStudentByUniqueId",
  "getStudentForLogin",
  "getStudentResources",
  "getStudentTasks",
  "getStudentsForAttendance",
  "getTaskProgressDetail",
  "getTaskProgressReport",
  "getTimetable",
  "listSubjectResources",
  "listSubjects",
  "listTasks",
  "registerStudent",
  "resetStudentPin",
  "searchStudents",
  "setAdminPin",
  "setStudentPin",
  "submitAbsentStudents",
  "updateStudent",
  "updateStudentTaskStatus",
  "updateSubject",
  "updateSubjectResource",
  "updateTask",
  "updateTimetableZoomLink"
];

new vm.Script(code, { filename: "apps-script/code.gs" });

const actions = Array.from(code.matchAll(/case\s+"([^"]+)"\s*:/g), match => match[1]).sort();
assert.deepEqual(actions, EXPECTED_ACTIONS, "doPost must expose only the audited V98.14 action allowlist");

for (const functionName of RETAINED_FUNCTIONS) {
  const matches = code.match(new RegExp(`\\bfunction\\s+${functionName}\\s*\\(`, "g")) || [];
  assert.equal(matches.length, 1, `${functionName} must be retained exactly once`);
}

for (const functionName of RETIRED_ACTION_FUNCTIONS) {
  assert.doesNotMatch(
    code,
    new RegExp(`\\bfunction\\s+${functionName}\\s*\\(`),
    `${functionName} must remain removed after its route retirement`
  );
}

assert.doesNotMatch(code, /LEGACY ROLLBACK|RETIRED ROUTE/);
assert.doesNotMatch(code, /\bcallAppsScript\b|\brequireAdminOrSenior\b|\bgetAuthUser\b/);
assert.doesNotMatch(code, /async\s+function/);
assert.match(code, /DriveApp\.getFolderById/);
assert.match(code, /WeeklyPlannerDriveFolderId/);
assert.match(code, /WeeklyPlannerDriveFolderLabel/);
assert.ok(code.split("\n").length < 1600, "Retired Apps Script code should not silently return");

assert.equal(manifest.runtimeVersion, "V8");
assert.ok(
  manifest.oauthScopes.includes("https://www.googleapis.com/auth/spreadsheets.currentonly"),
  "Retained maintenance utilities require the bound-spreadsheet scope"
);
assert.ok(
  manifest.oauthScopes.includes("https://www.googleapis.com/auth/drive"),
  "Weekly Planner submission requires the Drive scope"
);

console.log("Apps Script V98.14 cleanup allowlist and dependency checks passed.");
