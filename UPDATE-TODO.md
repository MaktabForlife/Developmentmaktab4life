# V104.5.2 UPDATE TODO — Platform Schema Compatibility Hotfix

## Apply/deploy

1. Apply this changed-files-only V104.5.2 overlay to the completed V104.5.1 source tree.
2. Deploy the Worker and Pages/app version files together.
3. Confirm Worker health `/` reports `104.5.2` and the account page shows `V104.5.2`.
4. **Do not rerun Prepare Scheduling.** V104.5.2 has no Sheet migration. If the Platform workbook is already `102.0.11`, leave it unchanged.

## Confirm the 503 fix

5. Open an existing central account link and confirm `/api/account/check` returns HTTP 200 rather than 503.
6. Complete PIN login and confirm central account/session revalidation works normally.
7. Open Global Curriculum → Courses and confirm the existing V104.5.1 Course UI loads.
8. Open Academy Calendar and confirm the calendar loads at `PlatformSchemaVersion 102.0.11`.
9. In System Settings, preview central account migration only if needed; confirm an already-current migration can still be inspected at `102.0.11`. Do not rerun a completed migration.

## Regression

10. Run `cd backend && npm test`; all **65/65** backend test files must pass.
11. Confirm V104.3 request-level deduplication remains green.
12. Confirm V104.4 read audit remains at **23 direct-read call sites across 17 files and 15 batch-read call sites**.
13. Smoke-test Academy timetable, one Program timetable path, Attendance and Progress.

## Rollback

14. V104.5.2 is code-only. Rolling back to V104.5.1 does not require a workbook rollback, but note that V104.5.1 contains the `102.0.11` compatibility defect and may restore the `/api/account/check` 503.
15. Do not change `PlatformSchemaVersion` manually as part of this hotfix.
