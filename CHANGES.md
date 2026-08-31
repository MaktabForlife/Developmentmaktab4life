# V104.4 Changes — Read Metrics & Full Regression

- Rebuilt V104.4 on the completed V104.3 request-deduplicated Development baseline.
- Preserved the V104.3 private request read context, single/batch overlap reuse, in-flight deduplication and write invalidation.
- Added test-only Google Sheets HTTP read metrics and explicit request budgets for Academy timetable, Attendance, Progress and TeacherAssign timetable reads.
- Added a source-level V104 read-path guardrail: 23 direct read call sites across 17 source files and at least 15 batch-read call sites.
- Added canonical `cd backend && npm test` full-suite runner.
- Added `test:v104.4-read-audit` npm script while retaining the V104.3 `test:request-read-dedup` script.
- Aligned retryable Google Sheets GET failures to one retry maximum (two total attempts).
- Added a regression proving persistent transient Google failures stop after the second attempt and remain failures.
- Added `docs/V104.4-READ-METRICS-AND-REGRESSION.md`.
- No Sheet schema, identity, permission, timetable, Attendance, Progress, Library, Planner, publication or data-ownership rules changed.
- Worker/app version advanced to 104.4.
- Final verification: 63/63 backend test files passed; 154/154 repository JS/MJS files passed Node syntax checking.
