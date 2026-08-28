# V102.11 update TODO — exact-dated Global Subject timetable

Complete in order. Baseline is the complete deployed and validated V102.10 development repository.

## 1. Confirm starting point

- [ ] Development Worker root reports `102.10` before applying V102.11.
- [ ] Platform validation is green on schema `102.0.5` with 13 required tabs.
- [ ] Back up the complete central Platform Sheet.
- [ ] Confirm V102.10 FREE/SUBSCRIPTION and protected Global Resources still work.
- [ ] Confirm the Attendance save-reset carry-forward still works.

## 2. Prepare V102.11 Platform additions while schema stays 102.0.5

Follow `V102.11-PLATFORM-SHEET-MIGRATION.md` exactly.

- [ ] Create `GlobalTimetableSessions` with exact A1:P1 headers.
- [ ] Create `GlobalTimetableRunState` with exact A1:I1 headers.
- [ ] Create `GlobalTimetablePublications` with exact A1:H1 headers.
- [ ] Create `PublishedGlobalTimetableSessions` with exact A1:S1 headers.
- [ ] Leave row 2 onward blank in all four tabs.
- [ ] Add exactly one `PlatformConfig` row with `ConfigKey = GlobalTimetableVersion` and `ConfigValue = 1`.
- [ ] Leave the schema marker at `102.0.5`.
- [ ] Do not manufacture timetable history or publication rows.

## 3. Apply the V102.11 changed-files overlay

- [ ] Copy every included file to its matching path in the deployed V102.10 development repository.
- [ ] Follow `DELETE-FILES.txt` (V102.11 has no intentional runtime deletion).
- [ ] Confirm root `version.json`, backend package and Worker root are `102.11`.
- [ ] Confirm Pages and Worker are committed/pushed from the **same GitHub commit**.

## 4. Confirm deployment before schema flip

- [ ] Worker root reports `102.11`.
- [ ] Hard refresh/private window loads the V102.11 Pages commit.
- [ ] GLOBAL_ADMIN / ADMIN central login works.
- [ ] Global Curriculum existing Subjects, Modules, Tasks, Resources, Delivery and Access Matrix still load.
- [ ] If Schedule is opened before the schema flip, confirm it stays unavailable rather than writing timetable data under schema `102.0.5`.
- [ ] Do not change the schema marker until both Pages and Worker are confirmed on the same commit.

## 5. Advance Platform schema

- [ ] Change the existing `PlatformSchemaVersion` value from `102.0.5` to `102.0.6` (`PlatformConfig!B3` if the V102.10 layout is unchanged).
- [ ] Run Platform validation.
- [ ] Confirm `102.0.6` and **17 required tabs**.
- [ ] Confirm `GlobalTimetableVersion = 1` before first publication.
- [ ] Confirm 0 global timetable sessions, 0 publications and 0 published session snapshots before Schedule is used.

## 6. Create a safe test schedule

Use an active Global Subject run with known dates.

- [ ] Open Global Curriculum → **Schedule**.
- [ ] Select the run.
- [ ] Choose a central teacher account.
- [ ] Choose optional module, Start/End time, optional HTTPS Zoom link and one or more weekdays.
- [ ] Generate dates.
- [ ] Confirm generated SessionDate values fall only inside the run StartDate/EndDate.
- [ ] Confirm `GlobalTimetableRunState` is DEVELOPMENT.
- [ ] Confirm `GlobalTimetableVersion` remains `1` after draft generation.

## 7. Verify individual date exceptions

- [ ] Select one generated session.
- [ ] Change its date/time and save.
- [ ] Confirm the date remains inside the run.
- [ ] Deactivate one holiday/gap date by clearing Active and save.
- [ ] Confirm it remains as an inactive draft row rather than being silently deleted.
- [ ] Confirm an exact duplicate active run/date/time is rejected.
- [ ] Confirm a run boundary change that would exclude an existing session is rejected in Delivery.

## 8. Verify first publication

- [ ] Publish the run timetable.
- [ ] Confirm `GlobalTimetablePublications` receives version 1.
- [ ] Confirm only Active source sessions are snapshotted.
- [ ] Confirm `PublishedGlobalTimetableSessions` contains immutable display values RunName, SubjectName, ModuleName (when used), TeacherName and Timezone.
- [ ] Confirm state becomes PUBLISHED and `CurrentPublicationID` points to version 1.
- [ ] Confirm `GlobalTimetableVersion` increments by exactly 1.

## 9. Verify immutable republish behavior

- [ ] Edit one source session after publishing.
- [ ] Confirm state becomes DEVELOPMENT but `CurrentPublicationID` still points to version 1.
- [ ] Confirm the version-1 snapshot did not change.
- [ ] Publish again.
- [ ] Confirm a version-2 publication and new snapshot rows are appended.
- [ ] Confirm version-1 snapshot rows remain byte-for-byte unchanged.
- [ ] Confirm `CurrentPublicationID` now points to version 2.
- [ ] Confirm `GlobalTimetableVersion` increments again only on publish.

## 10. Regression checks

- [ ] FREE Global Subject remains accessible to active accounts without matrix TRUE.
- [ ] SUBSCRIPTION subject still follows Access Matrix TRUE/FALSE.
- [ ] Protected Global Drive link authorization works as in V102.10.
- [ ] Delivery policy/run changes still work.
- [ ] Course timetable Builder/read/publication remains unchanged.
- [ ] Weekly Planner remains unchanged.
- [ ] Attendance successful save resets the visible register to Present.

## 11. Scope confirmation

- [ ] Do not expect Student/Teacher academy timetable display yet.
- [ ] Do not add global sessions to course Sheets.
- [ ] Do not add billing/expiry logic.
- [ ] Do not add cross-course conflict logic.
- [ ] Do not onboard Aalimiyah as part of V102.11.

## Rollback

If rollback is required after schema `102.0.6` is active:

1. Change `PlatformSchemaVersion` back to `102.0.5` first.
2. Revert Pages and Worker together to the deployed V102.10 commit.
3. Leave the four V102.11 timetable tabs and `GlobalTimetableVersion` row in place; V102.10 ignores them.
4. Preserve all timetable/publication data unless an intentional, backed-up cleanup is required.
