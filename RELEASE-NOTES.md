# V104.1 Release Notes — Platform Batch Reads

V104.1 reduces Google Sheets API pressure by replacing groups of independent Platform Sheet reads with validated `values:batchGet` requests.

## Academy Home

The Academy timetable previously loaded 13 Platform tabs with 13 separate Google API reads after authentication. V104.1 loads those same 13 ranges in one batch request.

The existing integration fixture now records 6 total Sheets API calls for a Platform-admin Academy timetable load with one published Program, down from 18 before V104.1. Program reads account for 4 of the remaining calls and are reserved for V104.2.

## Central account loading

Account check/login/context state now loads its 2–8 required Platform tables with one batchGet.

GLOBAL central-token revalidation now batches the Access Matrix, access policy and Global Subject list into one request while retaining immediate credential-row validation.

## Business behaviour

Unchanged. V104.1 does not modify access rules, session visibility, publication logic, Course FREE/PAID behaviour, Reboot operational IDs, attendance, progress, planner or resource permission logic.

## Schema

No migration is required. Keep `PlatformConfig!B3 = 102.0.9` and 19 Platform tabs.

## Next components

- V104.2: Program/Reboot batch reads.
- V104.3: request-level read deduplication.
- V104.4: metrics and full read-budget regression.
