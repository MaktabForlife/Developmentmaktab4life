import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../../account/index.html", import.meta.url), "utf8");
const css = readFileSync(new URL("../../css/m4l-23-account.css", import.meta.url), "utf8");
const script = readFileSync(new URL("../../js/m4l-account.js", import.meta.url), "utf8");
const redirects = readFileSync(new URL("../../_redirects", import.meta.url), "utf8");
const headers = readFileSync(new URL("../../_headers", import.meta.url), "utf8");

assert.match(html, /id="login-form"/);
assert.match(html, /id="setup-form"/);
assert.match(html, /id="context-view"/);
assert.match(html, /id="context-list"/);
assert.match(html, /id="open-workspace-button"/);
assert.match(html, /Switch program or role/);
assert.match(html, /m4l-account\.js\?v=102\.12\.1/);
assert.match(html, /m4l-23-account\.css\?v=102\.12\.1/);

for (const endpoint of [
  "/api/account/check",
  "/api/account/setup-pin",
  "/api/account/login",
  "/api/account/session",
  "/api/account/switch-context",
  "/api/account/workspace",
  "/api/account/global-workspace",
  "/api/academy/timetable"
]) {
  assert.ok(script.includes(endpoint), `Account UI must call ${endpoint}`);
}
assert.match(script, /m4l_account_token/);
assert.match(script, /m4l_account_contexts/);
assert.match(script, /maktab_token/);
assert.match(script, /window\.location\.assign\(path\)/);
assert.match(html, /id="academy-timetable"/);
assert.match(html, /Academy timetable/);
assert.match(script, /loadAcademyTimetable/);
assert.match(script, /formatAcademyTimeRange/);
assert.match(script, /\$\{String\(Number\(match\[1\]\)\)\.padStart\(2, "0"\)\}h\$\{match\[2\]\}/);
assert.match(script, /clearCourseDataCaches/);
assert.match(script, /localStorage\.removeItem\(TOKEN_KEY\)/);
assert.match(script, /Authorization: `Bearer \$\{token\}`/);
assert.match(script, /replace\(\/\\D\/g, ""\)\.slice\(0, 4\)/);
assert.match(script, /byId\("login-pin"\)\.value = ""/);
assert.match(script, /const form = event\.currentTarget;[\s\S]*?setBusy\(form, true\)/);
assert.match(script, /setBusy\(form, false\);[\s\S]*?if \(loginFailed\)[\s\S]*?byId\("login-pin"\)\.focus\(\)/);
assert.doesNotMatch(script, /setBusy\(event\.currentTarget, false\)/);
assert.match(script, /if \(normalized === "SENIOR"\) return "SENIOR TEACHER"/);
assert.doesNotMatch(script, /innerHTML\s*=/, "Account context values must not be injected through innerHTML");
assert.match(css, /@media \(max-width: 760px\)/);
assert.match(css, /prefers-reduced-motion/);
assert.match(redirects, /^\/account\/\*\s+\/account\/\s+200$/m);
assert.match(headers, /^\/account\/\*\n\s+Cache-Control: no-cache$/m);

console.log("V102.12 Academy timetable Home and unified account UI tests passed.");
