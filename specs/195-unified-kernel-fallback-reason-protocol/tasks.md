# 195 Unified Kernel Fallback Reason Protocol Tasks

**Priority:** P0  
**Depends On:** 190, 191, 194

## Tasks

- [x] **T001 Write vocabulary contract:** Add `KernelFallbackReason.contract.test.ts` checking exact union values through exported internal helper.
- [x] **T001a Test first:** Add or update a focused failing test/guard for T001.
- [x] **T001b Implement:** Make the minimal code/doc/script change.
- [x] **T001c Verify:** Run focused test(s) and record output.
- [x] **T002 Create protocol module:** Add `kernelFallbackReason.ts` with union, type guards, and mapping helpers.
- [x] **T002a Test first:** Add or update a focused failing test/guard for T002.
- [x] **T002b Implement:** Make the minimal code/doc/script change.
- [x] **T002c Verify:** Run focused test(s) and record output.
- [x] **T003 Wire source:** Map source dirty gate fallback reasons to `kernelFallbackReason` only inside diagnostics-enabled branches.
- [x] **T003a Test first:** Add or update a focused failing test/guard for T003.
- [x] **T003b Implement:** Make the minimal code/doc/script change.
- [x] **T003c Verify:** Run focused test(s) and record output.
- [x] **T004 Wire validate:** Map missing static IR / incremental fallback reasons to the protocol.
- [x] **T004a Test first:** Add or update a focused failing test/guard for T004.
- [x] **T004b Implement:** Make the minimal code/doc/script change.
- [x] **T004c Verify:** Run focused test(s) and record output.
- [x] **T005 Wire selector:** Map dirty fallback classifications into protocol payload context.
- [x] **T005a Test first:** Add or update a focused failing test/guard for T005.
- [x] **T005b Implement:** Make the minimal code/doc/script change.
- [x] **T005c Verify:** Run focused test(s) and record output.
- [x] **T006 Wire converge:** Map legacy/unknown dirty fallbacks into protocol without changing plan behavior.
- [x] **T006a Test first:** Add or update a focused failing test/guard for T006.
- [x] **T006b Implement:** Make the minimal code/doc/script change.
- [x] **T006c Verify:** Run focused test(s) and record output.
- [x] **T007 Run focused tests:** Run protocol and existing fallback suites.
- [x] **T007a Test first:** Add or update a focused failing test/guard for T007.
- [x] **T007b Implement:** Make the minimal code/doc/script change.
- [x] **T007c Verify:** Run focused test(s) and record output.

## Completion Gate

- [x] Unified vocabulary contract test passes.
- [x] Source/validate/selector fallback tests assert `kernelFallbackReason` when diagnostics are enabled.
- [x] Diagnostics-off tests show no new emitted events.
