# V102.9 update TODO — published timetable integrator

Complete this checklist in order. Production remains stable at V101.1 and must
not be changed during this development deployment.

## 1. Back up and confirm the starting point

- [ ] Confirm development currently reports `102.8.2` before applying the overlay.
- [ ] Export/back up the Platform Sheet.
- [ ] Export/back up the Reboot course Sheet.
- [ ] Confirm the current live timetable still reads from `TeacherAssign`.
- [ ] Confirm `CourseRegistry!A2` is `COURSE1` before relying on the E2 cell
  instruction below.
- [ ] Do not rerun account migration.

## 2. Apply the modified-files overlay

- [ ] Extract `Rebootyourmaktab-V102.9-GITHUB-UPDATE-FROM-V102.8.2.zip`.
- [ ] Copy every file into the matching path of the existing development repo.
- [ ] Replace files when prompted and retain the directory structure.
- [ ] Confirm `docs/V102.9-PUBLISHED-TIMETABLE-INTEGRATOR.md` is present.
- [ ] Confirm `DELETE-FILES.txt` states that no files are deleted.
- [ ] Confirm `version.json`, `js/version.json` and `backend/package.json` all
  report `102.9`.
- [ ] Commit the complete overlay as one development revision.

Cloudflare may deploy Worker and Pages immediately. Wait for both deployments
from the same commit before application testing.

## 3. Confirm code deployment before changing Sheets

- [ ] Confirm the Worker root reports `102.9`.
- [ ] Confirm Pages deployed from the same GitHub commit.
- [ ] Hard-refresh or use a private browser window.
- [ ] Confirm `/account/<uniqueid>` displays `V102.9`.
- [ ] Confirm GLOBAL_ADMIN, course ADMIN, TEACHER and Student can still sign in.

At this point `TeacherAssign` is still live. Deployment itself does not change
the timetable source.

## 4. Add the six exact course-Sheet headers

Open the Reboot course Sheet → `PublishedTimetableSessions` and enter:

- [ ] `O1` = `CourseName`
- [ ] `P1` = `StartTime`
- [ ] `Q1` = `EndTime`
- [ ] `R1` = `SubjectName`
- [ ] `S1` = `ModuleName`
- [ ] `T1` = `TeacherName`

- [ ] Do not enter data in O2:T.
- [ ] Confirm A1:N1 remain unchanged and `SourceSessionID` occurs only once.
- [ ] Confirm `TimetableSessions!H1` is exactly `TeacherID` with no leading space.

## 5. Update the registered course schema

Open the Platform Sheet → `CourseRegistry`:

- [ ] Confirm `CourseRegistry!A2` is `COURSE1`.
- [ ] Set `CourseRegistry!E2` to `101.4.4`.
- [ ] If COURSE1 is no longer row 2, update column E on its actual row instead.
- [ ] Keep Platform schema `102.0.4` unchanged.
- [ ] Do not add or remove Platform tabs.
- [ ] Do not create `TimetableLiveSource` manually.

## 6. Verify compatibility before publishing

- [ ] Open **Admin → Timetable Builder**.
- [ ] Confirm courses, times, sessions, subjects, modules, tasks and teachers load.
- [ ] Confirm existing add, modify, bulk-edit, delete and restore behavior works.
- [ ] Confirm **Review Live Integration** opens.
- [ ] Confirm **Immutable columns O:T** reports **Ready**.
- [ ] Confirm TeacherAssign is shown as the current live source.
- [ ] Confirm activation is unavailable if no valid current publication exists.

## 7. Create a fresh immutable publication

- [ ] Publish a new timetable version after O1:T1 were added.
- [ ] Record PublicationID: ____________________
- [ ] Record VersionNo: ____________________
- [ ] Confirm the new rows in `PublishedTimetableSessions` contain values in
  O, P, Q, R, T and in S whenever ModuleID is present.
- [ ] Confirm the snapshot row count matches `TimetablePublications.SessionCount`.
- [ ] Confirm the publication audit row contains the Admin ID, name and date.
- [ ] Confirm TeacherAssign remains live after publishing.

