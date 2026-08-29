# V102.12.3 UPDATE TODO

## Before deployment

- [ ] Confirm V102.12.2 is the current development baseline.
- [ ] Apply the V102.12.3 changed-files overlay.
- [ ] Do **not** change the Platform Sheet schema.
- [ ] Confirm `PlatformConfig!B3` remains `102.0.8`.
- [ ] Confirm the Platform still has 19 required tabs.

## Deploy

- [ ] Commit all V102.12.3 files together.
- [ ] Deploy Pages and Worker from the same commit.
- [ ] Confirm Worker `/` reports `102.12.3`.

## Focused Academy Home checks

- [ ] Login through `/account/<uniqueid>` and confirm Home opens the Academy timetable.
- [ ] Confirm the first day heading is `TODAY`.
- [ ] Confirm the second day heading is the actual full weekday name.
- [ ] Confirm times display as `13h00`, not AM/PM or `13:00`.
- [ ] Confirm multiple simultaneous sessions can display as separate pills on one time row.
- [ ] Confirm a Student sees detailed sessions only for their authorised Program group / ALL rules.
- [ ] Confirm other Program activity is rolled into one Program pill per time.
- [ ] Confirm label-only Program pills cannot reveal protected detail.
- [ ] Confirm a Program Teacher/Admin/Senior sees only directly assigned teaching sessions as detailed Home pills.
- [ ] Confirm remaining sessions in an authorised Program are rolled up and expandable read-only.
- [ ] Confirm unrelated Program staff without membership cannot expand another Program's label-only roll-up.
- [ ] Confirm GLOBAL_ADMIN sees Program roll-ups and can expand their detail.
- [ ] Confirm a current directly relevant session with Zoom is clickable.
- [ ] Confirm the same session is not clickable before it starts or after it ends.
- [ ] Confirm cancelled sessions never expose Zoom.
- [ ] Confirm previous/next moves one day and `Today` restores the current pair.
- [ ] Check the Sunday → Monday two-day boundary.

## Regression smoke checks

- [ ] Program Timetables still open normally.
- [ ] Course Scheduler still opens normally.
- [ ] Academy Calendar still renders.
- [ ] Global Access / Library authorization remains correct.
- [ ] Attendance saved-register reset remains intact.
- [ ] Weekly Planner and Progress open normally.

## Rollback

V102.12.3 has no Sheet migration. Roll back Pages + Worker together to the prior V102.12.2 commit. Leave `PlatformConfig!B3` at `102.0.8`.
