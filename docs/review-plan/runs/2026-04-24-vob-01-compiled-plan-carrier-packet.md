# VOB-01 Compiled-plan Carrier Packet

## Meta

| field | value |
| --- | --- |
| artifact_kind | `implementation-proof` |
| obligation_id | `VOB-01` |
| related_surface_candidate | `SURF-002` |
| owner | `coordination-main-agent` |
| execution_topology | `fallback-local` |
| status | `executed-partial` |
| decision_question | `能否定义最小 internal ScenarioCompiledPlan + ScenarioRunSession carrier，并让一个 scenario step 发出现有 reason-link feed` |

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | `SC-D`, `SC-F` |
| target_caps | `CAP-15`, `CAP-18` |
| related_projections | `PROJ-07` |
| related_collisions | `none open` |
| required_proofs | `PF-08` |
| coverage_kernel | `single truth`, `verification boundary`, `evidence boundary`, `fixture-local-until-promoted` |
| non_claims | public Runtime facade, compare truth, full fixtures/env compiler, report summary exactness |
| generator_hypothesis | a minimal compiled-plan carrier can own scenario step execution without becoming authoring surface |

## Minimal Contract

Internal types:

- `ScenarioCompiledPlan`
- `ScenarioCompiledStep`
- `ScenarioRunSession`

Minimum fields:

- `planId`
- `steps`
- `stepId`
- `runId`

Execution rule:

- `runScenarioCompiledPlan(plan, session)` runs steps in order
- each step receives the `ScenarioRunSession`
- steps emit evidence through existing proof-kernel services
- no public `Runtime.trial` route is introduced
- no compare summary is produced

## Proof Requirement

Executable proof must show:

- one compiled plan runs one step
- the step can emit one `ScenarioCarrierEvidenceFeed` reason-link row
- emitted event stays in `EvidencePackage.events`
- `ScenarioRunSession.runId` matches proof kernel session
- compare and summary stay untouched

## Executed Step

Touched files:

- [scenarioCompiledPlanCarrier.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/src/internal/verification/scenarioCompiledPlanCarrier.ts)
- [VerificationProofKernelScenarioCompiledPlanCarrier.contract.test.ts](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/packages/logix-core/test/Contracts/VerificationProofKernelScenarioCompiledPlanCarrier.contract.test.ts)

Landed contract:

- `ScenarioCompiledPlan`
- `ScenarioCompiledStep`
- `ScenarioRunSession`
- `makeScenarioRunSession`
- `runScenarioCompiledPlan`

The proof runs one compiled step under proof-kernel context. The step emits an existing `ScenarioCarrierEvidenceFeed` reason-link row through `emitScenarioFormArtifactReasonLinkFixture`.

## Status Delta

| item | before | after if proof lands |
| --- | --- | --- |
| `SURF-002` | `under-review` | `under-review` |
| `VOB-01` | `conditional` | `conditional` |
| `CAP-15` | `partial` | `partial` |
| `CAP-18` | `partial` | `partial` |
| compiled-plan carrier | `missing` | `retained-harness internal carrier proven` |

## Promotion Boundary

This packet still does not claim:

- full `fixtures/env + steps + expect` compiler
- public `Runtime.trial(mode="scenario")`
- compare-ready evidence summary
- final `CAP-15` closure

The next promotion gate after this packet is a scenario fixture adapter that maps one real `fixtures/env + steps + expect` fixture into this internal carrier.

## Verification Used

```bash
pnpm vitest run packages/logix-core/test/Contracts/VerificationProofKernelScenarioCompiledPlanCarrier.contract.test.ts packages/logix-core/test/internal/verification/ScenarioBundlePatchRef.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormArtifactBundlePatchRef.contract.test.ts packages/logix-core/test/internal/verification/ScenarioCarrierEvidenceFeed.contract.test.ts
pnpm -C packages/logix-core typecheck
```

## Result

- `4` test files passed
- `7` tests passed
- `packages/logix-core` typecheck passed

## Next Action

Open the scenario fixture adapter packet. The next proof must map one `fixtures/env + steps + expect` fixture into `ScenarioCompiledPlan` without opening public `Runtime.trial(mode="scenario")` or compare truth.
