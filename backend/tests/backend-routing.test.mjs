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
assert.equal(defaults.features["weekly-planner"].backend, BACKEND_GOOGLE_SHEETS);
assert.deepEqual(defaults.features["weekly-planner"].availableBackends, [BACKEND_GOOGLE_SHEETS]);
assert.equal(defaults.routingLogsEnabled, false);

const explicitLegacy = getBackendSelection({ M4L_BACKEND_AUTH: "legacy" }, "auth");
assert.equal(explicitLegacy.valid, true);
assert.equal(explicitLegacy.backend, BACKEND_APPS_SCRIPT);
assert.equal(explicitLegacy.source, "M4L_BACKEND_AUTH");

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
