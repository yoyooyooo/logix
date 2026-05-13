# Implementation Plan: Form Active Set Cleanup

> Stop Marker: 2026-04-22 起，本 plan 停止作为执行计划使用。后续 Form API 主线转入 [../155-form-api-shape](../155-form-api-shape/spec.md)，本页仅作历史证据来源。迁入 `155` 的候选要点见 [../155-form-api-shape/proposal-149-154-carryover.md](../155-form-api-shape/proposal-149-154-carryover.md)。

**Branch**: `151-form-active-set-cleanup` | **Date**: 2026-04-21 | **Spec**: [/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/151-form-active-set-cleanup/spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/151-form-active-set-cleanup/spec.md)
**Input**: Feature specification from `/specs/151-form-active-set-cleanup/spec.md`

## Summary

本计划把 active-shape lane 剩余的 active set / presence / cleanup 闭环切成三段：

1. 冻结 `retain | drop` presence policy 与 active exit contract
2. 把 subtree exit 时的 `errors / ui / pending / blocking` 一起退出收成同一 cleanup law
3. 把 cleanup receipt 收到 reason / evidence truth，供 `152 / 153` 消费

当前计划继续后置 exact noun、cleanup receipt direct reader、richer presence vocabulary。

## Imported Axioms

- `docs/ssot/form/02-gap-map-and-target-direction.md`
- `docs/ssot/form/03-kernel-form-host-split.md`
- `docs/ssot/form/06-capability-scenario-api-support-map.md`
- `docs/ssot/runtime/09-verification-control-plane.md`
- `specs/145-form-active-shape-locality-cutover/spec.md`
- `specs/149-list-row-identity-public-projection/spec.md`
- `specs/154-form-resource-source-boundary/spec.md`
- `specs/151-form-active-set-cleanup/discussion.md`

这些工件已经固定了 locality 主轴、row roster theorem、shared boundary gate，以及 `151` 当前的默认终局。

## Binding Matrix

| concern | owner artifact | execution responsibility |
| --- | --- | --- |
| presence policy default | `specs/151-form-active-set-cleanup/spec.md` | 冻结 `retain | drop`，不再扩 vocabulary |
| declaration compile | `packages/logix-form/src/internal/form/rules.ts` | 把 presence policy 作为声明语义进入编译边界 |
| subtree exit cleanup | `packages/logix-form/src/internal/form/reducer.ts`, `packages/logix-form/src/internal/form/commands.ts` | 把 `errors / ui / pending / blocking` 的退出合成单一 active exit contract |
| row and list locality handoff | `packages/logix-form/src/internal/form/arrays.ts`, `packages/logix-form/src/internal/form/rowid.ts` | 保证 nested list / replace / row-local exit 继续回链 stable locality |
| pending task exit | `packages/logix-form/src/internal/form/install.ts` | active exit 后取消或移除失效 pending contribution |
| cleanup residual shape | `packages/logix-form/src/internal/form/impl.ts`, future `153` landing | 只保留 cleanup receipt，且只进入 reason / evidence |
| witness proof | `packages/logix-form/test/Form/**`, `docs/ssot/form/06-capability-scenario-api-support-map.md` | 锁住 conditional / nested / row-local cleanup bundle |

## Execution Order

1. 先把 `retain | drop` 写成 day-one terminal choice，并在实现侧拒绝 partial cleanup 开关。
2. 再把 conditional subtree、nested list row、nested conditional subtree 三类 active exit 全部压到同一 cleanup law。
3. 然后补 pending / blocking exit，保证 parent exit 能带走 child residue。
4. 最后把 cleanup receipt 只回写到 reason / evidence 路由，给 `152 / 153` 提供稳定 handoff。

## Required Witness Set

后续 landing 至少要补齐下面这组 witness：

1. conditional subtree hide -> exit -> re-enter
2. nested list row remove / hide 的统一 cleanup
3. parent subtree exit 带走 child pending 与 blocking contribution
4. active exit 后只留下 cleanup receipt
5. re-enter 后按当前 values 重算，不复用旧 cleanup 残留
6. `replace(nextItems)` 继续按 roster replacement 处理，不推断 hidden identity retention

## Likely Landing Files

- `packages/logix-form/src/internal/form/rules.ts`
- `packages/logix-form/src/internal/form/arrays.ts`
- `packages/logix-form/src/internal/form/reducer.ts`
- `packages/logix-form/src/internal/form/commands.ts`
- `packages/logix-form/src/internal/form/install.ts`
- `packages/logix-form/src/internal/form/impl.ts`
- `packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts`
- `packages/logix-form/test/Form/Form.RowIdentityContinuity.contract.test.ts`
- `packages/logix-form/test/Form/Form.ReasonEvidence.contract.test.ts`
- `docs/ssot/form/02-gap-map-and-target-direction.md`
- `docs/ssot/form/06-capability-scenario-api-support-map.md`
- `docs/next/form-p0-semantic-closure-wave-plan.md`

## Verification Matrix

| layer | proof |
| --- | --- |
| spec authority | `151/spec.md` + `151/discussion.md` 的 default terminal choice 与 must-cut 保持一致 |
| runtime witness | conditional / nested / row-local exit tests 全部通过同一 cleanup contract 解释 |
| lane handoff | `152 / 153` 不再额外补 active-membership 特例 |
| docs writeback | `02 / 06 / next` 与 `150` hub 均同步 |
| repo gate | `git diff --check`, related form tests, `pnpm -C packages/logix-form exec tsc -p tsconfig.test.json --noEmit` |

## Done Definition

1. hidden / inactive subtree 的 value retention 只由显式 presence policy 决定
2. subtree exit 会一起清掉 `errors / ui / pending / blocking`
3. active exit 后唯一允许残留的是 cleanup receipt
4. nested list / nested conditional / row-local exit 都复用同一 cleanup law
5. `152 / 153` 可以把 active membership 当成已闭环前提

## Non-Goals

- 不冻结 active-set entry / exit 的 exact noun
- 不提供 cleanup receipt 的 direct read surface
- 不引入 `keepErrors / keepPending / keepBlocking`
- 不引入 `onHide / onExit` 一类 imperative callback
