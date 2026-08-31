# V104.4 UPDATE TODO — Read Metrics & Full Regression

1. Apply this changed-files overlay to the complete V104.2 Development tree.
2. Deploy Pages/app files and Worker together.
3. Confirm Worker health reports `104.4` and the Account page displays `V104.4`.
4. No Google Sheet migration is required; keep `PlatformConfig!B3 = 102.0.9` and 19 required Platform tabs.
5. Before deployment, run `cd backend && npm test`; the expected V104.4 baseline is **62/62 test files passed**.
6. Open Academy Home and confirm the rolling seven-day timetable still loads/swipes and Program/Global visibility is unchanged.
7. Verify one Attendance report, one Progress view and one Program timetable read.
8. Confirm transient Google read errors remain fail-safe; V104.4 allows one retry only and must never replace failed authoritative data with empty rows.
9. No V104.3 request-level deduplication is included in this overlay. Do not add module-level or persistent data caching as part of V104.4 deployment.
10. The V103.1 Identity Links and V103.1.0.5 Courses migrations are already complete in Development; do not rerun them.
11. Keep pending Courses UI refinements out of this optimisation release.
