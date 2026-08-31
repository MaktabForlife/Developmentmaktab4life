# Maktab4Life V104.5

V104.5 changes **Global Course scheduling** so normal recurring Course occurrences are derived by default instead of being pre-created as rows.

It is built on the completed V104.1–V104.4 Google Sheets read-optimisation foundation.

## Course scheduling model

Course **Type** and **Scheduling** are independent:

| Course Type | Meaning |
| --- | --- |
| `FIXED` | The current delivery has a defined StartDate and EndDate. |
| `ONGOING` | The Course has no permanent delivery end; a publish window is selected when needed. |

| Scheduling mode | Meaning |
| --- | --- |
| `DERIVED` | **Default for new Courses.** Store recurring rules and derive dated occurrences only for the requested/published date window. Normal occurrences are not stored as session rows. |
| `EXPLICIT` | Intentionally create/store exact dated sessions. Intended for short workshops, intensives and other offerings where the exact sessions should be prepared and published. |

## DERIVED Courses

A recurring definition such as:

```text
Monday · 09h00–10h00 · Module 1 · Teacher A
```

is stored on `GlobalSubjectRuns.ScheduleDefinition`.

When Academy asks for a week, or a publication is resolved, the Worker derives only the applicable dated occurrences. A normal derived occurrence therefore creates **no** `GlobalTimetableSessions` row and **no** normal `PublishedGlobalTimetableSessions` snapshot row.

Only occurrence-specific changes are materialised as `SessionKind=EXCEPTION`, for example cancellation, moved occurrence, teacher/time/Zoom override, or a one-off extra session.

## EXPLICIT Courses

EXPLICIT keeps the existing exact-session workflow. A four-session September workshop can deliberately create and publish four dated session rows. Those exact rows remain first-class publication snapshots and can be prepared for a marketed offering.

## Immutable publication

A DERIVED publication stores:

- the publish window;
- immutable Course/Subject/timezone display values;
- an immutable enriched recurring `ScheduleDefinition` snapshot;
- only materialised exception session snapshots.

`SessionCount` records the effective dated occurrence count for the publication window, even though normal derived occurrences are virtual.

EXPLICIT publication retains the prior exact-session snapshot behaviour.

## Migration

V104.5 advances the Platform schema from **102.0.9 → 102.0.10** while keeping the same **19 Platform tabs**.

The controlled migration deliberately preserves all existing Courses as `EXPLICIT`, so existing published timetables are not reinterpreted. After migration, newly created Courses default to `DERIVED`.

Do not manually add the new columns before using the V104.5 migration workflow.

## Verification

Run:

```bash
cd backend
npm test
npm run test:v104.5-derived-courses
npm run test:v104.4-read-audit
npm run test:request-read-dedup
```

The V104.4 Google Sheets read budgets and V104.3 request-local deduplication remain regression-protected. Final V104.5 verification passed **64/64 backend test files** and **156/156 repository JS/MJS syntax checks**.

## Roadmap

- V103 — Central Identity ✅
- V104.1–V104.4 — Google Sheets Read Optimisation ✅
- V104.5 — Derived-by-default Global Courses
- V105 — Program Builder
- V106 — Reboot Migration

See `docs/V104.5-DERIVED-COURSE-SCHEDULING.md` and `UPDATE-TODO.md`.
