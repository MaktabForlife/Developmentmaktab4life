# Maktabhelper V102.12.3

## Academy Home timetable refinement

V102.12.3 makes Academy Home concise and personalised rather than an exhaustive seven-day operational timetable.

The default Home view is now a two-day pill layout:

- first day: `TODAY`;
- second day: actual weekday name;
- time shown in a small `13h00` pill;
- directly relevant sessions displayed as detailed M4L-styled pills;
- simultaneous sessions can share the same time row.

Program staff do not receive every Program session as a full Home card. Their own assigned teaching sessions are shown individually; the remaining authorised Program activity is collapsed into a Program pill that can be expanded for read-only detail. Unauthorised Program activity remains label-only and cannot be expanded.

Zoom delivery is tightened: only a directly relevant session that is currently running in `PlatformTimezone` can receive a Zoom URL on Academy Home.

## Deployment

This is code-only.

Do not add or modify Platform Sheet tabs/headers for V102.12.3. Keep `PlatformConfig!B3 = 102.0.8`.

Deploy Pages and Worker from the same commit.
