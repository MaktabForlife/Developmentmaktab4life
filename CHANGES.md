# V102.5 — Subscription access schema

- Retains `UserCourseAccess` as the single source of course access and treats
  `Role=STUDENT` as a course subscription.
- Adds `UserGlobalSubjectAccess` for direct global-subject subscriptions rather
  than duplicating course access in a general subscriptions table.
- Adds `GlobalResources` for resources owned by standalone global curriculum;
  existing course resources remain course-local.
- Validates global curriculum IDs and subject/module/task/resource relationships
  before reporting the Platform Sheet ready.
- Removes `TeacherScheduleIndex` from the required schema because subscriptions
  have no timetable or cross-course conflict restrictions.
- Adds a fail-closed active global-subject access helper for later learner
  delivery.
- Moves Platform schema to `102.0.4`, with temporary account/migration
  compatibility for `102.0.3` during the Worker-first upgrade.
- Updates the Admin validation summary with the global-subject subscription
  count and clarifies that the count is for ten required tabs.
- Adds two exact CSV templates and a complete migration/rollback guide.
- Preserves V102.4 operational routing and adds no billing or learner-content
  UI in this release.
- Bumps application and Worker metadata to `102.5`; all 42 tests pass.

Development only: production remains stable at V101.1 pending the final
consolidated and rehearsed production merge.

---

# V102.4 — Unified account operational routing

- Connects the V102.3 central account session to the existing Admin and Student
  workspaces without a second PIN.
- Adds authenticated CourseID-to-SpreadsheetID routing for course-scoped Worker
  APIs and never trusts a submitted CourseID or role to select a Sheet.
- Revalidates central identity, credential version, course membership, role,
  CourseRecordID and active CourseRegistry data on every operational request.
- Resolves the corresponding active `AdminRecords` or `StudentRecords` row
  exactly once before adapting the central identity to existing course
  authorization code.
- Allows GLOBAL_ADMIN to enter every active registered course with unrestricted
  Admin authority while preserving membership-scoped access for ordinary
  Admins.
- Adds the protected `/api/account/workspace` endpoint, automatic workspace
  launch and a manual **Open current course** recovery action.
- Adds **Switch course or role** to the signed-in application Profile menu and
  returns to the central switcher without another PIN.
- Adds CourseID to application, timetable and progress cache scopes and clears
  course data caches after a context change.
- Emits `X-M4L-Course-ID` only after authenticated dynamic course routing.
- Preserves legacy direct login routes for rollback and makes no Sheet schema,
  environment-variable or account-migration change.
- Adds dedicated course-routing and unified-workspace tests; all 41 test files
  pass.
- Bumps application and Worker metadata to `102.4`; Platform schema remains
  `102.0.3`.

See `docs/V102.4-OPERATIONAL-ACCOUNT-ROUTING.md`. New-user central provisioning,
per-course Drive and Apps Script configuration, final role-capability work,
global curriculum, legacy-route retirement and timetable-source cutover remain
explicitly deferred.

---

# V102.3 — Unified central account and context verification

- Adds one personal `/account/<uniqueid>` route for central account check,
  first-time PIN setup, PIN login and credential-bound session restoration.
- Implements fresh-login authority selection in the confirmed order:
  `GLOBAL_ADMIN`, `ADMIN`, `SENIOR`, `TEACHER`, `STUDENT`.
- Resolves equal highest-role contexts by most recent `LastUsedDate`, then the
  one designated default when no history exists; ambiguity fails closed.
- Adds Profile-style course/role selection without another PIN. Every switch
  rereads central records and issues a new CourseID/role-scoped token.
- Always revalidates central account activity, credential version, platform
  role, membership activity, CourseRecordID and active course registration,
  independent of the legacy credential-session feature flag.
- Gives GLOBAL_ADMIN a Platform context plus access to every active registered
  course without duplicated membership rows.
- Keeps central tokens separate in browser storage and prevents their use on
  all existing Admin/Student application-data routes.
- Audits self-service PIN setup and legacy-hash upgrade centrally using only the
  non-sensitive `AuthenticationCredential` changed-field label.
- Keeps legacy `/admin/<uniqueid>` and `/student/<uniqueid>` routes operational
  for the complete V102.3 verification period.
- Adds central authentication, revocation, context-switch and account UI tests.
- Requires no Platform Sheet schema change after `102.0.3` and no new Worker
  variable, secret, binding or Apps Script deployment.
- Establishes `UPDATE-TODO.md` as a required root-level file in every release,
  covering all actions needed to complete and verify that update.
- Establishes repository-specific `GITHUB-UPDATE` ZIPs as the supported
  GitHub-dashboard delivery method. Each is built against a reviewed repository
  export and verified by applying it to that exact baseline before release.
- Bumps application and Worker metadata to `102.3`.

Use `docs/V102.3-UNIFIED-ACCOUNT-VERIFICATION.md` for the development deployment
and verification sequence. Dynamic course-Sheet routing remains the next
release boundary.

---

# V102.2 — Controlled central account migration

- Adds an ADMIN-only Preview Account Migration action for the current course's
  `AdminRecords` and `StudentRecords`.
