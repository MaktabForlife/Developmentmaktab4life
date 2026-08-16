# V102.2 implementation with Platform schema V102.0.3

> **V102.5 superseding schema note:** The subscription model advances the
> Platform schema to `102.0.4`. `UserGlobalSubjectAccess` and
> `GlobalResources` become required, while `TeacherScheduleIndex` is no longer
> required or read. Course Student subscriptions remain in `UserCourseAccess`.
> Follow `V102.5-SUBSCRIPTION-ACCESS-SCHEMA.md` for the exact upgrade; the
> V102.2 instructions below remain the historical account-migration record.

> V102.3 note: after completing this migration, the central account can now be
> verified at `/account/<uniqueid>`. V102.3 still keeps operational Admin and
> Student routes on the Reboot Sheet. See
> `V102.3-UNIFIED-ACCOUNT-VERIFICATION.md` before testing the new route.

V102.2 adds a preview-first, explicitly confirmed migration from the current
course's `AdminRecords` and `StudentRecords` into central `UserAccounts` and
`UserCourseAccess`. V102.2 itself does **not** activate `/account/<uniqueid>`,
switch current live API routes to dynamic course Sheets, or replace
`TeacherAssign` as the live timetable source. V102.3 subsequently activates the
central account verification route while existing operational logins remain
available.

## Confirmed architecture boundaries

- The Platform Sheet is a new, separate spreadsheet owned as platform
  infrastructure. Do not convert the Reboot course-local `Courses` tab into the
  central registry.
- `PLATFORM_SPREADSHEET_ID` identifies the central Platform Sheet.
- `GOOGLE_SPREADSHEET_ID` remains the current Reboot course Sheet during this
  foundation release and is retained for rollback.
- Every future course-data request must obtain its SpreadsheetID from an active,
  unique `CourseRegistry` record after validating the authenticated account,
  CourseID and role membership. A submitted CourseID or URL is never authority.
- One central `UserAccounts` row owns authentication identity and one personal
  UniqueID. `UserCourseAccess` owns course/role memberships.
- `UserCourseAccess.CourseRecordID` stores the course-local `AdminID` or
  `StudentID`. This link is required to load class assignment, enrolment,
  attendance, planner and progress records after unified login.
- Authorization is role-based. `GLOBAL_ADMIN` and `ADMIN` include
  platform/global authority; no
  separate `PlatformPermissions` tab or permission grant is required.
- `GLOBAL_ADMIN` is stored centrally in `UserAccounts.PlatformRole`, not as a
  course membership. It can enter every active course without a
  `UserCourseAccess` row.
- Course data remains membership-scoped. An Admin can administer global data,
  but can only open the students, staff and operations of courses where that
  account has an active membership.
- A GLOBAL subject makes its modules and tasks global. These children do not
  have separate scope controls and are not copied into course Sheets.
- The Library is linked to a course. Resource records and files therefore remain
  course-specific even when they reference a central GLOBAL subject, module or
  task. There is no central `GlobalResources` tab.
- Each course will carry its own `LibraryRootFolderID` in course-local
  `SystemConfig`. The current `M4L_GOOGLE_DRIVE_ROOT_FOLDER_ID` Worker variable
  remains a temporary Reboot fallback until course-scoped Library routing is
  activated.
- Existing Reboot subjects remain course-specific. Promotion to GLOBAL is a
  separate platform-authorised, centrally audited migration operation.
- Preserve legacy StudentID and AdminID values wherever historical course rows
  reference them. Add AccountID mappings; do not rewrite historical records in
  place.

## Required Platform Sheet tabs

Create the following tabs from the exact CSV templates in this directory:

1. `CourseRegistry`
2. `UserAccounts`
3. `UserCourseAccess`
4. `GlobalSubjectList`
5. `GlobalModuleList`
6. `GlobalTaskList`
7. `PlatformConfig`
8. `PlatformAuditLog`
9. `TeacherScheduleIndex`

Header spelling, order and capitalisation are enforced by the Worker. V102.2
fails closed on a missing tab, missing header, duplicate course lookup, inactive
course or blank SpreadsheetID.

If the Platform Sheet was created for V102.1, make these two exact changes
before deploying V102.2:

1. Enter `CourseRecordID` in `UserCourseAccess!N1`.
2. Enter `102.0.3` in the `ConfigValue` cell for
   `PlatformConfig.PlatformSchemaVersion` (normally `PlatformConfig!B3`).

## Authorization matrix

| Role | Allowed scope |
| --- | --- |
| `GLOBAL_ADMIN` | Every platform/global function and unrestricted access to every active course. Course selection still issues a CourseID-scoped token, isolates caches and records the CourseID in audit events. |
| `ADMIN` | Every function, including Platform Sheet administration, central accounts/access, course registry and GLOBAL curriculum changes. Course operational data still requires membership in that course. |
| `SENIOR` | Course-level modifications in assigned courses, including course configuration, local curriculum, timetable, students, staff assignments, attendance, planners, resources, tasks and progress. No platform/global administration. |
| `TEACHER` | Attendance, weekly-planner creation/viewing, adding course resources and course tasks, task assignment/verification and progress work. Every view and write is restricted to assigned classes/groups. No course-wide or global administration. |
| `STUDENT` | Own assigned-course information and own task-progress updates only. |

Role capability is necessary but not sufficient. Every request must also
revalidate the active `AccountID + CourseID + Role` membership. Teacher routes
must additionally intersect requested groups/students with course-local staff
class assignments; submitted CourseID, GroupNo or StudentID values never expand
access.

