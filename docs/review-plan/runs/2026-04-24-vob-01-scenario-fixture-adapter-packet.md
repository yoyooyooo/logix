# VOB-01 Scenario Fixture Adapter Packet

## Meta

| field | value |
| --- | --- |
| artifact_kind | `implementation-proof` |
| obligation_id | `VOB-01` |
| related_surface_candidate | `SURF-002` |
| owner | `coordination-main-agent` |
| execution_topology | `fallback-local` |
| status | `executed-partial` |
| decision_question | `能否把一个最小 fixtures/env + steps + expect fixture 映射进 ScenarioCompiledPlan carrier` |

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | `SC-D`, `SC-F` |
| target_caps | `CAP-15`, `CAP-18` |
| related_projections | `PROJ-07` |
| related_collisions | `none open` |
| required_proofs | `PF-08` |
| coverage_kernel | `verification boundary`, `single truth`, `evidence boundary`, `smallest sufficient lane` |
| non_claims | public `Runtime.trial(mode="scenario")`, full scenario DSL, compare truth, host assertions |
| generator_hypothesis | one minimal fixture adapter can map structured fixture input to the internal carrier without expanding public authoring surface |

## Minimal Fixture Shape

Required top-level keys:

- `fixtures`
- `steps`
- `expect`

Supported first step kind:

- `emitReasonLink`

The adapter only supports the VOB-01 proof path:

- Form-shaped state
- list path
- row id
- field path
- Form evidence contract source seed

## Proof Requirement

Executable proof must show:

- fixture object compiles to `ScenarioCompiledPlan`
- compiled plan has one step
- executing the plan emits the expected `ScenarioCarrierEvidenceFeed`
- `expect` stays declarative and does not become compare truth
- summary remains untouched

## Expected Status Delta

| item | before | after if proof lands |
| --- | --- | --- |
| `SURF-002` | `under-review` | `under-review` |
| `VOB-01` | `conditional` | `conditional` |
| `CAP-15` | `partial` | `partial` |
| `CAP-18` | `partial` | `partial` |
| fixture adapter | `missing` | `fixture-local structured adapter proven` |

## Executed Step

Touched files:

- [scenarioCompiledPlanFixtureAdapter.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/internal/verification/fixtures/scenarioCompiledPlanFixtureAdapter.ts)
- [VerificationScenarioCompiledPlanAdapter.contract.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/VerificationScenarioCompiledPlanAdapter.contract.test.ts)

Landed contract:

- `ScenarioFixture`
- `ScenarioFixtureStep`
- `ScenarioFixtureReasonLinkStep`
- `compileScenarioFixtureToPlan`

The proof maps one `fixtures/env + steps + expect` fixture into `ScenarioCompiledPlan`, executes it through `runScenarioCompiledPlan`, and emits one `ScenarioCarrierEvidenceFeed` reason-link row.

Lifecycle note:

- this adapter is `fixture-local`
- `fixtures/env + steps + expect` is a verification coordinate, but this file is not the final scenario compiler
- any reuse must pass `2026-04-24-vob-01-verification-artifact-lifecycle-review.md`

## Promotion Boundary

This packet still does not claim:

- public scenario trial facade
- complete `dispatch / await / read / call / tick` step language
- complete `equals / includes / exists / count / changed` assertion language
- compare-ready evidence summary

The next gate after this packet is a narrow scenario expectation evaluator that consumes fixture `expect` against emitted evidence without creating compare truth.

## Verification Used

```bash
pnpm vitest run packages/logix-core/test/Contracts/VerificationScenarioCompiledPlanAdapter.contract.test.ts packages/logix-core/test/Contracts/VerificationProofKernelScenarioCompiledPlanCarrier.contract.test.ts packages/logix-core/test/internal/verification/ScenarioBundlePatchRef.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormArtifactBundlePatchRef.contract.test.ts packages/logix-core/test/internal/verification/ScenarioCarrierEvidenceFeed.contract.test.ts
pnpm -C packages/logix-core typecheck
```

## Result

- `5` test files passed
- `8` tests passed
- `packages/logix-core` typecheck passed

## Next Action

Run verification artifact lifecycle review before expanding the expectation evaluator.
