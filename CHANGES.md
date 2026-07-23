# V97.1.6 — Weekly Planner Archive

New admin-only feature: an Archive icon on the Weekly Planner screen opens a
hub for browsing every teacher's past planners, plus a per-teacher
submission-history view.

## Files changed/added (9)
- `backend/src/routes/weekly-planner.js` (changed)
- `backend/src/router.js` (changed)
- `css/m4l-15-weekly-planner.css` (changed)
- `css/m4l-16-weekly-planner-archive.css` (new)
- `js/m4l-weekly-planner-archive.js` (new)
- `icons/archive.svg` (new)
- `admin/index.html` (changed)
- `styles.css` (already referenced the new stylesheet — included for completeness)
- `version.json` (bumped to 97.1.6)

## Backend — three new endpoints
All gated by the existing generic `requireWeeklyPlannerAdmin` (no role tiers
yet, per your note — all admins can view the archive):

- `POST /api/admin/weekly-planner/archive-overview` — `{ weekStart? }` →
  the last 4 weeks' `{ weekStart, weekEnd, month, totalTeachers,
  submittedCount }`, **plus** a full per-teacher 4-week status matrix
  (`teacherMatrix`). Bundling the matrix into this one call means the hub's
  heatmap section needs no extra round trips per teacher.
- `POST /api/admin/weekly-planner/week-records` — `{ weekStart }` → every
  active teacher's full record (including `plannerData`) for that week, with
  teachers who didn't submit represented as `planner: null` rather than
  omitted, so gaps are visible.
- `POST /api/admin/weekly-planner/teacher-history` — `{ teacherId,
  weekStart? }` → one teacher's last 4 weeks of `{ weekStart, status,
  updatedDate }`.

A shared `buildRecentWeeklyPlannerWeeks(anchorValue, count)` helper computes
the 4-week window consistently for both endpoints. Opening one specific
teacher+week from a heatmap dot reuses the **existing**
`/api/admin/weekly-planner/get` endpoint — no new endpoint needed there.

Existing backend test suite (`backend/tests/weekly-planner.test.mjs`) still
passes; no changes were needed there since the existing endpoints are
untouched.

## Frontend — Archive hub (`weekly-planner-archive-screen`)
Reached via a new icon button in the Weekly Planner header. Three zones on
one screen:
1. **Date picker**, defaulted to the current week, plus a **recent-weeks**
   row of lightweight summary cards ("14–17 Jul — 8/10 submitted"). Both
   drive the same rail below.
2. **Submission history list** — one row per teacher with a small 4-dot
   heatmap strip. Tapping a row opens that teacher's full history screen.
3. **Full-preview rail/grid** for the selected week — every teacher's
   *actual rendered planner image* (not placeholders), generated
   progressively via `IntersectionObserver` as each card scrolls into view,
   so the screen doesn't stutter regardless of teacher count. Each card also
   carries the same mini heatmap strip, which — tapped — jumps into that
   teacher's history screen too.
   - **Mobile:** single-card scroll-snap rail.
   - **≥768px:** grid (matching the breakpoint already used by
     `m4l-14-attendance-responsive-repair.css`); clicking a card **expands
     it inline** (grows within the grid) rather than opening a modal, per
     your direction.

## Frontend — Teacher Submission History (`weekly-planner-archive-teacher-screen`)
A heatmap/timeline of the teacher's last 4 weeks; tapping a week's dot loads
that specific planner (via the existing single-teacher `get` endpoint) into
an inline preview panel below — no new screen or modal needed for that.

Both screens reuse `window.M4LWeeklyPlanner.renderPreview()` (already
exported by `m4l-weekly-planner.js`) for the actual canvas image, so archive
previews are pixel-identical to the live planner preview, and a small
in-memory cache avoids re-rendering the same teacher+week twice in one
session.

## Styling
Uses only existing design tokens already defined in
`m4l-01-foundation-auth-userband.css` — `--surface-app`, `--surface-card`,
`--surface-track`, `--surface-chip`, `--text`, `--text-muted`,
`--text-inverse`, plus the existing `--success` / `--verified` status colors
for Submitted/Draft (missing weeks fall back to `--surface-track`). No new
colors were introduced.

The existing Weekly Planner header was a rigid 3-column CSS grid
(Back | Title | Save) — a bare third button would have broken that layout,
so Archive + Save are now grouped in a `.weekly-planner-header-actions`
wrapper in the third column instead, with that column changed from a fixed
`72px` to `auto` width to fit both.

## Verified
- `node --check` passes on all modified/new `.js` files.
- HTML `<section>`/`<div>` tags balanced (37/37, 80/80) and all new element
  IDs referenced by the JS module confirmed present in `admin/index.html`.
- CSS brace-balanced (49/49).
- No global function/variable name collisions between the new module and
  any other loaded script.
- Existing backend test suite still passes.

## Upload instructions
Copy these files into the corresponding paths in the live repo, preserving
the folder structure exactly. `styles.css` already imports the new CSS file
at the version used here, so no manual edit is needed there — it's included
only so the version numbers line up if you diff it.
