# Maktabhelper

Current release: V102.4 unified operational account routing.

V102.4 completes the next controlled cutover after V102.3. A migrated user can
sign in once at `/account/<uniqueid>` and is taken into the correct Admin or
Student course workspace without entering another PIN. Each operational API
request revalidates the central account context, resolves the authorised
CourseID through `CourseRegistry`, and uses that course's SpreadsheetID.
Submitted CourseIDs and role values never select the target Sheet.

The in-app Profile menu now provides **Switch course or role**. Course-specific
caches are cleared on a switch and include CourseID in their keys. Existing
`/admin/<uniqueid>` and `/student/<uniqueid>` logins remain available as a
rollback path in this release; their redirect retirement is a later cutover.
No Platform Sheet header, migration rerun, Worker variable, secret or Apps
Script deployment is required after V102.3.

See `RELEASE-NOTES.md`, `docs/V102.4-OPERATIONAL-ACCOUNT-ROUTING.md` and
`docs/V102-PLATFORM-SHEET-MIGRATION.md` before deployment.

Start every installation with the root-level `UPDATE-TODO.md`. Beginning with
V102.3, each release package includes this deployment and completion checklist.

For this GitHub-dashboard update, apply
`Rebootyourmaktab-V102.4-GITHUB-UPDATE-FROM-V102.3.zip` directly over the
reviewed V102.3 repository. A full repository upload is not required.
