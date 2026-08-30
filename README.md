# Maktab4Life V103.1.0.1

V103.1.0.1 is a focused Global Curriculum refinement applied on top of **V103.1 — Identity Link**.

It deliberately separates curriculum definition from course scheduling:

- **Subjects** defines Global Subjects and their Modules;
- **Course Scheduler** schedules delivery of that existing curriculum.

## Subjects screen

The standalone Modules tab is removed. Each Global Subject can now be edited inline and expanded to reveal its Module editor.

The screen supports:

- Subject name;
- FREE / PAID access;
- Subject status;
- Module count/dropdown;
- Module order, name and status;
- adding Subjects and Modules;
- one screen-level Save.

Edited sections are highlighted until the batch save succeeds.

## Batch persistence

`/api/admin/platform/global/subjects/save-batch` accepts all changed Subjects and Modules in one Worker request. The Worker validates the complete change set and performs one Google Sheets batch update only after validation succeeds.

The request includes `GlobalCurriculumVersion`; stale screens are rejected and must reload before saving.

## Styling

The editor follows the newer Global/Academy visual language: white cards, soft borders, rounded controls, compact spacing, transparent Save action and responsive mobile reflow.

## V103.1 Identity Links

V103.1.0.1 does not require the controlled V103.1 Identity Links migration to have been run. That migration remains available under System Settings and can be performed later using the existing preview-first flow.

No existing login, attendance, progress, planner, timetable, resources or management behaviour is changed by this patch.

## Schema

No new Sheet migration is introduced:

- keep `PlatformConfig!B3 = 102.0.8`;
- keep **19 required Platform tabs**.

See `docs/V103.1.0.1-GLOBAL-CURRICULUM-INLINE-EDITOR.md` for implementation details and `docs/V103.1-CENTRAL-IDENTITY-LINK.md` for the separate V103.1 identity-link migration.

## Roadmap

- **V103** — Central Identity
- **V104** — Program Builder
- **V105** — Reboot migration into the generic Program architecture
