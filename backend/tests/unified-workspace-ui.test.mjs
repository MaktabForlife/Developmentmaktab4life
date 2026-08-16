import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = relative => readFileSync(new URL(relative, import.meta.url), "utf8");
const app = read("../../app.js");
const auth = read("../../js/m4l-auth.js");
const shell = read("../../js/m4l-shell.js");
const cache = read("../../js/m4l-cache.js");
const timetable = read("../../js/m4l-timetable.js");
const progress = read("../../js/m4l-progress.js");
const adminHtml = read("../../admin/index.html");
const studentHtml = read("../../student/index.html");

assert.match(app, /async function initApp\(\)/);
assert.match(app, /await restoreUnifiedWorkspaceIfPresent\(route\)/);
assert.match(app, /getM4LCourseCacheScope/);
assert.match(auth, /\/api\/account\/workspace/);
assert.match(auth, /\/api\/account\/global-workspace/);
assert.match(auth, /restoreUnifiedAccountWorkspace/);
assert.match(auth, /switchUnifiedAccountContext/);
assert.match(auth, /refreshUnifiedAccountProfile/);
assert.match(auth, /m4l_account_workspace/);
assert.match(shell, /Switch course or role/);
assert.match(shell, /data-app-menu-action="profile"/);
assert.match(shell, /data-user-profile-context/);
assert.doesNotMatch(shell, /action: "switch-context"/);
assert.match(shell, /switchUnifiedAccountContext/);

for (const source of [cache, timetable, progress]) {
  assert.match(source, /getM4LCourseCacheScope/);
}
assert.match(cache, /m4l_app_cache_v102_4/);
assert.match(progress, /m4l_admin_progress_dashboard_v102_4/);

for (const html of [adminHtml, studentHtml]) {
  assert.match(html, /\/app\.js\?v=102\.4/);
  assert.match(html, /\/js\/m4l-cache\.js\?v=102\.4/);
  assert.match(html, /\/js\/m4l-auth\.js\?v=102\.9/);
  assert.match(html, /\/js\/m4l-shell\.js\?v=102\.8/);
  assert.match(html, /\/js\/m4l-timetable\.js\?v=102\.9/);
  assert.match(html, /\/js\/m4l-progress\.js\?v=102\.4/);
}

console.log("V102.8 unified operational workspace UI tests passed.");
