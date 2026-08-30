# V103.1.0.1 Release Notes

V103.1.0.1 is a focused **pre-existing Global Curriculum UI refinement carried on the V103.1 baseline**. It does not advance the Central Identity authority model and does not depend on the V103.1 controlled Identity Links migration having been run.

## Global Subjects now own Module editing

The standalone **Modules** tab has been removed.

The **Subjects** tab is now the single curriculum-definition screen for:

- Global Subject name;
- access policy (`FREE` / `PAID`);
- Subject status;
- Module count;
- inline expandable Module editing;
- Module order;
- Module name;
- Module status;
- adding a new Global Subject;
- adding a new Module directly under its Subject.

The Module editor expands beneath the relevant Subject, so the Subject does not need to be selected again.

## One Save for the Subjects screen

Per-row Subject/Module Save controls are removed from this workflow.

Admins can make several Subject and Module edits and then use the single transparent Attendance-style **Save** action at the top of the screen.

Changed Subject rows, changed Module rows, and Subject rows containing changed Modules receive a subtle unsaved-change highlight. The highlight clears after a successful save.

The browser sends all changed Subjects and Modules to the Worker in **one batch request**. The Worker validates the complete batch before performing its one Google Sheets batch update. An invalid item prevents the batch from being committed.

A stale `GlobalCurriculumVersion` is rejected so an old browser view cannot silently overwrite newer curriculum edits.

## Course Scheduler separation

The Subject-management table has been removed from **Course Scheduler**.

Course Scheduler now consumes Subjects and Modules that were already defined in the Subjects tab. It remains responsible for course/run setup, weekly schedule generation, exact sessions, revisions and publication.

This makes the UI boundary explicit:

- **Subjects** = define curriculum;
- **Course Scheduler** = schedule delivery.

## Styling

The inline Subject/Module editor uses the newer refreshed Global/Academy styling:

- white cards;
- softer borders;
- rounded controls;
- compact spacing;
- transparent save treatment;
- responsive desktop/tablet/mobile reflow;
- subtle dirty-state highlighting.

## V103.1 Central Identity boundary

All V103.1 Identity Link functionality remains unchanged. Existing login, attendance, progress, planner, timetable, resources and management behaviour remain unchanged.

If the controlled V103.1 Identity Links migration has not yet been run, V103.1.0.1 can still be deployed first and the migration can be run later through the existing preview/commit flow.

## Sheet migration

There is **no new Sheet migration** in V103.1.0.1.

Keep the Platform workbook at:

- `PlatformConfig!B3 = 102.0.8`;
- **19 required Platform tabs**.

The optional/pending V103.1 Reboot `AccountID` Identity Links migration remains exactly as documented in `docs/V103.1-CENTRAL-IDENTITY-LINK.md`.

## Deferred timetable batch

The separately reported Academy Home Thursday/multi-session display and internal day-card scrolling refinements are intentionally **not included** in V103.1.0.1. They remain for the next timetable batch.
