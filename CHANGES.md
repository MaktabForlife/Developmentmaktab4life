# V103.1 Changes

- Adds the first V103 Central Identity component: permanent `AccountID` links from Reboot operational records to central `UserAccounts`.
- Adds `/api/admin/platform/identity-links` with preview/commit actions.
- Adds a signed preview token so source or central-identity changes invalidate a stale commit.
- Resolves identity through `UserCourseAccess.CourseRecordID` + contextual role and verifies Reboot `UniqueID` against `UserAccounts.UniqueID`.
- Adds preview diagnostics for missing/ambiguous memberships, role mismatches, central-account conflicts, UniqueID mismatches, conflicting existing AccountID values, duplicate operational links, orphan memberships, duplicate AccountID headers and unnamed trailing Sheet data.
- Excludes `StudentRecords` system rows from identity linking.
- Appends `AccountID` to `AdminRecords` and `StudentRecords` only when the preview is safe.
- Writes all Reboot header/link changes in one course-Sheet batch.
- Never overwrites an existing conflicting nonblank AccountID.
- Adds central `PlatformAuditLog` action `LINK_OPERATIONAL_IDENTITIES` / record type `COURSE_IDENTITY_LINK`.
- Adds the V103.1 Identity Links preview/commit UI to Admin System Settings.
- Leaves all existing Reboot login, attendance, progress, planner, timetable, resource and management behaviour unchanged.
- Keeps the Platform workbook at `PlatformConfig!B3 = 102.0.8` with 19 required tabs; the new columns are a Reboot operational workbook migration only.
- Adds V103.1 migration documentation and a migration reference CSV.
- Updates Worker health and app version markers to `103.1`.
