# V102.6.2 update to-do

Apply V102.6.2 only over the deployed V102.6.1 development repository using:

`Rebootyourmaktab-V102.6.2-GITHUB-UPDATE-FROM-V102.6.1.zip`

This is an incremental correction update. Production remains stable at V101.1
and must not receive this ZIP.

## 1. Confirm and back up V102.6.1

- [ ] Confirm the development Worker root reports `102.6.1`.
- [ ] Confirm the account page displays `V102.6.1`.
- [ ] Confirm GLOBAL_ADMIN, SENIOR, TEACHER and Student unified login currently work.
- [ ] Back up the development GitHub repository, Platform Sheet and course Sheet.
- [ ] Record the current value of `PlatformConfig!B4`.

Do not rerun account migration. Do not change `PlatformConfig!B3`; it remains
exactly `102.0.4`.

## 2. Update the GitHub development repository

- [ ] Extract `Rebootyourmaktab-V102.6.2-GITHUB-UPDATE-FROM-V102.6.1.zip`.
- [ ] Upload every included file to its matching path in the existing GitHub
  development repository.
- [ ] Replace existing files and add new files while preserving folder names.
- [ ] Do not delete any repository file; `DELETE-FILES.txt` lists no deletion.
- [ ] Confirm root `version.json` and `js/version.json` both contain `102.6.2`.
- [ ] Confirm this `UPDATE-TODO.md` is present at repository root.

Cloudflare may deploy the Worker and Pages automatically from the same GitHub
commit. This patch does not change an authorization API or Sheet schema, so the
automatic deployment order is safe.

## 3. Confirm deployment

- [ ] Wait for both development Worker and Pages deployments to finish.
- [ ] Preserve all Worker variables, secrets and bindings.
- [ ] Confirm the Worker root reports `102.6.2`.
- [ ] Hard-refresh Pages or use a private window.
- [ ] Confirm the account page displays `V102.6.2`.

V102.6.2 requires no Platform Sheet, course Sheet, Apps Script, Worker setting,
secret or binding change. It must not change `PlatformConfig!B4`.

## 4. Verify incorrect-PIN retry

- [ ] Open a valid `/account/<uniqueid>` link for an account with a PIN.
- [ ] Enter an incorrect four-digit PIN.
- [ ] Confirm the error is shown.
- [ ] Confirm the PIN field is cleared automatically and receives focus.
- [ ] Enter the correct PIN without reloading the page and confirm login succeeds.
- [ ] Confirm repeated invalid attempts remain subject to the existing login rate
  limiter.

## 5. Verify role-based menu visibility

- [ ] As ADMIN, open Admin Home and confirm all eight existing Admin Home controls
  remain visible.
- [ ] As SENIOR, confirm the UI displays the role as **SENIOR TEACHER**.
- [ ] As SENIOR/"SENIOR TEACHER", confirm Admin Home shows only **Home**,
  **Admin Home** and **Resources**.
- [ ] As TEACHER, confirm Admin Home shows only **Home**, **Admin Home** and
  **Resources**.
- [ ] Confirm Student Records, Admin Records, Timetable Builder, Global Curriculum
  and System Settings are absent rather than greyed out for SENIOR and TEACHER.
- [ ] Confirm the main **Admin** navigation item remains visible for SENIOR and
  TEACHER because it is the authorized route to **Resources**.
- [ ] Confirm SENIOR and TEACHER can still add course resources but cannot modify
  existing resources.
- [ ] Confirm direct requests to restricted APIs still fail closed; menu hiding is
  not the authorization boundary.

The stored role value remains `SENIOR` in `AdminRecords`, `UserCourseAccess`,
tokens and APIs. Only the user-facing label changes to `SENIOR TEACHER`; do not
edit Sheet role values.

## 6. Regression checks

- [ ] Confirm Profile still shows the account name, courses, roles and current
  context and still opens course/role switching.
- [ ] Confirm GLOBAL_ADMIN and Student unified login and workspace navigation.
- [ ] Confirm Attendance, Planner, Library and Progress still open for authorized
  SENIOR/TEACHER accounts.
- [ ] Confirm all five Global Curriculum sections remain visible to ADMIN and
  GLOBAL_ADMIN.
- [ ] Confirm Platform validation and existing global curriculum data are unchanged.
- [ ] Confirm the value recorded from `PlatformConfig!B4` is unchanged.

## 7. Authentication-policy boundary

V102.6.2 does not activate the separately approved browser-session authentication
policy. Existing persistent-session behaviour remains unchanged. Implement that
policy only in its planned dedicated security release using
`docs/V102-AUTHENTICATION-SESSION-POLICY.md`.

## 8. Rollback

If a deployment regression occurs:

- [ ] Revert the V102.6.2 GitHub commit or redeploy the backed-up V102.6.1 source.
- [ ] Confirm Worker and Pages both return to `102.6.1`.
- [ ] Do not roll back or edit either Sheet because this update performs no data
  migration.

## Completion record

- Development GitHub commit: ____________________
- Worker deployment ID: ____________________
- Pages deployment ID: ____________________
- Verified by: ____________________
- Verification date: ____________________
- Result: ____________________
