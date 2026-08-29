# V102.12.2 UPDATE TODO

## Before deployment

- [ ] Start from the deployed V102.12.1 development repository.
- [ ] Apply the V102.12.2 changed-files overlay.
- [ ] Do **not** add, delete or rename Platform Sheet tabs.
- [ ] Leave `PlatformConfig!B3` at `102.0.8`.
- [ ] If Academy Calendar is being prepared fresh rather than upgraded from V102.12.1, use `docs/V102.12.2-AcademyCalendar-template.csv` at `AcademyCalendar!A1` instead of the older V102.12.1 template.
- [ ] If V102.12.1 was already deployed, do not re-import the template. Existing `First Fast` rows may remain; V102.12.2 ignores them.

## Deploy

- [ ] Commit all V102.12.2 files together.
- [ ] Deploy Pages and Worker from the same commit.
- [ ] Confirm Worker `/` reports `102.12.2`.
- [ ] Run Platform validation; it should remain at `102.0.8` with 19 required tabs.

## Focused checks

- [ ] Open **Admin → Academy Calendar**.
- [ ] Confirm Calendar is full width.
- [ ] Confirm Terms is full width and existing terms edit/save inline.
- [ ] Confirm Islamic Dates and Public Holidays are side-by-side at 50/50 width on a large screen and stack on a small screen.
- [ ] Confirm Islamic descriptions show the Islamic date directly underneath.
- [ ] Confirm `First Fast` is absent.
- [ ] Edit one Islamic Most Likely/Alternate date inline and save; refresh and confirm it persists.
- [ ] Edit a generated Public Holiday date and save; refresh and confirm the original date disappears and replacement appears.
- [ ] Use `×` on one Public Holiday; refresh and confirm only that day is removed.
- [ ] Use `+` after the Public Holiday list, add a date and save; refresh and confirm it appears.
- [ ] Confirm the South African Sunday → following Monday rule still appears before any overrides.
- [ ] Confirm Academy Home shows Islamic dates beneath Islamic descriptions.
- [ ] Confirm Course Scheduler still warns about effective `NO_TEACHING` dates and does not silently alter published sessions.

## Rollback

- [ ] If no Public Holiday override has yet been saved, rollback is code-only to V102.12.1.
- [ ] If Public Holiday overrides have been saved, do not revert to the V102.12.1 Worker until those `PUBLIC_HOLIDAY` override rows are removed from `AcademyCalendar`; V102.12.1 validation predates that EventType.
- [ ] `PlatformConfig!B3` remains `102.0.8` throughout.
