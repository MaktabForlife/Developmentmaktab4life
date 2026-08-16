import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = relative => readFileSync(new URL(relative, import.meta.url), "utf8");
const resources = read("../../js/m4l-resources.js");
const styles = read("../../css/m4l-04-library-resources.css");
const admin = read("../../admin/index.html");
const student = read("../../student/index.html");

for (const html of [admin, student]) {
  assert.match(html, /id="library-source-selector"/);
  assert.match(html, /m4l-resources\.js\?v=102\.8/);
  assert.match(html, /styles\.css\?v=102\.8/);
}

assert.match(resources, /\/api\/library\/catalogue/);
assert.match(resources, /\/api\/library\/course-resource\/access/);
assert.match(resources, /\/api\/platform\/global\/resources\/access/);
assert.match(resources, /function renderLibrarySourceSelector/);
assert.match(resources, /function buildSelectedLibraryCatalogue/);
assert.match(resources, /selectedLibrarySourceId = "ALL"/);
assert.match(resources, /data-library-source-id/);
assert.match(resources, /library-global-badge/);
assert.doesNotMatch(
  resources.slice(resources.indexOf("function selectLibrarySource"), resources.indexOf("function buildSelectedLibraryCatalogue")),
  /switch-context|switchUnifiedAccountContext/,
  "Selecting a Library source must not change the operational course or role"
);
assert.match(styles, /\.library-source-menu/);
assert.match(styles, /\.library-source-menu__item\.is-active/);
assert.match(styles, /\.library-global-badge/);

console.log("V102.8 unified Library source-selector UI tests passed.");
