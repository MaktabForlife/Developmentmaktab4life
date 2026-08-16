# V102.6.1 update to-do

Apply V102.6.1 only over the deployed V102.6 development repository using:

`Rebootyourmaktab-V102.6.1-GITHUB-UPDATE-FROM-V102.6.zip`

This is an incremental correction update. Production remains stable at V101.1
and must not receive this ZIP.

## 1. Confirm and back up V102.6

- [ ] Confirm the development Worker root reports `102.6`.
- [ ] Confirm the account page displays `V102.6`.
- [ ] Confirm unified GLOBAL_ADMIN and Student login still work.
- [ ] Back up the development GitHub repository, Platform Sheet and course Sheet.
- [ ] Record the current value of `PlatformConfig!B4`.

Do not rerun account migration. Do not change `PlatformConfig!B3`; it must
remain exactly `102.0.4`.

## 2. Update the GitHub development repository

- [ ] Extract `Rebootyourmaktab-V102.6.1-GITHUB-UPDATE-FROM-V102.6.zip`.
- [ ] Upload every included file to its matching path in the existing GitHub
  development repository.
- [ ] Replace existing files and add new files while preserving folder names.
- [ ] Do not delete any repository file; `DELETE-FILES.txt` lists no deletion.
- [ ] Confirm root `version.json` and `js/version.json` both contain `102.6.1`.
- [ ] Confirm this `UPDATE-TODO.md` is present at repository root.

Cloudflare may deploy Worker and Pages automatically from the same GitHub
commit. The Worker permits the new SENIOR/TEACHER create calls before the Pages
controls expose them, so the automatic deployment order is safe.

## 3. Confirm deployment

- [ ] Wait for both development Worker and Pages deployments to finish.
- [ ] Preserve all Worker variables, secrets and bindings.
- [ ] Confirm the Worker root reports `102.6.1`.
- [ ] Hard-refresh Pages or use a private window.
- [ ] Confirm the account page displays `V102.6.1`.

V102.6.1 requires no Platform Sheet, course Sheet, Apps Script, Worker setting,
secret or binding change.

## 4. Verify the Global Curriculum tabs

- [ ] Sign in as GLOBAL_ADMIN or ADMIN.
- [ ] Open **Admin Home → Global Curriculum**.
- [ ] Confirm all five controls are visible without needing to discover a
  hidden horizontal scroll:

```text
Subjects | Modules | Tasks | Resources | Subscriptions
```

- [ ] Open each section and confirm its form and list appear.
- [ ] Confirm the small `New` controls no longer stretch across the panel.
- [ ] Confirm existing global subjects and the current value recorded from
  `PlatformConfig!B4` are unchanged by the update. Each earlier curriculum
  create, modification, activation or deactivation correctly increased B4 by 1.

## 5. Verify role-based Admin menu visibility

- [ ] As ADMIN, confirm Student Records, Admin Records, Resources, Timetable
  Builder, Global Curriculum and System Settings appear according to existing
  ADMIN access.
- [ ] As SENIOR, confirm **Student Records is hidden**.
- [ ] As TEACHER, confirm **Student Records is hidden**.
- [ ] Confirm unavailable Admin Home tiles are hidden rather than displayed as
  controls that later reject the user.
- [ ] Confirm direct requests to Student Records write APIs still reject SENIOR
  and TEACHER; hiding is not the security boundary.

## 6. Verify resource creation

- [ ] As SENIOR, open **Admin → Resources** and add one clearly named temporary
  course resource.
- [ ] As TEACHER, open **Admin → Resources** and add one clearly named temporary
  course resource for the teacher's intended class/group.
- [ ] Confirm both rows contain the correct creator ID/name and the course
  `AdminAuditLog` contains the create actions.
- [ ] Confirm SENIOR and TEACHER do not see **Modify Resource**.
- [ ] Confirm a direct SENIOR/TEACHER call to the resource update/list-management
  endpoints is rejected.
- [ ] As ADMIN, confirm both **Add Resource** and **Modify Resource** remain
  available.

V102.6.1 grants SENIOR and TEACHER resource creation only. It does not grant
permission to modify existing resource rows.

## 7. Verify Profile and context switching

- [ ] Open the app menu and confirm there is one **Profile** control.
- [ ] Confirm there is no separate duplicate **Switch course or role** menu
  item.
- [ ] Select **Profile** and confirm the card lists the person's name, courses
  and roles and identifies the current context.
- [ ] Select **Switch course or role** inside the Profile card.
- [ ] Confirm the central account context screen opens without another PIN.
- [ ] Switch context and confirm the newly scoped course/role workspace opens.

## 8. Regression checks

- [ ] Confirm GLOBAL_ADMIN, ADMIN, SENIOR, TEACHER and Student login as available
  in development.
- [ ] Confirm timetable, Library viewing, attendance, planner, tasks and progress
  retain their V102.6 behaviour.
- [ ] Confirm Teacher progress and other data views remain class-restricted.
- [ ] Run **Validate Platform Sheet** and confirm it remains ready with ten
  required tabs.
- [ ] Confirm the validation summary separately reports the actual global
  subject count and the global-subject subscription count. With the current
  test data it should include `3 global subjects, 0 global-subject subscriptions`.
- [ ] Confirm `PlatformConfig!B3` remains `102.0.4`.
- [ ] Confirm `PlatformConfig!B4` did not change merely because V102.6.1 was
  deployed.

The approved browser-session authentication policy remains documented but is
not active in V102.6.1.

## 9. Completion criteria

V102.6.1 is complete in development when:

- [ ] Worker root and account page report `102.6.1`.
- [ ] All five Global Curriculum sections are visible and open correctly.
- [ ] SENIOR and TEACHER can add course resources but cannot modify existing
  resources.
- [ ] SENIOR and TEACHER cannot see or use Student Records.
- [ ] Inaccessible Admin Home items are hidden.
- [ ] Profile is the single place for details and course/role switching.
- [ ] Platform schema remains `102.0.4` and account migration was not rerun.
- [ ] Production remains unchanged at V101.1.

## 10. Rollback to V102.6

- [ ] Roll back development Worker and Pages to V102.6 together.
- [ ] Keep `PlatformConfig!B3` at `102.0.4`.
- [ ] Do not reduce `GlobalCurriculumVersion`.
- [ ] Do not delete any resource or audit row created while testing V102.6.1.
- [ ] Revalidate unified login and the Platform Sheet.
