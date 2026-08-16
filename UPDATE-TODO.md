# V102.6 update to-do

Apply V102.6 only over the verified V102.5 development repository using:

`Rebootyourmaktab-V102.6-GITHUB-UPDATE-FROM-V102.5.zip`

This is an incremental update. You do not need to upload the entire repository.
Production remains stable at V101.1 and must not receive this ZIP.

## 1. Confirm and back up V102.5

- [ ] Confirm the development Worker root reports `102.5`.
- [ ] Confirm the account page displays `V102.5`.
- [ ] Confirm **Validate Platform Sheet** reports:

```text
Ready: 10 required tabs, 1 active course, 33 central accounts, 0 global-subject subscriptions. Unified-login data is present.
```

The counts may differ only when authorised data was deliberately added.

- [ ] Confirm `PlatformConfig!B3` contains exactly `102.0.4`.
- [ ] Record the current value in `PlatformConfig!B4`
  (`GlobalCurriculumVersion`).
- [ ] Confirm GLOBAL_ADMIN, ADMIN and a migrated Student can still sign in.
- [ ] Back up the development GitHub repository, Platform Sheet and course
  Sheet.

Do not rerun central account migration.

## 2. Update the GitHub development repository

- [ ] Extract
  `Rebootyourmaktab-V102.6-GITHUB-UPDATE-FROM-V102.5.zip`.
- [ ] Open the contained `Rebootyourmaktab-development` folder.
- [ ] Upload every included file to its matching path in the existing GitHub
  development repository.
- [ ] Replace existing files and add new files while preserving folder names.
- [ ] Do not delete any repository file; V102.6 `DELETE-FILES.txt` lists no
  deletion.
- [ ] Confirm root `version.json` and `js/version.json` both contain `102.6`.
- [ ] Confirm this V102.6 `UPDATE-TODO.md` is present at repository root.

Cloudflare may automatically deploy the Worker and Pages from this commit. That
is safe for V102.6: the new Pages screen only calls new endpoints, and the new
Worker endpoints are unused by V102.5 Pages during the short crossover.

## 3. Confirm automatic Cloudflare deployment

- [ ] Wait for both the development Worker and Pages deployments to finish.
- [ ] Preserve all existing Worker variables, secrets and bindings.
- [ ] Confirm the Worker root endpoint reports version `102.6`.
- [ ] Hard-refresh the account page or use a private window.
- [ ] Confirm the account page displays `V102.6`.

V102.6 requires no Worker setting, secret, binding or Apps Script deployment.

## 4. Verify existing account and course operation first

- [ ] Sign in through `/account/<uniqueid>` as GLOBAL_ADMIN.
- [ ] Switch into `COURSE1` and confirm the Admin workspace opens without a
  second PIN.
- [ ] Sign in as an ordinary central ADMIN and confirm the course workspace
  opens.
- [ ] Sign in as a migrated Student and confirm Student Home opens.
- [ ] Confirm Profile → Switch course or role still works.
- [ ] Confirm timetable, Library, attendance, planners, tasks and progress have
  the same V102.5 behaviour.

The approved browser-session authentication policy is documented but is not
active in V102.6. Returning within the existing token lifetime may still open
without another PIN unless **Log out** was selected.

## 5. Verify Global Curriculum authorization

- [ ] Sign in as GLOBAL_ADMIN or a central ADMIN and open:

```text
Admin Home → Global Curriculum
```

- [ ] Confirm the screen displays a `GLOBAL` badge and five sections:
  Subjects, Modules, Tasks, Resources and Subscriptions.
- [ ] Confirm the displayed curriculum version equals the value recorded from
  `PlatformConfig!B4`.
- [ ] Confirm an authorised SENIOR and TEACHER do not see the Global Curriculum
  tile.
- [ ] Confirm manually entering the screen URL cannot bypass Worker
  authorization.

## 6. Controlled development write test

Use clearly identified test data. Do not convert or copy existing Reboot course
curriculum during this verification.

- [ ] Create one test global subject.
- [ ] Confirm one new row appears in `GlobalSubjectList`.
- [ ] Confirm it has a namespaced UUID SubjectID, `Active=TRUE`, creator audit
  values and a CreatedDate.