- Adds `UserCourseAccess.CourseRecordID` so each central membership resolves
  its course-local AdminID or StudentID; Platform schema becomes `102.0.3`.
- Excludes explicit SYSTEM student rows and blocks incomplete identities,
  unsupported roles, duplicate record IDs, duplicate UniqueIDs and central
  membership conflicts before any write. Exact cross-role display-name matches
  with different UniqueIDs are blocked for manual identity review.
- Preserves supported salted or legacy PIN hashes without returning hashes to
  the browser. A claimed PIN setup without a supported hash is migrated as PIN
  not set and reported as a warning.
- Requires the first migration to grant GLOBAL_ADMIN to the signed-in Admin.
- Requires an HMAC-bound preview token and exact `MIGRATE <COURSEID>` text for
  commit; a changed source or central table invalidates the preview.
- Writes UserAccounts, UserCourseAccess and one central PlatformAuditLog event
  in a single values batch.
- Keeps all existing login routes and application-data routing active.
- Bumps application and Worker metadata to `102.2`.

Before deployment, enter `CourseRecordID` in `UserCourseAccess!N1`, change the
PlatformConfig schema value to `102.0.3`, and rerun Validate Platform Sheet.

---

# V102.1 — Live Platform Sheet validation

- Adds `/api/admin/platform/validate`, restricted to authenticated `ADMIN`
  sessions and fixed to the Worker backend.
- Reads the actual `PLATFORM_SPREADSHEET_ID` and validates all nine exact tab
  schemas, PlatformConfig values, active course registry rows, SpreadsheetID
  format, account uniqueness and course-access references.
- Returns counts and readiness states only; Spreadsheet IDs, central account
  identities, PIN hashes, secrets and row contents are never returned.
- Adds a `Validate Platform Sheet` action to ADMIN System Settings with concise
  migration-readiness feedback.
- Keeps every existing application-data route on `GOOGLE_SPREADSHEET_ID` and
  retains V101.4.3 live login/timetable behaviour.
- Adds backend, authorization, routing and frontend integration coverage.
- Bumps application and Worker metadata to `102.1` while retaining the then
  current Platform schema version `102.0.2`.

Deploy to development first, sign in as ADMIN, open System Settings and run
`Validate Platform Sheet`. Do not populate central accounts yet.

---

# V102.0.2 — GlobalAdmin, authorization and multi-Sheet routing foundation

- Defines nine exact, fail-closed Platform Sheet schemas for the course registry,
  central identity/access, global curriculum, platform
  configuration/audit and the cross-course teacher schedule index.
- Makes authorization role-based: Admin includes every global/platform
  capability; Senior has course-level modification capabilities; Teacher has
  attendance, planner, resource, task and progress capabilities limited to
  assigned classes; Student is limited to own data and progress.
- Removes the separate `PlatformPermissions` design.
- Adds central `UserAccounts.PlatformRole=GLOBAL_ADMIN` for unrestricted access
  to every active course without creating repeated course-membership rows.
- Keeps Admin course operations membership-scoped while retaining Admin global
  curriculum and platform-management authority.
- Opens GlobalAdmin in a platform-level context and requires a fresh
  CourseID-scoped context when entering a course.
- Rejects malformed CourseRegistry SpreadsheetIDs, including pasted IDs with a
  trailing slash.
- Keeps Libraries and all resource records course-specific, including resources
  attached to a central GLOBAL subject, module or task.
- Adds explicit spreadsheet targeting to every reusable Google Sheets value and
  spreadsheet operation while preserving `GOOGLE_SPREADSHEET_ID` as the legacy
  default for all current routes.
- Resolves one active course registration from the central Platform Sheet and
  rejects missing, inactive, duplicate or un-routable records.
- Implements the automatic context selection rule: highest authority first,
  then latest use, then one designated default; ambiguous ties fail closed.
- Adds exact membership revalidation helpers for AccountID, CourseID and role.
- Adds central schema, course routing, context selection and backward-
  compatibility regression coverage.
- Does not activate unified account login, dynamic live API routing or the
  published-timetable read cutover in this foundation release.
- Bumps application and Worker metadata to `102.0.2`.

See `docs/V102-PLATFORM-SHEET-MIGRATION.md` before configuration. Keep
`GOOGLE_SPREADSHEET_ID`, `TeacherAssign` and `TimeTable` unchanged.

---

# V101.4.3 — Group assignments and staged timetable publication

- Replaces repeatable Lessons with one Subject, one optional Module, multiple
  Days, and either `ALL` or multiple individual Groups.
- Requires one Teacher and permits one Zoom override for each selected group.
- Creates every day–group combination only after complete validation and gives
  clear teacher/group conflict feedback in 24-hour time.
- Adds `DEVELOPMENT` and `PUBLISHED` course states with immutable, versioned
  publication snapshots.
- Adds permanent deletion for never-published development rows and enforced
  soft deletion plus restoration for anything ever published.
- Uses UUID-based session/publication IDs to prevent ID reuse after hard delete.
- Keeps `TeacherAssign` as the live student/teacher timetable source in this
  release; publishing prepares snapshots without a silent cutover.
- Adds three required Sheet tabs and comprehensive backend/UI regression tests.
- Bumps application and Worker metadata to `101.4.3`.

