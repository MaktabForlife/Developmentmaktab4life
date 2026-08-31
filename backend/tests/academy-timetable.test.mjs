import assert from "node:assert/strict";
import {
  academyClockInTimezone,
  buildGlobalCourseEvents,
  isAcademySessionCurrent,
  programSessionToAcademyEvent,
  resolveAcademyWeek
} from "../src/routes/academy-timetable.js";

const week = resolveAcademyWeek("2026-08-24", "Africa/Johannesburg", new Date("2026-08-28T12:00:00Z"));
assert.deepEqual(week, { start: "2026-08-24", end: "2026-08-30", today: "2026-08-28" });

const baseProgramSession = {
  dayofweek: "Mon",
  starttime: "09:00",
  endtime: "10:00",
  subjectname: "Fiqh",
  modulename: "Purification",
  groupno: "1",
  teacherid: "ADMIN1",
  teachername: "Muallimah One",
  zoomlink: "https://zoom.test/reboot"
};

const studentDetail = programSessionToAcademyEvent(baseProgramSession, {
  courseId: "COURSE1",
  courseName: "Reboot Your Maktab",
  week,
  globalZoomLink: "",
  currentDate: "2026-08-24",
  currentMinutes: 9 * 60 + 30,
  access: { level: "STUDENT", roles: new Set(["STUDENT"]), studentGroup: "1", teacherIds: new Set() }
});
assert.equal(studentDetail.visibilityLevel, "DETAIL");
assert.equal(studentDetail.relevant, true);
assert.equal(studentDetail.canOpenZoom, true);
assert.equal(studentDetail.title, "Fiqh");
assert.equal(studentDetail.programName, "Reboot Your Maktab");
assert.equal(studentDetail.date, "2026-08-24");
assert.equal(studentDetail.zoomLink, "https://zoom.test/reboot");

const studentOtherGroup = programSessionToAcademyEvent({ ...baseProgramSession, groupno: "2" }, {
  courseId: "COURSE1",
  courseName: "Reboot Your Maktab",
  week,
  globalZoomLink: "",
  currentDate: "2026-08-24",
  currentMinutes: 9 * 60 + 30,
  access: { level: "STUDENT", roles: new Set(["STUDENT"]), studentGroup: "1", teacherIds: new Set() }
});
assert.deepEqual(studentOtherGroup, {
  kind: "PROGRAM",
  date: "2026-08-24",
  startTime: "09:00",
  endTime: "10:00",
  visibilityLevel: "LABEL",
  relevant: false,
  isCurrent: true,
  canOpenZoom: false,
  status: "SCHEDULED",
  title: "Reboot Your Maktab"
});
assert.equal("teacherName" in studentOtherGroup, false, "LABEL responses must redact teacher detail");
assert.equal("zoomLink" in studentOtherGroup, false, "LABEL responses must redact Zoom links");
assert.equal("group" in studentOtherGroup, false, "LABEL responses must redact groups");

const ordinaryStudentGroupZeroRow = programSessionToAcademyEvent({ ...baseProgramSession, groupno: "0" }, {
  courseId: "COURSE1",
  courseName: "Reboot Your Maktab",
  week,
  globalZoomLink: "",
  currentDate: "2026-08-24",
  currentMinutes: 9 * 60 + 30,
  access: { level: "STUDENT", roles: new Set(["STUDENT"]), studentGroup: "1", teacherIds: new Set() }
});
assert.equal(ordinaryStudentGroupZeroRow.visibilityLevel, "LABEL", "Program Group 0 must not be treated as ALL for ordinary students");

const allGroupsStudent = programSessionToAcademyEvent({ ...baseProgramSession, groupno: "2" }, {
  courseId: "COURSE1",
  courseName: "Reboot Your Maktab",
  week,
  globalZoomLink: "",
  currentDate: "2026-08-24",
  currentMinutes: 9 * 60 + 30,
  access: { level: "STUDENT", roles: new Set(["STUDENT"]), studentGroup: "0", teacherIds: new Set() }
});
assert.equal(allGroupsStudent.visibilityLevel, "DETAIL", "Student ClassGroup 0 must retain ALL-groups timetable visibility");

const teacherOther = programSessionToAcademyEvent({ ...baseProgramSession, teacherid: "ADMIN2", teachername: "Muallimah Two" }, {
  courseId: "COURSE1",
  courseName: "Reboot Your Maktab",
  week,
  globalZoomLink: "",
  currentDate: "2026-08-24",
  currentMinutes: 9 * 60 + 30,
  access: { level: "TEACHER", roles: new Set(["TEACHER"]), studentGroup: "", teacherIds: new Set(["ADMIN1"]) }
});
assert.equal(teacherOther.visibilityLevel, "DETAIL");
assert.equal(teacherOther.relevant, false);
assert.equal(teacherOther.canOpenZoom, false);
assert.equal(teacherOther.zoomLink, "");

