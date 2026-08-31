# Maktab4Life V104.1

V104.1 begins the Google Sheets read-optimisation phase on the completed V103.1 Central Identity foundation.

The release changes **how related Platform ranges are fetched**, not what the application is allowed to see or do.

## Main change

A new validated `readPlatformSheets()` helper retrieves related Platform tabs through one Google Sheets `values:batchGet` call and then applies the existing strict per-tab Platform schema validation.

V104.1 converts the highest-volume Platform startup paths:

- Academy Home's 13 Platform timetable/calendar/access tables now use one batch read.
- Central account check/login/context state loads its related Platform tables in one batch.
- GLOBAL account-session validation batches its three Global access/curriculum tables.

The Academy timetable integration fixture falls from 18 Sheets API calls to 6 for the same one-Program Platform-admin request, before Program batching is introduced.

## V104 boundary

V104.1 intentionally leaves Reboot/Program spreadsheet reads unchanged. Program batch reads are planned for V104.2, followed by request-level read deduplication in V104.3.

No persistent cache, KV or D1 dependency is introduced.

## Schema

No Sheet migration.

- `PlatformConfig!B3 = 102.0.9`
- 19 required Platform tabs
- V103.1 Reboot AccountID identity links remain in place.

See:

- `docs/V104.1-GOOGLE-SHEETS-READ-AUDIT.md`
- `docs/V104.1-PLATFORM-BATCH-READS.md`
- `PRODUCTION-MIGRATION-V101.1.md`
