# Reboot Your Maktab / Maktab4Life Development

Current development release: **V102.12 — Academy timetable delivery**.

V102.12 builds directly on V102.11.2. It does not change either timetable builder. Instead, it adds the delivery/read layer that combines current **Program Timetables** with current published **Global Courses** and makes that Academy timetable the Home page after central-account login.

## V102.12 highlights

- Central-account login now lands on **Academy Home → Timetable** rather than automatically opening a Program workspace.
- Adds `POST /api/academy/timetable`.
- Academy Home combines:
  - each active Program's current live timetable source; and
  - current published Global Course snapshots.
- The Worker decides `DETAIL` versus `LABEL` visibility before data reaches the browser.
- Label-only Program occurrences expose only Program name, date/time and generic status.
- Label-only paid Global Course occurrences expose only the Global Subject label, date/time and generic status.
- Authorised Zoom links are returned only for sessions the account may join.
- Program memberships are revalidated against the Program's own active Student/Admin identity before DETAIL is granted.
- Relevant sessions are prominent; other permitted Academy activity is visually muted.
- All Academy Home times use the established `13h00` display format.
- Week navigation is available directly on Home.
- Program/Global workspaces remain available below the Academy timetable and through the existing account contexts.
- Program and Global Course builders, publication history, Attendance, Progress, Library and Weekly Planner remain unchanged.

## Platform schema

**No Platform Sheet migration is required for V102.12.**

- `PlatformSchemaVersion` remains `102.0.7`.
- Required Platform tabs remain **18**.
- `PlatformTimezone` remains the authoritative Academy timetable timezone.
- No Platform or Program Sheet tab is added, deleted or renamed.

## Deployment

Apply this changed-files overlay to the deployed V102.11.2 development repository. Deploy Pages and Worker from the **same commit**. Do not change `PlatformConfig.PlatformSchemaVersion`.

After deployment:

1. Confirm Worker root reports `version: "102.12"`.
2. Confirm the central account page shows `V102.12`.
3. Log in through `/account/<uniqueid>` and confirm Academy Home is shown immediately.
4. Run the DETAIL/LABEL and Zoom checks in `UPDATE-TODO.md`.

See `docs/V102.12-ACADEMY-TIMETABLE-DELIVERY.md` for the delivery and redaction contract.
