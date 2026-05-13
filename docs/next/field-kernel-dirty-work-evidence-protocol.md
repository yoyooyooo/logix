# Evidence Protocol — Field Kernel Dirty Work Wave

## Evidence Layers

```text
Layer 1: structural sentinels
Layer 2: focused local tests
Layer 3: same-commit A/B if needed for localization
Layer 4: comparable before/after focused evidence
Layer 5: broad/soak validation
```

## Hard Claim Requirements

Hard performance claim requires:

```text
profile = default or soak
before/after git dirty=false
same matrixHash
same browser/runtime environment or accepted normalized env
comparability.comparable=true
summary.regressions=0
summary.budgetViolations=0
warnings=[] or all warnings explained and accepted
no timeout
no missing suite
phase evidence present
fallback/allocation sentinels pass
tax migration report clean
```

## Clue-Only Evidence

Do not use these for hard claims:

```text
quick or smoke profile
same-commit A/B only
single run without diff
dirty worktree evidence
non-comparable diff
missing suite or unavailable metrics
human-observed responsiveness
```

## Primary Suites

```text
converge.steps / converge.txnCommit
converge.timeSlicing.txnCommit
form.listScopeCheck
externalStore.ingest.tickNotify
negativeBoundaries.dirtyPattern as supporting guard
```

## Watched Evidence Names

The report gate accepts both final `fieldKernel.*` evidence and current browser perf aliases. Missing or unavailable watched evidence keeps the report clue-only.

```text
fieldKernel.converge*
fieldKernel.validate*
fieldKernel.source*
fieldKernel.externalStore*
fieldKernel.dirtyPlan*
fieldKernel.fallback*
fieldKernel.diagnosticsOff*
converge.*
validate.*
source.*
externalStore.*
dirtyPlan.*
cache.size/cache.hit/cache.miss/cache.evict/cache.invalidate
diagnostics.level
workload.modules/workload.ticksPerRun/workload.externalStores
```

## Tax Migration Rules

Classify as `tax_migrated` if total improves but any watched area increases without accepted explanation:

```text
converge decision/execution
validate static-ir/list incremental
source key eval / sourceSync
externalStore scheduled flush / urgent delay
fallback reason count
allocation/materialization count
diagnostics/off payload construction
```

## Allowed Claims

- Focused field-kernel dirty-work evidence supports improvement in `<suite/path>`.
- Structural sentinels pass for `<tax point>`.
- Formal broader runtime claim is deferred.

## Forbidden Claims

- Runtime performance improved globally.
- No regressions exist.
- All field-kernel dirty work is fixed.
- Production performance improved globally.
