# V102.8.1 update to-do

Apply V102.8.1 only over the deployed V102.8 development repository using:

`Rebootyourmaktab-V102.8.1-GITHUB-UPDATE-FROM-V102.8.zip`

This ZIP is a modified-files overlay, not a complete repository. Production
remains stable at V101.1 and must not receive this update. V102.8.1 is a focused
Library/Profile/PDF correction; it does not begin the V102.9 timetable
integrator.

## 1. Confirm and back up V102.8

- [ ] Confirm the development Worker root reports `102.8`.
- [ ] Confirm `/account/<uniqueid>` displays `V102.8`.
- [ ] Confirm V102.8 unified login and Library currently open.
- [ ] Back up the current development GitHub repository or branch.
- [ ] Record the current Worker and Pages deployment IDs.
- [ ] Export or back up the Platform Sheet and active course Sheet(s).
- [ ] Confirm `PlatformConfig` still reports schema `102.0.4`.

Do not rerun account migration. Do not add, remove or rename a Sheet tab or
header. V102.8.1 adds no Sheet data and does not change
`GlobalCurriculumVersion` merely by being deployed.

## 2. Confirm the test account and subscription

Use one ordinary non-GLOBAL_ADMIN account that has both:

- [ ] an active `UserCourseAccess` row for a registered active course; and
- [ ] an active `UserGlobalSubjectAccess` row referencing an active row in
  `GlobalSubjectList`.

Record its expected course/role and subscribed global subjects before updating.
The Profile correction depends on both the access row and referenced subject
being active. No manual Profile row is required.

## 3. Apply the GitHub overlay

- [ ] Extract `Rebootyourmaktab-V102.8.1-GITHUB-UPDATE-FROM-V102.8.zip`.
- [ ] Upload every included file to the matching path in the existing V102.8
  development repository.
- [ ] Replace existing files and add the new documentation file while
  preserving all folder names.
- [ ] Do not delete any repository file; `DELETE-FILES.txt` confirms none.
- [ ] Confirm root `UPDATE-TODO.md` is this V102.8.1 checklist.
- [ ] Confirm root `version.json` and `js/version.json` both contain `102.8.1`.
- [ ] Confirm `backend/package.json` contains `102.8.1`.
- [ ] Commit the entire overlay as one development revision.

Cloudflare may deploy Worker and Pages immediately after the GitHub commit.
Wait until both deployments from the same commit finish before testing. Do not
change or remove existing Worker variables, secrets or bindings.

## 4. Confirm deployment versions

- [ ] Confirm the Worker deployment succeeds and its root reports `102.8.1`.
- [ ] Confirm the Pages deployment succeeds.
- [ ] Hard-refresh Pages or open a private window.
- [ ] Confirm `/account/<uniqueid>` displays `V102.8.1`.
- [ ] Confirm GLOBAL_ADMIN, ordinary staff and Student unified login still work.
- [ ] Confirm existing legacy login links remain available for rollback tests.

No Apps Script deployment is required. No Platform Sheet, course Sheet,
Cloudflare variable, secret or binding change is required.

## 5. Verify Global Subjects in Profile

- [ ] Sign in through `/account/<uniqueid>` using the prepared account with both
  course access and a global-subject subscription.
- [ ] Confirm the fresh login still opens its highest-authority course context;
  it must not automatically replace that course with the lower STUDENT global
  context.
- [ ] Open the application menu and select **Profile**.
- [ ] Confirm the Profile shows the current course/role.
- [ ] Confirm it also shows exactly one **Global Subjects — STUDENT** choice.
- [ ] Confirm individual global subject names are not duplicated in Profile.
- [ ] Select **Global Subjects** and confirm no PIN is requested.
- [ ] Confirm the restricted Global Library workspace opens.
- [ ] Reopen Profile and confirm **Global Subjects** is marked **Current** and
  the course context remains available to switch back to.
- [ ] Switch back to the course and confirm a newly scoped course workspace
  opens without another PIN.

Every Profile switch must use the central switch endpoint and receive a new
validated scope/role token. A displayed name, URL or submitted CourseID must not
grant access by itself.

## 6. Verify fail-closed Global Subjects access

- [ ] Temporarily deactivate the prepared account's global-subject access row.
- [ ] Start a new login/session and confirm **Global Subjects** disappears from
  Profile if the account has no other active global subscriptions.
- [ ] Reactivate the row after the negative test.
- [ ] Temporarily inactivate its referenced global subject and confirm the same
  fail-closed result.
- [ ] Reactivate the subject after the test and confirm the Profile context
  returns on a fresh session.
- [ ] Confirm a global-only subscriber still logs directly into the restricted
  Global Library, if such a test account exists.

