# ﷽ V102.11.1 update TODO — Course Scheduler and revision workflow

Complete in order. Baseline is the deployed and validated V102.11 development repository on Platform schema `102.0.6`.

## 1. Confirm the V102.11 starting point

- [ ] Development Worker root reports `102.11` before applying this correction.
- [ ] Platform validation is green on schema `102.0.6` with 17 required tabs.
- [ ] Back up the complete central Platform Sheet.
- [ ] Confirm at least one existing Global Course/run and its current publication can be read.
- [ ] Confirm V102.10 FREE/PAID Global Access and protected Global Resources still work.
- [ ] Confirm the Attendance successful-save reset still works.

## 2. Prepare the two additive Platform changes while schema stays 102.0.6

Follow `docs/V102.11.1-PLATFORM-SHEET-MIGRATION.md` exactly.

- [ ] Create `GlobalTimetableSessionLifecycle`.
- [ ] Paste the exact A1:L1 headers from the migration guide/template.
- [ ] Leave row 2 onward blank; do **not** manufacture lifecycle history for existing V102.11 rows.
- [ ] Add exactly one `PlatformConfig` row: `PlatformTimezone | Africa/Johannesburg`.
- [ ] Do not create a duplicate `PlatformTimezone` row.
- [ ] Leave `PlatformSchemaVersion` at `102.0.6`.

## 3. Apply the V102.11.1 changed-files overlay

- [ ] Copy every included file to its matching path in the deployed V102.11 development repository.
- [ ] Follow `DELETE-FILES.txt` (V102.11.1 has no intentional deletion).
- [ ] Confirm root `version.json`, `js/version.json`, backend package and Worker root are `102.11.1`.
- [ ] Confirm the account page shows `V102.11.1`.
- [ ] Confirm Pages and Worker deploy from the **same GitHub commit**.

## 4. Confirm deployment before schema flip

- [ ] Worker root reports `102.11.1`.
- [ ] Hard refresh/private window loads the V102.11.1 Pages commit.
- [ ] Account login works and Profile says **Switch program or role**.
- [ ] Admin Home shows **Program Timetables**.
- [ ] Global Curriculum tabs show `Subjects | Modules | Tasks | Resources | Course Scheduler | Global Access`.
- [ ] Course Scheduler remains fail-closed for writes while the schema marker is still `102.0.6`.
- [ ] Do not change the schema marker until both Pages and Worker are confirmed on the same commit.

## 5. Advance Platform schema

- [ ] Change the existing `PlatformSchemaVersion` value from `102.0.6` to `102.0.7` (`PlatformConfig!B3` if the current layout is unchanged).
- [ ] Run Platform validation.
- [ ] Confirm schema `102.0.7` and **18 required tabs**.
- [ ] Confirm exactly one `PlatformTimezone = Africa/Johannesburg` row.
- [ ] Confirm `GlobalTimetableSessionLifecycle` passes exact-header validation.
- [ ] Confirm existing V102.11 publications remain valid even though they have no historical lifecycle seed rows.

## 6. Verify Course Scheduler setup workflow

- [ ] Open Global Curriculum → **Course Scheduler**.
- [ ] Confirm the header refresh icon reloads newly created/modified courses without logout/login.
- [ ] Confirm there is no redundant inline Reload button.
- [ ] Confirm the subject table is `Subject | Access | Modules | Status`.
- [ ] Confirm Global Course summary is `Course | Scheduled dates | Sessions | Status`.
- [ ] Confirm the setup heading is **Set up / modify a course**.
- [ ] Set course name, Start date, End date and Active state.
- [ ] Add weekly day/time rows in the same screen.
- [ ] Confirm each weekly row provides Day, Start, End, Module, Teacher and **Zoom link**.
- [ ] Confirm no Timezone field is exposed in Course Scheduler.
- [ ] Save the course and generate exact dated sessions.

## 7. Verify Teacher TBA and publication guard

