# Maktab4Life V103.1.0.3

V103.1.0.3 is a focused **Global Resources management UI** refinement applied on top of V103.1.0.2.

It does not advance the V103 Central Identity authority model and does not require the controlled V103.1 Identity Links migration to have been run.

## Global Resources inline editor

The Resources tab now uses a compact searchable list. Existing Resources expand inline beneath their summary row for editing, and multiple Resources can be changed before one screen-level Save.

The editor includes Drive file selection, display name, description, type, Global Subject, Module, Task, status, and derived format. New Resources are added with `+ Add a Global Resource`.

## One batch Save

Only dirty/new Resources are submitted. The Worker validates the complete set first and then writes all valid Resource changes in one Google Sheets batch update, increments `GlobalCurriculumVersion` once, and records one audit row per changed Resource.

A stale screen version is rejected rather than overwriting newer Global Curriculum changes.

The Save icon is intentionally larger on this screen. It remains neutral when there is nothing to save and turns purple / more prominent whenever unsaved edits exist.

## Global Resources folder

Changing the protected Google Drive root remains a separate GLOBAL_ADMIN operation. It does not move files. The existing guard still refuses a new root unless every saved Drive-backed Global Resource is already inside that folder tree.

Pending Resource edits must be saved or discarded before changing the root.

## Schema

No new Sheet migration is introduced:

- keep `PlatformConfig!B3 = 102.0.8`;
- keep **19 required Platform tabs**.

See `docs/V103.1.0.3-GLOBAL-RESOURCES-INLINE-BATCH-EDITOR.md` for details.

## Roadmap

- **V103** — Central Identity
- **V104** — Program Builder
- **V105** — Reboot migration into the generic Program architecture
