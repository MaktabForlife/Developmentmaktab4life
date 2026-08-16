V102.8.1

# Correct Global Subjects switching and Library PDF controls

- Shows one **Global Subjects — STUDENT** choice in Profile for every ordinary
  account with an active subscription to an active global subject, even when
  the account also belongs to a course.
- Keeps the highest-authority course as the automatic fresh-login context when
  course access exists.
- Switches into the restricted Global Library through the existing central
  context endpoint, with a newly validated token and no second PIN.
- Displays **All**, all authorised courses and **Global Subjects** together in
  one segmented Library pill; compact layouts wrap the same control.
- Gives Students the existing two-PDF split viewer on screens at least 1024px
  wide. Both PDFs still require independent protected access.
- Places the PDF shelf count immediately left of the PDF title for all roles.
- Requires no Platform/course Sheet change, migration, account copy, Worker
  variable, secret, binding or Apps Script deployment.
- Preserves current browser-session persistence and all V102.8 permissions.

Install only
`Rebootyourmaktab-V102.8.1-GITHUB-UPDATE-FROM-V102.8.zip` over deployed V102.8
development and complete every item in `UPDATE-TODO.md`. Production remains
stable at V101.1. The timetable integrator is not part of this correction.

---

V102.8

# Integrate authorised course Libraries and subscribed global subjects

- Keeps one Library navigation item and provides **All**, one entry for each
  authorised active course, and **Global Subjects**.
- Reads each course from its centrally registered SpreadsheetID after
  validating access, then enforces its local staff/student identity and group.
- Includes only active global subjects granted by active
  `UserGlobalSubjectAccess` rows and active global resources.
- Adds protected cross-course file access and never returns Spreadsheet IDs to
  the browser.
- Lets users switch course or role directly from Profile without another PIN;
  each switch receives a new centrally validated scoped token.
- Supports a Library-only `GLOBAL/STUDENT` context for subscribers who have no
  course membership.
- Keeps Platform schema `102.0.4` and requires no migration, tab/header, Worker
  configuration, Apps Script or course Sheet change.
- Does not add billing, expiry, subscription limits, timetable checks or
  per-course independent Drive roots.
- Preserves current session persistence; the approved future authentication
  policy remains documented separately.

Install only
`Rebootyourmaktab-V102.8-GITHUB-UPDATE-FROM-V102.7.zip` over deployed V102.7
development and complete every item in `UPDATE-TODO.md`. Production remains
stable at V101.1.

---

V102.7

# Protect central global resources in a designated Google Drive folder

- Adds a `GLOBAL_ADMIN`-controlled Global Resources Drive root stored in
  `PlatformConfig` without changing Platform schema `102.0.4`.
- Replaces manual URL entry for new global resources with a contained Google
  Drive folder browser consistent with the existing Reboot course Library.
- Lets centrally authenticated ADMIN accounts browse and manage global
  resources while reserving root-folder changes for GLOBAL_ADMIN.
- Revalidates every requested folder/file against the configured root and
  rejects traversal outside it, unsupported files and duplicate Drive files.
- Stores a protected Worker file route and derives resource format from Drive;
  it does not require public Drive sharing.
- Adds subscription-gated short-lived signed access URLs for active global
  resources and validates the central account plus active subject entitlement.
- Blocks a root change that would leave an existing Drive-backed global
  resource outside the new root.
- Reports whether the global folder is configured in Platform validation.
- Increments `GlobalCurriculumVersion` when the root changes or a global
  resource changes; unchanged root saves and subscription changes remain
  version-neutral.
- Adds full deployment, exact-cell, testing and rollback instructions to
  `UPDATE-TODO.md`.
- Requires no new Worker variable, secret, binding, Apps Script deployment,
  account migration or course Sheet change.

Install only
`Rebootyourmaktab-V102.7-GITHUB-UPDATE-FROM-V102.6.3.zip` over deployed V102.6.3
development. Production remains stable at V101.1.

---

V102.6.3

# Correct account PIN retry re-enabling

- Preserves the submitted login form reference before the asynchronous API call.
- Reliably re-enables the PIN input and Continue button after a rejected PIN.
- Clears and focuses the PIN field so the next attempt can be entered without
  reloading.
- Applies the same safe form-reference handling to first-PIN setup failures.
- Preserves V102.6.2 menu visibility, permissions and Senior Teacher display.
- Changes no Sheet schema or data, Apps Script, Worker configuration, session
  policy or authorization rule.
- Includes the exact deployment and verification checklist in `UPDATE-TODO.md`.

Install only
`Rebootyourmaktab-V102.6.3-GITHUB-UPDATE-FROM-V102.6.2.zip` over deployed
V102.6.2 development. Production remains stable at V101.1.

---

V102.6.2

# Correct restricted menu visibility, PIN retry and Senior Teacher label

- Fixes the CSS cascade that caused role-restricted Admin Home tiles to remain
  visible as greyed controls.
- For SENIOR and TEACHER, Admin Home now renders only Home, Admin Home and
  Resources. The main Admin navigation entry remains because it opens their
  authorized Resources route.
- Clears and focuses the account PIN field after a failed login attempt so the
  user can retry without reloading.
- Displays `SENIOR` as `SENIOR TEACHER` while retaining `SENIOR` as the stored and
  authorized role value.
- Keeps all V102.6.1 authorization rules, Global Curriculum corrections and
  resource permissions intact.
