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
assert.deepEqual(defaults.features["curriculum-write"].availableBackends, [BACKEND_APPS_SCRIPT]);
assert.equal(defaults.features["curriculum-resources-read"].backend, BACKEND_APPS_SCRIPT);
assert.deepEqual(
  defaults.features["curriculum-resources-read"].availableBackends,
  [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
);
assert.equal(defaults.features["curriculum-resources-write"].backend, BACKEND_APPS_SCRIPT);
assert.deepEqual(
  defaults.features["curriculum-resources-write"].availableBackends,
  [BACKEND_APPS_SCRIPT]
);
assert.equal(defaults.features.progress.backend, BACKEND_APPS_SCRIPT);
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

const prematureMigration = getBackendSelection(
  { M4L_BACKEND_CURRICULUM_WRITE: "direct" },
  "curriculum-write"
);
assert.equal(prematureMigration.valid, false);
assert.equal(prematureMigration.backend, BACKEND_GOOGLE_SHEETS);
assert.match(prematureMigration.error, /not enabled/);

const invalid = getBackendSelection({ M4L_BACKEND_PROGRESS: "somewhere-else" }, "progress");
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
assert.equal(
  wranglerConfig.vars.M4L_BACKEND_CURRICULUM_RESOURCES_READ,
  "google-sheets"
);
assert.equal(
  wranglerConfig.env.development.vars.M4L_BACKEND_CURRICULUM_READ,
  "google-sheets"
);
assert.equal(
  wranglerConfig.env.development.vars.M4L_BACKEND_CURRICULUM_RESOURCES_READ,
  "google-sheets"
);

console.log("Backend routing configuration tests passed.");
