# 194 DirtyPlan Converge Single Source Tasks

**Priority:** P0  
**Depends On:** 190, 191

## Tasks

- [x] **T001 Write legacy override failing test:** Add a test where dirtyPlan has one root but legacy dirtyPaths point elsewhere; expect dirtyPlan result.
- [x] **T001a Test first:** Add or update a focused failing test/guard for T001.
- [x] **T001b Implement:** Make the minimal code/doc/script change.
- [x] **T001c Verify:** Run focused test(s) and record output.
- [x] **T002 Create adapter module:** Move `dirtyRootIdsFromLegacyDirtyPaths` usage into `converge-legacy-dirty-adapter.ts`.
- [x] **T002a Test first:** Add or update a focused failing test/guard for T002.
- [x] **T002b Implement:** Make the minimal code/doc/script change.
- [x] **T002c Verify:** Run focused test(s) and record output.
- [x] **T003 Narrow request type:** Remove legacy fields from `ConvergePlanRequest`; keep request extension only in adapter type.
- [x] **T003a Test first:** Add or update a focused failing test/guard for T003.
- [x] **T003b Implement:** Make the minimal code/doc/script change.
- [x] **T003c Verify:** Run focused test(s) and record output.
- [x] **T004 Update production callers:** Update `converge-in-transaction.impl.ts` to call `planConverge` with dirtyPlan-only input.
- [x] **T004a Test first:** Add or update a focused failing test/guard for T004.
- [x] **T004b Implement:** Make the minimal code/doc/script change.
- [x] **T004c Verify:** Run focused test(s) and record output.
- [x] **T005 Update tests:** Where tests intentionally exercise legacy conversion, route through the adapter.
- [x] **T005a Test first:** Add or update a focused failing test/guard for T005.
- [x] **T005b Implement:** Make the minimal code/doc/script change.
- [x] **T005c Verify:** Run focused test(s) and record output.
- [x] **T006 Run focused tests:** Run converge planner and converge auto suites listed above.
- [x] **T006a Test first:** Add or update a focused failing test/guard for T006.
- [x] **T006b Implement:** Make the minimal code/doc/script change.
- [x] **T006c Verify:** Run focused test(s) and record output.

## Completion Gate

- [x] A test proves conflicting legacy dirty input cannot override a precise dirtyPlan.
- [x] A test proves exact empty dirtyPlan remains noop even when legacy dirty paths are non-empty in the adapter case.
- [x] Converge existing correctness, rollback, unknown write, and stable hash tests pass.