See `docs/V101.4.3-TIMETABLE-PUBLICATION-MIGRATION.md` before deployment.

---

# V101.4.2 — Multi-lesson timetable session creation

- Replaces the single Subject/Module/Teacher/Zoom fields for new sessions with
  repeatable lesson rows.
- Gives each lesson row its own Subject, optional Module, Teacher, and optional
  Zoom override while sharing Course, Time Slot, Days, Groups, and Active state.
- Creates every lesson–day–group combination in one `TimetableSessions` append
  only after the entire request passes validation.
- Rejects incomplete and exactly duplicated lesson rows before any write.
- Identifies the affected lesson number and curriculum name when one lesson has
  a teacher or group conflict; one conflict prevents the complete batch save.
- Keeps existing-session modification intentionally limited to one lesson row,
  one day, and one group.
- Appends a separate authenticated Admin audit event for every session created.
- Adds multi-lesson combination, duplicate, labelled-conflict, atomic-write, and
  UI regression coverage.
- Bumps application and Worker metadata to `101.4.2`.

No Google Sheet header, Apps Script, binding, or environment-variable change is
required after V101.4.

---

# V101.4.1 — Multi-day and multi-group session creation

- Replaces the new-session Day and Group dropdowns with clear selectable tiles.
- Allows several days and several numbered groups in one save, creating every
  selected day–group combination in one validated batch.
- Keeps `ALL` exclusive because it already represents every course group.
- Keeps modification intentionally limited to one existing session at a time.
- Validates the complete batch before appending any session rows.
- Allows one teacher/session definition to be shared across the selected groups
  while continuing to block genuinely overlapping teacher assignments.
- Shows conflict reasons inside the open editor, including teacher or group,
  day, 24-hour time range, and course.
- Displays all builder time ranges in 24-hour `HH:MM–HH:MM` format.
- Adds bulk-combination, `ALL`, group-conflict, teacher-conflict, no-partial-write,
  UI feedback, and 24-hour-format regression coverage.
- Bumps application and Worker metadata to `101.4.1`.

No Google Sheet header changes are required after the V101.4 three-tab
migration.

---

# V101.4 — Desktop Timetable Builder and curriculum workspace

- Adds an ADMIN-only, desktop-first Monday-to-Sunday timetable grid with the
  time column fixed first and course-specific start/end time slots.
- Adds audited create/modify workflows for courses, time slots, sessions,
  subjects, modules, and tasks in one tabbed Admin workspace.
- Supports optional modules, numbered or `ALL` groups, teachers, and optional
  per-session Zoom overrides; blank overrides use `SystemConfig.GlobalZoomLink`.
- Adds exact-schema `Courses`, `TimeSlots`, and `TimetableSessions` Sheet tabs.
- Generates all new identifiers from authoritative rows without Sheet counters.
- Blocks invalid time ranges, inactive dependencies, teacher overlaps, and
  same-course group overlaps (`ALL` conflicts with every numbered group).
- Retains `TeacherAssign` and `TimeTable` as the live timetable source. Builder
  rows are explicitly marked as draft and are not silently published.
- Extends the existing curriculum backend with header-driven Module CRUD and
  production-compatible optional Module fields for Task CRUD.
- Records authenticated Admin name/ID and server date on every builder or
  curriculum write and appends the action to `AdminAuditLog`.
- Adds focused backend, UI, router, module, conflict, and audit regression tests.
- Bumps application and Worker metadata to `101.4`.

Create the three new Sheet tabs before deploying the V101.4 Worker. The exact
headers and safe deployment order are in
`docs/V101.4-TIMETABLE-BUILDER-MIGRATION.md`.

---

# V101.3 — Authenticated administrative audit trail

- Adds a shared audit module for authenticated actor attribution, row creation
  stamps, row modification stamps and append-only audit events.
- Requires exact `AdminAuditLog!A1:I1` headers before any audited write.
- Uses UUID-based audit IDs, avoiding a new counter or mutable sequence row.
- Extends SystemConfig rows with `UpdatedByAdminName` in column E.
- Adds auditing to Admin/Student management, PIN reset, curriculum,
  resource-management, task-assignment, staff progress writes, Attendance,
  Weekly Planner, System Settings and the cached timetable Zoom write.
- Retains creation identity during updates and records only changed field names
  centrally; sensitive fields and submitted values are excluded.
- Adds focused audit-helper coverage and updates all affected route tests.
- Bumps release and Worker metadata to `101.3`.

Install the Google Sheet audit schema before deploying the Worker. The exact
column and verification sequence is documented in
`docs/V101.3-ADMIN-AUDIT-MIGRATION.md`.

---

# V101.2 — SystemConfig foundation and counter-free identifiers

- Adds `GlobalZoomLink` to the ADMIN-only System Settings read/write contract.
- Uses SystemConfig for the global Join Zoom action while retaining a legacy
  TimeTable fallback until the new row has been saved.
- Removes the separate Zoom Link settings tile, screen and frontend write path.
- Retains the old timetable Zoom endpoint temporarily for cached-client
  compatibility, but redirects its write to SystemConfig and restricts it to
  `ADMIN` accounts.
