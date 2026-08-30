# V103.1 Release Notes

V103.1 begins the Central Identity architecture while deliberately preserving all existing Reboot operational behaviour.

## Permanent Reboot ↔ central identity link

Every normal Reboot `AdminRecords` and `StudentRecords` row can now be linked to its central `UserAccounts.AccountID`.

The migration uses the existing central relationship rather than guessing:

`Reboot record ID → UserCourseAccess.CourseRecordID + Role → AccountID → UserAccounts`

The source Reboot `UniqueID` must also match `UserAccounts.UniqueID` before a link is eligible to be written.

## System Settings migration UI

A new **V103.1 Identity links** section is available under Admin → System Settings → Platform Sheet.

It provides:

- preview before any write;
- counts of already-linked and planned records;
- blocking diagnostics and warnings;
- signed preview state;
- explicit `LINK <COURSEID>` confirmation;
- one batch write to the Reboot course Sheet;
- central audit logging after a successful commit.

## Safeguards

The V103.1 preview blocks instead of guessing when it finds identity ambiguity or unsafe Sheet state, including missing memberships, role mismatches, UniqueID mismatches, duplicate/ambiguous central mappings, conflicting existing AccountID values, duplicate operational identity links, orphan course memberships, duplicate AccountID headers, or unnamed data where the new header would be appended.

`StudentRecords` system rows remain excluded.

Existing nonblank conflicting AccountID values are never overwritten automatically.

## Reboot behaviour remains unchanged

V103.1 does not switch authority yet. The existing operational paths remain in place for:

- student/admin login;
- attendance;
- progress;
- Weekly Planner;
- Reboot timetable;
- resources/library;
- student/admin management;
- task assignment.

This makes V103.1 a safe identity-link foundation for the later V103 cut-over components.

## Sheet migration

The Platform workbook remains at `PlatformSchemaVersion 102.0.8` with 19 required tabs.

V103.1 changes only the Reboot operational workbook by appending:

- `AdminRecords.AccountID`
- `StudentRecords.AccountID`

The migration is performed by the V103.1 Identity Links UI; manual Sheet editing is not required.

## Audit

Successful commits write `LINK_OPERATIONAL_IDENTITIES` / `COURSE_IDENTITY_LINK` to `PlatformAuditLog`.

## Next V103 components

V103.2 will address the unified Access data model. The Academy Access Matrix, contextual teacher/staff resolution, authority cut-over and final compatibility verification remain separate later V103 components.
