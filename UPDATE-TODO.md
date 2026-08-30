# V103.1.0.2 UPDATE TODO

1. Apply this changed-files overlay to the complete deployed **V103.1.0.1** development repository.
2. Deploy **Pages and Worker from the same commit**.
3. Confirm Worker health reports `103.1.0.2`.
4. Hard-refresh/reload Academy Home so `/css/m4l-23-account.css?v=103.1.0.2` and `/js/m4l-account.js?v=103.1.0.2` are loaded.
5. Keep the Platform workbook unchanged:
   - `PlatformConfig!B3 = 102.0.8`;
   - 19 required Platform tabs.
6. No V103.1.0.2 Sheet migration is required.
7. The controlled **V103.1 Identity Links** migration may remain pending; this timetable patch does not depend on it.
8. Open a busy Academy Home day (especially Thursday) and verify all expected rows remain present in chronological order, including the intermediate `09h30` session before `20h00`.
9. If the session list exceeds the day-card height, verify the **inside of that day card scrolls vertically** while the day heading remains visible and the adjacent day card remains in place.
10. Verify the existing horizontal one-card/two-card Academy Home swipe/scroll still works.
11. Smoke-check participant pill deduplication, detailed/compact pill sizing, Reboot timetable detail, Hifz/global labels, and Global Course pills.
12. Continue collecting additional timetable refinements for a later batch rather than expanding this patch.
