# Maktab4Life V104.5.4

V104.5.4 refines the Global Course and Academy timetable UI on top of the completed V104.5.3 derived/explicit scheduling model.

## What changed

- Academy Global Course pills use **Course Name** as the primary label for both DERIVED and EXPLICIT publications.
- Published Hifz DERIVED occurrences remain regression-protected in the Academy day calendar.
- Detailed/large timetable pills centre their content.
- A current authorised Zoom session uses the full purple Zoom-colour pill, with the supplied link icon beside `Zoom`.
- Saved Courses always show the inline Publish control; when ineligible it is visible but disabled with a reason tooltip.
- DERIVED action label is `Exception` (singular).
- New recurring Start/End fields are blank and show `--h--`.
- `+ Add another time slot` moves beneath the schedule rows.
- Time-slot deletion uses the supplied Lucide `trash-2` icon.

## Compatibility

Platform schema remains **102.0.12** with **19 tabs**. **Do not run Prepare Scheduling again** for V104.5.4. There are no Sheet columns, access rules, Course modes, data ownership or Program Builder changes.

V104.3 request-local read deduplication, V104.4 read budgets and V104.5.3 authoritative ONGOING draft publication windows remain intact.

See `docs/V104.5.4-IMPLEMENTATION-CHECKLIST.md`, `docs/V104.5.4-COURSE-ACADEMY-UI-REFINEMENT.md`, and `UPDATE-TODO.md`.

## Final verification

- Backend regression: **68/68 test files passed**.
- Repository JS/MJS syntax: **160/160 files passed**.
- V104.4 read audit: **23 direct-read call sites across 17 files; 15 batch-read call sites**.
- V104.3 request-level read deduplication: passed.
