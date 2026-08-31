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

## V104+ / V105 / V106

Append each future schema/data/config migration here as it is built. In particular, record:

- remaining V104 read-optimisation changes;
- generic Program Builder schema in V105;
- Reboot migration into the generic Program architecture in V106;
- any Worker variables/secrets/bindings changes;
- any Apps Script or Drive migration;
- rollback checkpoints.

## Final migration gate

The final architecture release must not be declared Production-ready until a complete **V101.1 Production clone → final V106 state** migration rehearsal succeeds with no unresolved data, permissions or behaviour regressions.

## V104.1 — Platform Batch Reads

**Data/schema migration:** none.

- Platform schema remains `102.0.9` with 19 required tabs.
- Changes Google Sheets Platform read transport only: related Platform ranges are fetched through validated `values:batchGet` requests.
- Academy Home Platform state: 13 reads → 1 batchGet.
- Central account state: 2–8 Platform reads → 1 batchGet.
- GLOBAL session access tables: 3 reads → 1 batchGet, plus the existing credential-row revalidation.
- No Program/Reboot batch-read conversion yet.
- No rollback data action is required; code rollback restores the previous individual-read transport.

## V104.2 — Program Batch Reads

**Data/schema migration:** none.

- Platform schema remains `102.0.9` with 19 required tabs.
- Related Reboot/Program reads are grouped through Google Sheets `values:batchGet` where compatibility permits.
- Academy Home Program layer: published Program fixture 4 Program calls → 2 Program batches.
- Progress required-table reads: 4 → 1 batch.
- Attendance report: 2 → 1 batch.
- Library curriculum option/placement validation: 3 → 1 batch.
- TeacherAssign reference reads: 4 → 1 batch.
- Identity-link/account-migration AdminRecords + StudentRecords snapshots: 2 → 1 batch.
- No data rollback action is required; code rollback restores the prior read transport.
- Keep the V103.1 Identity Links and V103.1.0.5 Courses migrations already completed in Development; V104.2 does not rerun or alter them.

## Roadmap after V104

- V104.3 — request-level read deduplication.
- V104.4 — read metrics/final optimisation regression gate.
- V105 — generic Program Builder.
- V106 — Reboot migration into the generic Program architecture.

The final Production migration gate therefore moves with the roadmap: a complete **V101.1 Production clone → final V106 state** rehearsal must succeed before live Production promotion.
