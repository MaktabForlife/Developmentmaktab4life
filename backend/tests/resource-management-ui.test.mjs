import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adminHtml = readFileSync(new URL("../../admin/index.html", import.meta.url), "utf8");
const studentHtml = readFileSync(new URL("../../student/index.html", import.meta.url), "utf8");
const manageJs = readFileSync(new URL("../../js/m4l-manage-resources.js", import.meta.url), "utf8");
const resourcesJs = readFileSync(new URL("../../js/m4l-resources.js", import.meta.url), "utf8");
const styles = readFileSync(new URL("../../styles.css", import.meta.url), "utf8");
const css = readFileSync(new URL("../../css/m4l-21-manage-resources.css", import.meta.url), "utf8");

assert.match(adminHtml, /id="open-manage-resources-btn"/);
assert.match(adminHtml, /id="manage-resources-screen"/);
assert.match(adminHtml, /id="manage-resources-content"/);
assert.match(adminHtml, /m4l-manage-resources\.js\?v=100\.4\.0/);
assert.match(adminHtml, /m4l-resources\.js\?v=100\.4\.1/);
assert.match(studentHtml, /m4l-resources\.js\?v=100\.4\.1/);
assert.match(manageJs, /getCurrentRole\(\) === "ADMIN"/);
assert.match(manageJs, /\/api\/admin\/drive\/browse/);
assert.match(manageJs, /\/api\/admin\/resources\/create/);
assert.match(manageJs, /\/api\/admin\/resources\/manage-list/);
assert.match(manageJs, /\/api\/admin\/resources\/update/);
assert.match(manageJs, /Browse Shared Google Folder/);
assert.match(manageJs, /Add Another Resource/);
assert.match(manageJs, /data-resource-type=/);
assert.match(manageJs, /data-resource-id=/);
assert.match(resourcesJs, /\/api\/library\/drive\/access/);
assert.match(resourcesJs, /resolveLibraryResourceLink/);
assert.match(resourcesJs, /invalidateLibraryResourceCache/);
assert.match(styles, /m4l-21-manage-resources\.css\?v=100\.4\.0/);
assert.match(css, /manage-drive-breadcrumbs/);
assert.match(css, /managed-resource-row/);

console.log("Resource management UI integration tests passed.");
