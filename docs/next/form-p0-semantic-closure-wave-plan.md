---
title: Form P0 Semantic Closure Wave Plan
status: proposed
target:
  - docs/ssot/form/02-gap-map-and-target-direction.md
  - docs/ssot/form/03-kernel-form-host-split.md
  - docs/ssot/form/04-convergence-direction.md
  - docs/ssot/form/06-capability-scenario-api-support-map.md
  - docs/ssot/form/07-kernel-upgrade-opportunities.md
  - docs/ssot/form/09-operator-slot-design.md
  - docs/ssot/form/13-exact-surface-contract.md
  - docs/ssot/runtime/09-verification-control-plane.md
  - docs/ssot/runtime/10-react-host-projection-boundary.md
  - docs/ssot/runtime/12-toolkit-candidate-intake.md
last-updated: 2026-04-21
---

# Form P0 Semantic Closure Wave Plan

## 目标

把当前已经达成共识的战略判断，翻译成可实施的 `P0` semantic closure wave plan。

本页只处理：

- `active-shape lane`
- `settlement lane`
- `reason contract`

helper surface、host sugar、toolkit wrapper 继续后置。

## 当前 adopted claim

1. `F1` 之后的下一波主战场固定为 `P0` semantic closure
2. 主计划只承接 `Wave A/B/C`：
   - `active-shape lane`
   - `settlement lane`
   - `reason contract`
3. post-`P0` reopen 只做 external routing，不再作为本页主波次
4. 每个 wave 都必须带最小 verification-feed，直接接入既有 `runtime.check / runtime.trial / runtime.compare`

## 执行入口

- implementation plan:
  - [2026-04-21-form-p0-semantic-closure-implementation.md](/Users/yoyo/Documents/code/personal/logix.worktrees/next-api/docs/superpowers/plans/2026-04-21-form-p0-semantic-closure-implementation.md)

## Execution Snapshot

- `Wave A`
  - store-mode `replace(nextItems)` 已按 roster replacement 处理，不再复用旧 rowId
- `Wave B`
  - submit gate 已落最小 `submitAttempt` snapshot
- `Wave C`
  - `submit summary / compare feed` 已共用同一 `reasonSlotId`

## Lane Decision

当前已转入 `docs/next/**`，理由固定为：

- 主方向已收口
- 当前只剩 wave 关闭后的治理动作与 lane 升格 / consumed 时机判断

当前从 `docs/next/**` 升格或 consumed 的门槛固定为：

- `Wave Closure Ledger` 已固定
- `Wave A/B/C` 的 owner / witness / proof 路由已固定
- `Post-P0 Reopen Routing` 已固定
- proposal 级 `Reopen Bar / Consume Gate` 已固定

若后续出现新的主方向分歧，必须回到 `docs/proposals/**` 重新开 proposal。

## Consume Gate

本页只有在同时满足下面条件时才允许 consumed：

- `Wave A/B/C` 都满足 close condition
- `declaration / witness / evidence` 三坐标接入既有 control plane
- `post-P0 reopen` 已全部转成 external routing，不再污染主波次
- proposal lane 去向已记录

## Reopen Bar

本页只允许重开下面三类问题：

- `Wave A/B/C` 的切波与依赖顺序
- owner / witness / proof 路由的自洽性
- proof bundle 与 consume gate 的闭环证据

凡涉及下面这些议题，默认不得回灌到本页：

- canonical grammar 改写
- exact noun / exact surface spelling
- host adjunct import shape
- toolkit intake policy
- `Form.Rule.*` 最终 public status

## in scope

- `P0` 三条 root lane 的 wave 切分
- 每波需要交付的 closure gate
- witness / evidence / compare 的最低落点
- 与 `specs/149` 等 active probe 的接线顺序

## out of scope

- `FormErrorLeaf` exact spelling
- live residue 清理
- toolkit noun 设计
- field-ui 与 strict corollary 的 exact noun freeze

## Wave Ledger

proof bundle 只允许使用下面这组固定词表：

- `declaration parity`
- `witness parity`
- `evidence parity`
- `compare proof`
- `consume decision recorded`

