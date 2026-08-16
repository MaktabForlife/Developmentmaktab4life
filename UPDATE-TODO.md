# V102.8 update to-do

Apply V102.8 only over the deployed V102.7 development repository using:

`Rebootyourmaktab-V102.8-GITHUB-UPDATE-FROM-V102.7.zip`

This is a modified-files overlay, not a complete repository. Production remains
stable at V101.1 and must not receive this ZIP. A separate, rehearsed production
merge will be prepared after the V102 development programme is complete.

## 1. Confirm and back up V102.7

- [ ] Confirm the development Worker root reports `102.7`.
- [ ] Confirm `/account/<uniqueid>` displays `V102.7`.
- [ ] Back up the development GitHub repository.
- [ ] Export or back up the Platform Sheet and current course Sheet.
- [ ] If a second course is already registered, export or back up that course
  Sheet too.
- [ ] Confirm `PlatformConfig!B3` remains `102.0.4`.
- [ ] Record the current `GlobalCurriculumVersion` value.

Do not rerun account migration. V102.8 adds no Platform tab, header or data row
and does not change Platform schema `102.0.4`.

## 2. Confirm Library prerequisites

- [ ] Confirm every course that should appear has one active, unique
  `CourseRegistry` row with its correct `CourseID`, `CourseName` and
  `SpreadsheetID`.
- [ ] Confirm the Worker service account can read each registered course Sheet.
- [ ] Confirm every ordinary account has only the intended active
  `UserCourseAccess` rows and each row has the correct `CourseRecordID`.
- [ ] Confirm subscribed global subjects have active
  `UserGlobalSubjectAccess` rows.
- [ ] Confirm each course-local `StudentRecords`/`AdminRecords` identity still
  matches the central account UniqueID and role.

V102.8 uses the existing course Library Drive root for protected course files.
If course files are stored in separate subfolders, those folders must currently
be descendants of `M4L_GOOGLE_DRIVE_ROOT_FOLDER_ID`. The central Global
Resources folder remains independently configured in `PlatformConfig`.

## 3. Update the GitHub development repository

- [ ] Extract `Rebootyourmaktab-V102.8-GITHUB-UPDATE-FROM-V102.7.zip`.
- [ ] Upload every included file to its matching path in the existing V102.7
  development repository.
- [ ] Replace existing files and add new files while preserving folder names.
- [ ] Do not delete any repository file; `DELETE-FILES.txt` confirms none.
- [ ] Confirm root `version.json` and `js/version.json` both contain `102.8`.
- [ ] Confirm `backend/package.json` and the Worker root version are `102.8`.
- [ ] Confirm this `UPDATE-TODO.md` is present at repository root.
- [ ] Commit the complete overlay as one revision.

Cloudflare may deploy Worker and Pages immediately after the GitHub commit. Do
not start application testing until both deployments from the same commit have
completed.

## 4. Confirm deployment

- [ ] Wait for both Worker and Pages deployments to finish successfully.
- [ ] Preserve every existing Worker variable, secret and binding.
- [ ] Confirm the Worker root reports `102.8`.
- [ ] Hard-refresh Pages or use a private window.
- [ ] Confirm `/account/<uniqueid>` displays `V102.8`.
- [ ] Confirm GLOBAL_ADMIN, ordinary staff and Student unified login still work.
- [ ] Confirm direct legacy links remain available for rollback testing.

No Cloudflare variable, secret, binding, Apps Script deployment or Sheet schema
change is required.

## 5. Verify direct Profile switching

- [ ] Sign in through `/account/<uniqueid>` with an account that has at least
  two contexts.
- [ ] Open the application menu and select **Profile**.
- [ ] Confirm the card shows name, every authorised course/role, and the current
  context.
- [ ] Select another course or role directly from the Profile card.
- [ ] Confirm no PIN is requested.
- [ ] Confirm the application opens the correct Admin or Student workspace.
- [ ] Reopen Profile and confirm the new context is marked **Current**.
- [ ] Confirm menu items are recalculated for the new role.
- [ ] Confirm course-specific timetable, progress and user-data caches do not
  show data from the previous context.

Every switch must call the central switch endpoint and receive a new scoped
token. A displayed course name, submitted CourseID or URL must never grant
access by itself.

## 6. Verify the unified Library selector

- [ ] Open **Library** from a unified account workspace.
- [ ] Confirm there is one Library menu item, not separate course/global Library
  menu items.
