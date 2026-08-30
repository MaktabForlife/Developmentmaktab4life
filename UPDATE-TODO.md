# V103.1.0.5 UPDATE TODO — Courses

1. Apply this changed-files overlay to the complete deployed **V103.1.0.4** development repository.
2. Deploy Pages and Worker from the same commit.
3. Confirm Worker health reports `103.1.0.5`.
4. Hard-refresh the Admin app and confirm the Global Curriculum tab now reads **Courses**.
5. Before editing/saving Courses, open **Global Curriculum → Courses** as a `GLOBAL_ADMIN` and click **Prepare Courses**.
6. Review the migration preview. It should show every existing Course and its proposed `FREE` or `PAID` value. Existing effective access should be preserved: linked FREE Global Subject → FREE Course; otherwise PAID.
7. Confirm the migration. Verify:
   - `GlobalSubjectRuns` now has `AccessModel` as the last/14th header;
   - every existing Course has `FREE` or `PAID`;
   - `PlatformConfig!B3 = 102.0.9`;
   - Platform Sheet validation passes;
   - Platform tab count remains **19**.
8. Confirm the separate **V103.1 Identity Links** migration remains unaffected; it may still be pending.
9. Verify a Course row can be edited inline and the single Courses Save becomes highlighted when changes are pending.
10. Confirm the Access column contains only `FREE` and `PAID`.
11. Set a Course to `FREE` and verify an active account without an explicit participant access row receives Course detail on Academy Home.
12. Set a Course to `PAID` and verify automatic FREE access is not inherited from the linked Global Subject; only explicitly entitled participants/staff should receive detail during this transition.
13. FIXED Course test:
    - enter valid Start/End dates;
    - add recurring schedule rows;
    - Save without publishing;
    - verify the current published timetable is unchanged;
    - Publish directly from the Course row;
    - verify the Course appears on Academy Home.
14. Repeat the same FIXED Course with a later date range. Confirm old published history remains intact and the Course is not automatically archived when the old End Date has passed.
15. ONGOING Course test:
    - confirm stored Course StartDate/EndDate remain blank;
    - enter Publish From/Publish Through;
    - add/adjust recurring schedule;
    - Save to prepare exact dated sessions;
    - Publish directly from the Course row;
    - confirm only the selected window is published.
16. Verify Teacher may remain `TBA` and the Course can still be published.
17. Open **View/Edit Sessions** and confirm the session list scrolls internally and supports Cancel all changes / Save without publishing / Save & Publish.
18. Verify Holiday information displays red and Islamic date information green without automatically cancelling a session.
19. Set an ACTIVE Course to INACTIVE, save, and verify it moves out of the default Active list into Archived. Restore it and verify it becomes usable again.
20. Publish two different Courses and verify both remain concurrently published; publishing one must not unpublish the other.
21. Smoke-check the V103.1.0.4 rolling seven-day Academy timetable, Resources, Subjects/Modules, Attendance, Progress, Planner, Reboot timetable and login.
