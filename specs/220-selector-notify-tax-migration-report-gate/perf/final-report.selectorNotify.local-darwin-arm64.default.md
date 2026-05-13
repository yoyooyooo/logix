# RuntimeStore Selector Notify Wave Final Report

## Identity

```text
pre_wave_head: 926fdeaa26a40bd7fd4ccca4a87efa2fdd5af20d
measurement_anchor: efd21e85a06ba70fdc5045d7317baeee6026dfa5
implementation_head: 7d1c332e8177753e3f4369657ff6b90b5c73d359
finalization_head: single squashed wave commit on top of 926fdeaa
tracked_dirty_before_finalization: no tracked production changes expected after implementation commit
cleaned_inputs: bundle zip/unpacked inputs removed before final commit
```

## Spec Status

```text
212-runtime-store-selector-notify-tax-wave: completed
213-runtime-store-notify-preflight-and-tax-ledger: completed
214-selector-dirty-read-overlap-fanout-sentinels: completed
215-runtime-store-listener-snapshot-and-callback-fastpath: completed
216-readquery-external-store-runsync-fallback-sentinels: completed
217-topic-retain-release-and-hot-lifecycle-cleanup: completed
218-react-useselector-render-fanout-sentinels: completed
219-runtime-store-no-tearing-focused-evidence-gate: completed
220-selector-notify-tax-migration-report-gate: completed
```

## Tax Point Summary

```text
selector overlap fanout: guarded, no production change required
broadcast fallback reason: guarded, no production change required
dirty topic notify: guarded, no production change required
listener snapshot/callback: guarded, no production change required
runSync fallback: guarded
first-listener duplicate notify: fixed in RuntimeExternalStore
retain/release leak: guarded, no production change required
unrelated render: guarded, no production change required
report pollution: classifier added
```

## Files Changed

```text
production:
- packages/logix-react/src/internal/store/RuntimeExternalStore.ts

tests:
- packages/logix-core/test/Runtime/Runtime.selectorBroadcastFallbackReason.contract.test.ts
- packages/logix-core/test/Runtime/Runtime.selectorNotifyFanout.contract.test.ts
- packages/logix-core/test/internal/Runtime/RuntimeStore.notifyFastPath.contract.test.ts
- packages/logix-react/test/Hooks/useSelector.renderFanout.contract.test.tsx
- packages/logix-react/test/browser/perf-boundaries/runtime-store-no-tearing.test.tsx
- packages/logix-react/test/internal/store/RuntimeExternalStore.runSyncFallback.contract.test.tsx
- packages/logix-react/test/internal/store/RuntimeExternalStore.topicRetainRelease.contract.test.tsx

perf classifier:
- packages/logix-perf-evidence/scripts/ci.selector-notify-tax-report.ts
- packages/logix-perf-evidence/scripts/ci.selector-notify-tax-report.test.ts
- packages/logix-perf-evidence/package.json
- packages/logix-perf-evidence/tsconfig.json
- packages/logix-perf-evidence/assets/matrix.json
- packages/logix-perf-evidence/README.md

docs/specs/evidence:
- docs/next/runtime-store-selector-notify-*.md
- docs/superpowers/plans/2026-05-11-*.md
- specs/212-runtime-store-selector-notify-tax-wave/**
- specs/213-runtime-store-notify-preflight-and-tax-ledger/**
- specs/214-selector-dirty-read-overlap-fanout-sentinels/**
- specs/215-runtime-store-listener-snapshot-and-callback-fastpath/**
- specs/216-readquery-external-store-runsync-fallback-sentinels/**
- specs/217-topic-retain-release-and-hot-lifecycle-cleanup/**
- specs/218-react-useselector-render-fanout-sentinels/**
- specs/219-runtime-store-no-tearing-focused-evidence-gate/**
- specs/220-selector-notify-tax-migration-report-gate/**
```

## Verification Commands

