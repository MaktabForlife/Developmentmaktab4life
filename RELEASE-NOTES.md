M4L V100.5

# Final Worker backend-routing housekeeping

## Audit result

The uploaded V100.4.4 repository and the current `apps-script/code.gs` were checked together.

`apps-script/code.gs` is already in the intended V98.14 final state. Its only callable `doPost` action is `saveWeeklyPlannerPreviewToDrive`, so no Apps Script code change is required. The Worker still needs `APPS_SCRIPT_URL` for that single Weekly Planner Drive bridge.

The old `M4L_BACKEND_*` values are migration-era selectors. They no longer represent supported choices and are now removed from Worker configuration. Routing ownership is fixed directly in code:

- authentication, Attendance, Library data, timetable, student/admin management, curriculum, task assignment, Progress, System Settings and Weekly Planner data -> `google-sheets`
- Weekly Planner PNG-to-Drive -> `apps-script`
- Drive Library streaming/browsing and routing diagnostics -> `worker`

## Safety of dashboard cleanup

V100.5 ignores retired backend selector variables entirely. This means the Worker can be deployed first while the old Cloudflare dashboard values are still present. After deployment, those values may be deleted without changing routing.

`M4L_BACKEND_ROUTING_LOGS` is retained as an optional logging toggle. It is not a backend selector.

## Deployment

1. Deploy the V100.5 Worker files.
2. Confirm the Worker health endpoint reports version `100.5`.
3. Confirm backend routing diagnostics show `source: fixed`, Google Sheets features with `availableBackends: ["google-sheets"]`, and Weekly Planner Drive with `availableBackends: ["apps-script"]`.
4. Delete the retired `M4L_BACKEND_*` selector variables from the development Worker dashboard.
5. Re-test Student/Admin login, one representative Google Sheets read/write, Weekly Planner Submit-to-Drive, and Drive Library browse/open.
6. Repeat the same dashboard cleanup in production after production V100.5 is deployed and verified.

## Variables that must remain

Keep the actual runtime configuration/secrets, including `APPS_SCRIPT_URL`, `GOOGLE_SPREADSHEET_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON`, `PIN_SECRET`, `SESSION_SECRET`, `AUTH_LOGIN_RATE_LIMITER`, `M4L_GOOGLE_DRIVE_ROOT_FOLDER_ID`, `M4L_DRIVE_ACCESS_TTL_SECONDS`, `M4L_STUDENT_LOGIN_BASE`, and `M4L_REQUIRE_CREDENTIAL_BOUND_SESSIONS`.

## Validation

All 23 backend regression test files pass, including the Apps Script V98.14 cleanup test, Weekly Planner tests, Drive Library tests, auth tests, routing tests, and Google Sheets feature tests.

Wrangler dry-run was not run because Wrangler is not installed in this execution environment.

---

M4L V100.4.4

# Library resource form cleanup

## Changes

- Removed **Task** from Add / Modify Resource because the live Library is organised and opened by Subject and Module; TaskId is not used for Library navigation or access control.
- Removed the visible **Format** field because format is derived automatically from the Google Drive file and is not an Admin-managed value.
- Existing resource-sheet columns are unchanged. TaskId can remain blank, and format can continue to be populated automatically in the background.
- The selected Drive file card may still identify the file type as part of the file summary; there is no separate Format form field.

## Deployment

This is a Pages/frontend-only revision.

1. Deploy `admin/index.html`.
2. Deploy `js/m4l-manage-resources.js`.
3. Deploy `version.json` and `js/version.json`.
4. Hard-refresh/reopen the Admin app.
5. Confirm Add Resource and Modify Resource show Resource type, Drive file, Resource name, Subject, Module, Available to, and Status — with no Task or Format field.

## Validation

- `js/m4l-manage-resources.js` JavaScript syntax check passed.
- Resource management UI integration test passed.
- Test explicitly checks that the Task selector and Format form field are absent.

---

M4L V100.4.3

# ModuleList-backed Library module selection

## Changes

- Corrected the Add / Modify Library module dropdown.
- `ModuleList` is now the authoritative source for modules.
- Module ordering follows `Sort Order` / `SortOrder` / `ModuleSortOrder` from ModuleList.
- Module names come from ModuleList even when TaskList contains duplicated or stale module names.
- Active modules with no tasks are still selectable for resources.
- TaskList supplies tasks only; it cannot create new module choices.
- Tasks that point to inactive or nonexistent ModuleList modules are not offered under a false module.

## Deployment

This is a Worker/backend correction.

1. Deploy `backend/src/routes/drive-library.js` to the development Worker.
2. Deploy `version.json` and `js/version.json` with the normal Pages release metadata.
3. Reopen Add Resource and select a Subject.
4. Confirm its Module dropdown matches the active rows in ModuleList and follows ModuleList sort order.
5. Confirm Task is filtered to the selected module.

## Validation

- `backend/src/routes/drive-library.js` JavaScript syntax check passed.
- Drive Library endpoint regression test passed against a complete V100.4.2 development tree.
- Test confirms ModuleList name/order wins over conflicting TaskList module metadata.
- Test confirms a module with zero tasks remains visible.
- Test confirms inactive ModuleList modules are excluded.

---

M4L V100.4.2

# Google Drive picker scrolling and video compatibility

## Changes

- The Google Drive folder/file picker now scrolls vertically inside its own bounded area instead of allowing a long Drive folder to extend beyond the usable Admin screen.
- The breadcrumb path remains outside the scrolling file list so folder navigation stays visible.
- Existing `video/*` MIME handling is unchanged.
- `application/mp4` is now accepted explicitly.
- If Google Drive reports a video as a generic binary download (`application/octet-stream`, `binary/octet-stream`, `application/binary`, or `application/x-download`), M4L may identify it from a recognised video filename extension: `.mp4`, `.m4v`, `.mov`, or `.webm`.
- The extension fallback applies only to the Video resource type and only for generic MIME metadata; it does not make arbitrary files selectable as Video.

## Deployment

This revision has both Worker and Pages changes.

1. Deploy `backend/src/routes/drive-library.js` to the development Worker.
2. Deploy the changed Pages/frontend files.
3. Hard-refresh/reopen the Admin app.
4. Test a long Drive folder and confirm the picker scrolls.
5. Select Video and confirm the MP4 is available.
6. Add the MP4 and confirm it plays in the Library.

## Validation

- `backend/src/routes/drive-library.js` JavaScript syntax check passed.
- Resource management UI integration test passed with the new scroll assertion.
- Existing private Drive PDF proxy test still passes.
- A Drive regression case was added for an `.mp4` reported as `application/octet-stream`. The changed-files staging package does not contain all unchanged backend dependencies required to execute the full Worker regression suite in isolation; run the repository test suite after merging the files into the complete development tree.

---

M4L V100.4.1

# Private Drive PDF.js compatibility

- Restored the established rule that absolute PDF URLs, including signed private Drive URLs, pass through `/pdf-file/<encoded-url>` before PDF.js loads them.
- Restricted the proxy to the approved M4L backend hosts and exact private Drive file route.
- Preserved byte-range requests and private no-store caching.

---

M4L V100.4

# Private Google Drive Library management

- Added ADMIN-only private My Drive folder browsing.
- Added Add Resource and Modify Resource UI.
- Added private Worker delivery and signed file access.
- Added PDF, audio/video range, group, Active, and duplicate-file enforcement.
