# V104.5 Release Notes — Derived-by-default Global Courses

V104.5 aligns Global Course timetable delivery with the rule-driven Program model while preserving an intentional exact-session option for workshops and similar offerings.

## DERIVED is the new default

After the one-time V104.5 scheduling migration, newly created Courses default to `DERIVED`.

A DERIVED Course stores recurring rules in `GlobalSubjectRuns.ScheduleDefinition`. Normal dated occurrences are calculated only for the date range being requested or published. They are not pre-created in `GlobalTimetableSessions` and are not stored as normal publication snapshot rows.

This avoids filling Google Sheets with months or years of predictable recurring occurrences, especially for ONGOING Courses.

## Materialised exceptions

A derived occurrence receives a stored row only when that occurrence needs individual treatment. V104.5 introduces `SessionKind=EXCEPTION` with a stable `ScheduleRuleKey + OccurrenceDate` anchor.

Examples include:

- CANCELLED occurrence;
- moved occurrence;
- different teacher/time/Zoom;
- one-off exact session.

Editing an existing exception is validated against both materialised rows and the still-virtual recurring occurrences. The legacy reschedule endpoint is deliberately blocked for derived exceptions so one occurrence cannot accidentally acquire duplicate exception rows.

## EXPLICIT sessions remain supported

`EXPLICIT` retains the exact-session workflow. It is intended for offerings where the exact dates themselves are part of the product/marketing promise, such as a four-session workshop or short intensive.

Regression coverage proves an EXPLICIT September Friday workshop creates exactly four dated source sessions and publishes exactly four immutable session snapshots.

## Publication integrity

DERIVED publications store an immutable recurring-rule snapshot plus immutable Course display metadata and only exception snapshots. `SessionCount` remains the count of effective dated occurrences in the publication window.

Academy can therefore reconstruct a DERIVED publication with zero normal session snapshot rows while historical publication meaning remains fixed.

## Academy Calendar

Fixed DERIVED Courses continue to receive Academic Calendar/public-holiday context even if they have no materialised sessions. This keeps exception editing and holiday awareness available under the new virtual-occurrence model.

## Controlled schema migration

Platform schema advances from `102.0.9` to `102.0.10`. Required Platform tab count remains 19.

The migration extends:

- `GlobalSubjectRuns`
- `GlobalTimetableSessions`
- `GlobalTimetablePublications`
- `PublishedGlobalTimetableSessions`

Existing Courses and existing publication/session rows are backfilled as `EXPLICIT`. Existing publication dates and immutable display values are preserved/inferred from their current snapshots. Nothing existing is automatically converted to DERIVED.

## Compatibility

V104.5 does not change Program timetable rules, central identity, Course access (`FREE`/`PAID`), Academy access decisions, Attendance, Progress, Library, Planner or data ownership.

V104.1–V104.4 batching, request-local read deduplication, metrics and retry guardrails remain active.

## Final verification

- Full backend regression: **64/64 test files passed**.
- Repository JavaScript/ES module syntax: **156/156 files passed**.
- V104.4 read-path audit retained: **23 direct-read call sites across 17 source files; 15 batch-read call sites**.
- V104.3 request-level read-deduplication regression retained.
