# V104.3 Changes — Request-Level Read Cache & Deduplication

- Added one private Google Sheets read context per routed Worker request.
- Added exact SpreadsheetID + range deduplication to `readGoogleSheetValues()`.
- Added overlap-aware deduplication to `batchReadGoogleSheetValues()`; only missing ranges are sent in a new `batchGet`.
- Reused in-flight promises so concurrent same-range readers share one Google request.
- Allowed Course environment wrappers to inherit the same request read context safely.
- Returned defensive row copies so downstream mutation cannot corrupt the cached snapshot.
- Invalidated a spreadsheet's request cache after successful value update, append, value batchUpdate, or spreadsheet batchUpdate.
- Kept Google Sheet-properties reads outside the range cache because they are metadata reads rather than value-range reads.
- Added dedicated V104.3 request-deduplication regression coverage.
- Added `docs/V104.3-REQUEST-READ-DEDUPLICATION.md`.
- No schema, permission, access, publication, or user-visible business-rule changes.
- Worker/app version advanced to 104.3.
- Full backend regression verified at 62/62 test files; JS/MJS syntax verification passed 140/140 files.
