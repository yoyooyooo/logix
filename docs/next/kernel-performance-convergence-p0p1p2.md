# Kernel Performance Convergence P0/P1/P2

**Status:** staged local-execution package
**Created:** 2026-05-12
**Scope:** kernel performance convergence after `Kernel Performance Evidence Lock`

## Current Decision

This document freezes the P0/P1/P2 performance convergence plan as a staged implementation stream. It does not claim that performance is already fixed. It defines what local agents must implement, measure, and report before any hard claim can be made.

For the long-running collection, analysis, pressure-knob, and CI artifact workflow, use [Kernel Performance Observability Standard](../standards/kernel-performance-observability-standard.md). This page remains the 231-235 convergence contract; the observability standard is the reusable process that should carry later performance waves.

The controlling chain is:

```text
StateTransaction dirtyPlan
  -> field-kernel converge / validate / source
  -> SelectorGraph dirty/read overlap
  -> RuntimeStore topic notify
  -> React ExternalStore / useSelector
  -> examples / playground witness separation
```

The current source/docs/spec snapshot already has focused tax waves for field-kernel dirty work, selector notify, runtime transaction fixed cost, source/externalStore ingest, diagnostics-off sentinels, and kernel evidence lock. This package connects them into one execution order and one final stage gate.

## Stage Map

| Stage | Spec | Role | Hard Exit |
|---|---|---|---|
| Matrix | `specs/231-adversarial-performance-matrix` | Shared adversarial matrix, phase attribution, cost migration classifier | default/soak comparable matrix exists |
| P0 | `specs/232-p0-kernel-precision-fallback-closure` | dirtyPlan/source/selector fallback elimination and direct-idle guard | zero fallback counters on canonical examples and default matrix |
| P1 | `specs/233-p1-kernel-fixed-cost-and-diagnostics-closure` | dispatch/store/externalStore/diagnostics/list evidence fixed-cost closure | no migrated cost to store/React/diagnostics/list |
| P2 | `specs/234-p2-examples-playground-perf-isolation` | runtime examples vs product playground cost separation | playground/editor cost excluded from kernel claim |
| Final Gate | `ci.kernel-performance-convergence-stage-gate.ts` | local report classifier | `classification=complete`, `claimStrength=hard` |

## Non-Goals

- Do not add public API, root exports, public selector namespaces, or public performance toggles.
- Do not change user-visible runtime semantics to win benchmarks.
- Do not hide fallbacks behind broad `ok` or `pass` labels.
- Do not treat quick/smoke evidence as release-safe.
- Do not edit packed XML/Repomix snapshots.

## P0 Execution Contract

P0 is the only stage allowed to touch canonical precision gates first. It owns:

```text
dirtyPlan.unknownWrite
dirtyPlan.missingRegistry
dirtyPlan.dirtyAll
dirtyPlan.nonFieldAuthority
dirtyPlan.legacyDirtyInput
source.fullFallback
source.rowFullScan
source.keyEval.unrelatedMutation
selector.evaluateAll
selector.dirtyAllFallback
selector.nonFieldAuthorityFallback
txnQueue.directIdleQueueWaitNonZero
txnQueue.directIdleBackpressureNonZero
```

Hard exit requires these counters to be present and zero under default/soak evidence, and the corresponding suites to pass.

## P1 Execution Contract

P1 is only admissible after P0 fallback counters are clean or explicitly isolated. It owns:

```text
dispatch.noTopicFanoutAlloc
runtimeStore.runSyncFallbackAfterBoot
runtimeStore.retainedTopicLeak
diagnosticsOff.payloadCount
listEvidence.stringNormalizeHotPath
```

Hard exit requires no migrated cost from dispatch/transaction improvements into selector route, RuntimeStore notify, React render fanout, diagnostics-off payloads, or list evidence materialization.

## P2 Execution Contract

P2 isolates example and playground noise. It owns:

```text
examples.kernelPlaygroundCostMixed
examples.publicResidueViolation
examples.runtimeWitness
examples.playgroundNoiseIsolation
```

