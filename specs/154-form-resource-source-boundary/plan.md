# Implementation Plan: Form Resource Source Boundary

> Stop Marker: 2026-04-22 起，本 plan 停止作为执行计划使用。后续 Form API 主线转入 [../155-form-api-shape](../155-form-api-shape/spec.md)，本页仅作历史证据来源。迁入 `155` 的候选要点见 [../155-form-api-shape/proposal-149-154-carryover.md](../155-form-api-shape/proposal-149-154-carryover.md)。

**Branch**: `154-form-resource-source-boundary` | **Date**: 2026-04-21 | **Spec**: [/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/154-form-resource-source-boundary/spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/154-form-resource-source-boundary/spec.md)
**Input**: Feature specification from `/specs/154-form-resource-source-boundary/spec.md`

## Summary

本计划先守 owner boundary，再决定是否进入代码实现。

当前固定顺序如下：

1. 保持 exact user-view shape 为 `field(path).source({ resource, deps, key, ... })`
2. 用 lowering matrix 让 `151 / 152 / 153` 机械消费 Query-owned remote facts
3. 用 hard upgrade trigger + safe-local envelope 区分 form-local remote dependency 与 full QueryProgram
4. 只有 lane proof 证明当前 lowering 不足时，才允许重开 future noun / carrier landing

## Imported Axioms

- `docs/ssot/form/02-gap-map-and-target-direction.md`
- `docs/ssot/form/03-kernel-form-host-split.md`
- `docs/ssot/form/13-exact-surface-contract.md`
- `docs/ssot/runtime/10-react-host-projection-boundary.md`
- `packages/logix-query/src/Engine.ts`
- `packages/logix-query/src/internal/resource.ts`
- `specs/151-form-active-set-cleanup/spec.md`
- `specs/152-form-settlement-contributor/spec.md`
- `specs/153-form-reason-projection/spec.md`
- `specs/154-form-resource-source-boundary/discussion.md`

这些工件已经固定 Query owner、React host law、current exact surface gate 与三条 lane 的消费方向。

## Binding Matrix

| concern | owner artifact | execution responsibility |
| --- | --- | --- |
| remote fact owner | `packages/logix-query/src/Engine.ts`, `packages/logix-query/src/internal/resource.ts` | 保持 `Resource / ResourceSpec / load` 的 authority 在 Query |
| exact declaration edge | `specs/154-form-resource-source-boundary/spec.md`, `docs/ssot/form/13-exact-surface-contract.md` | 保持 exact user-view shape 为 consumer-attached `field(path).source(...)` |
| form declaration compile | future `packages/logix-form/src/internal/form/rules.ts` landing | 只承接 trigger semantics 与 lowering declaration，不持有 remote owner |
| form runtime lowering | future `packages/logix-form/src/internal/form/install.ts`, `packages/logix-form/src/internal/form/commands.ts` landing | 只 lower 出 companion / settlement / reason consumer facts |
| active exit handoff | `specs/151-form-active-set-cleanup/spec.md` | remote lowered facts 离开 active set 时继续服从 cleanup law |
| settlement handoff | `specs/152-form-settlement-contributor/spec.md` | pending / stale / blocking / submitImpact 只消费 lowered facts |
| reason handoff | `specs/153-form-reason-projection/spec.md` | explain / compare / repair / trial 只消费 lowered facts |
| host projection | `docs/ssot/runtime/10-react-host-projection-boundary.md` | React 继续只做 `useModule + useSelector + handle` |

## Execution Order

1. 先保持 owner formula 固定为 `Query owner -> Form lowering -> React projection`。
2. 再把 must-upgrade triggers 和 safe-local envelope 写成 reviewer 可机械执行的路由门。
3. 然后用 `151 / 152 / 153` 校验 lowering matrix 是否足够。
4. 只有当 lane proof 明确失败时，才通过 `09 / 13 / runtime/10` 重开 future noun 或 carrier landing。

## Required Witness Set

后续 landing 至少要补齐下面这组 witness：

1. country -> province options 这类 form-local options dependency
2. invite code / username uniqueness 这类 remote result 参与 validation 的场景
3. row-local sku / quote lookup 这类 list row dependency
4. 一条命中 hard trigger 的 full Query scenario，例如 invalidate、prefetch、pagination 或跨区域复用
5. `Form.Rule.custom` direct fetch 被拒绝
6. React `useEffect` 同步远程结果回表单被拒绝

## Future Landing Gate

当前计划不直接开始公开实现。
只有在同时满足下面条件时，才允许进入代码 landing：

1. `151 / 152 / 153` 已证明当前 lowering matrix 足以被各自消费
2. reviewer 能稳定地区分 form-local remote dependency 与 full QueryProgram
3. examples 与 walkthrough 可以解释 boundary，而不需要第二 helper family

若以上条件不满足，优先回写 spec / docs / witness，不补 form-level remote subsystem。

## Likely Landing Files

满足 gate 后，才考虑进入这些文件：

- `packages/logix-query/src/Engine.ts`
- `packages/logix-query/src/internal/resource.ts`
- `packages/logix-form/src/internal/form/rules.ts`
- `packages/logix-form/src/internal/form/install.ts`
- `packages/logix-form/src/internal/form/commands.ts`
- `packages/logix-form/test/**`
- `docs/ssot/form/02-gap-map-and-target-direction.md`
- `docs/ssot/form/13-exact-surface-contract.md`
- `docs/ssot/runtime/10-react-host-projection-boundary.md`

## Verification Matrix

| layer | proof |
| --- | --- |
| spec authority | `154/spec.md` + `154/discussion.md` 的 boundary invariants、upgrade gate、must-cut 保持一致 |
| owner proof | Query 继续持有 remote fact authority，Form 只 lower consumer facts |
| lane proof | `151 / 152 / 153` 都能消费 lowered facts，且不重开 second owner |
| host proof | React 继续只经由 existing host law 读取 lowered facts |
| repo gate | `git diff --check` |

## Done Definition

1. reviewer 能用单一公式解释 form-local remote dependency
2. reviewer 能命中单个 hard trigger 时直接升级到 QueryProgram
3. `151 / 152 / 153` 不需要各自再定义 remote owner boundary
4. `field(path).source(...)` 之外没有第二 remote family 抢跑公开面

## Non-Goals

- 不重开 form-level `source(...)` 或 `Form.Source` family
- 不允许 rule direct fetch
- 不允许 React host side remote sync glue
- 不定义 exact carrier landing page、exact read helper spelling、snapshot write path noun
