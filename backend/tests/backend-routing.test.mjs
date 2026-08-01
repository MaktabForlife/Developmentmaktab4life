import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BACKEND_APPS_SCRIPT,
  BACKEND_GOOGLE_SHEETS,
  getBackendRoutingDiagnostics,
  getBackendSelection,
  normalizeBackendName,
  shouldLogBackendRouting
} from "../src/lib/backend-routing.js";

const defaults = getBackendRoutingDiagnostics({});
assert.equal(defaults.features.auth.backend, BACKEND_APPS_SCRIPT);
assert.equal(defaults.features.auth.source, "default");
assert.equal(defaults.features["attendance-read"].backend, BACKEND_APPS_SCRIPT);
assert.deepEqual(
  defaults.features["attendance-read"].availableBackends,
  [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
);
assert.equal(defaults.features["attendance-write"].backend, BACKEND_APPS_SCRIPT);
assert.deepEqual(
  defaults.features["attendance-write"].availableBackends,
  [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
);
assert.equal(defaults.features["curriculum-read"].backend, BACKEND_APPS_SCRIPT);
assert.deepEqual(
  defaults.features["curriculum-read"].availableBackends,
  [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
);
assert.equal(defaults.features["curriculum-write"].backend, BACKEND_APPS_SCRIPT);
assert.deepEqual(
  defaults.features["curriculum-write"].availableBackends,
  [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
);
assert.equal(defaults.features["curriculum-resources-read"].backend, BACKEND_APPS_SCRIPT);
assert.deepEqual(
  defaults.features["curriculum-resources-read"].availableBackends,
  [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
);
assert.equal(defaults.features["curriculum-resources-write"].backend, BACKEND_APPS_SCRIPT);
assert.deepEqual(
  defaults.features["curriculum-resources-write"].availableBackends,
  [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
);
assert.equal(defaults.features["progress-read"].backend, BACKEND_APPS_SCRIPT);
assert.deepEqual(
  defaults.features["progress-read"].availableBackends,
  [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
);
assert.equal(defaults.features["progress-write"].backend, BACKEND_APPS_SCRIPT);
assert.deepEqual(
  defaults.features["progress-write"].availableBackends,
  [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
);
assert.equal(defaults.features.resources.backend, BACKEND_APPS_SCRIPT);
assert.deepEqual(
  defaults.features.resources.availableBackends,
  [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
);
assert.equal(defaults.features["timetable-read"].backend, BACKEND_APPS_SCRIPT);
assert.deepEqual(
  defaults.features["timetable-read"].availableBackends,
  [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
);
assert.equal(defaults.features["timetable-write"].backend, BACKEND_APPS_SCRIPT);
assert.deepEqual(
  defaults.features["timetable-write"].availableBackends,
  [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
);
assert.equal(defaults.features["student-management-read"].backend, BACKEND_APPS_SCRIPT);
assert.deepEqual(
  defaults.features["student-management-read"].availableBackends,
  [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
);
assert.equal(defaults.features["student-management-write"].backend, BACKEND_APPS_SCRIPT);
assert.deepEqual(
  defaults.features["student-management-write"].availableBackends,
  [BACKEND_APPS_SCRIPT]
);
assert.equal(defaults.features["student-management-update"].backend, BACKEND_APPS_SCRIPT);
assert.deepEqual(
  defaults.features["student-management-update"].availableBackends,
  [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
);
assert.equal(defaults.features["task-assignment-read"].backend, BACKEND_APPS_SCRIPT);
assert.deepEqual(
  defaults.features["task-assignment-read"].availableBackends,
  [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
);
assert.equal(defaults.features["task-assignment-write"].backend, BACKEND_APPS_SCRIPT);
assert.deepEqual(
  defaults.features["task-assignment-write"].availableBackends,
  [BACKEND_APPS_SCRIPT]
);
assert.equal(defaults.features["weekly-planner"].backend, BACKEND_GOOGLE_SHEETS);
assert.deepEqual(defaults.features["weekly-planner"].availableBackends, [BACKEND_GOOGLE_SHEETS]);
assert.equal(defaults.routingLogsEnabled, false);

const explicitLegacy = getBackendSelection({ M4L_BACKEND_AUTH: "legacy" }, "auth");
assert.equal(explicitLegacy.valid, true);
assert.equal(explicitLegacy.backend, BACKEND_APPS_SCRIPT);
assert.equal(explicitLegacy.source, "M4L_BACKEND_AUTH");

const resourceMigration = getBackendSelection(
  { M4L_BACKEND_RESOURCES: "direct" },
  "resources"
);
assert.equal(resourceMigration.valid, true);
assert.equal(resourceMigration.backend, BACKEND_GOOGLE_SHEETS);

const timetableReadMigration = getBackendSelection(
  { M4L_BACKEND_TIMETABLE_READ: "direct" },
  "timetable-read"
);
assert.equal(timetableReadMigration.valid, true);
assert.equal(timetableReadMigration.backend, BACKEND_GOOGLE_SHEETS);

const timetableWriteMigration = getBackendSelection(
  { M4L_BACKEND_TIMETABLE_WRITE: "direct" },
  "timetable-write"
);
assert.equal(timetableWriteMigration.valid, true);
assert.equal(timetableWriteMigration.backend, BACKEND_GOOGLE_SHEETS);
assert.equal(timetableWriteMigration.source, "M4L_BACKEND_TIMETABLE_WRITE");

const attendanceReadMigration = getBackendSelection(
  { M4L_BACKEND_ATTENDANCE_READ: "direct" },
  "attendance-read"
);
assert.equal(attendanceReadMigration.valid, true);
assert.equal(attendanceReadMigration.backend, BACKEND_GOOGLE_SHEETS);
assert.equal(attendanceReadMigration.source, "M4L_BACKEND_ATTENDANCE_READ");

const attendanceWriteMigration = getBackendSelection(
  { M4L_BACKEND_ATTENDANCE_WRITE: "direct" },
  "attendance-write"
);
assert.equal(attendanceWriteMigration.valid, true);
assert.equal(attendanceWriteMigration.backend, BACKEND_GOOGLE_SHEETS);
assert.equal(attendanceWriteMigration.source, "M4L_BACKEND_ATTENDANCE_WRITE");

const curriculumReadMigration = getBackendSelection(
  { M4L_BACKEND_CURRICULUM_READ: "direct" },
  "curriculum-read"
);
assert.equal(curriculumReadMigration.valid, true);
assert.equal(curriculumReadMigration.backend, BACKEND_GOOGLE_SHEETS);
assert.equal(curriculumReadMigration.source, "M4L_BACKEND_CURRICULUM_READ");

const curriculumResourcesReadMigration = getBackendSelection(
  { M4L_BACKEND_CURRICULUM_RESOURCES_READ: "direct" },
  "curriculum-resources-read"
);
assert.equal(curriculumResourcesReadMigration.valid, true);
assert.equal(curriculumResourcesReadMigration.backend, BACKEND_GOOGLE_SHEETS);
assert.equal(
  curriculumResourcesReadMigration.source,
  "M4L_BACKEND_CURRICULUM_RESOURCES_READ"
);

const curriculumWriteMigration = getBackendSelection(
  { M4L_BACKEND_CURRICULUM_WRITE: "direct" },
  "curriculum-write"
);
assert.equal(curriculumWriteMigration.valid, true);
assert.equal(curriculumWriteMigration.backend, BACKEND_GOOGLE_SHEETS);
assert.equal(curriculumWriteMigration.source, "M4L_BACKEND_CURRICULUM_WRITE");

const curriculumResourcesWriteMigration = getBackendSelection(
  { M4L_BACKEND_CURRICULUM_RESOURCES_WRITE: "direct" },
  "curriculum-resources-write"
);
assert.equal(curriculumResourcesWriteMigration.valid, true);
assert.equal(curriculumResourcesWriteMigration.backend, BACKEND_GOOGLE_SHEETS);
assert.equal(
  curriculumResourcesWriteMigration.source,
  "M4L_BACKEND_CURRICULUM_RESOURCES_WRITE"
);

const studentManagementReadMigration = getBackendSelection(
  { M4L_BACKEND_STUDENT_MANAGEMENT_READ: "direct" },
  "student-management-read"
);

const studentManagementUpdateMigration = getBackendSelection(
  { M4L_BACKEND_STUDENT_MANAGEMENT_UPDATE: "direct" },
  "student-management-update"
);
assert.equal(studentManagementUpdateMigration.valid, true);
assert.equal(studentManagementUpdateMigration.backend, BACKEND_GOOGLE_SHEETS);
assert.equal(
  studentManagementUpdateMigration.source,
  "M4L_BACKEND_STUDENT_MANAGEMENT_UPDATE"
);
assert.equal(studentManagementReadMigration.valid, true);
assert.equal(studentManagementReadMigration.backend, BACKEND_GOOGLE_SHEETS);
assert.equal(
  studentManagementReadMigration.source,
  "M4L_BACKEND_STUDENT_MANAGEMENT_READ"
);

const taskAssignmentReadMigration = getBackendSelection(
  { M4L_BACKEND_TASK_ASSIGNMENT_READ: "direct" },
  "task-assignment-read"
);
assert.equal(taskAssignmentReadMigration.valid, true);
assert.equal(taskAssignmentReadMigration.backend, BACKEND_GOOGLE_SHEETS);
assert.equal(taskAssignmentReadMigration.source, "M4L_BACKEND_TASK_ASSIGNMENT_READ");

const progressReadMigration = getBackendSelection(
  { M4L_BACKEND_PROGRESS_READ: "direct" },
  "progress-read"
);
assert.equal(progressReadMigration.valid, true);
assert.equal(progressReadMigration.backend, BACKEND_GOOGLE_SHEETS);
assert.equal(progressReadMigration.source, "M4L_BACKEND_PROGRESS_READ");

const progressWriteMigration = getBackendSelection(
  { M4L_BACKEND_PROGRESS_WRITE: "google-sheets" },
  "progress-write"
);
assert.equal(progressWriteMigration.valid, true);
assert.equal(progressWriteMigration.backend, BACKEND_GOOGLE_SHEETS);
assert.equal(progressWriteMigration.source, "M4L_BACKEND_PROGRESS_WRITE");

const blockedStudentWriteMigration = getBackendSelection(
  { M4L_BACKEND_STUDENT_MANAGEMENT_WRITE: "google-sheets" },
  "student-management-write"
);
assert.equal(blockedStudentWriteMigration.valid, false);
assert.match(blockedStudentWriteMigration.error, /not enabled/);

const blockedTaskAssignmentWriteMigration = getBackendSelection(
  { M4L_BACKEND_TASK_ASSIGNMENT_WRITE: "google-sheets" },
  "task-assignment-write"
);
assert.equal(blockedTaskAssignmentWriteMigration.valid, false);
assert.match(blockedTaskAssignmentWriteMigration.error, /not enabled/);

const invalid = getBackendSelection(
  { M4L_BACKEND_PROGRESS_READ: "somewhere-else" },
  "progress-read"
);
assert.equal(invalid.valid, false);
assert.match(invalid.error, /Invalid backend value/);

assert.equal(normalizeBackendName("Apps Script"), BACKEND_APPS_SCRIPT);
assert.equal(normalizeBackendName("sheets"), BACKEND_GOOGLE_SHEETS);
assert.equal(shouldLogBackendRouting({ M4L_BACKEND_ROUTING_LOGS: "true" }), true);
assert.equal(shouldLogBackendRouting({ M4L_BACKEND_ROUTING_LOGS: "false" }), false);

const wranglerConfig = JSON.parse(readFileSync(
  new URL("../wrangler.jsonc", import.meta.url),
  "utf8"
));
assert.equal(wranglerConfig.vars.M4L_BACKEND_ATTENDANCE_READ, "google-sheets");
assert.equal(wranglerConfig.vars.M4L_BACKEND_ATTENDANCE_WRITE, "google-sheets");
assert.equal(
  wranglerConfig.env.development.vars.M4L_BACKEND_ATTENDANCE_READ,
  "google-sheets"
);
assert.equal(
  wranglerConfig.env.development.vars.M4L_BACKEND_ATTENDANCE_WRITE,
  "google-sheets"
);
assert.equal(wranglerConfig.vars.M4L_BACKEND_CURRICULUM_READ, "google-sheets");
assert.equal(wranglerConfig.vars.M4L_BACKEND_CURRICULUM_WRITE, "google-sheets");
assert.equal(
  wranglerConfig.vars.M4L_BACKEND_CURRICULUM_RESOURCES_READ,
  "google-sheets"
);
assert.equal(
  wranglerConfig.vars.M4L_BACKEND_CURRICULUM_RESOURCES_WRITE,
  "google-sheets"
);
assert.equal(
  wranglerConfig.env.development.vars.M4L_BACKEND_CURRICULUM_READ,
  "google-sheets"
);
assert.equal(
  wranglerConfig.env.development.vars.M4L_BACKEND_CURRICULUM_WRITE,
  "google-sheets"
);
assert.equal(
  wranglerConfig.env.development.vars.M4L_BACKEND_CURRICULUM_RESOURCES_READ,
  "google-sheets"
);
assert.equal(
  wranglerConfig.env.development.vars.M4L_BACKEND_CURRICULUM_RESOURCES_WRITE,
  "google-sheets"
);
assert.equal(
  wranglerConfig.vars.M4L_BACKEND_STUDENT_MANAGEMENT_READ,
  "google-sheets"
);
assert.equal(
  wranglerConfig.env.development.vars.M4L_BACKEND_STUDENT_MANAGEMENT_READ,
  "google-sheets"
);
assert.equal(
  wranglerConfig.vars.M4L_BACKEND_STUDENT_MANAGEMENT_UPDATE,
  "google-sheets"
);
assert.equal(
  wranglerConfig.env.development.vars.M4L_BACKEND_STUDENT_MANAGEMENT_UPDATE,
  "google-sheets"
);
assert.equal(wranglerConfig.vars.M4L_BACKEND_TASK_ASSIGNMENT_READ, "google-sheets");
assert.equal(
  wranglerConfig.env.development.vars.M4L_BACKEND_TASK_ASSIGNMENT_READ,
  "google-sheets"
);
assert.equal(wranglerConfig.vars.M4L_BACKEND_PROGRESS_READ, "google-sheets");
assert.equal(
  wranglerConfig.env.development.vars.M4L_BACKEND_PROGRESS_READ,
  "google-sheets"
);
assert.equal(wranglerConfig.vars.M4L_BACKEND_PROGRESS_WRITE, "google-sheets");
assert.equal(
  wranglerConfig.env.development.vars.M4L_BACKEND_PROGRESS_WRITE,
  "google-sheets"
);
assert.equal(
  wranglerConfig.vars.M4L_STUDENT_LOGIN_BASE,
  "https://rebootyourmaktab.maktabhelper.app/student/"
);
assert.equal(
  wranglerConfig.env.development.vars.M4L_STUDENT_LOGIN_BASE,
  "https://developmentmaktab4life.pages.dev/student/"
);

console.log("Backend routing configuration tests passed.");
