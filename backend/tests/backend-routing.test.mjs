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

const DIRECT_FEATURES = Object.freeze({
  auth: "M4L_BACKEND_AUTH",
  "attendance-read": "M4L_BACKEND_ATTENDANCE_READ",
  "attendance-write": "M4L_BACKEND_ATTENDANCE_WRITE",
  resources: "M4L_BACKEND_RESOURCES",
  "timetable-read": "M4L_BACKEND_TIMETABLE_READ",
  "timetable-write": "M4L_BACKEND_TIMETABLE_WRITE",
  "student-management-read": "M4L_BACKEND_STUDENT_MANAGEMENT_READ",
  "student-management-write": "M4L_BACKEND_STUDENT_MANAGEMENT_WRITE",
  "student-management-update": "M4L_BACKEND_STUDENT_MANAGEMENT_UPDATE",
  "curriculum-read": "M4L_BACKEND_CURRICULUM_READ",
  "curriculum-write": "M4L_BACKEND_CURRICULUM_WRITE",
  "curriculum-resources-read": "M4L_BACKEND_CURRICULUM_RESOURCES_READ",
  "curriculum-resources-write": "M4L_BACKEND_CURRICULUM_RESOURCES_WRITE",
  "task-assignment-read": "M4L_BACKEND_TASK_ASSIGNMENT_READ",
  "task-assignment-write": "M4L_BACKEND_TASK_ASSIGNMENT_WRITE",
  "progress-read": "M4L_BACKEND_PROGRESS_READ",
  "progress-write": "M4L_BACKEND_PROGRESS_WRITE",
  "system-settings": "M4L_BACKEND_SYSTEM_SETTINGS",
  "weekly-planner": "M4L_BACKEND_WEEKLY_PLANNER"
});

const defaults = getBackendRoutingDiagnostics({});

for (const [feature, envVar] of Object.entries(DIRECT_FEATURES)) {
  const defaultSelection = defaults.features[feature];
  assert.equal(defaultSelection.valid, true, `${feature} default must be valid`);
  assert.equal(defaultSelection.backend, BACKEND_GOOGLE_SHEETS);
  assert.equal(defaultSelection.source, "default");
  assert.equal(defaultSelection.defaultBackend, BACKEND_GOOGLE_SHEETS);
  assert.deepEqual(defaultSelection.availableBackends, [BACKEND_GOOGLE_SHEETS]);

  const explicitDirect = getBackendSelection({ [envVar]: "google-sheets" }, feature);
  assert.equal(explicitDirect.valid, true, `${feature} must accept google-sheets`);
  assert.equal(explicitDirect.backend, BACKEND_GOOGLE_SHEETS);
  assert.equal(explicitDirect.source, envVar);

  const retiredAppsScript = getBackendSelection({ [envVar]: "apps-script" }, feature);
  assert.equal(retiredAppsScript.valid, false, `${feature} must reject Apps Script`);
  assert.equal(retiredAppsScript.backend, BACKEND_APPS_SCRIPT);
  assert.equal(retiredAppsScript.source, envVar);
  assert.deepEqual(retiredAppsScript.availableBackends, [BACKEND_GOOGLE_SHEETS]);
  assert.match(retiredAppsScript.error, /apps-script is not enabled/);
}

const driveDefault = getBackendSelection({}, "weekly-planner-drive");
assert.equal(driveDefault.valid, true);
assert.equal(driveDefault.backend, BACKEND_APPS_SCRIPT);
assert.equal(driveDefault.source, "default");
assert.deepEqual(driveDefault.availableBackends, [BACKEND_APPS_SCRIPT]);

const invalidDriveDirect = getBackendSelection(
  { M4L_BACKEND_WEEKLY_PLANNER_DRIVE: "google-sheets" },
  "weekly-planner-drive"
);
assert.equal(invalidDriveDirect.valid, false);
assert.match(invalidDriveDirect.error, /google-sheets is not enabled/);

const invalidName = getBackendSelection(
  { M4L_BACKEND_PROGRESS_READ: "somewhere-else" },
  "progress-read"
);
assert.equal(invalidName.valid, false);
assert.match(invalidName.error, /Invalid backend value/);

assert.equal(normalizeBackendName("Apps Script"), BACKEND_APPS_SCRIPT);
assert.equal(normalizeBackendName("sheets"), BACKEND_GOOGLE_SHEETS);
assert.equal(shouldLogBackendRouting({ M4L_BACKEND_ROUTING_LOGS: "true" }), true);
assert.equal(shouldLogBackendRouting({ M4L_BACKEND_ROUTING_LOGS: "false" }), false);
assert.equal(defaults.routingLogsEnabled, false);

const wranglerConfig = JSON.parse(readFileSync(
  new URL("../wrangler.jsonc", import.meta.url),
  "utf8"
));

for (const envVar of Object.values(DIRECT_FEATURES)) {
  if (envVar === "M4L_BACKEND_WEEKLY_PLANNER") {
    continue;
  }

  assert.equal(
    wranglerConfig.vars[envVar],
    "google-sheets",
    `Production must explicitly select ${envVar}=google-sheets`
  );
  assert.equal(
    wranglerConfig.env.development.vars[envVar],
    "google-sheets",
    `Development must explicitly select ${envVar}=google-sheets`
  );
}

assert.ok(wranglerConfig.vars.APPS_SCRIPT_URL, "Production Drive action still needs Apps Script");
assert.ok(
  wranglerConfig.env.development.vars.APPS_SCRIPT_URL,
  "Development Drive action still needs Apps Script"
);
assert.equal(
  wranglerConfig.vars.M4L_STUDENT_LOGIN_BASE,
  "https://rebootyourmaktab.maktabhelper.app/student/"
);
assert.equal(
  wranglerConfig.env.development.vars.M4L_STUDENT_LOGIN_BASE,
  "https://developmentmaktab4life.pages.dev/student/"
);

console.log("Backend direct-only routing configuration tests passed.");
