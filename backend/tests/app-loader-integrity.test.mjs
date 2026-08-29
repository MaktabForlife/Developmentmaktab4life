import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");

const appPath = path.join(root, "app.js");
assert.equal(fs.existsSync(appPath), true, "root app.js must exist for Program workspaces");
assert.ok(fs.statSync(appPath).size > 1000, "root app.js must not be empty/truncated");

for (const rel of ["index.html", "admin/index.html", "student/index.html"]) {
  const html = fs.readFileSync(path.join(root, rel), "utf8");
  assert.match(html, /<script src="\/app\.js\?v=102\.12\.4"><\/script>/, `${rel} must load the current app.js asset`);
}

console.log("app-loader-integrity.test.mjs: PASS");
