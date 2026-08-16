# V102.8.2 update to-do

Apply V102.8.2 only over a development repository that already contains
V102.8.1, using:

`Rebootyourmaktab-V102.8.2-GITHUB-UPDATE-FROM-V102.8.1.zip`

This ZIP is a modified-files overlay. It contains every file changed by this
release; it is not a full repository and you do not need to upload the full
repository again. Production remains stable at V101.1 and must not receive
this development update.

## 1. Confirm the starting point

- [ ] Confirm the development Worker root reports `102.8.1`.
- [ ] Confirm `/account/<uniqueid>` displays `V102.8.1`.
- [ ] Confirm the repository into which the ZIP will be copied already contains
  the complete V102.8.1 source.
- [ ] Back up or download the current development branch before replacing files.
- [ ] Record the current Worker and Pages deployment IDs.
- [ ] Export or back up the Platform Sheet and Reboot course Sheet.

Do not rerun account migration. Do not add, remove, rename or manually populate
any Sheet tab or header for this release.

## 2. Apply the overlay

- [ ] Extract
  `Rebootyourmaktab-V102.8.2-GITHUB-UPDATE-FROM-V102.8.1.zip` locally.
- [ ] Copy every included file into the matching path of the existing
  development repository.
- [ ] Replace files when prompted and preserve the directory structure.
- [ ] Confirm `docs/V102.8.2-TIMETABLE-RELIABILITY-BULK-EDIT.md` was added.
- [ ] Confirm `DELETE-FILES.txt` says that no files are deleted.
- [ ] Confirm root `UPDATE-TODO.md` is this V102.8.2 checklist.
- [ ] Confirm `version.json`, `js/version.json` and `backend/package.json` all
  contain `102.8.2`.
- [ ] Review the changed files and commit the complete overlay as one
  development revision.

Cloudflare may deploy the Worker and Pages immediately after the GitHub commit.
Wait until both deployments from the same commit finish before testing. Do not
change existing Worker variables, secrets or bindings.

## 3. Data and configuration boundary

Confirm all of the following before deployment:

- [ ] Platform schema remains `102.0.4`.
- [ ] The registered Reboot course schema remains `101.4.3`.
- [ ] No Platform or course Sheet tab/header change is made.
- [ ] No account or curriculum migration is run.
- [ ] No Apps Script deployment is made.
- [ ] No Cloudflare variable, secret or binding is added, changed or removed.
- [ ] `GlobalCurriculumVersion` is not manually changed.

V102.8.2 writes normal timetable-session and AdminAuditLog data only when an
Admin performs an edit. Deployment itself writes no Sheet data.

## 4. Confirm deployments

- [ ] Confirm the Worker deployment succeeds and its root reports `102.8.2`.
- [ ] Confirm the Pages deployment succeeds from the same GitHub revision.
- [ ] Hard-refresh Pages or use a private browser window.
- [ ] Confirm `/account/<uniqueid>` displays `V102.8.2`.
- [ ] Confirm GLOBAL_ADMIN, course ADMIN and Student unified login still work.
- [ ] Confirm current Profile course/role switching still works without a
  second PIN.

## 5. Reproduce and verify the reliability correction

Use a development ADMIN account and a course with several existing Builder
sessions.

- [ ] Open **Admin → Timetable Builder**.
- [ ] In browser developer tools, clear the Network log.
- [ ] Reload the Builder once and confirm the Builder data uses one Worker
  `/api/admin/timetable-builder/get` request.
- [ ] Modify and save at least five sessions consecutively without logging out,
  closing the Builder or waiting between every edit.
- [ ] Confirm each successful save updates the grid immediately.
- [ ] Confirm the app does not show **Course access could not be validated**
  after one or two changes.
- [ ] Confirm Safari reports a normal JSON API error, not an opaque CORS error,
  if an unexpected asynchronous Worker route failure occurs.
- [ ] Confirm a successful session save does not automatically call the full
  Builder GET again.
- [ ] Confirm the separate `/api/admin/tasks/list` request is not made by the
  Builder load.
- [ ] Confirm the Admin session remains active throughout the test.

If a temporary Google/Worker failure can be safely simulated in development:

- [ ] Confirm the UI reports that the service or Google Sheets is temporarily
  busy/unavailable.
- [ ] Confirm the already loaded timetable remains visible.
- [ ] Confirm the user is not logged out for a network error, HTTP 429 or 5xx.
- [ ] Confirm **Try Again** or Reload succeeds after the temporary failure ends.
- [ ] Confirm a genuine expired/invalid token returning HTTP 401 still requires
  a new login.

## 6. Verify selected-session editing

- [ ] Open the Timetable tab and choose **Select sessions**.
- [ ] Confirm active sessions display selection circles.
- [ ] Confirm an inactive session cannot be selected.
- [ ] Select at least two sessions and confirm the selected count is correct.
- [ ] Confirm **Edit selected** remains disabled until two sessions are selected.
- [ ] Confirm **Clear** clears the selection and **Done** exits selection mode.
- [ ] Re-select two or more sessions and open **Edit selected**.
- [ ] Confirm all three changes are initially unticked and disabled:
  **subject/module**, **teacher**, and **Zoom override**.
