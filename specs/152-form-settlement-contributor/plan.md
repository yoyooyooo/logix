# Implementation Plan: Form Settlement Contributor

> Stop Marker: 2026-04-22 起，本 plan 停止作为执行计划使用。后续 Form API 主线转入 [../155-form-api-shape](../155-form-api-shape/spec.md)，本页仅作历史证据来源。迁入 `155` 的候选要点见 [../155-form-api-shape/proposal-149-154-carryover.md](../155-form-api-shape/proposal-149-154-carryover.md)。

**Branch**: `152-form-settlement-contributor` | **Date**: 2026-04-21 | **Spec**: [/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/152-form-settlement-contributor/spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/152-form-settlement-contributor/spec.md)
**Input**: Feature specification from `/specs/152-form-settlement-contributor/spec.md`

## Summary

本计划把 settlement lane 剩余闭环切成四段：

1. 冻结 field / list.item / list.list / root 共用的 contributor grammar
2. 把 `submitImpact` 固定在 `block | observe`
3. 把 pending / stale / blocking / decode verdict 全部收进同一 submit truth
4. 把 `minItems / maxItems` 收成 list cardinality canonical basis

当前继续执行 grammar ceiling，不扩 retry family、rich task lifecycle、第二 blocker taxonomy、额外 settlement summary object。

## Imported Axioms

- `docs/ssot/form/02-gap-map-and-target-direction.md`
- `docs/ssot/form/03-kernel-form-host-split.md`
- `docs/ssot/form/06-capability-scenario-api-support-map.md`
- `docs/ssot/runtime/09-verification-control-plane.md`
- `specs/144-form-settlement-submit-cutover/spec.md`
- `specs/151-form-active-set-cleanup/spec.md`
- `specs/154-form-resource-source-boundary/spec.md`
- `specs/152-form-settlement-contributor/discussion.md`

这些工件已经固定 submitAttempt 最小观察面、active membership 前提，以及 remote dependency 共享边界。

## Binding Matrix

| concern | owner artifact | execution responsibility |
| --- | --- | --- |
| contributor grammar | `specs/152-form-settlement-contributor/spec.md` | 固定最小字段为 `deps / key / concurrency / debounce / submitImpact` |
| declaration compile | `packages/logix-form/src/internal/form/rules.ts` | 让 field / list.item / list.list / root 共用同一 declaration grammar |
| pending lifecycle | `packages/logix-form/src/internal/form/install.ts` | keyed task、debounce、cancel、stale drop 继续停在同一 contributor substrate |
| submit truth | `packages/logix-form/src/internal/form/commands.ts`, `packages/logix-form/src/internal/form/errors.ts`, `packages/logix-form/src/internal/form/impl.ts`, `packages/logix-form/src/internal/form/reducer.ts` | 统一 `submitImpact`、blocking basis、pending count、decoded verdict |
| list cardinality basis | `packages/logix-form/src/internal/form/rules.ts`, related list handling | 让 `minItems / maxItems` 进入 list scope 的 canonical settlement truth |
| remote dependency handoff | `specs/154-form-resource-source-boundary/spec.md` | 远程结果只作为 lowered contributor facts 被消费 |
| witness proof | `packages/logix-form/test/Form/**`, `docs/ssot/form/06-capability-scenario-api-support-map.md` | 锁住 field/list/root async 与 list cardinality 场景 |

## Execution Order

1. 先冻结 grammar ceiling，不给 scope-specific grammar 留口子。
2. 再把 field / list.item / list.list / root 的 async declaration 压到同一 contributor substrate。
3. 然后固定 `submitImpact` 与 blocking basis，让 `block | observe` 进入 submit gate。
4. 最后把 `minItems / maxItems`、stale drop、decode verdict 一起纳入同一 submit truth。

## Required Witness Set

后续 landing 至少要补齐下面这组 witness：

1. field-level async validation with `submitImpact="block"`
2. list.item async validation 与 list.list cardinality 同时存在
3. root-level async validation 进入同一 submit gate
4. stale drop 只进入 reason / evidence，不回写成 canonical error leaf
5. decode invalid、active error block、active pending block 可以同次 submit 下区分
6. active exit 后失效 contributor 不再残留 blocker

## Likely Landing Files

- `packages/logix-form/src/internal/form/rules.ts`
- `packages/logix-form/src/internal/form/install.ts`
- `packages/logix-form/src/internal/form/reducer.ts`
- `packages/logix-form/src/internal/form/commands.ts`
- `packages/logix-form/src/internal/form/errors.ts`
- `packages/logix-form/src/internal/form/impl.ts`
- `packages/logix-form/test/Form/Form.Commands.DefaultActions.test.ts`
- `packages/logix-form/test/Form/Form.ReasonEvidence.contract.test.ts`
- `docs/ssot/form/02-gap-map-and-target-direction.md`
- `docs/ssot/form/06-capability-scenario-api-support-map.md`
- `docs/ssot/runtime/09-verification-control-plane.md`
- `docs/next/form-p0-semantic-closure-wave-plan.md`

## Verification Matrix

| layer | proof |
| --- | --- |
| spec authority | `152/spec.md` + `152/discussion.md` 的 grammar ceiling 与 default terminal choice 保持一致 |
| submit witness | field / list / root async 场景都能回链同一 contributor grammar |
| blocking truth | decode invalid、pending block、error block 能通过同一 submitAttempt summary 解释 |
| docs writeback | `02 / 06 / runtime/09 / next` 与 `150` hub 同步 |
| repo gate | `git diff --check`, related form tests, `pnpm -C packages/logix-form exec tsc -p tsconfig.test.json --noEmit` |

## Done Definition

1. field / list.item / list.list / root 共用同一 contributor grammar
2. `submitImpact` 只保留 `block | observe`
3. `minItems / maxItems` 成为唯一 list cardinality basis
4. stale drop 继续只产出 reason / evidence
5. submit lane 能单点解释 decode invalid、active error block、active pending block

## Non-Goals

- 不扩 retry / refresh / retry-window family
- 不引入 scope-specific contributor grammar
- 不引入第二 blocker taxonomy 或额外 settlement summary object
- 不给 cardinality 长 companion object
