import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [adminHtml, js, css] = await Promise.all([
  readFile(new URL("../../admin/index.html", import.meta.url), "utf8"),
  readFile(new URL("../../js/m4l-global-course-scheduler.js", import.meta.url), "utf8"),
  readFile(new URL("../../css/m4l-28-global-course-scheduler.css", import.meta.url), "utf8")
]);

assert.match(adminHtml, /Course Scheduler/);
assert.match(adminHtml, /Program Timetables/);
assert.match(adminHtml, /styles\.css\?v=102\.12\.1/);
assert.match(js, /Revise timetable/);
assert.match(js, /Publish revision/);
assert.match(js, /Reschedule session/);
assert.match(js, /save-session-inline/);
assert.match(js, /data-inline-session-field="status"/);
assert.match(js, /<option value="CANCELLED"/);
assert.match(js, /global-session-inline-row/);
assert.match(js, /formatUiTime/);
assert.match(js, /Use 24-hour times such as 13h00/);
assert.doesNotMatch(js, /Edit session/);
assert.doesNotMatch(js, /Session details/);
assert.match(js, /\/api\/admin\/platform\/global\/timetable\/generate/);
assert.match(js, /\/api\/admin\/platform\/global\/timetable\/session\/save/);
assert.match(js, /\/api\/admin\/platform\/global\/timetable\/session\/reschedule/);
assert.match(js, /\/api\/admin\/platform\/global\/timetable\/revise/);
assert.match(js, /\/api\/admin\/platform\/global\/timetable\/publish/);
assert.match(css, /\.global-session-inline-row\.is-lifecycle-changed/);
assert.match(css, /\.global-session-inline-table/);
assert.match(css, /@media \(max-width:760px\)/);

console.log("V102.11.2 Global Course revision/cancel/reschedule UI checks passed.");
