# Maktab4Life V103.1.0.2

V103.1.0.2 is a focused Academy Home timetable display fix applied on top of **V103.1.0.1**.

It does not advance the V103 Central Identity authority model and does not require the controlled V103.1 Identity Links migration to have been run.

## Busy-day timetable cards

Each Academy Home day card now keeps its day header fixed while its session list scrolls vertically inside the card. A day with more sessions than the available card height therefore remains complete instead of relying on the outer Academy Home layout.

The session list uses its own touch-friendly scrolling and stable scrollbar space.

## Chronological ordering

Academy timetable ordering now compares actual time values rather than relying only on text sorting. This protects busy days from an unpadded time such as `9:30` being placed after `20:00`.

Both Worker delivery and the browser renderer apply the chronological safeguard.

## V103.1 Identity Links

The V103.1 controlled Identity Links migration remains separate and may still be pending. V103.1.0.2 does not read or require the new Reboot `AccountID` links for timetable delivery.

## Schema

No new Sheet migration is introduced:

- keep `PlatformConfig!B3 = 102.0.8`;
- keep **19 required Platform tabs**.

See `docs/V103.1.0.2-ACADEMY-HOME-BUSY-DAY-SCROLLING.md` for implementation details.

## Roadmap

- **V103** — Central Identity
- **V104** — Program Builder
- **V105** — Reboot migration into the generic Program architecture
