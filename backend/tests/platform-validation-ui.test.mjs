import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adminHtml = readFileSync(new URL("../../admin/index.html", import.meta.url), "utf8");
const settingsJs = readFileSync(new URL("../../js/m4l-system-settings.js", import.meta.url), "utf8");
const settingsCss = readFileSync(new URL("../../css/m4l-18-system-settings.css", import.meta.url), "utf8");

assert.match(adminHtml, /id="system-settings-platform-heading"[^>]*>Platform Sheet</);
assert.match(adminHtml, /data-system-settings-action="validate-platform"/);
assert.match(adminHtml, /id="system-settings-platform-status"/);
assert.match(adminHtml, /data-system-settings-action="preview-account-migration"/);
assert.match(adminHtml, /data-system-settings-action="commit-account-migration"/);
assert.match(adminHtml, /id="system-settings-grant-global-admin"[^>]*checked/);
assert.match(adminHtml, /id="system-settings-migration-confirm"/);
assert.match(adminHtml, /m4l-system-settings\.js\?v=102\.10/);

assert.match(settingsJs, /async function validatePlatformSheet\(\)/);
assert.match(settingsJs, /"\/api\/admin\/platform\/validate"/);
assert.match(settingsJs, /action === "validate-platform"/);
assert.match(settingsJs, /readyForUnifiedLogin/);
assert.match(settingsJs, /globalSubjectAccessCount/);
assert.match(settingsJs, /globalSubjectCount/);
assert.match(settingsJs, /global subject/);
assert.match(settingsJs, /required tabs/);
assert.match(settingsJs, /async function previewAccountMigration\(\)/);
assert.match(settingsJs, /async function commitAccountMigration\(\)/);
assert.match(settingsJs, /"\/api\/admin\/platform\/accounts\/migrate"/);
assert.match(settingsJs, /action: "PREVIEW"/);
assert.match(settingsJs, /action: "COMMIT"/);
assert.match(settingsJs, /previewToken: accountMigrationPreview\.previewToken/);
assert.equal(settingsJs.includes("SpreadsheetID"), false);
assert.equal(settingsJs.includes("PLATFORM_SPREADSHEET_ID"), false);

assert.match(settingsCss, /\.system-settings-validate/);
assert.match(settingsCss, /\.system-settings-platform-status\[data-kind="error"\]/);
assert.match(settingsCss, /\.system-settings-migration-summary/);
assert.match(settingsCss, /\.system-settings-migrate/);

console.log("Platform Sheet validation UI integration tests passed.");
