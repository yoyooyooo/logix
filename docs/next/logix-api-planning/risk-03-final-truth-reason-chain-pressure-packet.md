---
title: RISK-03 Final Truth Reason Chain Pressure Packet
status: proof-refreshed
version: 3
---

# RISK-03 Final Truth Reason Chain Pressure Packet

## 目标

把 `RISK-03` 拆成 final truth、submit snapshot、reason backlink 与 second-truth negative proof，验证 frozen API shape 能否继续承接 `CAP-02..CAP-04` 与 `CAP-14..CAP-18`。

本页不承担 authority，不冻结 exact surface，不新增 public reason API。

## Source

- [frozen-api-shape-risk-lanes.md](./frozen-api-shape-risk-lanes.md)
- [../../ssot/capability/03-frozen-api-shape.md](../../ssot/capability/03-frozen-api-shape.md)
- [../../ssot/form/08-capability-decomposition-api-planning-harness.md](../../ssot/form/08-capability-decomposition-api-planning-harness.md)
- [../../ssot/form/13-exact-surface-contract.md](../../ssot/form/13-exact-surface-contract.md)
- [../../ssot/runtime/09-verification-control-plane.md](../../ssot/runtime/09-verification-control-plane.md)
- [imp-003-rule-submit-reason-implementation-packet.md](./imp-003-rule-submit-reason-implementation-packet.md)

## Scope

| field | value |
| --- | --- |
| risk_id | `RISK-03` |
| packet_id | `RISK-03-final-truth-reason-chain-pressure-packet` |
| packet_kind | `semantic + proof-refresh` |
| active_phase | `risk-lane` |
| target_scenarios | `SC-A`, `SC-D`, supporting `SC-F` diagnostics pressure |
| target_caps | `CAP-02`, `CAP-03`, `CAP-04`, `CAP-14`, `CAP-15`, `CAP-16`, `CAP-17`, `CAP-18` |
| target_projection | `PROJ-01`, `PROJ-04`, partial `PROJ-07` |
| target_enablers | `IE-01`, `IE-04`, supporting `IE-07` |
| target_proofs | `PF-01`, `PF-04`, `PF-08` |
| related_collisions | `COL-02`, `COL-05` closed |
| public_surface_budget | no new public concept |

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | `SC-A`, `SC-D`, `SC-F` evidence pressure |
| target_caps | `CAP-02..CAP-04`, `CAP-14..CAP-18` |
| related_projections | `PROJ-01`, `PROJ-04`, `PROJ-07` |
| related_collisions | `COL-02`, `COL-05` |
| required_proofs | `PF-01`, `PF-04`, `PF-08` |
| coverage_kernel | `field(...).rule / root / list / submit` own final truth; `Form.Error.field(path)` reads canonical reason projection only |
| decision_policy | preserve minimal generator, no second truth owner, no public surface delta |
| non_claims | exact report payload, public reason object, public evidence envelope, public scenario vocabulary |
| generator_hypothesis | rule / submit / reason chain can cover final truth without new API because reason coordinates are already exported through canonical state, evidence feed, and report focus refs |

## Current Evidence Inventory

| evidence | current state | implication |
| --- | --- | --- |
| declaration spine | `Form.make` plus `field(...).rule`, `root`, `list`, `submit` is frozen | final truth can stay inside one declaration act |
| submitAttempt snapshot | `$form.submitAttempt` holds `seq`, `reasonSlotId`, verdicts, summary, compareFeed | submit owns final attempt truth |
| rule submit lowering | root, list, and list.item effectful rule tests lower errors into canonical error truth | `CAP-02`, `CAP-14`, `CAP-16` have executable proof |
| submit summary link | `Form.ReasonEvidence` proves summary and compareFeed share the same submitAttempt authority | `CAP-15`, `CAP-17` have narrow proof |
| scenario carrier link | `VerificationScenarioCarrierFormSubmitReasonLink` links real Form submit `reasonSlotId` to scenario carrier feed and keeps evidence summary empty | `PF-08` can consume the same reason coordinate |
| report shell | `VerificationControlPlaneReport` exposes `repairHints.focusRef` and `artifacts[]` | report can link reason without owning domain truth |
| selector primitive | `Form.Error.field(path)` is opaque and non-executable | selector primitive does not own precedence or reason construction |

## Gap Analysis

| gap id | gap | why it matters | expected closure |
| --- | --- | --- | --- |
| `R03-G1` | rule/root/list submit tests assert verdict counts but do not all assert reasonSlotId equality | final truth closure depends on stable submit backlink | bind packet closure to existing `Form.ReasonEvidence` plus targeted tests |
| `R03-G2` | scenario reason-link fixture allowed empty `reasonSlotId` before this packet | dangling links weaken `PF-08` backlink proof | reject missing reason slot before emitting feed |
| `R03-G3` | report link proof was only contract-level | Agent/report view needs focusRef plus artifact link to avoid second report truth | add report shell contract proof |
| `R03-G4` | manual error can be misread as independent final truth | `setError` is effectful input, but not precedence owner | record negative assertion and keep reopen bar strict |

