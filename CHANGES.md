# V103.1.0.1 Changes

- Treats this release as a pre-existing Global Curriculum refinement on the V103.1 Central Identity baseline; no Central Identity authority cut-over is introduced.
- Removes the standalone **Modules** tab from Global Curriculum.
- Moves Global Module management into expandable inline editors beneath each Global Subject in the **Subjects** tab.
- Moves the Subject management previously shown at the top of **Course Scheduler** into the Subjects tab.
- Removes Course Scheduler's per-Subject Save actions.
- Adds inline editing for Global Subject name, FREE/PAID access policy and ACTIVE/INACTIVE status.
- Adds inline Module editing for order, Module name and ACTIVE/INACTIVE status.
- Adds `+ Add a Global Subject` and per-Subject `+ Add a module` actions.
- Adds one transparent Attendance-style Save action for the complete Subjects screen.
- Adds subtle unsaved-change highlighting for edited Subject rows, edited Module rows and Subjects containing edited Modules.
- Adds `/api/admin/platform/global/subjects/save-batch` for one-request, validate-first Subject + Module persistence.
- Rejects stale Subject-screen saves when `GlobalCurriculumVersion` changed after the screen was loaded.
- Creates new Subject access-policy rows and Access Matrix columns safely inside the same batch transaction.
- Keeps Course Scheduler responsible only for course/run and session scheduling using already-defined Subjects/Modules.
- Applies the newer white-card / soft-border / rounded-control responsive Global styling to the inline editor.
- Leaves the reported Academy timetable Thursday/scrolling refinements for a later timetable batch.
- Adds no Sheet migration; `PlatformConfig!B3 = 102.0.8` and 19 required Platform tabs remain unchanged.
- Leaves the V103.1 controlled Reboot Identity Links migration and all existing Reboot operational behaviour unchanged.
