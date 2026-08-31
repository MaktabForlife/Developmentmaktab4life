# V104.2 Release Notes — Program Batch Reads

V104.2 reduces Google Sheets API pressure in Program/Reboot data paths without changing user-visible business behaviour.

## Academy Home

Each active Program now uses a batched profile/config read followed by one batch for the authoritative timetable source. In the integration fixture, the one-Program Academy request falls from **6 total Sheets requests in V104.1 to 4 in V104.2**, versus 18 before the V104 optimisation phase.

The two-stage Program design is intentional: `SystemConfig.TimetableLiveSource` first determines whether Published Timetable or TeacherAssign is authoritative, so V104.2 does not load both full timetable sources blindly.

## Other Program reductions

- Progress required-table reads: 4 → 1 batch.
- Attendance report: 2 → 1 batch.
- Library curriculum options/validation: 3 → 1 batch.
- TeacherAssign required reference tables: 4 → 1 batch.
- V103.1 identity-link and legacy account-migration Reboot profile snapshots: 2 → 1 batch.

## Compatibility

No schema migration. `PlatformConfig!B3` stays `102.0.9` and the Platform workbook remains at 19 required tabs.

Existing optional/missing-Sheet safeguards remain fail-safe; notably the obsolete `TimeTable` Zoom fallback and optional resource-sheet scans are not forced into a batch that could make a missing legacy tab break current functionality.
