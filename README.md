# Maktab4Life V104.3

V104.3 adds **request-level Google Sheets read cache and deduplication** on top of the completed V104.1 Platform and V104.2 Program batch-read work.

## Focus

Each routed Worker request now receives a private request environment containing a Google Sheets read context. Exact reads are keyed by **SpreadsheetID + normalized range**. If another helper asks for the same range during that same Worker request, it reuses the existing in-flight/completed read instead of issuing another Sheets API request.

The cache works across:

- `readGoogleSheetValues()` → repeated single reads;
- `batchReadGoogleSheetValues()` → overlapping batch ranges;
- single reads followed by batches, and batches followed by single reads;
- Course environment wrappers created inside the same routed request.

Concurrent callers share the same pending read promise, so duplicate reads do not race Google independently. Cached row arrays are copied on return so one helper cannot mutate the stored snapshot for another helper.

## Request scope only

V104.3 introduces **no persistent data cache**. A new read context is created for every routed Worker request. Nothing is shared between browser/API requests, users, or concurrent Worker requests. The existing service-account OAuth token cache remains separate and unchanged.

## Write safety

A successful Sheets mutation invalidates the request cache for that spreadsheet before any later same-request read. This applies to value update/append/batchUpdate and spreadsheet batchUpdate operations. A read after a write therefore returns authoritative post-write data rather than an earlier request snapshot.

## Exact-range rule

V104.3 deliberately deduplicates only exact normalized ranges. For example, `UserAccounts!A2:N2` and `UserAccounts!A:N` remain distinct reads. V104.3 does not infer subsets or synthesize one range from another, preserving existing validation and failure semantics.

## Unchanged

No Google Sheet migration is required. Keep `PlatformConfig!B3 = 102.0.9` with 19 required Platform tabs.

V104.3 changes no roles, permissions, timetable rules, Attendance, Progress, Planner, Library, Course/global access, publication behaviour, or response data apart from the normal application version advancing to 104.3.

## Next

V104.4 should be rebuilt on this V104.3 baseline to provide final read metrics/budgets and the full V104 regression gate.

See:

- `docs/V104.1-GOOGLE-SHEETS-READ-AUDIT.md`
- `docs/V104.1-PLATFORM-BATCH-READS.md`
- `docs/V104.2-PROGRAM-BATCH-READS.md`
- `docs/V104.3-REQUEST-READ-DEDUPLICATION.md`
- `PRODUCTION-MIGRATION-V101.1.md`
