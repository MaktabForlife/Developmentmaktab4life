# V103.1.0.5 Changes — Courses

## UI

- Rename Global Curriculum `Course Scheduler` to `Courses`.
- Replace the setup/modify Course flow with an inline Courses table.
- Add Active / Archived / All filter.
- Add one larger dirty-state Courses Save icon.
- Add inline FIXED / ONGOING Type controls.
- Add Course AccessModel selector restricted to FREE / PAID.
- Add explicit ACTIVE / INACTIVE status control.
- Add expandable recurring schedule per Course.
- Add direct Publish action on the Course row.
- Keep View/Edit Sessions as an optional detailed workflow.
- Add internal vertical scrolling to the detailed session editor.
- Show Holidays in red and Islamic-date context in green.
- Use refreshed Global/Academy responsive styling.

## Course lifecycle

- FIXED StartDate/EndDate define the current delivery period.
- ONGOING Course StartDate/EndDate remain blank.
- ONGOING Publish From/Through drives dated-session generation/publication.
- Ended FIXED Courses remain ACTIVE unless the user explicitly archives them.
- Repeating a FIXED Course preserves prior published history and creates/prepares sessions for the revised delivery window.
- Saved Courses are not hard-deleted from the Courses table.

## Course access

- Add `AccessModel` to GlobalSubjectRuns.
- Accepted Course values are exactly FREE / PAID.
- FREE Course access is automatic for every active central account.
- PAID Course access does not inherit a FREE Global Subject policy.
- During the V103.1.0.5 transition, PAID participant access requires the existing explicit linked-Global-Subject access entitlement.
- Per-user contextual roles remain a later V103 unified Access Matrix concern.

## Scheduling/publication

- Recurring schedule rows support Days, Start, End, Module, Teacher and Zoom.
- TBA teacher remains valid and publishable.
- Schedule Save and Course metadata Save do not alter the current published snapshot.
- Direct row Publish is available after changes are saved and the draft session set is valid.
- ONGOING Publish requires Publish From/Through and publishes only that window.
- FIXED Publish uses the current Start/End delivery period.
- Publication remains per Course; multiple Courses can be published concurrently.
- `skipExistingEquivalent` allows an ONGOING publication window to be safely prepared again without generating duplicate equivalent sessions.

## Platform schema

- PlatformSchemaVersion advances `102.0.8 → 102.0.9` after the controlled Course migration.
- GlobalSubjectRuns header expands from 13 to 14 columns by appending `AccessModel`.
- Old 13-column rows remain readable before migration.
- Course mutation is blocked until migration is complete.
- Add `POST /api/admin/platform/global/courses/migrate-access` with preview and commit modes.
- Migration requires GLOBAL_ADMIN and exact commit confirmation.
- No new Platform tab; total remains 19.

## Tests/version

- Worker/app version advanced to `103.1.0.5`.
- Added Course FREE/PAID migration, entitlement, reusable FIXED Course, ONGOING publication-window, direct-publish and UI regression coverage.
