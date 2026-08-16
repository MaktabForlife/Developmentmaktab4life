# Maktabhelper

Current development release: V102.8.1 Library, Profile and PDF corrections.

V102.8.1 corrects the V102.8 unified Library without beginning the timetable
integrator. An account with course access and active global-subject
subscriptions now sees both its course/role contexts and one **Global
Subjects — STUDENT** context in Profile. Switching remains centrally validated,
issues a new scoped token and does not require another PIN.

The Library source filters—**All**, every authorised active course, and
**Global Subjects**—are displayed together as one segmented pill. Selecting a
segment filters the Library only; it does not switch the operational context.
Students can use the existing protected two-PDF split view on screens at least
1024px wide, and the PDF shelf selector now appears immediately before the PDF
title for all roles.

Platform schema remains `102.0.4`. V102.8.1 adds no Sheet tab/header, migration,
Worker variable, secret, binding, Apps Script or course Sheet change. Account
migration must not be rerun. Current browser-session persistence is unchanged.

Start installation with `UPDATE-TODO.md`. Apply
`Rebootyourmaktab-V102.8.1-GITHUB-UPDATE-FROM-V102.8.zip` directly over the
deployed V102.8 development repository. It is a modified-files overlay; a full
repository upload is not required.

Production remains stable at V101.1 and must not receive this development-only
overlay. A separate production merge plan will be prepared after V102
development is complete.
