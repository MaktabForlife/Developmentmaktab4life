# V102.4 update to-do

Use this checklist to apply V102.4 over the verified V102.3 repository.
The supported package is:

`Rebootyourmaktab-V102.4-GITHUB-UPDATE-FROM-V102.3.zip`

It contains only added or changed files. You do not need to upload the whole
repository again.

## 1. Confirm the starting point

- [ ] Confirm the current repository and development deployment are V102.3.
- [ ] Confirm the V102.3 central account migration has already completed.
- [ ] Confirm `UserAccounts` and `UserCourseAccess` contain the migrated rows.
- [ ] Confirm the Platform Sheet validates with schema version `102.0.3`.
- [ ] Confirm `CourseRegistry` has one active `COURSE1` row pointing to the
  development course Sheet.
- [ ] Confirm the Google service account is an Editor of the Platform Sheet and
  the registered course Sheet.
- [ ] Back up the repository, Platform Sheet and development course Sheet.

Do **not** rerun account migration for V102.4. This update creates no Sheet tab,
header or row and requires no new Worker variable, secret, binding or Apps
Script deployment.

## 2. Update the GitHub repository

- [ ] Extract `Rebootyourmaktab-V102.4-GITHUB-UPDATE-FROM-V102.3.zip`.
- [ ] Open its `Rebootyourmaktab-development` folder.
- [ ] Upload every included file to the same path in the existing GitHub
  repository.
- [ ] Replace an existing file when its path already exists and add it when the
  path is new.
- [ ] Preserve all folder names. Do not create a second nested repository
  folder.
- [ ] Do not delete files that are absent from this incremental update.
- [ ] Confirm the root `version.json` and `js/version.json` both say `102.4`.
- [ ] Confirm the root `UPDATE-TODO.md` is this V102.4 checklist.

## 3. Deploy in the required order

- [ ] Deploy the updated `backend/` Worker first, preserving all existing
  settings.
- [ ] Open the Worker root endpoint and confirm it reports version `102.4`.
- [ ] Deploy the complete updated Pages frontend after the Worker succeeds.
- [ ] Hard-refresh the development site or use a private window for the first
  verification.

Do not deploy Pages first. The V102.4 frontend expects
`/api/account/workspace` and course-scoped Worker routing.

## 4. Verify unified Student access

- [ ] Open a migrated Student at
  `https://developmentmaktab4life.pages.dev/account/<existing-uniqueid>`.
- [ ] Enter the existing PIN once.
- [ ] Confirm the Student Home opens automatically; no second PIN screen should
  appear.
- [ ] Open the Profile menu and confirm the course name and Student role/group
  are shown.
- [ ] Confirm normal Student timetable, Library, tasks and progress views load.
- [ ] Confirm the Student remains restricted to her own authorised class/data.
- [ ] In Profile, select **Switch course or role**. Confirm the central context
  page opens without asking for a PIN.
- [ ] Select the Student course and confirm Student Home reopens.

## 5. Verify GlobalAdmin and staff access

- [ ] Open the migrated GLOBAL_ADMIN account through `/account/<uniqueid>`.
- [ ] Confirm the Platform context page appears after login.
- [ ] Select `COURSE1`; confirm the Admin workspace opens without another PIN.
- [ ] Confirm Admin functions still work against the registered COURSE1 Sheet.
- [ ] Confirm Profile shows the course and GLOBAL ADMIN context, then confirm
  **Switch course or role** returns to the central context page.
- [ ] Test one migrated SENIOR or TEACHER account if a PIN is available.
- [ ] Confirm ordinary staff cannot change course access by editing a URL,
  CourseID field or request body.
- [ ] Confirm Teacher views remain limited to the assigned class/group.

## 6. Verify secure routing

- [ ] In browser developer tools, inspect one successful operational API
  response and confirm `X-M4L-Course-ID: COURSE1`.
- [ ] Confirm the response also has the expected `X-M4L-Backend` header.
- [ ] With a test membership only, deactivate its `UserCourseAccess` row and
  confirm the next request is rejected. Reactivate it afterward.
- [ ] With a test course-local profile only, deactivate its matching
  `AdminRecords` or `StudentRecords` row and confirm the next request is
  rejected. Reactivate it afterward.
- [ ] Do not deactivate the only active GLOBAL_ADMIN.
- [ ] Confirm switching context clears old timetable/resource/progress data and
  reloads the selected course.

Every course-scoped request must derive its Sheet from the revalidated central
token and `CourseRegistry`. A submitted CourseID or role is never authority.

## 7. Legacy and regression checks

- [ ] Confirm an existing direct `/admin/<uniqueid>` link can still log in with
  its legacy PIN.
- [ ] Confirm an existing direct `/student/<uniqueid>` link can still log in
  with its legacy PIN.
- [ ] Confirm the current live timetable still reads from `TeacherAssign`.
- [ ] Confirm attendance, weekly planner, resources, tasks and progress retain
  their V102.3 behaviour and restrictions.
- [ ] Confirm Platform validation still succeeds.

## 8. Boundaries that remain after V102.4

- [ ] Do not redirect or retire `/admin/<uniqueid>` or
  `/student/<uniqueid>` yet.
- [ ] Do not remove `AdminRecords`, `StudentRecords`, `TeacherAssign` or
  `TimeTable`.
- [ ] Do not rerun migration merely because a new course-local user is added.
- [ ] Record that course-local Admin/Student registration does not yet create
  the matching central `UserAccounts` and `UserCourseAccess` rows.
- [ ] Record that each Library is course-owned, but per-course Drive-root and
  Apps Script URL routing are not yet implemented. Do not activate a second
  production course's Drive/preview workflow in this release.
- [ ] Record that complete Teacher resource/task/progress write permissions,
  global-curriculum merging, cross-course teacher-conflict indexing, immutable
  publication expansion and published-timetable live reads remain later work.
- [ ] Keep `GOOGLE_SPREADSHEET_ID` as the legacy fallback until legacy routes
  are retired.

## 9. Completion criteria

V102.4 is complete in development only when all of these are true:

- [ ] Worker root reports `102.4`.
- [ ] Student and Admin operational workspaces open from `/account/` after one
  PIN.
- [ ] Profile switching works without another PIN.
- [ ] Invalid/inactive central membership and invalid/inactive local profile
  checks fail closed.
- [ ] Operational API responses identify the authenticated course as
  `COURSE1`.
- [ ] Student and Teacher class restrictions are unchanged.
- [ ] Legacy direct login remains available for rollback.
- [ ] No central account or course data was remigrated, duplicated or deleted.

## 10. Rollback

- [ ] Roll back the Worker and Pages deployments together to V102.3.
- [ ] Do not delete the migrated `UserAccounts`, `UserCourseAccess` or central
  audit rows.
- [ ] Continue using the existing direct Admin and Student links.
- [ ] Preserve all Sheet data written during normal V102.4 application use.

After development verification, the next release should centralise creation of
new accounts/memberships before legacy-login retirement or a second live course
is onboarded.
