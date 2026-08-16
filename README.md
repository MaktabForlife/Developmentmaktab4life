# Maktabhelper

Current development release: V102.6.1 permission, Profile and Global Curriculum
UI corrections.

V102.6.1 is applied over deployed V102.6. It makes all five Global Curriculum
sections visible, reports global subjects separately from global-subject
subscriptions in Platform validation, and prevents inherited full-width button
styles from hiding the remaining tab controls.

SENIOR and TEACHER can add course resources. Existing-resource modification
remains ADMIN-only. Student Records are ADMIN-only and their tile is hidden from
SENIOR and TEACHER. Other inaccessible Admin Home controls are also hidden for
the active role; Worker authorization remains the security boundary.

The app menu now has one Profile control. Its card shows the account name,
courses, roles and current context and contains the course/role switch action.
The separate duplicate switch menu item is removed.

V102.6.1 makes no Platform Sheet header, course Sheet, Worker variable, secret,
binding or Apps Script change. `PlatformConfig!B3` remains `102.0.4`, deployment
does not change `PlatformConfig!B4`, and central account migration must not be
rerun. The approved browser-session authentication policy remains documented
but inactive.

Start installation with the root-level `UPDATE-TODO.md`. Apply
`Rebootyourmaktab-V102.6.1-GITHUB-UPDATE-FROM-V102.6.zip` directly over the
deployed V102.6 development repository. A full repository upload is not
required.

Production remains stable at V101.1. It must not receive this development-only
incremental package; production will receive a separate, rehearsed merge after
the V102 development programme is complete.
