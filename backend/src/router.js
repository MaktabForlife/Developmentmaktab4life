import {
  checkAdmin,
  setupAdminPin,
  adminLogin,
  checkStudent,
  setupPin,
  login,
  resetPin
} from "./routes/auth.js";
import {
  attendanceReport,
  attendanceStudents,
  submitAbsentAttendance
} from "./routes/attendance.js";
import {
  assignTasksAdmin,
  checkStudentDuplicateAdmin,
  createSubjectAdmin,
  createSubjectResourceAdmin,
  createTaskAdmin,
  getStudentAssignmentOptionsAdmin,
  listSubjectResourcesAdmin,
  listSubjectsAdmin,
  listTasksAdmin,
  registerStudentAdmin,
  searchStudentsAdmin,
  updateStudentAdmin,
  updateSubjectAdmin,
  updateSubjectResourceAdmin,
  updateTaskAdmin
} from "./routes/admin-management.js";
import {
  getStudentTasksEndpoint,
  taskProgressDetail,
  taskProgressReport,
  updateTaskComplete,
  verifyStudentTask
} from "./routes/progress.js";
import {
  getWeeklyPlannerEndpoint,
  saveWeeklyPlannerEndpoint,
  weeklyPlannerHealthEndpoint,
  weeklyPlannerTeachersEndpoint
} from "./routes/weekly-planner.js";
import {
  getTimetableEndpoint,
  updateTimetableZoomLinkEndpoint
} from "./routes/timetable.js";
import {
  getResourcesAppsScriptEndpoint,
  getResourcesGoogleSheetsEndpoint
} from "./routes/resources.js";
import { backendRoutingDiagnosticsEndpoint } from "./routes/backend-routing.js";
import {
  BACKEND_APPS_SCRIPT,
  BACKEND_GOOGLE_SHEETS,
  BACKEND_WORKER,
  getBackendSelection,
  shouldLogBackendRouting
} from "./lib/backend-routing.js";
import { json } from "./lib/http.js";

const ROUTES = new Map([
  ["/api/resources/list", resourcesRoute()],
  ["/api/student/resources/list", resourcesRoute()],
  ["/api/admin/resources/list", resourcesRoute()],

  ["/api/timetable/get", appsScriptRoute("timetable", getTimetableEndpoint)],
  ["/api/student/timetable/get", appsScriptRoute("timetable", getTimetableEndpoint)],
  ["/api/admin/timetable/get", appsScriptRoute("timetable", getTimetableEndpoint)],
  ["/api/admin/timetable/update-zoom", appsScriptRoute("timetable", updateTimetableZoomLinkEndpoint)],

  ["/api/admin/weekly-planner/health", googleSheetsRoute("weekly-planner", weeklyPlannerHealthEndpoint)],
  ["/api/admin/weekly-planner/teachers", googleSheetsRoute("weekly-planner", weeklyPlannerTeachersEndpoint)],
  ["/api/admin/weekly-planner/get", googleSheetsRoute("weekly-planner", getWeeklyPlannerEndpoint)],
  ["/api/admin/weekly-planner/save", googleSheetsRoute("weekly-planner", saveWeeklyPlannerEndpoint)],
  ["/api/admin/backend-routing", workerRoute("routing", backendRoutingDiagnosticsEndpoint)],

  ["/api/admin/check-admin", appsScriptRoute("auth", checkAdmin)],
  ["/api/admin/setup-pin", appsScriptRoute("auth", setupAdminPin)],
  ["/api/admin/login", appsScriptRoute("auth", adminLogin)],
  ["/api/admin/reset-pin", appsScriptRoute("auth", resetPin)],

  ["/api/check-student", appsScriptRoute("auth", checkStudent)],
  ["/api/setup-pin", appsScriptRoute("auth", setupPin)],
  ["/api/login", appsScriptRoute("auth", login)],

  ["/api/attendance/submit-absent", appsScriptRoute("attendance", submitAbsentAttendance)],
  ["/api/attendance/students", appsScriptRoute("attendance", attendanceStudents)],
  ["/api/attendance/report", appsScriptRoute("attendance", attendanceReport)],

  ["/api/admin/check-student-duplicate", appsScriptRoute("student-management", checkStudentDuplicateAdmin)],
  ["/api/admin/register-student", appsScriptRoute("student-management", registerStudentAdmin)],
  ["/api/admin/update-student", appsScriptRoute("student-management", updateStudentAdmin)],
  ["/api/admin/students/search", appsScriptRoute("student-management", searchStudentsAdmin)],
  ["/api/admin/search-students", appsScriptRoute("student-management", searchStudentsAdmin)],
  ["/api/admin/student/search", appsScriptRoute("student-management", searchStudentsAdmin)],
  ["/api/admin/students/assignment-options", appsScriptRoute("task-assignment", getStudentAssignmentOptionsAdmin)],

  ["/api/admin/subjects/create", appsScriptRoute("curriculum", createSubjectAdmin)],
  ["/api/admin/subjects/list", appsScriptRoute("curriculum", listSubjectsAdmin)],
  ["/api/admin/subjects/update", appsScriptRoute("curriculum", updateSubjectAdmin)],

  ["/api/admin/subject-resources/create", appsScriptRoute("curriculum-resources", createSubjectResourceAdmin)],
  ["/api/admin/subject-resources/list", appsScriptRoute("curriculum-resources", listSubjectResourcesAdmin)],
  ["/api/admin/subject-resources/update", appsScriptRoute("curriculum-resources", updateSubjectResourceAdmin)],

  ["/api/admin/tasks/create", appsScriptRoute("curriculum", createTaskAdmin)],
  ["/api/admin/tasks/list", appsScriptRoute("curriculum", listTasksAdmin)],
  ["/api/admin/tasks/update", appsScriptRoute("curriculum", updateTaskAdmin)],
  ["/api/admin/tasks/assign", appsScriptRoute("task-assignment", assignTasksAdmin)],
  ["/api/admin/tasks/verify", appsScriptRoute("progress", verifyStudentTask)],

  ["/api/tasks/student", appsScriptRoute("progress", getStudentTasksEndpoint)],
  ["/api/tasks/update-complete", appsScriptRoute("progress", updateTaskComplete)],
  ["/api/progress/tasks", appsScriptRoute("progress", taskProgressReport)],
  ["/api/progress/task-detail", appsScriptRoute("progress", taskProgressDetail)]
]);

