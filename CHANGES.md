# V104.4 Changes — Read Metrics & Full Regression

- Added test-only Google Sheets HTTP read metrics and reusable read-budget assertions.
- Locked Academy timetable to 4 Sheets requests for both normal and rolling seven-day one-Program loads.
- Locked Attendance report to 1 batch request for its 2 required ranges.
- Locked Student Progress, Progress report and Progress detail to 1 batch request per operation.
- Added timetable read budgets for configured Global Zoom and tolerant legacy Zoom fallback paths.
- Added a source-level read audit: maximum 23 direct read call sites across 17 files; minimum 15 batch-read call sites.
- Added `npm test` full backend regression runner; V104.4 passes 62/62 test files.
- Reduced retryable Google Sheets GET policy from two retries to the agreed **one retry maximum**.
- Added persistent-failure regression proving retryable reads stop after two total attempts.
- Added `docs/V104.4-READ-METRICS-AND-REGRESSION.md`.
- No Sheet schema, permissions, access, timetable, Attendance, Progress, Planner, resource or publication-rule changes.
- V104.3 request-level deduplication remains separate and is not included in this overlay.
- Worker/app version advanced to 104.4.
