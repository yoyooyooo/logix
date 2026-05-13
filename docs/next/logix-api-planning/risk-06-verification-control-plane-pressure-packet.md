---
title: RISK-06 Verification Control Plane Pressure Packet
status: proof-refreshed
version: 3
---

# RISK-06 Verification Control Plane Pressure Packet

## 目标

把 `RISK-06` 拆成 verification control plane、scenario carrier feed、report shell、expectation evaluator 与 compare / perf admissibility，验证 retained harness 不会反向冻结成 public authoring surface、第二 report truth、第二 evidence envelope 或 compare truth。

本页不承担 authority，不冻结 exact surface，不启动 root `Runtime.compare` 产品化。

Postscript after `TASK-006`: artifact-local helper modules used by this packet have been demoted to test fixtures. Production verification internals keep retained harness only.

## Source

- [frozen-api-shape-risk-lanes.md](./frozen-api-shape-risk-lanes.md)
- [../../ssot/capability/03-frozen-api-shape.md](../../ssot/capability/03-frozen-api-shape.md)
- [../../ssot/form/08-capability-decomposition-api-planning-harness.md](../../ssot/form/08-capability-decomposition-api-planning-harness.md)
- [../../ssot/runtime/09-verification-control-plane.md](../../ssot/runtime/09-verification-control-plane.md)
- [imp-004-verification-retained-harness-implementation-packet.md](./imp-004-verification-retained-harness-implementation-packet.md)
- [imp-005-compare-perf-admissibility-implementation-packet.md](./imp-005-compare-perf-admissibility-implementation-packet.md)
- [post-conv-implementation-task-queue.md](./post-conv-implementation-task-queue.md)

## Scope

| field | value |
| --- | --- |
| risk_id | `RISK-06` |
| packet_id | `RISK-06-verification-control-plane-pressure-packet` |
| packet_kind | `verification + proof-refresh` |
| active_phase | `risk-lane` |
| target_scenarios | `SC-C`, `SC-D`, `SC-E`, `SC-F` |
| target_caps | `CAP-09`, `CAP-15`, `CAP-17`, `CAP-18` |
| target_vobs | `VOB-01`, `VOB-02`, `VOB-03` |
| target_projection | `PROJ-07` |
| target_enablers | `IE-07`, `IE-08` |
| target_proofs | `PF-08`, `PF-09` |
| related_collisions | `COL-05`, `COL-07` closed |
| public_surface_budget | no new public concept |

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | `SC-C`, `SC-D`, `SC-E`, `SC-F` |
| target_caps | `CAP-09`, `CAP-15`, `CAP-17`, `CAP-18`, `VOB-01..VOB-03` |
| related_projections | `PROJ-07` |
| related_collisions | `COL-05`, `COL-07` |
| required_proofs | `PF-08`, `PF-09` |
| coverage_kernel | `runtime.check / runtime.trial / runtime.compare` own control-plane stages; `fixtures/env + steps + expect` stays verification input only |
| decision_policy | keep report shell single, carrier internal, compare admissibility separate from correctness truth |
| non_claims | public scenario carrier, full expectation language, compare productization, raw evidence default compare surface |
| generator_hypothesis | current retained harness can prove evidence and admissibility boundaries without promoting verification artifact vocabulary into public API |

## Current Evidence Inventory

| evidence | current state | implication |
| --- | --- | --- |
| report shell | `VerificationControlPlaneReport` contract rejects stage-specific report kind | no second report truth |
| scenario carrier feed | feed records evidence events and leaves `EvidencePackage.summary` undefined | no second evidence summary |
| reason link proof checks | Form state, row-scoped, artifact, and submit link proof checks use canonical `reasonSlotId` from test fixtures | `CAP-15 / CAP-17 / CAP-18` remain linked |
| compiled plan carrier | plan/session harness emits controlled evidence events | carrier can remain retained harness |
| compiled-plan fixture adapter | fixture-only input compiles to internal plan | public scenario vocabulary remains unfrozen |
| expectation evaluator | fixture-only evaluator checks event existence and does not write evidence summary | no compare truth ownership |
| artifact registry | trial artifacts remain deterministic and registry-backed | report materialization stays bounded |
| compare admissibility | fixture helper emits stable digests and `correctnessVerdict="not-owned"` | `PF-09` stays admissibility-only |

## Gap Analysis

| gap id | gap | why it matters | expected closure |
| --- | --- | --- | --- |
| `R06-G1` | IMP-004 and IMP-005 were separate proof packets | risk lane needs one recovery packet | run combined PF-08 / PF-09 gate and index the result |
| `R06-G2` | retained harness and fixture names look product-like | could freeze implementation vocabulary accidentally | lifecycle, boundary guard, and non-claims stay explicit |
| `R06-G3` | compare/perf proof can be misread as root compare productization | `TASK-003` is deferred authority-intake | keep output decision separate from productization |
| `R06-G4` | expectation evaluator can be mistaken for compare truth | it currently reads events only | keep negative assertion and proof reference |