const freePlatform = makeGlobalPlatform("FREE", false);
const freeEvents = buildGlobalCourseEvents(freePlatform, { AccountID: "ACCOUNT1", Active: true }, { isGlobalAdmin: false, week, currentDate: "2026-08-27", currentMinutes: 20 * 60 + 30 });
assert.equal(freeEvents.length, 1);
assert.equal(freeEvents[0].visibilityLevel, "DETAIL");
assert.equal(freeEvents[0].relevant, true);
assert.equal(freeEvents[0].canOpenZoom, true);
assert.equal(freeEvents[0].zoomLink, "https://zoom.test/global");

const derivedPlatform = makeDerivedGlobalPlatform();
const derivedEvents = buildGlobalCourseEvents(derivedPlatform, { AccountID: "ACCOUNT1", Active: true }, { isGlobalAdmin: false, week, currentDate: "2026-08-24", currentMinutes: 9 * 60 + 30 });
assert.equal(derivedEvents.length, 1, "Academy must derive a published Course occurrence without a normal snapshot row");
assert.equal(derivedEvents[0].date, "2026-08-24");
assert.equal(derivedEvents[0].subjectName, "Derived Course Subject");
assert.equal(derivedEvents[0].moduleName, "Derived Module");
assert.equal(derivedEvents[0].teacherName, "Derived Teacher");
assert.equal(derivedEvents[0].canOpenZoom, true);
assert.equal(derivedPlatform.PublishedGlobalTimetableSessions.length, 0, "Derived Academy delivery must not require materialised normal session snapshots");

const paidPlatform = makeGlobalPlatform("SUBSCRIPTION", false);
const paidLabel = buildGlobalCourseEvents(paidPlatform, { AccountID: "ACCOUNT1", Active: true }, { isGlobalAdmin: false, week, currentDate: "2026-08-27", currentMinutes: 20 * 60 + 30 });
assert.equal(paidLabel[0].visibilityLevel, "LABEL");
assert.equal(paidLabel[0].title, "Steps to My Rabb");
assert.equal("teacherName" in paidLabel[0], false);
assert.equal("zoomLink" in paidLabel[0], false);
assert.equal("globalCourseName" in paidLabel[0], false);

const subscriberPlatform = makeGlobalPlatform("SUBSCRIPTION", true);
const subscriberEvents = buildGlobalCourseEvents(subscriberPlatform, { AccountID: "ACCOUNT1", Active: true }, { isGlobalAdmin: false, week, currentDate: "2026-08-27", currentMinutes: 20 * 60 + 30 });
assert.equal(subscriberEvents[0].visibilityLevel, "DETAIL");
assert.equal(subscriberEvents[0].canOpenZoom, true);
assert.equal("globalCourseName" in subscriberEvents[0], false, "Global Course internal/run name must not be exposed in user-facing timetable detail");
assert.equal(subscriberEvents[0].subjectName, "Steps to My Rabb");
assert.equal(subscriberEvents[0].moduleName, "Hearts Connected");
assert.equal(subscriberEvents[0].teacherName, "Muallimah");

const freeCoursePlatform = makeGlobalPlatform("SUBSCRIPTION", false, "TEACHER1", "SCHEDULED", "FREE");
const freeCourseEvents = buildGlobalCourseEvents(freeCoursePlatform, { AccountID: "ACCOUNT1", Active: true }, { isGlobalAdmin: false, week, currentDate: "2026-08-27", currentMinutes: 20 * 60 + 30 });
assert.equal(freeCourseEvents[0].visibilityLevel, "DETAIL", "A FREE Course is automatically accessible even when its linked Global Subject policy is not free");

const paidCoursePlatform = makeGlobalPlatform("FREE", false, "TEACHER1", "SCHEDULED", "PAID");
const paidCourseEvents = buildGlobalCourseEvents(paidCoursePlatform, { AccountID: "ACCOUNT1", Active: true }, { isGlobalAdmin: false, week, currentDate: "2026-08-27", currentMinutes: 20 * 60 + 30 });
assert.equal(paidCourseEvents[0].visibilityLevel, "LABEL", "A PAID Course must not inherit automatic access from a FREE Global Subject");