- Changes no Sheet schema, Sheet data, Worker variable, binding, secret, Apps
  Script or authentication-session persistence policy.
- Adds the exact deployment and verification checklist in `UPDATE-TODO.md`.

Install only
`Rebootyourmaktab-V102.6.2-GITHUB-UPDATE-FROM-V102.6.1.zip` over deployed
V102.6.1 development. Production remains stable at V101.1.

---

V102.6.1

# Correct role visibility, resource creation, Profile and Global Curriculum tabs

- Makes Subjects, Modules, Tasks, Resources and Subscriptions simultaneously
  visible in Global Curriculum instead of placing each full-width tab beyond an
  undiscoverable horizontal overflow.
- Restores compact `New` buttons in Global Curriculum panels.
- Allows SENIOR and TEACHER to add course resources while preserving ADMIN-only
  modification of existing resources.
- Makes Student Records ADMIN-only in both the capability model and UI; SENIOR
  and TEACHER do not see its tile.
- Hides inaccessible Admin Home controls for the active role.
- Consolidates account name, courses, roles, current context and switching into
  one Profile card and removes the duplicate switch menu item.
- Reports global subject count separately from direct global-subject
  subscription count in Platform validation.
- Keeps Platform schema `102.0.4` and does not change GlobalCurriculumVersion,
  Sheet headers, Worker configuration, Apps Script or current authentication
  persistence.
- Adds the exact deployment and verification checklist in `UPDATE-TODO.md`.

Install only
`Rebootyourmaktab-V102.6.1-GITHUB-UPDATE-FROM-V102.6.zip` over deployed V102.6
development. Production remains stable at V101.1.

---

V102.6

# Manage central global curriculum and direct subject subscriptions

- Adds **Admin Home → Global Curriculum** for centrally authenticated `ADMIN`
  and `GLOBAL_ADMIN` accounts.
- Adds central add/modify and activate/deactivate management for global
  subjects, modules, tasks and resources.
- Adds direct account-to-global-subject access activation/deactivation through
  the existing `UserGlobalSubjectAccess` table; no duplicate general
  subscription table is introduced.
- Revalidates the central account token and exact authority for every new
  request. SENIOR, TEACHER, STUDENT, legacy-only and unauthenticated sessions
  are rejected.
- Uses namespaced UUIDs and never restores Sheet ID counters.
- Preserves global record dependencies: no hard deletion is offered,
  curriculum-branch moves that would orphan dependencies are blocked, and
  deactivation returns dependency feedback.
- Requires complete HTTPS links and the existing allowed types for central
  global resources.
- Writes every change to `PlatformAuditLog` with account, authority, course,
  action, record and changed-field data.
- Increments `GlobalCurriculumVersion` for every curriculum/resource change;
  direct access changes do not change the content version.
- Keeps Platform schema `102.0.4`; no tab/header, course Sheet, account
  migration, Worker setting, secret, binding or Apps Script change is needed.
- Documents the approved all-user browser-session authentication policy without
  changing current V102.6 session behaviour.
- Adds a required root deployment/verification/rollback `UPDATE-TODO.md`.

V102.6 does not yet deliver global curriculum in the learner application,
create a global-subject-only login context, or add billing/expiry logic.
Production remains stable at V101.1 and requires a later dedicated merge.

Install only
`Rebootyourmaktab-V102.6-GITHUB-UPDATE-FROM-V102.5.zip` over verified V102.5
development and follow `UPDATE-TODO.md`.

---

V102.5

# Define course and global-subject subscription access without duplication

- Confirms that an active `UserCourseAccess` row with `Role=STUDENT` is the
  authoritative course subscription; no general `UserSubscriptions` table is
  added.
- Adds `UserGlobalSubjectAccess` for direct account-to-global-subject
  entitlements, unique by AccountID and SubjectID.
- Adds central `GlobalResources` metadata so a standalone global subject is not
  dependent on a course Sheet or course Library.
- Validates global subject, module, task and resource relationships centrally,
  including supported resource types and exact reference integrity.
- Removes `TeacherScheduleIndex` from the required/validated Platform contract.
  The existing live tab may remain unused during rollback verification.
- Explicitly applies no timetable limit, overlap check, teacher-schedule check
  or course-combination restriction to subscriptions.
- Advances Platform schema from `102.0.3` to `102.0.4` and requires two new
  empty tabs with exact supplied headers.
- Keeps account authentication compatible with both schema versions during the
  controlled Worker-first upgrade.
- Updates Platform validation to report required tabs, central accounts and
  global-subject subscription counts clearly.
- Preserves all V102.4 unified login, course switching, cache isolation and
  dynamic course-Sheet routing behaviour.
- Requires no account-migration rerun, course-Sheet modification, new Worker
  variable, secret, binding or Apps Script deployment.
- Adds a required root `UPDATE-TODO.md` with exact tab names, cell ranges,
  deployment order, testing and rollback instructions.
- Application and Worker metadata become `102.5`; all 42 test files pass.

V102.5 is a development schema-and-validation release. It does not yet provide
global-subject-only account navigation, payment/renewal records, Admin
subscription management or global-resource delivery. Production remains stable
at V101.1 and requires a later dedicated merge package.

Install only
`Rebootyourmaktab-V102.5-GITHUB-UPDATE-FROM-V102.4.zip` over V102.4 and follow
`UPDATE-TODO.md` from beginning to end.

