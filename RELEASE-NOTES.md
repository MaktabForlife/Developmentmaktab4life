# V103.1.0.5 Release Notes — Courses

V103.1.0.5 replaces **Course Scheduler** with the new **Courses** workspace and separates Course definition, recurring schedule preparation and publication more cleanly.

## Courses table

The main table is inline-editable and contains:

- Course Name
- Global Subject
- Type (`FIXED` / `ONGOING`)
- Start/Publish From
- End/Publish Through
- Access (`FREE` / `PAID` only)
- Status (`ACTIVE` / `INACTIVE`)
- Schedule / Publish actions

A single highlighted Courses Save stores pending Course/schedule changes without publishing.

## Course type and date semantics

### FIXED

`Start Date` and `End Date` are persisted to the Course record and describe the current fixed delivery period.

A completed fixed delivery does not archive the Course. The Course remains available while ACTIVE and can be repeated by changing the dates/schedule and publishing the new period. Historical published sessions remain preserved.

### ONGOING

The Course record continues to store blank StartDate/EndDate. The date controls become `Publish From` and `Publish Through` and are used to prepare exact dated sessions for that publication window.

The publication window does not become a permanent Course boundary.

## FREE / PAID

Course `Access` now means only the Course-level AccessModel:

- `FREE` — every active central account can access the Course.
- `PAID` — participant access is restricted.

It is not a user-role selector.

V103.1.0.5 adds `GlobalSubjectRuns.AccessModel`. Existing Courses receive a migration preview based on their current linked Global Subject access so the migration preserves the effective starting state.

Until the unified V103 per-Course Access Matrix lands, a PAID Course uses an explicit existing linked-Global-Subject entitlement for participant access. A PAID Course never inherits automatic FREE access merely because its Global Subject is FREE.

## Recurring schedule

Each Course can expand an inline recurring schedule with:

`Days | Start | End | Module | Teacher | Zoom link`

Teacher may remain `TBA`. Multiple time slots are supported.

The main Courses Save prepares the Course and dated sessions but does not replace the currently published timetable.

## Publication

Admin can now **Publish directly from the Course row** after saving its changes. Entering View/Edit Sessions is optional.

For ONGOING Courses, Publish requires the current `Publish From / Publish Through` window. For FIXED Courses, publication uses the current fixed delivery dates.

Publication remains independent per Course; publishing one Course does not unpublish another.

## Session editor

View/Edit Sessions remains available for detailed changes. It has no row-level Save/Reschedule/Delete workflow; date changes reschedule the existing draft session and `CANCELLED` is the historical removal state.

The editor provides:

- Cancel all changes
- Save without publishing
- Save & Publish

Holiday calendar context is red and Islamic-date context green. The session body scrolls internally.

## Archive behaviour

Courses are not archived automatically when their dates pass.

The user explicitly changes `ACTIVE → INACTIVE` to archive a Course. The table can show Active, Archived or All Courses.

## Platform migration

V103.1.0.5 requires one controlled Platform migration after code deployment:

1. Global Curriculum → Courses.
2. A `GLOBAL_ADMIN` clicks **Prepare Courses**.
3. Review the migration preview.
4. Confirm the migration.
5. Verify `PlatformConfig!B3 = 102.0.9`.

The migration appends/backfills `GlobalSubjectRuns.AccessModel`; no tab is added. The Platform workbook remains at **19 required tabs**.

The separate V103.1 Reboot Identity Links migration may still remain pending.
