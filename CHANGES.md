# V102.12 — Academy timetable delivery

V102.12 adds the Academy-wide timetable **delivery layer**. Program Timetables and Global Course scheduling remain separate authoritative builders; V102.12 combines only their current read/published output for delivery to authenticated central accounts.

## Academy Home

- Unified central-account login now remains on the account page after PIN validation.
- The first authenticated view is **Academy Home → Timetable**.
- The timetable shows a Monday–Sunday week with previous/current/next week navigation and refresh.
- Times display in the platform-standard `13h00` format.
- Relevant sessions are visually prominent and other Academy activity is muted.
- Program/Global workspace selection remains available below the timetable; entering a workspace is now explicit rather than automatic after login.
- Unified Program/Global profile menus gain an **Academy Home** action to return to the combined timetable.

## Academy timetable API

Adds:

`POST /api/academy/timetable`

The endpoint:

- authenticates and revalidates the central account;
- reads every active Program's current live timetable source;
- reads current published Global Course snapshots;
- maps Program weekly sessions onto exact dates in the requested Academy week;
- uses `PlatformTimezone` for the current-week boundary;
- loads active Programs in parallel and isolates a temporarily unavailable Program rather than failing the entire Academy timetable;
- returns only backend-authorised fields.

## Program visibility

- `GLOBAL_ADMIN` — full Program detail across the Academy; authorised Zoom.
- Program `ADMIN` / `SENIOR` — full detail for that Program; authorised Zoom.
- Program `TEACHER` — full detail for that Program; only own sessions are marked relevant and receive Zoom.
- Program `STUDENT` — detail for own group and `ALL`; ClassGroup `0` retains all-groups read access.
- Any other authenticated account — Program label/date/time only.
- A Program `GroupNo = 0` is **not** treated as `ALL` for an ordinary student.
- Before Program DETAIL is granted, the central membership must still resolve to exactly one matching active local `StudentRecords` or `AdminRecords` identity. Stale/mismatched memberships fail closed to LABEL.

## Global Course visibility

- `FREE` — full session detail for every active central account.
- `PAID` / backend `SUBSCRIPTION` — full detail only for accounts with current Global Access entitlement, assigned Global Course teachers, or `GLOBAL_ADMIN`.
- Non-entitled accounts receive Global Subject label/date/time only.
- CANCELLED/RESCHEDULED published lifecycle state is delivered from the immutable current publication.
- CANCELLED or RESCHEDULED source occurrences do not expose an active Zoom action; the scheduled replacement can do so when authorised.

## Redaction contract

LABEL responses do not include subject/module/group/teacher/Zoom/resource/attendance/planner details or underlying operational identifiers. The browser never receives hidden detail and then hides it with CSS.

## Compatibility

- Platform schema remains `102.0.7` with 18 required tabs.
- No Sheet migration.
- Existing Program Timetable Builder behavior is unchanged.
- Existing Global Course Scheduler/publication behavior is unchanged.
- Attendance reset carry-forward remains intact.
- Global Resources protected access remains intact.
