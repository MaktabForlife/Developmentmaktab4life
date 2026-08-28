# Reboot Your Maktab / Maktab4Life Development

Current development release: **V102.11.2 — Course Scheduler usability refinement**.

V102.11.2 builds directly on V102.11.1 and concentrates on administrator usability. The underlying Global Course model remains the proven V102.11/V102.11.1 architecture: Global Subjects are permanent curriculum items, Global Courses are scheduled runs, exact dated sessions are stored centrally, and publication snapshots remain immutable.

## V102.11.2 highlights

- Course Scheduler time format is consistently `13h00`.
- One weekly schedule row can select multiple day pills for the same time period.
- Course setup uses one compact identity/date/status row.
- DEVELOPMENT/REVISION sessions edit inline.
- Save actions use save icons.
- Global Access shows `UserAccounts.UniqueID` in its own column.
- Published courses remain immutable until a revision is opened.

## Platform schema

**No Sheet migration is required for V102.11.2.**

- `PlatformSchemaVersion` remains `102.0.7`.
- Required Platform tabs remain **18**.
- `PlatformTimezone` remains the central scheduling timezone.
- Do not add, delete, rename or repopulate any Platform Sheet tab for this release.

## Deployment

Apply this changed-files overlay to the deployed V102.11.1 development repository. Pages and Worker should be deployed from the same commit. After deployment confirm the Worker root reports `102.11.2`, the account page shows V102.11.2, and run the focused checks in `UPDATE-TODO.md`.

## Still later work

V102.11.2 does not yet deliver published Global Course sessions into the combined Student/Teacher Academy timetable. That remains the V102.12 integration layer.
