# Maktabhelper development — V102.12.1

V102.12.1 extends the V102.12 Academy Home timetable with a central Academy Calendar.

Key additions:

- Admin-managed Academy Terms.
- Automatic South African public holidays with Sunday-observed Monday handling.
- Significant Islamic Dates for 2025–2030 seeded from the supplied South African reference document.
- Derived Ramadaan and first 10 days of Zul Hijjah periods.
- Calendar context on Academy Home.
- Course Scheduler warnings for sessions generated on Academy no-teaching dates.

This release does not merge Program and Global timetable storage. It only adds a central calendar layer consumed by Academy delivery and scheduling validation.

Deployment requires the Platform Sheet migration in `docs/V102.12.1-PLATFORM-SHEET-MIGRATION.md` before changing `PlatformSchemaVersion` to `102.0.8`.
