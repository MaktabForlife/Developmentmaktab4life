# V102.5 update to-do

Apply V102.5 only over the verified V102.4 development repository using:

`Rebootyourmaktab-V102.5-GITHUB-UPDATE-FROM-V102.4.zip`

This is an incremental update. You do not need to upload the entire repository.
Production remains stable at V101.1 and must not receive this ZIP.

## 1. Confirm and back up the development baseline

- [ ] Confirm development currently reports V102.4.
- [ ] Confirm GLOBAL_ADMIN and Student unified login still work.
- [ ] Confirm the central account migration is already complete.
- [ ] Back up the development source repository.
- [ ] Back up the development Platform Sheet.
- [ ] Back up the development course Sheet.
- [ ] Confirm `PlatformConfig!B3` currently contains exactly `102.0.3`.

Do not rerun account migration for V102.5.

## 2. Prepare the Platform Sheet while V102.4 remains live

- [ ] Create a new tab named exactly `UserGlobalSubjectAccess`.
- [ ] Paste the supplied
  `docs/V102-UserGlobalSubjectAccess-template.csv` header into
  `UserGlobalSubjectAccess!A1:J1`.
- [ ] Confirm the exact header values are:

```text
SubjectAccessID,AccountID,SubjectID,Active,CreatedDate,CreatedByAccountID,CreatedByAccountName,ModifiedByAccountID,ModifiedByAccountName,ModifiedDate
```

- [ ] Create a new tab named exactly `GlobalResources`.
- [ ] Paste the supplied `docs/V102-GlobalResources-template.csv` header into
  `GlobalResources!A1:P1`.
- [ ] Confirm the exact header values are:

```text
ResourceID,SubjectID,ModuleID,TaskID,ResourceName,ResourceType,ResourceFormat,ResourceDescription,ResourceLink,Active,CreatedDate,CreatedByAccountID,CreatedByAccountName,ModifiedByAccountID,ModifiedByAccountName,ModifiedDate
```

- [ ] Leave every cell from row 2 downward empty in both new tabs.
- [ ] Do not create a `UserSubscriptions` tab.
- [ ] Leave the existing live `TeacherScheduleIndex` tab untouched for
  rollback.
- [ ] Keep `PlatformConfig!B3` at `102.0.3` until the V102.5 Worker is deployed.

The V102.4 Worker ignores the two extra tabs, so preparing them first does not
interrupt the current application.

## 3. Update the GitHub repository

- [ ] Extract
  `Rebootyourmaktab-V102.5-GITHUB-UPDATE-FROM-V102.4.zip`.
- [ ] Open the contained `Rebootyourmaktab-development` folder.
- [ ] Upload every included file to its matching path in the existing GitHub
  repository.
- [ ] Replace existing files and add new files while preserving folder names.
- [ ] Delete the obsolete repository file
  `docs/V102-TeacherScheduleIndex-template.csv` as instructed in
  `DELETE-FILES.txt`.
- [ ] Do not delete any other repository file.
- [ ] Confirm root `version.json` and `js/version.json` both say `102.5`.
- [ ] Confirm this V102.5 `UPDATE-TODO.md` is present at repository root.

## 4. Deploy the Worker before changing the schema-version cell

- [ ] Deploy the updated development `backend/` Worker with all existing
  variables and secrets preserved.
- [ ] Confirm the Worker root endpoint reports version `102.5`.
- [ ] Confirm one existing `/account/<uniqueid>` login still works while
  `PlatformConfig!B3` remains `102.0.3`.

The V102.5 account code accepts both `102.0.3` and `102.0.4` during this
controlled transition. **Validate Platform Sheet** is expected to report a
schema-version error until the next step is complete.

## 5. Activate Platform schema 102.0.4

