# Apps Script to Google Sheets Migration Ledger

Last updated: 2026-07-28

Latest development-verified milestone before V98.5: V98.2

Development milestone: V98.5

The live Google Apps Script project is the source of truth for `code.gs`. The
repository copy is a reference snapshot only. Direct API migrations do not
remove or deploy live Apps Script functions unless that is explicitly stated.

This ledger records backend ownership at the operation level. Reads and writes
can migrate independently.

## Status definitions

- **DIRECT**: the Worker calls the Google Sheets API and owns the operation.
- **APPS SCRIPT**: the Worker calls an action in the live Apps Script project.
- **ACTIVE ROLLBACK**: the direct route is selected, while the matching Apps
  Script action remains available for an explicit routing rollback.
- **LEGACY ROLLBACK**: production has passed its direct-route verification and
  the retained Apps Script action is no longer the normal path.
- **DIRECT ONLY**: the operation was introduced on the direct Worker path and
  has no Apps Script implementation.

## Seamless promotion rule

Following the workflow we have now established, the development branch must
contain the complete production-ready configuration from the beginning.

For each migrated feature, its Google Sheets routing flag must be present in
both locations in `backend/wrangler.jsonc`:

1. top-level `vars`, used by the production Worker when `main` is deployed;
2. `env.development.vars`, used by `devrebootworker` during development tests.

The development deployment selects `--env development`, so it uses the
development spreadsheet and flags. The top-level production values remain
inactive until the same commit is merged into `main`. Production promotion is
therefore one normal branch merge: no individual file edits, Wrangler edits, or
Cloudflare dashboard variable changes are required at merge time.

## Current ownership and V98.5 target

| Area | Operation / Apps Script action | V98.5 development | Production after merge | Live Apps Script status |
|---|---|---:|---:|---|
| Resources | `getStudentResources` | DIRECT | DIRECT | LEGACY ROLLBACK |
| Timetable | `getTimetable` | DIRECT | DIRECT | LEGACY ROLLBACK |
| Timetable | `updateTimetableZoomLink` | DIRECT | DIRECT | LEGACY ROLLBACK |
| Weekly Planner | records and archives | DIRECT ONLY | DIRECT ONLY | Not present |
| Weekly Planner | save preview PNG to Drive | APPS SCRIPT | APPS SCRIPT | ACTIVE |
| Attendance | `getStudentsForAttendance`, `getAttendanceReport` | DIRECT | DIRECT | ACTIVE ROLLBACK |
| Attendance | `submitAbsentStudents` | DIRECT | DIRECT | ACTIVE ROLLBACK |
| Authentication | lookup, login, PIN setup and reset | APPS SCRIPT | APPS SCRIPT | ACTIVE |
| Progress | task reads, status updates, verification and reports | APPS SCRIPT | APPS SCRIPT | ACTIVE |
| Student management | `checkStudentDuplicate`, `searchStudents` | DIRECT | DIRECT | ACTIVE ROLLBACK |
| Student management | `registerStudent`, `updateStudent` | APPS SCRIPT | APPS SCRIPT | ACTIVE |
| Curriculum | `listSubjects`, `listTasks` | DIRECT | DIRECT | ACTIVE ROLLBACK |
| Curriculum | subject and task create/update | DIRECT | DIRECT | ACTIVE ROLLBACK |
| Curriculum resources | `listSubjectResources` | DIRECT | DIRECT | ACTIVE ROLLBACK |
| Curriculum resources | create/update | DIRECT | DIRECT | ACTIVE ROLLBACK |
| Task assignment | `getStudentAssignmentOptions` | DIRECT | DIRECT | ACTIVE ROLLBACK |
| Task assignment | `assignTasksToStudents` and population actions | APPS SCRIPT | APPS SCRIPT | ACTIVE |

## Migrated operations

### Resources read

