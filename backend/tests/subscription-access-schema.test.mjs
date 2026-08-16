import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { PLATFORM_SHEET_HEADERS } from "../src/lib/platform-schema.js";

const read = relativePath => readFileSync(new URL(`../../${relativePath}`, import.meta.url), "utf8");

assert.equal(PLATFORM_SHEET_HEADERS.UserCourseAccess.length, 14);
assert.equal(PLATFORM_SHEET_HEADERS.UserCourseAccess.at(-1), "CourseRecordID");
assert.deepEqual(PLATFORM_SHEET_HEADERS.UserGlobalSubjectAccess, [
  "SubjectAccessID",
  "AccountID",
  "SubjectID",
  "Active",
  "CreatedDate",
  "CreatedByAccountID",
  "CreatedByAccountName",
  "ModifiedByAccountID",
  "ModifiedByAccountName",
  "ModifiedDate"
]);
assert.equal(Object.hasOwn(PLATFORM_SHEET_HEADERS, "TeacherScheduleIndex"), false);
assert.equal(PLATFORM_SHEET_HEADERS.GlobalResources.length, 16);

assert.equal(
  read("docs/V102-UserGlobalSubjectAccess-template.csv").trim(),
  PLATFORM_SHEET_HEADERS.UserGlobalSubjectAccess.join(",")
);
assert.equal(
  read("docs/V102-GlobalResources-template.csv").trim(),
  PLATFORM_SHEET_HEADERS.GlobalResources.join(",")
);
assert.match(read("docs/V102-PlatformConfig-template.csv"), /PlatformSchemaVersion,102\.0\.4/);
assert.equal(
  existsSync(new URL("../../docs/V102-TeacherScheduleIndex-template.csv", import.meta.url)),
  true
);
assert.equal(
  read("docs/V102-TeacherScheduleIndex-template.csv").trim(),
  "IndexEntryID,SourceSessionID,CourseID,TeacherAccountID,DayOfWeek,StartTime,EndTime,TimeZone,Active,SourceModifiedDate,IndexedDate"
);

const migration = read("docs/V102.5-SUBSCRIPTION-ACCESS-SCHEMA.md");
assert.match(migration, /There is no general `UserSubscriptions` tab/);
assert.match(migration, /timetable overlaps/);
assert.match(migration, /Do not rerun central account migration/);
assert.match(migration, /PlatformConfig!B3/);
assert.match(migration, /production/i);

console.log("V102.5 subscription access schema tests passed.");
