# Production Migration Ledger — V101.1 → Development Future Release

## Purpose

Production remains stable at **V101.1** while the future architecture is built and verified in Development. This ledger records cumulative migration obligations so the final Production upgrade can be rehearsed against a clone of the actual V101.1 Production data before any live cutover.

This file is a migration ledger, not yet a complete executable Production runbook. Older V102 migrations must be reconciled against the actual Production Sheet/config state during the dress rehearsal rather than inferred only from version labels.

## Production baseline

- Live Production application: V101.1 (user-confirmed project baseline).
- Do not apply Development-only migrations to live Production while the new architecture is still under construction.
- Keep Development and Production Drive roots/service-account configuration separate.

## Required final-release discipline

Before live Production promotion:

1. Snapshot/clone the actual Production Platform and Reboot data.
2. Record the actual Production headers, PlatformConfig values and Worker/Pages configuration.
3. Apply the cumulative migrations to the clone in the documented order.
4. Verify login, Attendance, Progress, Planner, Resources, timetable, Academy Home, Global Curriculum and permissions.
5. Rehearse rollback.
6. Only then schedule the live cutover.

## V103.1 — Central Identity Link

Data area: Reboot Program workbook.

Controlled migration adds permanent central `AccountID` links to:

- `StudentRecords`
- `AdminRecords`

Migration path:

- Admin → System Settings → Platform Sheet → V103.1 Identity links.
- Preview first.
- Resolve any missing/ambiguous/conflicting links.
- Commit with the required `LINK <COURSEID>` confirmation.

The migration does not replace StudentID/AdminID operational behaviour in V103.1.

## V103.1.0.1–V103.1.0.4

No additional Sheet schema migration.

These releases contain Global Curriculum UI refinements, Academy timetable fixes/loading and Global Resources batch editing.

## V103.1.0.5 — Courses

Data area: Platform workbook.

Changes:

- `GlobalSubjectRuns` appends `AccessModel` as column 14.
- AccessModel values are `FREE` or `PAID`.
- `PlatformSchemaVersion` advances from `102.0.8` to `102.0.9`.
- Required Platform tab count remains 19.

Controlled Development migration:

1. Deploy V103.1.0.5 code.
2. Global Curriculum → Courses.
3. GLOBAL_ADMIN clicks **Prepare Courses**.
4. Preview each existing Course's proposed FREE/PAID state.
5. Commit migration only after review.
6. Run Platform validation.

Backfill rule preserves the pre-migration effective Course-access starting point:

- linked Global Subject FREE → Course FREE;
- otherwise → Course PAID.

Do not manually add AccessModel in Production ahead of the final rehearsed upgrade unless the final Production runbook explicitly requires it.

## V103.2+ / V104 / V105

Append each future schema/data/config migration here as it is built. In particular, record:

- unified Access model/matrix migration;
- generic Program Builder schema;
- Reboot migration into the generic Program architecture;
- any Worker variables/secrets/bindings changes;
- any Apps Script or Drive migration;
- rollback checkpoints.

## Final migration gate

V105 must not be declared Production-ready until a complete **V101.1 Production clone → final V105 state** migration rehearsal succeeds with no unresolved data, permissions or behaviour regressions.
