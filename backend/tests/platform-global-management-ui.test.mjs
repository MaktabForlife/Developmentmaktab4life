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
assert.match(html, /data-gcm-course-action="show">Course Scheduler<\/button>/);
assert.match(html, /data-gcm-tab="access">Global Access<\/button>/);
assert.match(html, /m4l-global-curriculum\.js\?v=102\.11\.1/);
assert.doesNotMatch(html, />Platform administration</);
assert.doesNotMatch(html, /Changes apply across the platform and are recorded in PlatformAuditLog/);

assert.match(script, /platformrole/);
assert.match(script, /ADMIN and GLOBAL_ADMIN/);
assert.match(script, /\/api\/admin\/platform\/global\/get/);
assert.match(script, /\/api\/admin\/platform\/global\/access\/save/);
assert.match(script, /subjectAccessMatrix/);
assert.match(script, /data-gcm-access-toggle/);
assert.match(script, /global-access-policy-token/);
assert.match(script, /policy === "FREE" \? "FREE" : "PAID"/);
assert.match(script, /global-access-free-state/);
assert.doesNotMatch(script, /One row per central account\. FREE subjects are implicit/);
assert.doesNotMatch(script, /Changing a FREE subject to SUBSCRIPTION reuses/);
assert.match(script, /classList\.remove\("is-active"\)/, "Changing tabs must clear the previous active highlight");
assert.match(script, /M4LGlobalCurriculum = Object\.freeze\(\{[\s\S]*invalidate/);
assert.match(academics, /M4LGlobalCurriculum\.syncAccess/);

assert.match(styles, /m4l-24-global-curriculum\.css\?v=102\.11\.1/);
assert.match(css, /\.global-access-matrix/);
assert.match(css, /\.global-access-policy-token/);
assert.match(css, /\.global-access-free-state/);

console.log("V102.11.1 Global Access and Global Curriculum UI tests passed.");
