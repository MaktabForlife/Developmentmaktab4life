# V102.12.1 UPDATE TODO

## 1. Platform Sheet — before code deployment

- [ ] Back up the Platform Sheet.
- [ ] Leave `PlatformConfig!B3` at `102.0.7`.
- [ ] Create the `AcademyCalendar` tab.
- [ ] Import `docs/V102.12.1-AcademyCalendar-template.csv` at `A1`.
- [ ] Confirm 14 exact headers and 42 Islamic reference rows.
- [ ] Do not create public-holiday rows.

## 2. Deploy

- [ ] Apply this changed-files overlay to the deployed V102.12 development repo.
- [ ] Commit all V102.12.1 files together.
- [ ] Deploy Pages and Worker from the same commit.
- [ ] Confirm Worker `/` reports `102.12.1`.
- [ ] Change `PlatformConfig!B3` to `102.0.8` only after Pages and Worker are both live.
- [ ] Run Platform validation; confirm 19 required tabs.

## 3. Academy Calendar verification

- [ ] Open Admin → Academy Calendar.
- [ ] Confirm the current month's South African public holidays display only as `Public Holiday`.
- [ ] Confirm a Sunday public holiday also creates the following Monday public holiday.
- [ ] Check at least one Good Friday and Family Day date.
- [ ] Check Significant Islamic Dates against the supplied source document.
- [ ] Confirm the Alternate Date is visible/editable for Islamic dates.
- [ ] Create the Academy Terms through the UI and save them.
- [ ] Confirm Terms appear on the calendar.

## 4. Academy Home

- [ ] Log in through a central account.
- [ ] Confirm the Academy timetable remains Home.
- [ ] Confirm current Term/religious-period context displays when applicable.
- [ ] Confirm public holidays/Islamic dates appear on their dates.
- [ ] Confirm published sessions are still visible even on a no-teaching date.

## 5. Course Scheduler

- [ ] In DEVELOPMENT, generate a Global Course schedule that includes a public holiday.
- [ ] Confirm the course is saved and a calendar warning identifies the affected date.
- [ ] Confirm no session is silently deleted or cancelled.
- [ ] Use Cancel/Reschedule where required and republish normally.

## 6. Focused regression

- [ ] Program Timetables.
- [ ] Global Course Scheduler and publication/revision.
- [ ] Global Access FREE/PAID behavior.
- [ ] Protected Global resources and Zoom authorization.
- [ ] Attendance reset carry-forward.
- [ ] Academy DETAIL/LABEL redaction.

## Rollback

- [ ] Set `PlatformConfig!B3` back to `102.0.7` first.
- [ ] Revert Pages and Worker to V102.12 together.
- [ ] Leave the additive `AcademyCalendar` tab in place.
- [ ] Do not alter published timetable data.
