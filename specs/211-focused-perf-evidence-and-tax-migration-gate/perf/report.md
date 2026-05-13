# Dispatch Shell Tax Migration Report

- suite: `dispatchShell.fixedCost`
- profile: `default`
- classification: `inconclusive`
- claimStrength: `clue`

## Inputs
- diff: `specs/211-focused-perf-evidence-and-tax-migration-gate/perf/diff.browser.dispatchShell.545c537c3__dirty-local.local.default.json`
- before: `specs/211-focused-perf-evidence-and-tax-migration-gate/perf/before.browser.dispatchShell.545c537c3.local.default.json`
- after: `specs/211-focused-perf-evidence-and-tax-migration-gate/perf/after.browser.dispatchShell.dirty-local.local.default.json`

## Gates
- PASS `profile` (clue): profile=default; hard claims require default or soak
- PASS `comparable` (clue): diff.meta.comparability.comparable must be true
- PASS `regressions` (hard): summary.regressions=0
- PASS `budgetViolations` (hard): summary.budgetViolations=0
- BLOCK `warnings` (clue): git.dirty.before=true; git.dirty.after=true
- PASS `pointStatus` (hard): dispatchShell.fixedCost before/after points must not timeout or fail
- PASS `phaseEvidence` (hard): runtime.txnPhase.*Ms evidence must be present and available
- PASS `metricEvidence` (hard): runtime.txnCommitMs metric delta must not be missing or unavailable

## Blockers
- git dirty evidence is clue-only

## Total Metric
- `runtime.txnCommitMs`: improved=5, regressed=0, missing=0, unavailable=0, bestP95DeltaMs=-0.1180, worstP95DeltaMs=n/a

## Phase Evidence
- `runtime.txnPhase.asyncEscapeGuardMs`: before=0.0200, after=0.0200, deltaMs=0.0000, interpretation=stable
- `runtime.txnPhase.bodyShellMs`: before=0.0200, after=0.0200, deltaMs=0.0000, interpretation=stable
- `runtime.txnPhase.commitOnCommitAfterStateUpdateMs`: before=0.0000, after=0.0000, deltaMs=0.0000, interpretation=stable
- `runtime.txnPhase.commitOnCommitBeforeStateUpdateMs`: before=0.0000, after=0.0000, deltaMs=0.0000, interpretation=stable
- `runtime.txnPhase.commitPublishCommitMs`: before=0.0000, after=0.0000, deltaMs=0.0000, interpretation=stable
- `runtime.txnPhase.commitRowIdSyncMs`: before=0.0000, after=0.0000, deltaMs=0.0000, interpretation=stable
- `runtime.txnPhase.commitStateUpdateDebugRecordMs`: before=0.0000, after=0.0000, deltaMs=0.0000, interpretation=stable
- `runtime.txnPhase.commitTotalMs`: before=0.0200, after=0.0000, deltaMs=-0.0200, interpretation=stable
- `runtime.txnPhase.dispatchActionCommitHubMs`: before=0.0000, after=0.0000, deltaMs=0.0000, interpretation=stable
- `runtime.txnPhase.dispatchActionRecordMs`: before=0.0000, after=0.0000, deltaMs=0.0000, interpretation=stable
- `runtime.txnPhase.fieldConvergeMs`: before=0.0000, after=0.0000, deltaMs=0.0000, interpretation=stable
- `runtime.txnPhase.queueBackpressureMs`: before=0.0000, after=0.0000, deltaMs=0.0000, interpretation=stable
- `runtime.txnPhase.queueContextLookupMs`: before=0.0000, after=0.0000, deltaMs=0.0000, interpretation=stable
- `runtime.txnPhase.queueEnqueueBookkeepingMs`: before=0.0000, after=0.0000, deltaMs=0.0000, interpretation=stable
- `runtime.txnPhase.queueResolvePolicyMs`: before=0.0000, after=0.0000, deltaMs=0.0000, interpretation=stable
- `runtime.txnPhase.queueStartHandoffMs`: before=0.0000, after=0.0000, deltaMs=0.0000, interpretation=stable
- `runtime.txnPhase.queueWaitMs`: before=0.0000, after=0.0000, deltaMs=0.0000, interpretation=stable
- `runtime.txnPhase.scopedValidateMs`: before=0.0000, after=0.0000, deltaMs=0.0000, interpretation=stable
- `runtime.txnPhase.sourceSyncMs`: before=0.0000, after=0.0000, deltaMs=0.0000, interpretation=stable
- `runtime.txnPhase.txnPreludeMs`: before=0.0000, after=0.0000, deltaMs=0.0000, interpretation=stable

