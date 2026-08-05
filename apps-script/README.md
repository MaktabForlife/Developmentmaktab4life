# Apps Script source of truth

The files in `apps-script/` are the authoritative Apps Script source:

- `code.gs` — executable Apps Script;
- `appsscript.json` — runtime, web-app identity/access and OAuth scopes.

The Google Apps Script project is a deployment target.

## Normal change workflow

1. Update the repository Apps Script files in the development branch.
2. Review and test the repository change.
3. Synchronize both `code.gs` and `appsscript.json` to the Development Apps
   Script project.
4. Create or update the Apps Script deployment.
5. Test development.
6. Merge the same repository commit to `main` without editing individual files.
7. Synchronize the production Apps Script project only when the merged change
   contains an active Apps Script operation.

## Drive authorization

The manifest explicitly declares current-spreadsheet and Google Drive access.
Run `authorizeM4LServices` once in each Apps Script project when these scopes
are first introduced, revoked or changed. The function validates access to the
bound spreadsheet and UI-configured Weekly Planner folder without creating a
test file.

Changing the folder later through `Admin > System Settings` does not require a
manifest edit, Apps Script redeployment or another authorization, provided the
deploying Google account can edit the new folder.

Do not maintain an independent dashboard version. If an emergency dashboard
edit is unavoidable, copy it back into the repository immediately before any
further change.

## Migration labels

- `ACTIVE APPS SCRIPT`: the application still depends on this action.
- `LEGACY ROLLBACK`: the direct Worker route is normal; the Apps Script action
  remains temporarily callable for an explicit routing rollback.
- `RETIRED ROUTE`: the function remains in the deployed Apps Script source
  during an observation period, but V98.13 no longer exposes it through the
  Worker. Restoring the V98.12 Worker version restores that fallback.
- `DIRECT ONLY`: no Apps Script implementation exists.

Do not remove a legacy function without also removing its `doPost` action, and
only after its rollback path has been explicitly retired in
`MIGRATION-CHANGELOG.md`.
