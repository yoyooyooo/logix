---
title: TASK-002 Verification Artifact Lifecycle Cleanup Scope
status: frozen
version: 2
---

# TASK-002 Verification Artifact Lifecycle Cleanup Scope

## 目标

把 `IMP-003 / IMP-004` 留下的 verification artifact vocabulary 风险转成可恢复、可审计的 lifecycle scope，防止 `scenario* / fixture* / expectation*` 文件在后续 proof 中无状态膨胀。

本页不冻结 final scenario compiler vocabulary，不开放 public scenario trial facade，不改 compare truth。

Postscript after `TASK-006`: the fixture-local helper modules identified here have been consumed by [task-006-verification-fixture-demotion-scope.md](./task-006-verification-fixture-demotion-scope.md) and now live only as test fixtures. The retained harness rows still apply to production internals.

## Source

- [post-conv-implementation-task-queue.md](./post-conv-implementation-task-queue.md)
- [imp-003-rule-submit-reason-implementation-packet.md](./imp-003-rule-submit-reason-implementation-packet.md)
- [imp-004-verification-retained-harness-implementation-packet.md](./imp-004-verification-retained-harness-implementation-packet.md)
- [../../ssot/runtime/09-verification-control-plane.md](../../ssot/runtime/09-verification-control-plane.md)
- [../../review-plan/runs/2026-04-24-vob-01-verification-artifact-lifecycle-review.md](../../review-plan/runs/2026-04-24-vob-01-verification-artifact-lifecycle-review.md)

## Scope

| field | value |
| --- | --- |
| task_id | `TASK-002` |
| status | `implemented-lifecycle-markers` |
| execution_topology | `fallback-local` |
| fallback_reason | current repo policy only enables subagent when explicitly requested in the current turn |
| owner_lane | verification lifecycle |
| source_packets | `IMP-003`, `IMP-004` |
| target_vobs | `VOB-01`, `VOB-03` |
| target_cap | `CAP-18` |
| proof_gate | `PF-08` |
| public_surface_budget | no public scenario trial facade |

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | `SC-C`, `SC-D`, `SC-E`, `SC-F` |
| target_caps | `VOB-01`, `VOB-03`, `CAP-18` |
| related_projections | `PROJ-07` |
| related_collisions | `COL-05` closed |
| required_proofs | `PF-08` |
| coverage_kernel | `verification-artifact-lifecycle-required`, `fixture-local-until-promoted`, `verification boundary`, `evidence boundary` |
| decision_policy | keep proof harness reusable, but block silent promotion of verification artifact vocabulary |
| non_claims | public scenario trial facade, final scenario compiler vocabulary, compare truth, report summary rewrite |
| generator_hypothesis | lifecycle markers and retained tests are enough for this cleanup wave; full renaming waits for authority route design |

## Lifecycle Classification

| artifact | lifecycle_state | decision | cleanup trigger | retained test gate |
| --- | --- | --- | --- | --- |
| `packages/logix-core/src/internal/verification/scenarioCarrierFeed.ts` | `retained-harness` | keep internal event-only feed for `VOB-01 / PF-08` | rename, move or delete when generalized evidence substrate replaces it | `VerificationProofKernelScenarioFeed.contract.test.ts`, `ScenarioCarrierEvidenceFeed.contract.test.ts` |
| `packages/logix-core/src/internal/verification/evidenceCollector.ts` `recordScenarioCarrierEvidenceFeed` | `retained-harness` | keep narrow recording seam | rename with feed or remove if feed is replaced | `ScenarioCarrierEvidenceFeed.contract.test.ts` |
| `packages/logix-core/src/internal/verification/scenarioCompiledPlanCarrier.ts` | `retained-harness` | keep internal carrier for proof pressure | promote through `runtime/09` authority request or rewrite during final scenario route design | `VerificationProofKernelScenarioCompiledPlanCarrier.contract.test.ts` |
| legacy `scenarioReasonLinkProbe` helper family | `fixture-local` | consumed by `packages/logix-core/test/internal/verification/fixtures/scenarioCarrierReasonLinkFixture.ts`; block production route dependency | delete or replace when real scenario extraction owns reason-link emission | `VerificationScenarioCarrierReasonLinkFeed.contract.test.ts`, `VerificationScenarioCarrierFormSubmitReasonLink.contract.test.ts` |
| legacy `scenarioWitnessAdapter` helper family | `fixture-local` | consumed by `packages/logix-core/test/internal/verification/fixtures/scenarioCompiledPlanFixtureAdapter.ts`; keep as one-path proof adapter only | replace after dedicated compiler proposal | `VerificationScenarioCompiledPlanAdapter.contract.test.ts` |
| legacy `scenarioExpectationProbe` helper family | `fixture-local` | consumed by `packages/logix-core/test/internal/verification/fixtures/scenarioEvidenceExpectationFixture.ts`; keep narrow exists evaluator only | replace before any broader expectation language | `VerificationScenarioExpectationEvaluation.contract.test.ts` |

