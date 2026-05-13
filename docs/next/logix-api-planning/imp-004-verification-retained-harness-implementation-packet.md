---
title: IMP-004 Verification Retained Harness Implementation Packet
status: frozen
version: 2
---

# IMP-004 Verification Retained Harness Implementation Packet

## 目标

把 `CONV-001` 中 verification carrier feed 与 retained harness 切片转成实施包，覆盖 `VOB-01`、`VOB-03` 与 `CAP-18` 的当前 implementation boundary。

本页不冻结 public `Runtime.trial(mode="scenario")` exact facade，不冻结 final scenario compiler vocabulary。它只记录当前哪些 verification artifact 可以保留为 retained harness，哪些仍是 fixture-local，以及后续什么时候必须删除、降级或正式重命名。

Postscript after `TASK-006`: fixture-local helper modules have been demoted to `packages/logix-core/test/internal/verification/fixtures/**`; production `src/internal/verification` keeps retained harness only.

## Source

- [implementation-ready-conversion.md](./implementation-ready-conversion.md)
- [surface-candidate-registry.md](./surface-candidate-registry.md)
- [../../ssot/form/08-capability-decomposition-api-planning-harness.md](../../ssot/form/08-capability-decomposition-api-planning-harness.md)
- [../../ssot/runtime/09-verification-control-plane.md](../../ssot/runtime/09-verification-control-plane.md)
- [../../review-plan/runs/2026-04-24-vob-01-verification-artifact-lifecycle-review.md](../../review-plan/runs/2026-04-24-vob-01-verification-artifact-lifecycle-review.md)
- [../../review-plan/runs/2026-04-24-vob-01-bundle-patch-ref-constructor-law-packet.md](../../review-plan/runs/2026-04-24-vob-01-bundle-patch-ref-constructor-law-packet.md)
- [../../review-plan/runs/2026-04-24-vob-01-route-consumption-packet.md](../../review-plan/runs/2026-04-24-vob-01-route-consumption-packet.md)
- [../../review-plan/runs/2026-04-24-vob-01-compiled-plan-carrier-packet.md](../../review-plan/runs/2026-04-24-vob-01-compiled-plan-carrier-packet.md)
- [../../review-plan/runs/2026-04-24-vob-01-scenario-fixture-adapter-packet.md](../../review-plan/runs/2026-04-24-vob-01-scenario-fixture-adapter-packet.md)
- [../../review-plan/runs/2026-04-24-vob-01-expectation-evaluator-packet.md](../../review-plan/runs/2026-04-24-vob-01-expectation-evaluator-packet.md)
- [../../review-plan/runs/2026-04-24-surf-002-promotion-readiness-review.md](../../review-plan/runs/2026-04-24-surf-002-promotion-readiness-review.md)

## Scope

| field | value |
| --- | --- |
| packet_id | `IMP-004` |
| status | `proof-refreshed-retained-harness` |
| owner_lane | verification |
| source_caps | `CAP-18` |
| source_vobs | `VOB-01`, `VOB-03` |
| source_projection | `PROJ-07` |
| source_collisions | `COL-05` |
| proof_gates | `PF-08` |
| public_surface_budget | no new public concept |

## Required Implementation Outcomes

| outcome | requirement |
| --- | --- |
| scenario carrier feed | feed remains verification internal substrate and writes only evidence events |
| compiled plan carrier | `ScenarioCompiledPlan + ScenarioRunSession` may remain as retained harness, with final placement and exact helper names unfrozen |
| compiled-plan fixture adapter | minimal adapter stays test-only until a dedicated compiler proposal promotes or replaces it |
| expectation evaluator | evaluator consumes events declaratively and does not write `EvidencePackage.summary` |
| report shell | `VerificationControlPlaneReport` remains the only canonical report shell |
| VOB-03 boundary | report materializer continues reading canonical truth and evidence summary, not scenario feed internals |
| public surface | no public scenario trial facade, no compare truth, no authoring surface |

## Artifact Lifecycle Board

| artifact | lifecycle_state | current decision | cleanup trigger |
| --- | --- | --- | --- |
| `packages/logix-core/src/internal/verification/scenarioCarrierFeed.ts` | retained-harness | may stay while tied to `VOB-01 / PF-08` | delete or rename if scenario carrier feed is replaced by a generalized evidence substrate |
| `packages/logix-core/test/internal/verification/fixtures/scenarioCarrierReasonLinkFixture.ts` | demoted-test-fixture | fixture-only reason-link proof helper | delete or replace once a real scenario extraction route owns reason-link emission |
| `packages/logix-core/src/internal/verification/scenarioCompiledPlanCarrier.ts` | retained-harness | internal carrier is accepted for proof pressure, exact final vocabulary unfrozen | promote through authority request or rewrite when final scenario route is designed |
| `packages/logix-core/test/internal/verification/fixtures/scenarioCompiledPlanFixtureAdapter.ts` | demoted-test-fixture | minimal proof adapter only | replace through dedicated compiler proposal if needed |
| `packages/logix-core/test/internal/verification/fixtures/scenarioEvidenceExpectationFixture.ts` | demoted-test-fixture | narrow `exists` evaluator only | replace before any broader expectation language |
| `packages/logix-core/src/internal/verification/evidenceCollector.ts` `recordScenarioCarrierEvidenceFeed` | retained-harness | narrow event recording seam | rename or remove if final feed shape changes |
| VOB-01 contract tests | retained-harness | current files use carrier / adapter / evaluation wording; historical fixture wording remains only in planning records | compress after final implementation route is accepted |

