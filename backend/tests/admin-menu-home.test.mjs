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
assert.match(landing, /data-cover-home-nav="home"/);
assert.match(landing, /data-cover-home-role="admin"/);
assert.match(landing, />Home</);
assert.match(landing, /class="home-cover-icon-btn is-home-active"/);
assert.match(landing, /onclick="showAdminAcademics\(\)"/);
assert.match(landing, /aria-current="page"/);
assert.match(landing, />Admin Home</);
assert.match(landing, />Student Records</);
assert.match(landing, /id="open-manage-students-btn"/);
assert.match(landing, /data-student-records-admin/);
assert.match(landing, />Admin Records</);
assert.match(landing, />Resources</);
assert.match(landing, />Timetable Builder</);
assert.match(landing, />Global Curriculum</);
assert.match(landing, />System Settings</);
assert.doesNotMatch(landing, /class="list-stack"/);
assert.doesNotMatch(landing, />Curriculum</);
assert.doesNotMatch(landing, />Weekly Planner</);
assert.doesNotMatch(landing, />Tasks</);
assert.equal((landing.match(/class="home-cover-icon-btn/g) || []).length, 8);
assert.match(landing, /studentrecords\.svg\?v=100\.7\.2/);
assert.match(landing, /admin\.svg\?v=100\.7\.2/);
assert.match(landing, /resources\.svg\?v=100\.7\.2/);
assert.match(landing, /timetable\.svg\?v=101\.4/);
assert.match(landing, /systemsettings\.svg\?v=100\.7\.2/);

assert.match(adminHtml, /id="admin-system-menu"[\s\S]*?>System Settings</);
assert.doesNotMatch(adminHtml, /showAdminZoomLinkAdmin/);
assert.match(adminHtml, /id="system-settings-screen"[\s\S]*?data-header-target="admin-academics"/);
assert.match(adminHtml, /id="system-settings-global-zoom-link"/);
assert.doesNotMatch(adminHtml, /id="admin-timetable-admin-screen"/);
assert.doesNotMatch(adminHtml, /id="admin-system-menu"[\s\S]*?<button[^>]*>Back<\/button>[\s\S]*?<!-- ADMIN SYSTEM SETTINGS -->/);
assert.match(adminHtml, /id="manage-resources-screen"[\s\S]*?data-header-target="admin-academics"[\s\S]*?app-icon-xclose/);
assert.match(adminHtml, /id="manage-admins-screen"[\s\S]*?data-header-target="admin-academics"[\s\S]*?app-icon-xclose/);
assert.match(adminHtml, /id="manage-students-screen"[\s\S]*?data-header-target="admin-academics"[\s\S]*?app-icon-xclose/);

assert.match(academicsJs, /function showAdminSystemMenu\(\)/);
assert.match(academicsJs, /getAdminAcademicsRole\(\) === "ADMIN"/);
assert.match(academicsJs, /data-admin-menu-admin-only/);
assert.match(academicsJs, /data-student-records-admin/);
assert.match(academicsJs, /function syncAdminLandingLayout\(\)/);
assert.match(academicsJs, /--admin-menu-visible-columns/);
assert.match(homeCss, /\.admin-menu-icon-grid/);
assert.match(homeCss, /\.home-cover-icon-btn\.hidden,[\s\S]*?\.home-cover-icon-btn\[aria-hidden="true"\][\s\S]*?display: none !important/);
assert.match(homeCss, /grid-template-columns: repeat\(var\(--admin-menu-visible-columns, 8\), minmax\(0, 1fr\)\)/);
assert.match(shellJs, /if \(normalized === "SENIOR"\) return "SENIOR TEACHER"/);
assert.match(shellJs, /"admin-system-menu"/);

assert.equal(existsSync(new URL("../../icons/studentrecords.svg", import.meta.url)), true);
assert.equal(existsSync(new URL("../../icons/systemsettings.svg", import.meta.url)), true);

console.log("Admin menu Home integration tests passed.");
