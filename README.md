# Maktab4Life V103.1.0.5

V103.1.0.5 replaces the Global Curriculum **Course Scheduler** with the redesigned **Courses** workspace.

This is a Course-management and publication refinement on the V103.1 Central Identity baseline. It does **not** advance central identity authority and the controlled V103.1 Reboot Identity Links migration may still remain pending.

## Courses workspace

The Courses tab now manages each Global Course in one place:

- Course Name
- Global Subject
- Type: `FIXED` / `ONGOING`
- date controls whose meaning follows Type
- Course AccessModel: `FREE` / `PAID`
- Status: `ACTIVE` / `INACTIVE`
- expandable recurring schedule
- direct Course publication
- optional detailed View/Edit Sessions

The old `Course Scheduler` label is removed.

## One Courses Save

Course metadata and recurring schedule changes are edited inline and retained as local drafts until the single Courses Save icon is used.

The Save icon uses the refreshed Academy/Global treatment and changes to the dirty/highlight state whenever Course or schedule edits are waiting to be saved.

Saving Course/schedule changes does **not** publish them. Existing published timetables stay live until Publish is explicitly used.

## FIXED and ONGOING dates

The same date positions intentionally have different meanings:

- **FIXED** — `Start Date` / `End Date` are written to the Course record and define the current fixed delivery period.
- **ONGOING** — the Course's stored StartDate/EndDate remain blank. The UI becomes `Publish From` / `Publish Through`; those dates define the dated session-generation/publication window rather than the lifetime of the Course.

A FIXED Course whose current End Date has passed is **not** automatically archived. The user may revise the dates/schedule and repeat the Course. Archive/Inactivate is always explicit.

## Course AccessModel

Every Course now has its own AccessModel:

- `FREE` — automatically accessible to every active central account.
- `PAID` — ordinary participant access is not automatic.

This is a property of the Course and is separate from the future unified per-user role matrix (`FALSE / ACCESS / TEACHER / SENIOR / ADMIN`).

During the V103.1.0.5 transition, PAID Course participant entitlement uses the existing explicit Global Subject access-matrix entitlement for the linked Subject. The unified per-Course role matrix is a V103.2+ Central Identity component.

## Schedule and sessions

Expanding Schedule beneath a Course provides recurring rows for:

- Days
- Start
- End
- Module
- Teacher (`TBA` remains valid)
- Zoom link

`+ Another Time Slot` adds another recurring schedule row.

`View/Edit Sessions` is optional. Admin can publish directly from the Course row after saving valid Course/schedule changes. The detailed session editor remains available for individual date/time/module/teacher/Zoom/status changes and provides:

- Cancel all changes
- Save without publishing
- Save & Publish

The session list is internally vertically scrollable. Academic Calendar context is informational: Holidays are shown in red and Islamic dates in green.

Publication is per Course, so multiple Global Courses can remain published at the same time.

## Explicit archive only

The Courses filter provides `Active / Archived / All`.

- `ACTIVE` Courses remain in the normal working list even when a FIXED delivery period has ended.
- `INACTIVE` is the explicit archive state and can be restored later.
- A new unsaved Course can be discarded locally.
- Saved historical Courses are not hard-deleted from this screen.

## Platform Sheet migration

V103.1.0.5 introduces a staged Platform Sheet migration without adding a tab:

- `GlobalSubjectRuns` gains `AccessModel` as its 14th column.
- `PlatformConfig!B3` advances from `102.0.8` to **`102.0.9`**.
- the Platform workbook remains at **19 required tabs**.

The V103.1.0.5 code can read the old 13-column Course table, but Course writes are blocked until a `GLOBAL_ADMIN` runs the one-time **Prepare Courses** migration from Global Curriculum → Courses. Existing Course access is previewed/backfilled to FREE/PAID without widening access.

See `docs/V103.1.0.5-COURSES.md` and `PRODUCTION-MIGRATION-V101.1.md`.

## Roadmap

- **V103** — Central Identity
- **V104** — Program Builder
- **V105** — Reboot migration into the generic Program architecture