export function routeRequest(request, env, pathname) {
  const route = ROUTES.get(pathname);
  return route ? executeRoute(route, request, env, pathname) : null;
}

export const ROUTE_PATHS = Object.freeze(Array.from(ROUTES.keys()));

async function executeRoute(route, request, env, pathname) {
  const selection = getBackendSelection(env, route.feature);

  if (!selection.valid) {
    return withBackendHeaders(json({
      success: false,
      error: "Backend routing configuration error",
      detail: selection.error,
      feature: route.feature
    }, 503), selection);
  }

  const handler = route.handlers[selection.backend];

  if (typeof handler !== "function") {
    return withBackendHeaders(json({
      success: false,
      error: "Selected backend is not implemented for this route",
      feature: route.feature,
      backend: selection.backend
    }, 503), selection);
  }

  if (shouldLogBackendRouting(env)) {
    console.info("M4L backend route", {
      pathname,
      feature: route.feature,
      backend: selection.backend,
      source: selection.source
    });
  }

  const response = await handler(request, env);
  return withBackendHeaders(response, selection);
}

function appsScriptRoute(feature, handler) {
  return backendRoute(feature, { [BACKEND_APPS_SCRIPT]: handler });
}

function googleSheetsRoute(feature, handler) {
  return backendRoute(feature, { [BACKEND_GOOGLE_SHEETS]: handler });
}

function workerRoute(feature, handler) {
  return backendRoute(feature, { [BACKEND_WORKER]: handler });
}

function resourcesRoute() {
  return backendRoute("resources", {
    [BACKEND_APPS_SCRIPT]: getResourcesAppsScriptEndpoint,
    [BACKEND_GOOGLE_SHEETS]: getResourcesGoogleSheetsEndpoint
  });
}

function backendRoute(feature, handlers) {
  return Object.freeze({
    feature,
    handlers: Object.freeze({ ...handlers })
  });
}

function withBackendHeaders(response, selection) {
  const headers = new Headers(response.headers);
  headers.set("X-M4L-Feature", selection.feature || "unknown");
  headers.set("X-M4L-Backend", selection.backend || "invalid");
  headers.set("X-M4L-Backend-Source", selection.source || "unknown");
  appendExposedHeaders(headers, [
    "X-M4L-Feature",
    "X-M4L-Backend",
    "X-M4L-Backend-Source"
  ]);

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

function appendExposedHeaders(headers, names) {
  const existing = String(headers.get("Access-Control-Expose-Headers") || "")
    .split(",")
    .map(value => value.trim())
    .filter(Boolean);
  const values = new Set([...existing, ...names]);
  headers.set("Access-Control-Expose-Headers", Array.from(values).join(", "));
}
