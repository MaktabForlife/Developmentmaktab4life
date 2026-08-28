import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [adminHtml, js, css, styles] = await Promise.all([
  readFile(new URL("../../admin/index.html", import.meta.url), "utf8"),
  readFile(new URL("../../js/m4l-global-timetable.js", import.meta.url), "utf8"),
  readFile(new URL("../../css/m4l-27-global-timetable.css", import.meta.url), "utf8"),
  readFile(new URL("../../styles.css", import.meta.url), "utf8")
]);

assert.match(adminHtml, /data-gcm-timetable-action="show">Schedule</);
assert.match(adminHtml, /m4l-global-timetable\.js\?v=102\.11/);
assert.match(adminHtml, /m4l-global-delivery\.js\?v=102\.11/);
assert.match(adminHtml, /styles\.css\?v=102\.11/);
assert.match(styles, /m4l-27-global-timetable\.css\?v=102\.11/);

assert.match(js, /Exact dated sessions · immutable publication/);
assert.match(js, /Repeat on/);
assert.match(js, /Active session/);
assert.match(js, /snapshot will be immutable/i);
assert.match(js, /Select teacher/);
assert.match(js, /\/api\/admin\/platform\/global\/timetable\/generate/);
assert.match(js, /\/api\/admin\/platform\/global\/timetable\/session\/save/);
assert.match(js, /\/api\/admin\/platform\/global\/timetable\/publish/);
assert.match(js, /type="date"/);
assert.match(js, /name="gcm-timetable-weekday"/);
assert.match(css, /\.global-timetable-session-list/);
assert.match(css, /@media \(max-width: 850px\)/);

console.log("V102.11 Global Curriculum Schedule UI checks passed.");