- [ ] Confirm the source selector appears in this order:
  1. **All**
  2. each authorised active course in `CourseRegistry` row order
  3. **Global Subjects** when the account has at least one active subscription.
- [ ] Confirm **All** shows all authorised course Libraries followed by the
  subscribed Global Subjects Library.
- [ ] Select each course and confirm only that course's Library is shown.
- [ ] Select **Global Subjects** and confirm only subscribed global subjects and
  their active resources are shown.
- [ ] Confirm changing the Library source does not change the Profile's current
  operational course/role.
- [ ] Confirm global sections display a clear `GLOBAL` badge.

GLOBAL_ADMIN should see every active registered course Library. Ordinary users
must see only courses supported by their active central memberships.

## 7. Verify per-course and subscription restrictions

- [ ] Sign in as a Student who belongs to two courses with different groups.
- [ ] Confirm each course Library uses that course's own StudentRecords group.
- [ ] Confirm the Student sees resources for `ALL` and the matching group only.
- [ ] Confirm a resource for another group is absent.
- [ ] Sign in as SENIOR/SENIOR TEACHER or TEACHER and confirm Library access is
  available without exposing Student Records.
- [ ] Deactivate one `UserCourseAccess` row, sign in again, and confirm that
  course disappears.
- [ ] Reactivate it only after the negative test is complete.
- [ ] Deactivate one direct global-subject subscription and confirm that subject
  disappears after refresh/new session.
- [ ] Confirm inactive subjects, modules, tasks and resources are absent.

## 8. Verify protected resource opening

- [ ] From **All**, open one protected Reboot course resource.
- [ ] If another course is registered, open one protected resource from it.
- [ ] Open one subscribed protected Global Resource.
- [ ] Confirm each opens through a short-lived Worker access URL.
- [ ] Confirm an unauthorised course resource request is rejected.
- [ ] Confirm an unsubscribed global resource is absent and direct access is
  rejected.
- [ ] Confirm no SpreadsheetID is returned to the browser in the Library
  catalogue response.

## 9. Verify a global-subject-only account when available

- [ ] Use an active account that has no course memberships and at least one
  active global-subject subscription.
- [ ] Sign in through `/account/<uniqueid>`.
- [ ] Confirm it opens the Global Library directly.
- [ ] Confirm Home, Attendance, Progress and Admin operational menus are hidden.
- [ ] Confirm only subscribed active global content is visible.
- [ ] Deactivate the subscription temporarily and confirm the scoped session no
  longer opens the Global Library.

Skip this section if no global-only test account exists yet.

## 10. Regression checks

- [ ] Confirm existing course resource creation remains available to ADMIN,
  SENIOR and TEACHER under the established permissions.
- [ ] Confirm only ADMIN can modify an existing course resource.
- [ ] Confirm SENIOR and TEACHER cannot see Student Records.
- [ ] Confirm `SENIOR` continues to display as `SENIOR TEACHER` without changing
  the stored role.
- [ ] Confirm Attendance, Weekly Planner, Progress and timetable behaviour are
  unchanged in the active course context.
- [ ] Confirm Global Curriculum management and subscription counts remain
  correct.
- [ ] Confirm `GlobalCurriculumVersion` did not change merely because V102.8
  was deployed or a Library source was selected.

The approved all-user browser-session authentication policy remains documented
in `docs/V102-AUTHENTICATION-SESSION-POLICY.md`; V102.8 does not change the
current session-persistence behaviour.

## 11. Rollback

- [ ] Revert the V102.8 GitHub commit or redeploy the backed-up V102.7 source.
- [ ] Confirm Worker and Pages both return to `102.7`.
- [ ] Do not rerun account migration.
- [ ] Do not delete central memberships, subscriptions, global resources or
  audit rows during rollback.
- [ ] Do not reduce `GlobalCurriculumVersion` manually.

V102.7 ignores the new frontend/API routes after the source rollback; no data
rollback is required because V102.8 adds no schema or migration.

## Completion record

- Development GitHub commit: ____________________
- Worker deployment ID: ____________________
- Pages deployment ID: ____________________
- Worker version verified: ____________________
- Profile switch contexts tested: ____________________
- Library courses tested: ____________________
- Global subjects/resources tested: ____________________
- Global-only account tested or N/A: ____________________
- Verified by: ____________________
- Verification date: ____________________
- Result: ____________________