- Adds a shared sequential-ID helper that calculates the next unused suffix
  from every row in the authoritative sheet, including blank and inactive
  records.
- Converts Student, Admin, Subject, Task, SubjectResource and StudentTask
  creation so no Worker route reads or writes an ID counter.
- Adds focused tests for placeholder IDs, multi-ID allocation, SystemConfig
  Zoom persistence, legacy fallback, session-link isolation and counter-free
  record creation.
- Bumps timetable cache metadata to `v9` and release metadata to `101.2`.

The Worker must be deployed before any counter rows are removed. The migration
and rollback sequence is documented in `docs/V101.2-SYSTEMCONFIG-MIGRATION.md`.

---

# V101.1.1 — Unified large-screen Weekly Planner page width

- Caps `.weekly-planner-global-panel` at 1400px only from the 1180px desktop
  breakpoint upward.
- Aligns the complete top section with the existing 1400px inline editor.
- Leaves medium and mobile widths untouched.
- Bumps release and Weekly Planner cache metadata to `101.1.1`.

No data model, spreadsheet, Apps Script or Cloudflare configuration change is
required.

---

# V101.1 — Weekly Planner editable preview layout

- Replaces the large-screen editor styling with an editable HTML replica of the
  generated planner preview.
- Consolidates teacher, month, week and group into one shared header.
- Restores the preview's 2×2 day arrangement on all screens from 768px upward.
- Adds preview-style period labels and content columns while retaining proper
  form controls, keyboard focus indicators and independent Save buttons.
- Synchronizes the editor's writing font and ink colour with preview settings.
- Keeps the V101 non-rerendering save path and the existing mobile editor.
- Bumps release and Weekly Planner cache metadata to `101.1`.

No backend data model, spreadsheet, Apps Script or Cloudflare configuration
change is required.

---

# V101 — Stable large-screen Weekly Planner editing

- Separates mobile and large-screen Weekly Planner editing paths.
- Retains the existing tap-a-day modal editor below 768px.
- Adds a persistent inline 2×2 tablet and four-column desktop day editor.
- Places the date and synchronized group control inside every inline day header.
- Adds a local Save button to each day and to Weekly Feedback.
- Saves the complete planner without rerendering the large-screen editor, so
  focus, scroll position, editing mode and all four days are preserved.
- Renames submitted/downloaded PNG files as
  `Teacher-Name - Week-Date - submitted Submission-Date.png`.
- Bumps application, Worker and Weekly Planner asset metadata to `101`.

No spreadsheet schema, Apps Script or Cloudflare configuration change is
required.

---

# V100.10.5 — Oversight Zoom safety and readability

- Removes Zoom actions from `ADMIN`/`SENIOR` subject and module headings.
- Keeps disclosure headings dedicated to opening assignment details.
- Adds a separate underlined `Zoom` action to each linked assignment row.
- Enforces dark active text and light-grey muted text throughout oversight
  timetables, including links and disclosure chevrons.
- Enlarges mobile oversight detail text and spacing for improved legibility.
- Bumps the timetable cache namespace to `v8` and release/asset metadata to
  `100.10.5`.

Deploy the Worker/backend first, followed by the frontend. No Apps Script,
spreadsheet or Cloudflare-setting change is required.

---

# V100.10.4 — Responsive oversight timetable

- Groups timetable assignments by subject plus validated module name, producing
  separate ordered rows such as `Quran`, `Quran Part-1` and `Quran Part-2`.
- Moves disclosure chevrons inline with each subject/module title.
- Gives every disclosed assignment its exact group, teacher and Zoom action.
- Adds a native horizontally swipeable day view for `ADMIN` and `SENIOR` below
  `900px`, with session times listed vertically inside each day.
- Retains the complete weekly grid for oversight accounts on larger screens and
  for filtered Student/Teacher accounts at every size.
- Preserves Group 0 access boundaries, teacher-only filtering, text-only
  greying, blank-link safety and the legacy global Zoom source.
- Bumps the timetable cache namespace to `v7` and release/asset metadata to
  `100.10.4`.

Deploy the Worker/backend first, followed by the frontend. No Apps Script,
spreadsheet or Cloudflare-setting change is required.

---

# V100.10.3 — Module-name-only labels and exact Zoom selection

- Removes module numbers and the word `Module` from the displayed timetable;
  only the validated module name is shown.
- Shows a single-group student's module name and teacher directly, without a
  redundant group dropdown; disclosures appear only for multiple groups.
- Removes background shading from other-teacher sessions so only their text is
  light grey.
- Retains ModuleID/ModuleNo in backend data for identity and ordering.
- Confirms three Zoom-link cases in frontend tests:
  - one shared link makes the subject clickable;
  - different group links keep the subject non-clickable and make each exact
    group/module scope clickable;
  - `ALL` sessions continue to omit the group label.
- Bumps the timetable cache namespace to `v6` and release metadata to
  `100.10.3`.

Deploy the Worker/backend first, followed by the frontend. No Apps Script,
spreadsheet or Worker-setting change is required.

---

# V100.10.2 — Module-aware timetable and compact disclosures

## Data model

- Reads `TeacherAssign.ModuleID`, `ModuleName` and `ModuleNo` without requiring
  an AssignmentType column.
