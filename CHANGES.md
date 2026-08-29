# V102.12.6 Changes

- Adds atomic batch session editing at `/api/admin/platform/global/timetable/session/batch-save`.
- Removes per-session Save, Reschedule and Delete controls from the Course Scheduler UI.
- Date/time changes now update the same existing session; `CANCELLED` is the UI mechanism for retaining cancelled-session history.
- Adds unsaved-change markers and a single section Save for Course Scheduler sessions.
- Restyles session editing to the refreshed Global white-card/soft-border design and makes it responsive on tablet/mobile.
- Makes Global Curriculum navigation and management layouts responsive; avoids page-level clipping and confines unavoidable Access-matrix scrolling to its own panel.
- Makes **Set up a new course**, **Modify course** and **Add time period** compact actions rather than full-width bars.
- Replaces Global Curriculum custom save tiles with the shared Attendance-style `/icons/save.svg` treatment: transparent background and no shadow.
- Adds atomic Academic Calendar batch saving at `/api/admin/platform/calendar/batch-save`.
- Uses one section Save for Terms, Islamic Dates and Holidays instead of a Save icon on every line.
- Holiday `×` now marks an existing Holiday for removal locally; the removal is committed with the Holidays Save action.
- Removes the Islamic Dates Status control entirely.
- Stops delivering legacy Islamic `alternateDate` and `teachingImpact` fields through the Calendar API while leaving Sheet headers unchanged.
- Keeps Month navigation, Today and Year on one responsive toolbar row.
- Makes the Academic Calendar month grid, Terms, Islamic Dates and Holidays fit tablet/mobile viewports without the old forced 760px width.
- Uses the real transparent Refresh icon on Academic Calendar.
- Updates Worker / UI version markers to `102.12.6`.
- No Platform Sheet/schema change: keep `PlatformConfig!B3 = 102.0.8` with 19 required tabs.
