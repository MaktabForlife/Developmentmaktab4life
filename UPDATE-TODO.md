# V102.12.4 UPDATE TODO

1. Apply all changed files from this overlay to the V102.12.3 development repository.
2. Confirm root `/app.js` exists in GitHub.
3. Deploy Pages and Worker from the same commit.
4. Keep `PlatformConfig!B3 = 102.0.8`; no Sheet migration is required.
5. Confirm Worker health reports `102.12.4`.
6. Confirm `/app.js?v=102.12.4` returns HTTP 200.
7. Academy Home checks:
   - green verified tick and `Academy timetable` label are absent;
   - current day reads `TODAY - dd-MMM-yy`;
   - second card uses its weekday name;
   - mobile shows one card and horizontal swipe reaches the second;
   - large screens show two cards side by side;
   - long cards scroll vertically;
   - session pills are compact;
   - Program roll-up pills do not display session counts;
   - current authorised session remains the only Zoom-capable pill.
8. Smoke-check Reboot login, Attendance, Library, Progress and Program Timetables.
