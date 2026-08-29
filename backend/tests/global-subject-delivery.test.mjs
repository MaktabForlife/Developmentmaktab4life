import assert from "node:assert/strict";
import {
  accessibleGlobalSubjectIds,
  canAccountAccessGlobalSubject,
  dateInTimezone,
  deriveGlobalSubjectRunStatus,
  isValidIanaTimezone,
  isOngoingGlobalSubjectRun,
  mapGlobalSubjectRun,
  resolveGlobalSubjectAccessPolicy,
  strongestGlobalSubjectDeliveryStatus,
  validateIsoDate
} from "../src/lib/global-subject-delivery.js";

const account = { AccountID: "ACCOUNT1", Active: true };
const freeSubject = { SubjectID: "FREE1", Active: true };
const paidSubject = { SubjectID: "PAID1", Active: true };
const policies = [
  { SubjectPolicyID: "GSPOL-FREE", SubjectID: "FREE1", AccessModel: "FREE", Active: true },
  { SubjectPolicyID: "GSPOL-PAID", SubjectID: "PAID1", AccessModel: "SUBSCRIPTION", Active: true }
];
const accessRows = [
  { AccountID: "ACCOUNT1", _subjectAccess: { PAID1: true, FREE1: false } }
];

assert.deepEqual(resolveGlobalSubjectAccessPolicy([], "FREE1"), {
  subjectId: "FREE1",
  accessModel: "SUBSCRIPTION",
  configured: false,
  valid: false,
  reason: "MISSING_OR_INACTIVE_POLICY"
});
assert.equal(resolveGlobalSubjectAccessPolicy(policies, "free1").accessModel, "FREE");
assert.equal(resolveGlobalSubjectAccessPolicy([
  ...policies,
  { SubjectPolicyID: "GSPOL-FREE-2", SubjectID: "FREE1", AccessModel: "SUBSCRIPTION", Active: true }
], "FREE1").reason, "DUPLICATE_ACTIVE_POLICY");
assert.equal(resolveGlobalSubjectAccessPolicy([
  { SubjectPolicyID: "GSPOL-BAD", SubjectID: "FREE1", AccessModel: "PUBLIC", Active: true }
], "FREE1").accessModel, "SUBSCRIPTION");

assert.equal(canAccountAccessGlobalSubject({ account, subject: freeSubject, policyRows: policies, accessRows: [] }), true);
assert.equal(canAccountAccessGlobalSubject({ account, subject: paidSubject, policyRows: policies, accessRows: [] }), false);
assert.equal(canAccountAccessGlobalSubject({ account, subject: paidSubject, policyRows: policies, accessRows }), true);
assert.equal(canAccountAccessGlobalSubject({ account: { ...account, Active: false }, subject: freeSubject, policyRows: policies, accessRows }), false);
assert.equal(canAccountAccessGlobalSubject({ account, subject: { ...freeSubject, Active: false }, policyRows: policies, accessRows }), false);
assert.deepEqual([...accessibleGlobalSubjectIds({
  account,
  subjects: [freeSubject, paidSubject],
  policyRows: policies,
  accessRows
})].sort(), ["FREE1", "PAID1"]);

assert.equal(validateIsoDate("2026-08-17"), true);
assert.equal(validateIsoDate("2026-02-29"), false);
assert.equal(validateIsoDate("2024-02-29"), true);
assert.equal(validateIsoDate("17-08-2026"), false);
assert.equal(isValidIanaTimezone("Africa/Johannesburg"), true);
assert.equal(isValidIanaTimezone("Not/A_Zone"), false);
assert.equal(dateInTimezone(new Date("2026-08-16T22:30:00.000Z"), "Africa/Johannesburg"), "2026-08-17");

const baseRun = {
  RunID: "GSRUN1",
  SubjectID: "FREE1",
  RunName: "August run",
  StartDate: "2026-08-17",
  EndDate: "2026-08-20",
  Timezone: "Africa/Johannesburg",
  Active: true
};
assert.equal(deriveGlobalSubjectRunStatus(baseRun, new Date("2026-08-16T20:00:00.000Z")), "UPCOMING");
assert.equal(deriveGlobalSubjectRunStatus(baseRun, new Date("2026-08-16T22:30:00.000Z")), "CURRENT", "Start date is inclusive in the run timezone");
assert.equal(deriveGlobalSubjectRunStatus(baseRun, new Date("2026-08-20T20:00:00.000Z")), "CURRENT", "End date is inclusive in the run timezone");
assert.equal(deriveGlobalSubjectRunStatus(baseRun, new Date("2026-08-20T22:30:00.000Z")), "ENDED");
assert.equal(deriveGlobalSubjectRunStatus({ ...baseRun, Active: false }, new Date("2026-08-18T00:00:00.000Z")), "INACTIVE");
assert.throws(() => deriveGlobalSubjectRunStatus({ ...baseRun, EndDate: "2026-08-01" }), /invalid dates/);
assert.throws(() => deriveGlobalSubjectRunStatus({ ...baseRun, Timezone: "Bad/Timezone" }), /timezone is invalid/);

const ongoingRun = {
  ...baseRun,
  RunID: "ONGOING",
  RunName: "Ongoing course",
  StartDate: "",
  EndDate: ""
};
assert.equal(isOngoingGlobalSubjectRun(ongoingRun), true);
assert.equal(isOngoingGlobalSubjectRun(baseRun), false);
assert.equal(deriveGlobalSubjectRunStatus(ongoingRun, new Date("2026-08-17T10:00:00.000Z")), "CURRENT");
assert.throws(() => deriveGlobalSubjectRunStatus({ ...ongoingRun, StartDate: "2026-08-01" }), /invalid dates/);

const now = new Date("2026-08-17T10:00:00.000Z");
const ended = { ...baseRun, RunID: "ENDED", StartDate: "2026-07-01", EndDate: "2026-07-31" };
const upcoming = { ...baseRun, RunID: "UPCOMING", StartDate: "2026-09-01", EndDate: "2026-09-30" };
assert.equal(strongestGlobalSubjectDeliveryStatus([], "FREE1", now), "NOT SCHEDULED");
assert.equal(strongestGlobalSubjectDeliveryStatus([ended], "FREE1", now), "PAST");
assert.equal(strongestGlobalSubjectDeliveryStatus([ended, upcoming], "FREE1", now), "UPCOMING");
assert.equal(strongestGlobalSubjectDeliveryStatus([ended, upcoming, baseRun], "FREE1", now), "CURRENT");
assert.equal(strongestGlobalSubjectDeliveryStatus([{ ...baseRun, Active: false }], "FREE1", now), "NOT SCHEDULED");
assert.deepEqual(mapGlobalSubjectRun(baseRun, now), {
  runid: "GSRUN1",
  subjectid: "FREE1",
  runname: "August run",
  startdate: "2026-08-17",
  enddate: "2026-08-20",
  timezone: "Africa/Johannesburg",
  active: true,
  ongoing: false,
  status: "CURRENT"
});
assert.deepEqual(mapGlobalSubjectRun(ongoingRun, now), {
  runid: "ONGOING",
  subjectid: "FREE1",
  runname: "Ongoing course",
  startdate: "",
  enddate: "",
  timezone: "Africa/Johannesburg",
  active: true,
  ongoing: true,
  status: "CURRENT"
});

console.log("V102.12.8 global-subject policy, fixed-run and ongoing-course helper tests passed.");
