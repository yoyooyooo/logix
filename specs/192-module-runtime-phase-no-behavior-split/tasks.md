# 192 ModuleRuntime Phase No-Behavior Split Tasks

**Priority:** P0  
**Depends On:** 190

## Tasks

- [x] **T001 Snapshot current public behavior:** Run focused ModuleRuntime tests before moving code and save failing/passing baseline in the PR notes.
- [x] **T001a Test first:** Add or update a focused failing test/guard for T001.
- [x] **T001b Implement:** Make the minimal code/doc/script change.
- [x] **T001c Verify:** Run focused test(s) and record output.
- [x] **T002 Write decomposition guard:** Add a guard that checks the new files exist and `ModuleRuntime.impl.ts` line count decreases materially.
- [x] **T002a Test first:** Add or update a focused failing test/guard for T002.
- [x] **T002b Implement:** Make the minimal code/doc/script change.
- [x] **T002c Verify:** Run focused test(s) and record output.
- [x] **T003 Extract option normalization:** Move pure option/default helpers into `ModuleRuntime.makeOptions.ts`.
- [x] **T003a Test first:** Add or update a focused failing test/guard for T003.
- [x] **T003b Implement:** Make the minimal code/doc/script change.
- [x] **T003c Verify:** Run focused test(s) and record output.
- [x] **T004 Extract post-commit helpers:** Move post-commit timing and publish helpers into `ModuleRuntime.postCommit.ts`.
- [x] **T004a Test first:** Add or update a focused failing test/guard for T004.
- [x] **T004b Implement:** Make the minimal code/doc/script change.
- [x] **T004c Verify:** Run focused test(s) and record output.
- [x] **T005 Extract field install wiring:** Move field-kernel install glue into `ModuleRuntime.fieldKernelInstall.ts`.
- [x] **T005a Test first:** Add or update a focused failing test/guard for T005.
- [x] **T005b Implement:** Make the minimal code/doc/script change.
- [x] **T005c Verify:** Run focused test(s) and record output.
- [x] **T006 Run focused tests:** Run ModuleRuntime and Runtime lifecycle focused tests; fix import-only fallout.
- [x] **T006a Test first:** Add or update a focused failing test/guard for T006.
- [x] **T006b Implement:** Make the minimal code/doc/script change.
- [x] **T006c Verify:** Run focused test(s) and record output.

## Completion Gate

- [x] Focused ModuleRuntime lifecycle, transaction, lane, and readiness tests pass.
- [x] New decomposition guard fails if `ModuleRuntime.impl.ts` re-imports moved internal helpers by copy/paste rather than delegating.
- [x] No public Runtime or Module types change.
