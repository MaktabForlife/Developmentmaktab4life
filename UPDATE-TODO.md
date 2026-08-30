# V103.1.0.3 UPDATE TODO

1. Apply this changed-files overlay to the complete deployed **V103.1.0.2** development repository.
2. Deploy Pages and Worker from the same commit.
3. Confirm Worker health reports `103.1.0.3`.
4. Hard-refresh Admin Global Curriculum so `/css/m4l-24-global-curriculum.css?v=103.1.0.3` and `/js/m4l-global-curriculum.js?v=103.1.0.3` are loaded.
5. Keep the Platform workbook unchanged: `PlatformConfig!B3 = 102.0.8`, 19 required Platform tabs.
6. No V103.1.0.3 Sheet migration is required. The controlled V103.1 Identity Links migration may remain pending.
7. Open Global Curriculum → Resources and verify the Resource list filters by Resource Name, Global Subject, Type, and Status.
8. Expand two or more existing Resources, edit them, and verify each dirty row/editor is highlighted and the larger Save icon turns purple.
9. Add more than one `+ Add a Global Resource` draft and select protected Drive files.
10. Press Save once and verify all dirty/new Resources are persisted together, the dirty highlighting clears, and the Save icon returns to its neutral disabled state.
11. Verify changing Subject refreshes the Module/Task branch and changing Module refreshes Task choices.
12. Verify an existing Resource can be set INACTIVE and remains in management/history while disappearing from active learner delivery as expected.
13. As GLOBAL_ADMIN, verify Change global folder remains separate. Confirm it refuses to run while Resource edits are pending and refuses a new root that does not contain every persisted Drive-backed Global Resource.
14. Smoke-check learner protected Drive opening, duplicate-file protection, FREE/paid Global Subject access, and existing Global Curriculum Subjects/Modules/Tasks screens.
