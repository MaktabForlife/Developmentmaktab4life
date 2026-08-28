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
assert.match(html, /V102\.11\.1 provides Program and Global Course scheduling foundations with central access controls/);
assert.match(html, /Switch program or role directly from Profile without entering another PIN/);
assert.match(html, /m4l-account\.js\?v=102\.11\.1/);
assert.match(html, /m4l-23-account\.css\?v=102\.4/);

for (const endpoint of [
  "/api/account/check",
  "/api/account/setup-pin",
  "/api/account/login",
  "/api/account/session",
  "/api/account/switch-context",
  "/api/account/workspace",
  "/api/account/global-workspace"
]) {
  assert.ok(script.includes(endpoint), `Account UI must call ${endpoint}`);
}
assert.match(script, /m4l_account_token/);
assert.match(script, /m4l_account_contexts/);
assert.match(script, /maktab_token/);
assert.match(script, /window\.location\.assign\(path\)/);
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

console.log("V102.11.1 unified account UI terminology and compatibility tests passed.");
