# Apps Script source of truth

The files in `apps-script/` are the authoritative Apps Script source:

- `code.gs` — the V98.14 active bridge and retained maintenance utilities;
- `appsscript.json` — runtime, web-app access and OAuth scopes;
- `MIGRATION-CHANGELOG.md` — operation-level ownership ledger;
- `V98.14-AUDIT.md` — retained action/dependency audit for this cleanup.

The Google Apps Script project is a deployment target, not an independent
editing source.

## V98.14 boundary

All migrated application data routes are direct Cloudflare Worker-to-Google
Sheets API operations. Their Apps Script rollback actions and implementations
have been removed.

The only callable `doPost` actions are:

- `registerAdmin`
- `getAdminByUsername`
- `createTaskResource`
- `listTaskResources`
- `updateTaskResource`
- `populateAllStudentTasks`
- `getStudentTaskById`
- `saveWeeklyPlannerPreviewToDrive`

`authorizeM4LServices` and the two `testPopulateAllStudentTasks*` functions are
manual deployment/maintenance utilities and are not web actions.

Do not re-add a migrated Sheets action to `doPost`. Restore an earlier repository
version only for emergency historical rollback.

## Normal change workflow

1. Update the repository Apps Script files in the development branch.
2. Run `npm run test:apps-script-cleanup` from `backend/`, followed by the full
   backend test suite.
3. Review `V98.14-AUDIT.md` whenever a retained function or helper changes.
4. Synchronize the complete `code.gs` and `appsscript.json` files to the
   Development Apps Script project.
5. Create or update the Apps Script deployment and verify Development.
6. Merge the same repository commit to `main` without individual file edits.
7. Synchronize and deploy Production Apps Script only after the V98.13
   production verification gate is recorded.

## Drive authorization

The manifest declares current-spreadsheet and Google Drive access. Run
`authorizeM4LServices` once in each Apps Script project when scopes are first
introduced, revoked or changed. It validates access to the bound spreadsheet
and UI-configured Weekly Planner folder without creating a test file.

Changing the folder through `Admin > System Settings` does not require a
manifest edit or another authorization, provided the deploying Google account
can edit the new folder.

Do not maintain an independent dashboard version. Copy any emergency dashboard
edit back into the repository before the next change.
