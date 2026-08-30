# V103.1.0.4 Release Notes

V103.1.0.4 makes Academy Home timetable navigation substantially faster by loading the coming week up front and prefetching the next range before it is needed.

## Startup timetable

On Academy Home startup:

- one Worker request loads **today + the next 6 days**;
- all seven day cards are rendered into the swipe track;
- desktop keeps two cards visible at a time;
- mobile keeps one card visible at a time;
- swiping between those loaded days is local and immediate.

The existing internal vertical scroll inside each busy day card remains unchanged.

## Day arrows

Previous/next arrows now move between loaded day cards rather than forcing a timetable API call for every single day. Crossing outside the loaded range fetches the adjacent seven-day block and then moves to the requested date.

## Prefetch

As the horizontal swipe track approaches its loaded end, the next seven days are fetched in the background and merged into the current timetable. Existing scroll position is preserved while the extra days are added.

## Cache

A per-AccountID Academy timetable cache is retained for up to 12 hours. A valid cache must begin on the current Platform-timezone date and contain at least seven days. It can render immediately while the Worker refresh runs.

Logout/context cache clearing also removes the Academy timetable cache.

## API compatibility

`POST /api/academy/timetable` now accepts:

```json
{
  "startDate": "YYYY-MM-DD",
  "days": 7
}
```

`days` defaults to 2 when omitted, preserving existing callers, and is capped at 14 per request.

## Program-load efficiency

For multi-week ranges, each Program timetable snapshot is loaded once and then expanded across the required timetable weeks. This avoids rereading the same Program timetable for each week of the requested range.

## Sheet migration

There is **no Sheet migration**.

Keep `PlatformConfig!B3 = 102.0.8` and **19 required Platform tabs**. The V103.1 Identity Links controlled migration may still be pending.