---

V102.4

# Open the authorised course workspace after unified login

- Sends a migrated user from `/account/<uniqueid>` into the correct Admin or
  Student application workspace without a second PIN.
- Adds a protected `/api/account/workspace` handoff that validates the selected
  course and exact course-local profile before navigation.
- Dynamically resolves the course Sheet from the authenticated central token
  and active `CourseRegistry` row. A URL, request body CourseID or submitted
  role cannot choose a different Sheet.
- Revalidates the central account, credential version, active course access,
  CourseRecordID, role and local course record on every course-scoped request.
- Lets `GLOBAL_ADMIN` enter any active registered course as an unrestricted
  Admin workspace without adding artificial membership rows.
- Adds **Switch course or role** to the in-app Profile menu and issues a newly
  scoped token before reopening the selected workspace.
- Separates course caches by CourseID and clears timetable, resource, progress
  and user-data caches when context changes.
- Adds an `X-M4L-Course-ID` response header to dynamically routed requests for
  safe development verification.
- Keeps direct legacy Admin and Student links active as a rollback path.
- Does not rerun account migration, alter Sheet headers, add Worker settings or
  change the Platform schema from `102.0.3`.
- Adds fail-closed routing, local-profile, GlobalAdmin, UI handoff and cache
  isolation tests. All 41 backend regression test files pass.

V102.4 activates course operations only for accounts already present in
`UserAccounts` and `UserCourseAccess`. Central provisioning for newly created
course users, per-course Drive-root/Apps-Script routing, full confirmed Teacher
capabilities, global-curriculum merging, legacy-route retirement and the
published-timetable read cutover remain later releases.

Install only the files in
`Rebootyourmaktab-V102.4-GITHUB-UPDATE-FROM-V102.3.zip`, deploy the Worker first,
then deploy the complete Pages frontend. Follow `UPDATE-TODO.md` and
`docs/V102.4-OPERATIONAL-ACCOUNT-ROUTING.md`.

---

V102.3

# Verify one account, one PIN and scoped course/role switching

- Adds `/account/<uniqueid>` with central PIN setup, login and session restore.
- Fresh PIN login selects `GLOBAL_ADMIN -> ADMIN -> SENIOR -> TEACHER -> STUDENT`,
  then most recently used highest-role course, then the designated default.
- Lists every active authorised context and switches course/role without another
  PIN, issuing a new scoped token each time.
- Revalidates central account status, PIN credential version, active membership,
  role, CourseRecordID and active CourseRegistry entry on every central request.
- Lets GLOBAL_ADMIN open Platform scope and switch to any active course without
  repeated membership rows.
- Uses separate browser storage for central sessions and does not overwrite
  current Admin/Student sessions.
- Centrally audits first PIN setup and legacy-hash upgrades without recording a
  PIN or hash value.
- Deliberately rejects the new central token at every legacy course-data route;
  dynamic spreadsheet routing is the next cutover boundary.
- Keeps `/admin/<uniqueid>` and `/student/<uniqueid>` operational. They are not
  redirected in this release.
- Adds no Sheet tab, header, Worker binding, secret or schema-version change.
- Adds a root-level `UPDATE-TODO.md` with the complete prerequisite, deployment,
  migration, verification, safety-boundary, completion and rollback checklist.
- Replaces the ambiguous incremental-install process with a repository-specific
  `V102.3-GITHUB-UPDATE` package. The full-source ZIP remains a complete
  backup/reference snapshot rather than a dashboard upload.
- Application and Worker metadata are `102.3`; Platform schema remains `102.0.3`.

Deploy to development only after V102.2 account migration is complete. Follow
`docs/V102.3-UNIFIED-ACCOUNT-VERIFICATION.md` and verify the account/context
flow before beginning dynamic course-Sheet routing.

---

V102.2

# Preview and migrate central accounts safely

- Adds a preview-first account migration under ADMIN System Settings.
- Migrates the current course's staff and students into central UserAccounts
  and UserCourseAccess only after all blocking issues are resolved.
- Adds `CourseRecordID` to UserCourseAccess so each membership retains its
  course-local AdminID or StudentID link.
- Blocks duplicate UniqueIDs and reports exact source rows without exposing the
  UniqueID value or any PIN hash.
- Requires GLOBAL_ADMIN bootstrap, an unchanged preview token and exact typed
  confirmation before the one-batch write.
- Existing role-specific login routes and all live course-data routes remain
  active after migration.
- Application and Worker metadata are `102.2`; Platform schema is `102.0.3`.

Before deploying, enter `CourseRecordID` in `UserCourseAccess!N1`, change the
PlatformConfig schema value to `102.0.3`, and validate the Platform Sheet.

---

V102.1

# Validate the live Platform Sheet safely

- Adds an ADMIN-only live validation endpoint for the central Platform Sheet.
- Validates all nine headers and the configured account URL, schema version,
  curriculum version, active courses, unique IDs and membership references.
- Shows the result from a new `Validate Platform Sheet` button in System
  Settings.
- Returns counts and readiness only; no Sheet IDs, identities, hashes or secrets
  are sent to the browser.
- Existing logins and application-data routes remain on the V101.4.3 Reboot
  Sheet.
- Application and Worker metadata are bumped to `102.1`; the Platform Sheet
  schema at that release remained `102.0.2`.