- [ ] Change only `PlatformConfig!B3` from `102.0.3` to `102.0.4`.
- [ ] Do not change `PlatformConfig!B2` (`AccountLoginBaseUrl`).
- [ ] Do not change `PlatformConfig!B4` (`GlobalCurriculumVersion`) merely for
  this schema installation.
- [ ] Sign in as GLOBAL_ADMIN or authorised ADMIN.
- [ ] Open **System Settings → Validate Platform Sheet**.
- [ ] Confirm validation reports ready with `10 required tabs`.
- [ ] Confirm the active-course and central-account counts remain unchanged.
- [ ] Confirm it reports `0 global-subject subscriptions` because the new tab
  is intentionally empty.
- [ ] Resolve every header or reference error before continuing.

For the current development data, the expected message should begin similarly
to:

```text
Ready: 10 required tabs, 1 active course, 33 central accounts, 0 global-subject subscriptions.
```

The account count may differ only if authorised accounts were deliberately
added after the original migration.

## 6. Deploy the complete Pages frontend

- [ ] Deploy the complete updated Pages frontend after Platform validation
  succeeds.
- [ ] Hard-refresh or use a private window.
- [ ] Confirm the account page displays `V102.5`.
- [ ] Confirm the Admin System Settings validation message uses
  `required tabs` and includes the global-subject subscription count.

## 7. Regression verification

- [ ] Confirm GLOBAL_ADMIN can sign in and enter `COURSE1` without another PIN.
- [ ] Confirm a migrated Student can sign in and reach Student Home without
  another PIN.
- [ ] Confirm **Profile → Switch course or role** still works.
- [ ] Confirm timetable, Library, attendance, planners, tasks and progress have
  the same V102.4 behaviour.
- [ ] Confirm direct legacy `/admin/` and `/student/` links remain available.
- [ ] Confirm the live timetable still reads from `TeacherAssign`.
- [ ] Confirm no Platform account, course-access or audit row was duplicated or
  deleted.

V102.5 adds no timetable, teacher-overlap or subscription-limit check.

## 8. Subscription-model boundaries

- [ ] Treat an active `UserCourseAccess` row with `Role=STUDENT` as the course
  subscription; do not duplicate it elsewhere.
- [ ] Do not manually add global-subject access rows until global subjects and
  the management workflow are deliberately introduced.
- [ ] Do not copy course resources into `GlobalResources`.
- [ ] Do not add payment, expiry or renewal information to authorization rows
  in this release.
- [ ] Do not expect a global-subject-only account to receive a learner landing
  page yet.
- [ ] Do not remove `TeacherScheduleIndex` from the live Platform Sheet during
  this rollback period; it is simply ignored by V102.5.
- [ ] Do not onboard a second production course or modify production V101.1.

## 9. Completion criteria

V102.5 is complete in development only when:

- [ ] Worker root reports `102.5`.
- [ ] `PlatformConfig!B3` is exactly `102.0.4`.
- [ ] `UserGlobalSubjectAccess!A1:J1` and `GlobalResources!A1:P1` match the
  supplied templates exactly.
- [ ] Platform validation reports ten required tabs and no errors.
- [ ] Existing GLOBAL_ADMIN and Student unified login still work.
- [ ] Existing course operations behave exactly as in V102.4.
- [ ] No migration was rerun and no new access/resource data was fabricated.
- [ ] Production remains unchanged at V101.1.

## 10. Rollback to V102.4

Perform rollback in this order:

- [ ] Change `PlatformConfig!B3` back to `102.0.3` first.
- [ ] Roll back the Worker to V102.4.
- [ ] Roll back the Pages frontend to V102.4.
- [ ] Leave the empty `UserGlobalSubjectAccess` and `GlobalResources` tabs in
  place; V102.4 ignores extra tabs.
- [ ] Leave `TeacherScheduleIndex` in place.
- [ ] Do not delete or restore any account, membership, curriculum, course or
  audit data.

The next subscription release can build Admin management and learner delivery
only after this schema validates and V102.4 operational regressions pass.
