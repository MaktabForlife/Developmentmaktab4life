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
  adminLoginGoogleSheetsEndpoint,
  checkAdminGoogleSheetsEndpoint,
  checkStudentGoogleSheetsEndpoint,
  resetStudentPinGoogleSheetsEndpoint,
  setupAdminPinGoogleSheetsEndpoint,
  setupStudentPinGoogleSheetsEndpoint,
  studentLoginGoogleSheetsEndpoint
} from "./routes/auth-google-sheets.js";
import {
  attendanceReport,
  attendanceReportGoogleSheetsEndpoint,
  attendanceStudents,
  attendanceStudentsGoogleSheetsEndpoint,
  submitAbsentAttendance,
  submitAbsentAttendanceGoogleSheetsEndpoint
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
  getTimetableAppsScriptEndpoint,
  getTimetableGoogleSheetsEndpoint,
  updateTimetableZoomLinkEndpoint,
  updateTimetableZoomLinkGoogleSheetsEndpoint
} from "./routes/timetable.js";
import {
  getResourcesAppsScriptEndpoint,
  getResourcesGoogleSheetsEndpoint
} from "./routes/resources.js";
import {
  createSubjectGoogleSheetsEndpoint,
  createSubjectResourceGoogleSheetsEndpoint,
  createTaskGoogleSheetsEndpoint,
  listSubjectResourcesGoogleSheetsEndpoint,
  listSubjectsGoogleSheetsEndpoint,
  listTasksGoogleSheetsEndpoint,
  updateSubjectGoogleSheetsEndpoint,
  updateSubjectResourceGoogleSheetsEndpoint,
  updateTaskGoogleSheetsEndpoint
} from "./routes/curriculum.js";
import {
  checkStudentDuplicateGoogleSheetsEndpoint,
  getStudentAssignmentOptionsGoogleSheetsEndpoint,
  searchStudentsGoogleSheetsEndpoint,
  updateStudentGoogleSheetsEndpoint
} from "./routes/student-management.js";
import { registerStudentGoogleSheetsEndpoint } from "./routes/student-registration.js";
import { assignTasksGoogleSheetsEndpoint } from "./routes/task-assignment.js";
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

  ["/api/timetable/get", timetableReadRoute()],
  ["/api/student/timetable/get", timetableReadRoute()],
  ["/api/admin/timetable/get", timetableReadRoute()],
  ["/api/admin/timetable/update-zoom", timetableWriteRoute()],

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

  ["/api/admin/check-admin", authRoute(checkAdmin, checkAdminGoogleSheetsEndpoint)],
  ["/api/admin/setup-pin", authRoute(setupAdminPin, setupAdminPinGoogleSheetsEndpoint)],
  ["/api/admin/login", authRoute(adminLogin, adminLoginGoogleSheetsEndpoint)],
  ["/api/admin/reset-pin", authRoute(resetPin, resetStudentPinGoogleSheetsEndpoint)],

  ["/api/check-student", authRoute(checkStudent, checkStudentGoogleSheetsEndpoint)],
  ["/api/setup-pin", authRoute(setupPin, setupStudentPinGoogleSheetsEndpoint)],
  ["/api/login", authRoute(login, studentLoginGoogleSheetsEndpoint)],

  ["/api/attendance/submit-absent", attendanceWriteRoute()],
  ["/api/attendance/students", attendanceStudentsReadRoute()],
  ["/api/attendance/report", attendanceReportReadRoute()],

  ["/api/admin/check-student-duplicate", studentManagementReadRoute(
    checkStudentDuplicateAdmin,
    checkStudentDuplicateGoogleSheetsEndpoint
  )],
  ["/api/admin/register-student", studentManagementWriteRoute()],
  ["/api/admin/update-student", studentManagementUpdateRoute()],
  ["/api/admin/students/search", studentManagementReadRoute(
    searchStudentsAdmin,
    searchStudentsGoogleSheetsEndpoint
  )],
  ["/api/admin/search-students", studentManagementReadRoute(
    searchStudentsAdmin,
    searchStudentsGoogleSheetsEndpoint
  )],
  ["/api/admin/student/search", studentManagementReadRoute(
    searchStudentsAdmin,
    searchStudentsGoogleSheetsEndpoint
  )],
  ["/api/admin/students/assignment-options", taskAssignmentReadRoute()],

  ["/api/admin/subjects/create", curriculumWriteRoute(
    createSubjectAdmin,
    createSubjectGoogleSheetsEndpoint
  )],
  ["/api/admin/subjects/list", curriculumReadRoute(listSubjectsAdmin, listSubjectsGoogleSheetsEndpoint)],
  ["/api/admin/subjects/update", curriculumWriteRoute(
    updateSubjectAdmin,
    updateSubjectGoogleSheetsEndpoint
  )],

  ["/api/admin/subject-resources/create", curriculumResourcesWriteRoute(
    createSubjectResourceAdmin,
    createSubjectResourceGoogleSheetsEndpoint
  )],
  ["/api/admin/subject-resources/list", curriculumResourcesReadRoute()],
  ["/api/admin/subject-resources/update", curriculumResourcesWriteRoute(
    updateSubjectResourceAdmin,
    updateSubjectResourceGoogleSheetsEndpoint
  )],

  ["/api/admin/tasks/create", curriculumWriteRoute(
    createTaskAdmin,
    createTaskGoogleSheetsEndpoint
  )],
  ["/api/admin/tasks/list", curriculumReadRoute(listTasksAdmin, listTasksGoogleSheetsEndpoint)],
  ["/api/admin/tasks/update", curriculumWriteRoute(
    updateTaskAdmin,
    updateTaskGoogleSheetsEndpoint
  )],
  ["/api/admin/tasks/assign", taskAssignmentWriteRoute()],
  ["/api/admin/tasks/verify", progressWriteRoute(
    verifyStudentTask,
    verifyStudentTaskGoogleSheetsEndpoint
  )],

  ["/api/tasks/student", progressReadRoute(
    getStudentTasksEndpoint,
    getStudentTasksGoogleSheetsEndpoint
  )],
  ["/api/tasks/update-complete", progressWriteRoute(
    updateTaskComplete,
    updateTaskCompleteGoogleSheetsEndpoint
  )],
  ["/api/progress/tasks", progressReadRoute(
    taskProgressReport,
    taskProgressReportGoogleSheetsEndpoint
  )],
  ["/api/progress/task-detail", progressReadRoute(
    taskProgressDetail,
    taskProgressDetailGoogleSheetsEndpoint
  )]
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