Deploy to development before production and validate the empty-account Platform
Sheet before beginning the controlled identity migration.

---

V102.0.2

# Central Platform Sheet foundation

- Adds the exact central Platform Sheet contract for courses, accounts,
  course/role access, global curriculum, platform audit and
  cross-course teacher schedule indexing.
- Uses roles directly for authorization: Admin has everything including global
  administration; Senior can modify assigned courses; Teacher handles
  attendance, planners, resources, tasks and progress for assigned classes.
- Removes the separate PlatformPermissions tab.
- Adds `GLOBAL_ADMIN` as a central UserAccounts platform role with unrestricted
  access to every active course.
- Keeps ordinary Admin course-data access membership-scoped.
- Rejects CourseRegistry SpreadsheetIDs containing a trailing slash or URL
  characters.
- Confirms that each Library belongs to a course. Library roots, resource rows
  and files remain course-specific even when linked to global curriculum.
- Adds fail-closed course registry resolution and highest-authority automatic
  context selection helpers.
- Allows the Google Sheets client to address an explicit spreadsheet without
  changing any current V101.4.3 route.
- Retains the current Reboot `GOOGLE_SPREADSHEET_ID`, role-specific login routes,
  `TeacherAssign` live timetable and all rollback boundaries.
- Application and Worker metadata are bumped to `102.0.2`.

Create the separate Platform Sheet only after reviewing
`docs/V102-PLATFORM-SHEET-MIGRATION.md`. This foundation package is not the
unified account-route or production data cutover.

---

V101.4.3

# Per-group assignments and safe timetable publication

- A save now has one Subject and optional Module across all selected Days.
- Select `ALL` alone, or select individual Groups and assign a required Teacher
  and optional Zoom override to each group.
- The builder reports the exact teacher or group conflict that prevents save.
- Publish creates an immutable, versioned snapshot and marks the course
  `PUBLISHED`; any later draft edit returns it to `DEVELOPMENT` without changing
  the last snapshot.
- Never-published development sessions can be permanently deleted. Anything
  ever published is only made inactive and can be restored after conflict
  validation.
- `TeacherAssign` remains the live timetable read source in V101.4.3.
- Application and Worker metadata are bumped to `101.4.3`.

Before deployment, add `TimetableCourseState`, `TimetablePublications`, and
`PublishedTimetableSessions` using the exact CSV templates in `docs/`. No Apps
Script, Worker binding, or Cloudflare-variable change is required.

---

V101.4.2

# Add multiple subjects/modules in one timetable save

- New sessions use repeatable lesson rows containing Subject, optional Module,
  Teacher, and optional Zoom override.
- Course, 24-hour time slot, selected days, selected groups, and Active status
  are shared across the lesson rows.
- One save creates every selected lesson–day–group combination in one session
  data append after validating the complete batch.
- Incomplete or exactly duplicated lesson rows are rejected before writing.
- Conflict feedback identifies the affected lesson and its subject/module.
- If any lesson, day, or group conflicts, none of the requested sessions are
  written.
- Existing sessions remain single-record edits.
- Every created session receives its own authenticated Admin audit event.
- Application and Worker metadata are bumped to `101.4.2`.

This package is cumulative and includes V101.4 and V101.4.1. No new Google Sheet,
Apps Script, Worker binding, or Cloudflare-variable change is required.

---

V101.4.1

# Multi-day and multi-group Timetable Builder sessions

- Admin can select multiple days when creating a session.
- Admin can select multiple numbered groups; `ALL` remains a standalone choice.
- One save creates every selected day–group combination only after the complete
  selection passes validation.
- Existing sessions remain single-record edits to avoid accidental bulk changes.
- Teacher and group conflicts are explained inside the session dialog with the
  affected teacher/group, day, 24-hour time, and course.
- A failed combination prevents the complete batch from being written.
- Timetable ranges now display in 24-hour format such as `09:00–10:30`.
- Application and Worker metadata are bumped to `101.4.1`.

This package is cumulative and includes the V101.4 Timetable Builder. No new
Google Sheet changes are required beyond the V101.4 `Courses`, `TimeSlots`, and
`TimetableSessions` tabs. No Apps Script, Worker binding, or Cloudflare-variable
change is required.

---

V101.4

# Desktop Timetable Builder and curriculum management

- Adds an ADMIN-only desktop workspace with five tabs: Timetable, Courses &
  Times, Subjects, Modules, and Tasks.
- Builds one course at a time using course-owned start/end time slots and a
  Monday-to-Sunday week grid.
- Creates and modifies sessions with Subject, optional Module, Group, Teacher,
  optional Zoom override, and Active status.
- Uses the global Zoom link from System Settings whenever a session override is
  blank.
- Prevents overlapping teacher assignments and overlapping group sessions in
  the same course, including `ALL` group conflicts.
- Adds audited course, time-slot, session, module, and module-aware task routes.
- Keeps Subjects, Modules, and Tasks editable from the same builder workspace.
- Preserves the current live timetable from `TeacherAssign`; V101.4 builder
  sessions remain unpublished draft data until a deliberate cutover release.
- Bumps application and Worker metadata to `101.4`.

Before deploying the Worker, create `Courses`, `TimeSlots`, and
`TimetableSessions` with the exact headers in
`docs/V101.4-TIMETABLE-BUILDER-MIGRATION.md`. The confirmed production
`SubjectList`, `ModuleList`, and `TaskList` headers require no additional change.
No Apps Script, Worker binding, or Cloudflare-variable change is required.

