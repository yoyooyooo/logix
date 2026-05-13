---
title: TASK-006 Verification Artifact Demotion Scope
status: frozen
version: 1
---

# TASK-006 Verification Artifact Demotion Scope

## 目标

关闭 `TASK-002 / RISK-06` 留下的 verification artifact lifecycle residual：fixture-local helper 不再留在生产 `src/internal/verification`，只作为 test fixture/support 服务 `PF-08 / PF-09`。

本页不承担 authority，不冻结 final scenario compiler vocabulary，不启动 root `Runtime.compare` 产品化，不新增 public verification surface。

## Source

- [post-conv-implementation-task-queue.md](./post-conv-implementation-task-queue.md)
- [task-002-verification-artifact-lifecycle-cleanup-scope.md](./task-002-verification-artifact-lifecycle-cleanup-scope.md)
- [risk-06-verification-control-plane-pressure-packet.md](./risk-06-verification-control-plane-pressure-packet.md)
- [../../ssot/runtime/09-verification-control-plane.md](../../ssot/runtime/09-verification-control-plane.md)

## Scope

| field | value |
| --- | --- |
| task_id | `TASK-006` |
| status | `done` |
| execution_topology | `fallback-local` |
| fallback_reason | current repo policy only enables subagent when explicitly requested in the current turn |
| owner_lane | verification lifecycle |
| source_packets | `TASK-002`, `RISK-06` |
| target_vobs | `VOB-01`, `VOB-02`, `VOB-03` |
| proof_gates | `PF-08`, `PF-09` |
| public_surface_budget | no new public concept |

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | `SC-C`, `SC-D`, `SC-E`, `SC-F` |
| target_caps | `CAP-09`, `CAP-15`, `CAP-17`, `CAP-18`, `VOB-01..VOB-03` |
| related_projections | `PROJ-07` |
| related_collisions | `COL-05`, `COL-07` closed |
| required_proofs | `PF-08`, `PF-09` |
| coverage_kernel | `verification-artifact-lifecycle-required`, `fixture-local-until-promoted`, `verification boundary`, `evidence boundary` |
| decision_policy | demote scenario-specific fixture helpers out of production internals while keeping retained harness executable |
| non_claims | public scenario trial facade, final scenario compiler vocabulary, root compare productization, report summary rewrite |
| generator_hypothesis | proof helpers can live under test fixture without reducing `PF-08 / PF-09` strength |

## Lifecycle Decision

| artifact | previous_state | next_state | decision |
| --- | --- | --- | --- |
| legacy `scenarioReasonLinkProbe` helper family | `fixture-local` | `demoted-test-fixture` | production internals removed; current fixture is `packages/logix-core/test/internal/verification/fixtures/scenarioCarrierReasonLinkFixture.ts` |
| legacy `scenarioWitnessAdapter` helper family | `fixture-local` | `demoted-test-fixture` | production internals removed; current fixture is `packages/logix-core/test/internal/verification/fixtures/scenarioCompiledPlanFixtureAdapter.ts` |
| legacy `scenarioExpectationProbe` helper family | `fixture-local` | `demoted-test-fixture` | production internals removed; current fixture is `packages/logix-core/test/internal/verification/fixtures/scenarioEvidenceExpectationFixture.ts` |
| legacy `comparePerfAdmissibilityProbe` helper family | `fixture-local` | `demoted-test-fixture` | production internals removed; current fixture is `packages/logix-core/test/internal/verification/fixtures/comparePerfAdmissibilityFixture.ts` |
| `packages/logix-core/src/internal/verification/scenarioCarrierFeed.ts` | `retained-harness` | `retained-harness` | kept in production internal as evidence event substrate |
| `packages/logix-core/src/internal/verification/scenarioCompiledPlanCarrier.ts` | `retained-harness` | `retained-harness` | kept in production internal as runtime-owned compiled plan carrier |
| `packages/logix-core/src/internal/verification/evidenceCollector.ts` `recordScenarioCarrierEvidenceFeed` | `retained-harness` | `retained-harness` | kept as narrow evidence recording seam |

## Implementation Delta

| file | change |
| --- | --- |
| `packages/logix-core/test/internal/verification/fixtures/scenarioCarrierReasonLinkFixture.ts` | added demoted test fixture for reason-link proof helpers |
| `packages/logix-core/test/internal/verification/fixtures/scenarioCompiledPlanFixtureAdapter.ts` | added demoted test fixture for minimal fixture-to-plan proof adapter |
| `packages/logix-core/test/internal/verification/fixtures/scenarioEvidenceExpectationFixture.ts` | added demoted test fixture for event-exists expectation proof |
| `packages/logix-core/test/internal/verification/fixtures/comparePerfAdmissibilityFixture.ts` | added demoted test fixture for compare/perf admissibility digests |
| legacy `packages/logix-core/src/internal/verification/*Probe.ts` and `scenarioWitnessAdapter.ts` routes | removed fixture-local helpers from production internals |
| legacy `packages/logix-core/test/Contracts/Verification*Probe*.contract.test.ts` routes | replaced by carrier, adapter, evaluation, evidence, and guard-named contracts |
| `packages/logix-core/test/Contracts/VerificationFixtureIsolation.guard.test.ts` | added guard that production verification internals do not reintroduce artifact-local legacy helper modules or process names |

## Result

| item | result |
| --- | --- |
| `PF-08` | preserved through retained harness plus test fixtures |
| `PF-09` | preserved through test fixture admissibility digest proof |
| production `src/internal/verification` | no fixture-local helper module remains |
| public verification API | unchanged |
| final scenario compiler vocabulary | still unfrozen |
| root compare productization | still deferred by `TASK-003` |

## Validation

Ran:

```bash
pnpm vitest run packages/logix-core/test/Contracts/VerificationFixtureIsolation.guard.test.ts packages/logix-core/test/Contracts/VerificationProofKernelScenarioFeed.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierReasonLinkFeed.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierRowScopedReasonLink.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormStateReasonLink.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormArtifactBundlePatchRef.contract.test.ts packages/logix-core/test/Contracts/VerificationProofKernelScenarioCompiledPlanCarrier.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCompiledPlanAdapter.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioExpectationEvaluation.contract.test.ts packages/logix-core/test/internal/verification/ScenarioCarrierEvidenceFeed.contract.test.ts packages/logix-core/test/internal/verification/ScenarioBundlePatchRef.contract.test.ts packages/logix-core/test/Contracts/VerificationComparePerfAdmissibilityEvidence.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormSubmitReasonLink.contract.test.ts
```

Result:

- targeted verification lifecycle gate: `13` files passed, `17` tests passed

## Non-claims

- no public `Runtime.trial(mode="scenario")` exact facade
- no full scenario step language
- no full expectation language
- no production fixture adapter
- no production expectation evaluator
- no compare-ready normalized summary
- no root compare productization
- no package export change

## Reopen Bar

Reopen `TASK-006` only if one of these becomes true:

- production `src/internal/verification` imports or defines demoted fixture-local helpers again
- a test fixture starts influencing public surface or authority law
- `PF-08 / PF-09` can no longer run without production fixture helpers
- `Runtime.compare` productization is explicitly requested and needs a production admissibility route

## 当前一句话结论

`TASK-006` 已把 fixture-local verification helpers 从生产 internals 降到 test fixture/support，并用边界测试兜住回流风险。剩余 concrete residual 只有 deferred `TASK-003`。
