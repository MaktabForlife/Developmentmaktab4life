# Maktabhelper

Current development release: **V102.10 — global-subject access policy, access matrix and scheduled-run foundation**.

V102.10 is a modified-files overlay for the complete deployed V102.9.1 development source. Production remains stable at V101.1 and must not receive this development release.

## What V102.10 adds

- Global-subject access policies: `FREE` or `SUBSCRIPTION`.
- A new `GlobalSubjectAccessMatrix`: one row per central account and one column per global `SubjectID`.
- FREE access is implicit for every active central account; no per-user FREE rows are created.
- SUBSCRIPTION access reads the account's TRUE/FALSE matrix cell for that SubjectID.
- The legacy row-based `UserGlobalSubjectAccess` tab is retained unchanged for migration history and V102.9.1 rollback; V102.10 does not use it as the live entitlement source.
- Finite, repeatable global-subject runs with timezone-aware derived status.
- Library badges for access model and delivery state.
- Global Curriculum **Delivery** for policy/run management and an **Access Matrix** tab for current subscription access.
- Backend enforcement for the global Library, global-only account sessions and protected Global Resources Drive delivery.
- New global subjects automatically receive an active `SUBSCRIPTION` policy and a new matrix SubjectID column defaulted FALSE for existing accounts.
- Newly migrated central accounts automatically receive a matrix row defaulted FALSE across current subject columns.

V102.10 deliberately does **not** build the global timetable, timetable publication, academy timetable aggregation, Aalimiyah onboarding, billing, subscription expiry or cross-course conflict handling.

## Attendance hotfix carry-forward

V102.10 also preserves the Attendance reset hotfix already applied to production and the GitHub development branch. On successful attendance save, all loaded register rows reset to `Present` and the register rerenders; a failed save does not reset the marks. This carry-forward is included only to prevent a later V102.10 production merge from reverting the fix. Attendance permissions and backend submission semantics are otherwise unchanged.

## Platform migration

V102.10 advances the Platform schema from `102.0.4` to `102.0.5` and adds three central tabs:

- `GlobalSubjectAccessMatrix`
- `GlobalSubjectAccessPolicy`
- `GlobalSubjectRuns`

Start with `V102.10-PLATFORM-SHEET-MIGRATION.md` and complete `UPDATE-TODO.md` in order. The safe sequence is:

1. Back up the Platform Sheet.
2. Create all three additive tabs while `PlatformConfig!B3` remains `102.0.4`.
3. Populate the matrix from the existing `UserGlobalSubjectAccess` data and seed every existing global subject with an active `SUBSCRIPTION` policy.
4. Leave the legacy `UserGlobalSubjectAccess` tab unchanged.
5. Apply/push the complete V102.10 overlay as one GitHub commit.
6. Confirm Pages and Worker are both from that commit and Worker reports `102.10`.
7. Only then change `PlatformConfig!B3` to `102.0.5` and run Platform validation.

Rollback changes the schema marker back to `102.0.4` first and then reverts the single code commit. Because the legacy row-based entitlement table is not rewritten, V102.9.1 can use the pre-V102.10 entitlement state again.

## Package

- `Rebootyourmaktab-V102.10-GITHUB-UPDATE-FROM-V102.9.1.zip` — changed/new files only for the deployed V102.9.1 development repository.

The exact included/deleted paths are listed in `CHANGED-FILES.txt` and `DELETE-FILES.txt`.

The future academy timetable architecture is retained as `docs/V102.12-ACADEMY-TIMETABLE-PLAN.md`; it is documentation only in V102.10.