const paidCourseSubscriberPlatform = makeGlobalPlatform("FREE", true, "TEACHER1", "SCHEDULED", "PAID");
const paidCourseSubscriberEvents = buildGlobalCourseEvents(paidCourseSubscriberPlatform, { AccountID: "ACCOUNT1", Active: true }, { isGlobalAdmin: false, week, currentDate: "2026-08-27", currentMinutes: 20 * 60 + 30 });
assert.equal(paidCourseSubscriberEvents[0].visibilityLevel, "DETAIL", "A PAID Course remains available to explicitly entitled accounts during the V103.1.0.5 transition");

const teacherPlatform = makeGlobalPlatform("SUBSCRIPTION", false, "ACCOUNT1");
const teacherEvents = buildGlobalCourseEvents(teacherPlatform, { AccountID: "ACCOUNT1", Active: true }, { isGlobalAdmin: false, week, currentDate: "2026-08-27", currentMinutes: 20 * 60 + 30 });
assert.equal(teacherEvents[0].visibilityLevel, "DETAIL", "Assigned Global Course teachers receive teaching detail without a learner subscription");
assert.equal(teacherEvents[0].canOpenZoom, true);

const cancelledPlatform = makeGlobalPlatform("FREE", false, "TEACHER1", "CANCELLED");
const cancelledEvents = buildGlobalCourseEvents(cancelledPlatform, { AccountID: "ACCOUNT1", Active: true }, { isGlobalAdmin: false, week, currentDate: "2026-08-27", currentMinutes: 20 * 60 + 30 });
assert.equal(cancelledEvents[0].status, "CANCELLED");
assert.equal(cancelledEvents[0].canOpenZoom, false, "Cancelled sessions must never expose an active Join Zoom action");
assert.equal(cancelledEvents[0].zoomLink, "");

const adminOther = programSessionToAcademyEvent({ ...baseProgramSession, teacherid: "ADMIN2" }, {
  courseId: "COURSE1",
  courseName: "Reboot Your Maktab",
  week,
  globalZoomLink: "",
  currentDate: "2026-08-24",
  currentMinutes: 9 * 60 + 30,
  access: { level: "ADMIN", roles: new Set(["ADMIN"]), studentGroup: "", teacherIds: new Set(["ADMIN1"]) }
});
assert.equal(adminOther.visibilityLevel, "DETAIL", "Program staff may expand authorised Program detail");
assert.equal(adminOther.relevant, false, "Program staff Home relevance is limited to sessions they directly teach");
assert.equal(adminOther.canOpenZoom, false);

const adminOwn = programSessionToAcademyEvent(baseProgramSession, {
  courseId: "COURSE1",
  courseName: "Reboot Your Maktab",
  week,
  globalZoomLink: "",
  currentDate: "2026-08-24",
  currentMinutes: 9 * 60 + 30,
  access: { level: "ADMIN", roles: new Set(["ADMIN"]), studentGroup: "", teacherIds: new Set(["ADMIN1"]) }
});
assert.equal(adminOwn.relevant, true);
assert.equal(adminOwn.canOpenZoom, true, "A directly involved staff member may open Zoom only while that session is current");

const globalAdminProgram = programSessionToAcademyEvent(baseProgramSession, {
  courseId: "COURSE1",
  courseName: "Reboot Your Maktab",
  week,
  globalZoomLink: "",
  currentDate: "2026-08-24",
  currentMinutes: 9 * 60 + 30,
  access: { level: "GLOBAL_ADMIN", roles: new Set(["GLOBAL_ADMIN"]), studentGroup: "", teacherIds: new Set() }
});
assert.equal(globalAdminProgram.visibilityLevel, "DETAIL");
assert.equal(globalAdminProgram.relevant, false, "Global Admin sees Program activity rolled up on Academy Home by default");
assert.equal(globalAdminProgram.canOpenZoom, false);

assert.equal(isAcademySessionCurrent({
  date: "2026-08-24", startTime: "09:00", endTime: "10:00", status: "SCHEDULED"
}, "2026-08-24", 9 * 60 + 30), true);
assert.equal(isAcademySessionCurrent({
  date: "2026-08-24", startTime: "09:00", endTime: "10:00", status: "SCHEDULED"
}, "2026-08-24", 10 * 60), false);
assert.equal(isAcademySessionCurrent({
  date: "2026-08-24", startTime: "09:00", endTime: "10:00", status: "CANCELLED"
}, "2026-08-24", 9 * 60 + 30), false);
assert.deepEqual(
  academyClockInTimezone(new Date("2026-08-24T07:30:00Z"), "Africa/Johannesburg"),
  { date: "2026-08-24", minutes: 9 * 60 + 30 }
);

console.log("V103.1.0.5 Academy timetable Course FREE/PAID access, personalisation and current-session Zoom tests passed.");


