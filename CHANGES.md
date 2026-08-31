# V104.5.2 Changes — Platform Schema Compatibility Hotfix

Built directly on V104.5.1.

- Fixed the HTTP 503 on `/api/account/check` after the Platform workbook is migrated to `102.0.11`.
- Extended central account authentication/revalidation schema compatibility through `102.0.11`.
- Extended Academic Calendar schema compatibility through `102.0.11`.
- Extended the central account migration preview/verification guard through `102.0.11`.
- Added regression coverage for all three post-migration paths.
- No Sheet migration, business-rule, access-rule, Course scheduling, publication, cache or Program changes.
- Worker/app version advanced to `104.5.2`.
- Full backend regression: **65/65 test files passed**.
- Repository JS/MJS syntax: **157/157 files passed**.

---

# V104.5.1 Changes — Course Publish & Session UI Refinement

Built on the completed V104.5 DERIVED/EXPLICIT Course scheduling model.

- Course Name remains inline-editable but now renders as a modern lavender pill.
- Reworked Course-row actions into the requested visual hierarchy:
  - teal pencil + text `Schedule`;
  - teal pencil + text `Sessions` for EXPLICIT Courses or `Exceptions` for DERIVED Courses;
  - separate deep-berry `Publish` action.
- Tightened Publish visibility. The inline Publish control is now rendered only for saved, active, publishable Courses whose timetable is unpublished or in a saved revision state.
- Unsaved dirty Course/schedule/window rows no longer show a disabled Publish button; they show no Publish control until Save completes.
- Clean already-published Courses, inactive Courses, unsaved new Courses and non-publishable Courses show no Publish control.
- The Course row remains the **only** publishing surface.
- Removed the former session-workspace publish flow completely. Session editing now exposes only icon + text `Cancel` and `Save` actions.
- Added a stronger bordered/rounded Sessions/Exceptions card treatment.
- Added optional `SessionDescription` for EXPLICIT exact sessions, maximum 400 characters.
- `SessionDescription` is preserved through exact-session edits/reschedules and copied into immutable published session snapshots.
- Platform schema advances to `102.0.11` by adding `SessionDescription` to `GlobalTimetableSessions` and `PublishedGlobalTimetableSessions`.
- Controlled migration supports both `102.0.9 → 102.0.11` and an incremental `102.0.10 → 102.0.11` upgrade without changing current Course modes/publications.
- Added `docs/V104.5.1-IMPLEMENTATION-CHECKLIST.md` and a dedicated V104.5.1 UI regression gate.
- Worker/app version advanced to `104.5.1`.
- V104.3 request-local read deduplication and V104.4 read-budget guardrails remain unchanged.
- Final verification: **65/65 backend test files** and **157/157 repository JS/MJS syntax checks** passed.