---

V101.3

# Authenticated Admin attribution and append-only audit history

- Adds `AdminAuditLog` with server-generated time, authenticated Admin ID/name,
  role, action, record type, record ID and changed field names.
- Adds immutable creation attribution and separate latest-modification
  attribution to current master-data write paths.
- Audits Admin and Student records, curriculum, Drive and subject resources,
  task assignments/progress, System Settings, global Zoom compatibility writes,
  Attendance and Weekly Planner saves.
- Preserves existing creation information when records are modified.
- Adds the authenticated name to Attendance, StudentTask assignment and
  SystemConfig writes.
- Excludes PINs, hashes, secrets, tokens, credentials and submitted field
  values from the central log.
- Fails administrative writes closed when `AdminAuditLog` or required audit
  columns have not been installed; read routes remain available.
- Bumps application and Worker metadata to `101.3`.

The Google Sheet migration must be completed before the V101.3 Worker is
deployed. Follow `docs/V101.3-ADMIN-AUDIT-MIGRATION.md`. No Apps Script,
Worker binding or Cloudflare-variable change is required.

---

V101.2

# SystemConfig foundation and global Zoom migration

- Moves the global Zoom setting into the existing ADMIN-only System Settings
  screen as `GlobalZoomLink`.
- Timetable reads prefer `SystemConfig.GlobalZoomLink` and retain the legacy
  `TimeTable.ZoomLink` only as a one-release migration fallback.
- Removes the separate Zoom Link tile and legacy Timetable/Zoom editor.
- Keeps `TeacherAssign.ZoomLink` session-specific and unchanged.
- Replaces all live `Next...Number` dependencies with IDs calculated from the
  authoritative StudentRecords, AdminRecords, SubjectList, TaskList,
  SubjectResources and StudentTasks sheets.
- Blank or inactive rows still reserve their IDs: an existing blank `SUBJ17`
  therefore produces `SUBJ18`, never another `SUBJ17`.
- Bumps the timetable cache namespace to `v9` and application/Worker metadata
  to `101.2`.

Deploy the Worker/backend first while retaining all existing SystemConfig rows.
Deploy the frontend second, save the global Zoom URL through System Settings,
verify reads and writes, and only then remove the obsolete counter rows. Follow
`docs/V101.2-SYSTEMCONFIG-MIGRATION.md`. No Apps Script deployment or new
Worker binding is required. Do not delete `TimeTable` or `TeacherAssign` yet.

---

V101.1.1

# Unified large-screen Weekly Planner page width

- On screens from 1180px upward, the complete Weekly Planner top section is
  capped at the same 1400px width as the editable planner body.
- The title, action toolbar and teacher/month/week/group header now align with
  the day panels so the editor reads visually as one page.
- Medium and mobile layouts are unchanged.
- Application, Worker and Weekly Planner CSS cache metadata are bumped to
  `101.1.1`.

Deploy the Worker/backend first and the frontend second. No spreadsheet,
Apps Script, Worker binding or Cloudflare-setting change is required.

---

V101.1

# Weekly Planner editable preview layout

- The tablet/desktop editor now closely follows the familiar submitted planner
  preview instead of presenting a separate application-style card design.
- The teacher, month, week commencing date and group appear once in the shared
  preview-style header. The month updates automatically from the selected week.
- Monday to Thursday use the same 2×2 arrangement as the generated image.
- Each day uses a cream heading, period labels in the left column and editable
  subject/activity content in the right column.
- The editor follows the selected preview font and ink colour.
- Weekly Feedback remains full width below the four days.
- Independent day Save controls and the non-jumping full-week save behaviour
  introduced in V101 are retained.
- The mobile preview and tap-a-day dialog flow are unchanged.
- Application, Worker and Weekly Planner asset metadata are bumped to `101.1`.

Deploy the Worker/backend first and the frontend second. No spreadsheet,
Apps Script, Worker binding or Cloudflare-setting change is required.

---

V101

# Stable large-screen Weekly Planner editing

- Mobile Weekly Planner editing is unchanged: tap one preview day, edit it in
  the focused dialog, save, then move to the next day.
- Tablet and desktop now use a permanent inline editor instead of expanding the
  mobile dialog into four cards.
- All four day cards remain visible. Each card shows its date and synchronized
  group selector in its header and has its own Save button.
- A day Save submits the complete four-day planner so the other three days are
  preserved, but it does not rebuild the inline editor, close it, change mode,
  move focus, or jump the page.
- Weekly Feedback is also editable and saveable in the large-screen workspace.
- Submitted and downloaded PNG files now use the authenticated teacher, week
  commencing date and actual submission date, for example:
  `MI-Hajira - 10 Aug - submitted 8 Aug.png`.
- Weekly Planner JavaScript/CSS cache versions and application/Worker metadata
  are bumped to `101`.

Deploy the Worker/backend first and the frontend second. No spreadsheet,
Apps Script or Cloudflare-setting change is required.

---

V100.10.5

# Safer oversight disclosures and readable mobile details

- `ADMIN` and `SENIOR` subject/module headings are no longer Zoom links. Tapping
  the heading or adjacent chevron can only open or close its assignment details.
- Every session link is presented as a separate underlined `Zoom` action inside
  its exact group/teacher row, preventing accidental meeting launches.
