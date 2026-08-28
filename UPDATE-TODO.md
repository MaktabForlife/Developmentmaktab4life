# V102.10 update TODO — global-subject access matrix, policies and scheduled runs

Complete in order. Development starts from the complete deployed V102.9.1 repository. Production V101.1 remains untouched.

## 1. Confirm starting point

- [ ] Development Worker root reports `102.9.1`.
- [ ] GitHub development branch matches the deployed V102.9.1 source.
- [ ] Production V101.1 remains untouched.
- [ ] Back up the complete central Platform Sheet.
- [ ] Do not republish/reactivate/rollback a course timetable for V102.10.

## 2. Prepare all three additive Platform tabs while B3 stays 102.0.4

Follow `V102.10-PLATFORM-SHEET-MIGRATION.md` exactly.

- [ ] Record `PlatformConfig!B3`, B4 and B5 when present.
- [ ] Create `GlobalSubjectAccessMatrix`.
- [ ] Set A1 exactly to `AccountID`.
- [ ] Add B1 onward from the live `GlobalSubjectList.SubjectID` values, exactly once each.
- [ ] Add exactly one row per `UserAccounts.AccountID`.
- [ ] Seed TRUE from active legacy `UserGlobalSubjectAccess` account+subject pairs and FALSE otherwise.
- [ ] Convert any seed formulas to explicit TRUE/FALSE values.
- [ ] Leave legacy `UserGlobalSubjectAccess` unchanged.
- [ ] Create `GlobalSubjectAccessPolicy` with the exact A1:J1 template.
- [ ] Add exactly one active `SUBSCRIPTION` policy for every existing global subject.
- [ ] Use `GSPOL-<UUID>` IDs; never create per-user rows for FREE access.
- [ ] Create `GlobalSubjectRuns` with the exact A1:M1 template.
- [ ] Do not manufacture historical run rows.
- [ ] Confirm `PlatformConfig!B3` is still `102.0.4`.

V102.9.1 ignores these three additive tabs, making Sheet-first preparation safe.

## 3. Apply the changed-files overlay

- [ ] Extract `Rebootyourmaktab-V102.10-GITHUB-UPDATE-FROM-V102.9.1.zip`.
- [ ] Copy every included file to its matching path in deployed V102.9.1 development.
- [ ] Delete only paths listed in `DELETE-FILES.txt`.
- [ ] Confirm `version.json`, `js/version.json`, `backend/package.json` and Worker root report `102.10`.
- [ ] Confirm Platform schema code requires 13 tabs.
- [ ] Commit Pages + Worker together in one GitHub commit and push that one commit.

## 4. Confirm same-commit deployment before schema flip

- [ ] Worker root reports `102.10`.
- [ ] Cloudflare Pages and Worker are from the same GitHub commit.
- [ ] Hard refresh/private window shows V102.10.
- [ ] GLOBAL_ADMIN and course ADMIN central login still work.
- [ ] Do not change B3 until all checks above pass.

## 5. Advance schema

- [ ] Change `PlatformConfig!B3` from `102.0.4` to `102.0.5`.
- [ ] Do not manually change `GlobalCurriculumVersion`.
- [ ] Run Platform validation.
- [ ] Confirm schema `102.0.5` and **13 required tabs**.
- [ ] Confirm one matrix row per central account and one SubjectID column per global subject.
- [ ] Confirm all matrix entitlement cells are explicit TRUE/FALSE.
- [ ] Confirm one active FREE/SUBSCRIPTION policy per subject.
- [ ] Confirm no invalid run dates/timezones/references.

## 6. Verify access matrix and FREE/SUBSCRIPTION

- [ ] Existing migrated subjects begin SUBSCRIPTION.
- [ ] Matrix TRUE grants SUBSCRIPTION subject/resource access.
- [ ] Matrix FALSE denies that SUBSCRIPTION subject/resource access.
- [ ] Access Matrix UI shows one row per account and one column per global subject.
- [ ] Toggle a SUBSCRIPTION checkbox and confirm the single matrix cell changes.
- [ ] Confirm the toggle writes PlatformAuditLog but does not change GlobalCurriculumVersion.
- [ ] Change a safe subject to FREE in Delivery.
- [ ] Confirm every active account can access it even with matrix FALSE.
- [ ] Confirm FREE cells are not editable and no per-user access rows are created.
- [ ] Confirm protected Drive resource opens for FREE access.
- [ ] Change FREE back to SUBSCRIPTION and confirm saved matrix flags resume control.
- [ ] Confirm legacy `UserGlobalSubjectAccess` remains unchanged.

## 7. Verify automatic matrix maintenance

- [ ] Create a new global subject through Global Curriculum.
- [ ] Confirm it receives an active SUBSCRIPTION policy.
- [ ] Confirm its SubjectID is added as a new matrix column.
- [ ] Confirm every existing matrix account row receives FALSE in that new column.
- [ ] When testing central account migration, confirm each newly created account receives one matrix row defaulted FALSE across current subjects.

## 8. Verify scheduled runs

- [ ] Future run derives UPCOMING.
- [ ] Today inside StartDate/EndDate inclusive derives CURRENT in the run timezone.
- [ ] EndDate before StartDate is rejected.
- [ ] Invalid timezone is rejected.
- [ ] Inactive run does not contribute CURRENT/UPCOMING.
- [ ] Library priority is CURRENT → UPCOMING → PAST → NOT SCHEDULED.
- [ ] Ending/deactivating a run does not revoke policy-based resource access.

## 9. Verify Global Curriculum / protected resources

- [ ] Existing Subjects, Modules, Tasks and Resources still work.
- [ ] Access Matrix works.
- [ ] Protected V102.7 Global Resources Drive browser works unchanged.
- [ ] Delivery saves FREE/SUBSCRIPTION and run mutations.
- [ ] Policy/run changes create PlatformAuditLog rows and update GlobalCurriculumVersion.
- [ ] No-op saves do not create unnecessary changes.

## 10. Focused regressions

- [ ] Unified Library source switching works.
- [ ] Course Library authorization/protected files work.
- [ ] Profile course/role switching works without another PIN.
- [ ] TEACHER retains complete read-only selected-course timetable, Zoom only on own sessions.
- [ ] Student timetable group filtering unchanged.
- [ ] Attendance, Progress, Weekly Planner and Student Records permissions unchanged.
- [ ] Attendance carry-forward: mark at least one student Absent, save successfully, and confirm the on-screen register resets all loaded students to Present; confirm a failed save does not reset marks.
- [ ] PDF split view works.
- [ ] Production V101.1 unchanged.

## 11. Rollback if required

- [ ] If B3 is `102.0.5`, change it back to `102.0.4` **first**.
- [ ] Revert the one V102.10 GitHub commit.
- [ ] Confirm Pages + Worker return together to V102.9.1.
- [ ] Leave the three additive V102.10 tabs in place; V102.9.1 ignores them.
- [ ] Confirm V102.9.1 resumes using unchanged legacy `UserGlobalSubjectAccess`.
- [ ] Remember matrix-only entitlement changes made after migration are not read by V102.9.1 after rollback.

## Completion record

- Platform Sheet backup: ____________________
- Development GitHub commit: ____________________
- Worker deployment ID: ____________________
- Pages deployment ID: ____________________
- Worker version verified: ____________________
- Platform schema 102.0.5 verified: ____________________
- Matrix/FREE/SUBSCRIPTION checks: ____________________
- Run-status checks: ____________________
- Protected Drive checks: ____________________
- Regression checks: ____________________
- Verification date/result: ____________________
