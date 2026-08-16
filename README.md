# Maktabhelper

Current release: V102.5 subscription access schema.

V102.5 keeps the verified V102.4 unified login and dynamic course routing
unchanged. It defines Student course subscriptions through the existing
`UserCourseAccess` table, adds direct global-subject access through
`UserGlobalSubjectAccess`, and adds central `GlobalResources` metadata for
standalone global curriculum. It does not create a duplicate general
`UserSubscriptions` table.

Subscriptions have no timetable limits, overlap checks or course-combination
checks. `TeacherScheduleIndex` is therefore removed from the required Platform
contract. Its existing live tab may remain during rollback verification, but
the V102.5 Worker no longer reads it.

Platform schema becomes `102.0.4`. V102.5 requires two new empty Platform tabs
and no account-migration rerun, course-Sheet change, Worker variable, secret,
binding or Apps Script deployment. Global-subject learner delivery, payment
integration and Admin subscription management remain later releases.

See `RELEASE-NOTES.md`, `docs/V102.5-SUBSCRIPTION-ACCESS-SCHEMA.md` and
`docs/V102-PLATFORM-SHEET-MIGRATION.md` before deployment.

Start every installation with the root-level `UPDATE-TODO.md`. Beginning with
V102.3, each release package includes this deployment and completion checklist.

For this GitHub-dashboard update, apply
`Rebootyourmaktab-V102.5-GITHUB-UPDATE-FROM-V102.4.zip` directly over the
verified V102.4 repository. A full repository upload is not required.

Development advances to V102.5. Production remains stable at V101.1 and must
not receive this development-only incremental ZIP; it will receive a separate
rehearsed merge package after the V102 programme is complete.
