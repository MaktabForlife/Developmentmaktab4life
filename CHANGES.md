# V97.1.6.3 — Sizing overhaul: shared card rail, real breakpoint tiers

## Files changed (8)
- `backend/src/routes/weekly-planner.js`
- `backend/src/router.js`
- `css/m4l-15-weekly-planner.css`
- `css/m4l-16-weekly-planner-archive.css`
- `js/m4l-weekly-planner-archive.js`
- `admin/index.html`
- `styles.css` (version bump only)
- `version.json` (bumped to 97.1.6.3)

## Real bug found: Weekly Planner only had one breakpoint
While fixing the "medium screens spill out" report, found the actual cause:
`.weekly-planner-rail` only had a single breakpoint at 768px, jumping
straight to a fixed 4-column grid from 768px all the way to infinite
desktop width — there was no separate tablet tier at all. A genuine tablet
width (e.g. 800px) was being forced into the same 4-column layout meant for
a 1600px desktop. Split this into a proper 3-tier system:
- **Mobile (<768px):** unchanged — single full-width swipe card, exactly as
  it already was (confirmed as the reference size for the Archive rails).
- **Medium (768–1179px):** now genuinely 2 columns, contained within the
  viewport.
- **Large desktop (>=1180px), new tier:** 4 columns, on an enlarged canvas
  — `--weekly-planner-max-width` and the outer `.app-shell` cap both bumped
  from 1240px to 1600px, textareas grown to a 96px minimum, day headings
  slightly larger.

## Teacher Submission History — redesigned into a card rail
Replaced the old "4 small nav-pills + one single preview panel below" with
a swipeable rail of all 4 weekly full-preview cards — the same rail
component the week screen uses, just fed a teacher's 4 weeks instead of a
week's N teachers. This needed a new backend endpoint,
`POST /api/admin/weekly-planner/teacher-week-records`, mirroring
`week-records`'s shape but for one teacher across weeks (full
`plannerData` for each of the last 4 weeks, not just the lightweight
status list the older `teacher-history` endpoint returns — that endpoint
is left in place, just no longer used by this screen).

The card-building and preview-generation logic is now a single shared
pair, `buildWeeklyPlannerArchiveCard()` / `generateWeeklyPlannerArchiveCardPreview()`,
used by both the week screen (label = teacher name) and the teacher screen
(label = week range) — no duplicated card logic between the two.

## Card container styling removed
`.weekly-planner-archive-card` no longer has a border, background, or
padding around it — the rendered planner image (which already has its own
visual design) is now the primary thing on screen, with just a minimal
name + status row above it, not a card nested inside another card frame.

## Card rail sizing
All three tiers now consistently applied to both Archive rails:
- **Mobile:** edge-to-edge, matching the Weekly Planner's own mobile card
  exactly — no side padding.
- **Medium (768–1179px):** 2 cards visible, contained.
- **Large desktop (>=1180px):** deliberately bigger than the Weekly
  Planner's own (now-enlarged) desktop tier — `max-width: 1800px` vs the
  Weekly Planner's 1600px, and a taller `480px` minimum image height. The
  by-date week screen shows 5 cards at this tier (unchanged from before,
  since teacher count varies); the teacher screen always shows exactly 4
  (its fixed week count).

## Date bar
- Gap between the date input and OPEN widened (10px → 20px).
- OPEN's icon bumped to 32px (up from the shared 24px icon token used
  everywhere else — a deliberate one-off override just for this button,
  not a change to the shared token).

## Verified
- `node --check` passes on the backend route, router, and archive JS.
- HTML `<section>`/`<div>` tags balanced (34/34, 79/79).
- CSS brace-balanced on both stylesheets (149/149 Weekly Planner, 39/39
  Archive).
- Every element ID the JS references confirmed present exactly once;
  confirmed zero leftover references anywhere to the removed teacher-heatmap
  nav-pill markup/classes from the old design.
- Existing backend test suite still passes.

## Upload instructions
Copy these files into the corresponding paths in the live repo, preserving
the folder structure exactly.