- Active Admin/Senior timetable text now uses the normal dark text colour,
  including `Zoom`; other-teacher/muted content uses the existing light grey.
  No third link colour or grey background shading is used.
- The inline disclosure gap is increased to separate the title and chevron.
- Admin/Senior mobile group, teacher and Zoom text is enlarged to a responsive
  `0.82rem`–`0.94rem` range with increased line height and row spacing.
- Student and `TEACHER` subject Zoom behaviour remains unchanged because those
  accounts receive their own filtered timetable.
- Timetable cache namespace is bumped to `v8`; release, JavaScript and CSS asset
  versions are bumped to `100.10.5`.

Deploy the Worker/backend first and the frontend second. No spreadsheet,
Apps Script or Cloudflare-setting change is required.

---

V100.10.4

# Responsive oversight days and subject-module rows

- Timetable rows are now grouped by `Subject + ModuleName`. A session can
  therefore show separate compact rows such as `Quran`, `Quran Part-1` and
  `Quran Part-2`.
- The module number remains available for stable ordering but is not displayed.
  Subject-only rows sort before that subject's modules.
- Inline disclosure chevrons now sit beside the subject/module title. Opening a
  disclosure reveals the matching groups, teachers and exact per-assignment
  Zoom actions.
- `ADMIN` and `SENIOR` accounts use a day-by-day layout below `900px`. Each day
  is a horizontally swipeable panel and its session list follows the page's
  normal vertical scroll.
- At `900px` and above, `ADMIN` and `SENIOR` retain the complete weekly grid
  with the same compact subject/module disclosures.
- Students and `TEACHER` accounts retain their filtered weekly grid at every
  screen size. A single-group student sees the subject/module title and teacher
  directly without a redundant group label or dropdown.
- Multiple subjects at one time render as separate rows in both layouts.
- Other-teacher sessions retain the normal background and use light-grey text
  only.
- The timetable cache namespace is bumped to `v7`; release, JavaScript and CSS
  asset versions are bumped to `100.10.4`.

Deploy the Worker/backend first and the frontend second. No spreadsheet,
Apps Script or Cloudflare-setting change is required. Do not delete the legacy
`TimeTable` sheet yet because it still owns the global Zoom link.

---

V100.10.3

# Module-name-only display and unambiguous Zoom routing

- Timetable assignment rows now show only the module name. For example,
  `Group 4 · Part-1` replaces `Group 4 · Module 1: Part-1`.
- A normal student with one applicable group sees the module name and teacher
  directly on the card, without a redundant group dropdown or group label.
- Group disclosures are reserved for subject slots containing assignments for
  more than one group. Group 0 and oversight views can therefore inspect each
  applicable teacher/link without crowding the timetable.
- Sessions taught by another teacher retain the normal card background and use
  light-grey text only; no grey background shading is applied.
- ModuleID and ModuleNo remain available in the API for stable identity and
  sorting, but the module number is not rendered.
- A visible subject slot with one shared non-empty Zoom link keeps the subject
  clickable.
- If the grouped TeacherAssign rows contain different links, the subject is
  deliberately not clickable. Each linked group/module row opens its own exact
  Zoom meeting from inside the disclosure.
- A blank link remains non-clickable and cannot inherit another group's link.
- Teacher-only filtering means a TEACHER viewing one assigned row can still
  open that row's link directly from the subject.
- Timetable cache namespace is bumped to `v6`, and release/JavaScript asset
  versions are bumped to `100.10.3`.

Deploy the Worker/backend first and the frontend second. No spreadsheet,
Apps Script or Cloudflare setting change is required.

---

V100.10.2

# Module-aware timetable and shared compact disclosure layout

- `TeacherAssign.ModuleID` is now optional. A blank value means the teacher is
  teaching the whole subject; a populated value means the teacher is teaching
  that module from the subject.
- Module identity and display data are resolved through
  `ModuleList.ModuleID`. Canonical module names and `Sort Order` values are
  returned as `ModuleName` and `ModuleNo` in the timetable response.
- Missing, inactive or subject-mismatched module IDs do not break the board.
  The subject remains visible without an unverified module label and the API
  returns a diagnostic warning.
- Numbered-group sessions now display the subject once with a compact,
  collapsed group disclosure. Opening it shows the group, optional module and
  teacher rows. This same interaction is used on mobile and desktop.
- `GroupNo = ALL` sessions show the subject and teacher directly. The redundant
  `All groups` label is no longer displayed.
- Session-specific `TeacherAssign.ZoomLink` values remain supported. A shared
  link opens from the subject; differing links remain attached to their exact
  group/module row.
- Existing role rules remain intact: `TEACHER` sees only its own timetable;
  `ADMIN` and `SENIOR` retain oversight access; other-teacher text remains
  explicitly light grey for an admin who also teaches.
- Timetable cache namespace is bumped to `v5`, and release/asset versions are
  bumped to `100.10.2`.

The audited TeacherAssign export contains 36 sessions, four valid module
assignments after `TA002.ModuleID` was cleared, and four session Zoom links.
`CourseID` remains an optional supported field for the later CourseList phase;
the current `CoureName` header remains supported.

Deploy the Worker/backend first and the frontend second. `ModuleList` must
remain present. No Apps Script deployment or Worker-setting change is needed.
Do not delete the legacy `TimeTable` yet because it still owns the global Zoom
link during verification.