- Worker implementation: `backend/src/routes/resources.js`
- Router feature: `resources`
- Routing variable: `M4L_BACKEND_RESOURCES=google-sheets`
- Legacy rollback action: `getStudentResources`
- Production verification: HTTP 200 with `X-M4L-Backend: google-sheets`.

### Timetable read

- Worker implementation: `backend/src/routes/timetable.js`
- Router feature: `timetable-read`
- Routing variable: `M4L_BACKEND_TIMETABLE_READ=google-sheets`
- Legacy rollback action: `getTimetable`
- Production verification: HTTP 200 with `X-M4L-Backend: google-sheets` and
  `X-M4L-Backend-Source: M4L_BACKEND_TIMETABLE_READ`.

### Timetable Zoom-link write

- Worker implementation: `backend/src/routes/timetable.js`
- Router feature: `timetable-write`
- Routing variable: `M4L_BACKEND_TIMETABLE_WRITE=google-sheets`
- Legacy rollback action: `updateTimetableZoomLink`
- Development verification: the Zoom link was written successfully through
  `devrebootworker`, with the build confirming the Google Sheets selection.
- The top-level and development Wrangler flags are both committed, allowing a
  normal merge to promote the same route to production.

### Attendance read

- Worker implementation: `backend/src/routes/attendance.js`
- Router feature: `attendance-read`
- Routes:
  - `/api/attendance/students`
  - `/api/attendance/report`
- Routing variable: `M4L_BACKEND_ATTENDANCE_READ=google-sheets`
- Active rollback actions:
  - `getStudentsForAttendance`
  - `getAttendanceReport`
- V98.2 preserves teacher group restrictions, active-student filtering,
  `SYSTEM1` maktab-day handling, duplicate absence de-duplication, group
  averages and attendance percentages.

### Attendance write

- Worker implementation: `backend/src/routes/attendance.js`
- Router feature: `attendance-write`
- Route: `/api/attendance/submit-absent`
- Routing variable: `M4L_BACKEND_ATTENDANCE_WRITE=google-sheets`
- Active rollback action: `submitAbsentStudents`
- V98.2 preserves required headers, existing and submitted duplicate checks,
  the South Africa timestamp, admin ID, absence rows and the mandatory
  `SYSTEM1` day-counter row.

### Curriculum read

- Worker implementation: `backend/src/routes/curriculum.js`
- Router feature: `curriculum-read`
- Routes:
  - `/api/admin/subjects/list`
  - `/api/admin/tasks/list`
- Routing variable: `M4L_BACKEND_CURRICULUM_READ=google-sheets`
- Active rollback actions:
  - `listSubjects`
  - `listTasks`
- Subject and task create/update routes use the separate `curriculum-write`
  feature documented below.

### Curriculum write

- Worker implementation: `backend/src/routes/curriculum.js`
- Router feature: `curriculum-write`
- Routes:
  - `/api/admin/subjects/create`
  - `/api/admin/subjects/update`
  - `/api/admin/tasks/create`
  - `/api/admin/tasks/update`
- Routing variable: `M4L_BACKEND_CURRICULUM_WRITE=google-sheets`
- Active rollback actions:
  - `createSubject`
  - `updateSubject`
  - `createTask`
  - `updateTask`
- V98.4 preserves the `SystemConfig` counters and the existing `SUBJ` and
  `TASK` identifiers, duplicate-name checks, positional row schemas and Apps
  Script response contracts.

### Curriculum-resource read

- Worker implementation: `backend/src/routes/curriculum.js`
- Router feature: `curriculum-resources-read`
- Route: `/api/admin/subject-resources/list`
- Routing variable:
  `M4L_BACKEND_CURRICULUM_RESOURCES_READ=google-sheets`
- Active rollback action: `listSubjectResources`
- Curriculum-resource create/update routes use the separate
  `curriculum-resources-write` feature documented below.

### Curriculum-resource write

