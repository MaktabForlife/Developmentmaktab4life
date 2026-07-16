import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";

const source = await fs.readFile(new URL("../m4l-weekly-planner.js", import.meta.url), "utf8");
const context = {
  window: {},
  console,
  state: { user: {}, token: "" },
  setTimeout,
  clearTimeout,
  requestAnimationFrame: callback => callback(),
  Image: class {}
};
vm.createContext(context);
vm.runInContext(source, context, { filename: "m4l-weekly-planner.js" });

const planner = context.window.M4LWeeklyPlanner;
assert.ok(planner, "Weekly Planner API should be exposed");

const week = planner.getWeekMeta("2026-07-16");
assert.deepEqual(
  JSON.parse(JSON.stringify({ weekStart: week.weekStart, weekEnd: week.weekEnd })),
  { weekStart: "2026-07-13", weekEnd: "2026-07-16" }
);

const previous = {
  version: 1,
  days: ["Monday", "Tuesday", "Wednesday", "Thursday"].map((label, index) => ({
    key: label.toLowerCase(),
    label,
    periods: [{
      id: `previous-${index}`,
      label: "Period One",
      subject: "Previous Subject",
      entries: [`Previous ${label} activity`]
    }]
  }))
};
const rows = [
  { dayofweek: "Mon", starttime: "08:00", subjectname: "Quran" },
  { dayofweek: "Mon", starttime: "09:00", subjectname: "Surahs" },
  { dayofweek: "Tues", starttime: "08:00", subjectname: "Duas" },
  { dayofweek: "Wed", starttime: "08:00", subjectname: "Hadith" },
  { dayofweek: "Thurs", starttime: "08:00", subjectname: "Aqaaid" }
];
const data = planner.buildPlannerDataFromDefaults(rows, previous, week);

assert.equal(data.days.length, 4);
assert.equal(data.days[0].date, "2026-07-13");
assert.equal(data.days[3].date, "2026-07-16");
assert.equal(data.days[0].periods[0].subject, "Quran", "Current timetable subject should win");
assert.deepEqual(
  JSON.parse(JSON.stringify(data.days[0].periods[0].entries)),
  ["Previous Monday activity"],
  "Last week's activity should be prefilled"
);
assert.equal(data.days[0].periods[1].subject, "Surahs");

console.log("Weekly Planner frontend data tests passed.");
