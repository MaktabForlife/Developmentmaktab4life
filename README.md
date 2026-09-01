# Maktab4Life V104.5.3

V104.5.3 fixes the saved publication-window state for **ONGOING Global Courses**, especially DERIVED Courses.

## Why this release exists

In V104.5.2 an ONGOING Course could show Publish From/Through dates in the browser and be saved, while those dates were not stored authoritatively in the Platform workbook. After reload, a DERIVED Course could therefore show `Draft · 0 derived occurrences` and no Publish action even though its recurring rule and dates appeared valid.

V104.5.3 moves that draft publication window into `GlobalTimetableRunState`, so the same saved state drives:

- the Courses row after reload;
- derived occurrence counting;
- Exceptions;
- inline Publish eligibility;
- the actual publication request.

## Platform schema

Target schema: **102.0.12**. Platform tab count remains **19**.

`GlobalTimetableRunState` gains:

- `DraftPublishStartDate`
- `DraftPublishEndDate`

Use **Global Curriculum → Courses → Prepare Scheduling** after deploying V104.5.3. Do not add the columns manually. The controlled migration accepts `102.0.9`, `102.0.10` or `102.0.11` and preserves existing scheduling modes/publications. For an already-current V104.5.2 workbook, this is an incremental `102.0.11 → 102.0.12` upgrade.

Published ONGOING Courses are seeded from their current publication window. A previously unpublished ONGOING Course whose dates existed only in V104.5.2 browser memory must have Publish From/Through entered once and saved after migration.

## Exact regression case

The release includes the observed Hifz scenario:

```text
Course: Hifz
Type: ONGOING
Scheduling: DERIVED
Rule: Mon–Thu, 04h00–05h00
Draft window: 01-Sep-2026 → 01-Sep-2026

Expected after Save/reload:
Draft · 1 derived occurrence
Publish eligible
```

Publishing uses the authoritative saved window; a mismatching unsaved browser window is rejected. Both dates may be cleared together.

## Architecture retained

- DERIVED remains the default for new Courses.
- EXPLICIT remains available for exact workshop/intensive sessions.
- V104.5.1 inline-only publishing and SessionDescription behaviour remain unchanged.
- V104.5.2 schema-compatibility fix remains included.
- V104.3 request-local read deduplication and V104.4 Sheets read guardrails remain protected.

See `docs/V104.5.3-ONGOING-DRAFT-PUBLICATION-WINDOW.md` and `UPDATE-TODO.md`.
## Final verification

- Backend regression: **67/67 test files passed**.
- Repository JS/MJS syntax: **159/159 files passed**.
- V104.4 read audit: **23 direct-read call sites across 17 files; 15 batch-read call sites**.
- V104.3 request-level read deduplication: passed.

