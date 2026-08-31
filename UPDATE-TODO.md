# V104.5.1 UPDATE TODO — Course Publish & Session UI Refinement

## Apply/deploy

1. Apply this changed-files-only **V104.5.1 overlay to the completed V104.5 source tree**.
2. Before any Platform schema migration, create a rollback copy of the current Platform workbook.
3. Deploy the V104.5.1 Worker and Pages/app files together.
4. Confirm Worker health `/` reports `104.5.1` and the account page shows `V104.5.1`.
5. Confirm Global Curriculum → Courses loads without changing existing Course data.

## Platform schema

6. Check `PlatformSchemaVersion` before migration:
   - `102.0.9`: V104.5.1 can perform the full scheduling migration directly to `102.0.11` and must preserve existing Courses as EXPLICIT.
   - `102.0.10`: V104.5.1 performs the incremental description upgrade to `102.0.11` and must preserve existing DERIVED/EXPLICIT modes and publications.
   - `102.0.11`: no migration is required.
7. If migration is required, sign in as GLOBAL_ADMIN and open **Global Curriculum → Courses**.
8. Click **Prepare Scheduling**, review the preview, and commit only with `MIGRATE COURSE SCHEDULING`.
9. Confirm `PlatformSchemaVersion = 102.0.11` and the Platform workbook still has exactly **19 required tabs**.
10. Confirm `GlobalTimetableSessions` and `PublishedGlobalTimetableSessions` each end with `SessionDescription`.
11. Run Platform validation and confirm Course scheduling + session-description schema readiness.

## Course-row UI acceptance

12. Confirm Course Name is still inline-editable and now appears as a lavender rounded pill.
13. Confirm action buttons use the intended layout and icon/text treatment:

```text
[ ✎ Schedule ]   [  PUBLISH  ]
[ ✎ Sessions ]
```

14. Confirm DERIVED Courses show `Exceptions` instead of `Sessions`.
15. Confirm Schedule/Sessions/Exceptions use muted teal and Publish uses the stronger deep-berry treatment.

## Publish eligibility acceptance

16. For a clean already-published active Course, confirm **no Publish button is visible**.
17. For an inactive Course, confirm **no Publish button is visible**.
18. Add a new Course but do not save it; confirm **no Publish button is visible**.
19. Edit an already-published Course without saving; confirm **no Publish button is visible** while the row is dirty.
20. Save those edits; confirm the existing revision workflow completes and **Publish now appears inline** once the Course is saved and publishable.
21. For an active unpublished Course with a valid saved schedule, confirm Publish is visible inline.
22. For an ONGOING Course without a valid Publish From/Publish Through window, confirm Publish is hidden.
23. Confirm the Course-row control is the only `Publish` action in the Course scheduling UI.

## Sessions/Exceptions acceptance

24. Open an EXPLICIT Course `Sessions` workspace and confirm the whole session card has the stronger rounded border.
25. Confirm the bottom actions read exactly **Cancel** and **Save** and use icon + text treatment.
26. Confirm there is no `Save & Publish`, Publish button or other publication action inside Sessions/Exceptions.
27. Edit one session and select Cancel; confirm the unsaved session edit is discarded without publishing.
28. Edit one session and select Save; confirm it saves without publishing and the Course row becomes the place to publish the prepared revision.

## EXPLICIT SessionDescription acceptance

29. Open a short EXPLICIT workshop with exact dated sessions.
30. Enter a different optional short description on at least two sessions; confirm the field enforces a maximum of 400 characters.
31. Save the session changes and reopen Sessions; confirm descriptions are retained.
32. Reschedule an exact session through the supported explicit-session flow and confirm its description is preserved.
33. Publish from the Course row and confirm the descriptions are copied into immutable `PublishedGlobalTimetableSessions` snapshots.
34. Confirm detailed Academy Global Course data includes `sessionDescription` while LABEL-only/unsubscribed visibility rules remain unchanged.

## DERIVED preservation checks

35. Confirm a DERIVED Course still saves recurring rules without generating normal source session rows.
36. Confirm editing one derived occurrence materialises only one EXCEPTION row.
37. Confirm DERIVED publication still creates no normal published-session rows and Academy derives normal occurrences from the immutable rule snapshot.

## Regression gates

38. Run `cd backend && npm test`; all backend test files must pass.
39. Run `npm run test:v104.5.1-course-ui`.
40. Run `npm run test:v104.5-derived-courses`.
41. Run `npm run test:v104.4-read-audit`; the V104 read-call guardrail must remain unchanged.
42. Run `npm run test:request-read-dedup`; V104.3 request-local deduplication/write invalidation must remain active.
43. Smoke-test Academy timetable, Global Course FREE/PAID access and one Program timetable path.

## Rollback boundary

44. If the Platform workbook was not migrated, rollback is code-only to the prior V104.5 tree.
45. If the workbook was upgraded from `102.0.10` to `102.0.11`, restore the pre-upgrade `102.0.10` workbook together with V104.5 code if rolling back.
46. If V104.5.1 performed a direct `102.0.9 → 102.0.11` migration, restore the pre-migration `102.0.9` workbook and the appropriate pre-migration code together.
47. V104.5.1 adds no Platform tabs, Program Builder schema, persistent cache or Program data migration.
