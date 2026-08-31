# V104.4 Release Notes — Google Sheets Read Metrics & Full Regression

V104.4 is the final verification stage of the V104 Google Sheets read-optimisation phase. It is built on V104.3, so request-level read deduplication remains fully active.

## Measured guardrails

The regression suite now asserts real mocked Google Sheets HTTP request budgets rather than relying only on code inspection:

- Academy timetable, one published Program: **4** Sheets requests.
- Academy rolling seven-day load: **4** Sheets requests.
- Attendance report: **1** batch request.
- Student Progress task list: **1** batch request.
- Progress report: **1** batch request.
- Progress detail: **1** batch request.
- TeacherAssign timetable with configured Global Zoom: **2** Sheets requests.
- TeacherAssign timetable with tolerant legacy Zoom fallback: **3** Sheets requests.

The seven-day Academy guardrail proves that expanding the returned timetable window does not multiply underlying Google reads.

## V104.3 retained

The final V104.4 tree still deduplicates exact SpreadsheetID + A1-range reads inside one Worker request, including overlapping batches and concurrent requests from helpers. Successful Sheet writes invalidate the affected request-local spreadsheet cache. No Sheet-data cache persists across Worker requests.

## Read-path audit

The current source boundary is 23 operational direct-read call sites across 17 source files and 15 operational batch-read call sites. V104.4 fails regression if direct-read usage grows above this boundary or batch-read usage drops below it.

## Google failure policy

Retryable Google read failures now allow one retry after the original attempt. Persistent 429/5xx failures stop after two total attempts and remain authoritative failures; they are never converted to empty rows.

## Full regression

V104.4 adds a canonical `npm test` runner that executes every backend `*.test.mjs` file in isolation. The final tree contains 63 backend test files, including the V104.3 request-deduplication regression and the V104.4 read-audit regression. Final verification also passed Node syntax checking for all 154 JS/MJS files in the repository tree.

## Compatibility

No Google Sheet migration is required. `PlatformConfig!B3` remains `102.0.9` with 19 required Platform tabs. No business, access, identity, publication or data-ownership rule changes are included.
