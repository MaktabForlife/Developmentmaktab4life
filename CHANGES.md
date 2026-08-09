# V100.8 — Active Student Group 0 sees ALL groups

## Scope

V100.8 gives an active student whose `StudentRecords.ClassGroup` is `0`
read access to every timetable and resource group. Group 0 remains excluded
from Attendance and Progress monitoring.

## Behaviour

- Student Group 0 receives every active Library resource, including protected
  Google Drive resources after the direct-file authorization check.
- Student Group 0 receives the complete timetable once through a student-only
  translation to the existing `ALL` timetable scope.
- `TimeTable.GroupNo = 0`, resource `GroupNo = 0`, and
  `AdminRecords.AssignedGroup = 0` retain their literal meanings and do not
  replace `ALL`.
- The Admin student-management UI consistently labels the special value as
  `ALL (Group 0)` and accepts `0` as a deliberate group value.
- Only an `ADMIN` may newly assign Group 0; `SENIOR` users retain normal
  student-management access but cannot grant the all-groups designation.
- Student authentication and session binding preserve numeric zero values.
- The student profile displays `ALL (Group 0)` rather than presenting Group 0
  as inactive.
- Timetable cache namespace `v2` invalidates old Group 0 results, and the cache
  key now includes the authenticated account identity and group.
- Existing Attendance and Progress Group 0 exclusions are unchanged.

## Deployment

Deploy the Worker/backend changes first, then the frontend files. No Apps
Script deployment or Google Sheets schema change is required. Existing
StudentRecords Group 0 data must already have the intended `Active` value.

## Validation

- Added catalogue, protected-file, timetable, assignment-role, UI-label and
  cache-isolation coverage for Group 0.
- Confirmed a teacher with `AdminRecords.AssignedGroup = 0` remains restricted
  to literal Group 0/ALL timetable rows.
- Confirmed normal students cannot view a resource whose row has
  `GroupNo = 0` merely because Student Group 0 is now an access wildcard.
- All 26 test files present in the supplied V100.7.2 repository pass. The
  supplied baseline does not contain `pdfjs-annotation-session.test.mjs`, even
  though its pre-existing package script still references that file; V100.8
  does not change PDF.js behaviour or that baseline omission.

---

# V100.7.2 — Highlighted Admin Home tile

- Adds a separate Admin Home tile to the Admin landing page.
- Highlights Admin Home with the same active lavender tile treatment used by
  the main app Home page.
- Keeps the normal Home tile as the route back to the main app Home.
- Shows all six Admin landing tiles in one row on medium and large screens.

Frontend-only. No Worker, Apps Script or Google Sheets deployment is required.

---

# V100.7.1 — Admin Home tile and x-close navigation

- Adds a Home tile to the Admin landing page that returns to the main app Home.
- Changes the top-level Admin child-screen Back buttons to x-close icons.
- Every new x-close returns directly to the Admin tile landing page.
- Keeps internal workflow actions such as Back to List unchanged.
- Uses the supplied monitor-and-cog artwork for `systemsettings.svg`.
- Expands the large-screen Admin landing grid to five tiles in one row.

Frontend-only. No Worker, Apps Script or Google Sheets deployment is required.

---

# V100.7 — Admin menu tile landing page

## Scope

V100.7 replaces the old Admin list dashboard with an app-icon landing page
that matches the tile style used on the main Home page.

## Behaviour

- The Admin navigation item opens four tiles: Student Records, Admin Records,
  Resources and System Settings.
- Student Records opens the existing student register/modify flow.
- Admin Records and Resources open their existing management flows.
- System Settings opens a two-tile submenu for Zoom Link and the existing
  application System Settings form.
- ADMIN-only visibility and all existing Worker authorization remain intact.
- The Admin bottom-navigation item remains active on the landing page and its
  management child screens.
- Mobile uses a two-column tile grid; medium and large screens show all four
  landing tiles in one row.

## Deployment

Frontend-only. No Worker, Apps Script or Google Sheets deployment is required.

---

# V99.1 — Large-screen split PDF viewer

## Scope

V99.1 adds a teacher/admin split workspace that opens two independent PDF.js
viewers side by side. The feature is available only when the PDF workspace is
at least 1024px wide; student PDF screens remain single-view.

## Behaviour

- `SPLIT` opens the existing PDF Library drawer with the heading
  `Choose second PDF`.
- The selected document opens as PDF B beside the current PDF A.
- Both PDF.js viewers retain independent page, zoom, search, scroll and
  annotation state.
- A draggable and keyboard-accessible divider starts at 50/50 and enforces
  usable minimum pane widths.
- PDF B provides Open, Change and Close controls.
- Previous/Next and the normal Library drawer continue to control PDF A.
- Opening the Teaching Board suspends split mode without unloading PDF B;
  `RESTORE` returns to the two-PDF workspace.
- Dropping below 1024px suspends split mode. The SPLIT control is hidden and the
  normal single viewer remains active.
- Closing or navigating away from the PDF screen unloads both iframes.

## Files changed

