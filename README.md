# Maktabhelper development — V102.12.3

V102.12.3 is a code-only Academy Home refinement on top of V102.12.2.

It changes the delivered Academy timetable from a seven-day card grid to a personalised two-day pill view:

- `TODAY` plus the next weekday;
- flexible time rows and session pills;
- directly relevant Student/Teacher/Admin sessions shown in detail;
- remaining Program activity rolled up to one Program pill per time;
- authorised Program staff / GLOBAL_ADMIN can expand roll-ups for read-only detail;
- label-only users cannot expand protected detail;
- only the currently running, directly relevant session can expose Zoom;
- all times remain in M4L `13h00` format.

Program Timetables, Course Scheduler, Academy Calendar, Attendance, Progress, Library and Weekly Planner are not structurally changed.

## Platform Sheet

No migration is required.

- `PlatformSchemaVersion`: `102.0.8`
- Required Platform tabs: `19`

See `UPDATE-TODO.md` for deployment/testing and `docs/V102.12.3-ACADEMY-HOME-PILLS.md` for the delivery rules.
