---
title: RISK-02 Source Freshness Pressure Packet
status: proof-refreshed
version: 4
---

# RISK-02 Source Freshness Pressure Packet

## 目标

把 `RISK-02` 拆成可执行的 implementation-scope 与 proof-refresh plan，验证 source freshness、receipt identity、submit impact 与 evidence link 能否继续支撑 frozen API shape。

本页不承担 authority，不冻结 exact surface，不新增 public source API。

## Source

- [frozen-api-shape-risk-lanes.md](./frozen-api-shape-risk-lanes.md)
- [../../ssot/capability/03-frozen-api-shape.md](../../ssot/capability/03-frozen-api-shape.md)
- [../../ssot/form/08-capability-decomposition-api-planning-harness.md](../../ssot/form/08-capability-decomposition-api-planning-harness.md)
- [../../ssot/form/13-exact-surface-contract.md](../../ssot/form/13-exact-surface-contract.md)
- [../../ssot/runtime/09-verification-control-plane.md](../../ssot/runtime/09-verification-control-plane.md)
- [imp-006-source-substrate-implementation-packet.md](./imp-006-source-substrate-implementation-packet.md)
- [task-001-source-receipt-freshness-scope.md](./task-001-source-receipt-freshness-scope.md)
- [task-005-source-scheduling-proof-scope.md](./task-005-source-scheduling-proof-scope.md)

## Scope

| field | value |
| --- | --- |
| risk_id | `RISK-02` |
| packet_id | `RISK-02-source-freshness-pressure-packet` |
| packet_kind | `implementation-scope + proof-refresh` |
| active_phase | `risk-lane` |
| target_scenarios | `SC-B`, `SC-C`, supporting `SC-F` evidence pressure |
| target_caps | `CAP-05`, `CAP-06`, `CAP-07`, `CAP-08`, `CAP-09`, `CAP-18` |
| target_projection | `PROJ-02`, partial `PROJ-07` |
| target_enablers | `IE-02`, `IE-04` |
| target_proofs | `PF-02`, `PF-08` |
| related_collisions | `COL-01`, `COL-06`, `COL-07` closed |
| public_surface_budget | no new public concept |

## Current Evidence Inventory

| evidence | current state | implication |
| --- | --- | --- |
| exact source act | `field(path).source({ resource, deps, key, triggers?, debounceMs?, concurrency?, submitImpact? })` is frozen in `13` | API spelling is not the current risk |
| source receipt coordinates | `FormSourceOwnershipContract` already has `sourceReceiptRef`, `sourceSnapshotPath`, `keyHashRef` | evidence coordinate exists for narrow proof |
| keyHash stale gate | source runtime writes settled snapshots through keyHash checks | stale writeback appears solvable internally |
| submit impact | `block / observe` tests exist for public define route and expert DSL route | submit truth can stay outside source |
| stale submit snapshot | tests keep old blocked submitAttempt stable after later source settle | later settle does not rewrite old submit truth |
| row-scoped source | row-scope authoring proof exists | row source route does not need a public helper |
| evidence artifact | reason contract proof exports source coordinates | source can feed verification evidence without a second envelope |

## Gap Analysis

| gap id | gap | why it matters | expected closure |
| --- | --- | --- | --- |
| `R02-G1` | source key freshness is proven for basic key change, but not explicitly stress-tested across all declared scheduling knobs | `triggers / debounceMs / concurrency` are in the frozen act | add or refresh targeted proof around keyHash identity and concurrency mode |
| `R02-G2` | row-scoped source evidence coordinates are not separately asserted at artifact level | row source authoring exists, but receipt proof is currently field-level | add artifact proof sample for row-scoped source receipt path |
| `R02-G3` | stale writeback drop is implied by keyHash gate, but current Form stale submit tests focus on submit snapshot stability | source freshness risk is specifically stale result isolation | add targeted stale key change proof or bind existing FieldKernel proof explicitly |
| `R02-G4` | `IE-02` remains `partial` because all remote variants are not claimed | broad completeness would over-expand the current wave | close only current matrix freshness scope, keep full variant completeness out of scope |

## Decision

Current frozen API shape survives `RISK-02` analysis.

The remaining risk is proof depth and implementation freshness, not surface insufficiency. No `COL-*` needs to reopen unless one of the close predicates below fails.

After `R02-S1 + R02-S2 + R02-S3`, this packet closes `RISK-02` for the current matrix scope. `IE-02` remains broader `partial` for remote source variants beyond the current matrix.

## Implementation Scope

| step id | target | allowed edits | proof gate |
| --- | --- | --- | --- |
| `R02-S1` | source stale key isolation | add or refresh targeted test around key change while old source load is in flight | `PF-02` |
| `R02-S2` | scheduling knob coverage | add or refresh proof for `concurrency: "switch"` and `concurrency: "exhaust-trailing"` under the same public source act | `PF-02` |
| `R02-S3` | row-scoped receipt evidence | add artifact-level proof sample for `items.*.profileResource` source receipt coordinates | `PF-08` |
| `R02-S4` | submit impact evidence link | assert pending/blocking reason can point back to source receipt coordinates without source owning final truth | `PF-02`, `PF-08` |

## Proof Refresh Result

