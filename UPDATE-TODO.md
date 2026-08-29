# V102.12.7 UPDATE TODO

1. Apply all files in this changed-files overlay to the deployed V102.12.6 development repository.
2. Deploy **Pages and Worker from the same commit**. The Worker must be deployed because publication/validation logic changes for TBA sessions.
3. Keep `PlatformConfig!B3 = 102.0.8`; **no Sheet migration** is required and the Platform workbook remains at 19 required tabs.
4. Confirm Worker health reports `102.12.7`.
5. Hard-refresh/reload the development PWA after deployment so the V102.12.7 cache tags are used.
6. Global Course TBA checks:
   - create or retain a session with Teacher = `TBA`;
   - confirm the course publishes successfully without assigning a teacher;
   - confirm the published session displays `TBA`;
   - confirm no fake TeacherAccountID is written;
   - assign a real teacher later, revise/publish, and confirm the selected teacher replaces TBA normally.
7. Academic Calendar toolbar checks:
   - Month navigator, Today and Year stay visible on one row at desktop/tablet widths;
   - Today is compact and does not stretch across the toolbar;
   - verify the same row remains usable on a phone, including September/November month labels;
   - Refresh remains a plain icon with no coloured background.
8. Mobile Holidays checks:
   - Description, Date and `×` are on one row;
   - long but reasonable descriptions do not cause horizontal page overflow;
   - edit several Holidays and remove one with `×`, then press the single Holidays Save icon and confirm the changes commit together.
9. Regression smoke-check Course Scheduler batch edits, Terms/Islamic Dates/Holidays batch saves, Reboot login, Attendance, Progress, Library, Weekly Planner and timetable.
10. V103 note: the agreed unified Academy Access Matrix (`FALSE`, `ACCESS`, `TEACHER`, `SENIOR`, `ADMIN`) for Reboot, Aalimiyyah, Global Subjects and Global Courses is intentionally deferred to the Central Identity phase; do not introduce a temporary second access model in V102.12.7.
