# V102.9.1 update TODO — timetable display correction

Complete this checklist in order. Production remains stable at V101.1 and must
not be changed during this development deployment.

## 1. Confirm the starting point

- [ ] Confirm development currently reports `102.9` before applying this overlay.
- [ ] Confirm V102.9 has already been deployed and its published timetable is
  already in the intended live/rollback state.
- [ ] Do not republish, reactivate or roll back the timetable for this correction.
- [ ] Do not rerun account migration.
- [ ] A full repository upload is not required.

## 2. Apply the modified-files overlay

- [ ] Extract `Rebootyourmaktab-V102.9.1-GITHUB-UPDATE-FROM-V102.9.zip`.
- [ ] Copy every file into the matching path of the existing development repo.
- [ ] Replace files when prompted and retain the directory structure.
- [ ] Confirm `DELETE-FILES.txt` states that no files are deleted.
- [ ] Confirm `version.json`, `js/version.json` and `backend/package.json` all
  report `102.9.1`.
- [ ] Commit the complete overlay as one development revision.

Cloudflare may deploy Worker and Pages immediately. Wait for both deployments
from the same commit before application testing.

## 3. Confirm deployment

- [ ] Confirm the Worker root reports `102.9.1`.
- [ ] Confirm Pages deployed from the same GitHub commit.
- [ ] Hard-refresh or use a private browser window.
- [ ] Confirm `/account/<uniqueid>` displays `V102.9.1`.
- [ ] Confirm GLOBAL_ADMIN, course ADMIN, SENIOR TEACHER, TEACHER and Student can
  still sign in.

## 4. Verify Timetable Builder control sizing

At desktop width, open **Admin → Timetable Builder** and confirm:

- [ ] **Review / Roll Back** and **Publish Timetable** are compact controls and
  do not stretch across or push content off the page.
- [ ] The publication status explanation remains horizontally readable.
- [ ] All Timetable Builder section tabs fit and remain selectable.
- [ ] The course selector, **New Course** and **Edit Course** fit on the same
  control row when space permits.
- [ ] Weekly-session controls such as **Select**, **Show inactive** and bulk
  actions fit on screen and wrap when needed.
- [ ] Add, modify, select, bulk edit, delete, restore, review, publish and
  rollback behavior is unchanged.

At tablet and phone widths:

- [ ] The same controls wrap onto additional lines without horizontal overflow.
- [ ] Button labels remain readable and touch targets remain usable.
- [ ] No Timetable Builder dialog or grid action is clipped.

## 5. Verify the TEACHER timetable view

Sign in as a TEACHER with at least one assigned session:

- [ ] The complete current published timetable for the selected course is visible.
- [ ] The teacher's own sessions remain prominent.
- [ ] Other teachers' sessions remain visible but muted.
- [ ] The teacher can use the Zoom action only for her own assigned sessions.
- [ ] Other teachers' Zoom links are not exposed.
- [ ] Timetable Builder write, publish, activation and rollback controls remain
  unavailable to TEACHER.

Confirm the scope did not expand elsewhere:

- [ ] Attendance remains limited to assigned classes.
- [ ] Progress remains limited to assigned classes.
- [ ] Weekly Planner creation/viewing remains limited to assigned classes.
- [ ] Student Records remains inaccessible to TEACHER and SENIOR TEACHER.

## 6. Verify other timetable roles

- [ ] A Student sees her authenticated group plus `ALL` sessions only.
- [ ] ADMIN retains the complete selected-course timetable and all authorised
  Builder controls.
- [ ] SENIOR TEACHER retains the existing oversight timetable and no new Admin
  permission.
- [ ] Per-session Zoom overrides and the course-default Zoom fallback still work.
- [ ] Draft isolation, immutable publication history and the selected live source
  remain unchanged.

## 7. Regression checks

- [ ] Profile course/role switching works without another PIN.
- [ ] Inaccessible menu items remain hidden by role.
- [ ] Library source pill, Global Subjects and protected resources still work.
- [ ] Student PDF split view still works.
- [ ] Global Curriculum and subscriptions remain unchanged.
- [ ] Production V101.1 was not deployed or modified.

## 8. Data and configuration boundary

- [ ] Do not add, remove or edit Platform Sheet tabs or headers.
- [ ] Do not add, remove or edit course Sheet tabs or headers.
- [ ] Keep Platform schema `102.0.4` and course schema `101.4.4` unchanged.
- [ ] Do not change Worker variables, secrets, bindings or Apps Script.
- [ ] Do not change `TimetableLiveSource` merely to install this correction.

## 9. Review the next-stage plan only

- [ ] Read `docs/V102.10-ACADEMY-TIMETABLE-PLAN.md`.
- [ ] Do not create the proposed academy schedule index or Sheet headers during
  V102.9.1 installation.
- [ ] Do not enable an academy-wide timetable until its schema and visibility
  decisions are confirmed for the next release.

## 10. Code rollback if required

- [ ] Revert the single V102.9.1 GitHub commit.
- [ ] Wait for Worker and Pages to return to V102.9 from the same commit.
- [ ] Do not restore or edit either Google Sheet; V102.9.1 has no Sheet migration.
- [ ] Do not republish, reactivate or roll back the timetable solely for code
  rollback.

## Completion record

- Development GitHub commit: ____________________
- Worker deployment ID: ____________________
- Pages deployment ID: ____________________
- Worker version verified: ____________________
- Timetable Builder sizing tested by: ____________________
- TEACHER complete timetable tested by: ____________________
- Attendance/Progress/Weekly Planner restrictions checked by: ____________________
- Student/ADMIN/SENIOR TEACHER views tested by: ____________________
- Verification date: ____________________
- Result: ____________________
