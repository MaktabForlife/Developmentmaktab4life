# V102.12.1 Changes

## Academy Calendar

- Adds the central `AcademyCalendar` Platform tab.
- Adds **Admin → Academy Calendar** with a month view, Terms, Islamic dates and automatically generated South African public holidays.
- Public holidays display only `Public Holiday` and include the South African Sunday-following-Monday rule.
- Good Friday and Family Day are calculated from Easter.
- Seeds 42 Significant Islamic Dates for 2025–2030 from the supplied South African reference document using its Most Likely and Alternate dates and exact descriptions.
- Derives informational `Ramadaan` and `First 10 Days of Zul Hijjah` periods from the stored Islamic dates.
- Terms are created and modified by Admin through the UI.

## Academy Home

- Weekly Academy timetable responses now include Academy Calendar events.
- Term/religious-period context appears at week level.
- Public holidays and significant Islamic days appear on the relevant dates.
- Calendar entries do not hide or rewrite published timetable sessions.

## Course Scheduler

- Exact-date generation reports warnings when generated sessions fall on Academy `NO_TEACHING` dates.
- Calendar warnings do not silently cancel sessions; Admin reviews and uses the existing Cancel/Reschedule revision workflow.

## Platform

- Platform schema moves from `102.0.7` to `102.0.8`.
- Required Platform tabs increase from 18 to 19.
- Existing Program Timetables, Global Course publication, Global Access, resources and Attendance behavior remain unchanged.
