# Handoff: Topic Retain/Release and Hot Lifecycle Cleanup

## Preflight

```text
repo_head_before: 926fdeaa26a40bd7fd4ccca4a87efa2fdd5af20d
dirty_worktree_before: clean tracked tree before bundle copy; generated bundle/perf artifacts remained untracked until finalization
existing_unrelated_changes: none identified
agent_start_time: 2026-05-11; finalization resumed at 2026-05-11T21:13:54+0800
```

## Scope Confirmation

```text
spec_id: 217-topic-retain-release-and-hot-lifecycle-cleanup
expected_owner_files:
- packages/logix-react/src/internal/store/RuntimeExternalStore.ts
- packages/logix-react/src/internal/store/RuntimeExternalStore.hotLifecycle.ts
- packages/logix-react/src/internal/store/ModuleCache.ts
- packages/logix-core/src/internal/runtime/core/RuntimeStore.ts
actual_owner_files:
- packages/logix-react/test/internal/store/RuntimeExternalStore.topicRetainRelease.contract.test.tsx
```

## Implementation Notes

```text
what_changed: Added retain/release sentinel for unmount, hot lifecycle replacement, and module dispose topic cleanup.
why_in_scope: 217 owns retained topic leak and hot lifecycle cleanup tax points.
files_changed: listed below
- packages/logix-react/test/internal/store/RuntimeExternalStore.topicRetainRelease.contract.test.tsx
production_changes: none; existing lifecycle cleanup behavior satisfied the sentinel.
```

## Commands Run

```text
command: see entries below
- rtk pnpm -C packages/logix-react test test/internal/store/RuntimeExternalStore.runSyncFallback.contract.test.tsx test/internal/store/RuntimeExternalStore.topicRetainRelease.contract.test.tsx test/Hooks/useSelector.renderFanout.contract.test.tsx
result: PASS
notes: see entries below
- RuntimeExternalStore.topicRetainRelease.contract.test.tsx was added and passed.
- rtk pnpm -C packages/logix-react test test/internal/store/RuntimeExternalStore.topicCleanup.contract.test.tsx: PASS
- No focused commands intentionally skipped for this spec.
```

## Sentinel Status

```text
structural_sentinels: PASS; retained topics return to zero after unmount/HMR/dispose paths.
allocation_sentinels: PASS by report watched evidence.
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
migrated_risk: retainedTopicCount is stable in perf evidence because the focused suite maintains 256 active watched topics during measurement; cleanup sentinel covers release-to-zero lifecycle.
observed_phase_or_counter_increase: retainedTopicCount stable 256 in focused perf report, cleanup test validates zero after teardown.
required_follow_up: none for 217.
```

## Claims

Allowed:
- Focused validation passed for `217-topic-retain-release-and-hot-lifecycle-cleanup` if all focused tests pass.
- Structural guard added/confirmed for this specific notify tax point.

Forbidden:
- Global Runtime performance improved.
- No regressions exist globally.
- React performance improved globally.
- Selector notification path is optimal.

## Next Recommended Spec

```text
next_spec: 218-react-useselector-render-fanout-sentinels
reason: next spec validates React render fanout does not mask core notify changes.
```
