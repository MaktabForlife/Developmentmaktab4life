import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  BACKEND_APPS_SCRIPT,
  BACKEND_GOOGLE_SHEETS,
  BACKEND_WORKER,
  getBackendRoutingDiagnostics,
  getBackendSelection,
  shouldLogBackendRouting
} from "../src/lib/backend-routing.js";

const GOOGLE_SHEETS_FEATURES = [
  "auth",
  "attendance-read",
  "attendance-write",
  "resources",
  "resource-management",
  "timetable-read",
  "timetable-write",
  "student-management-read",
  "student-management-write",
  "student-management-update",
  "admin-management-read",
  "admin-management-write",
  "admin-management-update",
  "curriculum-read",
  "curriculum-write",
  "curriculum-resources-read",
  "curriculum-resources-write",
  "task-assignment-read",
  "task-assignment-write",
  "progress-read",
  "progress-write",
  "system-settings",
  "weekly-planner"
];

const LEGACY_SELECTORS = [
  "M4L_BACKEND_AUTH",
  "M4L_BACKEND_ATTENDANCE_READ",
  "M4L_BACKEND_ATTENDANCE_WRITE",
  "M4L_BACKEND_RESOURCES",
  "M4L_BACKEND_RESOURCE_MANAGEMENT",
  "M4L_BACKEND_TIMETABLE_READ",
  "M4L_BACKEND_TIMETABLE_WRITE",
  "M4L_BACKEND_STUDENT_MANAGEMENT_READ",
  "M4L_BACKEND_STUDENT_MANAGEMENT_WRITE",
  "M4L_BACKEND_STUDENT_MANAGEMENT_UPDATE",
  "M4L_BACKEND_ADMIN_MANAGEMENT_READ",
  "M4L_BACKEND_ADMIN_MANAGEMENT_WRITE",
  "M4L_BACKEND_ADMIN_MANAGEMENT_UPDATE",
  "M4L_BACKEND_CURRICULUM_READ",
  "M4L_BACKEND_CURRICULUM_WRITE",
  "M4L_BACKEND_CURRICULUM_RESOURCES_READ",
  "M4L_BACKEND_CURRICULUM_RESOURCES_WRITE",
  "M4L_BACKEND_TASK_ASSIGNMENT_READ",
  "M4L_BACKEND_TASK_ASSIGNMENT_WRITE",
  "M4L_BACKEND_PROGRESS_READ",
  "M4L_BACKEND_PROGRESS_WRITE",
  "M4L_BACKEND_SYSTEM_SETTINGS",
  "M4L_BACKEND_WEEKLY_PLANNER",
  "M4L_BACKEND_WEEKLY_PLANNER_DRIVE"
];

const defaults = getBackendRoutingDiagnostics({});

for (const feature of GOOGLE_SHEETS_FEATURES) {
  const selection = defaults.features[feature];
  assert.equal(selection.valid, true, `${feature} must be valid`);
  assert.equal(selection.backend, BACKEND_GOOGLE_SHEETS);
  assert.equal(selection.source, "fixed");
  assert.equal(selection.envVar, "");
  assert.equal(selection.defaultBackend, BACKEND_GOOGLE_SHEETS);
  assert.deepEqual(selection.availableBackends, [BACKEND_GOOGLE_SHEETS]);
}

const staleSelectors = Object.fromEntries(LEGACY_SELECTORS.map(name => [name, "apps-script"]));
for (const feature of GOOGLE_SHEETS_FEATURES) {
  const selection = getBackendSelection(staleSelectors, feature);
  assert.equal(selection.valid, true, `${feature} must ignore retired selector variables`);
  assert.equal(selection.backend, BACKEND_GOOGLE_SHEETS);
  assert.equal(selection.source, "fixed");
}

const driveDefault = getBackendSelection({}, "weekly-planner-drive");
assert.equal(driveDefault.valid, true);
assert.equal(driveDefault.backend, BACKEND_APPS_SCRIPT);
assert.equal(driveDefault.source, "fixed");
assert.deepEqual(driveDefault.availableBackends, [BACKEND_APPS_SCRIPT]);

const driveWithStaleSelector = getBackendSelection(
  { M4L_BACKEND_WEEKLY_PLANNER_DRIVE: "google-sheets" },
  "weekly-planner-drive"
);
assert.equal(driveWithStaleSelector.valid, true);
assert.equal(driveWithStaleSelector.backend, BACKEND_APPS_SCRIPT);
assert.equal(driveWithStaleSelector.source, "fixed");

const driveLibrary = getBackendSelection({ M4L_BACKEND_RESOURCES: "apps-script" }, "drive-library");
assert.equal(driveLibrary.backend, BACKEND_WORKER);
assert.equal(driveLibrary.source, "fixed");

assert.equal(shouldLogBackendRouting({ M4L_BACKEND_ROUTING_LOGS: "true" }), true);
assert.equal(shouldLogBackendRouting({ M4L_BACKEND_ROUTING_LOGS: "false" }), false);
assert.equal(defaults.routingLogsEnabled, false);

const wranglerConfig = JSON.parse(readFileSync(
  new URL("../wrangler.jsonc", import.meta.url),
  "utf8"
));

for (const selector of LEGACY_SELECTORS) {
  assert.equal(wranglerConfig.vars[selector], undefined, `Production must not define retired ${selector}`);
  assert.equal(
    wranglerConfig.env.development.vars[selector],
    undefined,
    `Development must not define retired ${selector}`
  );
}

assert.ok(wranglerConfig.vars.APPS_SCRIPT_URL, "Production Weekly Planner Drive bridge still needs Apps Script");
assert.ok(
  wranglerConfig.env.development.vars.APPS_SCRIPT_URL,
  "Development Weekly Planner Drive bridge still needs Apps Script"
);
assert.equal(
  wranglerConfig.vars.M4L_STUDENT_LOGIN_BASE,
  "https://rebootyourmaktab.maktabhelper.app/student/"
);
assert.equal(
  wranglerConfig.env.development.vars.M4L_STUDENT_LOGIN_BASE,
  "https://developmentmaktab4life.pages.dev/student/"
);

console.log("Backend fixed-routing ownership tests passed.");
