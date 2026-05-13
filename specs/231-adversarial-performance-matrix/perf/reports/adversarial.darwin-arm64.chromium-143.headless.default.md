# Adversarial Performance Matrix Report

classification: blocked
claimStrength: none
matrixId: logix-browser-perf-matrix-v1
matrixHash: c8f2c4cb626be089a9fb4636a9d16b70ee6e4d82afc2ad9ce44a3ce3d1a906fc
matrixHashSource: artifact
profile: adversarial-default
envId: darwin.arm64.chromium.143-0-7499-4.headless
comparable: true
- UNKNOWN/missing is not PASS.
- Quick/adversarial-quick evidence is diagnostic only.

## Required Hot Paths

| hotPath | present | pass | budgetExceeded | systemic | tailOnly | migratedCost | migratedRisk | inconclusive | firstFail |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| fieldKernel.negativeDirtyPattern | true | 0 | 0 | 1 | 0 | 0 | 0 | 0 | fieldKernel.negativeDirtyPattern::suite |
| fieldKernel.convergeTxnCommit | true | 0 | 0 | 1 | 0 | 0 | 0 | 0 | fieldKernel.convergeTxnCommit::suite |
| fieldKernel.formListScopeCheck | true | 0 | 0 | 1 | 0 | 0 | 0 | 0 | fieldKernel.formListScopeCheck::suite |
| fieldKernel.sourceExternalStoreIngest | true | 1 | 0 | 0 | 0 | 0 | 0 | 0 |  |
| runtimeStore.noTearingTickNotify | true | 0 | 0 | 1 | 0 | 0 | 0 | 0 | runtimeStore.noTearingTickNotify::suite |
| react.strictSuspenseJitter | true | 0 | 0 | 1 | 0 | 0 | 0 | 0 | react.strictSuspenseJitter::suite |
| diagnostics.overhead | true | 0 | 0 | 1 | 0 | 0 | 0 | 0 | diagnostics.overhead::suite |
| txnQueue.directIdle | true | 0 | 0 | 1 | 0 | 0 | 0 | 0 | txnQueue.directIdle::suite |
| dispatchShell.fixedCost | true | 0 | 0 | 1 | 0 | 0 | 0 | 0 | dispatchShell.fixedCost::suite |
| examples.runtimeWitness | false | 0 | 0 | 0 | 0 | 0 | 0 | 0 |  |
| examples.playgroundNoiseIsolation | false | 0 | 0 | 0 | 0 | 0 | 0 | 0 |  |

## Top Cells

| cellId | hotPath | status | axes |
| --- | --- | --- | --- |
| converge.timeSlicing.txnCommit::suite | converge.timeSlicing.txnCommit | systemic | {} |
| fieldKernel.convergeTxnCommit::suite | fieldKernel.convergeTxnCommit | systemic | {} |
| diagnostics.overhead::suite | diagnostics.overhead | systemic | {} |
| dispatchShell.fixedCost::suite | dispatchShell.fixedCost | systemic | {} |
| fieldKernel.formListScopeCheck::suite | fieldKernel.formListScopeCheck | systemic | {} |
| fieldKernel.negativeDirtyPattern::suite | fieldKernel.negativeDirtyPattern | systemic | {} |
| react.bootResolve::suite | react.bootResolve | systemic | {} |
| react.strictSuspenseJitter::suite | react.strictSuspenseJitter | systemic | {} |
| runtimeStore.noTearingTickNotify::suite | runtimeStore.noTearingTickNotify | systemic | {} |
| tickScheduler.yieldToHost.backlog::suite | tickScheduler.yieldToHost.backlog | systemic | {} |
| txnQueue.directIdle::suite | txnQueue.directIdle | systemic | {} |
| watchers.clickToDomStable::suite | watchers.clickToDomStable | systemic | {} |
| watchers.clickToPaint::suite | watchers.clickToPaint | systemic | {} |

## Cost Migration

- none

## Risk Migration

- none

## Blockers

- summary.regressions=5
- summary.timeouts=2
- summary.stabilityWarnings=2
- converge.timeSlicing.txnCommit::suite: systemic
- fieldKernel.convergeTxnCommit::suite: systemic
- diagnostics.overhead::suite: systemic
- dispatchShell.fixedCost::suite: systemic
- fieldKernel.formListScopeCheck::suite: systemic
- fieldKernel.negativeDirtyPattern::suite: systemic
- react.bootResolve::suite: systemic
- react.strictSuspenseJitter::suite: systemic
- runtimeStore.noTearingTickNotify::suite: systemic
- tickScheduler.yieldToHost.backlog::suite: systemic
- txnQueue.directIdle::suite: systemic
- watchers.clickToDomStable::suite: systemic
- watchers.clickToPaint::suite: systemic

## Missing Evidence

- Missing required hot paths: examples.runtimeWitness, examples.playgroundNoiseIsolation

## Allowed Claims

- Adversarial matrix is blocked by failed hard gates.

## Forbidden Claims

- Global Runtime performance improved.
- No regressions exist globally.
- React performance improved globally.
- The selector notification path is optimal.
- The field-kernel converge planner is optimal.
- Quick/adversarial-quick evidence proves release-safe performance.
