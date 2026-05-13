# Handoff — DirtyPlan ListEvidence Allocation Sentinels

## Preflight

```text
repo_head_before: ae91fe6b77935446fccbbf0de866812166ebf070
dirty_worktree_before: copied dirty-work bundle docs/specs plus 221-225 docs/tests; no unrelated tracked edits identified
prior_wave_status: RuntimeStore / Selector Notify 212-220 tax_removed, claimStrength=hard
existing_unrelated_changes: none identified
agent_start_time: 2026-05-11
```

## Scope Decision

```text
started: yes
blocked: no
waiver_if_any: none required
```

## Files Changed

```text
source_files: none
test_files:
- packages/logix-core/test/internal/Runtime/StateTransaction.DirtyPlanAllocationSentinels.test.ts
doc_files:
- specs/226-dirtyplan-listevidence-allocation-sentinels/handoff.md
- specs/226-dirtyplan-listevidence-allocation-sentinels/tasks.md
- specs/226-dirtyplan-listevidence-allocation-sentinels/checklists/requirements.md
perf_files: none
```

## Commands Run

```text
command: rtk pnpm -C packages/logix-core test test/internal/Runtime/StateTransaction.DirtyPlanAllocationSentinels.test.ts
result: FAIL then PASS
notes: first run expected two list-index materializations for one changed row; actual semantics produce one sorted index map for indexBindings, so test expectation was corrected. Final run passed, 1 file, 3 tests.

command: rtk pnpm -C packages/logix-core test test/internal/Runtime/StateTransaction.DirtyPlanSnapshot.test.ts
result: PASS
notes: 1 file, 6 tests passed

command: rtk pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.txnSecondOrderCosts.Sentinels.test.ts
result: PASS
notes: 1 file, 2 tests passed; bundle command listed test/internal/Runtime/ModuleRuntime.txnSecondOrderCosts.Sentinels.test.ts, actual repo path is under ModuleRuntime/

command: rtk pnpm -C packages/logix-core test test/internal/Runtime/ModuleRuntime/ModuleRuntime.diagnosticsOff.ZeroAllocSentinels.test.ts
result: PASS
notes: 1 file, 2 tests passed
```

## Sentinel Status

```text
structural_sentinels: PASS; dirtyPlan snapshot memoization and exact empty plan semantics covered
allocation_sentinels: PASS; repeated same-phase reads do not rematerialize raw/root/list evidence, empty exact plan avoids materialization counters, large previous txn does not charge small next txn unbounded clear tax
fallback_reason_sentinels: diagnostics-off zero allocation sentinel passed; broader fallback classifier deferred to 227
semantic_sentinels: PASS; no production code changed
```

## Evidence

```text
quick_clues: focused allocation/materialization sentinel tests only
same_commit_ab: none
before_after_default: not collected in 226
before_after_soak: not collected in 226
report_files: none
```

## Tax Migration

```text
classification: stable_guarded
improved_area: no hard perf claim; dirtyPlan/listEvidence allocation paths are guarded
regressed_or_shifted_area: none observed; no production behavior changed in 226
evidence: new allocation sentinel plus dirtyPlan snapshot, second-order cost, diagnostics-off tests
required_follow_up: continue to 227 fallback reason tax report
```

## Claims

```text
allowed_claims:
- Allocation/materialization sentinels pass for dirtyPlan/listEvidence focused paths.
- Same-phase dirtyPlan/listEvidence repeat reads hit cache in focused tests.
forbidden_claims:
- Focused dirtyPlan/listEvidence performance improved.
- Global Runtime performance improved.
- No regressions exist globally.
- FieldKernel is optimal.
```

## Next Anchor

```text
recommended_next_spec: 227-fieldkernel-fallback-reason-tax-report
open_questions: none
```
