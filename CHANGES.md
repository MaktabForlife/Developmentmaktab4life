# V97.1.5.5 Hotfix — Zoom link stuck on mobile

## Files changed (5)
- `js/m4l-shell.js`
- `js/m4l-timetable.js`
- `student/index.html`
- `admin/index.html`
- `version.json`

## What was wrong
1. `runManualRefresh()` was called by Attendance, Timetable, and Shell's own
   resource-view refresh, but it had been renamed to `runUserBandRefresh`
   during an earlier cleanup and never restored under its old name. Every
   manual refresh threw a `ReferenceError` before it could contact the
   Worker, which the UI surfaced simply as "Refresh failed."
2. Timetable data cached in `localStorage` was trusted for up to 7 days with
   no attempt to revalidate online, so a saved Zoom-link change only reached
   a given device once its local cache expired or a (broken) manual refresh
   ran on that device.

Together these meant a phone that opened the app once, cached the old link,
and never had a working manual refresh could stay on the stale Zoom link for
up to a week — while the admin's own browser (where the link was saved)
looked correct immediately because saving writes straight into that
browser's own cache.

## What changed
1. **`js/m4l-shell.js`** — restored `runManualRefresh` as an alias of the
   existing `runUserBandRefresh` helper, so all six existing call sites
   resolve without any other file needing to change. Also added it to the
   `window.M4L` export object alongside `runUserBandRefresh` for consistency.
2. **`js/m4l-timetable.js`** — `fetchTimetable()` still returns cached data
   immediately (no loading delay), but now also fires a de-duplicated
   background request to the Worker. If the response differs from what's
   cached, the cache is updated and the currently visible timetable
   re-renders in place — closing the up-to-7-day staleness window instead of
   just shortening it. Background revalidation is skipped while offline and
   fails silently (the visible cached timetable is left in place) so it
   never surfaces an error for a refresh the user didn't ask for.
3. **`student/index.html` / `admin/index.html`** — bumped the `?v=`
   cache-busting query strings for `m4l-shell.js` and `m4l-timetable.js`
   from `96.5`/`92` to `97.1.5.5`, so browsers (including installed/pinned
   mobile shortcuts) fetch the corrected files instead of a cached copy of
   the old, broken ones.
4. **`version.json`** — bumped to `97.1.5.5`.

## Verified
- `node --check` passes on both modified `.js` files.
- Confirmed by inspection that no other file references the old
  `runUserBandRefresh`-only name in a way that would break, and that the
  `window.M4L` export block still exposes both names.
- No existing test files exercise `runManualRefresh` or `fetchTimetable`
  directly, so no test updates were required.

## Upload instructions
Copy these files into the corresponding paths in the live repo, preserving
the folder structure exactly (`js/`, `student/`, `admin/` at the repo root).
No other files need to change.
