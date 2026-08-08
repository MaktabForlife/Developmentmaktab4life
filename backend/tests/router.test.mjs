import assert from "node:assert/strict";
import { ROUTE_PATHS } from "../src/router.js";
import worker from "../src/worker.js";

const expectedPaths = [
  "/api/resources/list",
  "/api/student/resources/list",
  "/api/admin/resources/list",
  "/api/admin/resources/options",
  "/api/admin/resources/create",
  "/api/admin/resources/manage-list",
  "/api/admin/resources/update",
  "/api/admin/drive/browse",
  "/api/library/drive/access",
  "/api/timetable/get",
  "/api/student/timetable/get",
  "/api/admin/timetable/get",
  "/api/admin/timetable/update-zoom",
  "/api/admin/weekly-planner/health",
  "/api/admin/weekly-planner/teachers",
  "/api/admin/weekly-planner/get",
  "/api/admin/weekly-planner/save",
  "/api/admin/weekly-planner/save-preview",
  "/api/admin/weekly-planner/archive-overview",
  "/api/admin/weekly-planner/week-records",
  "/api/admin/weekly-planner/teacher-history",
  "/api/admin/weekly-planner/teacher-week-records",
  "/api/admin/backend-routing",
  "/api/admin/system-settings/get",
  "/api/admin/system-settings/save",
  "/api/admin/check-admin",
  "/api/admin/setup-pin",
  "/api/admin/login",
  "/api/admin/reset-pin",
  "/api/admin/admins/search",
  "/api/admin/register-admin",
  "/api/admin/update-admin",
  "/api/admin/reset-admin-pin",
  "/api/check-student",
  "/api/setup-pin",
  "/api/login",
  "/api/attendance/submit-absent",
  "/api/attendance/students",
  "/api/attendance/report",
  "/api/admin/check-student-duplicate",
  "/api/admin/register-student",
  "/api/admin/update-student",
  "/api/admin/students/search",
  "/api/admin/search-students",
  "/api/admin/student/search",
  "/api/admin/students/assignment-options",
  "/api/admin/subjects/create",
  "/api/admin/subjects/list",
  "/api/admin/subjects/update",
  "/api/admin/subject-resources/create",
  "/api/admin/subject-resources/list",
  "/api/admin/subject-resources/update",
  "/api/admin/tasks/create",
  "/api/admin/tasks/list",
  "/api/admin/tasks/update",
  "/api/admin/tasks/assign",
  "/api/admin/tasks/verify",
  "/api/tasks/student",
  "/api/tasks/update-complete",
  "/api/progress/tasks",
  "/api/progress/task-detail"
];

assert.deepEqual(ROUTE_PATHS, expectedPaths, "The modular router must retain every V96.1 API path and alias");

const root = await worker.fetch(new Request("https://worker.test/"), {});
assert.equal(root.status, 200);
assert.deepEqual(await root.json(), {
  success: true,
  service: "rebootworker",
  version: "100.6"
});

const preflight = await worker.fetch(new Request("https://worker.test/api/login", {
  method: "OPTIONS"
}), {});
assert.equal(preflight.status, 200);
assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), "*");

const notFound = await worker.fetch(new Request("https://worker.test/not-a-route"), {});
assert.equal(notFound.status, 404);
assert.deepEqual(await notFound.json(), { success: false, error: "Not found" });

const routingUnauthorized = await worker.fetch(new Request(
  "https://worker.test/api/admin/backend-routing",
  { method: "POST" }
), {});
assert.equal(routingUnauthorized.status, 401);
assert.equal(routingUnauthorized.headers.get("X-M4L-Feature"), "routing");
assert.equal(routingUnauthorized.headers.get("X-M4L-Backend"), "worker");

const systemSettingsUnauthorized = await worker.fetch(new Request(
  "https://worker.test/api/admin/system-settings/get",
  { method: "POST" }
), {
  M4L_BACKEND_SYSTEM_SETTINGS: "google-sheets"
});
assert.equal(systemSettingsUnauthorized.status, 401);
assert.equal(systemSettingsUnauthorized.headers.get("X-M4L-Feature"), "system-settings");
assert.equal(systemSettingsUnauthorized.headers.get("X-M4L-Backend"), "google-sheets");
assert.equal(
  systemSettingsUnauthorized.headers.get("X-M4L-Backend-Source"),
  "fixed"
);

