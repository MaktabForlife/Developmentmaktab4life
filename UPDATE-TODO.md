# V104.5 UPDATE TODO — Derived-by-default Global Courses

## Apply/deploy

1. Apply this changed-files-only V104.5 overlay to the **final completed V104.4 Development tree**.
2. Before committing the schema migration, create a rollback copy of the current Platform workbook while it is still schema `102.0.9`.
3. Deploy the V104.5 Worker and Pages/app files together.
4. Confirm Worker health `/` reports `104.5` and the account page shows `V104.5`.
5. At this point the existing `102.0.9` Platform sheet remains supported long enough to run the controlled migration. Do **not** manually add V104.5 scheduling columns.

## Controlled Platform migration

6. Sign in as `GLOBAL_ADMIN` and open **Global Curriculum → Courses**.
7. Confirm the **Prepare derived Course scheduling** banner appears.
8. Click **Prepare Scheduling** and review the preview. Existing Courses must be shown as preserved `EXPLICIT`; new Course default must be `DERIVED`.
9. Commit only through the UI confirmation (`MIGRATE COURSE SCHEDULING`).
10. Confirm `PlatformSchemaVersion` becomes `102.0.10` and the Platform workbook still contains the same **19 required tabs**.
11. Run Platform validation. All four evolved Course/timetable tables must report the V104.5 scheduling schema ready.

## Existing-Course preservation checks

12. Open each existing Course used in Development and confirm Scheduling = `EXPLICIT` immediately after migration.
13. Confirm its current published timetable still resolves with the same exact dates/session count and Academy display as before migration.
14. Do not convert an existing Course to DERIVED merely as part of migration. Conversion should be an intentional Course edit after its recurring rules have been reviewed/saved.

## DERIVED acceptance

15. Create a new test Course and confirm Scheduling defaults to `DERIVED`.
16. Save one or more recurring schedule rows. Confirm saving the Course does **not** generate normal `GlobalTimetableSessions` rows.
17. Publish the DERIVED Course and confirm Academy displays the expected dated occurrences even though normal `PublishedGlobalTimetableSessions` rows were not created.
18. Revise the Course, open **Exceptions**, cancel or move one derived occurrence, and save it.
19. Confirm exactly one `SessionKind=EXCEPTION` row is materialised for that changed occurrence and normal untouched occurrences remain virtual.
20. Republish and confirm the exception is reflected in Academy while the effective publication `SessionCount` remains correct.
21. Confirm a fixed DERIVED Course still shows relevant Academic Calendar/public-holiday warnings in the exception editor.

## EXPLICIT workshop acceptance

22. Create a FIXED Course with Scheduling = `EXPLICIT sessions` for a short workshop.
23. Configure a schedule/window that produces four exact sessions (for example four weekly workshop dates), save the Course, and confirm four dated session rows are created.
24. Open **View/Edit Sessions** and verify the four exact dates can be prepared before publication/marketing.
25. Publish and confirm all four exact sessions are stored in the immutable publication snapshot and appear in Academy.

## Regression gates

26. Run `cd backend && npm test`; all **64/64** backend test files must pass.
27. Run `npm run test:v104.5-derived-courses`; confirm DERIVED zero-normal-row publication, one-row exception handling and four-session EXPLICIT workshop coverage passes.
28. Run `npm run test:v104.4-read-audit`; V104 read-call guardrails must remain unchanged.
29. Run `npm run test:request-read-dedup`; V104.3 request-local read deduplication/write invalidation must remain active.
30. Smoke-test Academy timetable, Global Course access (FREE/PAID), Attendance, Progress, Library and one Program timetable path to confirm no unrelated behaviour changed.

## Rollback boundary

31. **Before migration:** code rollback to V104.4 is sufficient.
32. **After migration to 102.0.10:** do not roll Worker code back to V104.4 against the migrated workbook. Restore the pre-migration `102.0.9` Platform-workbook backup together with the V104.4 code if rollback is required.
33. V104.5 contains no new Platform tabs, Program Builder schema, KV/D1/Redis cache, Apps Script migration or Program data migration.
34. After Development acceptance, proceed to V105 Program Builder on the V104.5 baseline.
