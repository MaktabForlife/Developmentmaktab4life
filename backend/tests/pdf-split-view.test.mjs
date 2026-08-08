import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = file => fs.readFileSync(path.join(repoRoot, file), "utf8");

const adminHtml = read("admin/index.html");
const studentHtml = read("student/index.html");
const resources = read("js/m4l-resources.js");
const shell = read("js/m4l-shell.js");
const teachingPanel = read("js/m4l-teaching-panel.js");
const splitCss = read("css/m4l-19-pdf-split-view.css");
const styles = read("styles.css");

assert.match(adminHtml, /id="pdf-split-toggle"/);
assert.match(adminHtml, /id="pdf-viewer-frame-secondary"/);
assert.match(adminHtml, /id="m4l-pdf-split-divider"/);
assert.doesNotMatch(studentHtml, /pdf-viewer-frame-secondary/);

assert.match(splitCss, /@media \(min-width: 1024px\)/);
assert.match(splitCss, /\.pdf-split-toggle \{\s*display: none;/);
assert.match(splitCss, /grid-template-columns:[^;]*var\(--m4l-pdf-primary-width\)/);
assert.match(styles, /m4l-19-pdf-split-view\.css\?v=99\.1/);

assert.match(resources, /const PDF_SPLIT_MIN_WIDTH = 1024;/);
assert.match(resources, /function chooseSecondaryPdf\(\)/);
assert.match(resources, /function loadSecondaryPdfResource\(resource\)/);
assert.match(resources, /getDomElement\("pdf-viewer-frame-secondary"\)/);
assert.match(resources, /window\.M4LTeachingPanel\?\.close\?\.\(\);/);
assert.match(resources, /preserveSecondary: true/);
assert.match(resources, /window\.M4LPdfSplitView = Object\.freeze/);
assert.match(resources, /viewerFrame\.src = viewerUrl;/);

assert.match(teachingPanel, /M4LPdfSplitView\?\.suspendForTeachingPanel/);
assert.match(shell, /\["pdf-viewer-frame", "pdf-viewer-frame-secondary"\]/);
assert.match(shell, /M4LPdfSplitView\?\.reset/);
assert.match(adminHtml, /m4l-resources\.js\?v=100\.4\.1/);
assert.match(adminHtml, /m4l-teaching-panel\.js\?v=99\.1/);

console.log("PDF split-view V99.1 structure and integration checks passed.");
