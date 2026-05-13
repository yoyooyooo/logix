# 191 StateTransaction No-Behavior Split Tasks

**Priority:** P0  
**Depends On:** 190

## Tasks

- [x] **T001 Write decomposition expectations:** Extend `StateTransaction.decomposition.guard.test.ts` to assert new files exist and `StateTransaction.ts` does not contain lifecycle function bodies.
- [x] **T001a Test first:** Add or update a focused failing test/guard for T001.
- [x] **T001b Implement:** Make the minimal code/doc/script change.
- [x] **T001c Verify:** Run focused test(s) and record output.
- [x] **T002 Move type declarations:** Create `StateTransaction.types.ts`; move exported interfaces/types without changing names.
- [x] **T002a Test first:** Add or update a focused failing test/guard for T002.
- [x] **T002b Implement:** Make the minimal code/doc/script change.
- [x] **T002c Verify:** Run focused test(s) and record output.
- [x] **T003 Move context construction:** Create `StateTransaction.context.ts`; move `MAX_PATCHES_FULL`, `defaultNow`, `makeContext` and required helpers.
- [x] **T003a Test first:** Add or update a focused failing test/guard for T003.
- [x] **T003b Implement:** Make the minimal code/doc/script change.
- [x] **T003c Verify:** Run focused test(s) and record output.
- [x] **T004 Move lifecycle operations:** Create `StateTransaction.lifecycle.ts`; move begin/update/commit/abort functions and import dirty/patch/snapshot helpers.
- [x] **T004a Test first:** Add or update a focused failing test/guard for T004.
- [x] **T004b Implement:** Make the minimal code/doc/script change.
- [x] **T004c Verify:** Run focused test(s) and record output.
- [x] **T005 Re-export compatibility:** Update `StateTransaction.ts` to re-export types and functions from the split files.
- [x] **T005a Test first:** Add or update a focused failing test/guard for T005.
- [x] **T005b Implement:** Make the minimal code/doc/script change.
- [x] **T005c Verify:** Run focused test(s) and record output.
- [x] **T006 Run focused tests:** Run transaction and dirtyPlan tests; fix import-only errors.
- [x] **T006a Test first:** Add or update a focused failing test/guard for T006.
- [x] **T006b Implement:** Make the minimal code/doc/script change.
- [x] **T006c Verify:** Run focused test(s) and record output.

## Completion Gate

- [x] Existing transaction, dirty plan, patch, and list evidence tests pass unchanged.
- [x] Decomposition guard enforces `StateTransaction.ts` as a narrow facade and prevents reintroducing lifecycle logic into the barrel.
- [x] `git diff` shows code movement plus imports only; no semantic branch changes.
