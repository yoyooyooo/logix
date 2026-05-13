# 198 ExternalStore Scheduler Lifecycle Closure Tasks

**Priority:** P1  
**Depends On:** 190, 196

## Tasks

- [x] **T001 Write dispose-cancel test:** Create a fake scheduler with controllable timeout/microtask and assert canceled flush does not run.
- [x] **T001a Test first:** Add or update a focused failing test/guard for T001.
- [x] **T001b Implement:** Make the minimal code/doc/script change.
- [x] **T001c Verify:** Run focused test(s) and record output.
- [x] **T002 Write urgent interleave test:** Simulate low-priority external write burst then urgent transaction; assert urgent mutation commits first or is not starved.
- [x] **T002a Test first:** Add or update a focused failing test/guard for T002.
- [x] **T002b Implement:** Make the minimal code/doc/script change.
- [x] **T002c Verify:** Run focused test(s) and record output.
- [x] **T003 Add coordinator close path:** Add internal close/dispose function or finalizer that flips `closed` and cancels scheduled work.
- [x] **T003a Test first:** Add or update a focused failing test/guard for T003.
- [x] **T003b Implement:** Make the minimal code/doc/script change.
- [x] **T003c Verify:** Run focused test(s) and record output.
- [x] **T004 Guard generations:** Ensure scheduledGeneration prevents stale delayed flush execution.
- [x] **T004a Test first:** Add or update a focused failing test/guard for T004.
- [x] **T004b Implement:** Make the minimal code/doc/script change.
- [x] **T004c Verify:** Run focused test(s) and record output.
- [x] **T005 Record structural counts in tests:** Use KernelHotPathAudit or local fake scheduler counts; do not emit Debug events.
- [x] **T005a Test first:** Add or update a focused failing test/guard for T005.
- [x] **T005b Implement:** Make the minimal code/doc/script change.
- [x] **T005c Verify:** Run focused test(s) and record output.
- [x] **T006 Run focused tests:** Run externalStore core and React lowPriority tests.
- [x] **T006a Test first:** Add or update a focused failing test/guard for T006.
- [x] **T006b Implement:** Make the minimal code/doc/script change.
- [x] **T006c Verify:** Run focused test(s) and record output.

## Completion Gate

- [x] Dispose-cancel test proves pending scheduled flush is not executed after unsubscribe/dispose.
- [x] Coalesce tests prove one transaction for same tick/window where expected.
- [x] Urgent interleave test proves urgent state write completes even under queued low-priority externalStore writes.