## Decision

Current frozen API shape survives `RISK-03` analysis.

The remaining pressure is proof depth and second-truth hygiene, not surface insufficiency. No `COL-*` needs to reopen unless a close predicate below fails.

After `R03-S1 + R03-S2`, this packet closes `RISK-03` for the current matrix scope.

## Proof Refresh Result

| step id | result | evidence |
| --- | --- | --- |
| `R03-S1` | `passed` | scenario reason-link fixture now rejects missing `reasonSlotId` and emits no dangling evidence feed |
| `R03-S2` | `passed` | verification report contract now proves `repairHints.focusRef.reasonSlotId` links to `artifacts[]` through `relatedArtifactOutputKeys` without domain payload expansion |

Changed files:

- `packages/logix-core/test/internal/verification/fixtures/scenarioCarrierReasonLinkFixture.ts`
- `packages/logix-core/test/Contracts/VerificationScenarioCarrierFormStateReasonLink.contract.test.ts`
- `packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts`

No public API file changed.

## Negative Assertions

- Companion output remains soft fact and cannot own final validity.
- Source receipt and `submitImpact` can influence submit lane but cannot own submit truth.
- Manual error is a `FormErrorLeaf(origin="manual")` write input, not a manual precedence policy or independent verdict.
- `Form.Error.field(path)` stays an opaque selector primitive and cannot carry `reasonSlotId`, `sourceRef`, precedence, or executable resolver.
- `VerificationControlPlaneReport` may carry opaque `focusRef.reasonSlotId` and artifact refs, but cannot expand Form domain payload or own final validity.
- `runtime.compare` cannot use raw evidence, artifact digest, rendered string, or benchmark result as default correctness truth.

## Close Predicate

`RISK-03` is closed for current matrix scope because all are true:

- field, root, list, and submit rules enter the same final truth lane.
- `$form.submitAttempt` is the single submit attempt authority for summary and compareFeed.
- `reasonSlotId` mechanically links Form state, scenario carrier feed, and report focus refs.
- scenario carrier feed cannot emit an empty `reasonSlotId` link.
- report link uses `artifacts[] + relatedArtifactOutputKeys`, not a second report object.
- `Form.Error.field(path)` remains a read primitive and does not alter precedence.
- companion, source, manual error, and verification report remain non-owners of final truth.

## Reopen Bar

Open a new collision or authority writeback only if implementation proves one of these:

- final truth cannot be represented through rule / submit merge.
- submit backlink cannot keep pointing at current canonical evidence.
- `error / pending / stale / cleanup` cannot share the same reason coordinate family.
- UI, Agent, trial, or report requires its own reason object.
- report repair cannot link to Form evidence without second report payload or second evidence envelope.
- manual error requires a public precedence owner beyond `FormErrorLeaf`.

## Validation Plan

Minimum targeted gates:

```bash
pnpm vitest run packages/logix-form/test/Form/Form.EffectfulRootRule.Submit.test.ts packages/logix-form/test/Form/Form.EffectfulListRule.Submit.test.ts packages/logix-form/test/Form/Form.EffectfulListItemRule.Submit.test.ts packages/logix-form/test/Form/Form.ReasonEvidence.contract.test.ts packages/logix-form/test/Form/Form.ErrorSelectorPrimitive.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormStateReasonLink.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormSubmitReasonLink.contract.test.ts packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts
pnpm -C packages/logix-form typecheck
pnpm -C packages/logix-core typecheck
```

## Validation Result

Ran:

```bash
pnpm vitest run packages/logix-form/test/Form/Form.EffectfulRootRule.Submit.test.ts packages/logix-form/test/Form/Form.EffectfulListRule.Submit.test.ts packages/logix-form/test/Form/Form.EffectfulListItemRule.Submit.test.ts packages/logix-form/test/Form/Form.ReasonEvidence.contract.test.ts packages/logix-form/test/Form/Form.ErrorSelectorPrimitive.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormStateReasonLink.contract.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormSubmitReasonLink.contract.test.ts packages/logix-core/test/Contracts/VerificationControlPlaneContract.test.ts
pnpm -C packages/logix-form typecheck
pnpm -C packages/logix-core typecheck
```

Result:

- targeted RISK-03 gate: `8` files passed, `17` tests passed
- `packages/logix-form` typecheck passed
- `packages/logix-core` typecheck passed

## Output Decision

This packet is consumed by [risk-lane-closure-check.md](./risk-lane-closure-check.md).

Reason:

- `RISK-03` current matrix surface risk is closed by proof refresh.
- `RISK-01` has since been closed by its own packet.
- `TASK-003` remains deferred.

## 当前一句话结论

`RISK-03` 当前不要求重开 frozen API shape；final truth 继续由 rule / submit / reason chain 承接，report 与 scenario carrier 只通过同一 `reasonSlotId` 和 artifact link 采证。
