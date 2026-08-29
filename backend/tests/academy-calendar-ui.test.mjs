import assert from "node:assert/strict";
import fs from "node:fs";

const admin = fs.readFileSync(new URL("../../admin/index.html", import.meta.url), "utf8");
const ui = fs.readFileSync(new URL("../../js/m4l-academy-calendar.js", import.meta.url), "utf8");
const css = fs.readFileSync(new URL("../../css/m4l-29-academy-calendar.css", import.meta.url), "utf8");
const account = fs.readFileSync(new URL("../../account/index.html", import.meta.url), "utf8");
const accountUi = fs.readFileSync(new URL("../../js/m4l-account.js", import.meta.url), "utf8");

assert.match(admin, /Academy Calendar/);
assert.match(admin, /data-academy-calendar-action="open"/);
assert.match(admin, /m4l-academy-calendar\.js\?v=102\.12\.2/);
assert.match(ui, /Public Holidays/);
assert.match(ui, /Islamic Dates/);
assert.match(ui, /data-academy-calendar-action="add-term"/);
assert.match(ui, /data-academy-calendar-action="add-public"/);
assert.match(ui, /delete-public/);
assert.match(ui, /save-term/);
assert.match(ui, /save-islamic/);
assert.match(ui, /save-public/);
assert.match(ui, /event\.description !== "First Fast"/);
assert.match(ui, /event\.islamicDate/);
assert.match(ui, /\/api\/admin\/platform\/calendar\/get/);
assert.match(ui, /\/api\/admin\/platform\/calendar\/save/);
assert.match(css, /academy-calendar-reference-grid/);
assert.match(css, /grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
assert.match(ui, /academy-calendar-terms/);
assert.match(account, /academy-week-context/);
assert.match(accountUi, /academy-calendar-day-badges/);
assert.match(accountUi, /event\.islamicDate/);
assert.match(accountUi, /RELIGIOUS_PERIOD/);

console.log("V102.12.2 Academy Calendar inline Admin layout and Academy Home Islamic-date UI tests passed.");
