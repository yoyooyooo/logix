# Kernel Performance Evidence Lock

Status: proposed local gate
Owner: runtime/kernel performance evidence
Created: 2026-05-12

## Purpose

This gate freezes the minimum evidence required before the kernel hot path can be called locked for a local repo state.
It does not optimize code by itself. It prevents evidence drift by requiring the same report to cover dirtyPlan, field-kernel source/list, selector route, RuntimeStore/ExternalStore, React host pressure, and claim language.

## Lock Inputs

A local run must provide a manifest consumed by:

```bash
pnpm exec tsx packages/logix-perf-evidence/scripts/ci.kernel-performance-evidence-lock.ts \
  --manifest specs/230-kernel-performance-evidence-lock/perf/manifest.local.default.json \
  --out specs/230-kernel-performance-evidence-lock/perf/report.local.default.md \
  --json-out specs/230-kernel-performance-evidence-lock/perf/report.local.default.json
```

The manifest must include:

- `profile`: `default`, `soak`, `adversarial-default`, or `adversarial-soak` for hard claims; `quick`, `smoke`, and `adversarial-quick` are clues only.
- `comparable=true`.
- `regressions=0`, `budgetExceeded=0`, `timeouts=0`, `stabilityWarnings=0`, `missingSuites=0`.
- all required suites present and passing.
- all watched fallback counters present and equal to zero.

## Required Suites

- `negativeBoundaries.dirtyPattern`
- `converge.txnCommit`
- `form.listScopeCheck`
- `externalStore.ingest.tickNotify`
- `runtimeStore.noTearing.tickNotify`
- `react.strictSuspenseJitter`
- `diagnostics.overhead`
- `txnQueue.directIdle`
- `dispatchShell.fixedCost`
- `examples.runtimeWitness`
- `examples.playgroundNoiseIsolation`

## Watched Fallback Counters

- `dirtyPlan.unknownWrite`
- `dirtyPlan.missingRegistry`
- `dirtyPlan.dirtyAll`
- `dirtyPlan.nonFieldAuthority`
- `dirtyPlan.legacyDirtyInput`
- `source.fullFallback`
- `source.rowFullScan`
- `source.keyEval.unrelatedMutation`
- `selector.evaluateAll`
- `selector.dirtyAllFallback`
- `selector.nonFieldAuthorityFallback`
- `txnQueue.directIdleQueueWaitNonZero`
- `txnQueue.directIdleBackpressureNonZero`
- `dispatch.noTopicFanoutAlloc`
- `runtimeStore.runSyncFallbackAfterBoot`
- `runtimeStore.retainedTopicLeak`
- `diagnosticsOff.payloadCount`
- `listEvidence.stringNormalizeHotPath`
- `examples.kernelPlaygroundCostMixed`
- `examples.publicResidueViolation`

## Classification

| Classification | Meaning |
|---|---|
| `locked` | All hard gates pass and profile is hard-claim eligible. |
| `provisional` | Hard counters are clean but evidence is quick/smoke or otherwise clue-only. |
| `blocked` | A hard gate failed. Fix the underlying source/test/evidence issue before claiming closure. |
| `incomplete` | Required evidence is missing. Missing is not PASS. |

## Claim Rules

Allowed only for `locked`:

- Kernel Performance Evidence Lock hard gates passed for the manifest scope.
- Canonical hot-path fallback counters are zero for the provided default/soak evidence manifest.

Forbidden in all classifications:

- Global Runtime performance improved.
- No regressions exist globally.
- React performance improved globally.
- FieldKernel is optimal.
- Selector notification path is optimal.
- Quick/smoke evidence proves release-safe performance.

## Migration Watch

Do not classify a tax as removed when cost moves into:

- dirty root hashing or `Int32Array.from`;
- `Array.from` on dirty raw paths;
- list evidence clone and sorted-index materialization;
- source row-scope changed-index materialization;
- externalStore pending flush retention or low-priority starvation;
- fallback reason payload construction when diagnostics are off;
- selector evaluate-all or RuntimeStore broadcast fallback;
- React render fanout or strict suspense jitter.

## Cloud LLM Limitation

The cloud-generated patch cannot run local package tests, browser tests, default/soak perf collection, or CI. Local handoff must record this explicitly and may only claim a generated patch plus evidence contract until local evidence is produced.
