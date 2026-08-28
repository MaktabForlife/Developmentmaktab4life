# Maktabhelper

Current development release: **V102.11.1 — Global Course Scheduler, revisions and clearer Program terminology**.

V102.11.1 is a corrective workflow/UI release over the deployed V102.11 development baseline. It keeps the V102.10 FREE/PAID access architecture and the V102.11 exact-dated immutable publication model, while making Global Course setup match the way an administrator actually works.

## What V102.11.1 changes

- Combines the previous Global Curriculum **Delivery** and **Schedule** screens into one **Course Scheduler**.
- Lets an administrator set the Global Course name, start/end dates and weekly day/time pattern in the same workflow.
- Generates exact dated sessions from that date range and weekly pattern.
- Allows Teacher = `TBA` while a course is in DEVELOPMENT, but blocks publication until every scheduled session has a valid active central teacher.
- Locks a PUBLISHED course against direct edits until **Revise timetable** is selected.
- Adds explicit immutable revision workflow: revise in DEVELOPMENT, then **Publish revision** to create the next publication snapshot.
- Adds `CANCELLED` and linked `RESCHEDULED` session lifecycle states while keeping earlier published snapshots immutable.
- Renames the Global Curriculum access tab to **Global Access**, uses two table header rows (subject name, then `PAID`/`FREE`), and keeps saved paid entitlement ticks visible for FREE subjects.
- Removes the Global Curriculum technical status band, curriculum/timetable version display and explanatory access text from the UI. The underlying version counters remain active in the backend.
- Simplifies Global Course summaries to `Course | Scheduled dates | Sessions | Status`.
- Shows **Edit session** only after a session is selected.
- Removes the redundant inline Schedule Reload control; the standard header refresh now forces a fresh Course Scheduler read.
- Fixes the stale Schedule model that previously required logout/login before a newly created run appeared.
- Moves the fixed scheduling timezone out of Curriculum UI and into central Platform configuration/System Settings.
- Uses **Zoom link** in the UI; existing internal compatibility fields remain unchanged.
- Uses **Program Timetables**, **Programs & Times**, and **Switch program or role** as user-facing terminology while retaining internal `CourseID`, course routes and Sheet structures.
- Corrects browser cache-busters for the account, shell and Program Timetables modules so the new terminology/workflow is not hidden by stale browser assets.

## Platform migration

V102.11.1 advances Platform schema `102.0.6` → `102.0.7` and required Platform tabs from **17 to 18** by adding:

- `GlobalTimetableSessionLifecycle`

It also adds one central Platform configuration key:

- `PlatformTimezone = Africa/Johannesburg`

Follow `docs/V102.11.1-PLATFORM-SHEET-MIGRATION.md` and `UPDATE-TODO.md` exactly. Prepare the additive tab and config key while the schema marker remains `102.0.6`; deploy Pages and Worker from the same commit; only then change `PlatformSchemaVersion` to `102.0.7` and run Platform validation.

## Publication and lifecycle behavior

Existing V102.11 sessions and publications need no migration rows in the lifecycle tab. When no lifecycle row exists, they are treated as `SCHEDULED`.

A PUBLISHED Global Course is immutable. **Revise timetable** reopens its working schedule as DEVELOPMENT without changing the current publication. A later **Publish revision** appends a new publication. CANCELLED and RESCHEDULED occurrences are preserved in the newer publication so timetable history is not rewritten.

## Terminology boundary

The terminology change is presentation-only:

- Reboot Your Maktab / Aalimiyyah are presented as **Programs**.
- Their timetable builder is **Program Timetables**.
- A permanent central item is a **Global Subject**.
- A scheduled offering is presented as a **Global Course**.
- Global scheduling is **Course Scheduler**.

Internal fields such as `CourseID`, `RunID`, existing API routes and existing Sheet names are deliberately retained for compatibility.

## Scope boundary

V102.11.1 still does **not** deliver published Global Course sessions to the Student/Teacher Academy timetable. That remains the V102.12 delivery/integration layer. It also does not add billing/payment processing, subscription expiry, cross-Program conflict detection or Aalimiyyah onboarding.

## Existing fixes preserved

The Attendance successful-save reset carry-forward remains present: after a successful Attendance save, the loaded register resets to Present; failed saves keep the current marks.

## Package

Use the V102.11.1 changed-files overlay over the deployed V102.11 development repository. Exact included paths are listed in `CHANGED-FILES.txt`. V102.11.1 intentionally deletes no repository path.