- `admin/index.html`
- `student/index.html` (shared script cache versions only)
- `index.html` (shared script cache versions only)
- `styles.css`
- `css/m4l-19-pdf-split-view.css` (new)
- `icons/split.svg` (new)
- `js/m4l-resources.js`
- `js/m4l-shell.js`
- `js/m4l-teaching-panel.js`
- `version.json`
- `js/version.json`
- `backend/package.json`
- `backend/tests/pdf-split-view.test.mjs` (new)
- `CHANGES.md`

## Deployment

Frontend-only. No Worker, Google Sheets or Apps Script deployment is required.

---

# V99.0 — Persistent PDF.js annotation tool state

## Scope

V99.0 fixes the existing PDF.js annotation editor rather than adding a second
whiteboard overlay. Pen and freehand-highlighter colour and thickness now remain
the active preset for subsequent annotations during the same PDF session.

## Files changed

- `pdf-viewer/build/pdf.mjs`
- `pdf-viewer/web/viewer.mjs`
- `pdf-viewer/web/viewer.html`
- `js/m4l-resources.js`
- `admin/index.html`
- `student/index.html`
- `index.html`
- `version.json`
- `js/version.json`
- `backend/tests/pdfjs-annotation-session.test.mjs` (new)
- `backend/package.json`
- `CHANGES.md`

## Annotation behaviour

- Newly committed Pen drawings and freehand highlights are no longer
  auto-selected, so the main controls configure the next annotation rather than
  silently modifying the previous one.
- Changing Pen colour, thickness or opacity commits the current group of strokes
  first when necessary, allowing one lesson page to contain several independent
  pen colours and widths.
- Freehand Highlighter colour and thickness remain active for subsequent
  highlights, and the previous highlight remains unchanged.
- Existing annotations can still be selected deliberately and edited with the
  controls PDF.js provides for the selected annotation.
- Corrected the highlighter-thickness undo command type so it is no longer
  grouped as an ink-thickness operation.
- The original PDF remains unchanged unless the teacher explicitly uses PDF.js
  save/download behaviour.

## Automated verification

- Added a PDF.js annotation-session test covering Pen drawing-session commits,
  deliberate selected-annotation edits, Highlighter thickness defaults,
  auto-selection guards, the corrected undo type and cache-version URLs.
- All existing backend, routing, authentication, attendance, curriculum,
  progress, timetable, system-settings and Weekly Planner tests pass.

## Cache delivery

- Bumped the application version to `99.0`.
- Versioned the PDF.js viewer entry and modified module URLs so the seven-day
  `/pdf-viewer/*` cache cannot retain the pre-V99.0 annotation logic.

---


# V98.14 — Final audited Apps Script cleanup

## Scope

V98.14 completes the Apps Script reduction. Worker-to-Google-Sheets routing is
unchanged, and all application data management remains owned by the UI and
authenticated Worker routes.

## Files changed

- `apps-script/code.gs`
- `apps-script/README.md`
- `apps-script/MIGRATION-CHANGELOG.md`
- `apps-script/V98.14-AUDIT.md` (new)
- `backend/tests/apps-script-cleanup.test.mjs` (new)
- `backend/package.json`
- `CHANGES.md`

## Apps Script result

- Reduced `code.gs` from 5,716 lines to 257 lines.
- Removed all retired migration actions and all standalone Sheets-maintenance
  utilities.
- Removed the final seven utility actions:
  - `registerAdmin`
  - `getAdminByUsername`
  - `createTaskResource`
  - `listTaskResources`
  - `updateTaskResource`
  - `populateAllStudentTasks`
  - `getStudentTaskById`
- Removed the two manual StudentTasks population tests and all helpers used only
  by the deleted utilities.
- Retained exactly one callable action:
  - `saveWeeklyPlannerPreviewToDrive`
- Retained `authorizeM4LServices` and the read-only SystemConfig helpers needed
  to resolve the UI-managed Drive destination.
- Confirmed Apps Script contains no Google Sheets mutation calls.

## Architecture boundary

- Every current and future Sheets data change is initiated in the M4L UI and
  implemented through an authenticated Worker route.
- `populateAllStudentTasks` was a completed one-time startup utility.
- Admin registration, Task Resource administration and any future maintenance
  features must be built in the UI/Worker rather than restored to Apps Script.
- Apps Script is now the narrow Weekly Planner Google Drive bridge.

## Automated verification

- The Apps Script guard enforces the exact nine-function Drive dependency
  closure and one-action public allowlist.
- The guard blocks reintroduction of retired utility functions and common Sheet
  mutation calls.
- Existing direct-only routing diagnostics remain enforced.
- Weekly Planner Drive routing remains `apps-script` only.
- The unchanged standalone frontend Weekly Planner test retains the pre-existing
  assertion mismatch from V98.13: the UI label is `Save`, while the test expects
  `Save & Preview`.

## Deployment gate

Live Student/Admin authentication, a representative direct read/write, routing
diagnostics and an actual Drive PNG save must be verified in V98.13 Production
before deploying the V98.14 Apps Script source.