| step id | result | evidence |
| --- | --- | --- |
| `R02-S1` | `passed` | `Form.Source.StaleSubmitSnapshot` now proves old key `u1` cannot overwrite current `u2` source snapshot or pending submit receipt |
| `R02-S2` | `passed-for-switch-debounce` | `Form.Source.StaleSubmitSnapshot` now proves public `field(path).source({ concurrency: "switch", debounceMs })` coalesces rapid key changes and refreshes only the latest key |
| `R02-S3` | `passed` | `Form.ReasonEvidence` now proves row-scoped source receipt coordinates export through the existing Form evidence artifact |

Changed files:

- `packages/logix-form/test/Form/Form.Source.StaleSubmitSnapshot.test.ts`
- `packages/logix-form/test/Form/Form.ReasonEvidence.contract.test.ts`
- `packages/logix-core/src/internal/field-runtime/index.ts`

Production change is internal-only and limited to source onKeyChange scheduling.

Allowed file scope:

| area | files |
| --- | --- |
| Form source tests | `packages/logix-form/test/Form/Form.Source*.test.ts` |
| Form evidence proof sample | `packages/logix-form/test/Form/Form.ReasonEvidence.contract.test.ts` |
| Form source evidence contract | `packages/logix-form/src/internal/form/fields.ts` only if row-scoped artifact proof fails |
| Field-kernel source runtime | `packages/logix-core/src/internal/field-kernel/source.impl.ts` only if stale key or concurrency proof fails |
| Core source tests | `packages/logix-core/test/internal/FieldKernel/FieldKernel.SourceRuntime.test.ts` |

## Non-claims

- no new public source API
- no `Form.Source`
- no `useFieldSource`
- no source-owned final truth
- no second evidence envelope
- no promotion of `sourceReceiptRef / keyHashRef` as public authoring nouns
- no full completion claim for every remote source variant
- no root compare productization

## Close Predicate

`RISK-02` is closed for current matrix scope because all are true:

- `field(path).source(...)` still covers `CAP-05..CAP-09` without public surface delta.
- stale key result cannot overwrite current receipt or current snapshot.
- `submitImpact: "block"` and `"observe"` continue to affect only submit lane.
- row-scoped source can export receipt coordinates through the existing evidence artifact route.
- source receipt evidence links can be consumed by verification without a second envelope.
- `IE-02` remains broader `partial`, but current matrix freshness scope is closed.

## Reopen Bar

Open a new collision or authority writeback only if implementation proves one of these:

- source freshness requires a public helper beyond `field(path).source(...)`
- source receipt identity requires a second evidence coordinate family
- source submit impact must own final submit truth
- row-scoped source cannot derive stable receipt coordinates from current declaration path
- scheduling cannot remain deps/key driven

## Validation Plan

Minimum targeted gates:

```bash
pnpm vitest run packages/logix-form/test/Form/Form.Source.Authoring.test.ts packages/logix-form/test/Form/Form.Source.RowScope.Authoring.test.ts packages/logix-form/test/Form/Form.Source.SubmitImpact.test.ts packages/logix-form/test/Form/Form.Source.SubmitImpact.ExpertDsl.test.ts packages/logix-form/test/Form/Form.Source.StaleSubmitSnapshot.test.ts packages/logix-form/test/Form/Form.ReasonEvidence.contract.test.ts packages/logix-core/test/internal/FieldKernel/FieldKernel.SourceRuntime.test.ts
pnpm -C packages/logix-form typecheck
pnpm -C packages/logix-core typecheck
```

If `source.impl.ts` changes, also run:

```bash
pnpm vitest run packages/logix-core/test/Resource.test.ts packages/logix-core/test/internal/ReplayMode.Resource.test.ts packages/logix-core/test/Runtime/Lifecycle/Lifecycle.DynamicResource.test.ts
```

## Validation Result

Ran:

```bash
pnpm vitest run packages/logix-form/test/Form/Form.Source.StaleSubmitSnapshot.test.ts packages/logix-form/test/Form/Form.ReasonEvidence.contract.test.ts
pnpm vitest run packages/logix-form/test/Form/Form.Source.Authoring.test.ts packages/logix-form/test/Form/Form.Source.RowScope.Authoring.test.ts packages/logix-form/test/Form/Form.Source.SubmitImpact.test.ts packages/logix-form/test/Form/Form.Source.SubmitImpact.ExpertDsl.test.ts packages/logix-form/test/Form/Form.Source.StaleSubmitSnapshot.test.ts packages/logix-form/test/Form/Form.ReasonEvidence.contract.test.ts packages/logix-core/test/internal/FieldKernel/FieldKernel.SourceRuntime.test.ts
pnpm -C packages/logix-form typecheck
pnpm -C packages/logix-core typecheck
```

Result:

- targeted `R02-S1 + R02-S3`: `2` files passed, `6` tests passed
- targeted `R02-S2`: `3` files passed, `9` tests passed
- full source lane targeted gate after `R02-S2`: `7` files passed, `14` tests passed
- `packages/logix-form` typecheck passed
- `packages/logix-core` typecheck passed

## Output Decision

This packet is consumed by [risk-lane-closure-check.md](./risk-lane-closure-check.md).

Reason:

- `RISK-02` current matrix surface risk is closed.
- `RISK-03` has since been closed by its own packet.
- `TASK-003` remains deferred.

## 当前一句话结论

`RISK-02` 当前不要求重开 frozen API shape，且已经通过 `R02-S1 + R02-S2 + R02-S3` 降级为 closed-for-current-matrix implementation residual；本 packet 已被 closure check 消费。
