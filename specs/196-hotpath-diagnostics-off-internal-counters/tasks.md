# 196 Hotpath Diagnostics-Off Internal Counters Tasks

**Priority:** P1  
**Depends On:** 195

## Tasks

- [x] **T001 Write audit contract test:** Create a test that installs a sink, triggers source dirty fallback, and expects a count by reason.
- [x] **T001a Test first:** Add or update a focused failing test/guard for T001.
- [x] **T001b Implement:** Make the minimal code/doc/script change.
- [x] **T001c Verify:** Run focused test(s) and record output.
- [x] **T002 Create audit module:** Add `KernelHotPathAudit.ts` with `withKernelHotPathAuditSink`, `recordKernelFallback`, and snapshot helpers.
- [x] **T002a Test first:** Add or update a focused failing test/guard for T002.
- [x] **T002b Implement:** Make the minimal code/doc/script change.
- [x] **T002c Verify:** Run focused test(s) and record output.
- [x] **T003 Wire source:** Record source dirty gate fallback only if sink exists.
- [x] **T003a Test first:** Add or update a focused failing test/guard for T003.
- [x] **T003b Implement:** Make the minimal code/doc/script change.
- [x] **T003c Verify:** Run focused test(s) and record output.
- [x] **T004 Wire validate:** Record static-ir selection/fallback decisions only if sink exists.
- [x] **T004a Test first:** Add or update a focused failing test/guard for T004.
- [x] **T004b Implement:** Make the minimal code/doc/script change.
- [x] **T004c Verify:** Run focused test(s) and record output.
- [x] **T005 Wire selector:** Record dirty fallback reason on commit only if sink exists.
- [x] **T005a Test first:** Add or update a focused failing test/guard for T005.
- [x] **T005b Implement:** Make the minimal code/doc/script change.
- [x] **T005c Verify:** Run focused test(s) and record output.
- [x] **T006 Wire converge:** Record legacy/unknown dirty only if sink exists.
- [x] **T006a Test first:** Add or update a focused failing test/guard for T006.
- [x] **T006b Implement:** Make the minimal code/doc/script change.
- [x] **T006c Verify:** Run focused test(s) and record output.
- [x] **T007 Run focused tests:** Run audit, diagnostics-off, and fallback tests.
- [x] **T007a Test first:** Add or update a focused failing test/guard for T007.
- [x] **T007b Implement:** Make the minimal code/doc/script change.
- [x] **T007c Verify:** Run focused test(s) and record output.

## Completion Gate

- [x] Internal audit contract test can install a sink, run focused operations, and inspect counts.
- [x] Diagnostics-off tests remain green and no debug event family is added.
- [x] All touched subsystems use unified fallback reasons for counter keys.
