# V103.1.0.2 Release Notes

V103.1.0.2 is the focused Academy Home timetable patch requested after V103.1.0.1. It addresses the pre-existing case where a busy day such as Thursday could appear to lose an intermediate session when later activity was also present.

## Internal day scrolling

The Academy Home day card is now structured as a fixed card with:

- a fixed/stable day heading; and
- an independently vertically scrollable session body.

When a day contains more rows than the available card height, the user scrolls **inside that day card** to reach the remaining sessions. The two-day horizontal swipe/scroll behaviour remains unchanged.

## Chronological protection

Session ordering no longer relies solely on raw time strings. Both Worker delivery and the browser renderer calculate a clock-minute sort value first, accepting both colon and `h` separators.

This means values such as:

- `04:00`
- `05:45`
- `06:15`
- `06:30`
- `9:30`
- `20:00`

remain in their correct chronological order even if one stored/display time is not zero-padded.

## Scope

This release intentionally changes only the Academy Home timetable display/delivery ordering needed for the reported busy-day issue. The V103.1.0.1 Global Curriculum restructuring remains intact.

The V103.1 controlled Identity Links migration remains separate and may still be pending.

## Sheet migration

There is **no new Sheet migration**.

Keep:

- `PlatformConfig!B3 = 102.0.8`;
- **19 required Platform tabs**.
