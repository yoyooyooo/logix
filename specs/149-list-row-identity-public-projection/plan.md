# Implementation Plan: List Row Identity Public Projection Contract

> Stop Marker: 2026-04-22 起，本 plan 停止作为执行计划使用。后续 Form API 主线转入 [../155-form-api-shape](../155-form-api-shape/spec.md)，本页仅作历史证据来源。迁入 `155` 的候选要点见 [../155-form-api-shape/proposal-149-154-carryover.md](../155-form-api-shape/proposal-149-154-carryover.md)。

**Branch**: `149-list-row-identity-public-projection` | **Date**: 2026-04-18 | **Spec**: [/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/149-list-row-identity-public-projection/spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/149-list-row-identity-public-projection/spec.md)
**Input**: Feature specification from `/specs/149-list-row-identity-public-projection/spec.md`

## Summary

本计划当前不落公开实现。

当前路线固定为：

1. 先冻结 proof selection dominance
2. 再冻结 row roster projection theorem 与 legality
3. 最后把 required proof set 和 future landing gate 写清

## Imported Axioms

- `docs/ssot/form/03-kernel-form-host-split.md`
- `docs/ssot/form/06-capability-scenario-api-support-map.md`
- `docs/ssot/form/13-exact-surface-contract.md`
- `docs/ssot/runtime/10-react-host-projection-boundary.md`
- `docs/internal/toolkit-candidate-ledger.md`

这些页面提供 owner split、proof row、exact handle surface 与维护层路由。
它们不重复持有本 spec 的 proof closure。

## Binding Matrix

| concern | owner file | role |
| --- | --- | --- |
| proof closure | `specs/149-list-row-identity-public-projection/spec.md` | 持有 selection basis、theorem、legality、non-goals |
| landing gate | `specs/149-list-row-identity-public-projection/plan.md` | 约束后续 landing 必须证明哪些 proof |
| completeness gate | `specs/149-list-row-identity-public-projection/checklists/requirements.md` | 检查 spec 是否闭合 |
| queue routing | `docs/ssot/form/02-gap-map-and-target-direction.md`, `docs/internal/toolkit-candidate-ledger.md` | 维护“当前下一条 proof route”状态 |

## Required Proof Set

后续 landing 若要开始，必须至少补齐下面这些 proof：

1. reorder continuity
2. roster replacement under `replace`
3. `byRowId` after reorder
4. nested list path namespace
5. `trackBy` present path
6. `trackBy` missing path
7. synthetic local id rejection

当前仓内已存在的只是部分 proof：

- core rowId matrix tests
- internal rowId substrate tests
- exact handle surface test
- row identity projection proof tests
- example residue 仍只作为当前观察材料

其中已经有实现级证据的包括：

- core store-mode reorder/replacement proof
- reorder continuity
- roster replacement under `replace`
- `byRowId` after reorder
- nested list path namespace
- `trackBy` missing path 的 store-mode proof

它们不足以直接支持公开 helper landing。

## Future Landing Gate

后续只有在同时满足下面条件时，才允许开始实现：

1. exact noun 与 import shape 真正冻结
2. render key 与 `byRowId` 继续回链同一条 canonical row identity
3. index-string fallback 仍停在 residue 或 proof-failure 区
4. `example-row:*` 不再被当成公开 proof
5. 若引入 projection helper，必须满足 lawful projection 的 admissibility rules

## Likely Landing Files

只有在上述 gate 通过后，才考虑进入这些文件：

- `packages/logix-form/src/internal/form/rowid.ts`
- `packages/logix-form/src/internal/form/commands.ts`
- `packages/logix-react/src/FormProjection.ts`
- `packages/logix-react/src/index.ts`
- `examples/logix-react/src/form-support.ts`

## Non-Goals

- 不在本波次实现公开 helper
- 不在本波次重开 field-ui
- 不把 internal fallback 直接升成公开 proof
- 不提前冻结 exact noun 或 import shape
