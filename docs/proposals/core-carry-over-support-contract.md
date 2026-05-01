---
title: Core Carry-Over Support Contract
status: living
owner: core-carry-over-support
target-candidates:
  - docs/ssot/runtime/03-canonical-authoring.md
  - docs/ssot/runtime/10-react-host-projection-boundary.md
  - docs/standards/logix-api-next-guardrails.md
  - docs/proposals/public-api-surface-inventory-and-disposition-plan.md
last-updated: 2026-04-18
---

# Core Carry-Over Support Contract

## 目标

作为 `C2A1`，冻结 `C1` 留下的 carry-over support surface 最终去向。

本页要裁三件事：

- 这组 support object 里，哪些还配继续公开
- 若继续公开，是否只配停在 subpath
- 哪些应直接 internalize

本页不做实现 patch，不直接回写 live SSoT。

## 页面角色

- 本页是 `C2A1` 的单点 proposal
- 本页承接 [Public API Surface Inventory And Disposition Plan](./public-api-surface-inventory-and-disposition-plan.md) 里的 `C2A1`
- 本页只审 carry-over support，不再混 read/projection、runtime adjunct、verification/evidence

## 当前 authority baseline

- [../ssot/runtime/03-canonical-authoring.md](../ssot/runtime/03-canonical-authoring.md)
- [../ssot/runtime/10-react-host-projection-boundary.md](../ssot/runtime/10-react-host-projection-boundary.md)
- [../standards/logix-api-next-guardrails.md](../standards/logix-api-next-guardrails.md)
- [./public-api-surface-inventory-and-disposition-plan.md](./public-api-surface-inventory-and-disposition-plan.md)
- [./core-canonical-spine-final-shape-contract.md](./core-canonical-spine-final-shape-contract.md)
- [./core-residual-adjunct-contract.md](./core-residual-adjunct-contract.md)

## north-star-only freeze

本页 review 只把北极星当作固定前提：

- AI Native first
- Agent first runtime
- 更小、更一致、更可推导的公开面优先

除此之外，下面这些点全部允许被挑战：

- `Action / Actions / Bound / Handle / Logic / ModuleTag / State` 的全部公开价值
- `ModuleTag` 是否必须继续作为独立 public surface
- `Logic` subpath 是否真有存在理由
- 类型便利是否足以支撑公开 surface

## 当前 scope

- `Action`
- `./Actions`
- `./Bound`
- `./Handle`
- `./Logic`
- `./ModuleTag`
- `./State`

## 目标论点

当前待审目标论点固定为：

> `C2A1` 应冻结为 public-zero support contract。
> 这组 support surface 默认没有任何 root 或 subpath 生存权。
> 除非能证明 `why-public / why-subpath / why-not-internal`，否则默认 internalize。

## adopted candidate

本轮 adopted candidate 已冻结为：

- `C2A1 Public-Zero Carry-Over Support Contract`

冻结结果如下：

- `Action`
- `./Actions`
- `./Bound`
- `./Handle`
- `./Logic`
- `./ModuleTag`
- `./State`

这 7 项全部退出 public core。

概念回收规则固定为：

- `ModuleTag` 的概念回收到 React host lookup law，只作为当前 scope 的绑定符号理解
- `Logic` 的概念回收到 `Module.logic(...)` 这个方法位
- `Action / Actions / State` 的类型便利回收到 `Module` 相关推导与内部 helper
- `Bound / Handle` 的 vocabulary 回收到 `Module.logic(...)` 与 runtime internals

## Row Sheet

| surface | current-reach | candidate-disposition | main challenge |
| --- | --- | --- | --- |
| `Action` | root only | `delete-first` | root-only namespace 是否仍有公开意义 |
| `./Actions` | subpath only | `delete-first` | 纯类型便利是否足以继续公开 |
| `./Bound` | subpath only | `delete-first` | 是否只是 `Module.logic` 之外的残余壳层 |
| `./Handle` | subpath only | `delete-first` | 是否只是 vocabulary helper，而非 owner truth |
| `./Logic` | subpath only | `delete-first` | root canonical 退出后，subpath 是否还有独立存在理由 |
| `./ModuleTag` | subpath only | `delete-first` | host lookup owner 是否足以让它继续停在 core |
| `./State` | subpath only | `delete-first` | 纯类型便利是否应继续公开 |

## 当前一句话结论

`C2A1` 已冻结为 public-zero support contract：carry-over support 在 public core 上完全归零，概念分别回收到 `Module.logic(...)`、`Module.tag` 与 host law。
