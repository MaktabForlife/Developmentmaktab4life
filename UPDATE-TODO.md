# V104.5.3 UPDATE TODO — ONGOING Draft Publication Window

## Apply/deploy

1. Apply this changed-files-only V104.5.3 overlay to the completed **V104.5.2** source tree.
2. Deploy Worker and Pages/app version files together.
3. Confirm Worker health `/` reports `104.5.3` and the account/admin page assets use `104.5.3`.
4. Open Global Curriculum → Courses. Because the workbook is currently `102.0.11`, the **Prepare Scheduling** migration should be offered.
5. As GLOBAL_ADMIN, preview Prepare Scheduling and confirm the target is `102.0.12`.
6. Commit the controlled migration. Do **not** add Sheet columns manually.
7. Confirm Platform validation passes at `PlatformSchemaVersion 102.0.12` and the Platform still contains 19 tabs.

## Hifz acceptance check

8. Open the Hifz Course. For the previously unpublished ONGOING Hifz Course, re-enter `Publish From` / `Publish Through` once if they are blank after migration; V104.5.2 never stored those values authoritatively.
9. Confirm the recurring Hifz rule is still Mon–Thu, 04h00–05h00 (or the intended current rule).
10. Set `Publish From = 01-Sep-2026` and `Publish Through = 01-Sep-2026`, then use the main Courses Save icon.
11. Reload the Courses page. The same two dates must still be present from server state; the main Save should be clean/disabled.
12. Confirm the Hifz row reports **Draft · 1 derived occurrence** for that one-day Tuesday window and the inline **Publish** action is visible.
13. Publish Hifz. Confirm Academy shows the derived Hifz occurrence for Tuesday 1 September 2026 at 04h00–05h00.

## General acceptance

14. Confirm an ONGOING DERIVED Course can clear both draft dates together and save; Publish then remains unavailable until a valid window is saved.
15. Confirm partial/reversed draft windows are rejected.
16. Confirm FIXED Courses continue using their Course Start/End dates and are unaffected by the new draft-window fields.
17. Confirm EXPLICIT workshops/sessions, per-session descriptions, inline-only publishing and session Save/Cancel remain unchanged.
18. Confirm central account login (`/api/account/check`) and Academy Calendar continue working at schema `102.0.12`.

## Regression

19. Run `cd backend && npm test`; all backend test files must pass.
20. Run the V104.5.3 Hifz regression tests:
    - `node tests/v10453-ongoing-derived-window.test.mjs`
    - `node tests/v10453-ongoing-derived-window-ui.test.mjs`
21. Confirm V104.3 request-read deduplication remains green.
22. Confirm the V104.4 read-audit guardrail remains unchanged.
23. Smoke-test Academy timetable, Attendance, Progress and one Program timetable path.

## Rollback

24. **Before** Prepare Scheduling is committed, V104.5.3 can be rolled back to V104.5.2 code without a workbook restore.
25. **After** the workbook is migrated to `102.0.12`, rollback to V104.5.2 requires restoring the pre-migration `102.0.11` Platform workbook **and** V104.5.2 code. V104.5.2 does not understand the new authoritative state columns/schema.
26. Never change `PlatformSchemaVersion` manually as a rollback shortcut.
