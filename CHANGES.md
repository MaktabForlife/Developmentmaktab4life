# V104.1 Changes — Platform Batch Reads

- Audited V103.1.0.5 Google Sheets read patterns.
- Added `getPlatformSheetReadRange()` and validated `readPlatformSheets()` Platform batch helper.
- Academy timetable Platform state changed from 13 individual tab reads to one 13-range `batchGet`.
- Central account check/login/context table loads changed from 2–8 individual Platform reads to one `batchGet`.
- GLOBAL central-session validation changed from three separate Global Platform table reads to one batchGet; credential-row revalidation remains immediate.
- Added integration assertions for the Academy Platform read budget and exact 13-range batch.
- Added Platform helper batch-read test coverage.
- Added V104.1 Google Sheets read audit and implementation documentation.
- No Program/Reboot batch-read change yet; reserved for V104.2.
- No Sheet migration. Platform schema remains 102.0.9 with 19 required tabs.
- Worker/app version advanced to 104.1.