- [ ] Confirm unticked fields are explicitly described as unchanged.
- [ ] Confirm day, time slot, group and active status cannot be edited in this
  dialog.

## 7. Verify teacher-only bulk editing

Choose sessions that can safely use the same teacher without overlapping.

- [ ] Tick only **Change teacher**.
- [ ] Select the replacement teacher and save.
- [ ] Confirm every selected session receives that teacher.
- [ ] Confirm unselected sessions are unchanged.
- [ ] Confirm subject, module, Zoom, day, time, group and active status remain
  unchanged on every selected session.
- [ ] Confirm the modal closes only after a successful save.

## 8. Verify subject/module bulk editing

- [ ] Select two or more compatible active sessions.
- [ ] Tick only **Change subject and module**.
- [ ] Choose a subject and one of its active modules, then save.
- [ ] Confirm every selected session receives the subject and module.
- [ ] Repeat using **No module** and confirm the module is cleared.
- [ ] Confirm teacher and Zoom remain unchanged.
- [ ] Confirm a module from another subject cannot be applied.

## 9. Verify Zoom bulk editing

- [ ] Select two or more active sessions.
- [ ] Tick only **Change Zoom override**.
- [ ] Apply a valid HTTPS Zoom link and confirm it reaches only the selected
  sessions.
- [ ] Repeat with the Zoom field blank and confirm each selected override is
  cleared, returning to the course-default Zoom link.
- [ ] Confirm a non-HTTPS URL is rejected and no selected row changes.

## 10. Verify conflict atomicity

- [ ] Select two same-time sessions for different groups.
- [ ] Attempt to apply one teacher to both so that the teacher would overlap.
- [ ] Confirm the Worker reports detailed timetable conflicts.
- [ ] Confirm the message states that no selected session was changed.
- [ ] Check the Sheet and confirm none of the proposed session rows were
  partially updated.
- [ ] Test a conflict against an unselected existing session and confirm the
  same all-or-nothing result.
- [ ] Confirm selecting more than 100 sessions is rejected.

## 11. Verify stage, publication and audit safety

- [ ] Publish a development timetable snapshot in the development environment.
- [ ] Record its publication ID and its `PublishedTimetableSessions` rows.
- [ ] Bulk-edit at least two active source sessions.
- [ ] Confirm `TimetableCourseState.Stage` changes to `DEVELOPMENT`.
- [ ] Confirm `CurrentPublicationID` remains unchanged.
- [ ] Confirm the recorded published snapshot rows remain byte-for-byte
  unchanged.
- [ ] Confirm each actually changed session has one `BULK_UPDATE` row in
  `AdminAuditLog` with the Admin ID, Admin name, date and changed fields.
- [ ] Confirm a timetable-state audit row is present if the stage changed.
- [ ] Confirm a rejected conflict creates no session update or bulk audit row.
- [ ] Confirm existing hard-delete, soft-delete and restore behaviour remains
  unchanged.

The live timetable still reads from `TeacherAssign`; V102.8.2 does not switch
the authoritative live source.

## 12. Application regressions

- [ ] Confirm normal single-session add and modify behaviour still supports
  multiple days and multiple groups with per-group teacher/Zoom assignments.
- [ ] Confirm course, time-slot, subject, module and task management still load.
- [ ] Confirm GLOBAL_ADMIN can access the course Builder in an authorised course
  context.
- [ ] Confirm TEACHER and SENIOR/SENIOR TEACHER cannot access Timetable Builder.
- [ ] Confirm inaccessible menu items remain hidden for those roles.
- [ ] Confirm Library, PDF split view, Global Subjects, Attendance, Weekly
  Planner and Progress behave as in V102.8.1.
- [ ] Confirm production V101.1 was not deployed or modified.

## 13. Rollback

- [ ] Revert the single V102.8.2 GitHub commit or restore the backed-up V102.8.1
  development source.
- [ ] Wait for both Worker and Pages rollback deployments.
- [ ] Confirm Worker root and `/account/<uniqueid>` return to `102.8.1`.
- [ ] Do not rerun account migration or change any Platform/course schema.
- [ ] Do not delete audit rows created by real development testing.

No schema or migration rollback is required. Timetable data created during
testing should be reversed only through the normal Builder lifecycle if needed.

## Completion record

- Development GitHub commit: ____________________
- Worker deployment ID: ____________________
- Pages deployment ID: ____________________
- Worker version verified: ____________________
- Consecutive single edits completed: ____________________
- Teacher bulk edit tested: ____________________
- Subject/module bulk edit tested: ____________________
- Zoom set/clear tested: ____________________
- Conflict atomicity tested: ____________________
- Published snapshot compared: ____________________
- Audit rows checked: ____________________
- Verified by: ____________________
- Verification date: ____________________
- Result: ____________________
