# V104.4 Release Notes — Read Metrics & Full Regression

V104.4 turns the V104 Google Sheets reductions into enforced regression budgets without changing application behaviour or data ownership.

## Read budgets now enforced

- Academy timetable, one published Program: **4 Sheets requests**.
- Academy rolling seven-day load: **4 Sheets requests** — seven-day loading must not multiply backend Sheet reads.
- Attendance report: **1 batch request** for 2 ranges.
- Progress student/report/detail reads: **1 batch request** per operation for 4 ranges.
- TeacherAssign timetable with configured Global Zoom: **2 requests**.
- Compatibility path with the optional legacy Zoom fallback: **3 requests**.

V104.4 also freezes the current source inventory at no more than 23 direct read call sites across 17 source files, while retaining at least 15 batch-read call sites.

## Full regression gate

A canonical `npm test` runner now executes every backend `*.test.mjs` file in isolation. The V104.4 build passes **62/62 backend test files**.

## Google transient-read retries

The Sheets client now follows the originally agreed V104 failure policy: one retry maximum for retryable Google read failures. A persistent transient failure therefore stops after two total attempts rather than allowing a second retry.

## No user-facing metrics

The read counters are test-only instrumentation. No diagnostic fields, Sheet counts or internal read information are added to normal API responses.

## V104.3 boundary

This V104.4 overlay is built on V104.2. V104.3 request-level read deduplication is not included and remains a separate pending optimisation; no cross-request data cache has been introduced.

## Migration

No Google Sheet migration is required. Keep `PlatformConfig!B3 = 102.0.9` and the existing 19 required Platform tabs.
