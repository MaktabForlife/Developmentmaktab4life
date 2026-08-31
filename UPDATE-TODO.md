# V104.1 UPDATE TODO — Platform Batch Reads

1. Apply this changed-files overlay to the current V103.1.0.5 Development repo.
2. Deploy Pages and the Development Worker together.
3. Confirm Worker health reports `104.1`.
4. Confirm `PlatformConfig!B3` remains `102.0.9`; do **not** run a new Sheet migration.
5. Login through the central account flow and verify context selection remains unchanged.
6. Open Academy Home and swipe through the rolling seven-day timetable.
7. Verify Reboot + Global Course/Subject session visibility matches V103.1.0.5.
8. Verify FREE/PAID Course entitlement still behaves identically.
9. Smoke-test one attendance read/write, Progress, Weekly Planner and Resources; V104.1 does not intentionally alter those paths.
10. If Google API diagnostics/logging is available, confirm Academy Platform state is one `values:batchGet` rather than 13 individual Platform reads.

No V103.1 UI refinements are included in this release.
