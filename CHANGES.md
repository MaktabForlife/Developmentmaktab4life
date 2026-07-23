# V97.1.6.1 — Weekly Planner Archive fixes

## Files changed (7)
- `backend/src/routes/weekly-planner.js`
- `css/m4l-15-weekly-planner.css`
- `css/m4l-16-weekly-planner-archive.css`
- `js/m4l-weekly-planner-archive.js`
- `admin/index.html`
- `styles.css` (version bump only)
- `version.json` (bumped to 97.1.6.1)

## 1. Main Weekly Planner header restructure
The header is now a single 4-item grid (Title, Back, Archive, Save) laid out
differently per breakpoint via CSS `grid-template-areas`, using the **same**
markup at every size — no duplicated DOM:
- **Mobile:** Row 1 = "Weekly Planner" title (full width). Row 2 = a 3-column
  row of bare icon+label buttons (Back / Archive / Save).
- **≥768px:** one row, 4 columns at 15% / 55% / 15% / 15%, title in column 2.

The Archive/Teacher-History headers were **not** touched by this — they
only ever have 1-2 items, not 4, so they keep their existing simple
Title + one-icon layout.

## 2. Archive hub + Teacher History headers
Back button replaced with an icon-only `xclose.svg` close button (no text
label) on both screens.

## 3. Icon/button styling convention
Applied your general rule: action buttons are icon + label with no
background or container by default. Checked the existing base button CSS —
it was already `background: transparent; border: 0`, so no change was
needed there; this was really about the *Archive* icon specifically, which
now shows its label again (it had been made icon-only in v97.1.6 purely to
fit a cramped column — the new dedicated grid area removes that constraint).

## 4. Teacher filtering ("only Admin with groups assigned")
Added `filterWeeklyPlannerArchiveTeachers()` in the backend and applied it
to both `archive-overview` and `week-records` — every teacher list in
Archive (heatmap rows, week-detail rail) now excludes any admin/teacher
record with no `assignedGroup` value, since those are supervisor accounts
that never submit planners. Confirmed against the actual sheet field
(`assignedGroup`), not a new field.

## 5. Date-picker bug
Found a genuine sequencing issue while fixing this: the date input's
initial value was being set from the **client-side** "current week"
calculation, then the overview call ran afterward and could resolve a
*different* anchor week (per fix #6 below) without ever updating the input
— so the picker and the displayed data could silently disagree. Reordered
`showWeeklyPlannerArchive()` so the overview call runs first and its
resolved anchor week is what sets the date input's value.

Also hardened the change-handling itself, since I couldn't rule out a
browser/webview inconsistency: both `change` and `input` listeners are now
bound (some mobile browsers are inconsistent about firing `change` for
native date inputs), with a value-comparison guard so the pair can't
double-fire for the same selection.

## 6. "Recent weeks" section
Removed the `<h3>Recent weeks</h3>` heading and its wrapping `<section>`
container — the summary-rail cards now sit directly under the date bar as
their own element, with the spacing that container used to provide moved
onto the rail itself so nothing shifts visually.

## 7. Recent-weeks anchor defaults to last submission
Added `resolveWeeklyPlannerArchiveAnchorWeekStart()` in the backend: when no
explicit `weekStart` is given, it scans all records for the most recent
week with a `READY` (submitted) status and anchors the 4-week window there,
instead of the current calendar week — so opening Archive before anyone's
submitted this week doesn't show an all-empty headline card. Falls back to
the current week only if there are no submissions anywhere yet. An explicit
date-picker selection always overrides this and is used as-is.

## Verified
- `node --check` passes on the modified backend route and the archive JS.
- HTML `<section>`/`<div>` tags balanced (36/36, 79/79).
- CSS brace-balanced on both stylesheets (144/144, 49/49).
- All Archive-related element IDs referenced by the JS confirmed present
  exactly once in `admin/index.html`.
- Existing backend test suite still passes.
- Confirmed no leftover references to the removed `.weekly-planner-header-actions`
  wrapper class anywhere in HTML/CSS/JS.

## Upload instructions
Copy these files into the corresponding paths in the live repo, preserving
the folder structure exactly.