---

V100.10.1

# Teacher-only timetable scope and compact assignment grid

- `TEACHER` accounts see only sessions assigned to their authenticated
  `AdminID`, regardless of request-body group or teacher filters.
- `ADMIN` and `SENIOR` retain the complete oversight timetable.
- A subject shared by several groups is displayed once, with compact
  `Group — Teacher` rows beneath it in group-number order.
- Shared Zoom links remain on the subject. Different per-group Zoom links move
  safely to their matching group row.
- Greyed timetable text is now explicitly light grey.
- Cache and frontend asset versions are bumped for immediate delivery.

Deploy the Worker/backend before the frontend. No workbook, Apps Script or
Worker-setting change is required.

---

V100.10

# Teacher-aware TeacherAssign timetable

V100.10 makes `TeacherAssign` the displayed timetable source while retaining
the legacy `TimeTable` only for the existing global Zoom link during the
verification period.

## Student timetable

- Students receive `TeacherAssign` sessions for their authenticated group plus
  rows explicitly marked `ALL`.
- Active Student Group 0 retains its V100.8 all-groups access and receives every
  active timetable group without collapsing same-time group sessions.
- Every session displays the teacher name resolved from
  `TeacherAssign.AssignedTeacher -> AdminRecords.AdminID`.
- A populated `TeacherAssign.ZoomLink` is session-specific. The subject becomes
  clickable and opens that session's Zoom meeting in a new tab.
- The existing global Join Zoom action remains separate and continues reading
  the legacy `TimeTable` link during V100.10 verification.

## Admin timetable

- Admin, Senior and Teacher portal users receive the complete relevant board.
- If the logged-in `AdminID` has at least one visible `TeacherAssign` session,
  their own sessions remain fully active and other teachers' sessions are
  greyed while remaining readable.
- An admin with no `TeacherAssign` rows is treated as oversight-only and sees
  every session normally, as agreed.
- Teacher matching never uses displayed names, roles or
  `AdminRecords.AssignedGroup`.

## Data safety

- Subject names are canonicalised through `SubjectList.SubjectID`; this safely
  resolves the workbook's `SUBJ8` Akhlaq/Akhlaaq spelling difference.
- Missing or inactive teacher records show `Teacher not assigned` instead of
  silently selecting another teacher.
- If an optional `Active`/`Status` column is later added to `TeacherAssign`,
  inactive rows are excluded. With the current workbook's absent column, all
  existing rows are treated as active.
- Multiple active rows for the same course/group/subject/day/time are retained,
  flagged in the API response and labelled `Check assignment` in the UI.
- The current misspelled `CoureName` header remains supported. `CourseID` is
  also supported when Phase 2 introduces a stable course table.

## Workbook audit

The supplied workbook contains 36 `TeacherAssign` sessions covering 12 base
slots and Groups 1-4 plus `ALL`. Session IDs and logical assignment keys are
unique; all teacher IDs resolve to active Admin records; all subject IDs
resolve; and each numbered group receives 12 sessions. No workbook changes
were required for V100.10.

## Cache and deployment

- Timetable cache namespace bumped from `v2` to `v3`.
- Frontend asset versions bumped to `100.10`.
- Deploy the Worker/backend first and the frontend second.
- Do not delete `TimeTable` yet. It still owns the global Zoom link during this
  verification release. Its session rows are no longer the displayed timetable.
- No Apps Script deployment or new Worker setting is required.

---

V100.9

# Separate student registration and task assignment

Student registration now creates the account and personal login link without
assigning curriculum tasks. Student Records includes a separate **Assign
Tasks** tab where an Admin or Senior can select a registered active student and
then choose all active tasks or particular subjects and modules.

Before writing, the Worker checks every selected `(StudentID, TaskID)` pair
already present in `StudentTasks`. Duplicate assignments are skipped, and a
duplicate-only retry does not reserve new IDs or append rows.

Group 0 students no longer receive tasks merely because they were registered.
They may still be assigned tasks deliberately through the manual assignment
screen. No Google Sheets schema or Apps Script deployment is required.

Deploy the Worker/backend first and the Admin frontend second.

---

V100.8

# Active Student Group 0 sees ALL groups

An active student assigned `ClassGroup = 0` can now view the complete
timetable and all active Library resources. Direct access to protected Google
Drive resources enforces the same rule, so catalogue visibility and file
authorization remain aligned.

The Admin student-management UI displays this assignment as `ALL (Group 0)`.
Only an ADMIN can newly grant it. Attendance and Progress continue to exclude
Group 0 students as agreed.

Content records continue to use `ALL` for a global audience. Group 0 does not
replace `ALL` in TimeTable rows, Resource rows, or AdminRecords teacher
assignments.

Deploy the Worker/backend first and the frontend second. No Apps Script or
Google Sheets schema deployment is required.

All 26 tests present in the supplied repository pass. Its existing
`test:pdfjs-annotations` package entry references a test file absent from the
supplied V100.7.2 archive; this unrelated baseline omission remains unchanged.

---

V100.7.2

# Highlighted Admin Home tile

The Admin landing page now has separate Home and Admin Home tiles. Home returns
to the main app Home, while Admin Home represents the current Admin landing page
and uses the same lavender active-state highlight as the main app Home tile.

