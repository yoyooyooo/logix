# Kernel Performance Convergence Report

- Schema: 1
- Generated at: 2026-05-12T00:00:00.000Z
- Profile: quick
- Classification: provisional
- Claim strength: clue
- UNKNOWN/missing is not PASS.
- This report makes no broad performance success claim.

## Stages

| Stage | Status | Evidence Refs |
| --- | --- | --- |
| adversarialMatrix | validated |  |
| P0 | validated |  |
| P1 | validated |  |
| P2 | validated |  |

## Gates

| Gate | Severity | Status | Detail |
| --- | --- | --- | --- |
| diff.comparable | hard | pass | comparable=true |
| profile.hardClaimEligible | clue | fail | profile=quick; quick/smoke evidence is a diagnostic clue only. |
| summary.regressions | hard | pass | regressions=0 |
| summary.budgetExceeded | hard | pass | budgetExceeded=0 |
| summary.timeouts | hard | pass | timeouts=0 |
| summary.stabilityWarnings | hard | pass | stabilityWarnings=0 |
| summary.missingSuites | hard | pass | missingSuites=0 |
| stages.allValidatedOrImplemented | hard | pass | All convergence stages are implemented or validated in the manifest. |
| requiredSuites.presentAndPassing | hard | pass | All required convergence suites are present and passing in the manifest. |
| migration.noUnacceptedCostOrRisk | hard | pass | migratedCost=0 and migratedRisk=0 |
| counter:dirtyPlan.unknownWrite | hard | pass | dirtyPlan.unknownWrite=0 |
| counter:dirtyPlan.missingRegistry | hard | pass | dirtyPlan.missingRegistry=0 |
| counter:dirtyPlan.dirtyAll | hard | pass | dirtyPlan.dirtyAll=0 |
| counter:dirtyPlan.nonFieldAuthority | hard | pass | dirtyPlan.nonFieldAuthority=0 |
| counter:dirtyPlan.legacyDirtyInput | hard | pass | dirtyPlan.legacyDirtyInput=0 |
| counter:source.fullFallback | hard | pass | source.fullFallback=0 |
| counter:source.rowFullScan | hard | pass | source.rowFullScan=0 |
| counter:source.keyEval.unrelatedMutation | hard | pass | source.keyEval.unrelatedMutation=0 |
| counter:selector.evaluateAll | hard | pass | selector.evaluateAll=0 |
| counter:selector.dirtyAllFallback | hard | pass | selector.dirtyAllFallback=0 |
| counter:selector.nonFieldAuthorityFallback | hard | pass | selector.nonFieldAuthorityFallback=0 |
| counter:txnQueue.directIdleQueueWaitNonZero | hard | pass | txnQueue.directIdleQueueWaitNonZero=0 |
| counter:txnQueue.directIdleBackpressureNonZero | hard | pass | txnQueue.directIdleBackpressureNonZero=0 |
| counter:dispatch.noTopicFanoutAlloc | hard | pass | dispatch.noTopicFanoutAlloc=0 |
| counter:runtimeStore.runSyncFallbackAfterBoot | hard | pass | runtimeStore.runSyncFallbackAfterBoot=0 |
| counter:runtimeStore.retainedTopicLeak | hard | pass | runtimeStore.retainedTopicLeak=0 |
| counter:diagnosticsOff.payloadCount | hard | pass | diagnosticsOff.payloadCount=0 |
| counter:listEvidence.stringNormalizeHotPath | hard | pass | listEvidence.stringNormalizeHotPath=0 |
| counter:examples.kernelPlaygroundCostMixed | hard | pass | examples.kernelPlaygroundCostMixed=0 |
| counter:examples.publicResidueViolation | hard | pass | examples.publicResidueViolation=0 |

## Watched Counters

| Counter | Value | Passed |
| --- | ---: | --- |
| dirtyPlan.unknownWrite | 0 | true |
| dirtyPlan.missingRegistry | 0 | true |
| dirtyPlan.dirtyAll | 0 | true |
| dirtyPlan.nonFieldAuthority | 0 | true |
| dirtyPlan.legacyDirtyInput | 0 | true |
| source.fullFallback | 0 | true |
| source.rowFullScan | 0 | true |
| source.keyEval.unrelatedMutation | 0 | true |
| selector.evaluateAll | 0 | true |
| selector.dirtyAllFallback | 0 | true |
| selector.nonFieldAuthorityFallback | 0 | true |
| txnQueue.directIdleQueueWaitNonZero | 0 | true |
| txnQueue.directIdleBackpressureNonZero | 0 | true |
| dispatch.noTopicFanoutAlloc | 0 | true |
| runtimeStore.runSyncFallbackAfterBoot | 0 | true |
| runtimeStore.retainedTopicLeak | 0 | true |
| diagnosticsOff.payloadCount | 0 | true |
| listEvidence.stringNormalizeHotPath | 0 | true |
| examples.kernelPlaygroundCostMixed | 0 | true |
| examples.publicResidueViolation | 0 | true |

## Required Suites

| Suite | Status |
| --- | --- |
| adversarial.matrix.requiredHotPaths | pass |
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
- notes: Template shape only. Replace with local migration ledger before any hard claim.

## Blockers

- profile.hardClaimEligible: profile=quick; quick/smoke evidence is a diagnostic clue only.

## Missing Evidence

- none

## Allowed Claims

- Kernel P0/P1/P2 convergence structural gates are clean for the manifest scope.
- Evidence is quick/smoke or otherwise clue-only and cannot support a hard performance success claim.

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
- Template only. Replace with local evidence after running default/soak collection.
