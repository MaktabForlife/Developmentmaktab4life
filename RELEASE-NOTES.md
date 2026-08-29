# V102.12.8 Release Notes

V102.12.8 is a changed-files update to V102.12.7. It contains the Academy Home timetable presentation refinements collected during review and an interim ongoing-course capability for Global Courses.

## Academy Home timetable pills

Detailed session pills now receive more width than rolled-up/generic pills, making their subject/module/teacher information easier to read.

For participants/students, when an applicable detailed Program pill is already shown at a start time, a second label-only roll-up for the same Program is suppressed. Staff views retain Program roll-ups where they expose genuinely additional detail.

For Global Courses, Academy Home no longer exposes the Global Course/run name. That name is treated as an internal/admin identifier. User-facing detail is limited to:

- Global Subject name;
- Module name, when present;
- actual Teacher name, when assigned.

`TBA` remains a valid publishable teacher state but is not shown as an extra teacher-detail label in the participant-facing pill.

## Ongoing Global Courses

Global Course setup now includes an explicit **Ongoing** option. When Ongoing is enabled:

- course StartDate is blank;
- course EndDate is blank;
- the active course is treated as `CURRENT`;
- it remains active until an Admin changes its status;
- exact session dates continue to drive timetable delivery.

No artificial far-future date is stored.

### Generating recurring sessions

An ongoing course has no natural finite range over which to expand a weekly pattern. Therefore the scheduler provides temporary **Generate sessions from** and **Generate through** dates when a weekly schedule is being generated.

Those dates are generation controls only. They do **not** become the course StartDate/EndDate. Once generated, an ongoing session may subsequently be moved to another valid date outside the generation window.

A course can also be saved as Ongoing without generating a weekly batch immediately.

## Fixed-duration courses

Existing fixed courses are unchanged: StartDate and EndDate remain required and must be valid, ordered dates. Existing timetable-boundary safeguards remain in place for fixed courses.

## Schema

There is **no Sheet migration**. `PlatformSchemaVersion` remains `102.0.8` with **19 required Platform tabs**. Ongoing is represented by both existing GlobalSubjectRuns date fields being blank, so no new Sheet column is introduced.

## Architecture boundary

This is an interim V102 capability, not the generic Program architecture. The major roadmap remains:

- V103 — Central Identity
- V104 — Program Builder
- V105 — Reboot migration
