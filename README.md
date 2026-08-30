# Maktab4Life V103.1.0.4

V103.1.0.4 is a focused **Academy Home timetable-loading** refinement applied on top of V103.1.0.3.

It does not advance the V103 Central Identity authority model and does not require the controlled V103.1 Identity Links migration to have been run.

## Rolling seven-day startup load

Academy Home now requests a rolling **7-day timetable beginning today** in one Worker request. All seven day cards are rendered into the existing horizontal swipe track, so moving through the coming week does not require a network request for every day.

Desktop continues to show two day cards at a time and mobile one day card at a time. The V103.1.0.2 internal vertical scrolling for busy day cards remains intact.

## Cache and background refresh

The latest valid rolling timetable is cached per central AccountID for up to 12 hours. On a reload, a valid cache can render immediately while the Worker refreshes the seven-day range. If that background refresh fails, the saved timetable remains visible with a clear saved-data message.

Manual Refresh always returns to today and reloads a fresh rolling seven-day range.

## Prefetch

When the user swipes near the end of the loaded range, Academy Home requests the following seven days in advance and merges them into the existing swipe track. The user can therefore continue into the following week without stopping on a loading screen.

Day arrows now move to already-loaded adjacent day cards locally. If an arrow crosses the loaded boundary, the required adjacent seven-day range is fetched and then displayed.

## Worker efficiency

The Academy timetable endpoint accepts an optional `days` value (default remains 2 for compatibility; maximum 14 per request). A seven-day range may span two timetable weeks, but each Program timetable snapshot is read once per request and then materialised across the required weeks, avoiding duplicate Program Sheet reads.

## Schema

No Sheet migration is introduced:

- keep `PlatformConfig!B3 = 102.0.8`;
- keep **19 required Platform tabs**.

See `docs/V103.1.0.4-ACADEMY-TIMETABLE-WEEK-LOADING.md` for details.

## Roadmap

- **V103** — Central Identity
- **V104** — Program Builder
- **V105** — Reboot migration into the generic Program architecture
