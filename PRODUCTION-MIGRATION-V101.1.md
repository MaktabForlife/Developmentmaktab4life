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

## V104.3 — Request-Level Read Cache & Deduplication

**Data/schema migration:** none.

- V104.3 is Worker/app code only.
- Each routed Worker request receives a private Google Sheets range-read context.
- Exact SpreadsheetID + range reads may be reused only inside that request.
- Successful Sheet writes invalidate the affected spreadsheet's request-local cached ranges.
- No cross-request cache, KV, D1, Redis or persistent snapshot is introduced.
- Rollback requires code rollback only; no data rollback action is required.
- Keep the V103.1 Identity Links and V103.1.0.5 Courses migrations already completed in Development; V104.3 does not rerun or alter them.

## V104.4 — Read Metrics & Full Regression

**Data/schema migration:** none.

- Built on the completed V104.3 request-level read-deduplication layer.
- Adds test-only request metrics/guardrails for the V104.1/V104.2 batching and V104.3 deduplication foundation.
- Academy one-Program and rolling seven-day fixture: 4 total Sheets requests.
- Attendance report: 1 batch request.
- Progress guarded read operations: 1 batch request each.
- Configured TeacherAssign timetable fixture: 2 requests; tolerant legacy Zoom fallback fixture: 3.
- Source read-path boundary: 23 direct read call sites across 17 files and at least 15 batch-read call sites.
- Full backend regression is available through `cd backend && npm test`; final V104.4 tree contains 63 backend test files.
- Retryable Google Sheets GET failures allow one retry maximum (two total attempts).
- V104.3 request-local deduplication and write invalidation remain active. No cross-request Sheet-data cache is introduced.
- No rollback data action is required; code rollback restores the prior read/retry/test behaviour.

## Roadmap after V104.4

- V105 — generic Program Builder.
- V106 — Reboot migration into the generic Program architecture.

The final Production migration gate therefore moves with the roadmap: a complete **V101.1 Production clone → final V106 state** rehearsal must succeed before live Production promotion.

## V104.5 — Derived-by-default Global Course Scheduling

**Data/schema migration:** yes — controlled Platform migration `102.0.9 → 102.0.10`.

**Platform tab count:** unchanged at 19.

V104.5 extends four existing tabs:

- `GlobalSubjectRuns` adds `ScheduleMode`, `ScheduleDefinition`.
- `GlobalTimetableSessions` adds `SessionKind`, `ScheduleRuleKey`, `OccurrenceDate`.
- `GlobalTimetablePublications` adds `ScheduleMode`, `PublishStartDate`, `PublishEndDate`, `ScheduleDefinition`, `RunName`, `SubjectName`, `Timezone`.
- `PublishedGlobalTimetableSessions` adds `SessionKind`, `ScheduleRuleKey`, `OccurrenceDate`.

Controlled migration path:

1. Start from the final V104.4 code + Platform schema `102.0.9`.
2. Create a rollback copy of the Platform workbook.
3. Deploy V104.5 code while the workbook is still `102.0.9`.
4. GLOBAL_ADMIN opens Global Curriculum → Courses → **Prepare Scheduling**.
5. Preview the migration.
6. Confirm every existing Course is proposed as `EXPLICIT` and the new-Course default is `DERIVED`.
7. Commit using `MIGRATE COURSE SCHEDULING`.
8. Confirm `PlatformSchemaVersion = 102.0.10` and run Platform validation.
9. Confirm existing published Courses resolve unchanged.
10. Test one new DERIVED Course, one materialised exception and one EXPLICIT short workshop before Production acceptance.

Backfill/preservation rules:

- every existing Course remains `EXPLICIT`;
- every existing source session becomes `SessionKind=EXPLICIT`;
- every existing published session snapshot becomes `SessionKind=EXPLICIT`;
- existing publication windows/display values are retained or inferred from the immutable snapshot/run data;
- no existing Course is automatically converted to DERIVED;
- no new Platform tab is added.

Rollback boundary:

- before migration commit: code rollback to V104.4 only;
- after migration commit: restore both V104.4 code **and** the pre-migration `102.0.9` Platform-workbook copy. Do not run V104.4 against the migrated `102.0.10` workbook.

V104.5 does not introduce Program Builder schema or migrate Program data. Those remain V105/V106 work.

## Roadmap after V104.5

- V105 — generic Program Builder.
- V106 — Reboot migration into the generic Program architecture.

The final Production migration gate remains a complete **V101.1 Production clone → final V106 state** rehearsal before live Production promotion.

## V104.5.1 — Course publish/session UI refinement

**Data/schema migration:** conditional. If V104.5 already migrated the Platform workbook to `102.0.10`, V104.5.1 upgrades it to `102.0.11` by adding optional `SessionDescription` to source and published exact-session tables. If the workbook is still `102.0.9`, V104.5.1 can perform the combined V104.5/V104.5.1 scheduling migration directly to `102.0.11`.

**Platform tab count:** unchanged at 19.

V104.5.1 changes the administrative workflow as follows:

- Course Name remains inline-editable but is displayed as a coloured pill;
- Schedule and Sessions/Exceptions use icon + text edit actions;
- Publish is visible only for saved, active, publishable unpublished/revised Courses;
- dirty, inactive, unsaved, clean-published and non-publishable Courses show no Publish action;
- Course-row Publish is the only publishing surface;
- Sessions/Exceptions contains only Cancel + Save actions and has a stronger outer card border;
- EXPLICIT session rows may carry an optional `SessionDescription` up to 400 characters and publication snapshots retain it immutably.

For Production rehearsal, verify both schema-start cases if they are relevant to the deployment path:

1. `102.0.9 → 102.0.11`: existing Courses become EXPLICIT and existing publication meaning is preserved.
2. `102.0.10 → 102.0.11`: existing Course modes/publications remain unchanged; only description storage is added.
3. Confirm no new Platform tab is created.
4. Confirm one EXPLICIT workshop can save descriptions, then publish those descriptions from the Course row only.
5. Confirm one DERIVED Course still publishes normal virtual occurrences with only exceptions materialised.