## 7. Verify the all-visible Library source pill

- [ ] Open **Library** from an account authorised for more than one source.
- [ ] Confirm one segmented pill displays all eligible choices together, in
  this order: **All**, each authorised active course, **Global Subjects**.
- [ ] Confirm desktop/tablet shows the choices in one horizontal row when they
  fit.
- [ ] At a compact width, confirm the choices wrap inside the same pill and no
  option requires a dropdown or horizontal scrolling.
- [ ] Select **All** and confirm all authorised course resources plus subscribed
  active global resources appear.
- [ ] Select each course and confirm only that course's Library appears.
- [ ] Select **Global Subjects** and confirm only subscribed active global
  content appears.
- [ ] Confirm changing a Library filter does not change the Profile's current
  operational course/role.
- [ ] Confirm global content retains its clear `GLOBAL` badge.

## 8. Verify protected resource access

- [ ] Open a protected PDF from the current course Library.
- [ ] Open a subscribed protected Global Resource.
- [ ] If another course is authorised, open one protected resource from it.
- [ ] Confirm each item receives its own short-lived authorised access URL.
- [ ] Confirm an unsubscribed global resource is absent and direct access is
  rejected.
- [ ] Confirm an unauthorised course resource is absent and direct access is
  rejected.
- [ ] Confirm no SpreadsheetID is exposed in the catalogue response or UI.

## 9. Verify PDF shelf placement

Repeat for a Student and one staff account:

- [ ] Open a Library containing at least two PDFs.
- [ ] Open one PDF in the PDF.js viewer.
- [ ] Confirm the `current/total` shelf selector sits immediately to the left of
  the PDF name.
- [ ] Confirm **Previous** and **Next** remain in the navigation group to the
  right.
- [ ] Confirm the shelf selector still opens the authorised PDF list.
- [ ] Confirm Previous/Next and direct Open continue to work.

## 10. Verify Student split-PDF viewing

- [ ] Sign in as a Student whose selected Library catalogue contains at least
  two authorised PDFs.
- [ ] At a viewport width of 1024px or more, open a PDF and confirm **Split** is
  available.
- [ ] Open the second pane and choose another authorised PDF.
- [ ] Confirm both PDFs load independently and retain independent page/zoom
  state.
- [ ] Confirm the pane divider can resize the two views.
- [ ] From **All**, test a permitted cross-source pair when available (for
  example one course PDF and one subscribed global PDF).
- [ ] Confirm closing the second pane returns to the normal single-PDF view.
- [ ] Below 1024px, confirm the Split control is not shown and the normal
  single-PDF viewer remains usable.
- [ ] Confirm Student receives no resource create, modify or delete control.

## 11. Permission and application regressions

- [ ] Confirm SENIOR displays as **SENIOR TEACHER** without changing the stored
  `SENIOR` role.
- [ ] Confirm SENIOR and TEACHER can add course resources under the established
  permissions.
- [ ] Confirm only ADMIN can modify existing course resources.
- [ ] Confirm SENIOR and TEACHER cannot see Student Records.
- [ ] Confirm inaccessible menu items remain hidden for the active role.
- [ ] Confirm Attendance, Weekly Planner, Progress and timetable behaviour are
  unchanged in a course context.
- [ ] Confirm Global Curriculum management and the six existing subscription
  rows remain unchanged.
- [ ] Confirm `GlobalCurriculumVersion` was not incremented by deployment,
  Profile switching or Library filtering.

The approved all-user authentication policy remains documented in
`docs/V102-AUTHENTICATION-SESSION-POLICY.md`; V102.8.1 does not change the
current browser-session persistence behaviour.

## 12. Rollback

- [ ] Revert the single V102.8.1 GitHub commit or restore the backed-up V102.8
  source.
- [ ] Wait for both Worker and Pages rollback deployments.
- [ ] Confirm the Worker root and `/account/<uniqueid>` return to `102.8`.
- [ ] Do not rerun account migration.
- [ ] Do not delete or edit central accounts, memberships, subscriptions,
  curriculum, resources or audit rows as part of rollback.
- [ ] Do not reduce `GlobalCurriculumVersion` manually.

No data rollback is required because V102.8.1 changes no schema or stored data.

## Completion record

- Development GitHub commit: ____________________
- Worker deployment ID: ____________________
- Pages deployment ID: ____________________
- Worker version verified: ____________________
- Dual course/global Profile account tested: ____________________
- Library pill sources tested: ____________________
- Student split-PDF pair tested: ____________________
- Staff PDF shelf placement tested: ____________________
- Negative entitlement test completed: ____________________
- Verified by: ____________________
- Verification date: ____________________
- Result: ____________________
