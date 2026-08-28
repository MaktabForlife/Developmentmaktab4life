# V102.11.2 — Course Scheduler usability refinement

V102.11.2 is a UI/workflow refinement over V102.11.1. It does **not** change the Platform Sheet schema, timetable publication model, FREE/PAID entitlement rules, or existing Program timetable data.

## Course Scheduler

- All Course Scheduler times are entered and displayed as 24-hour values such as `04h00`, `13h00`, and `20h00–21h00`.
- Each weekly schedule line has seven day pills (`Mon`–`Sun`); multiple days can share one time period and are expanded into exact dated sessions by the existing generator.
- Course identity is presented in one compact row: Global Subject, Course name, Start date, End date, Active.
- `Set up a new course` and `Modify course` live in the setup-panel header. The old separate setup button above the course list is removed.
- Schedule-row controls use a consistent height.
- Save actions use save icons with accessible labels/tooltips.
- DEVELOPMENT/REVISION sessions are edited inline rather than through a separate Session Details panel.
- Inline session rows support date, start/end time, module, teacher, Zoom link and SCHEDULED/CANCELLED status.
- Rescheduling opens an inline replacement row linked to the original session.
- PUBLISHED sessions remain read-only until `Modify course`/`Revise timetable` opens a DEVELOPMENT revision.

## Global Access

- Adds a dedicated `Unique ID` column sourced from `UserAccounts.UniqueID`.
- Account display name and Unique ID are no longer combined in one cell.
- FREE + saved subscription entitlement behavior is unchanged.

## Compatibility

- Platform schema remains `102.0.7` with 18 required tabs.
- `GlobalTimetableSessionLifecycle` and `PlatformTimezone` from V102.11.1 remain unchanged.
- Internal Sheet names, API routes, `RunID`, `CourseID`, session IDs and timetable publication records are unchanged.
- No repository file is intentionally deleted.