## 8. Review source comparison

- [ ] Open **Review Live Integration** again.
- [ ] Confirm it shows the fresh PublicationID/version and session count.
- [ ] Review Matching, Published only and TeacherAssign only counts.
- [ ] Expand any differences and confirm they are expected Builder changes.
- [ ] If a difference is wrong, cancel, correct the draft and publish a new
  version before continuing.

## 9. Activate the published live source

- [ ] Type `ACTIVATE PUBLISHED TIMETABLE` exactly.
- [ ] Activate and confirm the success message names the published version.
- [ ] Confirm a single course-local `SystemConfig` row now has:
  `TimetableLiveSource | PUBLISHED_TIMETABLE`.
- [ ] Confirm `AdminAuditLog` contains `ACTIVATE`,
  `TIMETABLE_LIVE_SOURCE`, `TimetableLiveSource`.
- [ ] Confirm no `TeacherAssign` or publication rows were deleted or rewritten.

## 10. Verify live viewers

- [ ] Student in Group 1 sees Group 1 and ALL sessions only.
- [ ] Another Student sees only her authenticated group and ALL sessions.
- [ ] TEACHER sees only sessions assigned to her stable AdminID.
- [ ] ADMIN sees the complete timetable with existing visual greying behavior.
- [ ] SENIOR/SENIOR TEACHER sees the permitted oversight view.
- [ ] Weekly Planner teacher filtering uses the published timetable.
- [ ] Subject/module names, teacher names and start times match the publication.
- [ ] Per-session Zoom overrides work.
- [ ] Course-default `GlobalZoomLink` fallback works.
- [ ] No cross-course overlap or subscription timetable limit is introduced.

## 11. Verify draft isolation and next publication

- [ ] Modify one Builder session without publishing.
- [ ] Confirm Builder stage becomes `DEVELOPMENT`.
- [ ] Confirm `CurrentPublicationID` remains the previous PublicationID.
- [ ] Confirm Student/Teacher live views remain unchanged.
- [ ] Publish the corrected draft.
- [ ] Confirm the new version becomes live immediately.
- [ ] Confirm timetable cache refresh shows the new version.

## 12. Verify rollback

- [ ] Open **Review / Roll Back**.
- [ ] Type `RETURN TO TEACHERASSIGN` exactly.
- [ ] Confirm Student/Teacher views return to TeacherAssign.
- [ ] Confirm `SystemConfig` now contains `TEACHER_ASSIGN`.
- [ ] Confirm `AdminAuditLog` contains a `ROLLBACK` source event.
- [ ] Re-activate the published source only if development testing should end in
  published mode.

## 13. Regression checks

- [ ] Unified Profile course/role switching works without another PIN.
- [ ] Inaccessible menu items remain hidden by role.
- [ ] Library source pill, Global Subjects and protected resources still work.
- [ ] Student PDF split view still works.
- [ ] Attendance, Progress and Weekly Planner creation/viewing still work.
- [ ] Global Curriculum and subscriptions remain unchanged.
- [ ] Production V101.1 was not deployed or modified.

## 14. Code rollback if required

- [ ] First use V102.9 to return the live source to TeacherAssign.
- [ ] Back up `PublishedTimetableSessions` again.
- [ ] Remove O:T or restore the pre-V102.9 course Sheet backup.
- [ ] Restore the Reboot CourseRegistry schema value to `101.4.3`.
- [ ] Revert the single V102.9 GitHub commit.
- [ ] Wait for Worker and Pages to return to V102.8.2.
- [ ] Do not delete legitimate Admin audit rows.

## Completion record

- Development GitHub commit: ____________________
- Worker deployment ID: ____________________
- Pages deployment ID: ____________________
- Worker version verified: ____________________
- O1:T1 verified by: ____________________
- Fresh PublicationID: ____________________
- Comparison reviewed by: ____________________
- Activation tested: ____________________
- Student/Teacher/Admin views tested: ____________________
- Draft isolation tested: ____________________
- Rollback tested: ____________________
- Verification date: ____________________
- Result: ____________________