Runtime example witnesses may support kernel claims only when Monaco/Sandpack/type-bundle/editor/worker cost is excluded or separately reported.

## Evidence Rule

Hard performance success requires:

```text
profile = default | soak | adversarial-default | adversarial-soak
comparable = true
regressions = 0
budgetExceeded = 0
timeouts = 0
stabilityWarnings = 0
missingSuites = 0
all required suites present + pass
all required counters present + zero
all stages implemented or validated
migration.migratedCost = 0 unless accepted by maintainer authority
migration.migratedRisk = 0 unless accepted by maintainer authority
```

Local workstation evidence is only a preflight signal for this stream. It can expose blockers quickly, but it cannot replace CI or a dedicated stable runner for 231-235 hard convergence claims. The hard evidence authority is an artifact chain produced on a controlled runner and retained as CI artifacts.

The dedicated chain is:

```text
.github/workflows/logix-perf-evidence-structure.yml
  -> schema / assembly / stage-gate structure checks
.github/workflows/logix-perf-convergence.yml
  -> default perf collect base/head
  -> perf diff
  -> ci.adversarial-matrix-report.ts
  -> examples/playground browser P2 logs when enabled
  -> ci.kernel-performance-convergence-assembly-input.ts
  -> assemble-kernel-performance-convergence-manifest.ts
  -> ci.kernel-performance-convergence-stage-gate.ts
  -> uploaded artifact: perf/convergence/**
.github/workflows/logix-perf-convergence-soak.yml
  -> soak profile collection through the same reusable convergence chain
```

Daily or per-push observability should use the split described by the observability standard:

```text
logix-perf (evidence structure)
  -> evidence plumbing gate
logix-perf (knob snapshot)
  -> .github/workflows/logix-perf-knob-snapshot.yml
logix-perf (trend analyze)
  -> .github/workflows/logix-perf-trend-analyze.yml
logix-perf (convergence)
  -> .github/workflows/logix-perf-convergence.yml
logix-perf (convergence soak)
  -> .github/workflows/logix-perf-convergence-soak.yml
```

`logix-perf (quick)` and `logix-perf (sweep)` remain useful diagnostics and capacity exploration. PR/push snapshot artifacts are current-state evidence, not improvement claims. PR/push `logix-perf (convergence)` artifacts are comparable candidate evidence, not hard completion by themselves. They become final 235 authority only when default and soak evidence are explicitly assembled through the final convergence manifest and pass the final gate.

Allowed claim after full success:

```text
Kernel P0/P1/P2 convergence hard gates passed for the manifest scope.
```

Forbidden unless independently proven:

```text
Global Runtime performance improved.
No regressions exist globally.
React performance improved globally.
FieldKernel is optimal.
Quick/smoke evidence proves release-safe performance.
```

## Implementation Reconciliation Addendum — 2026-05-12

The convergence stream now includes cloud-owned implementation bridges in addition to the staged specs:

```text
packages/logix-perf-evidence/scripts/assemble-kernel-performance-convergence-manifest.ts
packages/logix-perf-evidence/scripts/ci.kernel-performance-convergence-assembly-input.ts
packages/logix-perf-evidence/scripts/ci.examples-playground-isolation-report.ts
packages/logix-react/src/internal/store/RuntimeExternalStore.ts
```

These bridge raw local or CI reports and sentinel snapshots into the final convergence manifest. They do not create performance proof by themselves. Local agents should not reimplement the stage plan from `tasks.md`; they should apply the patch, run the focused tests, collect default/soak or adversarial-default/soak evidence, assemble the manifest, and run the final gate. CI/stable-runner artifacts are required before the final result is treated as hard convergence evidence.

The final report path is fixed to:

```text
specs/235-kernel-performance-convergence-final-gate/perf/reports/convergence.<profile>.md
specs/235-kernel-performance-convergence-final-gate/perf/reports/convergence.<profile>.json
```

`specs/231-adversarial-performance-matrix/perf/**` remains the matrix evidence input area. It is not the final convergence report authority.
