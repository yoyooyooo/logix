# Adversarial Performance Matrix

**Status:** staged local evidence pipeline
**Created:** 2026-05-12
**Scope:** shared matrix for P0/P1/P2 kernel performance convergence

## Current Decision

The adversarial matrix is the shared evidence base for kernel performance convergence. It is not a single benchmark patch and it does not optimize runtime by itself. It forces each local optimization to answer:

```text
which cell changed
which phase changed
whether total improvement moved cost into another phase
which claim the evidence can support
which claim remains forbidden
```

## Matrix Identity

```text
matrixId: logix.adversarial.runtime.v1
matrixHash: artifact-provided sha256 hash required for hard claims
profiles:
- adversarial-quick   # clue only
- adversarial-default # focused hard-claim minimum
- adversarial-soak    # release/final cutover evidence
```

## Required Hot Paths

| Hot path | Existing alias | Owner |
|---|---|---|
| `fieldKernel.negativeDirtyPattern` | `negativeBoundaries.dirtyPattern` | dirtyPlan / selector authority |
| `fieldKernel.convergeTxnCommit` | `converge.txnCommit` | field-kernel converge |
| `fieldKernel.formListScopeCheck` | `form.listScopeCheck` | form/list field-kernel |
| `fieldKernel.sourceExternalStoreIngest` | `externalStore.ingest.tickNotify` | source/external store |
| `runtimeStore.noTearingTickNotify` | `runtimeStore.noTearing.tickNotify` | selector/store/React host |
| `react.strictSuspenseJitter` | `react.strictSuspenseJitter` | React host scheduling |
| `diagnostics.overhead` | `diagnostics.overhead` | diagnostics/off/light/full |
| `txnQueue.directIdle` | `txnQueue.directIdle` | transaction direct-idle queue |
| `dispatchShell.fixedCost` | `dispatchShell.fixedCost` | dispatch fixed-cost shell |
| `examples.runtimeWitness` | `examples.runtimeWitness` | isolated runtime example witness |
| `examples.playgroundNoiseIsolation` | `examples.playgroundNoiseIsolation` | playground/product noise boundary |

## Required Axes

Each matrix cell should include:

```text
profile: adversarial-quick | adversarial-default | adversarial-soak
diagnosticsLevel: off | light | full
steps: 100 | 400 | 800 | 1200 | 2000 | 5000
rows: 10 | 30 | 100 | 300 | 1000
watchers: 1 | 32 | 128 | 256 | 512 | 2048
dirtyRootsRatio: 0 | 0.01 | 0.05 | 0.2 | 0.5 | 0.75 | 0.9 | 1
patternKind: exactEmpty | repeatedStable | alternatingTwoStable | randomHighCardinality | sawtoothCardinality | slidingWindowOverlap | graphChangeInvalidation | listIndexExplosion | warmupPhaseShift | unknownWrite
uniquePatternPoolSize: 8 | 64 | 512 | 4096
topology: flatIndependent | chain | fanout | fanin | deepNested | listRows | sourceKeyDependent
selectorKind: exactFieldValue | fieldValuesObject | broadFunctionSelector | readlessSelector | dynamicFallback
sourceKeyMode: stableSameKey | stableChangingKey | highCardinalityKey | undefinedInactive | oscillatingUndefined
seed: number
```

## Classifier

Use the local classifier when diff evidence exists:

```bash
pnpm exec tsx packages/logix-perf-evidence/scripts/ci.adversarial-matrix-report.ts \
  --diff specs/231-adversarial-performance-matrix/perf/diff/local.default.diff.json \
  --before specs/231-adversarial-performance-matrix/perf/before/local.default.json \
  --after specs/231-adversarial-performance-matrix/perf/after/local.default.json \
  --profile adversarial-default \
  --out specs/231-adversarial-performance-matrix/perf/reports/local.default.md \
  --json-out specs/231-adversarial-performance-matrix/perf/reports/local.default.json
```

The script reads existing evidence only. It does not collect benchmarks.

## Artifact Integrity

Hard adversarial matrix claims require the evidence artifact to provide `matrixHash`. If the report prints `matrixHashSource=computed-fallback`, the hash was reconstructed locally for diagnostics and cannot support a hard claim.

## Cost / Risk Migration

Do not call a result successful when:

```text
converge.txnCommit improves but selectorRouteMs regresses
dirtyPlanComputeMs improves but sourceKeyEvalMs regresses
runtimeStoreNotifyMs improves but reactRenderMs or renderCount regresses
diagnostics.full improves but diagnostics.off allocation/object count increases
auto/full ratio improves but fallbackCount or dirtyAllCount increases
```

Hard performance success requires comparable default/soak evidence, artifact `matrixHash`, required hot paths present, zero hard failures, no missing suites, no timeouts, no unexplained stability warnings, and no unexplained migrated cost or risk.

## Claim Boundary

Allowed only for hard default/soak success:

```text
Adversarial matrix hard gates passed for the reported matrix/profile scope.
No migration was detected in the reported phase/counter ledger.
```

Forbidden without additional authority:

```text
Global Runtime performance improved.
No regressions exist globally.
React performance improved globally.
Quick/adversarial-quick evidence proves release-safe performance.
```
