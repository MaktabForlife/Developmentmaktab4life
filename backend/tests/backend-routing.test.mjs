import assert from "node:assert/strict";
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

const prematureMigration = getBackendSelection(
  { M4L_BACKEND_CURRICULUM: "direct" },
  "curriculum"
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

console.log("Backend routing configuration tests passed.");
