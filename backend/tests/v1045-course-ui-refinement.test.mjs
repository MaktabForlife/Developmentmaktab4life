import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const [js, css, checklist] = await Promise.all([
  readFile(new URL("../../js/m4l-global-course-scheduler.js", import.meta.url), "utf8"),
  readFile(new URL("../../css/m4l-28-global-course-scheduler.css", import.meta.url), "utf8"),
  readFile(new URL("../../docs/V104.5.1-IMPLEMENTATION-CHECKLIST.md", import.meta.url), "utf8")
]);

// Course Name remains inline-editable but receives the V104.5.1 coloured-pill treatment.
assert.match(js, /class="global-course-name-pill"[^>]*data-course-field="runname"/);
assert.match(css, /\.global-course-name-pill\s*\{/);
assert.match(css, /background:#ead9f3 !important/);
assert.match(css, /border-radius:999px !important/);

// Schedule and Sessions/Exception are icon + text edit actions; Publish stays visually separate.
assert.match(js, /global-course-action-button is-schedule[^>]*>[\s\S]*?edit-mode-icon[\s\S]*?<span>Schedule<\/span>/);
assert.match(js, /global-course-action-button is-sessions[^>]*>[\s\S]*?edit-mode-icon/);
assert.match(js, /course\.schedulemode === "DERIVED" \? "Exception" : "Sessions"/);
assert.match(css, /\.global-course-action-button\s*\{[\s\S]*?background:#8fc4bf/);
assert.match(css, /\.global-course-publish-inline\s*\{[\s\S]*?background:#8f2149/);
assert.match(css, /\.global-course-action-button\.is-schedule\s*\{\s*grid-column:1;\s*grid-row:1;/);
assert.match(css, /\.global-course-action-button\.is-sessions\s*\{\s*grid-column:1;\s*grid-row:2;/);
assert.match(css, /\.global-course-publish-inline\s*\{[\s\S]*?grid-column:2;[\s\S]*?grid-row:1 \/ span 2;/);

// There is exactly one publishing control in the Course scheduler source: the Course-row button.
assert.equal((js.match(/data-gcm-course-action="publish-course"/g) || []).length, 1);
assert.doesNotMatch(js, /save-publish-sessions/);
assert.doesNotMatch(js, /Save &amp; Publish/);

// Exercise the publish visibility helper directly to guard the eligibility rules.
const publishStart = js.indexOf("function publishRowButton");
const publishEnd = js.indexOf("\n  function scheduleEditor", publishStart);
assert.ok(publishStart >= 0 && publishEnd > publishStart, "publishRowButton helper must be extractable");
const publishSource = js.slice(publishStart, publishEnd).trim();
const publishRowButton = new Function(
  "attr",
  "validPublishWindow",
  `${publishSource}; return publishRowButton;`
)(
  value => String(value ?? ""),
  course => Boolean(course?.publishstart && course?.publishend && course.publishend >= course.publishstart)
);

const savedActiveFixed = {
  key: "RUN1", runid: "RUN1", active: true, type: "FIXED",
  dirty: false, scheduleDirty: false, windowDirty: false
};
assert.match(publishRowButton(savedActiveFixed, { stage: "DEVELOPMENT" }, true), />Publish<\/button>/, "saved unpublished Course is publishable");
assert.match(publishRowButton(savedActiveFixed, { stage: "PUBLISHED" }, true), /disabled[^>]*>Publish<\/button>/, "clean published Course keeps a disabled Publish action visible");
assert.match(publishRowButton({ ...savedActiveFixed, dirty: true }, { stage: "DEVELOPMENT" }, true), /disabled[^>]*>Publish<\/button>/, "unsaved metadata keeps Publish visible but disabled");
assert.match(publishRowButton({ ...savedActiveFixed, scheduleDirty: true }, { stage: "DEVELOPMENT" }, true), /disabled[^>]*>Publish<\/button>/, "unsaved schedule keeps Publish visible but disabled");
assert.match(publishRowButton({ ...savedActiveFixed, active: false }, { stage: "DEVELOPMENT" }, true), /disabled[^>]*>Publish<\/button>/, "inactive saved Course keeps Publish visible but disabled");
assert.equal(publishRowButton({ ...savedActiveFixed, runid: "" }, { stage: "DEVELOPMENT" }, true), "", "unsaved local Course draft is not yet a publishable Course record");
assert.match(publishRowButton(savedActiveFixed, { stage: "DEVELOPMENT" }, false), /disabled[^>]*>Publish<\/button>/, "saved Course without schedule keeps Publish visible but disabled");
assert.match(publishRowButton({ ...savedActiveFixed, type: "ONGOING", publishstart: "", publishend: "" }, { stage: "DEVELOPMENT" }, true), /disabled[^>]*>Publish<\/button>/, "ONGOING Course without window keeps Publish visible but disabled");
assert.match(publishRowButton({ ...savedActiveFixed, type: "ONGOING", publishstart: "2026-09-01", publishend: "2026-09-30" }, { stage: "DEVELOPMENT" }, true), />Publish<\/button>/, "ONGOING Course with valid window can publish");
assert.match(css, /\.global-course-publish-inline:disabled,[\s\S]*?background:#e7d8de/, "disabled Publish must remain visible as a muted berry action");

// Session workspace is preparation-only: a bordered card with exactly Cancel + Save edit actions.
const sessionStart = js.indexOf("function sessionSectionForOpenCourse");
const sessionEnd = js.indexOf("\n  function sessionInlineRow", sessionStart);
assert.ok(sessionStart >= 0 && sessionEnd > sessionStart, "session workspace helper must be extractable");
const sessionSource = js.slice(sessionStart, sessionEnd);
assert.doesNotMatch(sessionSource, /data-gcm-course-action="publish-course"|save-publish-sessions|Save &amp; Publish/, "session workspace must not contain a publish action");
assert.match(sessionSource, /<span>Cancel<\/span>/);
assert.match(sessionSource, /<span>Save<\/span>/);
assert.match(sessionSource, /app-icon-xclose/);
assert.match(sessionSource, /save-mode-icon/);
assert.match(css, /\.global-course-sessions-panel\s*\{[\s\S]*?border:2px solid #8c918d/);
assert.match(css, /\.global-course-session-button\.is-cancel\s*\{[\s\S]*?background:#eef1ee/);
assert.match(css, /\.global-course-session-button\.is-save\s*\{[\s\S]*?background:#357b75/);

// EXPLICIT per-session descriptions remain part of the saved + published lifecycle.
assert.match(js, /data-inline-session-field="description"/);
assert.match(js, /maxlength="400"/);
assert.match(js, /sessionDescription: draft\.description/);
assert.match(checklist, /Platform schema `102\.0\.11`/);
assert.match(checklist, /single, clear publication surface/);

console.log("V104.5.1 Course pills, publish eligibility, session actions and description UI regression passed.");
