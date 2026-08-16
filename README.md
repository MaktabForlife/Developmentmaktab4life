# Maktabhelper

Current development release: V102.9 Published timetable integrator.

V102.9 adds an ADMIN review, activation and rollback path for making the
Timetable Builder's current immutable publication the selected course's live
Student, staff and Weekly Planner source. Deployment alone changes nothing:
`TeacherAssign` remains live until activation is explicitly confirmed.

Published snapshots now preserve course, time, subject, module and teacher
display values so later curriculum edits cannot rewrite historical timetable
display. Draft changes remain hidden behind the last current publication. An
invalid published source fails closed instead of silently returning legacy
data.

Platform schema remains `102.0.4`. The Reboot course schema moves to `101.4.4`
after adding the documented `PublishedTimetableSessions!O1:T1` headers. Account
migration must not be rerun, and `TeacherAssign`/`TimeTable` are not deleted in
this release.

Start installation with `UPDATE-TODO.md`. Apply
`Rebootyourmaktab-V102.9-GITHUB-UPDATE-FROM-V102.8.2.zip` directly over a
development repository already containing V102.8.2. It is a modified-files
overlay containing the complete update; a full repository upload is not
required.

Production remains stable at V101.1 and must not receive this development-only
overlay. A separate production merge plan will be prepared after V102
development is complete.
