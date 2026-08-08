import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const adminHtml = readFileSync(new URL("../../admin/index.html", import.meta.url), "utf8");
const academicsJs = readFileSync(new URL("../../js/m4l-admin-academics.js", import.meta.url), "utf8");
const shellJs = readFileSync(new URL("../../js/m4l-shell.js", import.meta.url), "utf8");
const homeCss = readFileSync(new URL("../../css/m4l-02-home-common-and-shared-cards.css", import.meta.url), "utf8");

const landingMatch = adminHtml.match(
  /<!-- ADMIN MENU HOME -->([\s\S]*?)<!-- ADMIN SYSTEM MENU -->/
);
assert.ok(landingMatch, "Admin menu landing page must exist");
const landing = landingMatch[1];

assert.match(landing, /id="admin-academics"/);
assert.match(landing, /admin-menu-icon-grid/);
assert.match(landing, />Student Records</);
assert.match(landing, />Admin Records</);
assert.match(landing, />Resources</);
assert.match(landing, />System Settings</);
assert.doesNotMatch(landing, /class="list-stack"/);
assert.doesNotMatch(landing, />Curriculum</);
assert.doesNotMatch(landing, />Weekly Planner</);
assert.doesNotMatch(landing, />Tasks</);
assert.match(landing, /studentrecords\.svg\?v=100\.7/);
assert.match(landing, /admin\.svg\?v=100\.7/);
assert.match(landing, /resources\.svg\?v=100\.7/);
assert.match(landing, /systemsettings\.svg\?v=100\.7/);

assert.match(adminHtml, /id="admin-system-menu"[\s\S]*?>Zoom Link<[\s\S]*?>System Settings</);
assert.match(adminHtml, /id="system-settings-screen"[\s\S]*?data-header-target="admin-system-menu"/);
assert.match(adminHtml, /id="admin-timetable-admin-screen"[\s\S]*?showScreen\('admin-system-menu'\)/);

assert.match(academicsJs, /function showAdminSystemMenu\(\)/);
assert.match(academicsJs, /getAdminAcademicsRole\(\) === "ADMIN"/);
assert.match(academicsJs, /data-admin-menu-admin-only/);
assert.match(homeCss, /\.admin-menu-icon-grid/);
assert.match(homeCss, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
assert.match(shellJs, /"admin-system-menu"/);

assert.equal(existsSync(new URL("../../icons/studentrecords.svg", import.meta.url)), true);
assert.equal(existsSync(new URL("../../icons/systemsettings.svg", import.meta.url)), true);

console.log("Admin menu Home integration tests passed.");
