import {
  adminLoginGoogleSheetsEndpoint,
  checkAdminGoogleSheetsEndpoint,
  checkStudentGoogleSheetsEndpoint,
  resetStudentPinGoogleSheetsEndpoint,
  setupAdminPinGoogleSheetsEndpoint,
  setupStudentPinGoogleSheetsEndpoint,
  studentLoginGoogleSheetsEndpoint
} from "./routes/auth-google-sheets.js";
import {
  registerAdminGoogleSheetsEndpoint,
  resetAdminPinGoogleSheetsEndpoint,
  searchAdminsGoogleSheetsEndpoint,
  updateAdminGoogleSheetsEndpoint
} from "./routes/admin-account-management.js";
import {
  attendanceReportGoogleSheetsEndpoint,
  attendanceStudentsGoogleSheetsEndpoint,
  submitAbsentAttendanceGoogleSheetsEndpoint
} from "./routes/attendance.js";
import {
  getStudentTasksGoogleSheetsEndpoint,
  taskProgressDetailGoogleSheetsEndpoint,
  taskProgressReportGoogleSheetsEndpoint
} from "./routes/progress-read.js";
import {
  updateTaskCompleteGoogleSheetsEndpoint,
  verifyStudentTaskGoogleSheetsEndpoint
} from "./routes/progress-write.js";
import {
  getWeeklyPlannerEndpoint,
  saveWeeklyPlannerEndpoint,
  saveWeeklyPlannerPreviewToDriveEndpoint,
  weeklyPlannerArchiveOverviewEndpoint,
  weeklyPlannerHealthEndpoint,
  weeklyPlannerTeacherHistoryEndpoint,
  weeklyPlannerTeacherWeekRecordsEndpoint,
  weeklyPlannerTeachersEndpoint,
  weeklyPlannerWeekRecordsEndpoint
} from "./routes/weekly-planner.js";
import {
  getTimetableGoogleSheetsEndpoint,
  updateTimetableZoomLinkGoogleSheetsEndpoint
} from "./routes/timetable.js";
import { getResourcesGoogleSheetsEndpoint } from "./routes/resources.js";
import {
  browseDriveFolderEndpoint,
  createDriveFileAccessEndpoint,
  createDriveResourceEndpoint,
  getResourceManagementOptionsEndpoint,
  listManagedResourcesEndpoint,
  streamDriveFileEndpoint,
  updateDriveResourceEndpoint
} from "./routes/drive-library.js";
import {
  createSubjectGoogleSheetsEndpoint,
  createSubjectResourceGoogleSheetsEndpoint,
  createModuleGoogleSheetsEndpoint,
  createTaskGoogleSheetsEndpoint,
  listModulesGoogleSheetsEndpoint,
  listSubjectResourcesGoogleSheetsEndpoint,
  listSubjectsGoogleSheetsEndpoint,
  listTasksGoogleSheetsEndpoint,
  updateModuleGoogleSheetsEndpoint,
  updateSubjectGoogleSheetsEndpoint,
  updateSubjectResourceGoogleSheetsEndpoint,
  updateTaskGoogleSheetsEndpoint
} from "./routes/curriculum.js";
import {
  getTimetableBuilderGoogleSheetsEndpoint,
  saveTimetableCourseGoogleSheetsEndpoint,
  saveTimetableSessionGoogleSheetsEndpoint,
  saveTimetableTimeSlotGoogleSheetsEndpoint
} from "./routes/timetable-builder.js";
import {
  checkStudentDuplicateGoogleSheetsEndpoint,
  getStudentAssignmentOptionsGoogleSheetsEndpoint,
  searchStudentsGoogleSheetsEndpoint,
  updateStudentGoogleSheetsEndpoint
} from "./routes/student-management.js";
import { registerStudentGoogleSheetsEndpoint } from "./routes/student-registration.js";
import { assignTasksGoogleSheetsEndpoint } from "./routes/task-assignment.js";
import {
  getSystemSettingsGoogleSheetsEndpoint,
  saveSystemSettingsGoogleSheetsEndpoint
} from "./routes/system-settings.js";
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
  ["/api/resources/list", googleSheetsRoute("resources", getResourcesGoogleSheetsEndpoint)],
  ["/api/student/resources/list", googleSheetsRoute("resources", getResourcesGoogleSheetsEndpoint)],
  ["/api/admin/resources/list", googleSheetsRoute("resources", getResourcesGoogleSheetsEndpoint)],
  ["/api/admin/resources/options", googleSheetsRoute("resource-management", getResourceManagementOptionsEndpoint)],
  ["/api/admin/resources/create", googleSheetsRoute("resource-management", createDriveResourceEndpoint)],
  ["/api/admin/resources/manage-list", googleSheetsRoute("resource-management", listManagedResourcesEndpoint)],
  ["/api/admin/resources/update", googleSheetsRoute("resource-management", updateDriveResourceEndpoint)],
  ["/api/admin/drive/browse", workerRoute("drive-library", browseDriveFolderEndpoint)],
  ["/api/library/drive/access", workerRoute("drive-library", createDriveFileAccessEndpoint)],

  ["/api/timetable/get", googleSheetsRoute("timetable-read", getTimetableGoogleSheetsEndpoint)],
  ["/api/student/timetable/get", googleSheetsRoute("timetable-read", getTimetableGoogleSheetsEndpoint)],
  ["/api/admin/timetable/get", googleSheetsRoute("timetable-read", getTimetableGoogleSheetsEndpoint)],
  ["/api/admin/timetable/update-zoom", googleSheetsRoute("timetable-write", updateTimetableZoomLinkGoogleSheetsEndpoint)],
  ["/api/admin/timetable-builder/get", googleSheetsRoute("timetable-builder", getTimetableBuilderGoogleSheetsEndpoint)],
  ["/api/admin/timetable-builder/course/save", googleSheetsRoute("timetable-builder", saveTimetableCourseGoogleSheetsEndpoint)],
  ["/api/admin/timetable-builder/time-slot/save", googleSheetsRoute("timetable-builder", saveTimetableTimeSlotGoogleSheetsEndpoint)],
  ["/api/admin/timetable-builder/session/save", googleSheetsRoute("timetable-builder", saveTimetableSessionGoogleSheetsEndpoint)],

  ["/api/admin/weekly-planner/health", googleSheetsRoute("weekly-planner", weeklyPlannerHealthEndpoint)],
  ["/api/admin/weekly-planner/teachers", googleSheetsRoute("weekly-planner", weeklyPlannerTeachersEndpoint)],
  ["/api/admin/weekly-planner/get", googleSheetsRoute("weekly-planner", getWeeklyPlannerEndpoint)],
  ["/api/admin/weekly-planner/save", googleSheetsRoute("weekly-planner", saveWeeklyPlannerEndpoint)],
  ["/api/admin/weekly-planner/save-preview", appsScriptRoute("weekly-planner-drive", saveWeeklyPlannerPreviewToDriveEndpoint)],
  ["/api/admin/weekly-planner/archive-overview", googleSheetsRoute("weekly-planner", weeklyPlannerArchiveOverviewEndpoint)],
  ["/api/admin/weekly-planner/week-records", googleSheetsRoute("weekly-planner", weeklyPlannerWeekRecordsEndpoint)],
  ["/api/admin/weekly-planner/teacher-history", googleSheetsRoute("weekly-planner", weeklyPlannerTeacherHistoryEndpoint)],
  ["/api/admin/weekly-planner/teacher-week-records", googleSheetsRoute("weekly-planner", weeklyPlannerTeacherWeekRecordsEndpoint)],
  ["/api/admin/backend-routing", workerRoute("routing", backendRoutingDiagnosticsEndpoint)],
  ["/api/admin/system-settings/get", googleSheetsRoute("system-settings", getSystemSettingsGoogleSheetsEndpoint)],
  ["/api/admin/system-settings/save", googleSheetsRoute("system-settings", saveSystemSettingsGoogleSheetsEndpoint)],

  ["/api/admin/check-admin", googleSheetsRoute("auth", checkAdminGoogleSheetsEndpoint)],
  ["/api/admin/setup-pin", googleSheetsRoute("auth", setupAdminPinGoogleSheetsEndpoint)],
  ["/api/admin/login", googleSheetsRoute("auth", adminLoginGoogleSheetsEndpoint)],
  ["/api/admin/reset-pin", googleSheetsRoute("auth", resetStudentPinGoogleSheetsEndpoint)],

  ["/api/admin/admins/search", googleSheetsRoute("admin-management-read", searchAdminsGoogleSheetsEndpoint)],
  ["/api/admin/register-admin", googleSheetsRoute("admin-management-write", registerAdminGoogleSheetsEndpoint)],
  ["/api/admin/update-admin", googleSheetsRoute("admin-management-update", updateAdminGoogleSheetsEndpoint)],
  ["/api/admin/reset-admin-pin", googleSheetsRoute("admin-management-update", resetAdminPinGoogleSheetsEndpoint)],

  ["/api/check-student", googleSheetsRoute("auth", checkStudentGoogleSheetsEndpoint)],
  ["/api/setup-pin", googleSheetsRoute("auth", setupStudentPinGoogleSheetsEndpoint)],
  ["/api/login", googleSheetsRoute("auth", studentLoginGoogleSheetsEndpoint)],

  ["/api/attendance/submit-absent", googleSheetsRoute("attendance-write", submitAbsentAttendanceGoogleSheetsEndpoint)],
  ["/api/attendance/students", googleSheetsRoute("attendance-read", attendanceStudentsGoogleSheetsEndpoint)],
  ["/api/attendance/report", googleSheetsRoute("attendance-read", attendanceReportGoogleSheetsEndpoint)],

  ["/api/admin/check-student-duplicate", googleSheetsRoute("student-management-read", checkStudentDuplicateGoogleSheetsEndpoint)],
  ["/api/admin/register-student", googleSheetsRoute("student-management-write", registerStudentGoogleSheetsEndpoint)],
  ["/api/admin/update-student", googleSheetsRoute("student-management-update", updateStudentGoogleSheetsEndpoint)],
  ["/api/admin/students/search", googleSheetsRoute("student-management-read", searchStudentsGoogleSheetsEndpoint)],
  ["/api/admin/search-students", googleSheetsRoute("student-management-read", searchStudentsGoogleSheetsEndpoint)],
  ["/api/admin/student/search", googleSheetsRoute("student-management-read", searchStudentsGoogleSheetsEndpoint)],
  ["/api/admin/students/assignment-options", googleSheetsRoute("task-assignment-read", getStudentAssignmentOptionsGoogleSheetsEndpoint)],

  ["/api/admin/subjects/create", googleSheetsRoute("curriculum-write", createSubjectGoogleSheetsEndpoint)],
  ["/api/admin/subjects/list", googleSheetsRoute("curriculum-read", listSubjectsGoogleSheetsEndpoint)],
  ["/api/admin/subjects/update", googleSheetsRoute("curriculum-write", updateSubjectGoogleSheetsEndpoint)],

  ["/api/admin/modules/create", googleSheetsRoute("curriculum-write", createModuleGoogleSheetsEndpoint)],
  ["/api/admin/modules/list", googleSheetsRoute("curriculum-read", listModulesGoogleSheetsEndpoint)],
  ["/api/admin/modules/update", googleSheetsRoute("curriculum-write", updateModuleGoogleSheetsEndpoint)],

  ["/api/admin/subject-resources/create", googleSheetsRoute("curriculum-resources-write", createSubjectResourceGoogleSheetsEndpoint)],
  ["/api/admin/subject-resources/list", googleSheetsRoute("curriculum-resources-read", listSubjectResourcesGoogleSheetsEndpoint)],
  ["/api/admin/subject-resources/update", googleSheetsRoute("curriculum-resources-write", updateSubjectResourceGoogleSheetsEndpoint)],

  ["/api/admin/tasks/create", googleSheetsRoute("curriculum-write", createTaskGoogleSheetsEndpoint)],
  ["/api/admin/tasks/list", googleSheetsRoute("curriculum-read", listTasksGoogleSheetsEndpoint)],
  ["/api/admin/tasks/update", googleSheetsRoute("curriculum-write", updateTaskGoogleSheetsEndpoint)],
  ["/api/admin/tasks/assign", googleSheetsRoute("task-assignment-write", assignTasksGoogleSheetsEndpoint)],
  ["/api/admin/tasks/verify", googleSheetsRoute("progress-write", verifyStudentTaskGoogleSheetsEndpoint)],

  ["/api/tasks/student", googleSheetsRoute("progress-read", getStudentTasksGoogleSheetsEndpoint)],
  ["/api/tasks/update-complete", googleSheetsRoute("progress-write", updateTaskCompleteGoogleSheetsEndpoint)],
  ["/api/progress/tasks", googleSheetsRoute("progress-read", taskProgressReportGoogleSheetsEndpoint)],
  ["/api/progress/task-detail", googleSheetsRoute("progress-read", taskProgressDetailGoogleSheetsEndpoint)]
]);

export function routeRequest(request, env, pathname) {
  const route = ROUTES.get(pathname);
  if (route) return executeRoute(route, request, env, pathname);

  const driveFileMatch = /^\/api\/library\/drive\/file\/([A-Za-z0-9_-]+)$/.exec(pathname);
  if (driveFileMatch) {
    const dynamicRoute = workerRoute("drive-library", (dynamicRequest, dynamicEnv) => (
      streamDriveFileEndpoint(dynamicRequest, dynamicEnv, driveFileMatch[1])
    ));
    return executeRoute(dynamicRoute, request, env, pathname);
  }

  return null;
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