For `GLOBAL_ADMIN`, the Worker revalidates the active central account and
`PlatformRole=GLOBAL_ADMIN` instead of requiring a course membership. The
requested course must still resolve to exactly one active `CourseRegistry`
record. Only another active GlobalAdmin may grant or revoke this role after the
manual bootstrap.

Because scope is inherited from the subject, Senior and Teacher task creation is
limited to course-specific subjects. Adding or changing a task under a GLOBAL
subject is a global curriculum change and therefore requires ADMIN. Resources
remain course-specific and may be attached to either course or GLOBAL
curriculum, but Teacher resource visibility and assignment remain class-scoped.

## Initial PlatformConfig values

| ConfigKey | Initial value |
| --- | --- |
| `AccountLoginBaseUrl` | The environment-specific `/account/` base URL when the unified route is deployed |
| `PlatformSchemaVersion` | `102.0.3` |
| `GlobalCurriculumVersion` | `1` |

## ID and uniqueness rules

- Generate UUIDs or namespaced identifiers in the Worker; do not add Sheet ID
  counters.
- Recommended new prefixes: `ACCOUNT`, `ACCESS`, `COURSE`, `GSUBJ`, `GMOD`,
  `GTASK`, `CSUBJ`, `CMOD`, `CTASK`, and `CRES`.
- `UserAccounts.UniqueID` must be globally unique across all active and inactive
  account rows so a retired URL cannot be reassigned accidentally.
- `UserCourseAccess` must be unique by `AccountID + CourseID + Role`.
- `UserCourseAccess.CourseRecordID` must contain the matching course-local
  `AdminRecords.AdminID` for staff roles or `StudentRecords.StudentID` for the
  Student role.
- One account may have several roles and several courses.
- Test Admin and Student records that currently share a UniqueID must be given
  separate test UniqueIDs before central account migration. This does not block
  creation of the empty Platform Sheet.
- `UserAccounts.PlatformRole` is blank for ordinary accounts and exactly
  `GLOBAL_ADMIN` for unrestricted platform accounts.

## Automatic context rule

On a fresh PIN login, select the highest active authority:

`GLOBAL_ADMIN -> ADMIN -> SENIOR -> TEACHER -> STUDENT`

GlobalAdmin opens Platform Home and may choose any active course. Entering a
course issues a fresh CourseID-scoped GlobalAdmin token. Non-global accounts use
the course-membership selection rule below.

If several memberships share the highest role, use the most recent valid
`LastUsedDate`. If none has history, exactly one of those highest-role
memberships must have `IsDefault=TRUE`. An ambiguous tie fails closed instead of
silently choosing a course.

## Safe installation order

1. Create and back up the separate Platform Sheet.
2. Create all nine tabs from the V102 templates.
3. Share the Platform Sheet with the same Google service account used by the
   target Worker environment.
4. Add `PLATFORM_SPREADSHEET_ID` separately to development and production
   Worker variables.
5. Keep `GOOGLE_SPREADSHEET_ID` unchanged.
6. Add one active `CourseRegistry` row for the current Reboot Sheet, using its
   actual SpreadsheetID and current local schema version `101.4.3`.
   Paste only the Spreadsheet ID; do not include a trailing slash or URL.
7. Run central schema/routing validation before importing identities.
8. Select `Preview Account Migration` in ADMIN System Settings. Correct every
   blocking issue before writing anything.
9. The first migration must retain the checked GLOBAL_ADMIN option so the
   platform has one unrestricted recovery authority.
10. Type the displayed `MIGRATE <COURSEID>` confirmation and run the migration.
11. Validate the Platform Sheet again and verify central account/access counts.
12. Deploy V102.3 to development and verify `/account/<uniqueid>` using
    `V102.3-UNIFIED-ACCOUNT-VERIFICATION.md`. Do not redirect the legacy routes
    or enable central-token application-data access yet.

## V102.2 migration rules

- The current course Sheet must resolve exactly once in active
  `CourseRegistry`; a legacy Admin session cannot select another course merely
  by submitting a CourseID.
- `SYSTEM` student rows are excluded. Other incomplete account rows block the
  migration.
- Duplicate legacy UniqueIDs block the migration and identify their source
  sheet, row and local record ID. Accounts are never merged by display name.
- Matching display names across AdminRecords and StudentRecords with different
  UniqueIDs are flagged as possible mixed-role identities and block automatic
  migration until reviewed.
- When later courses are migrated, a course record whose display name matches a
  central account but whose UniqueID differs is also blocked for manual identity
  linking. V102.2 never guesses that two names represent the same person.
- Supported existing PIN hashes are copied without returning them to the
  browser. `PINSetup=TRUE` without a supported hash becomes a warning and the
  central account is marked for PIN setup.
- Preview creates no UUIDs and writes no cells. Commit requires the exact
  preview token and confirmation text; any source or central-data change makes
  the preview stale.
- UserAccounts, UserCourseAccess and one PlatformAuditLog event are written in
  one Google Sheets values batch.
- The first migration grants `GLOBAL_ADMIN` only to the currently authenticated
  Admin when the checked option is explicitly included in both preview and
  commit.

## Rollback boundary

V102.2 does not route any existing application-data endpoint through
`CourseRegistry`. The validation route reads the Platform Sheet; the migration
route writes only explicitly confirmed central identities, memberships and its
central audit record. Reverting the Worker leaves all V101.4.3 live routes on
`GOOGLE_SPREADSHEET_ID`; committed central rows may remain and are consumed by
the V102.3 account-verification stage. Do not delete `TeacherAssign`, `TimeTable`,
`AdminRecords`, `StudentRecords`, or any current timetable publication tab.
