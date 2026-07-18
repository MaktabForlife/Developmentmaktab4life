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
import { getResourcesEndpoint } from "./routes/resources.js";

const ROUTES = new Map([
  ["/api/resources/list", getResourcesEndpoint],
  ["/api/student/resources/list", getResourcesEndpoint],
  ["/api/admin/resources/list", getResourcesEndpoint],

  ["/api/timetable/get", getTimetableEndpoint],
  ["/api/student/timetable/get", getTimetableEndpoint],
  ["/api/admin/timetable/get", getTimetableEndpoint],
  ["/api/admin/timetable/update-zoom", updateTimetableZoomLinkEndpoint],

  ["/api/admin/weekly-planner/health", weeklyPlannerHealthEndpoint],
  ["/api/admin/weekly-planner/teachers", weeklyPlannerTeachersEndpoint],
  ["/api/admin/weekly-planner/get", getWeeklyPlannerEndpoint],
  ["/api/admin/weekly-planner/save", saveWeeklyPlannerEndpoint],

  ["/api/admin/check-admin", checkAdmin],
  ["/api/admin/setup-pin", setupAdminPin],
  ["/api/admin/login", adminLogin],
  ["/api/admin/reset-pin", resetPin],

  ["/api/check-student", checkStudent],
  ["/api/setup-pin", setupPin],
  ["/api/login", login],

  ["/api/attendance/submit-absent", submitAbsentAttendance],
  ["/api/attendance/students", attendanceStudents],
  ["/api/attendance/report", attendanceReport],

  ["/api/admin/check-student-duplicate", checkStudentDuplicateAdmin],
  ["/api/admin/register-student", registerStudentAdmin],
  ["/api/admin/update-student", updateStudentAdmin],
  ["/api/admin/students/search", searchStudentsAdmin],
  ["/api/admin/search-students", searchStudentsAdmin],
  ["/api/admin/student/search", searchStudentsAdmin],
  ["/api/admin/students/assignment-options", getStudentAssignmentOptionsAdmin],

  ["/api/admin/subjects/create", createSubjectAdmin],
  ["/api/admin/subjects/list", listSubjectsAdmin],
  ["/api/admin/subjects/update", updateSubjectAdmin],

  ["/api/admin/subject-resources/create", createSubjectResourceAdmin],
  ["/api/admin/subject-resources/list", listSubjectResourcesAdmin],
  ["/api/admin/subject-resources/update", updateSubjectResourceAdmin],

  ["/api/admin/tasks/create", createTaskAdmin],
  ["/api/admin/tasks/list", listTasksAdmin],
  ["/api/admin/tasks/update", updateTaskAdmin],
  ["/api/admin/tasks/assign", assignTasksAdmin],
  ["/api/admin/tasks/verify", verifyStudentTask],

  ["/api/tasks/student", getStudentTasksEndpoint],
  ["/api/tasks/update-complete", updateTaskComplete],
  ["/api/progress/tasks", taskProgressReport],
  ["/api/progress/task-detail", taskProgressDetail]
]);

export function routeRequest(request, env, pathname) {
  const handler = ROUTES.get(pathname);
  return handler ? handler(request, env) : null;
}

export const ROUTE_PATHS = Object.freeze(Array.from(ROUTES.keys()));

