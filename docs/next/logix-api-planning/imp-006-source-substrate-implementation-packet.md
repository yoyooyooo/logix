---
title: IMP-006 Source Substrate Implementation Packet
status: frozen
version: 6
---

# IMP-006 Source Substrate Implementation Packet

## 目标

把 `CONV-001` 中 source lane 与 `IE-02` implementation freshness 切片转成实施包，覆盖 remote fact ingress、source dependency scheduling、source task lifecycle、source submit impact 与 source receipt identity 的当前可执行范围。

本页只刷新 implementation freshness，不改公开 surface。source lane 的 public API baseline 继续由 `13 / specs/155` 持有，verification evidence boundary 继续由 `runtime/09` 持有。

## Source

- [implementation-ready-conversion.md](./implementation-ready-conversion.md)
- [proposal-portfolio.md](./proposal-portfolio.md)
- [../../ssot/form/08-capability-decomposition-api-planning-harness.md](../../ssot/form/08-capability-decomposition-api-planning-harness.md)
- [../../ssot/form/13-exact-surface-contract.md](../../ssot/form/13-exact-surface-contract.md)
- [../../ssot/runtime/09-verification-control-plane.md](../../ssot/runtime/09-verification-control-plane.md)
- [../../review-plan/runs/2026-04-24-global-api-shape-closure-gate-after-pf-09.md](../../review-plan/runs/2026-04-24-global-api-shape-closure-gate-after-pf-09.md)

## Scope

| field | value |
| --- | --- |
| packet_id | `IMP-006` |
| status | `proof-refreshed-current-matrix-implemented` |
| owner_lane | source |
| source_caps | `CAP-05`, `CAP-06`, `CAP-07`, `CAP-08`, `CAP-09` |
| source_projection | `PROJ-02`, partial `PROJ-07` |
| source_enabler | `IE-02` |
| source_collisions | `COL-01`, `COL-06` |
| proof_gates | `PF-02`, `PF-08` |
| public_surface_budget | no new public concept |

## Required Implementation Outcomes

| outcome | requirement |
| --- | --- |
| source ingress | remote facts enter Form only through `field(path).source(...)` or the same expert DSL lowering |
| dependency scheduling | source key is derived from declared deps and key function, then strict-canonicalized or rejected before IO |
| lifecycle | source lifecycle stays in resource snapshot status and key hash |
| submit impact | `submitImpact: "block"` and `"observe"` affect submit truth without making source own submit truth |
| stale submit snapshot | old blocked submitAttempt is not rewritten by later source settle |
| row scope | canonical list-item field source works under row scope |
| evidence boundary | source receipt identity remains artifact-backed; FU5 proves artifact/feed/report join through current report / scenario harness, not a second envelope |

## Suggested File Scope

| area | likely files | allowed edits |
| --- | --- | --- |
| Field-kernel source substrate | `packages/logix-core/src/internal/field-kernel/source.impl.ts`, `packages/logix-core/src/internal/field-kernel/source.ts` | only if `PF-02` regresses |
| Resource registry | `packages/logix-core/src/Resource.ts`, `packages/logix-core/src/internal/resource.ts` | only if resource lookup or duplicate id gate regresses |
| Form install | `packages/logix-form/src/internal/form/install.ts`, `packages/logix-form/src/internal/form/**` | only if Form source lowering regresses |
| Form tests | `packages/logix-form/test/Form/Form.Source*.test.ts` | keep `PF-02` executable |
| Core tests | `packages/logix-core/test/internal/FieldKernel/FieldKernel.SourceRuntime.test.ts`, `packages/logix-core/test/Resource.test.ts`, `packages/logix-core/test/internal/ReplayMode.Resource.test.ts` | keep source substrate freshness executable |

## Verification Artifact Consumption

| artifact area | decision |
| --- | --- |
| scenario carrier feed helpers | supporting evidence only through `PF-08`; no source-specific promotion |
| expectation evaluator | out of scope |
| fixture adapter | out of scope |
| compare perf admissibility helper | out of scope |

## Proof Freshness Rule

Refresh `IMP-006` whenever any of these areas change:

- `field(path).source(...)` authoring
- expert DSL source lowering
- source deps / key scheduling
- source lifecycle snapshot shape
- `submitImpact` aggregation
- stale submitAttempt semantics
- source resource registry, source key canonicalization, same-key generation gate, and replay resource behavior
- Form evidence contract artifact export involving source fields

## Verification Plan

Run the source lane gates:

