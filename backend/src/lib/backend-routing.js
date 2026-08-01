export const BACKEND_APPS_SCRIPT = "apps-script";
export const BACKEND_GOOGLE_SHEETS = "google-sheets";
export const BACKEND_WORKER = "worker";

const FEATURE_DEFINITIONS = Object.freeze({
  auth: defineFeature("M4L_BACKEND_AUTH", BACKEND_APPS_SCRIPT, [BACKEND_APPS_SCRIPT]),
  "attendance-read": defineFeature(
    "M4L_BACKEND_ATTENDANCE_READ",
    BACKEND_APPS_SCRIPT,
    [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
  ),
  "attendance-write": defineFeature(
    "M4L_BACKEND_ATTENDANCE_WRITE",
    BACKEND_APPS_SCRIPT,
    [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
  ),
  resources: defineFeature(
    "M4L_BACKEND_RESOURCES",
    BACKEND_APPS_SCRIPT,
    [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
  ),
  "timetable-read": defineFeature(
    "M4L_BACKEND_TIMETABLE_READ",
    BACKEND_APPS_SCRIPT,
    [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
  ),
  "timetable-write": defineFeature(
    "M4L_BACKEND_TIMETABLE_WRITE",
    BACKEND_APPS_SCRIPT,
    [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
  ),
  "student-management-read": defineFeature(
    "M4L_BACKEND_STUDENT_MANAGEMENT_READ",
    BACKEND_APPS_SCRIPT,
    [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
  ),
  "student-management-write": defineFeature(
    "M4L_BACKEND_STUDENT_MANAGEMENT_WRITE",
    BACKEND_APPS_SCRIPT,
    [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
  ),
  "student-management-update": defineFeature(
    "M4L_BACKEND_STUDENT_MANAGEMENT_UPDATE",
    BACKEND_APPS_SCRIPT,
    [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
  ),
  "curriculum-read": defineFeature(
    "M4L_BACKEND_CURRICULUM_READ",
    BACKEND_APPS_SCRIPT,
    [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
  ),
  "curriculum-write": defineFeature(
    "M4L_BACKEND_CURRICULUM_WRITE",
    BACKEND_APPS_SCRIPT,
    [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
  ),
  "curriculum-resources-read": defineFeature(
    "M4L_BACKEND_CURRICULUM_RESOURCES_READ",
    BACKEND_APPS_SCRIPT,
    [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
  ),
  "curriculum-resources-write": defineFeature(
    "M4L_BACKEND_CURRICULUM_RESOURCES_WRITE",
    BACKEND_APPS_SCRIPT,
    [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
  ),
  "task-assignment-read": defineFeature(
    "M4L_BACKEND_TASK_ASSIGNMENT_READ",
    BACKEND_APPS_SCRIPT,
    [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
  ),
  "task-assignment-write": defineFeature(
    "M4L_BACKEND_TASK_ASSIGNMENT_WRITE",
    BACKEND_APPS_SCRIPT,
    [BACKEND_APPS_SCRIPT]
  ),
  "progress-read": defineFeature(
    "M4L_BACKEND_PROGRESS_READ",
    BACKEND_APPS_SCRIPT,
    [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
  ),
  "progress-write": defineFeature(
    "M4L_BACKEND_PROGRESS_WRITE",
    BACKEND_APPS_SCRIPT,
    [BACKEND_APPS_SCRIPT, BACKEND_GOOGLE_SHEETS]
  ),
  "weekly-planner": defineFeature(
    "M4L_BACKEND_WEEKLY_PLANNER",
    BACKEND_GOOGLE_SHEETS,
    [BACKEND_GOOGLE_SHEETS]
  ),
  "weekly-planner-drive": defineFeature(
    "M4L_BACKEND_WEEKLY_PLANNER_DRIVE",
    BACKEND_APPS_SCRIPT,
    [BACKEND_APPS_SCRIPT]
  ),
  routing: defineFeature("", BACKEND_WORKER, [BACKEND_WORKER])
});

export function getBackendSelection(env = {}, feature) {
  const definition = FEATURE_DEFINITIONS[feature];

  if (!definition) {
    return {
      valid: false,
      feature,
      backend: "",
      requestedBackend: "",
      source: "unknown-feature",
      error: `Unknown backend feature: ${feature}`
    };
  }

  const rawValue = definition.envVar ? String(env?.[definition.envVar] || "").trim() : "";
  const requestedBackend = rawValue
    ? normalizeBackendName(rawValue)
    : definition.defaultBackend;
  const source = rawValue ? definition.envVar : "default";

  if (!requestedBackend) {
    return {
      valid: false,
      feature,
      backend: "",
      requestedBackend: rawValue,
      source,
      envVar: definition.envVar,
      defaultBackend: definition.defaultBackend,
      availableBackends: definition.availableBackends.slice(),
      error: `Invalid backend value for ${definition.envVar}: ${rawValue}`
    };
  }

  if (!definition.availableBackends.includes(requestedBackend)) {
    return {
      valid: false,
      feature,
      backend: requestedBackend,
      requestedBackend,
      source,
      envVar: definition.envVar,
      defaultBackend: definition.defaultBackend,
      availableBackends: definition.availableBackends.slice(),
      error: `${requestedBackend} is not enabled for ${feature}`
    };
  }

  return {
    valid: true,
    feature,
    backend: requestedBackend,
    requestedBackend,
    source,
    envVar: definition.envVar,
    defaultBackend: definition.defaultBackend,
    availableBackends: definition.availableBackends.slice()
  };
}

export function getBackendRoutingDiagnostics(env = {}) {
  const features = {};

  Object.keys(FEATURE_DEFINITIONS)
    .filter(feature => feature !== "routing")
    .forEach(feature => {
      const selection = getBackendSelection(env, feature);
      features[feature] = {
        valid: selection.valid,
        backend: selection.backend,
        source: selection.source,
        envVar: selection.envVar,
        defaultBackend: selection.defaultBackend,
        availableBackends: selection.availableBackends,
        ...(selection.error ? { error: selection.error } : {})
      };
    });

  return {
    features,
    routingLogsEnabled: shouldLogBackendRouting(env)
  };
}

export function shouldLogBackendRouting(env = {}) {
  const value = String(env?.M4L_BACKEND_ROUTING_LOGS || "").trim().toLowerCase();
  return ["1", "true", "yes", "on"].includes(value);
}

export function normalizeBackendName(value) {
  const normalized = String(value || "").trim().toLowerCase().replace(/[_\s]+/g, "-");

  if (["apps-script", "appsscript", "legacy"].includes(normalized)) {
    return BACKEND_APPS_SCRIPT;
  }

  if (["google-sheets", "googlesheets", "sheets", "direct"].includes(normalized)) {
    return BACKEND_GOOGLE_SHEETS;
  }

  if (normalized === BACKEND_WORKER) {
    return BACKEND_WORKER;
  }

  return "";
}

function defineFeature(envVar, defaultBackend, availableBackends) {
  return Object.freeze({
    envVar,
    defaultBackend,
    availableBackends: Object.freeze(availableBackends.slice())
  });
}
