# Maktabhelper V102.12.1

V102.12.1 adds the Academy Calendar to the Academy timetable foundation introduced in V102.12.

The Academy now has one central calendar for Admin-defined Terms, automatically generated South African public holidays, and Significant Islamic Dates sourced from the supplied 2025–2030 South African reference document. Academy Home displays this context alongside the combined Program and Global Course timetable.

South African public holidays always display as **Public Holiday**. Good Friday and Family Day are calculated from Easter, and when a public holiday falls on Sunday the following Monday is also marked as a public holiday.

Islamic descriptions are preserved from the supplied document. Most Likely Date is seeded as the active date and Alternate Date is retained for Admin adjustment. Ramadaan and the first 10 days of Zul Hijjah are derived informational periods.

Published timetables remain immutable. Calendar closures warn scheduling but never silently rewrite publication history.

Platform migration: `102.0.7` → `102.0.8`, adding the `AcademyCalendar` tab. See `docs/V102.12.1-PLATFORM-SHEET-MIGRATION.md`.
Verification: 59/59 test files pass; changed JavaScript/MJS files pass syntax validation.
