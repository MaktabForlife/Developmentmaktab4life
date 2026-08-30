# V103.1.0.3 Release Notes

V103.1.0.3 modernises the **Global Resources** administration screen without changing student resource delivery or the V103 Central Identity migration state.

## Resource workflow

The Resources tab now behaves like the refreshed Subjects/Modules editor:

- filter the Resource list by name, Subject, type, or status;
- expand an existing Resource inline;
- edit Drive file, display name, description, type, Subject, Module, Task, status, and derived format;
- add one or more new Resources inline;
- make several changes before saving;
- press one Save icon to commit the complete dirty set.

Closing an existing inline editor only collapses it; pending edits remain in the browser and stay highlighted. Closing an unsaved new Resource discards that draft.

Existing Resources are not hard-deleted from this screen. Set Status to `INACTIVE` to preserve history/references.

## Save visibility

The screen-level Save action is larger than the normal passive icon treatment. With no pending changes it is neutral and disabled. As soon as any Resource becomes dirty/new, it turns purple and becomes more prominent until the batch save succeeds.

## Batch integrity

`/api/admin/platform/global/resources/save-batch`:

- rejects stale `GlobalCurriculumVersion` values;
- validates every submitted Resource before any Sheet mutation;
- checks curriculum relationships and active dependencies;
- validates protected Drive files against the configured Global Resources root;
- prevents duplicate Resource names within a curriculum branch;
- prevents duplicate Drive file registration;
- performs one Google Sheets batch update;
- increments Global Curriculum version once;
- writes audit rows for each changed Resource.

## Changing the global folder

The Global Resources root remains a separate GLOBAL_ADMIN operation. Changing it does not move files. The new folder is accepted only when every persisted Drive-backed Resource is already within the new tree. The UI also refuses a root change while there are unsaved Resource edits.

## Sheet migration

There is **no new Sheet migration**.

Keep `PlatformConfig!B3 = 102.0.8` and **19 required Platform tabs**. The V103.1 Identity Links controlled migration may still be pending.
