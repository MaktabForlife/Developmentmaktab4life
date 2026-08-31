# Maktab4Life V104.2

V104.2 continues the Google Sheets query-reduction phase on the completed V103.1 Central Identity foundation.

## Focus

V104.1 batched high-volume Platform workbook reads. V104.2 now batches related **Program/Reboot workbook** reads where doing so preserves existing failure and compatibility behaviour.

Key reductions include:

- Academy Home Program timetable: 4 Program requests → 2 for the published GLOBAL_ADMIN fixture, with student/staff identity verification folded into the Program profile/config batch.
- Progress: four required Program table reads → one batch per view.
- Attendance report: two Program reads → one batch.
- Library curriculum options/validation: three Program reads → one batch.
- TeacherAssign reference reads: four tables → one batch.
- Central identity/account migration Program snapshot: AdminRecords + StudentRecords → one batch.

The measured Academy fixture is now **4 total Sheets requests** (credential + Platform + two Program batches), compared with 6 in V104.1 and 18 before V104.1.

## Unchanged

No Sheet migration is required. Keep `PlatformConfig!B3 = 102.0.9` with 19 required Platform tabs.

V104.2 does not change access rules, timetable visibility, Course FREE/PAID behaviour, Attendance, Progress, Planner, resource permissions or publication semantics.

## Next

V104.3 is intended to add **request-level read deduplication** only: if one helper already loaded a range during the same Worker request, another helper can reuse it. No persistent cross-request cache is planned at this stage.

See:

- `docs/V104.1-GOOGLE-SHEETS-READ-AUDIT.md`
- `docs/V104.1-PLATFORM-BATCH-READS.md`
- `docs/V104.2-PROGRAM-BATCH-READS.md`
- `PRODUCTION-MIGRATION-V101.1.md`
