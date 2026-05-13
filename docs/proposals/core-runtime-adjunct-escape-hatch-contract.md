---
title: Core Runtime Adjunct Escape Hatch Contract
status: living
owner: core-runtime-adjunct-escape-hatch
target-candidates:
  - docs/ssot/runtime/01-public-api-spine.md
  - docs/ssot/runtime/11-toolkit-layer.md
  - docs/standards/logix-api-next-guardrails.md
  - docs/proposals/public-api-surface-inventory-and-disposition-plan.md
last-updated: 2026-04-18
---

# Core Runtime Adjunct Escape Hatch Contract

## 目标

作为 `C2A3`，冻结 runtime adjunct / maintainer escape hatch residual 的最终去向。

本页要裁三件事：

- 这组对象里，哪些还配继续公开
- 若继续公开，是否只配停在 expert subpath
- 哪些应直接 internalize，哪些若未来还要活只配去 toolkit

本页不做实现 patch，不直接回写 live SSoT。

## 页面角色

- 本页是 `C2A3` 的单点 proposal
- 本页承接 [Public API Surface Inventory And Disposition Plan](./public-api-surface-inventory-and-disposition-plan.md) 里的 `C2A3`
- 本页只审 runtime adjunct 与 maintainer escape hatch
- 本页不再混 carry-over support、read/projection、verification/evidence

## 当前 authority baseline

- [../ssot/runtime/01-public-api-spine.md](../ssot/runtime/01-public-api-spine.md)
- [../ssot/runtime/11-toolkit-layer.md](../ssot/runtime/11-toolkit-layer.md)
- [../standards/logix-api-next-guardrails.md](../standards/logix-api-next-guardrails.md)
- [./public-api-surface-inventory-and-disposition-plan.md](./public-api-surface-inventory-and-disposition-plan.md)
- [./core-residual-adjunct-contract.md](./core-residual-adjunct-contract.md)

## north-star-only freeze

本页 review 只把北极星当作固定前提：

- AI Native first
- Agent first runtime
- 更小、更一致、更可推导的公开面优先

除此之外，下面这些点全部允许被挑战：

- `MatchBuilder / ScopeRegistry / Root / Env / Platform / Middleware / InternalContracts / EffectOp` 的全部公开价值
- maintainer escape hatch 这个分类本身
- subpath 的默认保留资格
- toolkit 是否比 core 更适合承接未来 DX 入口

## 当前 challenge override

下面这些 live 语句在本页只算 prior baseline witness，不算默认结论：

- `ScopeRegistry` 继续默认作为公开 registry 存在
- `Root` 继续默认作为公开 root resolution entry 存在
- `Platform / Middleware / EffectOp` 继续默认作为 runtime shell adjunct 存在
- `MatchBuilder / InternalContracts` 继续默认作为公开 escape hatch 存在

原因：

- 它们大多只是维护者便利面或当前实现链露出的壳层
- 在零存量用户前提下，这组对象都必须重新证明 `why-public / why-subpath / why-not-internal-or-toolkit`

## 当前 scope

- `MatchBuilder`
- `ScopeRegistry`
- `Root`
- `Env`
- `Platform`
- `Middleware`
- `InternalContracts`
- `./EffectOp`

## 目标论点

当前待审目标论点固定为：

> `C2A3` 应冻结为 public-zero runtime adjunct contract。
> 这组对象默认没有继续停在 public core 的生存权。
> 除非能证明 `why-public / why-subpath / why-not-internal-or-toolkit`，否则默认 internalize。

## adopted candidate

本轮 adopted candidate 已冻结为：

- `C2A3 Public-Zero Runtime Adjunct Contract`

冻结结果如下：

- `MatchBuilder`
- `ScopeRegistry`
- `Root`
- `Env`
- `Platform`
- `Middleware`
- `InternalContracts`
- `./EffectOp`

这 8 项全部退出 public core。

概念回收规则固定为：

- `ScopeRegistry` 概念回收到 host local transport internal
- `Root` 概念回收到 `RootContext + app assembly + proof helper`
- `Platform` 概念回收到 core internal platform 与各 host adapter internal
- `MatchBuilder / Env / Middleware / InternalContracts / EffectOp` 全部回收到 `internal/**`
- 若未来真要 DX 入口，统一先走 `@logixjs/toolkit` reopen

## Row Sheet

| surface | current-reach | candidate-disposition | main challenge |
| --- | --- | --- | --- |
| `MatchBuilder` | root only | `delete-first` | 是否只是历史便利面 |
| `ScopeRegistry` | root only | `delete-first` | scope-bound registry 是否应继续公开 |
| `Root` | root + `./Root` | `delete-first` | root provider resolution 是否应继续公开 |
| `Env` | root + `./Env` | `delete-first` | env helper 是否配继续占 core |
| `Platform` | root + `./Platform` | `delete-first` | host/platform bridge 是否该继续留在 core |
| `Middleware` | root + `./Middleware` | `delete-first` | EffectOp middleware shell 是否有公开价值 |
| `InternalContracts` | root only | `delete-first` | in-repo integration surface 是否还配公开 |
| `./EffectOp` | subpath only | `delete-first` | effect-op shell 是否应继续公开 |

## 当前一句话结论

`C2A3` 已冻结为 public-zero runtime adjunct contract：这组 runtime adjunct 与 maintainer escape hatch 全部退出 public core，概念回收到 internal 与 host adapter 内部。