- Worker implementation: `backend/src/routes/curriculum.js`
- Router feature: `curriculum-resources-write`
- Routes:
  - `/api/admin/subject-resources/create`
  - `/api/admin/subject-resources/update`
- Routing variable:
  `M4L_BACKEND_CURRICULUM_RESOURCES_WRITE=google-sheets`
- Active rollback actions:
  - `createSubjectResource`
  - `updateSubjectResource`
- V98.4 preserves the `NextResourceNumber` counter, `RES` identifiers,
  allowed resource types and the existing `SubjectResources` row schema.

### Student-management read

- Worker implementation: `backend/src/routes/student-management.js`
- Router feature: `student-management-read`
- Routes:
  - `/api/admin/check-student-duplicate`
  - `/api/admin/students/search`
  - `/api/admin/search-students`
  - `/api/admin/student/search`
- Routing variable:
  `M4L_BACKEND_STUDENT_MANAGEMENT_READ=google-sheets`
- Active rollback actions:
  - `checkStudentDuplicate`
  - `searchStudents`
- V98.5 preserves normalized duplicate matching, suggested usernames, search
  aliases, WhatsApp matching, `SYSTEM1` exclusion, group/name sorting and
  result limits. PIN hashes and other authentication fields are never returned.
- Student registration and updates remain on the separate
  `student-management-write` Apps Script feature.

### Task-assignment options read

- Worker implementation: `backend/src/routes/student-management.js`
- Router feature: `task-assignment-read`
- Route: `/api/admin/students/assignment-options`
- Routing variable: `M4L_BACKEND_TASK_ASSIGNMENT_READ=google-sheets`
- Active rollback action: `getStudentAssignmentOptions`
- V98.5 reads `SubjectList`, optional `ModuleList`, and `TaskList` directly,
  preserving active filtering, General-module fallback, task counts and sort
  order.
- Task assignment writes remain on the separate `task-assignment-write` Apps
  Script feature and do not read or modify `StudentTasks` in V98.5.

### Weekly Planner

- Worker implementation: `backend/src/routes/weekly-planner.js`
- Router feature: `weekly-planner`
- Records and archives: direct Google Sheets only
- Preview PNG submission: Apps Script by design because it uses Google Drive
- No Planner record action was migrated from Apps Script.

## Change history

### 2026-07-28 — V98.5

- Added direct Google Sheets handlers for student duplicate checking, student
  search and assignment-option loading.
- Split Student Management into independent read and write routing features.
- Split Task Assignment into independent read and write routing features.
- Added `M4L_BACKEND_STUDENT_MANAGEMENT_READ=google-sheets` and
  `M4L_BACKEND_TASK_ASSIGNMENT_READ=google-sheets` to both top-level production
  variables and the development environment.
- Added environment-specific `M4L_STUDENT_LOGIN_BASE` values so search results
  retain the correct production or development student link.
- Kept student registration, student updates and task-assignment writes on Apps
  Script, with no direct access to `StudentTasks` in this migration.
- Retained all three live Apps Script read actions as rollback paths.
- Added automated tests for transformation parity, search aliases, duplicate
  suggestions, sensitive-field exclusion, authorization, routing headers,
  missing sheets, Apps Script fallback and write isolation.

### 2026-07-28 — V98.4

- Added direct Google Sheets create/update handlers for Subjects, Tasks and
  Subject Resources.
- Enabled both Apps Script and Google Sheets handlers for `curriculum-write`
  and `curriculum-resources-write`.
- Added `M4L_BACKEND_CURRICULUM_WRITE=google-sheets` and
  `M4L_BACKEND_CURRICULUM_RESOURCES_WRITE=google-sheets` to both top-level
  production variables and the development environment.
- Retained all six live Apps Script write actions as rollback paths.
- Preserved the existing `SystemConfig` counters, ID prefixes, validation,
  duplicate detection, row order and response shapes.
- Writes that update several fields are validated first and committed as one
  complete row update, avoiding a partially updated row when validation fails.
