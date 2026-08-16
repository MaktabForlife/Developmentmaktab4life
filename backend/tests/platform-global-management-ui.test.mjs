import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = relativePath => readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");
const html = read("admin/index.html");
const script = read("js/m4l-global-curriculum.js");
const academics = read("js/m4l-admin-academics.js");
const css = read("css/m4l-24-global-curriculum.css");
const styles = read("styles.css");

assert.match(html, /id="open-global-curriculum-btn"/);
assert.match(html, /data-global-curriculum-admin/);
assert.match(html, /id="global-curriculum-screen"/);
assert.match(html, /data-gcm-tab="subjects"/);
assert.match(html, /data-gcm-tab="modules"/);
assert.match(html, /data-gcm-tab="tasks"/);
assert.match(html, /data-gcm-tab="resources"/);
assert.match(html, /data-gcm-tab="access"/);
assert.match(html, /m4l-global-curriculum\.js\?v=102\.6\.1/);

assert.match(script, /platformrole/);
assert.match(script, /ADMIN and GLOBAL_ADMIN/);
assert.match(script, /\/api\/admin\/platform\/global\/get/);
assert.match(script, /\/api\/admin\/platform\/global\/subject\/save/);
assert.match(script, /\/api\/admin\/platform\/global\/module\/save/);
assert.match(script, /\/api\/admin\/platform\/global\/task\/save/);
assert.match(script, /\/api\/admin\/platform\/global\/resource\/save/);
assert.match(script, /\/api\/admin\/platform\/global\/access\/save/);
assert.match(script, /does not duplicate a course Student subscription/);
assert.match(academics, /M4LGlobalCurriculum\.syncAccess/);

assert.match(styles, /m4l-24-global-curriculum\.css\?v=102\.6\.1/);
assert.match(css, /\.global-curriculum-management-grid/);
assert.match(css, /#global-curriculum-screen\.active/);
assert.match(css, /\.global-curriculum-tabs button\s*\{[\s\S]*?flex:\s*1 0 120px;[\s\S]*?width:\s*auto;/);
assert.match(css, /\.global-curriculum-panel-heading > button,[\s\S]*?width:\s*auto;/);

console.log("V102.6.1 platform global curriculum management UI tests passed.");
