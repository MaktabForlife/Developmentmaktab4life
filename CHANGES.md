# V102.12.3 Program workspace app-loader hotfix

- Restores `app.js` explicitly in the update overlay so Program workspaces cannot deploy without the shared startup/state module.
- Updates `index.html`, `admin/index.html`, and `student/index.html` from the stale `/app.js?v=102.4` asset key to `/app.js?v=102.12.3`.
- Adds an integration guard that fails if root `app.js` is missing or any Program portal points at the stale app-loader key.
- No Worker, Sheet, timetable, attendance, progress, planner, Library, permission, or Academy Home behavior changes.
