# Maktabhelper

Current development release: **V102.11 — exact-dated Global Subject timetable and immutable publication**.

V102.11 starts from the complete deployed V102.10 development repository. The verified V102.10 FREE/SUBSCRIPTION access matrix, Global Subject runs, protected Drive resources and Attendance save-reset carry-forward remain intact.

## What V102.11 adds

- A central Global Subject schedule independent of course Sheets.
- Exact dated sessions tied to `GlobalSubjectRuns`.
- Repeated weekday generation across a run's StartDate/EndDate.
- Individual date editing for holidays, gaps and exceptions.
- Central `UserAccounts.AccountID` teacher assignment; course membership is not required.
- Optional per-session HTTPS Zoom link.
- Development/PUBLISHED run state with the current publication pointer.
- Immutable per-run publications and immutable published-session snapshots.
- Draft edits after publication leave the last published snapshot untouched until the next publish.
- `GlobalTimetableVersion`, incremented only by successful publication.
- Global Curriculum **Schedule** UI for generation, session editing and publication.
- Central `PlatformAuditLog` entries for generation, edits, state changes and publication.

## Platform migration

V102.11 advances Platform schema `102.0.5` → `102.0.6` and required Platform tabs from **13 to 17** by adding:

- `GlobalTimetableSessions`
- `GlobalTimetableRunState`
- `GlobalTimetablePublications`
- `PublishedGlobalTimetableSessions`

It also adds one `PlatformConfig` key: `GlobalTimetableVersion = 1`.

Follow `V102.11-PLATFORM-SHEET-MIGRATION.md` and `UPDATE-TODO.md` exactly. Create the four tabs and config key while schema remains `102.0.5`; deploy Pages + Worker from the same commit; only then change the schema marker to `102.0.6` and validate. The new Schedule endpoints deliberately remain unavailable until that `102.0.6` cut-over is complete.

## Publication behavior

Only active dated sessions are snapshotted. Published rows are append-only. Editing/deactivating a source session after publication changes the draft and marks the run DEVELOPMENT, but `CurrentPublicationID` remains on the previous immutable publication until the next successful publish.

`GlobalTimetableVersion` changes only on publish, not on draft generation/editing.

## Scope boundary

V102.11 **does not yet expose Global Subject sessions in the academy timetable**. V102.12 will combine current published course timetables and published Global Subject sessions with backend DETAIL/LABEL redaction.

V102.11 also does not add billing/payment processing, subscription expiry, cross-course conflict detection or Aalimiyah onboarding.

## Existing fixes preserved

The Attendance save-reset carry-forward remains present: after a successful Attendance save the loaded register resets to Present; failed saves keep current marks. No Attendance permission/backend behavior is changed by V102.11.

## Package

Use the V102.11 changed-files overlay generated from the complete deployed V102.10 repository. Exact included paths are listed in `CHANGED-FILES.txt`; V102.11 intentionally deletes no runtime path.
