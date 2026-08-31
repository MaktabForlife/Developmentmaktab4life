# Maktab4Life V104.4

V104.4 is the measurement and regression-gate component of the Google Sheets read-optimisation phase built on the completed V104.1 Platform batching and V104.2 Program batching work.

## Focus

V104.4 does not add another data layer or persistent cache. It makes the optimised read shapes measurable in tests and prevents later work from silently reintroducing high Google Sheets request counts.

Current guarded examples:

- Academy timetable: 4 Sheets requests for one published Program.
- Academy rolling seven-day load: the same 4-request budget.
- Attendance report: 1 batch request.
- Progress reads: 1 batch request per operation.
- configured TeacherAssign timetable: 2 requests.

The backend now has one canonical full-suite command:

```bash
cd backend
npm test
```

The V104.4 tree passes 62/62 backend test files.

Google read retries are limited to one retry after the original attempt for transient 429/5xx failures.

## Compatibility

No Sheet migration is required. Keep `PlatformConfig!B3 = 102.0.9` with 19 required Platform tabs.

V104.4 changes no access, identity, timetable, Attendance, Progress, Planner, Library, publication or data-ownership rules.

## V104.3

V104.3 request-level read deduplication is not present in this V104.4 overlay. It remains a separate pending optimisation and must not become a cross-request stale-data cache.

## Documentation

- `docs/V104.1-GOOGLE-SHEETS-READ-AUDIT.md`
- `docs/V104.1-PLATFORM-BATCH-READS.md`
- `docs/V104.2-PROGRAM-BATCH-READS.md`
- `docs/V104.4-READ-METRICS-AND-REGRESSION.md`
- `PRODUCTION-MIGRATION-V101.1.md`