- Treats a blank ModuleID as a subject-level teaching assignment.
- Resolves populated ModuleIDs through `ModuleList`, using the ID rather than a
  typed module name as the relationship key.
- Returns module status and diagnostic warnings for missing, inactive and
  subject-mismatched modules.
- Retains optional `CourseID` support for a future CourseList while preserving
  the current `CoureName` alias.

## Timetable display

- Uses the same native disclosure interaction on desktop and mobile.
- Shows numbered-group subjects once, collapsed by default, with group/module
  and teacher rows revealed on demand.
- Shows `ALL` sessions as subject plus teacher without an `All groups` label.
- Displays a validated module as `Module number: Module name` beside its group.
- Keeps shared Zoom links on the subject and differing links on the matching
  group/module scope.
- Preserves TEACHER-only filtering, ADMIN/SENIOR oversight and explicit
  light-grey styling for other teachers' sessions.

## Validation and delivery

- Adds ModuleList joins and module-warning coverage to backend timetable tests.
- Adds disclosure, module-label, ALL-label suppression, Zoom-link, cache and
  responsive-delivery checks to the frontend timetable tests.
- Bumps the timetable cache namespace to `v5` and all modified asset/version
  metadata to `100.10.2`.

Deploy the Worker/backend first, followed by the frontend. No Apps Script or
Worker-setting change is required.

---

# V100.10.1 — Teacher-only scope and compact timetable rows

## Behaviour

- An authenticated account whose current `AdminRecords.Role` is `TEACHER` now
  receives only `TeacherAssign` sessions matching its stable `AdminID`.
- `ADMIN` and `SENIOR` retain the complete oversight timetable. An oversight
  account with no assigned sessions continues to see the full board normally.
- Repeated same-cell subjects render once, followed by numerically sorted
  `Group — Teacher` assignment rows.
- If grouped assignments share one session Zoom link, the subject opens it. If
  group links differ, each linked group label opens its own meeting.
- Muted subjects and assignments use an explicit light-grey text colour.
- Timetable cache namespace `v4` prevents a TEACHER account from receiving a
  previously cached full-board response.

## Deployment

Deploy the Worker/backend first, followed by the frontend. No Apps Script,
Google Sheets schema or Worker-setting change is required.

---

# V100.10 — Teacher-aware TeacherAssign timetable

## Scope

V100.10 switches timetable session reads to `TeacherAssign`, resolves teachers
through stable `AdminID` values, displays teacher names for students and admins,
and adds optional session-specific Zoom links while preserving the separate
global Zoom action.

## Backend

- Reads `TeacherAssign`, `AdminRecords` and `SubjectList` together.
- Preserves V100.8 Student Group 0 all-groups behavior without changing literal
  Group 0/`ALL` meanings in content or Admin records.
- Returns `teacherid`, `teachername`, assignment status, course fields, viewer
  teaching state and duplicate-assignment warnings.
- Uses `SubjectID` and `AdminID` as join keys; displayed names are never identity
  keys.
- Keeps the legacy `TimeTable` read/write only for the global Zoom link until
  the new timetable is verified.

## Frontend

- Shows a teacher below every subject.
- Shows group labels when the viewer receives multiple groups.
- Greys other teachers' sessions only when the logged-in AdminID has its own
  visible assignments. Oversight-only admins see all sessions normally.
- Makes any subject with a populated session Zoom link clickable.
- Retains distinct same-time sessions by SessionID instead of deduplicating only
  by subject name.
- Weekly Planner timetable filtering now sends stable teacher IDs.
- Cache namespace and modified asset URLs bumped for safe delivery.

## Verification

- Added backend coverage for stable joins, Group 0, inactive/missing teachers,
  duplicate conflicts, oversight behavior, session links and global-link
  separation.
- Added frontend delivery/behavior checks for teacher labels, greying,
  session-click links, Weekly Planner IDs and cache versions.

---

# V100.9 — Separate registration and selective task assignment

## Scope

V100.9 separates student account creation from curriculum task assignment.
Registering a student now creates the `StudentRecords` account and personal
login link only. Tasks are assigned afterwards from a dedicated Admin UI.

## Behaviour

- Registration no longer reads `TaskList` or `StudentTasks`, reserves
  `StudentTaskID` values, or creates task-assignment rows.
- Student Records now has three modes: Register, Assign Tasks and Modify.
- Assign Tasks first selects an existing registered student, then offers:
  - all active tasks; or
  - selected subjects and modules, including whole-subject selection.
- Only active students may receive new task assignments. Group 0 students are
  no longer assigned tasks automatically, but may still receive a deliberate
  manual assignment.
- The backend resolves the selected subject/module combinations to active
  `TaskList` rows and validates the selected student against
  `StudentRecords`.
- Existing `(StudentID, TaskID)` pairs are checked before any IDs are reserved.
  Repeating an assignment skips duplicates and does not append duplicate rows.
- New `StudentTasks` rows are built from the live sheet headers, preserving the
  full subject, module, task and assignment metadata layout.
- Existing explicit task, subject/group and bulk-assignment request shapes
  remain supported for backward compatibility.
- ADMIN and SENIOR task-assignment permissions are unchanged; TEACHER accounts
  remain blocked by the Worker.

