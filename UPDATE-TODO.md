# V102.6.3 update to-do

Apply V102.6.3 only over the deployed V102.6.2 development repository using:

`Rebootyourmaktab-V102.6.3-GITHUB-UPDATE-FROM-V102.6.2.zip`

This is an incremental PIN-retry correction. Production remains stable at
V101.1 and must not receive this ZIP.

## 1. Confirm and back up V102.6.2

- [ ] Confirm the development Worker root reports `102.6.2`.
- [ ] Confirm the account page displays `V102.6.2`.
- [ ] Back up the development GitHub repository.
- [ ] Record the current values of `PlatformConfig!B3` and `PlatformConfig!B4`.

Do not rerun account migration. `PlatformConfig!B3` remains `102.0.4` and B4
must not change during this update.

## 2. Update the GitHub development repository

- [ ] Extract `Rebootyourmaktab-V102.6.3-GITHUB-UPDATE-FROM-V102.6.2.zip`.
- [ ] Upload every included file to its matching path in the existing development
  repository.
- [ ] Replace existing files and add new files while preserving folder names.
- [ ] Do not delete any repository file.
- [ ] Confirm root `version.json` and `js/version.json` contain `102.6.3`.
- [ ] Confirm this `UPDATE-TODO.md` is present at repository root.

Cloudflare may deploy Worker and Pages automatically from the same commit. This
patch changes no API contract, authorization rule or Sheet schema, so deployment
order is safe.

## 3. Confirm deployment

- [ ] Wait for both Worker and Pages deployments to finish.
- [ ] Preserve all Worker variables, secrets and bindings.
- [ ] Confirm the Worker root reports `102.6.3`.
- [ ] Hard-refresh Pages or use a private window.
- [ ] Confirm the account page displays `V102.6.3`.

## 4. Verify incorrect-PIN retry

- [ ] Open a valid `/account/<uniqueid>` link for an account with a PIN.
- [ ] Enter one incorrect four-digit PIN.
- [ ] Confirm the error is displayed and the PIN field clears.
- [ ] Confirm the PIN field is enabled and accepts new digits immediately.
- [ ] Enter the correct PIN without reloading and confirm login succeeds.
- [ ] Confirm repeated invalid attempts remain subject to the existing login rate
  limiter.

## 5. Regression checks

- [ ] Confirm GLOBAL_ADMIN, ADMIN, SENIOR/"SENIOR TEACHER", TEACHER and Student
  unified login still work.
- [ ] Confirm Profile and course/role switching still work.
- [ ] Confirm restricted Admin Home tiles remain absent for SENIOR and TEACHER.
- [ ] Confirm the UI still displays `SENIOR TEACHER` while Sheet values remain
  `SENIOR`.
- [ ] Confirm all five Global Curriculum sections remain visible to authorized
  accounts.
- [ ] Confirm the recorded values of `PlatformConfig!B3` and B4 are unchanged.

## 6. Release boundaries

- V102.6.3 does not activate the separately documented browser-session
  authentication policy.
- V102.6.3 does not implement the planned global-resource Google Drive root and
  browser; that remains a separate feature release.
- No Platform Sheet, course Sheet, Apps Script, Worker variable, secret or binding
  change is required.

## 7. Rollback

- [ ] Revert the V102.6.3 GitHub commit or redeploy the backed-up V102.6.2 source.
- [ ] Confirm Worker and Pages both return to `102.6.2`.
- [ ] Do not edit or roll back either Sheet because this release performs no data
  migration.

## Completion record

- Development GitHub commit: ____________________
- Worker deployment ID: ____________________
- Pages deployment ID: ____________________
- Verified by: ____________________
- Verification date: ____________________
- Result: ____________________
