# V104.3 Release Notes — Request-Level Read Deduplication

V104.3 prevents the same Google Sheet range from being fetched more than once inside one Worker request, without adding any cross-request or persistent data cache.

## Request-local read context

The router creates a new private environment wrapper for every routed request. Its Google Sheets read map is inherited by authenticated Course environment wrappers but is never attached to the shared Cloudflare Worker `env` object.

Exact reads are cached by SpreadsheetID and normalized A1 range. Repeated and concurrent calls reuse the same promise/result. This applies across single reads and overlapping `batchGet` calls.

## Batch interoperability

If a batch asks for ranges already loaded earlier in the request, only the missing ranges are sent to Google. Likewise, a later single-range read can reuse a range returned by an earlier batch. Duplicate ranges supplied inside one batch are fetched once.

## Write invalidation

Successful value updates, appends, value batch updates, and spreadsheet batch updates invalidate cached reads for the affected spreadsheet. This protects read-after-write behaviour within the same request.

## Isolation and compatibility

- No cache is shared between Worker requests.
- No TTL/KV/D1/Redis cache is introduced.
- Cached arrays are copied before being returned to callers.
- Different spreadsheets never share cached ranges.
- Different A1 ranges are not treated as equivalent.
- No Sheet schema or business/access rules change.

## Regression coverage

A dedicated V104.3 test verifies repeated reads, concurrent in-flight reuse, batch/single overlap, spreadsheet separation, Course-environment inheritance, request isolation, defensive copies, and mutation invalidation.

## Verification

- Full backend regression: **62/62 test files passed**.
- Node syntax verification: **140/140 backend/src, backend/tests and app JS/MJS files passed**.
- No files are deleted by the V104.3 overlay.
