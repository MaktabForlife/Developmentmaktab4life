# V102.12.3 Changes

V102.12.3 refines Academy Home into a personalised two-day pill timetable.

## Academy Home

- Default timetable shows two days only:
  - first column is `TODAY` when the first date is the current Academy date;
  - second column uses the full weekday name, for example `Tuesday`.
- Replaces the rigid seven-day timetable cards with flexible time rows and session pills.
- All displayed times remain 24-hour M4L format such as `13h00`.
- Multiple simultaneous sessions can sit beside each other within the same time row.
- Previous/next controls move the two-day window by one day; `Today` returns to the current two-day view.

## Personalised Program delivery

- Students continue to receive detailed pills only for sessions authorised for their group / ALL-group rules.
- Program Teachers, Admins and Seniors see their own directly assigned teaching sessions as detailed Home pills.
- Other sessions in an authorised Program are rolled into one muted Program pill for that time.
- Clicking an authorised staff roll-up reveals read-only subject/module/group/teacher detail.
- Staff without membership in that Program still receive only the Program label and cannot expand it.
- GLOBAL_ADMIN receives Program roll-ups with expandable detail, but no Program session is treated as personally relevant unless directly assigned through Program identity.
- The full operational Program Timetable remains available in the Program workspace; Academy Home is intentionally concise.

## Current-session Zoom

- Zoom is now issued by the Worker only when the session is:
  - directly relevant to the account;
  - `SCHEDULED`;
  - on the Academy current date; and
  - currently between its start and end time in `PlatformTimezone`.
- Past and future sessions do not receive a Zoom URL on Academy Home.
- Cancelled sessions never receive Zoom.
- A current authorised session pill itself is the Zoom action.

## Security

- Existing backend `DETAIL` / `LABEL` redaction remains in force.
- Program roll-up expansion is available only when the backend has already authorised Program detail.
- Label-only users do not receive hidden subject, module, group, teacher, Zoom or operational details.

No Platform Sheet schema change is required. `PlatformSchemaVersion` remains `102.0.8` with 19 required tabs.
