# Maktabhelper

Current release: V102.3 unified account verification.

V102.3 adds central account check, PIN setup/login, session restoration,
highest-authority context selection and fail-closed course/role switching at
`/account/<uniqueid>`. Central tokens are revalidated against UserAccounts,
UserCourseAccess and CourseRegistry on every request. They are intentionally
rejected by legacy application-data routes until dynamic course-Sheet routing
is implemented. Existing `/admin/<uniqueid>` and `/student/<uniqueid>` links
therefore remain the live operational entry points during this verification
release. No Platform Sheet header change is required after V102.2.

See `RELEASE-NOTES.md`, `docs/V102.3-UNIFIED-ACCOUNT-VERIFICATION.md` and
`docs/V102-PLATFORM-SHEET-MIGRATION.md` before deployment.
