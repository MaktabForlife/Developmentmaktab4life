# V97.1.6.2 — Archive redesign: dedicated week screen, group sort, OPEN

## Files changed (7)
- `backend/src/routes/weekly-planner.js`
- `css/m4l-15-weekly-planner.css`
- `css/m4l-16-weekly-planner-archive.css`
- `js/m4l-weekly-planner-archive.js`
- `admin/index.html`
- `styles.css` (version bump only)
- `version.json` (bumped to 97.1.6.2)

## Real bug found and fixed: header buttons outside .weekly-planner-screen
While wiring the OPEN button I found the actual root cause behind the
"icon not visible, background colouring visible" report from earlier: the
base reset for `.weekly-planner-header-action` (transparent background, no
border, icon+label column layout) was scoped only to
`.weekly-planner-screen` and `.weekly-planner-preview-screen` ancestors.
The three Archive screens live outside both, so their buttons were falling
back to native browser button chrome — a plain background box — regardless
of which icon markup was used inside. Widened all four of those selector
groups (base, `:active`, `:focus-visible`, `:disabled`) to also cover
`.weekly-planner-archive-screen`, `.weekly-planner-archive-week-screen`,
and `.weekly-planner-archive-teacher-screen`, and dropped the
`.weekly-planner-app-header` ancestor requirement so it also reaches the
new OPEN button, which sits in the date-bar rather than the header toolbar.

## 1. Archive hub simplified
Now just: header (Title + icon-only `xclose.svg` close), a date picker with
an **OPEN** button (`open.svg` icon + "OPEN" label, same bare icon+label
convention as everywhere else) next to it, and **Submission history**
below. The old inline "Planners for X–Y" preview section is gone entirely
— deleted HTML, and all the JS/CSS that rendered it
(`selectWeeklyPlannerArchiveWeek`, `renderWeeklyPlannerArchiveRail`,
`buildWeeklyPlannerArchiveCard`, the per-card heatmap-strip, expand-inline
toggle, and the intersection observer tied to it) removed rather than left
dangling.

## 2. New dedicated week screen
OPEN navigates to a new screen (`weekly-planner-archive-week-screen`):
header is Title + icon-only close (back to the hub), and a swipeable rail
of full-preview cards for that week — same card-building and progressive
on-scroll rendering as before, just retargeted to the new screen's
elements. Card visibility by breakpoint, reusing the app's existing
768px/1180px breakpoint pair (already used by
`m4l-14-attendance-responsive-repair.css`):
- **Mobile (<768px):** 1 full-screen card at a time.
- **Tablet (768–1179px):** 3 cards visible.
- **Desktop (≥1180px):** 5 cards visible.

All three sizes use `scroll-snap-type: x mandatory`, so it's swipeable at
every size rather than only on mobile.

Tapping a teacher's row in Submission History still goes to their own
**Teacher Submission History** screen (per-teacher timeline) — that
navigation wasn't part of this change and is untouched.

## 3. Group-ascending sort
New `compareWeeklyPlannerArchiveTeachersByGroup()` in the backend: `ALL`
sorts first (alphabetical among ties), then numeric groups ascending
(alphabetical within the same group number — verified numeric, not lexical,
so group "10" correctly sorts after "2"). Folded into
`filterWeeklyPlannerArchiveTeachers()`, so both `archive-overview`'s
`teacherMatrix` and `week-records`'s `teacherRecords` come back pre-sorted
— the frontend just renders in the order received.

## 4. Default date
Unchanged from v97.1.6.1: the date picker still defaults to the most
recent week with an actual submission, not today. That logic now drives
the picker directly (no more "recent weeks" section for it to also feed).

## Verified
- `node --check` passes on the backend route and the archive JS.
- Standalone test of the sort comparator against a mixed ALL/numeric
  dataset confirmed correct ordering.
- HTML `<section>`/`<div>` tags balanced (36/36, 80/80).
- CSS brace-balanced on both stylesheets (143/143, 42/42).
- Every element ID referenced by the JS confirmed present exactly once in
  `admin/index.html`; confirmed zero leftover references anywhere to the
  removed IDs/classes/functions from the old inline-rail design.
- Existing backend test suite still passes.

## Upload instructions
Copy these files into the corresponding paths in the live repo, preserving
the folder structure exactly.
