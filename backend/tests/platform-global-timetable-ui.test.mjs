import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [adminHtml, js, css] = await Promise.all([
  readFile(new URL("../../admin/index.html", import.meta.url), "utf8"),
  readFile(new URL("../../js/m4l-global-course-scheduler.js", import.meta.url), "utf8"),
  readFile(new URL("../../css/m4l-28-global-course-scheduler.css", import.meta.url), "utf8")
]);

assert.match(adminHtml, /Course Scheduler/);
assert.match(adminHtml, /Program Timetables/);
assert.match(adminHtml, /styles\.css\?v=102\.12\.7/);
assert.match(js, /Revise timetable/);
assert.match(js, /Publish revision/);
assert.doesNotMatch(js, /Reschedule session/);
assert.doesNotMatch(js, /save-session-inline/);
assert.match(js, /save-session-batch/);
assert.match(js, /Save all session changes/);
assert.match(js, /data-inline-session-field="status"/);
assert.match(js, /<option value="CANCELLED"/);
assert.match(js, /global-session-inline-row/);
assert.match(js, /formatUiTime/);
assert.match(js, /Use 24-hour times such as 13h00/);
assert.doesNotMatch(js, /Edit session/);
assert.doesNotMatch(js, /Session details/);
assert.match(js, /\/api\/admin\/platform\/global\/timetable\/generate/);
assert.match(js, /\/api\/admin\/platform\/global\/timetable\/session\/batch-save/);
assert.doesNotMatch(js, /\/api\/admin\/platform\/global\/timetable\/session\/reschedule/);
assert.match(js, /\/api\/admin\/platform\/global\/timetable\/revise/);
assert.match(js, /\/api\/admin\/platform\/global\/timetable\/publish/);
assert.match(css, /\.global-session-inline-row\.is-lifecycle-changed/);
assert.match(css, /\.global-session-inline-table/);
assert.match(css, /@media \(max-width:760px\)/);
assert.doesNotMatch(css, /min-width:1320px/);
assert.match(css, /global-session-inline-row\.is-dirty/);
assert.match(css, /global-session-inline-row\.is-cancelled/);
assert.match(css, /global-save-icon-button[\s\S]*background:transparent !important/);
assert.match(css, /global-course-compact-action/);

console.log("V102.12.7 Global Course batch session editing and responsive UI checks passed.");