const timetableWriteUnauthorized = await worker.fetch(new Request(
  "https://worker.test/api/admin/timetable/update-zoom",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ zoomlink: "https://zoom.test/direct" })
  }
), {
  M4L_BACKEND_TIMETABLE_WRITE: "google-sheets"
});
assert.equal(timetableWriteUnauthorized.status, 401);
assert.equal(timetableWriteUnauthorized.headers.get("X-M4L-Feature"), "timetable-write");
assert.equal(timetableWriteUnauthorized.headers.get("X-M4L-Backend"), "google-sheets");
assert.equal(
  timetableWriteUnauthorized.headers.get("X-M4L-Backend-Source"),
  "fixed"
);

const attendanceReadUnauthorized = await worker.fetch(new Request(
  "https://worker.test/api/attendance/students",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ classgroup: "ALL" })
  }
), {
  M4L_BACKEND_ATTENDANCE_READ: "google-sheets"
});
assert.equal(attendanceReadUnauthorized.status, 401);
assert.equal(attendanceReadUnauthorized.headers.get("X-M4L-Feature"), "attendance-read");
assert.equal(attendanceReadUnauthorized.headers.get("X-M4L-Backend"), "google-sheets");

const attendanceWriteUnauthorized = await worker.fetch(new Request(
  "https://worker.test/api/attendance/submit-absent",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ date: "2026-07-28", absentStudents: [] })
  }
), {
  M4L_BACKEND_ATTENDANCE_WRITE: "google-sheets"
});
assert.equal(attendanceWriteUnauthorized.status, 401);
assert.equal(attendanceWriteUnauthorized.headers.get("X-M4L-Feature"), "attendance-write");
assert.equal(attendanceWriteUnauthorized.headers.get("X-M4L-Backend"), "google-sheets");

const curriculumReadUnauthorized = await worker.fetch(new Request(
  "https://worker.test/api/admin/subjects/list",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  }
), {
  M4L_BACKEND_CURRICULUM_READ: "google-sheets"
});
assert.equal(curriculumReadUnauthorized.status, 401);
assert.equal(curriculumReadUnauthorized.headers.get("X-M4L-Feature"), "curriculum-read");
assert.equal(curriculumReadUnauthorized.headers.get("X-M4L-Backend"), "google-sheets");

const curriculumWriteUnauthorized = await worker.fetch(new Request(
  "https://worker.test/api/admin/subjects/create",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subjectName: "Unauthorized Subject" })
  }
), {
  M4L_BACKEND_CURRICULUM_WRITE: "google-sheets"
});
assert.equal(curriculumWriteUnauthorized.status, 401);
assert.equal(curriculumWriteUnauthorized.headers.get("X-M4L-Feature"), "curriculum-write");
assert.equal(curriculumWriteUnauthorized.headers.get("X-M4L-Backend"), "google-sheets");
assert.equal(
  curriculumWriteUnauthorized.headers.get("X-M4L-Backend-Source"),
  "fixed"
);

const curriculumResourcesReadUnauthorized = await worker.fetch(new Request(
  "https://worker.test/api/admin/subject-resources/list",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  }
), {
  M4L_BACKEND_CURRICULUM_RESOURCES_READ: "google-sheets"
});
assert.equal(curriculumResourcesReadUnauthorized.status, 401);
assert.equal(
  curriculumResourcesReadUnauthorized.headers.get("X-M4L-Feature"),
  "curriculum-resources-read"
);
assert.equal(curriculumResourcesReadUnauthorized.headers.get("X-M4L-Backend"), "google-sheets");

const curriculumResourcesWriteUnauthorized = await worker.fetch(new Request(
  "https://worker.test/api/admin/subject-resources/create",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      subjectid: "SUB1",
      resourceName: "Unauthorized Resource",
      resourceType: "PDF",
      resourceLink: "https://example.test/unauthorized"
    })
  }
), {
  M4L_BACKEND_CURRICULUM_RESOURCES_WRITE: "google-sheets"
});
assert.equal(curriculumResourcesWriteUnauthorized.status, 401);
assert.equal(
  curriculumResourcesWriteUnauthorized.headers.get("X-M4L-Feature"),
  "curriculum-resources-write"
);
assert.equal(
  curriculumResourcesWriteUnauthorized.headers.get("X-M4L-Backend"),
  "google-sheets"
);

