# V104.3 UPDATE TODO — Request-Level Read Cache & Deduplication

1. Apply this changed-files-only V104.3 overlay to the complete verified V104.2 Development tree.
2. Do **not** apply the earlier provisional V104.4 overlay before this package; final V104.4 must be rebuilt on top of V104.3.
3. Deploy the Pages/app version files and Worker together.
4. Confirm Worker health `/` reports `104.3`.
5. No Google Sheet migration is required; keep `PlatformConfig!B3 = 102.0.9` and the existing 19 Platform tabs.
6. Smoke-test Academy Home rolling 7-day timetable.
7. Smoke-test one central Course staff context and one student context so Course environment inheritance is exercised.
8. Verify one Attendance read/save and one Progress read/write workflow.
9. Verify one timetable read and one existing resource workflow.
10. Confirm writes are immediately visible on subsequent reads; V104.3 invalidates the affected spreadsheet cache after successful mutations.
11. Do not add KV, D1, Redis, module-level Sheet snapshots, or other cross-request caching as part of V104.3.
12. Keep pending Courses UI refinements out of this optimisation release.
13. After V104.3 is deployed/accepted, rebuild V104.4 metrics + full regression against V104.3.
