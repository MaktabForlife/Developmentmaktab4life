# ﷽ V102.11.2 update TODO — Course Scheduler usability refinement

## 1. Before deployment

- [ ] Confirm the current deployed development baseline is V102.11.1.
- [ ] Do **not** change `PlatformConfig.PlatformSchemaVersion`; it remains `102.0.7`.
- [ ] Do **not** add or alter Platform Sheet tabs for V102.11.2.
- [ ] Apply only the paths listed in `CHANGED-FILES.txt`.
- [ ] Follow `DELETE-FILES.txt` (there are no intentional deletions).

## 2. Deploy

- [ ] Commit the V102.11.2 changed files to development GitHub.
- [ ] Deploy Pages and Worker from the same commit.
- [ ] Confirm Worker root returns `version: "102.11.2"`.
- [ ] Confirm the central account page shows `V102.11.2`.
- [ ] Hard refresh/private-window test the Admin UI to avoid stale assets.

## 3. Course Scheduler checks

- [ ] Course setup header contains `Set up a new course` and `Modify course`.
- [ ] Course identity/name/start/end/active controls align in one row on a large screen.
- [ ] Every schedule line shows seven day pills and allows multiple days to be selected.
- [ ] Example: select Mon/Tue/Wed/Thu with `04h00`–`05h00`; saving generates the correct exact dates inside the course range.
- [ ] Start/end time inputs and session rows display 24-hour `13h00` format; no AM/PM time control is shown in Course Scheduler.
- [ ] Schedule-row inputs and remove control have consistent heights.
- [ ] Save actions use save icons and retain accessible labels/tooltips.
- [ ] DEVELOPMENT sessions can be edited inline and saved individually.
- [ ] A session can be changed to CANCELLED inline.
- [ ] Reschedule creates a linked replacement session inline.
- [ ] PUBLISHED rows are read-only; opening a revision enables editing without rewriting the previous publication.
- [ ] Publication still blocks if a SCHEDULED session has no valid active teacher.

## 4. Global Access checks

- [ ] Global Access shows separate `Account` and `Unique ID` columns.
- [ ] Unique ID matches `UserAccounts.UniqueID`.
- [ ] FREE subjects still show FREE plus any saved subscription tick.
- [ ] PAID/FREE authorization behavior is unchanged.

## 5. Regression checks

- [ ] Attendance successful save still resets the visible register to Present.
- [ ] Protected Global Resources/Drive authorization still follows current FREE/PAID entitlement.
- [ ] Program Timetables remain available and unchanged functionally.
- [ ] Weekly Planner, Progress and Student Records still open normally.

## Rollback

V102.11.2 has no Sheet migration. To roll back, revert the V102.11.2 code commit to the deployed V102.11.1 commit and redeploy Pages + Worker together. Leave Platform schema `102.0.7` and all timetable/publication data unchanged.