| claim | wave | canonical owner page | witness page | proof page | implementation anchor | proof bundle | close condition | reopen route | status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `P0C1 active-shape lane closes active-set semantics` | `A` | `form/02 + form/03` | `form/06` | `runtime/09` | `activeShapeSlice + row ownership + specs/149` | `declaration parity + witness parity + evidence parity + compare proof` | active set 决定 validation / blocking / explain universe，cleanup / remap / row-local compare 全部可比较 | `本 proposal` | `blocking` |
| `P0C2 settlement lane closes contributor / submit semantics` | `B` | `form/02 + form/03` | `form/06` | `runtime/09` | `settlementSlice + submitAttempt + contributor substrate + form/07 kernel enabler` | `declaration parity + witness parity + evidence parity + compare proof` | pending / stale / decoded verdict / submit gate 全部挂到单一 submit truth | `本 proposal` | `blocking` |
| `P0C3 reason contract closes explain / summary / compare feed` | `C` | `form/02 + form/03` | `form/06` | `runtime/09` | `reasonProjectionSlice + canonical evidence envelope + form/13 imported gate` | `declaration parity + witness parity + evidence parity + compare proof` | path explain / submit summary / compare feed 共用同一 authority | `本 proposal` | `blocking` |

## Post-P0 Reopen Routing

| topic | freeze owner | external gate | consumer doc | blocking status | drop condition |
| --- | --- | --- | --- | --- | --- |
| row identity 的 exact noun / import shape | `form/09` | `form/09` | `docs/ssot/form/09-operator-slot-design.md` | `parked` | 若 theorem 已足够，不再单独冻结 noun |
| field-ui exact leaf contract | `form/13` | `form/13` | `docs/ssot/form/13-exact-surface-contract.md` | `parked` | owner 页吸收或明确后退出本页 |
| strict corollary / adjunct import shape | `runtime/10 + runtime/12` | `runtime/10 + runtime/12` | `docs/ssot/runtime/10-react-host-projection-boundary.md`, `docs/ssot/runtime/12-toolkit-candidate-intake.md` | `parked` | 若停在 app-local，则退出本页 |
| `Form.Rule.*` public status | `runtime/06 + form/09` | `runtime/06 + form/09` | `docs/ssot/runtime/06-form-field-kernel-boundary.md`, `docs/ssot/form/09-operator-slot-design.md` | `parked` | exact owner 明确后退出本页 |

## Suggested Verification

```bash
rtk rg -n "active-shape lane|settlement lane|reason contract|verification-feed|host sugar" \
  docs/ssot/form/02-gap-map-and-target-direction.md \
  docs/ssot/form/03-kernel-form-host-split.md \
  docs/ssot/form/04-convergence-direction.md \
  docs/ssot/form/06-capability-scenario-api-support-map.md \
  docs/ssot/runtime/09-verification-control-plane.md

rtk rg -n "row-local compare|decoded verdict|compare feed|reasonSlotId|submit summary" \
  docs/ssot/form/06-capability-scenario-api-support-map.md \
  docs/ssot/form/07-kernel-upgrade-opportunities.md \
  docs/ssot/form/13-exact-surface-contract.md

rtk git diff --check -- \
  docs/next/form-p0-semantic-closure-wave-plan.md \
  docs/ssot/form/02-gap-map-and-target-direction.md \
  docs/ssot/form/03-kernel-form-host-split.md \
  docs/ssot/form/04-convergence-direction.md \
  docs/ssot/form/06-capability-scenario-api-support-map.md \
  docs/ssot/form/07-kernel-upgrade-opportunities.md \
  docs/ssot/form/09-operator-slot-design.md \
  docs/ssot/form/13-exact-surface-contract.md \
  docs/ssot/runtime/09-verification-control-plane.md \
  docs/ssot/runtime/10-react-host-projection-boundary.md \
  docs/ssot/runtime/12-toolkit-candidate-intake.md
```

## 当前一句话结论

post-`F1` 的 Form 主战场固定为 `Wave A/B/C` 三波 `P0` semantic closure；所有 post-`P0` reopen 只做 external routing，不再占用当前主计划的完成判定。
