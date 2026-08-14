import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const adminHtml = readFileSync(new URL("../../admin/index.html", import.meta.url), "utf8");
const builderJs = readFileSync(new URL("../../js/m4l-timetable-builder.js", import.meta.url), "utf8");
const builderCss = readFileSync(new URL("../../css/m4l-22-timetable-builder.css", import.meta.url), "utf8");
const styles = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");
const shellJs = readFileSync(new URL("../../js/m4l-shell.js", import.meta.url), "utf8");

assert.match(adminHtml, /id="open-timetable-builder-btn"/);
assert.match(adminHtml, /data-admin-menu-admin-only/);
assert.match(adminHtml, /onclick="showTimetableBuilder\(\)"/);
assert.match(adminHtml, /id="timetable-builder-screen"/);
assert.match(adminHtml, /data-ttb-tab="timetable"/);
assert.match(adminHtml, /data-ttb-tab="courses"/);
assert.match(adminHtml, /data-ttb-tab="subjects"/);
assert.match(adminHtml, /data-ttb-tab="modules"/);
assert.match(adminHtml, /data-ttb-tab="tasks"/);
assert.match(adminHtml, /id="timetable-session-dialog"/);
assert.match(adminHtml, /id="ttb-session-days"/);
assert.match(adminHtml, /id="ttb-session-slot"/);
assert.match(adminHtml, /id="ttb-session-subject"/);
assert.match(adminHtml, /id="ttb-session-module"/);
assert.match(adminHtml, /id="ttb-session-groups"/);
assert.match(adminHtml, /id="ttb-session-teacher"/);
assert.match(adminHtml, /id="ttb-session-zoom"/);
assert.match(adminHtml, /id="timetable-session-message"/);
assert.match(adminHtml, /m4l-timetable-builder\.js\?v=101\.4\.1/);

assert.match(builderJs, /getTimetableBuilderRole\(\) !== "ADMIN"/);
assert.match(builderJs, /\["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"\]/);
assert.match(builderJs, /\/api\/admin\/timetable-builder\/get/);
assert.match(builderJs, /\/api\/admin\/timetable-builder\/course\/save/);
assert.match(builderJs, /\/api\/admin\/timetable-builder\/time-slot\/save/);
assert.match(builderJs, /\/api\/admin\/timetable-builder\/session\/save/);
assert.match(builderJs, /\/api\/admin\/subjects\/create/);
assert.match(builderJs, /\/api\/admin\/subjects\/update/);
assert.match(builderJs, /\/api\/admin\/modules\/create/);
assert.match(builderJs, /\/api\/admin\/modules\/update/);
assert.match(builderJs, /\/api\/admin\/tasks\/create/);
assert.match(builderJs, /\/api\/admin\/tasks\/update/);
assert.match(builderJs, /daysofweek/);
assert.match(builderJs, /groupnos/);
assert.match(builderJs, /input\[name='ttb-session-day'\]/);
assert.match(builderJs, /input\[name='ttb-session-group'\]/);
assert.match(builderJs, /enforceTimetableBuilderGroupSelection/);
assert.match(builderJs, /result\.conflicts/);
assert.match(builderJs, /09:00–10:30|padStart\(2, "0"\)/);
assert.match(builderJs, /lang="en-GB" step="60"/);
assert.doesNotMatch(builderJs, /publish/i, "V101.4 must not silently publish builder rows to the live timetable");

assert.match(styles, /m4l-22-timetable-builder\.css\?v=101\.4\.1/);
assert.match(builderCss, /grid-template-columns:\s*132px repeat\(var\(--ttb-day-count\), minmax\(152px, 1fr\)\)/);
assert.match(builderCss, /min-width:\s*1240px/);
assert.match(builderCss, /grid-template-columns:\s*minmax\(290px, 360px\) minmax\(520px, 1fr\)/);
assert.match(builderCss, /\.timetable-builder-choice-grid/);
assert.match(builderCss, /\.timetable-session-message\.is-error/);
assert.match(shellJs, /id === "timetable-builder-screen"/);

assert.equal(existsSync(new URL("../../icons/timetable.svg", import.meta.url)), true);

console.log("Timetable Builder UI integration tests passed.");
