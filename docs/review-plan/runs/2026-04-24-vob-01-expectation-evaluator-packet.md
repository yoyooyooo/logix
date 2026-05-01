# VOB-01 Expectation Evaluator Packet

## Meta

| field | value |
| --- | --- |
| artifact_kind | `implementation-proof` |
| obligation_id | `VOB-01` |
| related_surface_candidate | `SURF-002` |
| owner | `coordination-main-agent` |
| execution_topology | `fallback-local` |
| status | `executed-partial` |
| decision_question | `能否让 fixture expect 消费已发出的 evidence feed，而不创建 compare truth` |

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | `SC-D`, `SC-F` |
| target_caps | `CAP-15`, `CAP-18` |
| related_projections | `PROJ-07` |
| related_collisions | `none open` |
| required_proofs | `PF-08` |
| coverage_kernel | `verification boundary`, `single truth`, `evidence boundary`, `fixture-local-until-promoted`, `verification-artifact-lifecycle-required` |
| non_claims | public `Runtime.trial(mode="scenario")`, compare truth, report summary exactness, complete expectation language |
| generator_hypothesis | a narrow expectation evaluator can prove the fixture path consumes evidence without becoming compare or report owner |

## Minimal Contract

Internal fixture types:

- `ScenarioExpectationEvaluation`
- `ScenarioExpectationCheck`

Supported expectation:

- `kind: "exists"`
- `target: "evidence.events[verification:scenario-carrier-feed]"`

Execution rule:

- run the compiled fixture plan through proof kernel
- read the returned `EvidencePackage.events`
- evaluate `expect` against the existing event stream
- leave `EvidencePackage.summary` untouched
- do not emit compare-ready normalized summary

## Executed Step

Touched files:

- [scenarioEvidenceExpectationFixture.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/internal/verification/fixtures/scenarioEvidenceExpectationFixture.ts)
- [scenarioCompiledPlanFixtureAdapter.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/internal/verification/fixtures/scenarioCompiledPlanFixtureAdapter.ts)
- [VerificationScenarioExpectationEvaluation.contract.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/VerificationScenarioExpectationEvaluation.contract.test.ts)

Landed contract:

- `scenarioCarrierFeedExistsTarget`
- `evaluateScenarioFixtureExpectations`
- fixture-local `ScenarioFixtureExpectation` narrowed to `exists`

The proof runs one fixture through `ScenarioCompiledPlan`, then evaluates the fixture expectation against emitted evidence. The result is a local evaluation object, not a compare report or report summary.

## Status Delta

| item | before | after |
| --- | --- | --- |
| `SURF-002` | `under-review` | `under-review` |
| `VOB-01` | `conditional` | `conditional` |
| `CAP-15` | `partial` | `partial` |
| `CAP-18` | `partial` | `partial` |
| expectation evaluator | `missing` | `fixture-local narrow evaluator proven` |

## Promotion Boundary

This packet still does not claim:

- full `equals / includes / exists / count / changed` expectation language
- public scenario trial facade
- compare admission
- report summary exactness
- final scenario compiler
- final `CAP-15` exact closure

## Verification Artifact Lifecycle

| artifact | lifecycle_state | cleanup trigger |
| --- | --- | --- |
| `scenarioEvidenceExpectationFixture.ts` | `fixture-local` | keep in test support while only proof tests use it; promote only after runtime/09 accepts expectation evaluator ownership |
| `scenarioCompiledPlanFixtureAdapter.ts` expectation types | `fixture-local` | expand only through a dedicated expectation-language packet; do not silently widen to compare semantics |
| expectation contract test | `retained-harness` | keep while `VOB-01` remains conditional |

## Verification Used

```bash
pnpm vitest run packages/logix-core/test/Contracts/VerificationScenarioExpectationEvaluation.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCompiledPlanAdapter.contract.test.ts packages/logix-core/test/Contracts/VerificationProofKernelScenarioCompiledPlanCarrier.contract.test.ts packages/logix-core/test/internal/verification/ScenarioBundlePatchRef.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormArtifactBundlePatchRef.contract.test.ts packages/logix-core/test/internal/verification/ScenarioCarrierEvidenceFeed.contract.test.ts
pnpm -C packages/logix-core typecheck
```

## Result

- `6` test files passed
- `9` tests passed
- `packages/logix-core` typecheck passed

## Next Action

Run a narrow promotion-readiness review for `SURF-002`.

The next review must decide whether current proof evidence is enough to request runtime/09 authority writeback, or whether another proof is required before promoting any scenario carrier vocabulary.
