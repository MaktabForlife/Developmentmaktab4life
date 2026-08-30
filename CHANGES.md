# V103.1.0.3 Changes

- Replaces the separate Global Resource edit form/list arrangement with a compact searchable Resource list and inline editors.
- Adds Resource Name, Global Subject, Type, and Status filters.
- Existing Resource rows expand directly beneath themselves for editing.
- Supports multiple simultaneous Resource edits and multiple unsaved new Resources.
- Adds `+ Add a Global Resource`.
- Uses one screen-level Save for all dirty/new Global Resources.
- Makes the Resources Save icon larger and changes it to a prominent purple dirty state whenever unsaved edits exist.
- Highlights edited/new Resource rows and editors until saved.
- Adds `/api/admin/platform/global/resources/save-batch` with stale-version protection and validate-before-write behaviour.
- Commits all valid Resource changes through one Google Sheets batch update and increments Global Curriculum version once.
- Keeps existing single-Resource endpoint for compatibility.
- Keeps Global Drive root changes separate and blocks a root change while Resource drafts are pending.
- Retains the existing root containment guard: changing the root does not move files and is rejected if saved Drive-backed Resources are outside the proposed new tree.
- Uses the refreshed Global/Academy white-card, soft-border, rounded-control responsive styling.
- Adds no Sheet migration and does not depend on the V103.1 controlled Identity Links migration.