- Added automated tests for authorization, direct creates and updates, counter
  increments, appends, duplicate prevention, routing headers, validation and
  Apps Script fallback.

### 2026-07-28 — V98.3

- Added direct Google Sheets list handlers for Subjects, Tasks and Subject
  Resources.
- Split curriculum and curriculum-resource routing into independent read and
  write features.
- Kept all curriculum create/update operations on Apps Script.
- Added `M4L_BACKEND_CURRICULUM_READ=google-sheets` and
  `M4L_BACKEND_CURRICULUM_RESOURCES_READ=google-sheets` to both top-level
  production variables and the development environment.
- Retained `listSubjects`, `listTasks` and `listSubjectResources` in the live
  Apps Script project as rollback paths.
- Added automated tests for transformation parity, filtering, authorization,
  missing sheets, routing headers, Apps Script fallback and write isolation.

### 2026-07-28 — V98.2

- Added direct Google Sheets handlers for Attendance student lists, reports and
  absent-student submission.
- Split Attendance routing into `attendance-read` and `attendance-write` so
  reads and writes can be diagnosed or rolled back independently.
- Enabled both Apps Script and Google Sheets handlers for both routing features.
- Added `M4L_BACKEND_ATTENDANCE_READ=google-sheets` and
  `M4L_BACKEND_ATTENDANCE_WRITE=google-sheets` to both top-level production
  variables and the development environment in `backend/wrangler.jsonc`.
- Retained the live Apps Script Attendance actions as rollback paths.
- Added automated parity tests for filtering, authorization, reporting,
  duplicate protection, header creation, direct appends and Apps Script
  fallback routing.

### 2026-07-28 — V98.1

- Added the direct Google Sheets global Timetable Zoom-link write.
- Enabled dual Apps Script and Google Sheets handlers for `timetable-write`.
- Committed the routing flag in both top-level and development Wrangler
  variables so production promotion required only the branch merge.
- Verified the direct write in development.
- Retained `updateTimetableZoomLink` in Apps Script as rollback.

### 2026-07-20 — V97.1.3

- Activated direct timetable reads in production.
- Verified production routing, Apps Script connectivity, Resources, timetable
  reads and Weekly Planner with five HTTP 200 checks.

### 2026-07-20 — V97.1.2

- Made Wrangler the source of truth for environment-specific plaintext
  configuration.
- Restored explicit production/development Apps Script URLs and spreadsheet IDs.
- Kept encrypted service-account, PIN and session values in Cloudflare secrets.

### 2026-07-19 — V97

- Activated direct Resources reads.
- Retained `getStudentResources` as the rollback implementation.

## Required migration procedure

For every future operation:

1. Record reads and writes separately in this ledger.
2. Compare the direct implementation with the live Apps Script source of truth.
3. Add the direct Worker handler without removing the Apps Script handler.
4. Make the routing feature dual-backend and keep Apps Script as its code-level
   default for rollback safety.
5. In the same development commit, explicitly set the new Google Sheets routing
   flag in both top-level `vars` and `env.development.vars`.
6. Add automated parity, authorization, routing and error-path tests.
7. Deploy development with `npm run deploy:development`, which selects
   `--env development`.
8. Confirm the Cloudflare build lists the expected routing flag and the
   development spreadsheet ID.
9. Functionally test the direct route and confirm:
   - `X-M4L-Backend: google-sheets`
   - `X-M4L-Backend-Source` names the expected routing variable.
10. Merge development into `main` without editing any migration file or
    Cloudflare variable.
11. Wait for both Pages and Worker production deployments to finish, then test
    the same operation against production.
12. Mark the Apps Script action **LEGACY ROLLBACK** only after production passes.
13. Remove an Apps Script `doPost` action and function together only after its
    rollback path has been explicitly retired.

If rollback is required, change the affected routing flag to `apps-script` in a
tracked commit and keep development and production configurations synchronized.