```bash
pnpm vitest run packages/logix-form/test/Form/Form.Source.Authoring.test.ts packages/logix-form/test/Form/Form.Source.RowScope.Authoring.test.ts packages/logix-form/test/Form/Form.Source.SubmitImpact.test.ts packages/logix-form/test/Form/Form.Source.SubmitImpact.ExpertDsl.test.ts packages/logix-form/test/Form/Form.Source.StaleSubmitSnapshot.test.ts packages/logix-form/test/Form/Form.Companion.Scenario.trial.test.ts packages/logix-core/test/internal/FieldKernel/FieldKernel.SourceRuntime.test.ts packages/logix-core/test/Resource.test.ts packages/logix-core/test/internal/ReplayMode.Resource.test.ts packages/logix-core/test/Runtime/Lifecycle/Lifecycle.DynamicResource.test.ts
```

Then run the affected package checks:

```bash
pnpm -C packages/logix-core typecheck
pnpm -C packages/logix-form typecheck
```

If the implementation touches shared public exports, also run:

```bash
pnpm typecheck
```

## Verification Result

Last refreshed in this packet:

```bash
pnpm vitest run packages/logix-form/test/Form/Form.Source.Authoring.test.ts packages/logix-form/test/Form/Form.Source.RowScope.Authoring.test.ts packages/logix-form/test/Form/Form.Source.SubmitImpact.test.ts packages/logix-form/test/Form/Form.Source.SubmitImpact.ExpertDsl.test.ts packages/logix-form/test/Form/Form.Source.StaleSubmitSnapshot.test.ts packages/logix-form/test/Form/Form.Companion.Scenario.trial.test.ts packages/logix-core/test/internal/FieldKernel/FieldKernel.SourceRuntime.test.ts packages/logix-core/test/Resource.test.ts packages/logix-core/test/internal/ReplayMode.Resource.test.ts packages/logix-core/test/Runtime/Lifecycle/Lifecycle.DynamicResource.test.ts
pnpm -C packages/logix-core typecheck
pnpm -C packages/logix-form typecheck
```

Result:

- `14` targeted tests passed
- `packages/logix-core` typecheck passed
- `packages/logix-form` typecheck passed

## Implementation Decision

`IMP-006` does not need additional production code in this wave.

The existing implementation currently provides:

- `field(path).source(...)` as the public source authoring route
- expert DSL lowering into the same source truth
- deps/key based source refresh with resource registry lookup
- row-scoped source authoring for list item fields
- `submitImpact` block / observe behavior
- stable blocked submitAttempt snapshot after later source settle
- replay-mode resource snapshot reuse without calling live resource loader
- startup report artifact export that can carry Form evidence contract material

The implementation is marked `proof-refreshed-current-matrix-implemented` because `TASK-007` closed key canonicalization and same-key generation safety for the current matrix source substrate. Broader remote source variant productization remains outside this packet.

`CAP-PRESS-001-FU3` closed the narrower `exhaust-trailing + debounceMs + submitImpact:block` freshness proof by adding internal submit-time source freshness flush. This is not a new public API planning gap.

`CAP-PRESS-001-FU4` closed the narrower source failure lifecycle proof by keeping settled source failure out of canonical errors and submit blocker truth while explaining it through the existing `Form.Error.field(path)` selector primitive. This is not a new public API planning gap.

`CAP-PRESS-001-FU5` closed the narrower receipt artifact/feed/report join proof by keeping source receipt coordinates in the Form evidence artifact, projecting only carrier coordinates into scenario feed rows, and linking report hints through `artifacts[] + focusRef + relatedArtifactOutputKeys`. This is not a new public API planning gap.

`CAP-PRESS-001-FU6` closed the narrower row receipt disambiguation proof by showing in-flight row-scoped source writeback follows the same row id after reorder and drops removed-row settle. This is not a new public API planning gap.

`TASK-007` closed the source key residual by enforcing strict canonical key hashing, deterministic rejected-key diagnostics, no-IO rejected keys, idle reset on rejected keys, and generation-safe same-key writeback for both non-row and row-scoped sources.

## Reopen Bar

Reopen API planning only if implementation proves one of these:

- source lane needs to absorb companion or rule ownership
- source receipt identity requires a second evidence envelope
- source submit impact requires source to own submit truth
- source scheduling cannot stay deps/key driven
- row-scoped source authoring requires a new public source helper family

## Non-claims

- no new public source helper
- no source-owned final truth
- no second evidence envelope
- no complete remote source variant productization beyond current matrix source substrate proof
- no root compare productization

## 当前一句话结论

`IMP-006` 当前 proof 已刷新，且 `FU3 / FU4 / FU5 / FU6 / TASK-007` 已补上 submit-time debounced block freshness proof、source failure lifecycle proof、receipt artifact/feed/report join proof、row receipt disambiguation proof、key canonicalization 与 same-key generation proof。`IE-02` 在 current matrix source substrate proof 范围内已闭合。
