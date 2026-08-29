# V102.12.8 UPDATE TODO

1. Apply all files in this changed-files overlay to the deployed **V102.12.7** development repository.
2. Deploy **Pages and Worker from the same commit**. Both UI and Worker logic change in this release.
3. Keep `PlatformConfig!B3 = 102.0.8`; **no Sheet migration** is required and the Platform workbook remains at 19 required tabs.
4. Confirm Worker health reports `102.12.8`.
5. Hard-refresh/reload the development PWA after deployment so the V102.12.8 cache tags are used.
6. Academy Home pill checks:
   - detailed pills are visibly longer/wider than rolled-up pills;
   - a participant with an applicable detailed Program session does not also see the redundant label-only Program pill at the same start time;
   - Admin/Senior/Teacher roll-ups still expose genuinely additional Program detail where applicable;
   - Global Course pills do not show the internal Course/run name;
   - Global Course pills show Global Subject, optional Module and actual Teacher name only.
7. Ongoing Global Course checks:
   - create a new Global Course and select **Ongoing**;
   - confirm course Start/End dates clear and are not required;
   - save an Ongoing course with no weekly rows and confirm it remains Ongoing/CURRENT;
   - add a weekly schedule and enter **Generate sessions from / Generate through** dates;
   - confirm exact dated sessions are generated only for that temporary window;
   - confirm the course itself still has blank StartDate/EndDate;
   - edit an ongoing session to a valid date outside that generation window and confirm the edit is accepted;
   - publish with Teacher = TBA and confirm publication still succeeds.
8. Fixed Global Course regression checks:
   - fixed Start/End dates remain required;
   - End before Start is rejected;
   - shrinking fixed course dates across existing sessions remains blocked.
9. Regression smoke-check Reboot login, Attendance, Progress, Library, Weekly Planner, Program timetable, Academic Calendar batch saves and Global Course session batch edits.
10. Architecture boundary: do not introduce the unified Access Matrix or generic Program Builder as a partial V102 change. The roadmap remains **V103 Central Identity → V104 Program Builder → V105 Reboot migration**.
