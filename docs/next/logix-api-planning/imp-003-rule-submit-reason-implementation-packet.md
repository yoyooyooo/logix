---
title: IMP-003 Rule Submit Reason Implementation Packet
status: frozen
version: 2
---

# IMP-003 Rule Submit Reason Implementation Packet

## 目标

把 `CONV-001` 中 final truth、settlement、submit backlink 与 reason evidence 切片转成实施包，覆盖 cross-row final constraint、rule submit backlink、async settlement contributor、reason slot identity 与 evidence causal link。

本页只承接实施切片，不冻结 exact surface。Form exact surface 继续由 `13` 持有，verification evidence boundary 继续由 `runtime/09` 持有。

## Source

- [implementation-ready-conversion.md](./implementation-ready-conversion.md)
- [proposal-portfolio.md](./proposal-portfolio.md)
- [surface-candidate-registry.md](./surface-candidate-registry.md)
- [../../ssot/form/08-capability-decomposition-api-planning-harness.md](../../ssot/form/08-capability-decomposition-api-planning-harness.md)
- [../../ssot/form/13-exact-surface-contract.md](../../ssot/form/13-exact-surface-contract.md)
- [../../ssot/runtime/09-verification-control-plane.md](../../ssot/runtime/09-verification-control-plane.md)
- [../../review-plan/runs/2026-04-24-pf-04-rule-submit-backlink-packet.md](../../review-plan/runs/2026-04-24-pf-04-rule-submit-backlink-packet.md)
- [../../review-plan/runs/2026-04-24-pf-08-evidence-envelope-exactness-packet.md](../../review-plan/runs/2026-04-24-pf-08-evidence-envelope-exactness-packet.md)
- [../../review-plan/runs/2026-04-24-cap-15-final-submit-linkage-packet.md](../../review-plan/runs/2026-04-24-cap-15-final-submit-linkage-packet.md)
- [../../review-plan/runs/2026-04-24-cap-15-closure-review.md](../../review-plan/runs/2026-04-24-cap-15-closure-review.md)
- [../../review-plan/runs/2026-04-24-surf-002-promotion-readiness-review.md](../../review-plan/runs/2026-04-24-surf-002-promotion-readiness-review.md)

## Scope

| field | value |
| --- | --- |
| packet_id | `IMP-003` |
| status | `proof-refreshed-with-retained-harness` |
| owner_lane | rule / submit / reason |
| source_caps | `CAP-14`, `CAP-15`, `CAP-16`, `CAP-17`, `CAP-18` |
| source_projection | `PROJ-04`, `PROJ-07` |
| source_collisions | `COL-02`, `COL-05` |
| proof_gates | `PF-04`, `PF-08` |
| public_surface_budget | no new public concept |

## Required Implementation Outcomes

| outcome | requirement |
| --- | --- |
| final truth owner | cross-row final constraints stay on rule / submit, not on companion |
| cross-row owner | row-scoped final errors preserve stable row subject and source route |
| settlement lane | field, list.item, list and root async rules lower into the same submit blocking truth |
| reason slot identity | error, pending, stale, cleanup and blocking continue sharing canonical reason slot identity |
| submit backlink | submit summary keeps a stable `submit:<seq>` reason slot |
| evidence causal link | scenario carrier feed can carry `reasonSlotId / bundlePatchRef / ownerRef / transition / retention` for current matrix scope |
| public surface | no second explain object, no public diagnostics helper, no public scenario carrier facade in this packet |

## Suggested File Scope

| area | likely files | allowed edits |
| --- | --- | --- |
| Form rules / submit | `packages/logix-form/src/internal/form/**` | only if `PF-04` regresses |
| Form exact carrier | `packages/logix-form/src/index.ts`, `packages/logix-form/src/internal/form/**` | keep `submitAttempt` and reason evidence aligned with `13` |
| React explain projection | `packages/logix-react/src/FormProjection.ts`, `packages/logix-react/src/internal/hooks/useSelector.ts` | ensure `Form.Error.field(path)` still uses the canonical selector gate |
| Core verification harness | `packages/logix-core/src/internal/verification/**` | retained-harness only; no final compiler vocabulary promotion |
| Form tests | `packages/logix-form/test/Form/Form.ListScopeUniqueWarehouse.test.ts`, `packages/logix-form/test/Form/Form.Effectful*.Submit.test.ts`, `packages/logix-form/test/Form/Form.ReasonEvidence.contract.test.ts` | keep `PF-04` executable |
| React tests | `packages/logix-react/test/Hooks/useSelector.formErrorDescriptor.test.tsx` | keep host reason projection executable |
| Core verification tests | `packages/logix-core/test/Contracts/VerificationProofKernelScenario*`, `packages/logix-core/test/internal/verification/**` | keep `PF-08` and CAP-15 bridge executable |

## Verification Artifact Consumption

| artifact area | decision |
| --- | --- |
| scenario carrier feed helpers | retained-harness for `PF-08`; final vocabulary still unfrozen |
| expectation evaluator | demoted-test-fixture after `TASK-006`; must not become compare truth |
| compiled-plan fixture adapter | demoted-test-fixture after `TASK-006`; must not become final compiler by accretion |
| form submit link fixture helper | demoted-test-fixture after `TASK-006`; delete or replace when final scenario extraction owns submit linkage |
| compare perf admissibility helper | out of scope |

