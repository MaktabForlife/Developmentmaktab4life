# V103.1.0.1 UPDATE TODO

1. Apply this changed-files overlay to the complete deployed **V103.1** development repository.
2. Deploy **Pages and Worker from the same commit**.
3. Confirm Worker health reports `103.1.0.1`.
4. Hard-refresh/reload the development PWA so the V103.1.0.1 Global Curriculum JS/CSS is loaded.
5. Keep the Platform workbook unchanged:
   - `PlatformConfig!B3 = 102.0.8`;
   - 19 required Platform tabs.
6. No V103.1.0.1 Sheet migration is required.
7. The controlled **V103.1 Identity Links** migration may remain pending. V103.1.0.1 neither requires nor performs it.
8. Open **Admin → Global Curriculum → Subjects** and verify:
   - there is no standalone Modules tab;
   - Subject name, FREE/PAID access and status edit inline;
   - Modules expand directly below their Subject;
   - Module order, name and status edit inline;
   - `+ Add a Global Subject` works;
   - `+ Add a module` works;
   - edited Subject/Module sections receive a subtle highlight;
   - only one screen-level Save action is shown.
9. Make several Subject and Module edits before saving and verify one Save commits the complete batch and clears the dirty highlighting.
10. Open **Course Scheduler** and verify the old Subject-management table is absent and the scheduler still consumes the Subjects/Modules created in the Subjects tab.
11. Smoke-check existing Global Course setup, ongoing courses, weekly generation, session batch editing, revision and publication.
12. Do not include the reported Academy Home Thursday/multi-session display or day-card scrolling changes in this patch; those are intentionally deferred to the next timetable batch.
13. Before V103.2, continue the normal V103.1 regression checks for login, Attendance, Progress, Weekly Planner, Reboot timetable, Library/resources and management.
