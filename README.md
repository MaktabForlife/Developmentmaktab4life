# Maktabhelper

Current release: V102.1 development validation.

V102.1 adds an ADMIN-only live validator and a System Settings button for the
V102.0.2 Platform Sheet schema. It verifies all nine tabs, configuration,
registry IDs, central account uniqueness and course-access references without
returning Sheet IDs, identities or secrets. The underlying foundation retains
GlobalAdmin, membership-scoped Admin, course-level Senior and assigned-class
Teacher authorization rules. Existing application-data routes stay on the
V101.4.3 Reboot Sheet until central identities and context-scoped tokens are
implemented and verified.

See `RELEASE-NOTES.md` and `docs/V102-PLATFORM-SHEET-MIGRATION.md` before
configuring the new Platform Sheet.
