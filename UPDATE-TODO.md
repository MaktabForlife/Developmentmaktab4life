# V102.12.6 UPDATE TODO

1. Apply all files in this changed-files overlay to the deployed V102.12.5 development repository.
2. Deploy **Pages and Worker from the same commit**. The Worker must be deployed because V102.12.6 adds two batch endpoints.
3. Keep `PlatformConfig!B3 = 102.0.8`; **no Sheet migration** is required and the Platform workbook remains at 19 required tabs.
4. Confirm Worker health reports `102.12.6`.
5. Hard-refresh/reload the development PWA after deployment so the V102.12.6 CSS/JS cache tags are used.
6. Global Curriculum / Course Scheduler checks:
   - save icons match Attendance and have no coloured background;
   - Subjects, Modules, Tasks, Resources, Course Scheduler and Global Access fit the available desktop/tablet/mobile width;
   - Global Curriculum tabs reflow on narrow screens;
   - **Set up a new course**, **Modify course** and **Add time period** remain compact on large screens;
   - Session rows show Date, Start, End, Module, Teacher, Zoom link and Status only—no row Save, Reschedule or Delete actions;
   - change several sessions, including a date/time change and a `CANCELLED` status, then press the single Sessions Save icon and confirm they save together;
   - confirm an invalid session in a multi-edit save prevents all pending session changes from being committed.
7. Academic Calendar checks:
   - Month navigator, Today and Year remain on one toolbar row at normal widths and remain usable on a phone;
   - Refresh uses the refresh glyph with no coloured background;
   - Calendar and Terms are full width on larger screens;
   - Islamic Dates and Holidays are 50/50 on larger screens and stack cleanly on smaller screens;
   - Islamic Dates show Description, Islamic date and editable Gregorian Date only—no Status, Alternate Date or Teaching field;
   - Terms, Islamic Dates and Holidays each have one section Save icon, not one Save per row;
   - edit several Terms/Islamic Dates/Holidays before saving each section;
   - Holiday `×` marks a removal locally and the removal is only committed when Holidays is saved;
   - `+` adds local Term/Holiday draft rows as appropriate.
8. Smoke-check Academy Home calendar markers and Course Scheduler no-teaching warnings.
9. Regression smoke-check Reboot login, Attendance (including absent-row reset), Progress, Library, Weekly Planner, timetable and Program Timetables.
10. Baseline note: this overlay was built from the user-supplied V102.12.5 full-repo snapshot. Its V102.12.5 28-file release overlay was independently verified byte-for-byte against that snapshot. The previously noted historical 824-vs-844 full-tree file-count discrepancy is unchanged and does not involve the V102.12.5 release files.
