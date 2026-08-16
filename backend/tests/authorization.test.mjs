import assert from "node:assert/strict";
import {
  assertRoleHasCapability,
  assertTeacherClassScope,
  CAPABILITIES,
  roleHasCapability,
  ROLE_CAPABILITIES
} from "../src/lib/authorization.js";

for (const capability of Object.values(CAPABILITIES)) {
  assert.equal(
    roleHasCapability("GLOBAL_ADMIN", capability),
    true,
    `GLOBAL_ADMIN must have ${capability}`
  );
  assert.equal(
    roleHasCapability("ADMIN", capability),
    true,
    `ADMIN must have ${capability}`
  );
}

assert.equal(roleHasCapability("SENIOR", CAPABILITIES.COURSE_CONFIG_MANAGE), true);
assert.equal(roleHasCapability("SENIOR", CAPABILITIES.TIMETABLE_MANAGE), true);
assert.equal(roleHasCapability("SENIOR", CAPABILITIES.GLOBAL_CURRICULUM_MANAGE), false);
assert.equal(roleHasCapability("SENIOR", CAPABILITIES.PLATFORM_MANAGE), false);
assert.equal(roleHasCapability("SENIOR", CAPABILITIES.COURSE_ACCESS_MANAGE), false);
assert.equal(roleHasCapability("SENIOR", CAPABILITIES.STUDENT_MANAGE), false);

for (const capability of [
  CAPABILITIES.ATTENDANCE_MANAGE,
  CAPABILITIES.WEEKLY_PLANNER_VIEW,
  CAPABILITIES.WEEKLY_PLANNER_CREATE,
  CAPABILITIES.RESOURCE_CREATE,
  CAPABILITIES.TASK_CREATE,
  CAPABILITIES.TASK_ASSIGN,
  CAPABILITIES.TASK_PROGRESS_VERIFY,
  CAPABILITIES.PROGRESS_VIEW,
  CAPABILITIES.PROGRESS_MANAGE,
  CAPABILITIES.CLASS_DATA_VIEW
]) {
  assert.equal(
    roleHasCapability("TEACHER", capability),
    true,
    `TEACHER must have ${capability}`
  );
}

assert.equal(roleHasCapability("TEACHER", CAPABILITIES.TIMETABLE_MANAGE), false);
assert.equal(roleHasCapability("TEACHER", CAPABILITIES.COURSE_CONFIG_MANAGE), false);
assert.equal(roleHasCapability("TEACHER", CAPABILITIES.GLOBAL_CURRICULUM_MANAGE), false);
assert.equal(roleHasCapability("TEACHER", CAPABILITIES.COURSE_DATA_VIEW), false);
assert.equal(roleHasCapability("TEACHER", CAPABILITIES.STUDENT_MANAGE), false);

assert.equal(roleHasCapability("STUDENT", CAPABILITIES.OWN_DATA_VIEW), true);
assert.equal(roleHasCapability("STUDENT", CAPABILITIES.OWN_TASK_PROGRESS_UPDATE), true);
assert.equal(roleHasCapability("STUDENT", CAPABILITIES.TASK_CREATE), false);

assert.equal(roleHasCapability("UNKNOWN", CAPABILITIES.COURSE_DATA_VIEW), false);
assert.equal(roleHasCapability("ADMIN", "UNKNOWN_CAPABILITY"), false);
assert.equal(assertRoleHasCapability("teacher", "attendance_manage"), true);
assert.throws(
  () => assertRoleHasCapability("TEACHER", CAPABILITIES.PLATFORM_MANAGE),
  /not authorised/
);

assert.deepEqual(assertTeacherClassScope("TEACHER", ["1", "2"], ["1", "2", "3"]), ["1", "2"]);
assert.deepEqual(assertTeacherClassScope("TEACHER", ["1", "3"], ["ALL"]), ["1", "3"]);
assert.throws(
  () => assertTeacherClassScope("TEACHER", ["1", "3"], ["1", "2"]),
  /exceeds assigned class access/
);
assert.throws(
  () => assertTeacherClassScope("TEACHER", ["ALL"], ["1", "2"]),
  /exceeds assigned class access/
);
assert.throws(
  () => assertTeacherClassScope("TEACHER", ["1"], []),
  /class access is not assigned/
);
assert.deepEqual(assertTeacherClassScope("SENIOR", ["ALL"], []), ["ALL"]);

assert.equal(new Set(ROLE_CAPABILITIES.ADMIN).size, Object.values(CAPABILITIES).length);
assert.equal(new Set(ROLE_CAPABILITIES.GLOBAL_ADMIN).size, Object.values(CAPABILITIES).length);

console.log("Role authorization capability tests passed.");
