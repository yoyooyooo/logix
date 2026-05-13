# Selector Notify Tax Migration Report

- suite: `runtimeStore.noTearing.tickNotify`
- profile: `default`
- classification: `tax_removed`
- claimStrength: `hard`

## Inputs
- diff: `specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/diff.runtimeStore.efd21e85__7d1c332e.local-darwin-arm64.default.json`
- before: `specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/before.runtimeStore.efd21e85.local-darwin-arm64.default.json`
- after: `specs/219-runtime-store-no-tearing-focused-evidence-gate/perf/after.runtimeStore.7d1c332e.local-darwin-arm64.default.json`

## Gates
- PASS `profile` (clue): profile=default; hard claims require default or soak
- PASS `comparable` (clue): diff.meta.comparability.comparable must be true
- PASS `regressions` (hard): summary.regressions=0
- PASS `budgetViolations` (hard): summary.budgetViolations=0
- PASS `warnings` (clue): no comparability warnings
- PASS `pointStatus` (hard): runtimeStore.noTearing.tickNotify before/after points must not timeout or fail
- PASS `metricEvidence` (hard): timePerTickMs metric delta must be present and available
- PASS `watchedEvidence` (hard): selector notify watched evidence must be present and available

## Total Metric
- `timePerTickMs`: improved=5, regressed=0, missing=0, unavailable=0, bestP95DeltaMs=-0.0056, worstP95DeltaMs=n/a

## Watched Counters
- `selectorNotify.notifiedTopicCount`: before=10.0000, after=10.0000, delta=0.0000, interpretation=stable
- `selectorNotify.renderCount`: before=0.0000, after=0.0000, delta=0.0000, interpretation=stable
- `selectorNotify.runSyncFallbackCount`: before=0.0000, after=0.0000, delta=0.0000, interpretation=stable
- `selectorNotify.retainedTopicCount`: before=256.0000, after=256.0000, delta=0.0000, interpretation=stable
- `selectorNotify.listenerSnapshotCloneCount`: before=0.0000, after=0.0000, delta=0.0000, interpretation=stable
- `selectorNotify.broadcastFallbackCount`: before=0.0000, after=0.0000, delta=0.0000, interpretation=stable

## Claims
Allowed:
- Focused validation passed.
- Comparable focused evidence supports selector notify path improvement.

Forbidden:
- Global Runtime performance improved.
- No global regressions.
- React performance is fixed.
- Selector notify path is optimal.
