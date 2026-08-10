import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const timetable = await readFile(new URL("../../js/m4l-timetable.js", import.meta.url), "utf8");
const weeklyPlanner = await readFile(new URL("../../js/m4l-weekly-planner.js", import.meta.url), "utf8");
const timetableCss = await readFile(new URL("../../css/m4l-05-home-timetable.css", import.meta.url), "utf8");
const styles = await readFile(new URL("../../styles.css", import.meta.url), "utf8");
const admin = await readFile(new URL("../../admin/index.html", import.meta.url), "utf8");
const student = await readFile(new URL("../../student/index.html", import.meta.url), "utf8");
const root = await readFile(new URL("../../index.html", import.meta.url), "utf8");

assert.match(timetable, /TIMETABLE_CACHE_PREFIX = "maktab_timetable_cache_v3"/);
assert.match(timetable, /teacherId: normalizeTimetableText\(resolvedTeacherId\)/);
assert.match(timetable, /teachername: teacherName/);
assert.match(timetable, /data-timetable-teacher-id=/);
assert.match(timetable, /m4l-timetable-teacher/);
assert.match(timetable, /m4l-timetable-session--muted/);
assert.match(timetable, /dimOtherTeachers: timetableResult\?\.viewerhasassignments === true/);
assert.match(timetable, /const canOpenSessionZoom = Boolean\(perSessionZoomLink\)/);
assert.match(timetable, /title="Open session Zoom link"/);
assert.doesNotMatch(timetable, /options\.usePerSessionZoom === true/);

assert.match(weeklyPlanner, /teacherId: teacher\.teacherId \|\| "ALL"/);
assert.doesNotMatch(weeklyPlanner, /assignedTeacher: teacher\.teacherName/);

assert.match(timetableCss, /\.m4l-timetable-session--muted/);
assert.match(timetableCss, /\.m4l-timetable-teacher/);
assert.match(timetableCss, /button\.m4l-timetable-subject/);
assert.match(styles, /m4l-05-home-timetable\.css\?v=100\.10/);

for (const html of [admin, student, root]) {
  assert.match(html, /m4l-timetable\.js\?v=100\.10/);
  assert.match(html, /styles\.css\?v=100\.10/);
}

assert.match(admin, /m4l-weekly-planner\.js\?v=100\.10/);

console.log("Teacher-aware timetable UI and cache-delivery tests passed.");
