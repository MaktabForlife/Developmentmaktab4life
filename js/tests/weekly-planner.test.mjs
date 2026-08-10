import assert from "node:assert/strict";
import fs from "node:fs/promises";
import vm from "node:vm";

const [source, plannerCss, adminHtml] = await Promise.all([
  fs.readFile(new URL("../m4l-weekly-planner.js", import.meta.url), "utf8"),
  fs.readFile(new URL("../../css/m4l-15-weekly-planner.css", import.meta.url), "utf8"),
  fs.readFile(new URL("../../admin/index.html", import.meta.url), "utf8")
]);

assert.match(adminHtml, /id="weekly-planner-day-editor"/, "The mobile tap-a-day dialog must remain available");
assert.match(adminHtml, /id="weekly-planner-inline-editor"/, "A separate large-screen editor must be present");
assert.match(adminHtml, /id="weekly-planner-inline-rail"/);
assert.match(plannerCss, /V101 stable large-screen inline editor/);
assert.match(plannerCss, /@media \(min-width: 768px\)[\s\S]*\.weekly-planner-inline-editor\s*\{[\s\S]*display: block/);
assert.match(plannerCss, /@media \(min-width: 1180px\)[\s\S]*grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
const saveLabel = { textContent: "Save & Preview" };
const saveButton = makeElement();
saveButton.querySelector = selector => {
  return selector === "[data-weekly-planner-save-label]" ? saveLabel : null;
};
const elements = new Map([
  ["weekly-planner-teacher", makeElement()],
  ["weekly-planner-week", makeElement()],
  ["weekly-planner-group", makeElement()],
  ["weekly-planner-feedback", makeElement()],
  ["weekly-planner-rail", makeElement()],
  ["weekly-planner-inline-rail", makeElement()],
  ["weekly-planner-dots", makeElement()],
  ["weekly-planner-groups", makeElement()],
  ["weekly-planner-message", makeElement()],
  ["weekly-planner-save", saveButton]
]);
const apiCalls = [];
const context = {
  window: {
    M4LTimetable: { fetchTimetable: async () => ({ sessions: [] }) }
  },
  document: {
    getElementById: id => elements.get(id) || null,
    querySelectorAll: () => [],
    querySelector: () => null
  },
  console,
  state: {
    user: {
      adminid: "ADMIN1",
      username: "Test Teacher",
      role: "TEACHER",
      assignedgroup: "2"
    },
    token: "test-token"
  },
  showScreen: () => {},
  apiPost: async (path, body = {}) => {
    apiCalls.push({ path, body });
    if (path.endsWith("/health")) return { success: true };
    if (path.endsWith("/teachers")) {
      return {
        success: true,
        teachers: [
          {
            teacherId: "ADMIN1",
            teacherName: "Test Teacher",
            role: "TEACHER",
            assignedGroup: "2",
            active: true
          },
          {
            teacherId: "ADMIN2",
            teacherName: "Other Teacher",
            role: "TEACHER",
            assignedGroup: "3",
            active: true
          }
        ]
      };
    }
    if (path.endsWith("/get")) {
      const isOwnPlanner = body.teacherId === "ADMIN1";
      return {
        success: true,
        teacher: {
          teacherId: isOwnPlanner ? "ADMIN1" : "ADMIN2",
          teacherName: isOwnPlanner ? "Test Teacher" : "Other Teacher",
          role: "TEACHER",
          assignedGroup: isOwnPlanner ? "2" : "3"
        },
        canEdit: isOwnPlanner,
        week: plannerWeekMeta(elements.get("weekly-planner-week").value),
        planner: isOwnPlanner ? null : {
          plannerId: "WP-ADMIN2-2026-07-13",
          groupNo: "3",
          plannerData: data,
          feedback: "Other teacher feedback",
          updatedDate: "2026-07-19T10:00:00.000Z"
        },
        previousPlanner: null
      };
    }
    if (path.endsWith("/save")) {
      return {
        success: true,
        teacher: {
          teacherId: body.teacherId,
          teacherName: "Test Teacher",
          role: "TEACHER",
          assignedGroup: body.groupNo
        },
        week: plannerWeekMeta(body.weekStart),
        planner: {
          plannerId: `WP-${body.teacherId}-${body.weekStart}`,
          groupNo: body.groupNo,
          plannerData: body.plannerData,
          feedback: body.feedback,
          updatedDate: "2026-08-08T10:00:00.000Z"
        }
      };
    }
    throw new Error(`Unexpected API call: ${path}`);
  },
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

await planner.show();
assert.equal(apiCalls.filter(call => call.path.endsWith("/get")).length, 1);
assert.equal(planner.canReuseSession(), true);
assert.equal(planner.canEdit(), true);

await planner.show();
assert.equal(
  apiCalls.filter(call => call.path.endsWith("/get")).length,
  1,
  "Reopening the same planner in one page session must reuse the rendered planner"
);

elements.get("weekly-planner-group").dispatch("input");
assert.equal(planner.hasUnsavedChanges(), true);
context.window.confirm = () => false;
await planner.load();
assert.equal(
  apiCalls.filter(call => call.path.endsWith("/get")).length,
  1,
  "A declined refresh must preserve unsaved planner input"
);

context.window.confirm = () => true;
await planner.load();
assert.equal(apiCalls.filter(call => call.path.endsWith("/get")).length, 2);
assert.equal(planner.hasUnsavedChanges(), false);

elements.get("weekly-planner-teacher").value = "ADMIN2";
await planner.load({ confirmDiscard: false });
assert.equal(planner.canEdit(), false, "Another teacher's saved planner must render read only");
assert.equal(elements.get("weekly-planner-group").readOnly, true);
assert.equal(saveLabel.textContent, "Copy to My Planner");
assert.match(elements.get("weekly-planner-rail").innerHTML, /readonly/);

await planner.copyToCurrentUser(saveButton);
assert.equal(elements.get("weekly-planner-teacher").value, "ADMIN1");
assert.equal(planner.canEdit(), true, "A copied planner must switch back to the logged-in owner");
assert.equal(planner.hasUnsavedChanges(), true, "A copied plan must be saved explicitly");
assert.equal(saveLabel.textContent, "Save");

assert.match(
  elements.get("weekly-planner-inline-rail").innerHTML,
  /data-weekly-planner-save-day="0"/,
  "Large-screen markup should provide an independent Save control for each day"
);
assert.match(
  elements.get("weekly-planner-inline-rail").innerHTML,
  /data-weekly-planner-day-date="0"[\s\S]*data-weekly-planner-day-group="0"/,
  "Each inline day header should contain its date and group controls"
);

const inlineMarkupBeforeSave = elements.get("weekly-planner-inline-rail").innerHTML;
const daySaveLabel = { textContent: "Save" };
const daySaveButton = makeElement();
daySaveButton.querySelector = selector => selector === "[data-weekly-planner-save-label]" ? daySaveLabel : null;
assert.equal(await planner.saveDay(0, daySaveButton), true);
assert.equal(
  elements.get("weekly-planner-inline-rail").innerHTML,
  inlineMarkupBeforeSave,
  "Saving one day must not rebuild or jump the large-screen editor"
);
const daySaveCall = apiCalls.findLast(call => call.path.endsWith("/save"));
assert.equal(daySaveCall.body.plannerData.days.length, 4, "A day Save must preserve and submit all four days");

assert.equal(
  planner.buildImageFileName("MI Hajira", "2026-08-10", new Date("2026-08-08T12:00:00")),
  "MI-Hajira - 10 Aug - submitted 8 Aug.png"
);

console.log("Weekly Planner frontend data and session-cache tests passed.");

function makeElement() {
  const handlers = new Map();
  return {
    value: "",
    innerHTML: "",
    disabled: false,
    hidden: false,
    readOnly: false,
    attributes: {},
    classList: { toggle() {} },
    setAttribute(name, value) {
      this.attributes[name] = String(value);
    },
    addEventListener(type, handler) {
      handlers.set(type, handler);
    },
    dispatch(type) {
      const handler = handlers.get(type);
      if (handler) handler({ target: this });
    },
    querySelector(selector) {
      if (selector === ".weekly-planner-day-card" && this.innerHTML.includes("weekly-planner-day-card")) {
        return {};
      }
      return null;
    }
  };
}

function plannerWeekMeta(value) {
  const date = value ? new Date(`${value}T12:00:00`) : new Date("2026-07-13T12:00:00");
  const weekStart = date.toISOString().slice(0, 10);
  const end = new Date(date);
  end.setDate(end.getDate() + 3);
  return {
    weekStart,
    weekEnd: end.toISOString().slice(0, 10),
    month: "July 2026"
  };
}
