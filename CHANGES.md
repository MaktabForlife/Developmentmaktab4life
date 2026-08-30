# V103.1.0.2 Changes

- Fixes the previously reported Academy Home busy-Thursday / extended-session-list display issue.
- Gives each day card a dedicated internal vertically scrollable session body while keeping the day heading fixed.
- Prevents the outer two-day Academy Home rail from clipping a long list of sessions.
- Adds stable scrollbar space and touch momentum scrolling to the day session body.
- Changes browser-side Academy session ordering to compare numeric clock times before textual fallbacks.
- Changes Worker-side Academy event ordering to use the same numeric-time safeguard.
- Supports both `HH:MM` and `HHhMM` time text when determining order, so an unpadded `9:30` cannot sort after `20:00`.
- Cache-busts the Academy Home account CSS/JS so the scrolling fix loads immediately after deployment.
- Advances Academy timetable/API and Worker diagnostic versions to `103.1.0.2`.
- Adds no Sheet migration and does not depend on the V103.1 Identity Links migration being run.
