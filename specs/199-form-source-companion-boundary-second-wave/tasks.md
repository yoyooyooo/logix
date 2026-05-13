# 199 Form Source/Companion Boundary Second Wave Tasks

**Priority:** P1  
**Depends On:** 190, 195, 197

## Tasks

- [x] **T001 Write async companion guard:** Add test with companion returning Promise/Effect and expect authoring error/diagnostic.
- [x] **T001a Test first:** Add or update a focused failing test/guard for T001.
- [x] **T001b Implement:** Make the minimal code/doc/script change.
- [x] **T001c Verify:** Run focused test(s) and record output.
- [x] **T002 Write source-not-options guard:** Add public surface/text guard rejecting source-as-options/candidates wording or API.
- [x] **T002a Test first:** Add or update a focused failing test/guard for T002.
- [x] **T002b Implement:** Make the minimal code/doc/script change.
- [x] **T002c Verify:** Run focused test(s) and record output.
- [x] **T003 Write read route guard:** Add test scanning for `useFormField/useCompanion/useFormSelector` canonical exports.
- [x] **T003a Test first:** Add or update a focused failing test/guard for T003.
- [x] **T003b Implement:** Make the minimal code/doc/script change.
- [x] **T003c Verify:** Run focused test(s) and record output.
- [x] **T004 Fix companion lower:** Tighten implementation to reject async values without changing valid sync companion behavior.
- [x] **T004a Test first:** Add or update a focused failing test/guard for T004.
- [x] **T004b Implement:** Make the minimal code/doc/script change.
- [x] **T004c Verify:** Run focused test(s) and record output.
- [x] **T005 Fix source boundary drift:** Remove or reword any source code/docs that imply options/final truth ownership.
- [x] **T005a Test first:** Add or update a focused failing test/guard for T005.
- [x] **T005b Implement:** Make the minimal code/doc/script change.
- [x] **T005c Verify:** Run focused test(s) and record output.
- [x] **T006 Run focused tests:** Run Form domain boundary and React host gate tests.
- [x] **T006a Test first:** Add or update a focused failing test/guard for T006.
- [x] **T006b Implement:** Make the minimal code/doc/script change.
- [x] **T006c Verify:** Run focused test(s) and record output.

## Completion Gate

- [x] Async companion guard fails on Promise/Effect return and includes owner-law diagnostic wording.
- [x] Source guard proves no options/candidates public namespace is exported or documented as canonical.
- [x] React host gate test proves Form companion/error selectors are consumed via `useSelector`.
