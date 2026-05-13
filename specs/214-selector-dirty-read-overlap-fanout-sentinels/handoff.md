# Handoff: Selector Dirty/Read Overlap Fanout Sentinels

## Preflight

```text
repo_head_before: 926fdeaa26a40bd7fd4ccca4a87efa2fdd5af20d
dirty_worktree_before: clean tracked tree before bundle copy; generated bundle/perf artifacts remained untracked until finalization
existing_unrelated_changes: none identified
agent_start_time: 2026-05-11; finalization resumed at 2026-05-11T21:13:54+0800
```

## Scope Confirmation

```text
spec_id: 214-selector-dirty-read-overlap-fanout-sentinels
expected_owner_files:
- packages/logix-core/src/internal/runtime/core/SelectorGraph.ts
- packages/logix-core/src/internal/runtime/core/selectorRoute.dirty.ts
- packages/logix-core/src/internal/runtime/core/selectorRoute.types.ts
- packages/logix-core/src/internal/runtime/core/RuntimeStore.ts
actual_owner_files:
- packages/logix-core/test/Runtime/Runtime.selectorNotifyFanout.contract.test.ts
- packages/logix-core/test/Runtime/Runtime.selectorBroadcastFallbackReason.contract.test.ts
```

## Implementation Notes

```text
what_changed: Added core sentinels for exact selector dirty/read overlap and broadcast fallback reason coding.
why_in_scope: 214 owns structural proof that unrelated exact dirty writes do not fan out to unrelated selector topics.
files_changed: listed below
- packages/logix-core/test/Runtime/Runtime.selectorNotifyFanout.contract.test.ts
- packages/logix-core/test/Runtime/Runtime.selectorBroadcastFallbackReason.contract.test.ts
production_changes: none; existing SelectorGraph / selectorRoute behavior satisfied the sentinels.
```

## Commands Run

```text
command: see entries below
- rtk pnpm -C packages/logix-core test test/Runtime/Runtime.selectorNotifyFanout.contract.test.ts test/Runtime/Runtime.selectorBroadcastFallbackReason.contract.test.ts test/internal/Runtime/RuntimeStore.notifyFastPath.contract.test.ts
result: PASS
notes: see entries below
- Runtime.selectorNotifyFanout.contract.test.ts was added and passed.
- Runtime.selectorBroadcastFallbackReason.contract.test.ts was added and passed.
- No focused commands intentionally skipped for this spec.
```

## Sentinel Status

```text
structural_sentinels: PASS; unrelated exact dirty does not notify unrelated selector topic, broadcast fallback remains reason-coded.
allocation_sentinels: not directly owned by 214, covered by 215 and 220 watched evidence.
no_tearing_status: PASS by 219 focused evidence.
public_surface_status: PASS; no public surface touched.
```

## Evidence

```text
before_artifact: specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/before.runtimeStore.efd21e85.local-darwin-arm64.default.json
after_artifact: specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/after.runtimeStore.7d1c332e.local-darwin-arm64.default.json
diff_artifact: specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/diff.runtimeStore.efd21e85__7d1c332e.local-darwin-arm64.default.json
report_artifact: specs/220-selector-notify-tax-migration-report-gate/perf/clean/report.md
classification: tax_removed
claim_strength: hard
```

## Risk / Cost Migration

```text
migrated_cost: none observed.
migrated_risk: core route remains authority; React host did not gain selector route policy.
observed_phase_or_counter_increase: none.
required_follow_up: none for 214.
```

## Claims

Allowed:
- Focused validation passed for `214-selector-dirty-read-overlap-fanout-sentinels` if all focused tests pass.
- Structural guard added/confirmed for this specific notify tax point.

Forbidden:
- Global Runtime performance improved.
- No regressions exist globally.
- React performance improved globally.
- Selector notification path is optimal.

## Next Recommended Spec

```text
next_spec: 215-runtime-store-listener-snapshot-and-callback-fastpath
reason: next spec validates RuntimeStore notify/listener fast path assumptions.
```