## Implementation Delta

| file | change |
| --- | --- |
| `packages/logix-core/src/internal/verification/scenarioCarrierFeed.ts` | added retained-harness lifecycle marker |
| `packages/logix-core/src/internal/verification/scenarioCompiledPlanCarrier.ts` | added retained-harness lifecycle marker |
| legacy `scenarioReasonLinkProbe` helper family | classified as fixture-local; later consumed by `packages/logix-core/test/internal/verification/fixtures/scenarioCarrierReasonLinkFixture.ts` |
| legacy `scenarioWitnessAdapter` helper family | classified as fixture-local; later consumed by `packages/logix-core/test/internal/verification/fixtures/scenarioCompiledPlanFixtureAdapter.ts` |
| legacy `scenarioExpectationProbe` helper family | classified as fixture-local; later consumed by `packages/logix-core/test/internal/verification/fixtures/scenarioEvidenceExpectationFixture.ts` |

No runtime behavior changed.

## Why No Rename In This Wave

Renaming `scenario*` retained-harness files now would be premature because `runtime/09` already accepts `declaration / fixture / evidence` coordinates while exact public `Runtime.trial(mode="scenario")`, final step language and final expectation language remain unfrozen.

The current risk is silent promotion, not broken naming. Lifecycle markers plus this scope close the immediate recovery gap and give the next route design a clear demotion or promotion path.

## Proof Plan

Run:

```bash
pnpm vitest run packages/logix-core/test/Contracts/VerificationProofKernelScenarioFeed.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierReasonLinkFeed.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierRowScopedReasonLink.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormStateReasonLink.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormArtifactBundlePatchRef.contract.test.ts packages/logix-core/test/Contracts/VerificationProofKernelScenarioCompiledPlanCarrier.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCompiledPlanAdapter.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioExpectationEvaluation.contract.test.ts packages/logix-core/test/internal/verification/ScenarioCarrierEvidenceFeed.contract.test.ts packages/logix-core/test/internal/verification/ScenarioBundlePatchRef.contract.test.ts
pnpm -C packages/logix-core typecheck
```

## Status Delta

| object | previous | next |
| --- | --- | --- |
| `TASK-002` | `ready-to-scope` | `done` |
| `VOB-01` | `executable` | `executable with lifecycle markers` |
| `VOB-03` | `executable` | `unchanged` |
| `SURF-002` | `authority-linked` | `authority-linked; verification artifact vocabulary still unfrozen` |
| public scenario trial facade | absent | absent |
| compare truth | not owned | not owned |

## Non-claims

- no public `Runtime.trial(mode="scenario")` exact facade
- no full scenario step language
- no full expectation language
- no compare-ready normalized summary
- no final compiler vocabulary
- no package export change

## Reopen Bar

Reopen `TASK-002` only if one of these becomes true:

- a fixture-local file is imported by a production route as final vocabulary
- expectation evaluator writes `EvidencePackage.summary`
- scenario carrier feed becomes public authoring surface
- report materializer depends on scenario feed internals as report truth
- a new proof reuses fixture-local helpers without lifecycle state

## 当前一句话结论

`TASK-002` closed the immediate lifecycle cleanup gap by marking verification artifact files as `fixture-local` or `retained-harness`. `TASK-006` has since demoted fixture-local helpers to test fixtures while preserving proof gates. Final naming waits for a dedicated `runtime/09` route design.
