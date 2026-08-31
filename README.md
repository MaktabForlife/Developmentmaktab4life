# Maktab4Life V104.5.1

V104.5.1 refines the V104.5 Global Course scheduling workflow without changing the underlying DERIVED/EXPLICIT architecture.

## What changed

- Course names are shown as inline-editable coloured pills.
- Course actions use icon + text buttons: `Schedule`, `Sessions`/`Exceptions`, and a separate `Publish` action.
- Publish is visible only for saved, active, publishable unpublished/revised Courses.
- Clean published, inactive, unsaved-dirty and non-publishable Courses do not show Publish.
- Publishing exists only on the inline Course row.
- Sessions/Exceptions has a stronger outer card border and only `Cancel` + `Save` edit actions.
- EXPLICIT exact sessions support an optional short description up to 400 characters.
- Platform schema is `102.0.11`; tab count remains 19.

## Scheduling model retained

Course Type and Scheduling remain independent:

| Setting | Values |
| --- | --- |
| Course Type | `FIXED`, `ONGOING` |
| Scheduling | `DERIVED` (default for new Courses), `EXPLICIT` |

DERIVED normal occurrences remain virtual. Only occurrence-specific exceptions are materialised. EXPLICIT remains available for workshops/intensives where exact dated sessions should be prepared and published.

## Migration

V104.5.1 can migrate a Platform workbook directly from `102.0.9` to `102.0.11`, or upgrade an already-migrated V104.5 workbook from `102.0.10` to `102.0.11` without changing existing Course scheduling modes or publications.

Do not manually add the columns. Use **Global Curriculum → Courses → Prepare Scheduling**.

## Verification

Run:

```bash
cd backend
npm test
npm run test:v104.5-derived-courses
npm run test:v104.5.1-course-ui
npm run test:v104.4-read-audit
npm run test:request-read-dedup
```

See:

- `docs/V104.5-DERIVED-COURSE-SCHEDULING.md`
- `docs/V104.5.1-IMPLEMENTATION-CHECKLIST.md`
- `UPDATE-TODO.md`

## Roadmap

- V103 — Central Identity ✅
- V104.1–V104.4 — Google Sheets Read Optimisation ✅
- V104.5 — Derived-by-default Global Courses ✅
- V104.5.1 — Course publish/session UI refinement
- V105 — Program Builder
- V106 — Reboot Migration

Final V104.5.1 verification: **65/65 backend test files passed** and **157/157 repository JS/MJS files passed Node syntax checking**. V104.4 read budgets remain at 23 direct-read call sites across 17 files with 15 batch-read call sites.
