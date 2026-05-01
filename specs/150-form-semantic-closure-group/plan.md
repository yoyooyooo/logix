# Implementation Plan: Form Spec Hub

> Stop Marker: 2026-04-22 起，本 plan 停止作为 `149~154` 调度计划使用。后续 Form API 主线转入 [../155-form-api-shape](../155-form-api-shape/spec.md)，本页仅作历史路由来源。迁入 `155` 的候选要点见 [../155-form-api-shape/proposal-149-154-carryover.md](../155-form-api-shape/proposal-149-154-carryover.md)。

**Branch**: `150-form-semantic-closure-group` | **Date**: 2026-04-21 | **Spec**: [/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/150-form-semantic-closure-group/spec.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/specs/150-form-semantic-closure-group/spec.md)
**Input**: Feature specification from `/specs/150-form-semantic-closure-group/spec.md`

## Summary

本计划给 `150` 补 planning 层，目标是把长期 Form hub 从 route manifest 扩成可执行调度面。

当前只交付三件事：

1. 为 `150~154` 补齐 `plan.md`
2. 保留 `149 + 154 -> 151 -> 152 -> 153` 的历史 DAG 记录，并把当前主线迁到 `155`
3. 固定 member close 后的 authority writeback 落点，避免 `spec / discussion / docs/next / ssot` 各自漂移

150 当前不直接承接 runtime 实现，也不复制 member 的 lane 细节。

## Imported Axioms

- `docs/ssot/form/02-gap-map-and-target-direction.md`
- `docs/ssot/form/06-capability-scenario-api-support-map.md`
- `docs/next/form-p0-semantic-closure-wave-plan.md`
- `specs/143-form-canonical-error-carrier-cutover/spec.md`
- `specs/144-form-settlement-submit-cutover/spec.md`
- `specs/145-form-active-shape-locality-cutover/spec.md`
- `specs/149-list-row-identity-public-projection/spec.md`
- `specs/151-form-active-set-cleanup/spec.md`
- `specs/152-form-settlement-contributor/spec.md`
- `specs/153-form-reason-projection/spec.md`
- `specs/154-form-resource-source-boundary/spec.md`

这些工件分别提供 gap authority、proof、当前波次路由、已消费前置，以及当前 member 的实际 owner 边界。
150 不重写它们的 authority，只负责把顺序、门槛与回写关系收成一张执行图。

## Binding Matrix

| concern | owner artifact | planning responsibility |
| --- | --- | --- |
| long-lived routing law | `specs/150-form-semantic-closure-group/spec.md` | 持有 taxonomy、DAG、cluster policy |
| dependency truth | `specs/150-form-semantic-closure-group/spec-registry.json` | 持有 member / predecessor / external 依赖顺序 |
| lane authority | `docs/ssot/form/02-gap-map-and-target-direction.md` | 持有 gap 与 closure gate |
| proof | `docs/ssot/form/06-capability-scenario-api-support-map.md` | 持有 scenario proof 与 verification proof |
| current wave routing | `docs/next/form-p0-semantic-closure-wave-plan.md` | 持有当前 `P0` 三波 close condition |
| theorem gate | `specs/149-list-row-identity-public-projection/plan.md` | 先守 row roster projection theorem |
| shared boundary gate | `specs/154-form-resource-source-boundary/plan.md` | 先守 Query owner 与 Form lowering boundary |
| lane execution | `specs/151-form-active-set-cleanup/plan.md`, `specs/152-form-settlement-contributor/plan.md`, `specs/153-form-reason-projection/plan.md` | 承接各自 lane 的 execution shape 与 proof bundle |

## Milestone Order

| milestone | gate | expected output |
| --- | --- | --- |
| `M0 planning baseline` | `150~154` 全部存在 `plan.md`，并显式挂上 stopped marker | historical hub 与 member 都可回链停止事实 |
| `M1 theorem + boundary gate` | `149` 与 `154` 的 planning 可被 `151~153` 机械消费 | 后续 lane 不再各自长第二 truth |
| `M2 active universe close` | `151` 交出 active set / presence / cleanup 的默认终局 | `152 / 153` 不再补 active-membership 例外 |
| `M3 settlement close` | `152` 交出 contributor grammar、submitImpact、blocking truth | `153` 可以直接消费 submit truth |
| `M4 reason close` | `153` 交出 evidence envelope 与 proof bundle | `P0` semantic closure 三波具备 close 条件 |

## Writeback Matrix

| member close | required writeback targets |
| --- | --- |
| `149` | `specs/150-form-semantic-closure-group/spec-registry.json`, `specs/150-form-semantic-closure-group/discussion.md`, `docs/ssot/form/02-gap-map-and-target-direction.md`, `docs/ssot/form/06-capability-scenario-api-support-map.md` |
| `154` | `specs/150-form-semantic-closure-group/spec-registry.json`, `specs/150-form-semantic-closure-group/discussion.md`, `docs/ssot/form/02-gap-map-and-target-direction.md`, `docs/ssot/form/13-exact-surface-contract.md`, `docs/ssot/runtime/10-react-host-projection-boundary.md` |
| `151` | `specs/150-form-semantic-closure-group/spec-registry.json`, `specs/150-form-semantic-closure-group/discussion.md`, `docs/ssot/form/02-gap-map-and-target-direction.md`, `docs/ssot/form/06-capability-scenario-api-support-map.md`, `docs/next/form-p0-semantic-closure-wave-plan.md` |
| `152` | `specs/150-form-semantic-closure-group/spec-registry.json`, `specs/150-form-semantic-closure-group/discussion.md`, `docs/ssot/form/02-gap-map-and-target-direction.md`, `docs/ssot/form/06-capability-scenario-api-support-map.md`, `docs/next/form-p0-semantic-closure-wave-plan.md`, `docs/ssot/runtime/09-verification-control-plane.md` |
| `153` | `specs/150-form-semantic-closure-group/spec-registry.json`, `specs/150-form-semantic-closure-group/discussion.md`, `docs/ssot/form/02-gap-map-and-target-direction.md`, `docs/ssot/form/06-capability-scenario-api-support-map.md`, `docs/ssot/form/13-exact-surface-contract.md`, `docs/ssot/runtime/09-verification-control-plane.md`, `docs/next/form-p0-semantic-closure-wave-plan.md` |

## Verification Matrix

| layer | proof |
| --- | --- |
| hub status | `150/spec.md` 与 `149~154/spec.md` 的 `Status` 明确标记为 `Stopped` |
| registry truth | `spec-registry.json.entries[].dependsOn` 保留历史 DAG `149 + 154 -> 151 -> 152 -> 153`，member status 统一为 `stopped` |
| backlinks | `150~154/discussion.md` 都能回链 `spec.md + plan.md` |
| authority split | `02` 继续持有 gap authority，`06` 继续持有 proof，`next` 继续持有当前波次路由 |
| formatting gate | `git diff --check` 通过 |

## Done Definition

1. `150~154` 全部具备可读 `plan.md`
2. `150` 与 `151~154` 的 spec status 与 registry status 保持一致
3. hub 的 milestone order、writeback matrix、member DAG 可以脱离聊天上下文独立阅读
4. 后续 member close 时，维护者可以直接按本页回写，不需要重新猜 authority 落点

## Non-Goals

- 不在 `150` 内复制 `151~154` 的 API 形状讨论
- 不在 `150` 内定义 member 的 detailed tasks
- 不在 `150` 内重开 exact noun、helper family、toolkit intake
- 不把 `150` 扩成 second authority page
