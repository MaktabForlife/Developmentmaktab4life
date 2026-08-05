# V98.14 — Audited Apps Script cleanup

## Scope

V98.14 removes the Apps Script implementations whose Worker routes were made
direct-only in V98.13. Worker-to-Google-Sheets routing is unchanged.

## Files changed

- `apps-script/code.gs`
- `apps-script/README.md`
- `apps-script/MIGRATION-CHANGELOG.md`
- `apps-script/V98.14-AUDIT.md` (new)
- `backend/tests/apps-script-cleanup.test.mjs` (new)
- `backend/package.json`
- `CHANGES.md`

## Apps Script result

- Reduced `code.gs` from 5,716 lines to 1,246 lines.
- Removed 31 retired `doPost` actions and their legacy implementations.
- Removed unreachable migration helpers, duplicate Task Resource helpers and
  dead Worker-style handlers embedded in Apps Script source.
- Retained exactly eight callable actions:
  - `registerAdmin`
  - `getAdminByUsername`
  - `createTaskResource`
  - `listTaskResources`
  - `updateTaskResource`
  - `populateAllStudentTasks`
  - `getStudentTaskById`
  - `saveWeeklyPlannerPreviewToDrive`
- Retained `authorizeM4LServices` and both manual StudentTasks population test
  utilities.

## Automated verification

- Added an Apps Script syntax/allowlist/dependency-boundary test.
- Existing direct-only routing diagnostics remain enforced.
- Weekly Planner Drive routing remains `apps-script` only.
- All 17 backend suites pass, including the new Apps Script cleanup guard.
- The unchanged standalone frontend Weekly Planner test still has the same
  pre-existing assertion mismatch as the V98.13 ZIP: the UI label is `Save`
  while the test expects `Save & Preview`. This was not changed in the Apps
  Script cleanup.

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