## Proof Freshness Rule

Refresh `IMP-003` whenever any of these areas change:

- Form rule lowering
- submit summary and `submitAttempt` shape
- reason slot identity or source precedence
- React `Form.Error.field(path)` projection
- scenario carrier feed, bundle patch ref, expectation evaluator or compiled-plan fixture adapter
- `runtime/09` verification evidence boundary

## Verification Plan

Run the final truth and reason proof samples:

```bash
pnpm vitest run packages/logix-form/test/Form/Form.ListScopeUniqueWarehouse.test.ts packages/logix-form/test/Form/Form.EffectfulRule.Submit.test.ts packages/logix-form/test/Form/Form.EffectfulListItemRule.Submit.test.ts packages/logix-form/test/Form/Form.EffectfulListRule.Submit.test.ts packages/logix-form/test/Form/Form.EffectfulRootRule.Submit.test.ts packages/logix-form/test/Form/Form.ListCardinalityBasis.test.ts packages/logix-form/test/Form/Form.ReasonEvidence.contract.test.ts packages/logix-react/test/Hooks/useSelector.formErrorDescriptor.test.tsx
```

Run the CAP-15 / PF-08 bridge harness:

```bash
pnpm vitest run packages/logix-core/test/Contracts/VerificationScenarioCarrierFormSubmitReasonLink.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioExpectationEvaluation.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCompiledPlanAdapter.contract.test.ts packages/logix-core/test/Contracts/VerificationProofKernelScenarioCompiledPlanCarrier.contract.test.ts packages/logix-core/test/internal/verification/ScenarioBundlePatchRef.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormArtifactBundlePatchRef.contract.test.ts packages/logix-core/test/internal/verification/ScenarioCarrierEvidenceFeed.contract.test.ts
```

Then run the package checks affected by core / Form / React:

```bash
pnpm -C packages/logix-core typecheck
pnpm -C packages/logix-form typecheck
pnpm -C packages/logix-react typecheck
```

If the implementation touches shared public exports, also run:

```bash
pnpm typecheck
```

## Verification Result

Last refreshed in this packet:

```bash
pnpm vitest run packages/logix-form/test/Form/Form.ListScopeUniqueWarehouse.test.ts packages/logix-form/test/Form/Form.EffectfulRule.Submit.test.ts packages/logix-form/test/Form/Form.EffectfulListItemRule.Submit.test.ts packages/logix-form/test/Form/Form.EffectfulListRule.Submit.test.ts packages/logix-form/test/Form/Form.EffectfulRootRule.Submit.test.ts packages/logix-form/test/Form/Form.ListCardinalityBasis.test.ts packages/logix-form/test/Form/Form.ReasonEvidence.contract.test.ts packages/logix-react/test/Hooks/useSelector.formErrorDescriptor.test.tsx packages/logix-core/test/Contracts/VerificationScenarioCarrierFormSubmitReasonLink.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioExpectationEvaluation.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCompiledPlanAdapter.contract.test.ts packages/logix-core/test/Contracts/VerificationProofKernelScenarioCompiledPlanCarrier.contract.test.ts packages/logix-core/test/internal/verification/ScenarioBundlePatchRef.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormArtifactBundlePatchRef.contract.test.ts packages/logix-core/test/internal/verification/ScenarioCarrierEvidenceFeed.contract.test.ts
pnpm -C packages/logix-core typecheck
pnpm -C packages/logix-form typecheck
pnpm -C packages/logix-react typecheck
```

Result:

- `22` targeted tests passed
- `packages/logix-core` typecheck passed
- `packages/logix-form` typecheck passed
- `packages/logix-react` typecheck passed

## Implementation Decision

`IMP-003` does not need additional production code in this wave.

The existing implementation and retained harness already provide:

- row-scoped cross-row final errors with stable `$rowId`
- field, list.item, list and root effectful rules lowered into one submit lane
- one `submitAttempt` authority for submit summary and compare feed
- `Form.Error.field(path)` projection through the canonical React selector gate
- CAP-15 bridge from real Form submit `reasonSlotId` to accepted scenario carrier feed
- retained `PF-08` harness for scenario carrier evidence without promoting verification artifact names into public API

## Reopen Bar

Reopen API planning only if implementation proves one of these:

- final rule outcome needs companion to own final truth
- submit summary cannot keep stable reason slot identity
- UI explain and scenario carrier need separate evidence envelopes
- `Form.Error.field(path)` needs a second host read family
- retained retained verification harness starts acting as public API or final compiler vocabulary

## Non-claims

- no new public submit API
- no second explain object
- no public diagnostics helper
- no public scenario carrier facade
- no root compare productization
- no final implementation vocabulary promotion for artifact-local helpers

## 当前一句话结论

`IMP-003` proof 已刷新；`PF-08 / CAP-15` 相关 fixture helpers 已被 `TASK-006` 降到 test fixtures，生产 retained harness 继续由 verification lifecycle 管理。
