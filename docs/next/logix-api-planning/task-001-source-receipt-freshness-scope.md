---
title: TASK-001 Source Receipt Freshness Scope
status: frozen
version: 1
---

# TASK-001 Source Receipt Freshness Scope

## 目标

把 `IMP-006` 留下的 `IE-02` source receipt freshness residual 拆成一个最小可执行实施步长，并用定向 proof 证明 source receipt identity 可以通过内部 evidence substrate 更完整地回链。

本页不承担 authority，不冻结 public surface，不把 `IE-02` 宣称为 complete。

## Source

- [post-conv-implementation-task-queue.md](./post-conv-implementation-task-queue.md)
- [imp-006-source-substrate-implementation-packet.md](./imp-006-source-substrate-implementation-packet.md)
- [implementation-ready-conversion.md](./implementation-ready-conversion.md)
- [../../ssot/form/08-capability-decomposition-api-planning-harness.md](../../ssot/form/08-capability-decomposition-api-planning-harness.md)
- [../../ssot/form/13-exact-surface-contract.md](../../ssot/form/13-exact-surface-contract.md)
- [../../ssot/runtime/09-verification-control-plane.md](../../ssot/runtime/09-verification-control-plane.md)

## Scope

| field | value |
| --- | --- |
| task_id | `TASK-001` |
| status | `implemented-narrow-proof` |
| execution_topology | `fallback-local` |
| fallback_reason | current repo policy only enables subagent when explicitly requested in the current turn |
| owner_lane | source / evidence |
| target_caps | `CAP-05`, `CAP-06`, `CAP-07`, `CAP-08`, `CAP-09` |
| target_enabler | `IE-02` |
| source_packet | `IMP-006` |
| proof_gates | `PF-02`, `PF-08` |
| public_surface_budget | no new public concept |

## Slice Manifest

| field | value |
| --- | --- |
| target_scenarios | `SC-B`, `SC-C`, `SC-F` |
| target_caps | `CAP-05`, `CAP-06`, `CAP-07`, `CAP-08`, `CAP-09` |
| related_projections | `PROJ-02`, partial `PROJ-07` |
| related_collisions | `COL-01`, `COL-06` closed |
| required_proofs | `PF-02`, `PF-08` |
| coverage_kernel | `single truth`, `proof-before-authority`, `artifact-local-until-promoted`, `minimal-generator-first` |
| decision_policy | no new public source helper; improve proof strength inside existing evidence lane |
| non_claims | source-owned final truth, second evidence envelope, new source helper, root compare productization, complete `IE-02` |
| generator_hypothesis | source receipt freshness can improve through Form-owned evidence contract coordinates without changing authoring surface |

## Missing Field Analysis

| question | answer |
| --- | --- |
| missing source receipt identity field | the Form evidence contract had `sourceRef` and source snapshot `keyHash` in live state, but did not expose a stable receipt coordinate that ties a source declaration to the live snapshot path and key hash location |
| owner | Form evidence contract artifact |
| why not Form state | Form state already owns the live resource snapshot; adding metadata there would mix declaration evidence with runtime state truth |
| why not core evidence | core evidence should collect and serialize domain-owned coordinates, not infer Form source receipt payload shape |
| why not verification feed | scenario carrier feed consumes evidence links; it should not become the source receipt owner |
| implementation route | extend internal `FormSourceOwnershipContract` with `sourceReceiptRef`, `sourceSnapshotPath`, and `keyHashRef` |
| public API impact | none |
| proof result type | narrower proof only |

## Implementation Delta

| file | change |
| --- | --- |
| `packages/logix-form/src/internal/form/fields.ts` | source ownership entries now include `sourceReceiptRef`, `sourceSnapshotPath`, and `keyHashRef` |
| `packages/logix-form/test/Form/Form.ReasonEvidence.contract.test.ts` | artifact proof sample now asserts the new source receipt coordinates |
| `packages/logix-core/test/Contracts/VerificationScenarioCarrierFormArtifactBundlePatchRef.contract.test.ts` | retained harness fixture accepts the richer Form source ownership seed |

## Targeted Failing Test

Before this implementation, this test would fail because the exported Form evidence contract did not include `sourceReceiptRef`, `sourceSnapshotPath`, or `keyHashRef`:

```bash
pnpm vitest run packages/logix-form/test/Form/Form.ReasonEvidence.contract.test.ts
```

The focused assertion is the `sources` entry in `@logixjs/form.evidenceContract@v1`.

## Proof Plan

Run:

```bash
pnpm vitest run packages/logix-form/test/Form/Form.ReasonEvidence.contract.test.ts packages/logix-form/test/Form/Form.Source.Authoring.test.ts packages/logix-form/test/Form/Form.Source.SubmitImpact.test.ts packages/logix-form/test/Form/Form.Source.StaleSubmitSnapshot.test.ts packages/logix-core/test/Contracts/VerificationScenarioCarrierFormArtifactBundlePatchRef.contract.test.ts
pnpm -C packages/logix-form typecheck
pnpm -C packages/logix-core typecheck
```

## Status Delta

| object | previous | next |
| --- | --- | --- |
| `TASK-001` | `ready-to-scope` | `done` |
| `IE-02` | `partial` | `partial` |
| `CAP-09` proof | `partial` | `narrower source receipt artifact proof added` |
| public source lane | fixed | fixed |
| evidence envelope | single | single |

## Non-claims

- no new public source helper
- no public `SourceReceipt` type change
- no source-owned final truth
- no second evidence envelope
- no root `Runtime.compare` productization
- no complete source receipt identity for every remote source variant
- no promotion of retained verification-artifact vocabulary

## Reopen Bar

Reopen `TASK-001` only if one of these becomes true:

- source receipt identity needs a second evidence envelope
- source receipt identity cannot be represented as Form-owned evidence artifact coordinates
- source submit impact must own submit truth
- row-scoped source authoring cannot derive stable receipt coordinates from the existing declaration path
- all remote source variants must be claimed complete in the same proof wave

## 当前一句话结论

`TASK-001` closes a narrow source receipt freshness gap by adding Form-owned evidence contract coordinates. `IE-02` remains `partial` because this does not prove every remote source variant.
