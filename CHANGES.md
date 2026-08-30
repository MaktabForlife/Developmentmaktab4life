# V103.1.0.4 Changes

## Academy Home timetable loading

- Load a rolling seven-day timetable beginning today on startup.
- Render all loaded days in the existing horizontal swipe track.
- Keep desktop at two visible day cards and mobile at one.
- Keep V103.1.0.2 busy-day internal vertical scrolling.
- Change day arrows to local navigation when the target day is already loaded.
- Fetch an adjacent seven-day block only when navigation crosses a loaded boundary.
- Prefetch the following seven days when the user approaches the end of the swipe track.
- Preserve horizontal scroll position when next-week data is appended.

## Cache

- Add per-central-AccountID Academy timetable cache.
- Cache TTL: 12 hours.
- Cached data is accepted only when it starts on the current Platform-timezone date and contains at least seven days.
- Render valid cache before the background refresh completes.
- Keep cached timetable visible if that refresh temporarily fails.
- Clear Academy timetable cache through existing logout/context cache cleanup.

## Worker/API

- `/api/academy/timetable` accepts optional `days`.
- Default remains 2 days for compatibility.
- Maximum is 14 days per request.
- Multi-week Program recurrence is generated across every timetable week intersecting the requested date range.
- Program timetable Sheet reads are performed once per Program request and reused across those weeks.
- Response now includes `viewDays`.
- Worker/API version advanced to `103.1.0.4`.

## Unchanged

- No Sheet migration.
- `PlatformConfig!B3 = 102.0.8`.
- 19 required Platform tabs.
- V103.1 Identity Links migration remains separate and may remain pending.
- No change to Attendance, Progress, Planner, Resources, Global Curriculum access, or Reboot operational identity authority.
