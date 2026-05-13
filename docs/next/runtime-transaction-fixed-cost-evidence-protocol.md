# Evidence Protocol

## Evidence Layers

### Layer 1 — Structural Sentinels

Use structural tests before benchmark claims:

```text
patchObjectMaterializeCount.light = 0
snapshotObjectMaterializeCount.light = 0
debugEventAllocCount.off = 0
joinSplitInTxnWindowCount = 0
dirtyAllFallbackCount.p1Gate = 0
commitPublishIterationCount.noSubscribers = 0
onCommitHookCloneCount.noHooks = 0
```

### Layer 2 — Same-Commit A/B

Use `210` when the branch is too fluid for old-vs-new comparability.

```text
baseline mode: old shell branch in the same commit
fastPath mode: new shell branch in the same commit
```

This is a local diagnostic. It can guide implementation but does not replace final before/after evidence.

### Layer 3 — Focused Default-Profile Diff

Use focused dispatch shell collection:

```bash
pnpm perf collect -- --profile default   --files test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx   --out specs/211-focused-perf-evidence-and-tax-migration-gate/perf/before.browser.dispatchShell.<sha>.<envId>.default.json

pnpm perf collect -- --profile default   --files test/browser/perf-boundaries/dispatch-shell-fixed-cost.test.tsx   --out specs/211-focused-perf-evidence-and-tax-migration-gate/perf/after.browser.dispatchShell.<sha-or-dev>.<envId>.default.json

pnpm perf diff --   --before specs/211-focused-perf-evidence-and-tax-migration-gate/perf/before.browser.dispatchShell.<sha>.<envId>.default.json   --after specs/211-focused-perf-evidence-and-tax-migration-gate/perf/after.browser.dispatchShell.<sha-or-dev>.<envId>.default.json   --out specs/211-focused-perf-evidence-and-tax-migration-gate/perf/diff.browser.dispatchShell.before__after.<envId>.default.json
```

### Layer 4 — Final Tax Migration Report

Classify result as one of:

```text
tax_removed
tax_migrated
inconclusive
failed
```

## Hard Claim Rules

Hard performance claim requires all of:

```text
profile=default or soak
meta.comparability.comparable=true
summary.regressions=0
matrixId/matrixHash unchanged
no stabilityWarning
env/config not drifted
structural sentinels pass
phase deltas explain where cost moved
```

`quick` is only a clue. Non-comparable evidence is only a clue. Same-commit A/B is only a local diagnostic unless followed by comparable default-profile diff.
