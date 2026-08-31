# V104.4 UPDATE TODO — Read Metrics & Full Regression

1. Apply this changed-files-only V104.4 overlay to the **completed V104.3 Development tree**. Do not apply it directly to V104.2.
2. Deploy the Pages/app version files and Worker together.
3. Confirm Worker health `/` reports `104.4` and the account page shows `V104.4`.
4. No Google Sheet migration is required; keep `PlatformConfig!B3 = 102.0.9` and the existing 19 Platform tabs.
5. Run `cd backend && npm test`; all **63/63** backend test files must pass before Development acceptance.
6. Run `npm run test:v104.4-read-audit`; confirm the read-path guardrail remains at or below 23 direct call sites / 17 files and at least 15 batch-read call sites.
7. Run `npm run test:request-read-dedup`; confirm the V104.3 request-local cache/deduplication regression still passes.
8. Smoke-test Academy Home rolling 7-day timetable for a user with one Program plus Global content.
9. Smoke-test Academy Home with multiple eligible Program memberships if Development data permits; expect one Platform layer plus one or more Program spreadsheet batches, not per-session Google reads.
10. Smoke-test Attendance report/save, Progress read/write, timetable read and one Library/resource workflow.
11. Verify a same-request read after a successful write returns updated data; V104.3 write invalidation must remain active.
12. Confirm transient Google read failures are retried no more than once and persistent failures surface as errors rather than empty tables.
13. Do not add KV, D1, Redis, module-level Sheet snapshots or other cross-request Sheet-data caching as part of V104.4.
14. Keep pending Courses UI refinements out of V104.4.
15. After Development acceptance, treat V104.1–V104.4 as the completed V104 optimisation foundation for V105 Program Builder.
