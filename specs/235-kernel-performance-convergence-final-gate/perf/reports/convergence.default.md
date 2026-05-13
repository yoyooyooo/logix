# Kernel Performance Convergence Report

- Schema: 1
- Generated at: 2026-05-12T17:12:41Z
- Profile: adversarial-default
- Classification: blocked
- Claim strength: none
- UNKNOWN/missing is not PASS.
- This report makes no broad performance success claim.

## Stages

| Stage | Status | Evidence Refs |
| --- | --- | --- |
| adversarialMatrix | blocked | specs/231-adversarial-performance-matrix/perf/reports/adversarial.darwin-arm64.chromium-143.headless.default.json, specs/235-kernel-performance-convergence-final-gate/perf/after.darwin-arm64.chromium-143.headless.default.json, specs/235-kernel-performance-convergence-final-gate/perf/before.darwin-arm64.chromium-143.headless.default.json, specs/235-kernel-performance-convergence-final-gate/perf/diff.darwin-arm64.chromium-143.headless.default.json |
| P0 | blocked | specs/235-kernel-performance-convergence-final-gate/perf/diff.darwin-arm64.chromium-143.headless.default.json |
| P1 | blocked | specs/235-kernel-performance-convergence-final-gate/perf/diff.darwin-arm64.chromium-143.headless.default.json |
| P2 | validated | specs/234-p2-examples-playground-perf-isolation/perf/examples-playground.default.input.json, specs/234-p2-examples-playground-perf-isolation/perf/logs/test-browser-live-real-carrier.default.log, specs/234-p2-examples-playground-perf-isolation/perf/logs/test-browser-playground.default.log, specs/234-p2-examples-playground-perf-isolation/perf/reports/examples-playground.default.json |

## Gates

| Gate | Severity | Status | Detail |
| --- | --- | --- | --- |
| diff.comparable | hard | pass | comparable=true |
| profile.hardClaimEligible | clue | pass | profile=adversarial-default; hard convergence evidence may be interpreted if hard gates pass. |
| summary.regressions | hard | fail | regressions=5 |
| summary.budgetExceeded | hard | pass | budgetExceeded=0 |
| summary.timeouts | hard | fail | timeouts=2 |
| summary.stabilityWarnings | hard | fail | stabilityWarnings=2 |
| summary.missingSuites | hard | pass | missingSuites=0 |
| stages.allValidatedOrImplemented | hard | fail | Blocked stages: adversarialMatrix, P0, P1 |
| requiredSuites.presentAndPassing | hard | fail | Required suite failure/timeout: adversarial.matrix.requiredHotPaths:fail |
| migration.noUnacceptedCostOrRisk | hard | pass | migratedCost=0 and migratedRisk=0 |
| counter:dirtyPlan.unknownWrite | hard | missing | dirtyPlan.unknownWrite counter is missing; stage convergence cannot be claimed. |
| counter:dirtyPlan.missingRegistry | hard | missing | dirtyPlan.missingRegistry counter is missing; stage convergence cannot be claimed. |
| counter:dirtyPlan.dirtyAll | hard | missing | dirtyPlan.dirtyAll counter is missing; stage convergence cannot be claimed. |
| counter:dirtyPlan.nonFieldAuthority | hard | missing | dirtyPlan.nonFieldAuthority counter is missing; stage convergence cannot be claimed. |
| counter:dirtyPlan.legacyDirtyInput | hard | missing | dirtyPlan.legacyDirtyInput counter is missing; stage convergence cannot be claimed. |
| counter:source.fullFallback | hard | missing | source.fullFallback counter is missing; stage convergence cannot be claimed. |
| counter:source.rowFullScan | hard | missing | source.rowFullScan counter is missing; stage convergence cannot be claimed. |
| counter:source.keyEval.unrelatedMutation | hard | missing | source.keyEval.unrelatedMutation counter is missing; stage convergence cannot be claimed. |
| counter:selector.evaluateAll | hard | missing | selector.evaluateAll counter is missing; stage convergence cannot be claimed. |
| counter:selector.dirtyAllFallback | hard | missing | selector.dirtyAllFallback counter is missing; stage convergence cannot be claimed. |
| counter:selector.nonFieldAuthorityFallback | hard | missing | selector.nonFieldAuthorityFallback counter is missing; stage convergence cannot be claimed. |
| counter:txnQueue.directIdleQueueWaitNonZero | hard | pass | txnQueue.directIdleQueueWaitNonZero=0 |
| counter:txnQueue.directIdleBackpressureNonZero | hard | pass | txnQueue.directIdleBackpressureNonZero=0 |
| counter:dispatch.noTopicFanoutAlloc | hard | missing | dispatch.noTopicFanoutAlloc counter is missing; stage convergence cannot be claimed. |
| counter:runtimeStore.runSyncFallbackAfterBoot | hard | missing | runtimeStore.runSyncFallbackAfterBoot counter is missing; stage convergence cannot be claimed. |
| counter:runtimeStore.retainedTopicLeak | hard | missing | runtimeStore.retainedTopicLeak counter is missing; stage convergence cannot be claimed. |
| counter:diagnosticsOff.payloadCount | hard | missing | diagnosticsOff.payloadCount counter is missing; stage convergence cannot be claimed. |
| counter:listEvidence.stringNormalizeHotPath | hard | missing | listEvidence.stringNormalizeHotPath counter is missing; stage convergence cannot be claimed. |
| counter:examples.kernelPlaygroundCostMixed | hard | pass | examples.kernelPlaygroundCostMixed=0 |
| counter:examples.publicResidueViolation | hard | pass | examples.publicResidueViolation=0 |

