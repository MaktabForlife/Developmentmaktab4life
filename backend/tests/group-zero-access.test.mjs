import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = relativePath => readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");

const adminHtml = read("admin/index.html");
const studentHtml = read("student/index.html");
const rootHtml = read("index.html");
const manageStudents = read("js/m4l-manage-students.js");
const shell = read("js/m4l-shell.js");
const timetableUi = read("js/m4l-timetable.js");
const attendance = read("backend/src/routes/attendance.js");
const progressRead = read("backend/src/routes/progress-read.js");
const progressWrite = read("backend/src/routes/progress-write.js");

assert.match(manageStudents, /ALL_GROUPS_STUDENT_LABEL = "ALL \(Group 0\)"/);
assert.match(manageStudents, /Group \(0 = ALL\)/);
assert.match(manageStudents, /min="0" step="1"/);
assert.match(manageStudents, /Only an Admin can assign Group 0 \(ALL\) access/);
assert.match(manageStudents, /if \(isInactive\)[\s\S]*if \(isGroupZero\) return ALL_GROUPS_STUDENT_LABEL/);
assert.match(shell, /if \(group === "0"\) return "ALL \(Group 0\)"/);

assert.match(timetableUi, /TIMETABLE_CACHE_PREFIX = "maktab_timetable_cache_v2"/);
assert.match(timetableUi, /getTimetableViewerCachePart/);
assert.match(timetableUi, /user\.studentid[\s\S]*user\.adminid/);
assert.match(timetableUi, /user\.classgroup \?\?[\s\S]*user\.assignedgroup/);

for (const html of [adminHtml, studentHtml, rootHtml]) {
  assert.match(html, /m4l-shell\.js\?v=100\.8/);
  assert.match(html, /m4l-timetable\.js\?v=100\.8/);
}
assert.match(adminHtml, /m4l-manage-students\.js\?v=100\.8/);

// V100.8 changes access to timetable/resources only. Group 0 remains outside
// Attendance and Progress monitoring exactly as agreed.
assert.match(attendance, /classgroup === "0"/);
assert.match(progressRead, /classgroup === "0"/);
assert.match(progressWrite, /classgroup === "0"/);

console.log("Group 0 ALL-groups UI/cache boundary tests passed.");
