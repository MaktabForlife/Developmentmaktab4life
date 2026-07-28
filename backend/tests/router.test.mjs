import assert from "node:assert/strict";
import { ROUTE_PATHS } from "../src/router.js";
import worker from "../src/worker.js";

const expectedPaths = [
  "/api/resources/list",
  "/api/student/resources/list",
  "/api/admin/resources/list",
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
  "/api/admin/check-admin",
  "/api/admin/setup-pin",
  "/api/admin/login",
  "/api/admin/reset-pin",
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
  version: "2.1"
});

const preflight = await worker.fetch(new Request("https://worker.test/api/login", {
  method: "OPTIONS"
}), {});
assert.equal(preflight.status, 200);
assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), "*");

const notFound = await worker.fetch(new Request("https://worker.test/not-a-route"), {});
assert.equal(notFound.status, 404);
assert.deepEqual(await notFound.json(), { success: false, error: "Not found" });

const originalFetch = globalThis.fetch;
let proxiedPayload = null;

globalThis.fetch = async (input, init = {}) => {
  assert.equal(String(input), "https://script.example.test/exec");
  proxiedPayload = JSON.parse(init.body);
  return response({
    student: {
      studentid: "STUDENT1",
      username: "Test Student",
      classgroup: "1",
      pinsetup: true,
      active: true
    }
  });
};

try {
  const checkStudent = await worker.fetch(new Request("https://worker.test/api/check-student", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uniqueid: "TEST-LINK" })
  }), {
    APPS_SCRIPT_URL: "https://script.example.test/exec"
  });

  assert.equal(checkStudent.status, 200);
  assert.equal(checkStudent.headers.get("X-M4L-Feature"), "auth");
  assert.equal(checkStudent.headers.get("X-M4L-Backend"), "apps-script");
  assert.equal(checkStudent.headers.get("X-M4L-Backend-Source"), "default");
  assert.match(checkStudent.headers.get("Access-Control-Expose-Headers"), /X-M4L-Backend/);
  assert.deepEqual(proxiedPayload, {
    action: "getStudentByUniqueId",
    uniqueid: "TEST-LINK"
  });
  assert.deepEqual(await checkStudent.json(), {
    success: true,
    student: {
      studentid: "STUDENT1",
      username: "Test Student",
      classgroup: "1",
      pinsetup: true
    }
  });

  proxiedPayload = null;
  const blockedMigration = await worker.fetch(new Request("https://worker.test/api/check-student", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uniqueid: "TEST-LINK" })
  }), {
    APPS_SCRIPT_URL: "https://script.example.test/exec",
    M4L_BACKEND_AUTH: "google-sheets"
  });

  assert.equal(blockedMigration.status, 503);
  assert.equal(blockedMigration.headers.get("X-M4L-Feature"), "auth");
  assert.equal(blockedMigration.headers.get("X-M4L-Backend"), "google-sheets");
  assert.equal(proxiedPayload, null, "An unavailable direct backend must not fall through to Apps Script");
} finally {
  globalThis.fetch = originalFetch;
}

const routingUnauthorized = await worker.fetch(new Request(
  "https://worker.test/api/admin/backend-routing",
  { method: "POST" }
), {});
assert.equal(routingUnauthorized.status, 401);
assert.equal(routingUnauthorized.headers.get("X-M4L-Feature"), "routing");
assert.equal(routingUnauthorized.headers.get("X-M4L-Backend"), "worker");

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
  "M4L_BACKEND_TIMETABLE_WRITE"
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

console.log("Worker router tests passed.");

function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
