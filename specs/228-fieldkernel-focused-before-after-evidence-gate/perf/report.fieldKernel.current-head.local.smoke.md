# FieldKernel Dirty Work Tax Migration Report

- suiteIds: `converge.timeSlicing.txnCommit`, `converge.txnCommit`, `externalStore.ingest.tickNotify`, `form.listScopeCheck`
- profile: `smoke`
- classification: `inconclusive`
- claimStrength: `clue`

## Inputs
- diff: `specs/228-fieldkernel-focused-before-after-evidence-gate/perf/diff.fieldKernel.current-head.local.smoke.json`
- before: `specs/228-fieldkernel-focused-before-after-evidence-gate/perf/before.fieldKernel.current-head.local.smoke.json`
- after: `specs/228-fieldkernel-focused-before-after-evidence-gate/perf/after.fieldKernel.current-head.local.smoke.json`

## Gates
- BLOCK `profile` (clue): profile=smoke; hard claims require default or soak
- PASS `comparable` (clue): diff.meta.comparability.comparable must be true
- PASS `suiteEvidence` (clue): one or more field-kernel suites must be present: converge.steps, converge.txnCommit, converge.timeSlicing, converge.timeSlicing.txnCommit, form.listScopeCheck, externalStore.ingest, externalStore.ingest.tickNotify, negativeBoundaries.dirtyPattern
- BLOCK `regressions` (hard): summary.regressions=2
- PASS `budgetViolations` (hard): summary.budgetViolations=0
- BLOCK `warnings` (clue): git.dirty.before=true; git.dirty.after=true
- PASS `pointStatus` (hard): field-kernel before/after points must not timeout or fail
- PASS `metricEvidence` (clue): field-kernel metric deltas must be present and available
- BLOCK `phaseEvidence` (clue): field-kernel watched dirty-work evidence must be present and available

## Blockers
- profile=smoke is clue-only; hard claims require default or soak
- git dirty evidence is clue-only
- summary.regressions must be 0 for a hard claim
- watched field-kernel dirty work evidence is missing or unavailable

## Total Metrics
- `converge.timeSlicing.txnCommit:runtime.txnCommitMs`: improved=1, regressed=0, missing=0, unavailable=0, bestP95DeltaMs=-0.0200, worstP95DeltaMs=n/a
- `converge.txnCommit:runtime.decisionMs`: improved=0, regressed=0, missing=306, unavailable=51, bestP95DeltaMs=n/a, worstP95DeltaMs=n/a
- `converge.txnCommit:runtime.txnCommitMs`: improved=5, regressed=5, missing=306, unavailable=0, bestP95DeltaMs=-0.0860, worstP95DeltaMs=0.1140
- `externalStore.ingest.tickNotify:timePerIngestMs`: improved=5, regressed=0, missing=0, unavailable=0, bestP95DeltaMs=-0.3000, worstP95DeltaMs=n/a
- `form.listScopeCheck:runtime.decisionMs`: improved=0, regressed=0, missing=0, unavailable=24, bestP95DeltaMs=n/a, worstP95DeltaMs=n/a
- `form.listScopeCheck:runtime.txnCommitMs`: improved=5, regressed=0, missing=0, unavailable=0, bestP95DeltaMs=-0.1000, worstP95DeltaMs=n/a

## Watched Dirty Work
- `converge.timeSlicing.txnCommit:converge.timeSlicing.deferredDirtyPathCount`: before=1800.0000, after=1800.0000, delta=0.0000, interpretation=stable
- `converge.timeSlicing.txnCommit:converge.timeSlicing.deferredStepCount`: before=n/a, after=n/a, delta=n/a, interpretation=missing
- `converge.timeSlicing.txnCommit:converge.timeSlicing.immediateStepCount`: before=n/a, after=n/a, delta=n/a, interpretation=missing
- `converge.timeSlicing.txnCommit:converge.timeSlicing.scope`: before=n/a, after=n/a, delta=n/a, interpretation=missing
- `converge.txnCommit:converge.affectedSteps`: before=n/a, after=n/a, delta=n/a, interpretation=missing
- `converge.txnCommit:converge.decisionDurationMs`: before=n/a, after=n/a, delta=n/a, interpretation=missing
- `converge.txnCommit:converge.executedMode`: before=n/a, after=n/a, delta=n/a, interpretation=missing
- `converge.txnCommit:converge.executedSteps`: before=n/a, after=n/a, delta=n/a, interpretation=missing
- `converge.txnCommit:converge.executionDurationMs`: before=n/a, after=n/a, delta=n/a, interpretation=missing
- `converge.txnCommit:converge.outcome`: before=n/a, after=n/a, delta=n/a, interpretation=missing
- `converge.txnCommit:converge.reasons`: before=n/a, after=n/a, delta=n/a, interpretation=missing
- `converge.txnCommit:converge.requestedMode`: before=n/a, after=n/a, delta=n/a, interpretation=missing
- `converge.txnCommit:converge.totalSteps`: before=n/a, after=n/a, delta=n/a, interpretation=missing
- `externalStore.ingest.tickNotify:diagnostics.level`: before=n/a, after=n/a, delta=n/a, interpretation=missing
- `externalStore.ingest.tickNotify:workload.externalStores`: before=10.0000, after=10.0000, delta=0.0000, interpretation=stable
- `externalStore.ingest.tickNotify:workload.modules`: before=10.0000, after=10.0000, delta=0.0000, interpretation=stable
- `externalStore.ingest.tickNotify:workload.ticksPerRun`: before=1.0000, after=1.0000, delta=0.0000, interpretation=stable
- `form.listScopeCheck:cache.evict`: before=0.0000, after=0.0000, delta=0.0000, interpretation=stable
- `form.listScopeCheck:cache.hit`: before=0.0000, after=0.0000, delta=0.0000, interpretation=stable
- `form.listScopeCheck:cache.invalidate`: before=0.0000, after=0.0000, delta=0.0000, interpretation=stable
- `form.listScopeCheck:cache.miss`: before=1.0000, after=1.0000, delta=0.0000, interpretation=stable
- `form.listScopeCheck:cache.size`: before=0.0000, after=0.0000, delta=0.0000, interpretation=stable
- `form.listScopeCheck:converge.decisionBudgetMs`: before=0.5000, after=0.5000, delta=0.0000, interpretation=stable
- `form.listScopeCheck:converge.decisionDurationMs`: before=0.0000, after=0.0000, delta=0.0000, interpretation=stable
- `form.listScopeCheck:converge.executedMode`: before=n/a, after=n/a, delta=n/a, interpretation=missing
- `form.listScopeCheck:converge.outcome`: before=n/a, after=n/a, delta=n/a, interpretation=missing
- `form.listScopeCheck:converge.reasons`: before=n/a, after=n/a, delta=n/a, interpretation=missing
- `form.listScopeCheck:converge.requestedMode`: before=n/a, after=n/a, delta=n/a, interpretation=missing
- `form.listScopeCheck:diagnostics.level`: before=n/a, after=n/a, delta=n/a, interpretation=missing

## Claims
Allowed:
- Focused validation passed.

Forbidden:
- Global Runtime performance improved.
- No global regressions.
- All field-kernel dirty work is fixed.
- FieldKernel is optimal.
- Production performance improved globally.