```text
rtk pnpm -C packages/logix-core test test/Runtime/Runtime.selectorNotifyFanout.contract.test.ts test/Runtime/Runtime.selectorBroadcastFallbackReason.contract.test.ts test/internal/Runtime/RuntimeStore.notifyFastPath.contract.test.ts
result: PASS

rtk pnpm -C packages/logix-react test test/internal/store/RuntimeExternalStore.runSyncFallback.contract.test.tsx test/internal/store/RuntimeExternalStore.topicRetainRelease.contract.test.tsx test/Hooks/useSelector.renderFanout.contract.test.tsx
result: PASS

rtk pnpm -C packages/logix-react test test/Hooks/useSelector.RuntimeStoreSnapshot.contract.test.tsx
result: PASS

rtk pnpm -C packages/logix-react test test/internal/store/RuntimeExternalStore.topicCleanup.contract.test.tsx
result: PASS

rtk pnpm -C packages/logix-react test test/Contracts/ReactSelectorRouteOwner.guard.test.ts test/Contracts/ReactSelectorStoreResidue.guard.test.ts
result: PASS

rtk pnpm -C packages/logix-perf-evidence test scripts/ci.selector-notify-tax-report.test.ts
result: PASS

rtk pnpm -C packages/logix-perf-evidence typecheck
result: PASS

rtk pnpm typecheck
result: PASS, TypeScript: No errors found

rtk git diff --check
result: PASS
```

## Evidence Artifacts

```text
before_artifact: specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/before.runtimeStore.efd21e85.local-darwin-arm64.default.json
after_artifact: specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/after.runtimeStore.7d1c332e.local-darwin-arm64.default.json
diff_artifact: specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/diff.runtimeStore.efd21e85__7d1c332e.local-darwin-arm64.default.json
report_artifact: specs/220-selector-notify-tax-migration-report-gate/perf/clean/report.md
report_json: specs/220-selector-notify-tax-migration-report-gate/perf/clean/report.json
```

## Comparability

```text
matrixId: logix-browser-perf-matrix-v1
matrixHash: c8f2c4cb626be089a9fb4636a9d16b70ee6e4d82afc2ad9ce44a3ce3d1a906fc
profile: default
os: darwin
arch: arm64
cpu: Apple M2 Max
memoryGb: 64
node: v22.22.0
pnpm: 9.15.9
vitest: 4.0.15
browser: chromium 143.0.7499.4 headless
before_dirty: false
after_dirty: false
comparable: true
warnings: []
blockers: []
regressions: 0
budgetViolations: 0
suite: runtimeStore.noTearing.tickNotify
points: before 6 ok, after 6 ok
```

## Metrics

```text
primary_metric: timePerTickMs
improved_points: 5
regressed_points: 0
missing_points: 0
unavailable_points: 0
bestP95DeltaMs: -0.005600003719329833
worstP95DeltaMs: n/a

selectorNotify.notifiedTopicCount: before=10, after=10, delta=0, interpretation=stable
selectorNotify.renderCount: before=0, after=0, delta=0, interpretation=stable
selectorNotify.runSyncFallbackCount: before=0, after=0, delta=0, interpretation=stable
selectorNotify.retainedTopicCount: before=256, after=256, delta=0, interpretation=stable
selectorNotify.listenerSnapshotCloneCount: before=0, after=0, delta=0, interpretation=stable
selectorNotify.broadcastFallbackCount: before=0, after=0, delta=0, interpretation=stable
```

## Classification

```text
classification: tax_removed
claimStrength: hard
migratedPhases: []
migrated_cost: none observed
migrated_risk: focused-only claim boundary remains
```

## Claims

Allowed:

- Focused validation passed.
- Comparable focused evidence supports selector notify path improvement.

Forbidden:

- Global Runtime performance improved.
- No global regressions.
- React performance is fixed.
- Selector notify path is optimal.

## Next Anchor

```text
next_anchor: final squashed selector notify wave commit
next_action: start a separate broad/default or soak evidence spec before making any global performance claim
```