## Deployment

Deploy the Worker/backend files first, followed by the Admin frontend files.
No Apps Script deployment, Google Sheets schema change or data migration is
required.

## Validation

- Confirmed registration writes only `StudentRecords` and its student-number
  counter, even if legacy assignment fields are submitted.
- Confirmed all-task, selected-module, Group 0 manual and duplicate-only retry
  flows.
- Confirmed duplicate-only retries do not reserve IDs or append rows.
- Confirmed inactive students and TEACHER accounts cannot assign tasks.
- Added UI/source integration coverage for the separate workflow and cache
  versions.

---

# V100.8 — Active Student Group 0 sees ALL groups

## Scope

V100.8 gives an active student whose `StudentRecords.ClassGroup` is `0`
read access to every timetable and resource group. Group 0 remains excluded
from Attendance and Progress monitoring.

## Behaviour

- Student Group 0 receives every active Library resource, including protected
  Google Drive resources after the direct-file authorization check.
- Student Group 0 receives the complete timetable once through a student-only
  translation to the existing `ALL` timetable scope.
- `TimeTable.GroupNo = 0`, resource `GroupNo = 0`, and
  `AdminRecords.AssignedGroup = 0` retain their literal meanings and do not
  replace `ALL`.
- The Admin student-management UI consistently labels the special value as
  `ALL (Group 0)` and accepts `0` as a deliberate group value.
- Only an `ADMIN` may newly assign Group 0; `SENIOR` users retain normal
  student-management access but cannot grant the all-groups designation.
- Student authentication and session binding preserve numeric zero values.
- The student profile displays `ALL (Group 0)` rather than presenting Group 0
  as inactive.
- Timetable cache namespace `v2` invalidates old Group 0 results, and the cache
  key now includes the authenticated account identity and group.
- Existing Attendance and Progress Group 0 exclusions are unchanged.

## Deployment

Deploy the Worker/backend changes first, then the frontend files. No Apps
Script deployment or Google Sheets schema change is required. Existing
StudentRecords Group 0 data must already have the intended `Active` value.

## Validation

- Added catalogue, protected-file, timetable, assignment-role, UI-label and
  cache-isolation coverage for Group 0.
- Confirmed a teacher with `AdminRecords.AssignedGroup = 0` remains restricted
  to literal Group 0/ALL timetable rows.
- Confirmed normal students cannot view a resource whose row has
  `GroupNo = 0` merely because Student Group 0 is now an access wildcard.
- All 26 test files present in the supplied V100.7.2 repository pass. The
  supplied baseline does not contain `pdfjs-annotation-session.test.mjs`, even
  though its pre-existing package script still references that file; V100.8
  does not change PDF.js behaviour or that baseline omission.

---

# V100.7.2 — Highlighted Admin Home tile

- Adds a separate Admin Home tile to the Admin landing page.
- Highlights Admin Home with the same active lavender tile treatment used by
  the main app Home page.
- Keeps the normal Home tile as the route back to the main app Home.
- Shows all six Admin landing tiles in one row on medium and large screens.

Frontend-only. No Worker, Apps Script or Google Sheets deployment is required.

---

# V100.7.1 — Admin Home tile and x-close navigation

- Adds a Home tile to the Admin landing page that returns to the main app Home.
- Changes the top-level Admin child-screen Back buttons to x-close icons.
- Every new x-close returns directly to the Admin tile landing page.
- Keeps internal workflow actions such as Back to List unchanged.
- Uses the supplied monitor-and-cog artwork for `systemsettings.svg`.
- Expands the large-screen Admin landing grid to five tiles in one row.

Frontend-only. No Worker, Apps Script or Google Sheets deployment is required.

---

# V100.7 — Admin menu tile landing page

## Scope

V100.7 replaces the old Admin list dashboard with an app-icon landing page
that matches the tile style used on the main Home page.

## Behaviour

- The Admin navigation item opens four tiles: Student Records, Admin Records,
  Resources and System Settings.
- Student Records opens the existing student register/modify flow.
- Admin Records and Resources open their existing management flows.
- System Settings opens a two-tile submenu for Zoom Link and the existing
  application System Settings form.
- ADMIN-only visibility and all existing Worker authorization remain intact.
- The Admin bottom-navigation item remains active on the landing page and its
  management child screens.
- Mobile uses a two-column tile grid; medium and large screens show all four
  landing tiles in one row.

## Deployment

Frontend-only. No Worker, Apps Script or Google Sheets deployment is required.

---

# V99.1 — Large-screen split PDF viewer

## Scope

V99.1 adds a teacher/admin split workspace that opens two independent PDF.js
viewers side by side. The feature is available only when the PDF workspace is
at least 1024px wide; student PDF screens remain single-view.

## Behaviour

- `SPLIT` opens the existing PDF Library drawer with the heading
  `Choose second PDF`.
- The selected document opens as PDF B beside the current PDF A.
- Both PDF.js viewers retain independent page, zoom, search, scroll and
  annotation state.
- A draggable and keyboard-accessible divider starts at 50/50 and enforces
  usable minimum pane widths.
