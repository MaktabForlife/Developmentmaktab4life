# Maktabhelper

Current development release: V102.8.2 Timetable reliability and selected-session editing.

V102.8.2 corrects the Timetable Builder failure seen after one or two Admin
changes. The Builder now reads all related Sheet ranges in one batch, includes
Tasks in that response and updates its grid locally after successful session
changes. Temporary Google Sheets or network failures remain distinct from
denied course access and do not invalidate a valid account session.

ADMIN can select two to one hundred active sessions in the current course and
apply only the checked fields: subject/module, teacher and/or Zoom override.
Day, time, group and active status are never bulk changed. All proposed rows
are conflict-checked first and committed atomically; a failed validation writes
nothing. Existing published snapshots remain immutable.

Platform schema remains `102.0.4` and the Reboot course schema remains
`101.4.3`. V102.8.2 adds no Sheet tab/header, migration, Worker configuration,
Apps Script or course Sheet change. Account migration must not be rerun.

Start installation with `UPDATE-TODO.md`. Apply
`Rebootyourmaktab-V102.8.2-GITHUB-UPDATE-FROM-V102.8.1.zip` directly over a
development repository already containing V102.8.1. It is a modified-files
overlay containing the complete update; a full repository upload is not
required.

Production remains stable at V101.1 and must not receive this development-only
overlay. A separate production merge plan will be prepared after V102
development is complete.
