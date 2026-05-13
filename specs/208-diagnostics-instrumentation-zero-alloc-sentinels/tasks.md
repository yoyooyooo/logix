# 208 Diagnostics and Instrumentation Zero-Alloc Sentinels Tasks

**Priority:** P1
**Depends On:** 203; can run in parallel with 204-207 if code ownership is coordinated

## Tasks

- [x] **T001 Define internal sentinel contract:** Create txnHotPathSentinels.ts or equivalent test-only helper; keep it internal and tree-shakeable/off by default.
- [x] **T001a Test first:** Add or update the focused failing guard/checklist for T001.
- [x] **T001b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T001c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T002 Write diagnostics-off guard:** Add a test that diagnostics=off leaves debugEventAllocCount at 0 during repeated dispatch.
- [x] **T002a Test first:** Add or update the focused failing guard/checklist for T002.
- [x] **T002b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T002c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T003 Write instrumentation-light guard:** Add a test that patch/snapshot object materialization counters stay 0 in instrumentation=light.
- [x] **T003a Test first:** Add or update the focused failing guard/checklist for T003.
- [x] **T003b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T003c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T004 Wire minimal counters:** Increment counters only at forbidden materialization points; avoid allocations to record the counter itself.
- [x] **T004a Test first:** Add or update the focused failing guard/checklist for T004.
- [x] **T004b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T004c Verify:** Run focused command(s) and record outcome in `handoff.md`.
- [x] **T005 Run off/light tests:** Run focused diagnostics and transaction tests; record any counter names in handoff.md.
- [x] **T005a Test first:** Add or update the focused failing guard/checklist for T005.
- [x] **T005b Implement:** Make the minimal scoped code/doc/script change.
- [x] **T005c Verify:** Run focused command(s) and record outcome in `handoff.md`.

## Completion Gate

- [x] diagnostics=off does not construct debug event payloads or phase trace objects.
- [x] instrumentation=light does not materialize patch/snapshot objects at call sites.
- [x] Sentinel counters are test/internal only or disabled by default; they do not become public API.
- [x] A guard fails if join/split roundtrips, rest-arg allocation, or P1 dirtyAll fallback reappears in covered hot paths.
