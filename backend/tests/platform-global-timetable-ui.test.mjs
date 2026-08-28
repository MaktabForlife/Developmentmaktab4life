import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [adminHtml, js, css] = await Promise.all([
  readFile(new URL("../../admin/index.html", import.meta.url), "utf8"),
  readFile(new URL("../../js/m4l-global-course-scheduler.js", import.meta.url), "utf8"),
  readFile(new URL("../../css/m4l-28-global-course-scheduler.css", import.meta.url), "utf8")
]);

assert.match(adminHtml, /Course Scheduler/);
assert.match(adminHtml, /Program Timetables/);
assert.match(adminHtml, /styles\.css\?v=102\.11\.1/);
assert.match(js, /Revise timetable/);
assert.match(js, /Publish revision/);
assert.match(js, /Cancel session/);
assert.match(js, /Reschedule session/);
assert.match(js, /Restore/);
assert.match(js, /Edit session/);
assert.doesNotMatch(js, /Session details/);
assert.match(js, /editingSessionStatus\(\)/, "Saving a cancelled session must preserve CANCELLED until Restore is chosen");
assert.match(js, /\/api\/admin\/platform\/global\/timetable\/generate/);
assert.match(js, /\/api\/admin\/platform\/global\/timetable\/session\/save/);
assert.match(js, /\/api\/admin\/platform\/global\/timetable\/session\/reschedule/);
assert.match(js, /\/api\/admin\/platform\/global\/timetable\/revise/);
assert.match(js, /\/api\/admin\/platform\/global\/timetable\/publish/);
assert.match(css, /\.global-timetable-session\.is-lifecycle-changed/);
assert.match(css, /@media \(max-width:640px\)/);

console.log("V102.11.1 Global Course revision/cancel/reschedule UI checks passed.");