## Suggested File Scope

| area | likely files | allowed edits |
| --- | --- | --- |
| Verification feed | `packages/logix-core/src/internal/verification/scenarioCarrierFeed.ts`, `packages/logix-core/src/internal/verification/evidenceCollector.ts` | keep internal and event-only |
| Verification fixtures | `packages/logix-core/test/internal/verification/fixtures/scenarioCarrierReasonLinkFixture.ts`, `packages/logix-core/test/internal/verification/fixtures/scenarioEvidenceExpectationFixture.ts` | test fixture only |
| Carrier harness | `packages/logix-core/src/internal/verification/scenarioCompiledPlanCarrier.ts`, `packages/logix-core/test/internal/verification/fixtures/scenarioCompiledPlanFixtureAdapter.ts` | production carrier retained; compiled-plan fixture adapter remains test-only |
| Report shell | `packages/logix-core/src/internal/observability/**` | must keep one `VerificationControlPlaneReport` shell |
| Tests | `packages/logix-core/test/Contracts/VerificationProofKernelScenario*`, `packages/logix-core/test/internal/verification/**`, `packages/logix-core/test/observability/**` | keep `PF-08 / VOB-03` executable |

## Fixture Consumption

| fixture area | decision |
| --- | --- |
| scenario carrier feed helpers | retained-harness |
| expectation evaluator | demoted-test-fixture, no compare truth |
| compiled-plan fixture adapter | demoted-test-fixture, no final compiler vocabulary |
| compare perf admissibility helper | out of scope; handled by `IMP-005` |

## Proof Freshness Rule

Refresh `IMP-004` whenever any of these areas change:

- `runtime/09` verification evidence boundary
- scenario carrier feed event shape
- evidence collector event recording
- scenario compiled plan, run session or compiled-plan fixture adapter
- expectation evaluator semantics
- report shell, report summary, repair hint or artifact export path

## Verification Plan

Run the verification carrier and report shell gates:

```bash
pnpm vitest run packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts packages/logix-core/test/observability/TrialRunEvidenceDemo.regression.test.ts packages/logix-core/test/Contracts/VerificationProofKernelScenarioFeed.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierReasonLinkFeed.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierRowScopedReasonLink.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormStateReasonLink.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormArtifactBundlePatchRef.contract.test.ts packages/logix-core/test/Contracts/VerificationProofKernelScenarioCompiledPlanCarrier.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCompiledPlanAdapter.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioExpectationEvaluation.contract.test.ts packages/logix-core/test/internal/verification/ScenarioBundlePatchRef.contract.test.ts packages/logix-core/test/internal/verification/ScenarioCarrierEvidenceFeed.contract.test.ts packages/logix-core/test/TrialRunArtifacts/Artifacts.registry.test.ts packages/logix-core/test/TrialRunArtifacts/Artifacts.determinism.test.ts
```

Then run the affected package check:

```bash
pnpm -C packages/logix-core typecheck
```

## Verification Result

Last refreshed in this packet:

```bash
pnpm vitest run packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts packages/logix-core/test/observability/TrialRunEvidenceDemo.regression.test.ts packages/logix-core/test/Contracts/VerificationProofKernelScenarioFeed.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierReasonLinkFeed.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierRowScopedReasonLink.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormStateReasonLink.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormArtifactBundlePatchRef.contract.test.ts packages/logix-core/test/Contracts/VerificationProofKernelScenarioCompiledPlanCarrier.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCompiledPlanAdapter.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioExpectationEvaluation.contract.test.ts packages/logix-core/test/internal/verification/ScenarioBundlePatchRef.contract.test.ts packages/logix-core/test/internal/verification/ScenarioCarrierEvidenceFeed.contract.test.ts packages/logix-core/test/TrialRunArtifacts/Artifacts.registry.test.ts packages/logix-core/test/TrialRunArtifacts/Artifacts.determinism.test.ts
pnpm -C packages/logix-core typecheck
```

Result:

- `21` targeted tests passed
- `packages/logix-core` typecheck passed

## Implementation Decision

`IMP-004` does not need additional production code in this wave.

The existing implementation already provides a retained verification harness for current `PF-08` scope:

- scenario carrier feed writes event evidence only
- expectation evaluator reads events without writing summary truth
- compiled plan and compiled-plan fixture adapter can exercise one controlled verification path
- report shell stays on `VerificationControlPlaneReport`
- trial artifact registry and determinism tests keep report materialization bounded

This is not final productization of scenario execution. The vocabulary remains under lifecycle control until a later route design promotes, replaces or deletes the verification artifacts.

## Reopen Bar

Reopen API planning only if implementation proves one of these:

- scenario carrier feed needs public authoring surface
- expectation evaluator needs to own compare truth
- report materializer needs a second report object
- retained harness names start being imported as final runtime vocabulary
- `VOB-03` cannot read canonical report truth without scenario feed internals

## Non-claims

- no public `Runtime.trial(mode="scenario")` exact facade
- no full scenario step language
- no full expectation language
- no compare-ready normalized summary
- no final compiler vocabulary
- no authoring surface

## 当前一句话结论

`IMP-004` proof 已刷新，并被 `TASK-006` 消费了 fixture-local demotion residual。生产 verification artifacts 当前按 retained-harness 管理，fixture helpers 只保留为 test fixtures。`IMP-005` 仍是 compare / perf admissibility 的历史 proof packet。