- [ ] Confirm `PlatformConfig!B4` increases by exactly 1.
- [ ] Confirm `PlatformAuditLog` contains `CREATE_GLOBAL_SUBJECT`.
- [ ] Add one module to that subject and confirm B4 increases by 1.
- [ ] Add one task to that subject/module and confirm B4 increases by 1.
- [ ] Add one resource using a complete HTTPS test link and confirm B4 increases
  by 1.
- [ ] Modify one record and confirm modified-by fields, ModifiedDate, audit log
  and B4 are updated.
- [ ] Deactivate the test subject and confirm dependency feedback is displayed;
  no module, task, resource or access row is deleted.

Global resources accept only:

```text
EBOOK, PRINTABLE, AUDIO, VIDEO, OTHER
```

## 7. Verify direct global-subject access

- [ ] Reactivate the test global subject before granting access.
- [ ] Open the Subscriptions section.
- [ ] Select one existing active test account and the test global subject.
- [ ] Activate access.
- [ ] Confirm one new `UserGlobalSubjectAccess` row appears.
- [ ] Confirm it has a namespaced UUID SubjectAccessID and `Active=TRUE`.
- [ ] Confirm `PlatformAuditLog` contains
  `ACTIVATE_GLOBAL_SUBJECT_ACCESS`.
- [ ] Confirm `PlatformConfig!B4` does **not** change for this access-only
  operation.
- [ ] Deactivate the access row and confirm it is preserved with
  `Active=FALSE`, modified audit values and a central audit entry.
- [ ] Do not expect the subscribed subject to appear in the Student app yet;
  learner delivery is deliberately deferred.

## 8. Validate the Platform Sheet again

- [ ] Open **System Settings → Validate Platform Sheet**.
- [ ] Confirm validation still reports `10 required tabs` and no errors.
- [ ] Confirm the global-subject and subscription counts reflect the controlled
  test rows.
- [ ] Confirm `PlatformConfig!B3` remains exactly `102.0.4`.
- [ ] Confirm no central account or `UserCourseAccess` row was duplicated,
  changed or deleted by this update.

## 9. Safety boundaries

- [ ] Do not rerun account migration.
- [ ] Do not create a `UserSubscriptions` tab.
- [ ] Do not copy editable global curriculum into a course Sheet.
- [ ] Do not copy course resources into `GlobalResources`.
- [ ] Do not add billing, payment, expiry or renewal data to access rows.
- [ ] Do not add timetable, overlap, course-combination or teacher-schedule
  subscription checks.
- [ ] Do not expect global-subject-only account navigation or learner delivery.
- [ ] Do not implement or manually simulate the future authentication storage
  policy as part of this deployment.
- [ ] Do not onboard a second production course or modify production V101.1.

## 10. Completion criteria

V102.6 is complete in development only when:

- [ ] Worker root and account page report `102.6`.
- [ ] Existing GLOBAL_ADMIN, ADMIN and Student unified login still work.
- [ ] Existing course operations remain unchanged.
- [ ] ADMIN/GLOBAL_ADMIN can manage central global curriculum.
- [ ] SENIOR, TEACHER, STUDENT and legacy-only sessions are rejected from the
  central management APIs.
- [ ] Curriculum changes increment `GlobalCurriculumVersion` and access changes
  do not.
- [ ] Every change produces a central audit row.
- [ ] Platform validation succeeds with schema `102.0.4`.
- [ ] Production remains unchanged at V101.1.

## 11. Rollback to V102.5

- [ ] Roll back the development Worker to V102.5.
- [ ] Roll back the development Pages frontend to V102.5.
- [ ] Keep `PlatformConfig!B3` at `102.0.4`.
- [ ] Do not reduce `GlobalCurriculumVersion`.
- [ ] Do not delete global subject, module, task, resource, access or audit rows
  created while V102.6 was active.
- [ ] Run **Validate Platform Sheet** and confirm V102.5 still validates all ten
  tabs and their retained data.

V102.5 safely validates the V102.6 data even though it does not expose the
management screen.
