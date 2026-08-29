# V102.12.5 UPDATE TODO

1. Apply all changed files from this overlay to the deployed V102.12.4 development repository.
2. Deploy Pages and Worker from the same commit.
3. Keep `PlatformConfig!B3 = 102.0.8`; no Sheet migration is required.
4. Confirm Worker health reports `102.12.5`.
5. Confirm the Admin tile/page reads **Academic Calendar**.
6. Academic Calendar checks:
   - Calendar full width; Terms full width; Islamic Dates and Holidays split 50/50 on large screens and stack on small screens;
   - Islamic rows show Description, Islamic date underneath, confirmed Date and Status only;
   - no Alternate Date or Teaching controls are shown;
   - Holidays show editable Description and Date fields;
   - generated South African holidays default to `Public Holiday` but the description can be edited and saved;
   - `×` removes a Holiday and `+` adds one;
   - Save and Refresh icons have transparent/no-fill backgrounds.
7. Smoke-check Academy Home calendar markers and Course Scheduler holiday warnings.
8. Smoke-check Reboot login, Attendance, Library, Progress and Program Timetables.
