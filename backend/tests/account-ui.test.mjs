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
assert.match(html, /Switch course or role/);
assert.match(html, /Existing Admin and Student\s+links remain the operational entry points/);
assert.match(html, /m4l-account\.js\?v=102\.3/);
assert.match(html, /m4l-23-account\.css\?v=102\.3/);

for (const endpoint of [
  "/api/account/check",
  "/api/account/setup-pin",
  "/api/account/login",
  "/api/account/session",
  "/api/account/switch-context"
]) {
  assert.ok(script.includes(endpoint), `Account UI must call ${endpoint}`);
}
assert.match(script, /m4l_account_token/);
assert.match(script, /localStorage\.removeItem\(TOKEN_KEY\)/);
assert.match(script, /Authorization: `Bearer \$\{token\}`/);
assert.match(script, /replace\(\/\\D\/g, ""\)\.slice\(0, 4\)/);
assert.doesNotMatch(script, /innerHTML\s*=/, "Account context values must not be injected through innerHTML");
assert.match(css, /@media \(max-width: 760px\)/);
assert.match(css, /prefers-reduced-motion/);
assert.match(redirects, /^\/account\/\*\s+\/account\/\s+200$/m);
assert.match(headers, /^\/account\/\*\n\s+Cache-Control: no-cache$/m);

console.log("V102.3 unified account UI tests passed.");