function makeDerivedGlobalPlatform() {
  const scheduleDefinition = JSON.stringify([{
    rulekey: "RULE-MON", days: ["MON"], starttime: "09:00", endtime: "10:00",
    moduleid: "GMOD-DERIVED", teacheraccountid: "ACCOUNT1", zoomlink: "https://zoom.test/derived",
    modulename: "Derived Module", teachername: "Derived Teacher"
  }]);
  return {
    subjects: [{ SubjectID: "GSUBJ-DERIVED", SubjectName: "Derived Course Subject", Active: true }],
    policies: [{ SubjectPolicyID: "GSPOL-DERIVED", SubjectID: "GSUBJ-DERIVED", AccessModel: "FREE", Active: true }],
    matrix: [],
    runs: [{
      RunID: "GSRUN-DERIVED", SubjectID: "GSUBJ-DERIVED", RunName: "Derived Course Run",
      StartDate: "2026-08-24", EndDate: "2026-08-30", Timezone: "Africa/Johannesburg", Active: true,
      AccessModel: "FREE", ScheduleMode: "DERIVED", ScheduleDefinition: scheduleDefinition
    }],
    GlobalTimetableRunState: [{ RunID: "GSRUN-DERIVED", Stage: "PUBLISHED", CurrentPublicationID: "GTPUB-DERIVED" }],
    GlobalTimetablePublications: [{
      PublicationID: "GTPUB-DERIVED", RunID: "GSRUN-DERIVED", SubjectID: "GSUBJ-DERIVED", VersionNo: 1,
      PublishedDate: "2026-08-23T00:00:00Z", PublishedByAccountID: "ADMIN", PublishedByAccountName: "Admin",
      SessionCount: 1, ScheduleMode: "DERIVED", PublishStartDate: "2026-08-24", PublishEndDate: "2026-08-30",
      ScheduleDefinition: scheduleDefinition, RunName: "Derived Course Run", SubjectName: "Derived Course Subject", Timezone: "Africa/Johannesburg"
    }],
    GlobalTimetableSessionLifecycle: [],
    PublishedGlobalTimetableSessions: []
  };
}

function makeGlobalPlatform(accessModel, subscribed, teacherAccountId = "TEACHER1", status = "SCHEDULED", courseAccessModel = "") {
  return {
    subjects: [{ SubjectID: "GSUBJ1", SubjectName: "Steps to My Rabb", Active: true }],
    policies: [{ SubjectPolicyID: "GSPOL1", SubjectID: "GSUBJ1", AccessModel: accessModel, Active: true }],
    matrix: [{ AccountID: "ACCOUNT1", _subjectAccess: { GSUBJ1: subscribed } }],
    runs: [{ RunID: "GSRUN1", SubjectID: "GSUBJ1", RunName: "Steps to My Rabb Term 3", StartDate: "2026-08-01", EndDate: "2026-11-30", Timezone: "Africa/Johannesburg", Active: true, AccessModel: courseAccessModel }],
    GlobalTimetableRunState: [{ RunID: "GSRUN1", Stage: "PUBLISHED", CurrentPublicationID: "GTPUB1" }],
    GlobalTimetablePublications: [{
      PublicationID: "GTPUB1", RunID: "GSRUN1", SubjectID: "GSUBJ1", VersionNo: 1,
      PublishedDate: "2026-08-01T00:00:00Z", PublishedByAccountID: "ADMIN", PublishedByAccountName: "Admin", SessionCount: 1
    }],
    GlobalTimetableSessionLifecycle: [{
      SessionLifecycleID: "GSLIFE1", SessionID: "GTSES1", PublicationID: "GTPUB1", Status: status,
      RescheduledFromSessionID: "", RescheduledToSessionID: ""
    }],
    PublishedGlobalTimetableSessions: [{
      PublishedSessionID: "GTPS1", PublicationID: "GTPUB1", SourceSessionID: "GTSES1",
      RunID: "GSRUN1", SubjectID: "GSUBJ1", ModuleID: "GMOD1", SessionDate: "2026-08-27",
      StartTime: "20:00", EndTime: "21:00", TeacherAccountID: teacherAccountId,
      ZoomLink: "https://zoom.test/global", PublishedDate: "2026-08-01T00:00:00Z",
      PublishedByAccountID: "ADMIN", PublishedByAccountName: "Admin", RunName: "Steps to My Rabb Term 3",
      SubjectName: "Steps to My Rabb", ModuleName: "Hearts Connected", TeacherName: "Muallimah",
      Timezone: "Africa/Johannesburg"
    }]
  };
}
