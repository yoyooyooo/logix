# FieldKernel Dirty Work Tax Migration Report Template

Generate this report with:

```bash
pnpm perf ci:field-kernel-dirty-work-tax-report -- \
  --diff <diff.json> \
  --before <before.json> \
  --after <after.json> \
  --profile default \
  --out <report.md> \
  --json-out <report.json>
```

```text
suiteIds:
profile:
classification:
claimStrength:
inputs:
  before:
  after:
  diff:
gates:
  comparable:
  regressions:
  budgetViolations:
  warnings:
  pointStatus:
  phaseEvidence:
  fallbackEvidence:
  allocationEvidence:
totalFindings:
phaseFindings:
fallbackFindings:
allocationFindings:
migratedCosts:
classification_reason:
allowed_claims:
forbidden_claims:
```

Classification rules:

- `tax_removed`: comparable default/soak focused evidence, no regressions/budget violations/warnings/timeouts, total metric improves, watched dirty-work evidence does not grow.
- `stable_guarded`: focused structural dirty-work sentinels pass but no hard total improvement is claimed.
- `tax_migrated`: total metric improves but any watched FieldKernel dirty-work counter grows.
- `inconclusive`: quick/smoke, dirty, non-comparable, drifted, missing suite, missing metric evidence, missing watched dirty-work evidence, or otherwise clue-only evidence.
- `failed`: timeout/failed point, or hard-eligible clean evidence with regression, budget violation, or total regression.

Watched dirty-work evidence prefixes and current browser aliases:

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

Forbidden claims always remain forbidden:

```text
Global Runtime performance improved.
No global regressions.
All field-kernel dirty work is fixed.
FieldKernel is optimal.
Production performance improved globally.
```