function authRoute(appsScriptHandler, googleSheetsHandler) {
  return backendRoute("auth", {
    [BACKEND_APPS_SCRIPT]: appsScriptHandler,
    [BACKEND_GOOGLE_SHEETS]: googleSheetsHandler
  });
}

function timetableReadRoute() {
  return backendRoute("timetable-read", {
    [BACKEND_APPS_SCRIPT]: getTimetableAppsScriptEndpoint,
    [BACKEND_GOOGLE_SHEETS]: getTimetableGoogleSheetsEndpoint
  });
}

function timetableWriteRoute() {
  return backendRoute("timetable-write", {
    [BACKEND_APPS_SCRIPT]: updateTimetableZoomLinkEndpoint,
    [BACKEND_GOOGLE_SHEETS]: updateTimetableZoomLinkGoogleSheetsEndpoint
  });
}

function attendanceStudentsReadRoute() {
  return backendRoute("attendance-read", {
    [BACKEND_APPS_SCRIPT]: attendanceStudents,
    [BACKEND_GOOGLE_SHEETS]: attendanceStudentsGoogleSheetsEndpoint
  });
}

function attendanceReportReadRoute() {
  return backendRoute("attendance-read", {
    [BACKEND_APPS_SCRIPT]: attendanceReport,
    [BACKEND_GOOGLE_SHEETS]: attendanceReportGoogleSheetsEndpoint
  });
}

function attendanceWriteRoute() {
  return backendRoute("attendance-write", {
    [BACKEND_APPS_SCRIPT]: submitAbsentAttendance,
    [BACKEND_GOOGLE_SHEETS]: submitAbsentAttendanceGoogleSheetsEndpoint
  });
}

function studentManagementReadRoute(appsScriptHandler, googleSheetsHandler) {
  return backendRoute("student-management-read", {
    [BACKEND_APPS_SCRIPT]: appsScriptHandler,
    [BACKEND_GOOGLE_SHEETS]: googleSheetsHandler
  });
}

function studentManagementUpdateRoute() {
  return backendRoute("student-management-update", {
    [BACKEND_APPS_SCRIPT]: updateStudentAdmin,
    [BACKEND_GOOGLE_SHEETS]: updateStudentGoogleSheetsEndpoint
  });
}

function studentManagementWriteRoute() {
  return backendRoute("student-management-write", {
    [BACKEND_APPS_SCRIPT]: registerStudentAdmin,
    [BACKEND_GOOGLE_SHEETS]: registerStudentGoogleSheetsEndpoint
  });
}

function taskAssignmentReadRoute() {
  return backendRoute("task-assignment-read", {
    [BACKEND_APPS_SCRIPT]: getStudentAssignmentOptionsAdmin,
    [BACKEND_GOOGLE_SHEETS]: getStudentAssignmentOptionsGoogleSheetsEndpoint
  });
}

function taskAssignmentWriteRoute() {
  return backendRoute("task-assignment-write", {
    [BACKEND_APPS_SCRIPT]: assignTasksAdmin,
    [BACKEND_GOOGLE_SHEETS]: assignTasksGoogleSheetsEndpoint
  });
}

function progressReadRoute(appsScriptHandler, googleSheetsHandler) {
  return backendRoute("progress-read", {
    [BACKEND_APPS_SCRIPT]: appsScriptHandler,
    [BACKEND_GOOGLE_SHEETS]: googleSheetsHandler
  });
}

function progressWriteRoute(appsScriptHandler, googleSheetsHandler) {
  return backendRoute("progress-write", {
    [BACKEND_APPS_SCRIPT]: appsScriptHandler,
    [BACKEND_GOOGLE_SHEETS]: googleSheetsHandler
  });
}

function curriculumReadRoute(appsScriptHandler, googleSheetsHandler) {
  return backendRoute("curriculum-read", {
    [BACKEND_APPS_SCRIPT]: appsScriptHandler,
    [BACKEND_GOOGLE_SHEETS]: googleSheetsHandler
  });
}

function curriculumWriteRoute(appsScriptHandler, googleSheetsHandler) {
  return backendRoute("curriculum-write", {
    [BACKEND_APPS_SCRIPT]: appsScriptHandler,
    [BACKEND_GOOGLE_SHEETS]: googleSheetsHandler
  });
}

function curriculumResourcesReadRoute() {
  return backendRoute("curriculum-resources-read", {
    [BACKEND_APPS_SCRIPT]: listSubjectResourcesAdmin,
    [BACKEND_GOOGLE_SHEETS]: listSubjectResourcesGoogleSheetsEndpoint
  });
}

function curriculumResourcesWriteRoute(appsScriptHandler, googleSheetsHandler) {
  return backendRoute("curriculum-resources-write", {
    [BACKEND_APPS_SCRIPT]: appsScriptHandler,
    [BACKEND_GOOGLE_SHEETS]: googleSheetsHandler
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
