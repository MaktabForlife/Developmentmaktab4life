import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [adminHtml, js, css, styles] = await Promise.all([
  readFile(new URL("../../admin/index.html", import.meta.url), "utf8"),
  readFile(new URL("../../js/m4l-global-course-scheduler.js", import.meta.url), "utf8"),
  readFile(new URL("../../css/m4l-28-global-course-scheduler.css", import.meta.url), "utf8"),
  readFile(new URL("../../styles.css", import.meta.url), "utf8")
]);

assert.match(adminHtml, /data-gcm-course-action="show">Course Scheduler</);
assert.match(adminHtml, /m4l-global-course-scheduler\.js\?v=103\.1\.0\.1/);
assert.doesNotMatch(adminHtml, /data-gcm-delivery-action="show"/);
assert.doesNotMatch(adminHtml, /data-gcm-timetable-action="show"/);
assert.doesNotMatch(adminHtml, /m4l-global-delivery\.js\?v=102\.11/);
assert.doesNotMatch(adminHtml, /m4l-global-timetable\.js\?v=102\.11/);
assert.match(styles, /m4l-28-global-course-scheduler\.css\?v=103\.1\.0\.1/);

assert.match(js, /Set up a new course/);
assert.match(js, /Modify course/);
assert.doesNotMatch(js, /global-course-subject-table/);
assert.doesNotMatch(js, /save-subject-row/);
assert.match(js, /<th>Course<\/th><th>Scheduled dates<\/th><th>Sessions<\/th><th>Status<\/th>/);
assert.match(js, /Weekly schedule/);
assert.match(js, /global-course-day-pills/);
assert.match(js, /data-course-schedule-day/);
assert.match(js, /weekdays: row\.days/);
assert.match(js, /placeholder="04h00"/);
assert.doesNotMatch(js, /type="time"/);
assert.match(js, /global-course-summary-edit-row/);
assert.match(js, /saveIconButton/);
assert.match(js, /Zoom link/);
assert.doesNotMatch(js, /field\("Timezone"/);
assert.match(js, /<option value=""[^>]*>TBA<\/option>/);
assert.match(js, /\/api\/admin\/platform\/global\/delivery\/get/);
assert.doesNotMatch(js, /\/api\/admin\/platform\/global\/policy\/save/);
assert.match(js, /\/api\/admin\/platform\/global\/run\/save/);
assert.match(js, /handleRefreshCapture/);
assert.match(js, /void load\(true\)/, "Header refresh must force a fresh Course Scheduler read");
assert.match(css, /\.global-course-scheduler-shell/);
assert.match(css, /\.global-course-schedule-row/);

console.log("V103.1.0.1 Global Course Scheduler curriculum-separation UI checks passed.");
