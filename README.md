# Maktab4Life V102.12.8

Changed-files release from **V102.12.7**. Apply this overlay to the deployed V102.12.7 development repository and deploy Pages + Worker from the same commit.

V102.12.8 refines Academy Home timetable pills and adds an interim **Ongoing Global Course** mode so a course can remain active without artificial course-level Start/End dates while the generic Program Builder is still future roadmap work.

Key behaviour:

- detailed timetable pills are wider than compact/rolled-up pills;
- participants do not receive a redundant rolled-up Program pill when their applicable detailed Program pill is already present for that time;
- Global Course pills show Global Subject + optional Module + actual Teacher, not the internal Course/run name;
- Global Courses can be explicitly marked **Ongoing** with blank course dates;
- a temporary generation window may be supplied when generating exact sessions from an ongoing weekly pattern;
- `TBA` remains valid and publishable.

There is no Sheet migration. Keep `PlatformConfig!B3 = 102.0.8` with **19 required tabs**.

Roadmap boundary remains: **V103 Central Identity → V104 Program Builder → V105 Reboot migration**.
