---
title: Devtools Appendix Surface Contract
status: living
owner: devtools-appendix-surface
target-candidates:
  - docs/ssot/runtime/01-public-api-spine.md
  - docs/ssot/runtime/09-verification-control-plane.md
  - docs/standards/logix-api-next-guardrails.md
  - docs/proposals/public-api-surface-inventory-and-disposition-plan.md
last-updated: 2026-04-18
---

# Devtools Appendix Surface Contract

## 目标

冻结 `T4` 这组 devtools appendix surface 的最终去向。

本页要裁三件事：

- `@logixjs/devtools-react` 到底还配继续公开哪些 root 与 subpath
- root 样式副作用是否还能继续接受
- `FieldGraphView / DevtoolsLayer / LogixDevtools` 与 `InternalContracts / Debug / Observability` 的耦合是否还配继续停在公开 appendix

本页不做实现 patch，不直接回写 live SSoT。

## 页面角色

- 本页是 `T4` 的单点 proposal
- 本页承接 [Public API Surface Inventory And Disposition Plan](./public-api-surface-inventory-and-disposition-plan.md) 里的 `T4`
- [../ssot/runtime/01-public-api-spine.md](../ssot/runtime/01-public-api-spine.md) 与 [../ssot/runtime/09-verification-control-plane.md](../ssot/runtime/09-verification-control-plane.md) 只作 authority input，不作 exact authority

## 当前 authority baseline

- [../ssot/runtime/01-public-api-spine.md](../ssot/runtime/01-public-api-spine.md)
- [../ssot/runtime/09-verification-control-plane.md](../ssot/runtime/09-verification-control-plane.md)
- [../standards/logix-api-next-guardrails.md](../standards/logix-api-next-guardrails.md)
- [./public-api-surface-inventory-and-disposition-plan.md](./public-api-surface-inventory-and-disposition-plan.md)

## north-star-only freeze

- AI Native first
- Agent first runtime
- 更小、更一致、更可推导的公开面优先

除此之外，下面这些点全部允许被挑战：

- `LogixDevtools / DevtoolsLayer / FieldGraphView` 的全部公开价值
- root side effect 是否还能继续接受
- devtools 是否还配继续作为公开 appendix 存在
- subpath roster 是否该继续存在

## 当前 challenge override

下面这些 live 语句在本页只算 prior baseline witness，不算默认结论：

- `@logixjs/devtools-react` root 继续公开 `LogixDevtools / DevtoolsLayer / FieldGraphView`
- `./*` wildcard 继续公开任意顶层 tsx
- root import 继续自动注入样式副作用
- `FieldGraphView` 对 `InternalContracts / Debug / Observability` 的深耦合继续被接受

原因：

- 这些对象目前主要靠 package exports、样式注入和内部测试存活
- 在零存量用户前提下，这组对象都必须重新证明 `why-public / why-root-or-subpath / why-not-internal`

## 当前 scope

- root:
  - `LogixDevtools`
  - `DevtoolsLayer`
  - `FieldGraphView`
- subpaths:
  - `./LogixDevtools`
  - `./DevtoolsLayer`
  - `./FieldGraphView`
- wildcard:
  - `./*`

## 目标论点

当前待审目标论点固定为：

> `T4` 应冻结为 appendix-minimized devtools contract。
> `@logixjs/devtools-react` 默认不自动保留 root side effect、过宽 subpath roster 与深耦合视图组件。
> 除非能证明 `why-public / why-root-or-subpath / why-not-internal`，否则默认继续收口。

## adopted candidate

本轮 adopted candidate 已冻结为：

- `Zero-Surface Devtools Appendix Contract`

冻结结果如下：

- `@logixjs/devtools-react` public survivor set 归零
- root `.` 退出 exact public surface
- `./LogixDevtools`
- `./DevtoolsLayer`
- `./FieldGraphView`
- `./*`

这组对象全部退出 exact public surface。

概念回收规则固定为：

- root 样式副作用删除
- `FieldGraphView` 概念回收到 core internal field-kernel debug graph owner 与 devtools internal Inspector/Timeline 联动面
- 若未来还要 DX 入口，统一先走 `@logixjs/toolkit` 的显式 devtools helper 或 recipe


## Row Sheet

| surface | current-reach | candidate-disposition | main challenge |
| --- | --- | --- | --- |
| `LogixDevtools` | root + subpath | `delete-first` | 主 devtools UI 是否还配公开 |
| `DevtoolsLayer` | root + subpath | `delete-first` | snapshot/debug bridge 是否还配公开 |
| `FieldGraphView` | root + subpath | `delete-first` | deep coupling view 是否还配公开 |
| `./*` | wildcard | `delete-first` | wildcard 是否必须删除 |
| root side effect | root | `delete-first` | 自动样式注入是否还能继续接受 |

## 当前一句话结论

`T4` 已冻结为零公开面的 devtools appendix contract：`@logixjs/devtools-react` root、subpath、wildcard 与 root side effect 全部退出 exact public surface。
