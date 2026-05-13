# 197 Selector RuntimeStore Lifecycle Cleanup Tasks

**Priority:** P1  
**Depends On:** 190, 195

## Tasks

- [x] **T001 Write cleanup failing test:** Add `RuntimeExternalStore.topicCleanup.contract.test.tsx` with mount/unmount/hot-dispose and retained topic count assertion.
- [x] **T001a Test first:** Add or update a focused failing test/guard for T001.
- [x] **T001b Implement:** Make the minimal code/doc/script change.
- [x] **T001c Verify:** Run focused test(s) and record output.
- [x] **T002 Add internal test hook:** Expose non-public test-only count helpers from RuntimeExternalStore or test support file.
- [x] **T002a Test first:** Add or update a focused failing test/guard for T002.
- [x] **T002b Implement:** Make the minimal code/doc/script change.
- [x] **T002c Verify:** Run focused test(s) and record output.
- [x] **T003 Tighten readSnapshot:** Ensure readQuery snapshot path consults RuntimeStore first and runSync only when missing.
- [x] **T003a Test first:** Add or update a focused failing test/guard for T003.
- [x] **T003b Implement:** Make the minimal code/doc/script change.
- [x] **T003c Verify:** Run focused test(s) and record output.
- [x] **T004 Audit retain/release:** Make release idempotent across SelectorGraph and RuntimeExternalStore teardown.
- [x] **T004a Test first:** Add or update a focused failing test/guard for T004.
- [x] **T004b Implement:** Make the minimal code/doc/script change.
- [x] **T004c Verify:** Run focused test(s) and record output.
- [x] **T005 Keep React route owner:** Run/extend guard so `useSelector.ts` has no local selectorTopicEligible/lane policy.
- [x] **T005a Test first:** Add or update a focused failing test/guard for T005.
- [x] **T005b Implement:** Make the minimal code/doc/script change.
- [x] **T005c Verify:** Run focused test(s) and record output.
- [x] **T006 Run focused tests:** Run core selector and React selector suites listed above.
- [x] **T006a Test first:** Add or update a focused failing test/guard for T006.
- [x] **T006b Implement:** Make the minimal code/doc/script change.
- [x] **T006c Verify:** Run focused test(s) and record output.

## Completion Gate

- [x] SelectorGraph topic retain contract proves release is idempotent and no negative counts occur.
- [x] React external store cleanup test proves retained store/topic count reaches zero after unmount/hot dispose.
- [x] React guard tests continue to reject local selector route policy.
