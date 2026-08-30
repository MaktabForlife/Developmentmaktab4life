# V103.1.0.4 UPDATE TODO

1. Apply this changed-files overlay to the complete deployed **V103.1.0.3** development repository.
2. Deploy Pages and Worker from the same commit.
3. Confirm Worker health reports `103.1.0.4`.
4. Hard-refresh `/account/<uniqueid>` and confirm `/js/m4l-account.js?v=103.1.0.4` is loaded.
5. Keep the Platform workbook unchanged: `PlatformConfig!B3 = 102.0.8`, 19 required Platform tabs.
6. No V103.1.0.4 Sheet migration is required. The controlled V103.1 Identity Links migration may remain pending.
7. Log in through Academy Home and confirm **seven consecutive days beginning today** are already available in the horizontal timetable track.
8. On desktop, confirm two day cards remain visible; on mobile, confirm one card remains visible and swiping through the next days does not display a loading interruption.
9. Confirm a busy day still scrolls vertically inside its own card while the day header remains fixed.
10. Use the day chevrons within the initially loaded week and confirm navigation is immediate without a visible reload.
11. Swipe close to day 6/7, continue forward, and confirm the following seven days are available without stopping on a loading screen.
12. Reload Academy Home once after a successful timetable load and confirm the cached timetable appears promptly while a fresh background request runs.
13. Press Refresh and confirm the view resets to today and reloads a fresh rolling seven-day range.
14. Verify Program recurring sessions that cross a Sunday/Monday boundary and dated Global Course sessions both appear on the correct dates.
15. Smoke-check current-session Zoom behaviour, Term/Academic Calendar badges, participant detail visibility, staff roll-ups, and the Global Course timetable pill rules from V102.12.8.
