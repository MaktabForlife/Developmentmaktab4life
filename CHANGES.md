# V102.12.8 Changes

- Gives detailed Academy Home timetable pills more horizontal space than compact/rolled-up pills.
- For participant/student Program timetable rows, suppresses a duplicate rolled-up Program pill when the participant already has an applicable detailed pill for that Program at the same start time.
- Keeps staff Program roll-ups available when they contain genuinely additional timetable detail.
- Removes the Global Course/run name from user-facing Academy Home Global Course pills and API detail.
- Global Course pills now use the Global Subject name as the title and show only Module name and actual Teacher name where those values exist.
- Hides `TBA` / `Teacher not assigned` from the participant-facing Global Course pill detail; TBA remains a valid publishable backend teacher state.
- Adds an explicit **Ongoing** option to Global Course setup.
- Ongoing courses store blank course-level StartDate and EndDate; no new Sheet column or migration is required.
- Active ongoing courses resolve as `CURRENT` for Global delivery.
- Fixed-duration courses continue to require valid StartDate and EndDate.
- Adds temporary **Generate sessions from / Generate through** dates for creating exact-dated sessions from a weekly pattern on an ongoing course. These generation dates do not become course boundaries.
- Allows existing sessions in an ongoing course to be edited to any valid date, including dates outside the temporary generation window.
- Updates Platform validation to accept both GlobalSubjectRuns dates blank as Ongoing, while rejecting only-one-date/invalid fixed runs.
- Updates Worker/UI version markers and cache tags to `102.12.8`.
- No Platform Sheet/schema change: keep `PlatformConfig!B3 = 102.0.8` with 19 required tabs.
- The V103 unified Access Matrix and V104 Program Builder remain roadmap work and are intentionally not partially implemented in this patch.
