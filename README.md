# Maktabhelper

Current development release: V102.6.2 menu-visibility, PIN-retry and role-label
corrections.

V102.6.2 is applied over deployed V102.6.1. It fixes the CSS cascade that left
restricted Admin Home tiles visible to SENIOR and TEACHER. Those roles now see
only Home, Admin Home and Resources on that screen. The main Admin navigation
entry remains available because it is their authorized route to Resources.

The user-facing `SENIOR` label becomes `SENIOR TEACHER`. Stored Sheet values,
tokens, API permission checks and role constants remain `SENIOR` for backward
compatibility.

After an incorrect PIN on `/account/<uniqueid>`, the account login field is now
cleared and focused so the user can retry without reloading the page.

V102.6.2 makes no Platform Sheet header, course Sheet, Worker variable, secret,
binding or Apps Script change. `PlatformConfig!B3` remains `102.0.4`, deployment
does not change `PlatformConfig!B4`, and central account migration must not be
rerun. The approved browser-session authentication policy remains documented
but inactive.

Start installation with the root-level `UPDATE-TODO.md`. Apply
`Rebootyourmaktab-V102.6.2-GITHUB-UPDATE-FROM-V102.6.1.zip` directly over the
deployed V102.6.1 development repository. A full repository upload is not
required.

Production remains stable at V101.1. It must not receive this development-only
incremental package; production will receive a separate, rehearsed merge after
the V102 development programme is complete.
