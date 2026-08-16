# Maktabhelper

Current development release: V102.6.3 PIN-retry correction.

V102.6.3 is applied over deployed V102.6.2. It preserves the login form reference
before the asynchronous account request so a rejected PIN can reliably re-enable
the controls. The field clears, receives focus and accepts the next attempt
without a page reload.

V102.6.2 menu visibility and the display-only `SENIOR TEACHER` label remain
active. Stored Sheet values, tokens, API permission checks and role constants
remain `SENIOR`.

V102.6.3 makes no Platform Sheet header, course Sheet, Worker variable, secret,
binding or Apps Script change. `PlatformConfig!B3` remains `102.0.4`, deployment
does not change `PlatformConfig!B4`, and central account migration must not be
rerun. The approved browser-session authentication policy remains documented
but inactive.

Start installation with the root-level `UPDATE-TODO.md`. Apply
`Rebootyourmaktab-V102.6.3-GITHUB-UPDATE-FROM-V102.6.2.zip` directly over the
deployed V102.6.2 development repository. A full repository upload is not
required.

Production remains stable at V101.1. It must not receive this development-only
incremental package; production will receive a separate, rehearsed merge after
the V102 development programme is complete.
