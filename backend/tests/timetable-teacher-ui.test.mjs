import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const timetable = await readFile(new URL("../../js/m4l-timetable.js", import.meta.url), "utf8");
const weeklyPlanner = await readFile(new URL("../../js/m4l-weekly-planner.js", import.meta.url), "utf8");
const timetableCss = await readFile(new URL("../../css/m4l-05-home-timetable.css", import.meta.url), "utf8");
const styles = await readFile(new URL("../../styles.css", import.meta.url), "utf8");
const admin = await readFile(new URL("../../admin/index.html", import.meta.url), "utf8");
const student = await readFile(new URL("../../student/index.html", import.meta.url), "utf8");
const root = await readFile(new URL("../../index.html", import.meta.url), "utf8");

assert.match(timetable, /TIMETABLE_CACHE_PREFIX = "maktab_timetable_cache_v5"/);
assert.match(timetable, /teacherId: normalizeTimetableText\(resolvedTeacherId\)/);
assert.match(timetable, /teachername: teacherName/);
assert.match(timetable, /data-timetable-teacher-id=/);
assert.match(timetable, /m4l-timetable-teacher/);
assert.match(timetable, /groupTimetableEntriesBySubject/);
assert.match(timetable, /m4l-timetable-assignment--with-group/);
assert.match(timetable, /m4l-timetable-details-summary/);
assert.match(timetable, /getTimetableModuleLabel/);
assert.match(timetable, /if \(moduleNo && moduleName\) return/);
assert.match(timetable, /getSharedTimetableZoomLink/);
assert.match(timetable, /Open \$\{scopeLabel\} Zoom link/);
assert.match(timetable, /m4l-timetable-session--muted/);
assert.match(timetable, /dimOtherTeachers: timetableResult\?\.viewerhasassignments === true/);
assert.match(timetable, /const sharedZoomLink = getSharedTimetableZoomLink\(subjectEntries\)/);
assert.match(timetable, /"Open session Zoom link"/);
assert.doesNotMatch(timetable, /options\.usePerSessionZoom === true/);

assert.match(weeklyPlanner, /teacherId: teacher\.teacherId \|\| "ALL"/);
assert.doesNotMatch(weeklyPlanner, /assignedTeacher: teacher\.teacherName/);

assert.match(timetableCss, /\.m4l-timetable-session--muted/);
assert.match(timetableCss, /\.m4l-timetable-assignment--muted/);
assert.match(timetableCss, /\.m4l-timetable-assignment--with-group/);
assert.match(timetableCss, /\.m4l-timetable-details-summary/);
assert.match(timetableCss, /\.m4l-timetable-details\[open\]/);
assert.match(timetableCss, /color: #aeb3b0/);
assert.match(timetableCss, /\.m4l-timetable-teacher/);
assert.match(timetableCss, /button\.m4l-timetable-subject/);
assert.match(styles, /m4l-05-home-timetable\.css\?v=100\.10\.2/);

for (const html of [admin, student, root]) {
  assert.match(html, /m4l-timetable\.js\?v=100\.10\.2/);
  assert.match(html, /styles\.css\?v=100\.10\.2/);
}

assert.match(admin, /m4l-weekly-planner\.js\?v=100\.10/);

const renderContext = {
  console,
  state: { user: { adminid: "ADMIN1" } },
  window: {},
  document: {
    addEventListener() {},
    getElementById() { return null; }
  },
  getDomElement(value) { return value; },
  setDomHtml(target, html) { target.innerHTML = html; },
  escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  },
  escapeForAttribute(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
  }
};
vm.runInNewContext(timetable, renderContext, { filename: "js/m4l-timetable.js" });

const renderTarget = { innerHTML: "" };
renderContext.window.M4LTimetable.renderTimetable(renderTarget, {
  vieweradminid: "ADMIN1",
  viewerhasassignments: true,
  showgrouplabels: true,
  sessions: [
    {
      sessionid: "TA2",
      subjectname: "Quran",
      dayofweek: "Mon",
      starttime: "05:45",
      groupno: "2",
      teacherid: "ADMIN2",
      teachername: "Teacher B",
      teacherassigned: true,
      zoomlink: "https://zoom.test/group-2"
    },
    {
      sessionid: "TA1",
      subjectname: "Quran",
      dayofweek: "Mon",
      starttime: "05:45",
      groupno: "1",
      teacherid: "ADMIN1",
      teachername: "Teacher A",
      teacherassigned: true,
      zoomlink: "https://zoom.test/group-1"
    }
  ]
}, { showGroupLabels: true });

assert.equal(
  (renderTarget.innerHTML.match(/>Quran<\/span>/g) || []).length,
  1,
  "A repeated subject must render once per timetable cell"
);
assert.ok(
  renderTarget.innerHTML.indexOf("Group 1") < renderTarget.innerHTML.indexOf("Group 2"),
  "Grouped assignments must sort by group number"
);
assert.match(renderTarget.innerHTML, /m4l-timetable-assignment--muted/);
assert.match(renderTarget.innerHTML, /<details class="m4l-timetable-details">/);
assert.match(renderTarget.innerHTML, />2 groups</);
assert.match(renderTarget.innerHTML, /Open Group 1 Zoom link/);
assert.match(renderTarget.innerHTML, /Open Group 2 Zoom link/);

const allGroupTarget = { innerHTML: "" };
renderContext.window.M4LTimetable.renderTimetable(allGroupTarget, {
  sessions: [{
    sessionid: "TA3",
    subjectname: "Fiqh",
    moduleid: "MOD17",
    modulename: "Hanafi",
    moduleno: "1",
    moduleassigned: true,
    dayofweek: "Mon",
    starttime: "06:30",
    groupno: "ALL",
    teacherid: "ADMIN1",
    teachername: "Teacher A",
    teacherassigned: true
  }]
});

assert.doesNotMatch(allGroupTarget.innerHTML, /All groups/i);
assert.doesNotMatch(allGroupTarget.innerHTML, /m4l-timetable-details-summary/);
assert.match(allGroupTarget.innerHTML, /Module 1: Hanafi/);
assert.match(allGroupTarget.innerHTML, /Teacher A/);

console.log("Teacher-aware timetable UI and cache-delivery tests passed.");