## Decision

Current frozen API shape survives `RISK-06` analysis.

Verification control plane remains closed for current matrix scope, but only as proof refresh and retained harness. `TASK-003` stays deferred and must not be started from generic continuation.

After `R06-S1`, this packet closes `RISK-06` for the current matrix scope.

## Proof Refresh Result

| step id | result | evidence |
| --- | --- | --- |
| `R06-S1` | `passed` | combined PF-08 / PF-09 gate passed across report shell, scenario carrier, reason links, compiled plan, compiled-plan fixture adapter, expectation evaluator, artifact registry, and compare admissibility |

Changed files:

- no production or test file changed by `RISK-06`

## Negative Assertions

- `fixtures/env + steps + expect` remains verification input and cannot enter authoring surface.
- scenario carrier feed stays internal and only records evidence events.
- expectation evaluator reads evidence events and cannot write `EvidencePackage.summary`.
- `VerificationControlPlaneReport` remains the only report shell.
- `runtime.compare` remains frozen only as control-plane stage; productization beyond current matrix requires explicit authority intake.
- compare / perf admissibility cannot own correctness verdict.
- raw evidence, raw trace, artifact digest, and benchmark result cannot become default compare truth.

## Close Predicate

`RISK-06` is closed for current matrix scope because all are true:

- report contract keeps one `VerificationControlPlaneReport` shell.
- scenario carrier feed does not write summary truth.
- expectation evaluator does not own compare truth.
- retained harness names remain lifecycle-controlled, and artifact-local helpers are demoted-test-fixture.
- compare / perf proof emits stable digests with `correctnessVerdict="not-owned"`.
- `TASK-003` remains deferred and outside generic risk-lane continuation.

## Reopen Bar

Open a new collision or authority writeback only if implementation proves one of these:

- scenario proof requires public carrier / verification artifact vocabulary.
- expectation evaluator must own compare truth.
- compare requires raw evidence or raw trace as default protocol.
- report materializer needs a second report object.
- retained harness names are imported as final runtime vocabulary.
- root `Runtime.compare` productization is explicitly requested.

## Validation Plan

Minimum targeted gates:

```bash
pnpm vitest run packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts packages/logix-core/test/observability/TrialRunEvidenceDemo.regression.test.ts packages/logix-core/test/Contracts/VerificationProofKernelScenarioFeed.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierReasonLinkFeed.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierRowScopedReasonLink.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormStateReasonLink.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormArtifactBundlePatchRef.contract.test.ts packages/logix-core/test/Contracts/VerificationProofKernelScenarioCompiledPlanCarrier.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCompiledPlanAdapter.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioExpectationEvaluation.contract.test.ts packages/logix-core/test/internal/verification/ScenarioBundlePatchRef.contract.test.ts packages/logix-core/test/internal/verification/ScenarioCarrierEvidenceFeed.contract.test.ts packages/logix-core/test/TrialRunArtifacts/Artifacts.registry.test.ts packages/logix-core/test/TrialRunArtifacts/Artifacts.determinism.test.ts packages/logix-core/test/Contracts/VerificationComparePerfAdmissibilityEvidence.contract.test.ts
pnpm -C packages/logix-core typecheck
```

## Validation Result

Ran:

```bash
pnpm vitest run packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts packages/logix-core/test/observability/TrialRunEvidenceDemo.regression.test.ts packages/logix-core/test/Contracts/VerificationProofKernelScenarioFeed.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierReasonLinkFeed.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierRowScopedReasonLink.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormStateReasonLink.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormArtifactBundlePatchRef.contract.test.ts packages/logix-core/test/Contracts/VerificationProofKernelScenarioCompiledPlanCarrier.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCompiledPlanAdapter.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioExpectationEvaluation.contract.test.ts packages/logix-core/test/internal/verification/ScenarioBundlePatchRef.contract.test.ts packages/logix-core/test/internal/verification/ScenarioCarrierEvidenceFeed.contract.test.ts packages/logix-core/test/TrialRunArtifacts/Artifacts.registry.test.ts packages/logix-core/test/TrialRunArtifacts/Artifacts.determinism.test.ts packages/logix-core/test/Contracts/VerificationComparePerfAdmissibilityEvidence.contract.test.ts
```

Result:

- targeted RISK-06 gate: `15` files passed, `24` tests passed
- `packages/logix-core` typecheck passed

## Output Decision

This packet is consumed by [risk-lane-closure-check.md](./risk-lane-closure-check.md).

Reason:

- `RISK-06` current matrix surface risk is closed by proof refresh.
- `RISK-05` has since been closed by its own packet.
- `TASK-003` remains deferred.

## 当前一句话结论

`RISK-06` 当前不要求重开 frozen API shape；verification retained harness 可以继续作为 proof substrate，但不产品化 scenario carrier、expectation language、raw evidence compare 或 root compare route。