- PDF B provides Open, Change and Close controls.
- Previous/Next and the normal Library drawer continue to control PDF A.
- Opening the Teaching Board suspends split mode without unloading PDF B;
  `RESTORE` returns to the two-PDF workspace.
- Dropping below 1024px suspends split mode. The SPLIT control is hidden and the
  normal single viewer remains active.
- Closing or navigating away from the PDF screen unloads both iframes.

## Files changed

- `admin/index.html`
- `student/index.html` (shared script cache versions only)
- `index.html` (shared script cache versions only)
- `styles.css`
- `css/m4l-19-pdf-split-view.css` (new)
- `icons/split.svg` (new)
- `js/m4l-resources.js`
- `js/m4l-shell.js`
- `js/m4l-teaching-panel.js`
- `version.json`
- `js/version.json`
- `backend/package.json`
- `backend/tests/pdf-split-view.test.mjs` (new)
- `CHANGES.md`

## Deployment

Frontend-only. No Worker, Google Sheets or Apps Script deployment is required.

---

# V99.0 — Persistent PDF.js annotation tool state

## Scope

V99.0 fixes the existing PDF.js annotation editor rather than adding a second
whiteboard overlay. Pen and freehand-highlighter colour and thickness now remain
the active preset for subsequent annotations during the same PDF session.

## Files changed

- `pdf-viewer/build/pdf.mjs`
- `pdf-viewer/web/viewer.mjs`
- `pdf-viewer/web/viewer.html`
- `js/m4l-resources.js`
- `admin/index.html`
- `student/index.html`
- `index.html`
- `version.json`
- `js/version.json`
- `backend/tests/pdfjs-annotation-session.test.mjs` (new)
- `backend/package.json`
- `CHANGES.md`

## Annotation behaviour

- Newly committed Pen drawings and freehand highlights are no longer
  auto-selected, so the main controls configure the next annotation rather than
  silently modifying the previous one.
- Changing Pen colour, thickness or opacity commits the current group of strokes
  first when necessary, allowing one lesson page to contain several independent
  pen colours and widths.
- Freehand Highlighter colour and thickness remain active for subsequent
  highlights, and the previous highlight remains unchanged.
- Existing annotations can still be selected deliberately and edited with the
  controls PDF.js provides for the selected annotation.
- Corrected the highlighter-thickness undo command type so it is no longer
  grouped as an ink-thickness operation.
- The original PDF remains unchanged unless the teacher explicitly uses PDF.js
  save/download behaviour.

## Automated verification

- Added a PDF.js annotation-session test covering Pen drawing-session commits,
  deliberate selected-annotation edits, Highlighter thickness defaults,
  auto-selection guards, the corrected undo type and cache-version URLs.
- All existing backend, routing, authentication, attendance, curriculum,
  progress, timetable, system-settings and Weekly Planner tests pass.

## Cache delivery

- Bumped the application version to `99.0`.
- Versioned the PDF.js viewer entry and modified module URLs so the seven-day
  `/pdf-viewer/*` cache cannot retain the pre-V99.0 annotation logic.

---


# V98.14 — Final audited Apps Script cleanup

## Scope

V98.14 completes the Apps Script reduction. Worker-to-Google-Sheets routing is
unchanged, and all application data management remains owned by the UI and
authenticated Worker routes.

## Files changed

- `apps-script/code.gs`
- `apps-script/README.md`
- `apps-script/MIGRATION-CHANGELOG.md`
- `apps-script/V98.14-AUDIT.md` (new)
- `backend/tests/apps-script-cleanup.test.mjs` (new)
- `backend/package.json`
- `CHANGES.md`

## Apps Script result

- Reduced `code.gs` from 5,716 lines to 257 lines.
- Removed all retired migration actions and all standalone Sheets-maintenance
  utilities.
- Removed the final seven utility actions:
  - `registerAdmin`
  - `getAdminByUsername`
  - `createTaskResource`
  - `listTaskResources`
  - `updateTaskResource`
  - `populateAllStudentTasks`
  - `getStudentTaskById`
- Removed the two manual StudentTasks population tests and all helpers used only
  by the deleted utilities.
- Retained exactly one callable action:
  - `saveWeeklyPlannerPreviewToDrive`
- Retained `authorizeM4LServices` and the read-only SystemConfig helpers needed
  to resolve the UI-managed Drive destination.
- Confirmed Apps Script contains no Google Sheets mutation calls.

## Architecture boundary

- Every current and future Sheets data change is initiated in the M4L UI and
  implemented through an authenticated Worker route.
- `populateAllStudentTasks` was a completed one-time startup utility.
- Admin registration, Task Resource administration and any future maintenance
  features must be built in the UI/Worker rather than restored to Apps Script.
- Apps Script is now the narrow Weekly Planner Google Drive bridge.

## Automated verification

- The Apps Script guard enforces the exact nine-function Drive dependency
  closure and one-action public allowlist.
- The guard blocks reintroduction of retired utility functions and common Sheet
  mutation calls.
- Existing direct-only routing diagnostics remain enforced.
- Weekly Planner Drive routing remains `apps-script` only.
- The unchanged standalone frontend Weekly Planner test retains the pre-existing
  assertion mismatch from V98.13: the UI label is `Save`, while the test expects
  `Save & Preview`.

