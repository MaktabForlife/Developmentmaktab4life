# V102.12.7 Changes

- Makes `TBA` a valid, publishable Global Course teacher state.
- Keeps `TeacherAccountID` blank for TBA; no fake teacher account is created.
- Published timetable snapshots store `TeacherName = TBA` so delivery has an immutable display label.
- Removes the publication rule that required a TeacherAccountID for every scheduled session; a supplied TeacherAccountID must still resolve to an active account.
- Updates Platform validation and published-timetable integrity checks to accept scheduled TBA sessions while still rejecting invalid nonblank TeacherAccountIDs.
- Fixes Academic Calendar toolbar sizing so the global `button { width:100% }` rule cannot stretch **Today** across the row.
- Keeps Month navigation, Today and Year compact and on one responsive toolbar row, including small screens.
- Makes mobile Holiday rows a compact single-line layout: **Description | Date | ×**.
- Keeps the existing section-level Holidays Save behaviour; `×` remains a pending local removal until the section is saved.
- Updates Worker/UI version markers and cache tags to `102.12.7`.
- No Platform Sheet/schema change: keep `PlatformConfig!B3 = 102.0.8` with 19 required tabs.
- The V103 unified Access Matrix decision remains roadmap work and is intentionally not partially implemented here.
