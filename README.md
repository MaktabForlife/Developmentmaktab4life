# Maktabhelper

Current development release: V102.9.1 timetable display correction.

V102.9.1 is a small modified-files overlay for a development repository that
already contains deployed V102.9. It corrects the Timetable Builder controls
that inherited the application's global full-width button rule, so the status,
section, course and weekly-session actions fit and wrap normally.

Teachers now receive the complete read-only published timetable for the
selected course. Their own assigned sessions remain prominent and retain their
Zoom actions; other teachers' sessions remain visible in muted text without
exposing their Zoom actions. Attendance, Progress, Weekly Planner and student
record scope are unchanged.

No Sheet, header, schema, PlatformConfig, Worker setting, secret, binding or
Apps Script change is required. The live publication and activation state are
not changed, and the account migration must not be rerun.

Start with `UPDATE-TODO.md`. Apply
`Rebootyourmaktab-V102.9.1-GITHUB-UPDATE-FROM-V102.9.zip` directly over the
development repository already containing V102.9. This is a modified-files
overlay; a full repository upload is not required.

`docs/V102.10-ACADEMY-TIMETABLE-PLAN.md` records the agreed next architecture:
an authenticated academy-wide timetable with each person's enrolled,
subscribed or assigned sessions highlighted. It is documentation only and is
not active in V102.9.1.

Production remains stable at V101.1 and must not receive this development-only
overlay. A separate production merge plan will be prepared after V102
development is complete.