The six Admin tiles display in one row on medium and large screens. This
frontend-only package is cumulative from V100.6 and supersedes V100.7 and
V100.7.1.

---

V100.7.1

# Admin Home tile and x-close navigation

The Admin landing page now includes a Home tile for returning to the main app
Home. Top-level Back controls in Student Records, Admin Records, Resources,
System Settings and Zoom Link are now x-close icons that return directly to the
Admin tile landing page. Internal form navigation such as Back to List is
unchanged.

The System Settings tile now uses the supplied monitor-and-cog SVG artwork.

This frontend-only package is cumulative from V100.6 and supersedes V100.7.

---

V100.7

# Admin menu tile landing page

The Admin navigation item now opens a four-tile landing page using the same
app-icon card style as the main Home page:

- Student Records
- Admin Records
- Resources
- System Settings

System Settings opens a smaller submenu containing Zoom Link and the existing
System Settings form. Admin-only controls retain their current visibility and
Worker-side authorization rules.

This is a frontend-only release. Deploy the files listed in
`CHANGED-FILES.txt`; no Worker or Apps Script deployment is required.

## Validation

- Admin menu integration regression test added.
- JavaScript syntax and package JSON checks pass.
- Existing Admin management UI test updated for the new stylesheet cache key.

---

V100.6

# Worker Settings become the environment source of truth

V100.6 removes development/production application values from `backend/wrangler.jsonc`. Cloudflare Worker **Variables and Secrets** now own environment-specific configuration. Wrangler retains only deployment/infrastructure bindings.

## Why

The previous arrangement duplicated several live Worker settings in `wrangler.jsonc`. That made it possible for repository values and dashboard values to drift or for a deployment to reintroduce an outdated URL/ID. V100.6 gives each concern one owner:

- Worker code: application behaviour and fixed backend ownership.
- Cloudflare Worker Settings: environment-specific application configuration.
- `wrangler.jsonc`: Worker infrastructure/bindings.
- `GOOGLE_SERVICE_ACCOUNT_JSON`: Google authentication credential.

## Values removed from wrangler.jsonc

Both production and development Wrangler `vars` blocks are removed. The following belong in Cloudflare Worker Settings instead:

- `APPS_SCRIPT_URL`
- `GOOGLE_SPREADSHEET_ID`
- `M4L_DRIVE_ACCESS_TTL_SECONDS`
- `M4L_GOOGLE_DRIVE_ROOT_FOLDER_ID`
- `M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL` (new)
- `M4L_STUDENT_LOGIN_BASE`
- `M4L_REQUIRE_CREDENTIAL_BOUND_SESSIONS`

Secrets already remain dashboard-owned:

- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `PIN_SECRET`
- `SESSION_SECRET`

`M4L_BACKEND_ROUTING_LOGS` may remain as an optional dashboard logging toggle.

## New service-account email guard

Add this **Text** variable separately to development and production Workers:

`M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL`

It is the human-readable expected Google service-account identity. The actual credential still comes from `GOOGLE_SERVICE_ACCOUNT_JSON`, but once the email variable is configured the Worker verifies that it matches `GOOGLE_SERVICE_ACCOUNT_JSON.client_email` before obtaining Google Sheets or Drive access.

This gives operators a visible account identity in Worker Settings without exposing the JSON secret and prevents an accidentally replaced credential from silently using the wrong Google account.

For a safe rollout, missing `M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL` does not break Google access. Admin routing diagnostics report `missing-expected-email` until it is configured. Once present, a mismatch is rejected.

## Diagnostics

`GET /api/admin/backend-routing` now also returns:

```text
googleServiceAccount.valid
googleServiceAccount.status
googleServiceAccount.expectedEmail
googleServiceAccount.credentialEmail
googleServiceAccount.match
googleServiceAccount.workerVariable
googleServiceAccount.credentialSource
```

Expected completed configuration:

```text
valid: true
status: "ok"
match: true
```

The endpoint is ADMIN-authenticated and never returns the private key or credential JSON.

## Bindings that remain in Wrangler

- `MEDIA_BUCKET` R2 binding.
- `AUTH_LOGIN_RATE_LIMITER` production/development bindings.
- Worker names, entry point, compatibility date and environment structure.
- `keep_vars: true` remains enabled, and deployment scripts continue using `--keep-vars`.

## Recommended deployment order

1. Confirm the existing development and production Worker Settings still contain the required values listed in `backend/WORKER-SETTINGS.md`.
2. Deploy V100.6 to development first.
3. Confirm Worker `/` reports version `100.6`.
4. Run Admin backend-routing diagnostics. Before adding the new email variable, `googleServiceAccount.status` should be `missing-expected-email` and `credentialEmail` will show the credential's service-account email.
5. Add `M4L_GOOGLE_SERVICE_ACCOUNT_EMAIL` as a Text variable using that exact email.
6. Rerun diagnostics; require `status: "ok"` and `match: true`.
7. Verify Admin/Student login, Library browse/open, and Weekly Planner PNG Drive save.
8. Repeat for production.

Because all pre-existing application values are already stored in Worker Settings, removing them from Wrangler does not require changing their values; V100.6 only changes ownership.

## Validation

- JavaScript syntax checks passed for all changed source/test files.
- `wrangler.jsonc` parses successfully as JSON.
- Full backend regression suite: **24/24 test files passed**.
- Wrangler CLI dry-run was not run because a local Wrangler executable is not installed in the working environment.
