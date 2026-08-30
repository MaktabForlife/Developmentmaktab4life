# Maktab4Life V103.1

V103.1 is the first component of **V103 — Central Identity**. It starts from the verified V102.12.8 repository and establishes the permanent identity bridge between central `UserAccounts` and Reboot's existing operational records.

## V103.1 objective

**One central person, permanently linked to the existing Reboot operational record, without changing Reboot behaviour yet.**

V103.1 adds an `AccountID` link to normal rows in:

- `AdminRecords`
- `StudentRecords`

The link is resolved from existing `UserCourseAccess.CourseRecordID` + contextual role and then verified against `UserAccounts.UniqueID`. It is never guessed from a name.

## Preview-first Identity Links

Admin → System Settings → Platform Sheet now contains **V103.1 Identity links**.

The flow is:

1. Preview Identity Links.
2. Review planned header/link writes and any blockers/warnings.
3. Type `LINK <COURSEID>` when the preview is clean.
4. Link Reboot Identities.

The commit appends the `AccountID` header if required and writes the resolved AccountID values in one course-Sheet batch. Conflicting nonblank links are never overwritten.

## Operational boundary

V103.1 does **not** make central identity authoritative for Reboot operational behaviour yet. Existing login, attendance, progress, planner, timetable, resources and management paths remain unchanged.

`AdminID` / `StudentID` remain Reboot operational IDs. `AccountID` is the Academy-wide identity link.

## Schema

The Platform workbook is unchanged:

- keep `PlatformConfig!B3 = 102.0.8`;
- keep **19 required Platform tabs**.

There **is** a Reboot operational Sheet migration: V103.1 appends `AccountID` to `AdminRecords` and `StudentRecords` through the Identity Links commit. No manual column creation is required when using the UI migration.

See `docs/V103.1-CENTRAL-IDENTITY-LINK.md` for the full migration and safeguard design.

## Roadmap

- **V103** — Central Identity
- **V104** — Program Builder
- **V105** — Reboot migration into the generic Program architecture
