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
