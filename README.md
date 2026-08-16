# Maktabhelper

Current development release: V102.8 unified multi-course and global Library.

V102.8 keeps one **Library** navigation item and adds an in-Library source
selector: **All**, each authorised active course, and **Global Subjects**.
Course catalogues are loaded from their registered course Sheets and filtered
using the account's matching course-local identity. Global content is limited to
active direct subscriptions. Selecting a Library source does not change the
operational course or role.

The Profile card now switches directly between authorised course/role contexts
without another PIN. Every switch is validated centrally, receives a new scoped
token and clears course-specific caches. A global-subject-only subscriber can
open a restricted Global Library workspace without course operational menus.

Platform schema remains `102.0.4`. V102.8 adds no Sheet tab/header, migration,
Worker variable, secret, binding or Apps Script change. Account migration must
not be rerun. Current browser-session persistence is unchanged.

Start installation with `UPDATE-TODO.md`. Apply
`Rebootyourmaktab-V102.8-GITHUB-UPDATE-FROM-V102.7.zip` directly over the
deployed V102.7 development repository. A full repository upload is not
required.

Production remains stable at V101.1 and must not receive this development-only
overlay. A separate production merge plan will be prepared after V102
development is complete.
