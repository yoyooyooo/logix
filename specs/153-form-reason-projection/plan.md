# Implementation Plan: Form Reason Projection

> Stop Marker: 2026-04-22 起，本 plan 停止作为执行计划使用。后续 Form API 主线转入 [../155-form-api-shape](../155-form-api-shape/spec.md)，本页仅作历史证据来源。迁入 `155` 的候选要点见 [../155-form-api-shape/proposal-149-154-carryover.md](../155-form-api-shape/proposal-149-154-carryover.md)。

**Branch**: `153-form-reason-projection` | **Date**: 2026-04-21 | **Spec**: [/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/153-form-reason-projection/spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/153-form-reason-projection/spec.md)
**Input**: Feature specification from `/specs/153-form-reason-projection/spec.md`

## Summary

本计划把 reason contract 的剩余闭环固定为两条主线：

1. 让 `error / pending / cleanup / stale` 共用同一 reason authority
2. 让 UI、Agent、trial、compare、repair 共用同一 evidence envelope

当前继续后置 path explain exact noun、focus carrier exact shape、subjectRef 扩展集合。

## Imported Axioms

- `docs/ssot/form/02-gap-map-and-target-direction.md`
- `docs/ssot/form/06-capability-scenario-api-support-map.md`
- `docs/ssot/form/13-exact-surface-contract.md`
- `docs/ssot/runtime/09-verification-control-plane.md`
- `specs/143-form-canonical-error-carrier-cutover/spec.md`
- `specs/144-form-settlement-submit-cutover/spec.md`
- `specs/151-form-active-set-cleanup/spec.md`
- `specs/152-form-settlement-contributor/spec.md`
- `specs/154-form-resource-source-boundary/spec.md`
- `specs/153-form-reason-projection/discussion.md`

这些工件已经固定 canonical error carrier、submitAttempt 最小观察面、active membership 前提、settlement truth 与 remote boundary。

## Binding Matrix

| concern | owner artifact | execution responsibility |
| --- | --- | --- |
| path explain law | `specs/153-form-reason-projection/spec.md` | 持有 same-path explain obligation，不先冻结 exact read noun |
| canonical reason slots | `packages/logix-form/src/internal/form/errors.ts` | 统一 `error / pending / cleanup / stale` 的 reason carrier 与 `reasonSlotId` 语义 |
| cross-source lowering | `packages/logix-form/src/internal/schema/SchemaErrorMapping.ts`, `packages/logix-form/src/internal/form/commands.ts` | 让 decode / submit / manual / async contribution 继续落到同一 authority |
| evidence envelope | `packages/logix-form/src/internal/form/errors.ts`, `packages/logix-form/src/internal/form/commands.ts` | 保持 envelope 为 authority，materialized report 只作 on-demand view |
| control-plane materializer | `docs/ssot/runtime/09-verification-control-plane.md` | 保证 compare / repair / trial 只消费 envelope，不反向成为新 owner |
| exact surface gate | `docs/ssot/form/13-exact-surface-contract.md` | 承接 future exact noun reopen gate |
| witness proof | `packages/logix-form/test/Form/Form.ReasonEvidence.contract.test.ts`, `docs/ssot/form/06-capability-scenario-api-support-map.md` | 锁住 same-path 与 same-submit-failure 两组 witness |

## Execution Order

1. 先冻结 `evidence envelope > materialized report` 的 owner 关系。
2. 再把 `error / pending / cleanup / stale` 收成同一 reason slot family。
3. 然后让 compare / repair / trial 全部只消费 envelope。
4. 最后只在 lane proof 已闭环时，才评估 exact read surface 是否值得重开。

## Required Witness Set

### Bundle A: same path

1. invalid
2. pending
3. cleanup
4. stale

### Bundle B: same submit failure

1. compare feed
2. repair focus
3. trial feed

这两组 witness 必须共用同一 `reasonSlotId / sourceRef / local coordinates` authority。

## Likely Landing Files

- `packages/logix-form/src/internal/form/errors.ts`
- `packages/logix-form/src/internal/form/commands.ts`
- `packages/logix-form/src/internal/form/impl.ts`
- `packages/logix-form/src/internal/schema/SchemaErrorMapping.ts`
- `packages/logix-form/test/Form/Form.ReasonEvidence.contract.test.ts`
- `docs/ssot/form/06-capability-scenario-api-support-map.md`
- `docs/ssot/form/13-exact-surface-contract.md`
- `docs/ssot/runtime/09-verification-control-plane.md`
- `docs/next/form-p0-semantic-closure-wave-plan.md`

## Verification Matrix

| layer | proof |
| --- | --- |
| spec authority | `153/spec.md` + `153/discussion.md` 的 default terminal choice、must-cut、witness bundle 保持一致 |
| same-path proof | `invalid / pending / cleanup / stale` 都能通过同一 authority 被解释 |
| same-submit-failure proof | compare / repair / trial 共享同一 envelope |
| docs writeback | `02 / 06 / 13 / runtime/09 / next` 与 `150` hub 同步 |
| repo gate | `git diff --check`, related form tests, `pnpm -C packages/logix-form exec tsc -p tsconfig.test.json --noEmit` |

## Done Definition

1. `error / pending / cleanup / stale` 进入同一 reason contract
2. `reasonSlotId.subjectRef` 继续只允许 `row | task | cleanup`
3. evidence envelope 保持 authority，materialized report 继续只是 view
4. compare / repair / trial 不再各自产生第二套 reason family
5. reviewer 可直接否决第二 explain object / 第二 report truth

## Non-Goals

- 不冻结 path explain 的 exact read surface
- 不冻结 compare / repair focus carrier 的 exact shape
- 不扩展 `reasonSlotId.subjectRef` 集合
- 不在 reason contract 未闭环前冻结 helper family
