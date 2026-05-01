---
title: IMP-005 Compare Perf Admissibility Implementation Packet
status: frozen
version: 2
---

# IMP-005 Compare Perf Admissibility Implementation Packet

## 目标

把 `CONV-001` 中 compare / perf admissibility 切片转成实施包，覆盖 `VOB-02`、`CAP-18` 与 `CAP-25` 的当前 admissibility boundary。

本页只承接 admissibility substrate，不产品化 root `Runtime.compare`，不冻结 public compare exact API，不让 benchmark 或 perf evidence 拥有 correctness truth。

## Source

- [implementation-ready-conversion.md](./implementation-ready-conversion.md)
- [surface-candidate-registry.md](./surface-candidate-registry.md)
- [../../ssot/form/08-capability-decomposition-api-planning-harness.md](../../ssot/form/08-capability-decomposition-api-planning-harness.md)
- [../../ssot/runtime/09-verification-control-plane.md](../../ssot/runtime/09-verification-control-plane.md)
- [../../review-plan/runs/2026-04-24-pf-09-compare-perf-admissibility-packet.md](../../review-plan/runs/2026-04-24-pf-09-compare-perf-admissibility-packet.md)
- [../../review-plan/runs/2026-04-24-pf-09-promotion-readiness-review.md](../../review-plan/runs/2026-04-24-pf-09-promotion-readiness-review.md)
- [../../review-plan/runs/2026-04-24-global-api-shape-closure-gate-after-pf-09.md](../../review-plan/runs/2026-04-24-global-api-shape-closure-gate-after-pf-09.md)

## Scope

| field | value |
| --- | --- |
| packet_id | `IMP-005` |
| status | `proof-refreshed-admissibility-only` |
| owner_lane | compare / perf |
| source_caps | `CAP-18`, `CAP-25` |
| source_vobs | `VOB-02` |
| source_projection | `PROJ-07` |
| source_collisions | `COL-07` |
| proof_gates | `PF-09` |
| public_surface_budget | no new public concept |

## Required Implementation Outcomes

| outcome | requirement |
| --- | --- |
| admissibility evidence | compare / perf can derive stable plan, fixture, evidence and environment digests |
| correctness boundary | admissibility evidence must record `correctnessVerdict: "not-owned"` |
| proof sample reuse | benchmark may consume already accepted scenario carrier digests |
| environment boundary | environment fingerprint mismatch remains an admissibility concern, not correctness truth |
| evidence boundary | raw trace and raw evidence remain drilldown material |
| public surface | no root `Runtime.compare` productization in this packet |

## Suggested File Scope

| area | likely files | allowed edits |
| --- | --- | --- |
| Compare/perf admissibility fixture | `packages/logix-core/test/internal/verification/fixtures/comparePerfAdmissibilityFixture.ts` | test fixture only after `TASK-006` |
| Scenario carrier | `packages/logix-core/src/internal/verification/scenarioCompiledPlanCarrier.ts`, `packages/logix-core/test/internal/verification/fixtures/scenarioCompiledPlanFixtureAdapter.ts`, `packages/logix-core/test/internal/verification/fixtures/scenarioEvidenceExpectationFixture.ts` | production carrier plus fixture proof substrate |
| Tests | `packages/logix-core/test/Contracts/VerificationComparePerfAdmissibilityEvidence.contract.test.ts` | keep `PF-09` executable |

Do not edit public `Runtime.compare` or CLI compare facade in this packet.

## Verification Artifact Consumption

| artifact area | decision |
| --- | --- |
| compare perf admissibility helper | demoted-test-fixture for `PF-09` |
| scenario carrier feed helpers | consumed as accepted evidence substrate only |
| expectation evaluator | consumed as proof sample admissibility support only |
| compiled-plan fixture adapter | consumed as proof input only, no final compiler promotion |

## Proof Freshness Rule

Refresh `IMP-005` whenever any of these areas change:

- compare / perf admissibility digest inputs
- scenario fixture shape
- compiled plan identity
- evidence event stream shape
- environment fingerprint contract
- `runtime/09` compare admissibility gate
- root `Runtime.compare` planning or productization

## Verification Plan

Run the admissibility gate:

```bash
pnpm vitest run packages/logix-core/test/Contracts/VerificationComparePerfAdmissibilityEvidence.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioExpectationEvaluation.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCompiledPlanAdapter.contract.test.ts packages/logix-core/test/Contracts/VerificationProofKernelScenarioCompiledPlanCarrier.contract.test.ts packages/logix-core/test/internal/verification/ScenarioCarrierEvidenceFeed.contract.test.ts
```

Then run the affected package check:

```bash
pnpm -C packages/logix-core typecheck
```

## Verification Result

Last refreshed in this packet:

```bash
pnpm vitest run packages/logix-core/test/Contracts/VerificationComparePerfAdmissibilityEvidence.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioExpectationEvaluation.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCompiledPlanAdapter.contract.test.ts packages/logix-core/test/Contracts/VerificationProofKernelScenarioCompiledPlanCarrier.contract.test.ts packages/logix-core/test/internal/verification/ScenarioCarrierEvidenceFeed.contract.test.ts
pnpm -C packages/logix-core typecheck
```

Result:

- `5` targeted tests passed
- `packages/logix-core` typecheck passed

## Implementation Decision

`IMP-005` does not need additional production code in this wave.

The existing artifact-local substrate already provides:

- stable `compiledPlanDigest`
- stable `fixtureIdentityDigest`
- stable `evidenceDigest`
- stable `environmentFingerprint`
- explicit `correctnessVerdict: "not-owned"`

This closes `PF-09` only for admissibility scope. Root `Runtime.compare` exact productization stays a later authority task.

## Reopen Bar

Reopen API planning only if implementation proves one of these:

- benchmark result starts affecting correctness verdict
- perf evidence needs raw trace as default compare surface
- environment fingerprint cannot stay stable enough for admissibility
- scenario carrier changes digest inputs and breaks reproducibility
- root `Runtime.compare` productization proposes a new public concept

## Non-claims

- no root `Runtime.compare` exact API
- no real benchmark runner integration
- no perf budget decision
- no browser perf boundary
- no correctness verdict ownership
- no public scenario carrier

## 当前一句话结论

`IMP-005` proof 已刷新，并被 `TASK-006` 消费了 compare/perf admissibility fixture demotion residual。`PF-09` 只关闭 compare / perf admissibility，root `Runtime.compare` 产品化继续后置。
