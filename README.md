# Maktabhelper

Current development release: V102.6 global curriculum and subscription
management.

V102.6 builds on the verified V102.5 ten-tab Platform schema. A centrally
authenticated `ADMIN` or `GLOBAL_ADMIN` can now open **Admin Home → Global
Curriculum** to add or modify central global subjects, modules, tasks and
resources, and to activate or deactivate direct account-to-global-subject
access.

Every change is authorised again by the Worker and recorded in
`PlatformAuditLog`. Global curriculum and resource changes automatically
increment `PlatformConfig!B4` (`GlobalCurriculumVersion`) so later learner
caches can be invalidated safely. Direct access changes do not change the
curriculum version.

V102.6 makes no Platform Sheet header, course Sheet, Worker variable, secret,
binding or Apps Script change. The Platform schema remains `102.0.4`; the
central account migration must not be rerun.

This release deliberately does not yet:

- deliver subscribed global subjects in the learner application;
- create a global-subject-only login context;
- connect billing, payments, renewals or expiry dates;
- apply timetable, course-combination or teacher-overlap restrictions;
- implement the approved browser-session authentication policy.

The future authentication policy is recorded in
`docs/V102-AUTHENTICATION-SESSION-POLICY.md` and does not change V102.6 login
behaviour.

Start installation with the root-level `UPDATE-TODO.md`. Apply
`Rebootyourmaktab-V102.6-GITHUB-UPDATE-FROM-V102.5.zip` directly over the
verified V102.5 development repository. A full repository upload is not
required.

Production remains stable at V101.1. It must not receive this development-only
incremental package; production will receive a separate, rehearsed merge after
the V102 development programme is complete.