const studentManagementReadUnauthorized = await worker.fetch(new Request(
  "https://worker.test/api/admin/students/search",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ listAll: true })
  }
), {
  M4L_BACKEND_STUDENT_MANAGEMENT_READ: "google-sheets"
});
assert.equal(studentManagementReadUnauthorized.status, 401);
assert.equal(
  studentManagementReadUnauthorized.headers.get("X-M4L-Feature"),
  "student-management-read"
);
assert.equal(studentManagementReadUnauthorized.headers.get("X-M4L-Backend"), "google-sheets");
assert.equal(
  studentManagementReadUnauthorized.headers.get("X-M4L-Backend-Source"),
  "fixed"
);

const duplicateReadUnauthorized = await worker.fetch(new Request(
  "https://worker.test/api/admin/check-student-duplicate",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "Test", whatsapp6: "123456", classgroup: "1" })
  }
), {
  M4L_BACKEND_STUDENT_MANAGEMENT_READ: "google-sheets"
});
assert.equal(duplicateReadUnauthorized.status, 401);
assert.equal(duplicateReadUnauthorized.headers.get("X-M4L-Feature"), "student-management-read");
assert.equal(duplicateReadUnauthorized.headers.get("X-M4L-Backend"), "google-sheets");

const studentManagementUpdateUnauthorized = await worker.fetch(new Request(
  "https://worker.test/api/admin/update-student",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uniqueid: "TEST", username: "Unauthorized" })
  }
), {
  M4L_BACKEND_STUDENT_MANAGEMENT_UPDATE: "google-sheets"
});
assert.equal(studentManagementUpdateUnauthorized.status, 401);
assert.equal(
  studentManagementUpdateUnauthorized.headers.get("X-M4L-Feature"),
  "student-management-update"
);
assert.equal(studentManagementUpdateUnauthorized.headers.get("X-M4L-Backend"), "google-sheets");
assert.equal(
  studentManagementUpdateUnauthorized.headers.get("X-M4L-Backend-Source"),
  "fixed"
);

const taskAssignmentReadUnauthorized = await worker.fetch(new Request(
  "https://worker.test/api/admin/students/assignment-options",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  }
), {
  M4L_BACKEND_TASK_ASSIGNMENT_READ: "google-sheets"
});
assert.equal(taskAssignmentReadUnauthorized.status, 401);
assert.equal(
  taskAssignmentReadUnauthorized.headers.get("X-M4L-Feature"),
  "task-assignment-read"
);
assert.equal(taskAssignmentReadUnauthorized.headers.get("X-M4L-Backend"), "google-sheets");
assert.equal(
  taskAssignmentReadUnauthorized.headers.get("X-M4L-Backend-Source"),
  "fixed"
);

const progressReadUnauthorized = await worker.fetch(new Request(
  "https://worker.test/api/tasks/student",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subjectid: "ALL" })
  }
), {
  M4L_BACKEND_PROGRESS_READ: "google-sheets"
});
assert.equal(progressReadUnauthorized.status, 401);
assert.equal(progressReadUnauthorized.headers.get("X-M4L-Feature"), "progress-read");
assert.equal(progressReadUnauthorized.headers.get("X-M4L-Backend"), "google-sheets");
assert.equal(
  progressReadUnauthorized.headers.get("X-M4L-Backend-Source"),
  "fixed"
);

const progressWriteUnauthorized = await worker.fetch(new Request(
  "https://worker.test/api/tasks/update-complete",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ studenttaskid: "STASK1", complete: true })
  }
), {
  M4L_BACKEND_PROGRESS_WRITE: "google-sheets"
});
assert.equal(progressWriteUnauthorized.status, 401);
assert.equal(progressWriteUnauthorized.headers.get("X-M4L-Feature"), "progress-write");
assert.equal(progressWriteUnauthorized.headers.get("X-M4L-Backend"), "google-sheets");
assert.equal(
  progressWriteUnauthorized.headers.get("X-M4L-Backend-Source"),
  "fixed"
);

console.log("Worker router tests passed.");
