# 193 BoundApiRuntime No-Behavior Split Tasks

**Priority:** P0  
**Depends On:** 190

## Tasks

- [x] **T001 Extend guard:** Update `BoundApiRuntime.decomposition.guard.test.ts` to require the three new modules and ban copied helper bodies in the root file.
- [x] **T001a Test first:** Add or update a focused failing test/guard for T001.
- [x] **T001b Implement:** Make the minimal code/doc/script change.
- [x] **T001c Verify:** Run focused test(s) and record output.
- [x] **T002 Extract direct state helpers:** Move `DIRECT_STATE_WRITE_EFFECT`, mark/read metadata helpers into `BoundApiRuntime.directStateWrite.ts`.
- [x] **T002a Test first:** Add or update a focused failing test/guard for T002.
- [x] **T002b Implement:** Make the minimal code/doc/script change.
- [x] **T002c Verify:** Run focused test(s) and record output.
- [x] **T003 Extract Logic builder:** Move `LogicBuilderFactory` and narrow imports into `BoundApiRuntime.logicBuilder.ts`.
- [x] **T003a Test first:** Add or update a focused failing test/guard for T003.
- [x] **T003b Implement:** Make the minimal code/doc/script change.
- [x] **T003c Verify:** Run focused test(s) and record output.
- [x] **T004 Extract facade assembly:** Move pure facade-building helpers into `BoundApiRuntime.facade.ts`.
- [x] **T004a Test first:** Add or update a focused failing test/guard for T004.
- [x] **T004b Implement:** Make the minimal code/doc/script change.
- [x] **T004c Verify:** Run focused test(s) and record output.
- [x] **T005 Wire make coordinator:** Update `BoundApiRuntime.ts` imports and keep public behavior unchanged.
- [x] **T005a Test first:** Add or update a focused failing test/guard for T005.
- [x] **T005b Implement:** Make the minimal code/doc/script change.
- [x] **T005c Verify:** Run focused test(s) and record output.
- [x] **T006 Run focused tests:** Run readiness, Logic lifecycle, and decomposition tests.
- [x] **T006a Test first:** Add or update a focused failing test/guard for T006.
- [x] **T006b Implement:** Make the minimal code/doc/script change.
- [x] **T006c Verify:** Run focused test(s) and record output.

## Completion Gate

- [x] Readiness and Logic lifecycle contract tests pass unchanged.
- [x] Decomposition guard enforces moved responsibilities.
- [x] Text sweep continues to reject lifecycle API family drift.
