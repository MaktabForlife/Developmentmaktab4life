import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adminHtml = readFileSync(new URL("../../admin/index.html", import.meta.url), "utf8");
const attendanceJs = readFileSync(new URL("../../js/m4l-attendance.js", import.meta.url), "utf8");

assert.match(
  adminHtml,
  /<script src="\/js\/m4l-attendance\.js\?v=97\.1\.5\.5"><\/script>/,
  "Admin must load the attendance reset carry-forward asset version"
);

const successBlock = attendanceJs.match(
  /if \(!result \|\| !result\.success\)[\s\S]*?alert\(`Attendance saved successfully\.[\s\S]*?\);/
)?.[0] || "";

assert.ok(successBlock, "Attendance successful-save block must be present");
assert.match(
  successBlock,
  /attendanceStudentsCache\.forEach\(student => \{[\s\S]*?attendanceState\[student\.studentid\] = "Present";[\s\S]*?\}\);/,
  "Successful attendance save must reset cached student state to Present"
);
assert.match(
  successBlock,
  /renderAttendanceRegister\(dateValue\);/,
  "Successful attendance save must rerender the reset register"
);

const failureBlock = attendanceJs.match(
  /if \(!result \|\| !result\.success\) \{[\s\S]*?return;[\s\S]*?\}/
)?.[0] || "";
assert.ok(failureBlock, "Attendance failed-save block must be present");
assert.doesNotMatch(
  failureBlock,
  /attendanceState\[student\.studentid\] = "Present"/,
  "Failed attendance save must not reset the local register"
);

console.log("Attendance successful-save reset carry-forward tests passed.");
