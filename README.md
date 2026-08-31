# Maktab4Life V104.4

V104.4 completes the **Google Sheets Read Optimisation** phase on top of the completed V104.1 Platform batching, V104.2 Program batching and V104.3 request-level read deduplication layers.

## Final V104 read architecture

```text
Worker request
   ↓
private V104.3 request read context
   ↓
purpose-specific Platform / Program batchGet reads
   ↓
exact-range reuse + in-flight deduplication inside this request
   ↓
existing business/access logic
```

No Sheet-data cache persists across Worker requests. The existing service-account OAuth token cache remains separate.

## V104.4 measurement gate

Current guarded examples:

- Academy timetable: 4 Sheets requests for one published Program.
- Academy rolling seven-day load: the same 4-request budget.
- Attendance report: 1 batch request.
- Progress reads: 1 batch request per guarded operation.
- configured TeacherAssign timetable: 2 requests.

The source read-path guardrail is 23 direct-read call sites across 17 files with at least 15 batch-read call sites.

## Full regression

Run the complete backend regression suite with:

```bash
cd backend
npm test
```

The final V104.4 tree contains 63 backend test files. V104.3 request-deduplication remains part of that gate.

## Failure handling

Retryable Google Sheets GET responses (`429`, `500`, `502`, `503`, `504`) receive one retry maximum. Persistent failure is surfaced as an error and never interpreted as an empty authoritative table.

## Compatibility

No Sheet migration is required. Keep `PlatformConfig!B3 = 102.0.9` with 19 required Platform tabs.

V104.4 changes no roles, permissions, timetable rules, Attendance, Progress, Planner, Library, Course/global access, publication behaviour or data ownership.

## Roadmap

- V103 — Central Identity ✅
- V104 — Google Sheets Read Optimisation ✅ after V104.4 Development acceptance
- V105 — Program Builder
- V106 — Reboot Migration

See:

- `docs/V104.1-GOOGLE-SHEETS-READ-AUDIT.md`
- `docs/V104.1-PLATFORM-BATCH-READS.md`
- `docs/V104.2-PROGRAM-BATCH-READS.md`
- `docs/V104.3-REQUEST-READ-DEDUPLICATION.md`
- `docs/V104.4-READ-METRICS-AND-REGRESSION.md`
- `PRODUCTION-MIGRATION-V101.1.md`
