# V102.3 update to-do

Use this checklist when installing V102.3 through the GitHub dashboard. The
`V102.3-GITHUB-UPDATE` ZIP is tailored to the repository export reviewed on
15 August 2026. It contains only files that must be added or replaced; it also
repairs the missing V102.2 migration files discovered in that export.

The full-source ZIP is a complete backup/reference snapshot. It is not the
GitHub-dashboard update package and does not need to be uploaded in full.

## 1. Before deployment

- [ ] Back up the current source repository.
- [ ] Back up the development course Google Sheet.
- [ ] Back up the central Platform Sheet.
- [ ] Confirm the Platform Sheet contains exactly these nine tabs:
  `CourseRegistry`, `UserAccounts`, `UserCourseAccess`, `GlobalSubjectList`,
  `GlobalModuleList`, `GlobalTaskList`, `PlatformConfig`, `PlatformAuditLog`, and
  `TeacherScheduleIndex`.
- [ ] Confirm `UserCourseAccess!N1` is exactly `CourseRecordID`.
- [ ] Confirm the `PlatformSchemaVersion` value in `PlatformConfig` is
  `102.0.3`.
- [ ] Confirm `CourseRegistry` contains one active `COURSE1` row whose
  `SpreadsheetID` is the development course Sheet ID.
- [ ] Confirm the Google service account is an Editor of both the development
  course Sheet and the Platform Sheet.
- [ ] Confirm the development Worker still has both `GOOGLE_SPREADSHEET_ID` and
  `PLATFORM_SPREADSHEET_ID`.
- [ ] Keep `M4L_REQUIRE_CREDENTIAL_BOUND_SESSIONS=true`.

No new Sheet tab, header, Worker variable, secret, binding, or Apps Script
deployment is required for V102.3 after V102.2 has been configured.

## 2. Update the GitHub repository

- [ ] Use only the ZIP named `Rebootyourmaktab-V102.3-GITHUB-UPDATE.zip` for
  this repository update.
- [ ] Extract it locally. Inside it is a `Rebootyourmaktab-development` folder
  containing only the files that must be uploaded.
- [ ] Upload each included file to the matching path in the existing GitHub
  repository, preserving the folder structure.
- [ ] Replace an existing file when the path already exists; add it when it is
  new. Do not create a second nested `Rebootyourmaktab-development` folder.
- [ ] Do not upload the full-source ZIP into the repository.
- [ ] Do not use the earlier V102.3 modified-files ZIP.
- [ ] After committing the update, download a fresh GitHub repository ZIP and
  have it verified before deployment.

## 3. Deploy to development after repository verification

- [ ] Deploy the `backend/` Worker first using the development deployment with
  existing variables preserved.
- [ ] Open the Worker root endpoint and confirm it reports version `102.3`.
- [ ] Deploy the complete updated Pages frontend, including:
  - `account/index.html`
  - `css/m4l-23-account.css`
  - `js/m4l-account.js`
  - `_redirects`
  - `_headers`
- [ ] Confirm `/account/<uniqueid>` is rewritten to `/account/` without changing
  the personal URL shown in the browser.

## 4. Complete central account migration when needed

If `UserAccounts` still has no account rows:

- [ ] Sign in using the existing development `/admin/<uniqueid>` link.
- [ ] Open **System Settings**.
- [ ] Run **Validate Platform Sheet** and resolve every error.
- [ ] Run **Preview Account Migration**.
- [ ] Review all staff/student counts, warnings, and blockers.
- [ ] Correct every blocking legacy account issue and preview again.
- [ ] For the first migration, keep the option to grant `GLOBAL_ADMIN` to the
  signed-in Admin selected.
- [ ] Enter the exact confirmation text `MIGRATE COURSE1`.
- [ ] Commit the migration once the preview confirms it is safe.
- [ ] Run **Validate Platform Sheet** again.
- [ ] Confirm `UserAccounts` and `UserCourseAccess` now contain the expected
  central rows.

The migration copies existing UniqueIDs and supported PIN hashes. It does not
generate replacement personal URLs.

## 5. Verify V102.3 account login

- [ ] Use a migrated test account at:
  `https://developmentmaktab4life.pages.dev/account/<existing-uniqueid>`.
- [ ] Confirm the migrated existing PIN signs in.
- [ ] For an account with `PINSetup=FALSE`, confirm first-time PIN creation and
  confirmation work.
- [ ] Confirm a fresh login opens the highest active authority:
  `GLOBAL_ADMIN`, then `ADMIN`, `SENIOR`, `TEACHER`, or `STUDENT`.
- [ ] Where the highest role exists in several courses, confirm the most
  recently used course opens; with no history, confirm the designated default
  opens.
- [ ] Confirm **Switch course or role** does not ask for another PIN.
- [ ] Confirm each switch changes the displayed course and role.
- [ ] Refresh the page and confirm the central session restores correctly.
- [ ] Confirm the account page can log out and then requires the PIN again.
- [ ] Confirm the PlatformAuditLog records first PIN setup or legacy hash
  upgrade without storing the PIN or PIN hash.

## 6. Regression checks

- [ ] Confirm an existing Admin personal link still logs in and operates.
- [ ] Confirm an existing Student personal link still logs in and operates.
- [ ] Confirm the current Reboot timetable still loads from `TeacherAssign`.
- [ ] Confirm the Account page states that operational access is not active yet.
- [ ] Confirm a central account token cannot access a legacy operational API.
- [ ] With a test membership only, deactivate the membership and confirm its
  scoped account session is rejected on refresh. Reactivate it afterward.
- [ ] Do not deactivate the only active GLOBAL_ADMIN.

## 7. Do not remove or activate yet

- [ ] Do not redirect `/admin/<uniqueid>` or `/student/<uniqueid>` to
  `/account/<uniqueid>` yet.
- [ ] Do not remove `AdminRecords` or `StudentRecords`.
- [ ] Do not remove `TeacherAssign` or `TimeTable`.
- [ ] Do not remove `GOOGLE_SPREADSHEET_ID`.
- [ ] Do not allow the V102.3 central token to call live course-data endpoints.
- [ ] Do not deploy V102.3 to production until development verification is
  complete.

## 8. Update completion criteria

V102.3 is complete in development only when all of the following are true:

- [ ] The Worker reports `102.3`.
- [ ] Platform validation succeeds.
- [ ] Central account migration has completed with the expected counts.
- [ ] Existing UniqueIDs open their corresponding `/account/` links.
- [ ] Highest-authority selection and context switching work correctly.
- [ ] Central session revocation works after account or membership deactivation.
- [ ] Existing Admin and Student operational routes still work.
- [ ] No central account has gained unauthorised course operational access.

## 9. Rollback

- [ ] Revert the Worker and Pages deployment to V102.2.
- [ ] Leave migrated central rows in place; they do not grant access through the
  V102.2 operational routes.
- [ ] Leave any updated `LastLoginDate`, `LastUsedDate`, or upgraded central PIN
  hash in place.
- [ ] Continue using the existing Admin and Student personal links.

The next release may activate dynamic authenticated course-Sheet routing only
after V102.3 passes every completion check above.
