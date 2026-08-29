# ﷽ V102.12 update TODO — Academy timetable delivery

## 1. Before deployment

- [ ] Confirm the deployed development baseline is V102.11.2.
- [ ] Do **not** change `PlatformConfig.PlatformSchemaVersion`; it remains `102.0.7`.
- [ ] Do **not** add, delete or rename Platform/Program Sheet tabs for V102.12.
- [ ] Apply only the paths listed in `CHANGED-FILES.txt`.
- [ ] `DELETE-FILES.txt` confirms there are no intentional deletions.

## 2. Deploy

- [ ] Commit the V102.12 changed files to development GitHub.
- [ ] Deploy Pages and Worker from the **same commit**.
- [ ] Confirm Worker root returns `version: "102.12"`.
- [ ] Confirm `/account/<uniqueid>` displays `V102.12`.
- [ ] Use a hard refresh/private window for the first browser check so the new account/shell assets cannot be masked by old cache entries.

## 3. Login / Academy Home

- [ ] Log in through a central `/account/<uniqueid>` link.
- [ ] After PIN validation, confirm the first authenticated page is **Academy Home → Timetable**; it must not auto-open the current Program workspace.
- [ ] Confirm current week is displayed Monday–Sunday.
- [ ] Confirm previous week, This week, next week and refresh controls work.
- [ ] Confirm displayed times use `13h00–14h00`, never AM/PM.
- [ ] Confirm the selected Program/Global workspace can still be opened explicitly below the timetable.
- [ ] From a Program/Global workspace, use Profile → Academy Home and confirm the combined timetable returns.

## 4. Program visibility checks

Use accounts with known Program membership/group roles.

- [ ] Ordinary student: own group and `ALL` sessions return subject/module detail and authorised Zoom.
- [ ] Ordinary student: another group's session shows **Program name/date/time only**.
- [ ] Ordinary student: Program `GroupNo = 0` is not incorrectly treated as `ALL`.
- [ ] ClassGroup `0` student retains all-groups detail access.
- [ ] Program Teacher sees complete subject/module timetable for the authorised Program.
- [ ] Teacher's own session is prominent and has Zoom when configured.
- [ ] Another teacher's session remains detailed but muted and has no Zoom action.
- [ ] Program ADMIN/SENIOR sees full detail for that authorised Program.
- [ ] Active account with no Program membership sees Program label/date/time only.
- [ ] Temporarily make a central Program membership stale/mismatched only in a controlled test environment; confirm the Academy endpoint fails closed to LABEL rather than returning Program detail.

## 5. Global Course visibility checks

- [ ] FREE Global Course: active central account sees full subject/module detail.
- [ ] FREE Global Course: authorised Zoom appears for a scheduled session when configured.
- [ ] PAID Global Course: subscribed account sees full detail and authorised Zoom.
- [ ] PAID Global Course: non-subscriber sees Global Subject label/date/time only; teacher/module/Zoom are absent.
- [ ] Assigned Global Course teacher receives teaching detail without a learner subscription.
- [ ] CANCELLED occurrence is visibly cancelled and has no Join Zoom action.
- [ ] RESCHEDULED source occurrence is visible as rescheduled and has no active Join Zoom action; its scheduled replacement is delivered separately.

## 6. Regression checks

- [ ] Program Timetables builder/read behavior is unchanged.
- [ ] Global Course Scheduler creation/revision/publication is unchanged.
- [ ] Attendance successful save still resets the visible register to Present.
- [ ] Protected Global Resources/Drive authorization still follows current FREE/PAID entitlement.
- [ ] Weekly Planner, Progress, Library, Student Records and Admin continue to open normally.

## Rollback

V102.12 has **no Sheet migration**. To roll back, revert the V102.12 code commit to the deployed V102.11.2 commit and redeploy Pages + Worker together. Leave Platform schema `102.0.7` and all timetable/publication data unchanged.