## Deployment gate

Live Student/Admin authentication, a representative direct read/write, routing
diagnostics and an actual Drive PNG save must be verified in V98.13 Production
before deploying the V98.14 Apps Script source.

---


# V97.1.6.4 — Hub restructure, mirrored large-screen sizing, Save/Share

## Files changed (7)
- `admin/index.html`
- `css/m4l-15-weekly-planner.css`
- `css/m4l-16-weekly-planner-archive.css`
- `js/m4l-weekly-planner-archive.js`
- `js/m4l-weekly-planner.js`
- `styles.css` (version bump only)
- `version.json` (bumped to 97.1.6.4)

Backend files (`backend/src/router.js`, `backend/src/routes/weekly-planner.js`)
are included for completeness but are **unchanged** this round — Save/Share
reuses data already fetched by the existing endpoints.

## 1. Archive hub — restructured
- New page-level header (bg `--surface-card`): close icon + "Planner
  Archive" title — the one true screen header now.
- Two labeled panels below it, each with its own header bar (bg
  `--surface-app`): **"View by date"** (date picker + OPEN) and **"View by
  Teacher"** (submission heatmap list) — replacing the old single combined
  box and the "Submission history" heading text.
- Overall screen background changed from `--surface-app` to
  `--surface-track`, giving a layered hierarchy: page background
  (`--surface-track`) → section headers (`--surface-app`) → cards/content
  (`--surface-card`).
- Date/OPEN row is now a proper 50/50 grid, both left-aligned, instead of a
  flex row with a gap.
- Submission History rows are now a 60/30/10 grid (name / dots / icon) with
  a new `open.svg` icon added to each row so it's visually obvious they're
  tappable.
- Container width capped at 620px (50% of the previous 1240px) on medium
  and large screens.

## 2. Week-screen & Teacher-screen headers — restructured
Both now use the same 4-column (15/55/15/15) layout: close | title | Save |
Share — mirroring the main Weekly Planner header's pattern, via a new
`.weekly-planner-app-header--rail-actions` modifier (kept separate from the
Weekly Planner's own `--main` modifier since the action set differs:
close/save/share here vs. back/archive/save there).

Titles simplified to just the identifying label — the date range on the
week screen, the teacher's name on the teacher screen — dropping the
"– Submission History" suffix.

## 3. Save / Share (no PDF — reuses the images already generated)
- **Share:** `navigator.share({ files: [...] })` with every card's image in
  the current set attached at once (all teachers for the selected week, or
  all 4 of a teacher's weeks) — one share-sheet call, not one per card.
- **Save:** downloads each image individually (no zip-bundling library in
  this codebase, so it's sequential downloads rather than one combined
  file — flagging that as a possible follow-up).
- Filenames: `{TeacherName}-{ISOWeekStart}.png` (e.g.
  `Muallimah-Aasiyah-2026-07-20.png`) — spaces in names become hyphens.
- "Not submitted" entries are simply skipped — nothing to attach.
- Any card not yet scrolled into view (so not yet rendered/cached) gets
  rendered on demand before the set is collected, so Save/Share always acts
  on the complete set regardless of scroll position.
- Devices/browsers without file-sharing support (checked via
  `navigator.canShare`) fall back to the same download behavior as Save.

## 4. Card sizing corrected
Previously (v97.1.6.3) the large-desktop tier used a separately "bigger"
design — a wider max-width and a fixed minimum image height — which left
visible dead space above/below the rendered image once you saw it live.
Replaced with directly mirroring the Weekly Planner's own sizing: the same
`1600px` canvas cap, and no forced minimum height — the rendered image's
own aspect ratio governs the card, the same way Weekly Planner's own
content fills its cards with nothing left over. Also fixed a related gap:
`--weekly-planner-max-width` is now defined on the Archive screens too, so
each screen's header (which sits in `.weekly-planner-global-panel`) stays
width-consistent with the card rail beneath it.

## 5. Mobile card padding removed
`.weekly-planner-archive-card` no longer has its own padding — the
rendered image now goes edge-to-edge with the container, matching the
Weekly Planner's own mobile card exactly (this was the visible side gap
in the last round's screenshots).

## 6. Canvas text size increased
The purple handwritten-style user-input text is drawn directly onto the
1400×2000 canvas — not CSS, so not adjustable there. Bumped from
`fontSize: 26` (floor `17`) to `fontSize: 32` (floor `20`) in
`js/m4l-weekly-planner.js`, in the same `weeklyPlannerDrawTextBox` call
used for period-entry text.

## Verified
- HTML `<section>`/`<div>` tags balanced (34/34, 80/80).
- CSS brace-balanced on both stylesheets (156/156 Weekly Planner, 45/45
  Archive).
- `node --check` passes on both modified JS files and the (unchanged)
  backend files.
- Every element ID referenced by the JS — including the four new
  Save/Share buttons — confirmed present exactly once in `admin/index.html`.
- Confirmed zero leftover references anywhere to removed classes
  (`.weekly-planner-archive-section`, `.weekly-planner-header-actions`).
- Existing backend test suite still passes.

## Upload instructions
Copy these files into the corresponding paths in the live repo, preserving
the folder structure exactly.
