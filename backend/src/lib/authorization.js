/* M4L V102.0.2 - Central role capabilities. Course membership is validated separately. */

import { normalizePlatformIdentifier } from "./platform-schema.js";

export const CAPABILITIES = Object.freeze({
  PLATFORM_MANAGE: "PLATFORM_MANAGE",
  GLOBAL_CURRICULUM_MANAGE: "GLOBAL_CURRICULUM_MANAGE",
  COURSE_ACCESS_MANAGE: "COURSE_ACCESS_MANAGE",
  COURSE_CONFIG_MANAGE: "COURSE_CONFIG_MANAGE",
  COURSE_CURRICULUM_MANAGE: "COURSE_CURRICULUM_MANAGE",
  TIMETABLE_MANAGE: "TIMETABLE_MANAGE",
  STUDENT_MANAGE: "STUDENT_MANAGE",
  STAFF_ASSIGNMENTS_MANAGE: "STAFF_ASSIGNMENTS_MANAGE",
  ATTENDANCE_MANAGE: "ATTENDANCE_MANAGE",
  WEEKLY_PLANNER_VIEW: "WEEKLY_PLANNER_VIEW",
  WEEKLY_PLANNER_CREATE: "WEEKLY_PLANNER_CREATE",
  RESOURCE_CREATE: "RESOURCE_CREATE",
  TASK_CREATE: "TASK_CREATE",
  TASK_ASSIGN: "TASK_ASSIGN",
  TASK_PROGRESS_VERIFY: "TASK_PROGRESS_VERIFY",
  PROGRESS_VIEW: "PROGRESS_VIEW",
  PROGRESS_MANAGE: "PROGRESS_MANAGE",
  COURSE_DATA_VIEW: "COURSE_DATA_VIEW",
  CLASS_DATA_VIEW: "CLASS_DATA_VIEW",
  OWN_DATA_VIEW: "OWN_DATA_VIEW",
  OWN_TASK_PROGRESS_UPDATE: "OWN_TASK_PROGRESS_UPDATE"
});

const ALL_CAPABILITIES = Object.freeze(Object.values(CAPABILITIES));

export const ROLE_CAPABILITIES = Object.freeze({
  GLOBAL_ADMIN: ALL_CAPABILITIES,
  ADMIN: ALL_CAPABILITIES,
  SENIOR: Object.freeze([
    CAPABILITIES.COURSE_CONFIG_MANAGE,
    CAPABILITIES.COURSE_CURRICULUM_MANAGE,
    CAPABILITIES.TIMETABLE_MANAGE,
    CAPABILITIES.STUDENT_MANAGE,
    CAPABILITIES.STAFF_ASSIGNMENTS_MANAGE,
    CAPABILITIES.ATTENDANCE_MANAGE,
    CAPABILITIES.WEEKLY_PLANNER_VIEW,
    CAPABILITIES.WEEKLY_PLANNER_CREATE,
    CAPABILITIES.RESOURCE_CREATE,
    CAPABILITIES.TASK_CREATE,
    CAPABILITIES.TASK_ASSIGN,
    CAPABILITIES.TASK_PROGRESS_VERIFY,
    CAPABILITIES.PROGRESS_VIEW,
    CAPABILITIES.PROGRESS_MANAGE,
    CAPABILITIES.CLASS_DATA_VIEW,
    CAPABILITIES.COURSE_DATA_VIEW
  ]),
  TEACHER: Object.freeze([
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
  ]),
  STUDENT: Object.freeze([
    CAPABILITIES.OWN_DATA_VIEW,
    CAPABILITIES.OWN_TASK_PROGRESS_UPDATE
  ])
});

export function roleHasCapability(role, capability) {
  const normalizedRole = normalizePlatformIdentifier(role);
  const normalizedCapability = normalizePlatformIdentifier(capability);
  return Boolean(
    normalizedCapability && ROLE_CAPABILITIES[normalizedRole]?.includes(normalizedCapability)
  );
}

export function assertRoleHasCapability(role, capability) {
  if (!roleHasCapability(role, capability)) {
    throw new Error("Role is not authorised for this action");
  }
  return true;
}

export function assertTeacherClassScope(role, requestedClassIds, assignedClassIds) {
  if (normalizePlatformIdentifier(role) !== "TEACHER") {
    return normalizeClassIds(requestedClassIds);
  }

  const requested = normalizeClassIds(requestedClassIds);
  const assigned = new Set(normalizeClassIds(assignedClassIds));
  if (requested.length === 0 || assigned.size === 0) {
    throw new Error("Teacher class access is not assigned");
  }

  const hasAllClasses = assigned.has("ALL");
  const outsideScope = requested.some(classId => (
    classId === "ALL" ? !hasAllClasses : !hasAllClasses && !assigned.has(classId)
  ));
  if (outsideScope) {
    throw new Error("Teacher request exceeds assigned class access");
  }
  return requested;
}

function normalizeClassIds(values) {
  const input = Array.isArray(values) ? values : [values];
  return Array.from(new Set(input
    .map(value => normalizePlatformIdentifier(value))
    .filter(Boolean)));
}
