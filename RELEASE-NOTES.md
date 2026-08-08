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
