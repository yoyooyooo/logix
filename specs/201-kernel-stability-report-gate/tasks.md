# 201 Kernel Stability Report Gate Tasks

**Priority:** P2  
**Depends On:** 190, 191, 192, 193, 194, 195, 196, 197, 198, 199, 200

## Tasks

- [x] **T001 Write report shape test:** Create `KernelStabilityReport.contract.test.ts` for exact keys and stable ordering.
- [x] **T001a Test first:** Add or update a focused failing test/guard for T001.
- [x] **T001b Implement:** Make the minimal code/doc/script change.
- [x] **T001c Verify:** Run focused test(s) and record output.
- [x] **T002 Implement internal report model:** Create `KernelStabilityReport.ts` with types, normalizers, and JSON-safe builder.
- [x] **T002a Test first:** Add or update a focused failing test/guard for T002.
- [x] **T002b Implement:** Make the minimal code/doc/script change.
- [x] **T002c Verify:** Run focused test(s) and record output.
- [x] **T003 Implement dry-run script:** Create `scripts/kernel-stability-report.mjs` to emit a sample report without running perf suites.
- [x] **T003a Test first:** Add or update a focused failing test/guard for T003.
- [x] **T003b Implement:** Make the minimal code/doc/script change.
- [x] **T003c Verify:** Run focused test(s) and record output.
- [x] **T004 Add docs template:** Create `docs/next/kernel-stability-report-template.md` with gate definitions and non-claim rules.
- [x] **T004a Test first:** Add or update a focused failing test/guard for T004.
- [x] **T004b Implement:** Make the minimal code/doc/script change.
- [x] **T004c Verify:** Run focused test(s) and record output.
- [x] **T005 Wire static gates:** Map existing guard names to report sections as descriptive input, not automatic CI verdicts unless tests passed.
- [x] **T005a Test first:** Add or update a focused failing test/guard for T005.
- [x] **T005b Implement:** Make the minimal code/doc/script change.
- [x] **T005c Verify:** Run focused test(s) and record output.
- [x] **T006 Run focused tests:** Run report, hotpath policy, and public surface guard tests.
- [x] **T006a Test first:** Add or update a focused failing test/guard for T006.
- [x] **T006b Implement:** Make the minimal code/doc/script change.
- [x] **T006c Verify:** Run focused test(s) and record output.

## Completion Gate

- [x] KernelStabilityReport contract test passes and proves JSON shape stability.
- [x] `node scripts/kernel-stability-report.mjs --dry-run` prints deterministic report with UNKNOWN where evidence is absent.
- [x] Docs template explains how to fill gates without interpreting UNKNOWN as PASS.
