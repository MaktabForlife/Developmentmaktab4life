# M4L V100.4.1 — Private Drive PDF.js compatibility

## Problem
V100.4 correctly created a short-lived, authenticated M4L Worker URL for a private Google Drive PDF. However, `js/m4l-resources.js` special-cased that signed Worker URL and supplied it directly to PDF.js. The established M4L PDF flow normally converts absolute URLs to the same-origin `/pdf-file/<encoded-url>` Pages route. Sending the new cross-origin Worker URL directly to PDF.js caused the PDF viewer to fail while the bypass/direct-open route still worked.

## Fix
- Restored the established rule: every absolute PDF URL, including signed private Drive URLs, is passed through `/pdf-file/<encoded-url>` before PDF.js loads it.
- Extended `functions/pdf-file/[encoded].js` to allow only signed private Drive delivery URLs on the two approved M4L backend hosts:
  - `devrebootworker.maktab4life.workers.dev`
  - `api.rebootyourmaktab.maktabhelper.app`
- The Pages proxy will not proxy arbitrary Worker URLs or arbitrary M4L API routes. It requires the exact `/api/library/drive/file/<fileId>` path and an `access` token.
- Range headers continue to be forwarded, preserving PDF.js partial loading/seek behavior.
- Private Drive PDF responses use `Cache-Control: private, no-store, max-age=0` instead of the public cache policy used for public PDF sources.
- Cache-bumped `m4l-resources.js` to `100.4.1` in Admin and Student HTML.

## Deployment
This revision is a Cloudflare Pages/frontend patch. The V100.4 Worker does not need to be redeployed.

## Validation
23 backend/integration test files passed, including the new private Drive PDF proxy test.# M4L V100.4 — Private Google Drive Library Management

## Scope

V100.4 adds an ADMIN-only Library management interface backed by a private folder in an individual user's **My Drive**. The folder is shared with the existing M4L Google service account. Files remain in Google Drive; V100.4 does not copy them to R2 and does not expose the original Google Drive URL to students.

## Admin workflow

`Add or Modify → Library` now opens **Manage Library**, with:

- Add Resource
- Modify Resource
- View Library
- In-app folder and subfolder browsing from the configured M4L Drive root
- Breadcrumb navigation and folders-first listing
- File filtering by resource type
- Linked Subject → Module → Task selectors
- Group and Active controls
- Duplicate Drive-file protection
- Add Another Resource state reset
- Resource selection by type, resource ID, and sheet row

Only current `ADMIN` accounts can browse Drive or create/modify Library records.

## Supported Drive files in V100.4

- eBook: PDF
- Printable: PDF
- Audio: Google Drive files whose MIME type is `audio/*`
- Video: Google Drive files whose MIME type is `video/*`
- Other: common image, text, ZIP, Word, and PowerPoint files

Google Docs, Google Sheets, and Google Slides are deliberately unsupported in V100.4 because they require export handling rather than ordinary file download.

## Existing resource sheets

No new columns are required. V100.4 maps the existing headers dynamically. For example, the eBooks sheet may retain:

`eBookId | eBookName | SubjectId | SubjectName | ModuleId | ModuleName | TaskId | GroupNo | ebookFormat | eBookLink | Active | Date`

Equivalent existing columns are used in:

- `Printable`
- `Audio`
- `Video`
- `OtherResource`

The Link column stores the M4L Worker file route, not the original Google Drive link.

## Private delivery

1. The Library catalogue returns the existing resource row.
2. When a user opens a private Drive resource, the frontend requests short-lived access from the Worker.
3. The Worker revalidates the current M4L account, resource status, group, resource row, and configured Drive root.
4. The Worker returns a signed file-delivery URL.
5. The signed route retrieves the file with the Google service account.

PDFs continue to open in the existing PDF.js viewer. Audio/video delivery forwards HTTP byte ranges so seeking is supported.

The default signed-link lifetime is 3,600 seconds. `M4L_DRIVE_ACCESS_TTL_SECONDS` may be set from 300 to 14,400 seconds.

## Resource catalogue enforcement

Student resource reads now return only:

- resources assigned to `ALL`; and
- resources assigned to the student's current group.

Admin Library reads retain the full catalogue. The private access endpoint independently repeats the Active and group checks, so stale browser cache entries cannot grant file access.

## Required setup before testing

### Google Cloud

1. Enable the Google Drive API in the Google Cloud project used by the existing M4L service account.
2. Create or choose the private `M4L Resources` folder inside My Drive.
3. Share that folder with the `client_email` from `GOOGLE_SERVICE_ACCOUNT_JSON`.
4. Viewer permission is sufficient for browsing and reading. V100.4 does not upload, rename, move, or delete Drive files.

### Cloudflare Worker variables

Set this variable separately in both production and development:

`M4L_GOOGLE_DRIVE_ROOT_FOLDER_ID=<the folder ID>`

Use only the ID from a folder URL such as:

`https://drive.google.com/drive/folders/FOLDER_ID`

The root-folder value is intentionally not committed to `wrangler.jsonc`. The deployment commands use `--keep-vars`, so a Dashboard variable is retained.

The existing `GOOGLE_SERVICE_ACCOUNT_JSON` and `SESSION_SECRET` secrets remain required. Never add either secret to the repository.

## Deployment order

1. Configure and share the development Drive folder.
2. Set the development `M4L_GOOGLE_DRIVE_ROOT_FOLDER_ID` Worker variable.
3. Deploy the V100.4 Worker files.
4. Deploy the V100.4 frontend files.
5. Close/reopen the installed app or hard-refresh once.
6. Test Add Resource, Modify Resource, PDF.js, audio/video seeking, group filtering, Active filtering, and duplicate rejection.
7. Repeat the configuration and deployment for production after development passes.

## Important limitations

- V100.4 reads one configured My Drive folder tree; it does not browse the service account's unrestricted Drive view.
- Native Google Docs/Sheets/Slides are not supported.
- Removing the service account's folder permission, moving a resource outside the configured root, trashing the file, or deactivating the Library row blocks future access.
- Existing external Library links remain supported. Selecting a Drive file while modifying such a row converts its link to private M4L Drive delivery.
- Duplicate detection uses the Drive file ID and blocks the same file across all five resource sheets.

## Validation completed

- 22 backend regression test files passed.
- JavaScript syntax checks passed for all changed runtime files.
- JSON and JSONC parsing passed.
- Admin and Student HTML parsing and duplicate-ID checks passed.
- CSS/JS version and import integration checks passed.
- A Cloudflare Wrangler dry-run was not executed because the available package registry did not provide the Wrangler package; deploy first to the development Worker as the final platform validation.
