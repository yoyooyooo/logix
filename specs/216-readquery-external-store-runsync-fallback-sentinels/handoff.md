# Handoff: ReadQuery External Store runSync Fallback Sentinels

## Preflight

```text
repo_head_before: 926fdeaa26a40bd7fd4ccca4a87efa2fdd5af20d
dirty_worktree_before: clean tracked tree before bundle copy; generated bundle/perf artifacts remained untracked until finalization
existing_unrelated_changes: none identified
agent_start_time: 2026-05-11; finalization resumed at 2026-05-11T21:13:54+0800
```

## Scope Confirmation

```text
spec_id: 216-readquery-external-store-runsync-fallback-sentinels
expected_owner_files:
- packages/logix-react/src/internal/store/RuntimeExternalStore.ts
- packages/logix-react/src/internal/hooks/useSelector.ts
- packages/logix-core/src/internal/runtime/core/RuntimeStore.ts
actual_owner_files:
- packages/logix-react/src/internal/store/RuntimeExternalStore.ts
- packages/logix-react/test/internal/store/RuntimeExternalStore.runSyncFallback.contract.test.tsx
```

## Implementation Notes

```text
what_changed: Added runSync fallback and first-listener duplicate notify sentinel, then reordered RuntimeExternalStore first-listener setup so retain/initial selector dirty flush runs before runtime subscription.
why_in_scope: 216 owns readQuery external-store runSync fallback and first-listener duplicate notify tax points.
files_changed: listed below
- packages/logix-react/src/internal/store/RuntimeExternalStore.ts
- packages/logix-react/test/internal/store/RuntimeExternalStore.runSyncFallback.contract.test.tsx
commit: 7d1c332e8177753e3f4369657ff6b90b5c73d359
```

## Commands Run

```text
command: see entries below
- rtk pnpm -C packages/logix-react test test/internal/store/RuntimeExternalStore.runSyncFallback.contract.test.tsx test/internal/store/RuntimeExternalStore.topicRetainRelease.contract.test.tsx test/Hooks/useSelector.renderFanout.contract.test.tsx
result: PASS after 7d1c332e
notes: see entries below
- Initial RuntimeExternalStore.runSyncFallback.contract.test.tsx failed on first-listener duplicate notify before the implementation commit.
- The implementation moved ensureSubscription()/refreshSnapshotIfStale() after onFirstListener handling.
- rtk pnpm -C packages/logix-react test test/Hooks/useSelector.RuntimeStoreSnapshot.contract.test.tsx: PASS
- No focused commands intentionally skipped for this spec.
```

## Sentinel Status

```text
structural_sentinels: PASS; committed snapshot path runSyncFallbackCount=0 and first listener does not duplicate notify.
allocation_sentinels: PASS by report watched evidence; runSyncFallbackCount stable 0.
no_tearing_status: PASS by RuntimeStoreSnapshot test and 219 focused evidence.
public_surface_status: PASS; RuntimeExternalStore internal ordering changed with no hook signature or public API change.
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
migrated_risk: no React-owned selector route policy introduced.
observed_phase_or_counter_increase: runSyncFallbackCount stable 0, renderCount stable 0.
required_follow_up: none for 216.
```

## Claims

Allowed:
- Focused validation passed for `216-readquery-external-store-runsync-fallback-sentinels` if all focused tests pass.
- Structural guard added/confirmed for this specific notify tax point.

Forbidden:
- Global Runtime performance improved.
- No regressions exist globally.
- React performance improved globally.
- Selector notification path is optimal.

## Next Recommended Spec

```text
next_spec: 217-topic-retain-release-and-hot-lifecycle-cleanup
reason: next spec validates topic retention cleanup after listener lifecycle changes.
```