---


# V97.1.6.4 — Hub restructure, mirrored large-screen sizing, Save/Share

## Files changed (7)
- `admin/index.html`
- `css/m4l-15-weekly-planner.css`
- `css/m4l-16-weekly-planner-archive.css`
- `js/m4l-weekly-planner-archive.js`
- `js/m4l-weekly-planner.js`
- `styles.css` (version bump only)
- `version.json` (bumped to 97.1.6.4)

Backend files (`backend/src/router.js`, `backend/src/routes/weekly-planner.js`)
are included for completeness but are **unchanged** this round — Save/Share
reuses data already fetched by the existing endpoints.

## 1. Archive hub — restructured
- New page-level header (bg `--surface-card`): close icon + "Planner
  Archive" title — the one true screen header now.
- Two labeled panels below it, each with its own header bar (bg
  `--surface-app`): **"View by date"** (date picker + OPEN) and **"View by
  Teacher"** (submission heatmap list) — replacing the old single combined
  box and the "Submission history" heading text.
- Overall screen background changed from `--surface-app` to
  `--surface-track`, giving a layered hierarchy: page background
  (`--surface-track`) → section headers (`--surface-app`) → cards/content
  (`--surface-card`).
- Date/OPEN row is now a proper 50/50 grid, both left-aligned, instead of a
  flex row with a gap.
- Submission History rows are now a 60/30/10 grid (name / dots / icon) with
  a new `open.svg` icon added to each row so it's visually obvious they're
  tappable.
- Container width capped at 620px (50% of the previous 1240px) on medium
  and large screens.

## 2. Week-screen & Teacher-screen headers — restructured
Both now use the same 4-column (15/55/15/15) layout: close | title | Save |
Share — mirroring the main Weekly Planner header's pattern, via a new
`.weekly-planner-app-header--rail-actions` modifier (kept separate from the
Weekly Planner's own `--main` modifier since the action set differs:
close/save/share here vs. back/archive/save there).

Titles simplified to just the identifying label — the date range on the
week screen, the teacher's name on the teacher screen — dropping the
"– Submission History" suffix.

## 3. Save / Share (no PDF — reuses the images already generated)
- **Share:** `navigator.share({ files: [...] })` with every card's image in
  the current set attached at once (all teachers for the selected week, or
  all 4 of a teacher's weeks) — one share-sheet call, not one per card.
- **Save:** downloads each image individually (no zip-bundling library in
  this codebase, so it's sequential downloads rather than one combined
  file — flagging that as a possible follow-up).
- Filenames: `{TeacherName}-{ISOWeekStart}.png` (e.g.
  `Muallimah-Aasiyah-2026-07-20.png`) — spaces in names become hyphens.
- "Not submitted" entries are simply skipped — nothing to attach.
- Any card not yet scrolled into view (so not yet rendered/cached) gets
  rendered on demand before the set is collected, so Save/Share always acts
  on the complete set regardless of scroll position.
- Devices/browsers without file-sharing support (checked via
  `navigator.canShare`) fall back to the same download behavior as Save.

## 4. Card sizing corrected
Previously (v97.1.6.3) the large-desktop tier used a separately "bigger"
design — a wider max-width and a fixed minimum image height — which left
visible dead space above/below the rendered image once you saw it live.
Replaced with directly mirroring the Weekly Planner's own sizing: the same
`1600px` canvas cap, and no forced minimum height — the rendered image's
own aspect ratio governs the card, the same way Weekly Planner's own
content fills its cards with nothing left over. Also fixed a related gap:
`--weekly-planner-max-width` is now defined on the Archive screens too, so
each screen's header (which sits in `.weekly-planner-global-panel`) stays
width-consistent with the card rail beneath it.

## 5. Mobile card padding removed
`.weekly-planner-archive-card` no longer has its own padding — the
rendered image now goes edge-to-edge with the container, matching the
Weekly Planner's own mobile card exactly (this was the visible side gap
in the last round's screenshots).

## 6. Canvas text size increased
The purple handwritten-style user-input text is drawn directly onto the
1400×2000 canvas — not CSS, so not adjustable there. Bumped from
`fontSize: 26` (floor `17`) to `fontSize: 32` (floor `20`) in
`js/m4l-weekly-planner.js`, in the same `weeklyPlannerDrawTextBox` call
used for period-entry text.

## Verified
- HTML `<section>`/`<div>` tags balanced (34/34, 80/80).
- CSS brace-balanced on both stylesheets (156/156 Weekly Planner, 45/45
  Archive).
- `node --check` passes on both modified JS files and the (unchanged)
  backend files.
- Every element ID referenced by the JS — including the four new
  Save/Share buttons — confirmed present exactly once in `admin/index.html`.
- Confirmed zero leftover references anywhere to removed classes
  (`.weekly-planner-archive-section`, `.weekly-planner-header-actions`).
- Existing backend test suite still passes.

## Upload instructions
Copy these files into the corresponding paths in the live repo, preserving
the folder structure exactly.
