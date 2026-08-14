import assert from "node:assert/strict";
import {
  ADMIN_AUDIT_LOG_HEADERS,
  buildAdminAuditActor,
  columnIndexToA1,
  getRequiredRowAuditColumns,
  stampCreatedRow,
  stampModifiedRow
} from "../src/lib/admin-audit.js";

assert.deepEqual(ADMIN_AUDIT_LOG_HEADERS, [
  "AuditID",
  "DateStamp",
  "AdminID",
  "AdminName",
  "Role",
  "Action",
  "RecordType",
  "RecordID",
  "ChangedFields"
]);

const actorResult = buildAdminAuditActor({
  adminid: " ADMIN1 ",
  username: " Admin User ",
  role: "admin"
});
assert.equal(actorResult.ok, true);
assert.deepEqual(actorResult.actor, {
  adminid: "ADMIN1",
  adminname: "Admin User",
  role: "ADMIN"
});
assert.equal(buildAdminAuditActor({ adminid: "ADMIN1" }).ok, false);

const headers = [
  "RecordID",
  "CreatedByAdminID",
  "CreatedByAdminName",
  "AssignedDate",
  "ModifiedByAdminID",
  "ModifiedByAdminName",
  "ModifiedDate"
];
const columns = getRequiredRowAuditColumns(headers);
assert.equal(columns.ok, true, "AssignedDate must be accepted as the creation timestamp");

const created = stampCreatedRow(
  new Array(headers.length).fill(""),
  columns.columns,
  actorResult.actor,
  "2026-08-12T10:00:00.000Z"
);
assert.deepEqual(created.slice(1), [
  "ADMIN1",
  "Admin User",
  "2026-08-12T10:00:00.000Z",
  "",
  "",
  ""
]);

const modified = stampModifiedRow(
  created.slice(),
  columns.columns,
  { adminid: "SENIOR2", adminname: "Senior User", role: "SENIOR" },
  "2026-08-12T11:00:00.000Z"
);
assert.equal(modified[1], "ADMIN1", "Creation identity must be preserved on update");
assert.equal(modified[2], "Admin User", "Creation name must be preserved on update");
assert.equal(modified[4], "SENIOR2");
assert.equal(modified[5], "Senior User");
assert.equal(modified[6], "2026-08-12T11:00:00.000Z");

assert.equal(getRequiredRowAuditColumns(["CreatedDate"]).ok, false);
assert.equal(columnIndexToA1(0), "A");
assert.equal(columnIndexToA1(25), "Z");
assert.equal(columnIndexToA1(26), "AA");

console.log("Admin audit helper tests passed.");