- [ ] Create/edit a DEVELOPMENT course with one schedule row using Teacher `TBA`.
- [ ] Confirm saving/generating succeeds.
- [ ] Attempt to publish while a scheduled session has no teacher.
- [ ] Confirm publication is blocked and identifies the missing teacher requirement.
- [ ] Assign a valid active central teacher and confirm publication can proceed.

## 8. Verify immutable revision workflow

- [ ] Publish the test Global Course.
- [ ] Confirm direct generate/edit/cancel/reschedule actions are locked while PUBLISHED.
- [ ] Select **Revise timetable**.
- [ ] Confirm the working state becomes DEVELOPMENT/REVISION while `CurrentPublicationID` remains on the last immutable publication.
- [ ] Confirm the prior published snapshot did not change.

## 9. Verify CANCELLED and RESCHEDULED

- [ ] In the revision, select one dated session and mark it `CANCELLED`.
- [ ] Select another dated session and use the reschedule action.
- [ ] Create the replacement exact date/time and confirm the original and replacement are linked.
- [ ] Confirm CANCELLED/RESCHEDULED originals remain represented rather than silently disappearing.
- [ ] Publish the revision.
- [ ] Confirm a new immutable publication is appended.
- [ ] Confirm the old publication remains unchanged.
- [ ] Confirm the new publication carries the session lifecycle snapshot information.

## 10. Verify Global Access redesign

- [ ] Open **Global Access**.
- [ ] Confirm the old Global Subject Access heading/explanatory paragraph is absent.
- [ ] Confirm header row 1 contains Global Subject names.
- [ ] Confirm header row 2 contains `PAID` or `FREE`.
- [ ] For a FREE subject with a saved TRUE matrix value, confirm both the **FREE** token and saved entitlement tick are visible.
- [ ] For a FREE subject with FALSE, confirm FREE access still works while the saved tick remains off.
- [ ] Confirm switching between Course Scheduler and Global Access leaves only one tab highlighted.

## 11. Verify terminology and System Settings

- [ ] Confirm existing Reboot/Aalimiyyah builder is labelled **Program Timetables**.
- [ ] Confirm its setup tab says **Programs & Times**.
- [ ] Confirm internal course endpoints/IDs continue to work unchanged.
- [ ] Confirm System Settings shows Platform Timezone `Africa/Johannesburg`.
- [ ] Confirm user-facing Global Course forms say **Zoom link**, not Zoom override.

## 12. Regression checks

- [ ] FREE Global Subject remains accessible to active accounts without a saved paid tick.
- [ ] PAID/SUBSCRIPTION subject still follows the saved Access Matrix TRUE/FALSE value.
- [ ] Protected Global Drive links still enforce current backend entitlement.
- [ ] Existing Program timetable Builder/read/publication remains unchanged apart from labels.
- [ ] Weekly Planner remains unchanged.
- [ ] Attendance successful save resets the visible register to Present.
- [ ] Platform validation remains green after test data is created.

## Scope confirmation

- [ ] Do not expect Global Course sessions in the Student/Teacher Academy timetable yet; that remains V102.12.
- [ ] Do not copy Global Course sessions into Program Sheets.
- [ ] Do not rename stored `CourseID`, `RunID`, API routes or existing Sheet names as part of this UI terminology pass.
- [ ] Do not add billing/expiry logic.
- [ ] Do not add cross-Program conflict logic in this correction.

## Rollback

If rollback is required after schema `102.0.7` is active:

1. Change `PlatformSchemaVersion` back to `102.0.6` **before** reverting code.
2. Revert Pages and Worker together to the same deployed V102.11 commit.
3. Leave `GlobalTimetableSessionLifecycle` in place; V102.11 ignores the additive tab.
4. Leave `PlatformTimezone` in `PlatformConfig`; V102.11 ignores the additive key.
5. Preserve all V102.11/V102.11.1 timetable and publication rows; do not delete history merely to roll back code.
