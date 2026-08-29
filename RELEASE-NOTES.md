# V102.12.6 Release Notes

V102.12.6 completes the current V102 UI refinement pass before the next architecture phase. It focuses on responsive Global Curriculum / Course Scheduler and Academic Calendar editing, while preserving existing login, Attendance, Progress, Library, planner and timetable behaviour.

## Course Scheduler sessions

Session editing is now draft-first. Admin can change multiple existing sessions and press one section-level Save icon. The UI sends one batch request and the Worker validates the complete proposed set before issuing one Google Sheets batch write. If validation fails, none of the session changes are written.

Existing session rows no longer expose individual Save, Reschedule or Delete actions. Changing date/time updates that same session; cancelling is performed with `Status = CANCELLED`. Existing legacy reschedule API support remains for compatibility, but it is no longer exposed by the editor.

## Academic Calendar

Terms, Islamic Dates and Holidays each use one section-level Save icon. Multiple edits can be made before saving. Holiday `×` is now a local pending removal until Holidays is saved; `+` continues to add a local draft row.

Islamic Dates no longer show a Status field, and Islamic API delivery no longer includes legacy `AlternateDate` or `TeachingImpact` properties. The unchanged Sheet columns remain internally compatible.

The month navigator, Today and Year controls share one responsive toolbar row. The Calendar, Terms, Islamic Dates and Holidays layouts now reflow for tablet/mobile instead of forcing wide fixed layouts. The Calendar Refresh action uses the actual refresh icon with no coloured background.

## Global responsive styling

Global Curriculum tabs and management screens now respect the viewport. Course/subject tables become mobile cards where appropriate, session rows reflow to two-column/one-column cards, and the Course Scheduler setup actions are compact instead of full-width bars. Save actions use the same transparent save-icon treatment as Attendance.

There is **no Sheet migration**. `PlatformSchemaVersion` remains `102.0.8` with 19 required tabs.