## Watched Counters

| Counter | Value | Passed |
| --- | ---: | --- |
| dirtyPlan.unknownWrite |  | false |
| dirtyPlan.missingRegistry |  | false |
| dirtyPlan.dirtyAll |  | false |
| dirtyPlan.nonFieldAuthority |  | false |
| dirtyPlan.legacyDirtyInput |  | false |
| source.fullFallback |  | false |
| source.rowFullScan |  | false |
| source.keyEval.unrelatedMutation |  | false |
| selector.evaluateAll |  | false |
| selector.dirtyAllFallback |  | false |
| selector.nonFieldAuthorityFallback |  | false |
| txnQueue.directIdleQueueWaitNonZero | 0 | true |
| txnQueue.directIdleBackpressureNonZero | 0 | true |
| dispatch.noTopicFanoutAlloc |  | false |
| runtimeStore.runSyncFallbackAfterBoot |  | false |
| runtimeStore.retainedTopicLeak |  | false |
| diagnosticsOff.payloadCount |  | false |
| listEvidence.stringNormalizeHotPath |  | false |
| examples.kernelPlaygroundCostMixed | 0 | true |
| examples.publicResidueViolation | 0 | true |

## Required Suites

| Suite | Status |
| --- | --- |
| adversarial.matrix.requiredHotPaths | fail |
| negativeBoundaries.dirtyPattern | pass |
| converge.txnCommit | pass |
| form.listScopeCheck | pass |
| externalStore.ingest.tickNotify | pass |
| runtimeStore.noTearing.tickNotify | pass |
| react.strictSuspenseJitter | pass |
| diagnostics.overhead | pass |
| txnQueue.directIdle | pass |
| dispatchShell.fixedCost | pass |
| examples.runtimeWitness | pass |
| examples.playgroundNoiseIsolation | pass |

## Risk / Cost Migration

- migratedCost: 0
- migratedRisk: 0
- acceptedByAuthority: false

## Blockers

- summary.regressions: regressions=5
- summary.timeouts: timeouts=2
- summary.stabilityWarnings: stabilityWarnings=2
- stages.allValidatedOrImplemented: Blocked stages: adversarialMatrix, P0, P1
- requiredSuites.presentAndPassing: Required suite failure/timeout: adversarial.matrix.requiredHotPaths:fail

## Missing Evidence

- counter:dirtyPlan.unknownWrite: dirtyPlan.unknownWrite counter is missing; stage convergence cannot be claimed.
- counter:dirtyPlan.missingRegistry: dirtyPlan.missingRegistry counter is missing; stage convergence cannot be claimed.
- counter:dirtyPlan.dirtyAll: dirtyPlan.dirtyAll counter is missing; stage convergence cannot be claimed.
- counter:dirtyPlan.nonFieldAuthority: dirtyPlan.nonFieldAuthority counter is missing; stage convergence cannot be claimed.
- counter:dirtyPlan.legacyDirtyInput: dirtyPlan.legacyDirtyInput counter is missing; stage convergence cannot be claimed.
- counter:source.fullFallback: source.fullFallback counter is missing; stage convergence cannot be claimed.
- counter:source.rowFullScan: source.rowFullScan counter is missing; stage convergence cannot be claimed.
- counter:source.keyEval.unrelatedMutation: source.keyEval.unrelatedMutation counter is missing; stage convergence cannot be claimed.
- counter:selector.evaluateAll: selector.evaluateAll counter is missing; stage convergence cannot be claimed.
- counter:selector.dirtyAllFallback: selector.dirtyAllFallback counter is missing; stage convergence cannot be claimed.
- counter:selector.nonFieldAuthorityFallback: selector.nonFieldAuthorityFallback counter is missing; stage convergence cannot be claimed.
- counter:dispatch.noTopicFanoutAlloc: dispatch.noTopicFanoutAlloc counter is missing; stage convergence cannot be claimed.
- counter:runtimeStore.runSyncFallbackAfterBoot: runtimeStore.runSyncFallbackAfterBoot counter is missing; stage convergence cannot be claimed.
- counter:runtimeStore.retainedTopicLeak: runtimeStore.retainedTopicLeak counter is missing; stage convergence cannot be claimed.
- counter:diagnosticsOff.payloadCount: diagnosticsOff.payloadCount counter is missing; stage convergence cannot be claimed.
- counter:listEvidence.stringNormalizeHotPath: listEvidence.stringNormalizeHotPath counter is missing; stage convergence cannot be claimed.

## Allowed Claims

- Kernel P0/P1/P2 convergence is blocked; use blockers to choose the next local fix.

## Forbidden Claims

- Global Runtime performance improved.
- No regressions exist globally.
- React performance improved globally.
- FieldKernel is optimal.
- Selector notification path is optimal.
- Source/list row scope is fully optimized.
- Examples prove kernel performance without isolated runtime evidence.
- Quick/smoke evidence proves release-safe performance.

## Cloud LLM Validation Limitations

- Cloud LLM did not run pnpm install, package tests, browser perf collection, default/soak perf diff, or local CI.
- Cloud LLM generated a staged convergence patch and evidence contract from uploaded source/docs/spec snapshots only.
- Any hard performance or release claim requires local comparable default or soak evidence after applying and implementing the stages.
- Cloud LLM did not run this local default perf collection, browser collection, soak attempt, diff, assembly, or final gate.
- Soak before collection did not produce JSON in this environment; no soak before-after diff exists.
