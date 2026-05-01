---
title: Sandbox Surface Contract
status: living
owner: sandbox-surface
target-candidates:
  - docs/ssot/runtime/04-capabilities-and-runtime-control-plane.md
  - docs/ssot/runtime/09-verification-control-plane.md
  - docs/standards/logix-api-next-guardrails.md
  - docs/proposals/public-api-surface-inventory-and-disposition-plan.md
last-updated: 2026-04-18
---

# Sandbox Surface Contract

## 目标

冻结 `T3` 这组 sandbox surface 的最终去向。

本页要裁三件事：

- `@logixjs/sandbox` 到底还配继续公开哪些 root 与 subpath
- sandbox 与 `runtime control plane` 的 owner 边界应如何切开
- `Client / Protocol / Service / Types / Vite / vite` 里哪些应继续公开，哪些应 internalize、toolkitize 或删除

本页不做实现 patch，不直接回写 live SSoT。

## 页面角色

- 本页是 `T3` 的单点 proposal
- 本页承接 [Public API Surface Inventory And Disposition Plan](./public-api-surface-inventory-and-disposition-plan.md) 里的 `T3`
- [../ssot/runtime/04-capabilities-and-runtime-control-plane.md](../ssot/runtime/04-capabilities-and-runtime-control-plane.md) 与 [../ssot/runtime/09-verification-control-plane.md](../ssot/runtime/09-verification-control-plane.md) 只作 authority input，不作 exact authority

## 当前 authority baseline

- [../ssot/runtime/04-capabilities-and-runtime-control-plane.md](../ssot/runtime/04-capabilities-and-runtime-control-plane.md)
- [../ssot/runtime/09-verification-control-plane.md](../ssot/runtime/09-verification-control-plane.md)
- [../standards/logix-api-next-guardrails.md](../standards/logix-api-next-guardrails.md)
- [./public-api-surface-inventory-and-disposition-plan.md](./public-api-surface-inventory-and-disposition-plan.md)

## north-star-only freeze

本页 review 只把北极星当作固定前提：

- AI Native first
- Agent first runtime
- 更小、更一致、更可推导的公开面优先

除此之外，下面这些点全部允许被挑战：

- `Types / Protocol / Client / Service / Vite / vite` 的全部公开价值
- browser trial host facade 是否还该继续由 sandbox package 持有
- worker ABI、Effect 适配层与 bundling bridge 是否还该继续公开
- `Client.trial` 是否在代持 `Runtime.trial`
- `Vite / vite` 双入口是否都还配继续存在

## 当前 challenge override

下面这些 live 语句在本页只算 prior baseline witness，不算默认结论：

- `@logixjs/sandbox` root 继续公开 `Types / Protocol / Client / Service`
- `./Client / ./Protocol / ./Service / ./Types / ./Vite / ./vite` 全部继续公开
- browser worker runtime 与 `runtime trial` 继续默认作为同一层 package surface 存活
- `Client.trial` 继续默认作为合法 wrapper

原因：

- 这些对象大多只是当前 package exports、当前 worker/browser tests 与现有 demos 的存活 witness
- 在零存量用户前提下，这组对象都必须重新证明 `why-public / why-root-or-subpath / why-not-internal-or-toolkit`

## 当前 scope

- root:
  - `Types`
  - `Protocol`
  - `Client`
  - `Service`
- subpaths:
  - `./Client`
  - `./Protocol`
  - `./Service`
  - `./Types`
  - `./Vite`
  - `./vite`

## 目标论点

当前待审目标论点固定为：

> `T3` 应冻结为 browser-trial-minimized contract。
> `@logixjs/sandbox` 默认不自动保留 worker ABI、Effect 适配层、bundling bridge 与 duplicated trial wrapper。
> 除非能证明 `why-public / why-root-or-subpath / why-not-internal-or-toolkit`，否则默认继续收口。

## adopted candidate

本轮 adopted candidate 已冻结为：

- `Sandbox Host Wiring + vite Contract`

冻结结果如下：

- `@logixjs/sandbox` root 只保留：
  - `SandboxClientTag`
  - `SandboxClientLayer`
- `@logixjs/sandbox/vite` 继续保留，作为唯一公开 subpath

下面这些对象全部退出独立 public surface：

- `Client`
- `Protocol`
- `Service`
- `Types`
- `Vite`

概念回收规则固定为：

- browser trial 概念继续回收到 core `Runtime.trial(...)`
- sandbox package 只保留 browser host wiring
- `Protocol / Types / Client.trial / RunResult` 全部回收到 sandbox internal worker/compiler/kernel boot adapter
- `vite` 继续作为宿主接线子路径存在
- `Vite` 大写入口删除
- 若未来还要更多 bundling DX，优先走 toolkit recipe 或 sandbox-vite supporting layer

## Row Sheet

| surface | current-reach | candidate-disposition | main challenge |
| --- | --- | --- | --- |
| `Types` | root + `./Types` | `delete-first` | browser trial types 是否仍必须继续公开 |
| `Protocol` | root + `./Protocol` | `delete-first` | worker ABI 是否仍必须继续公开 |
| `Client` | root + `./Client` | `delete-first` | browser facade 是否仍必须继续公开 |
| `Service` | root + `./Service` | `delete-first` | Effect service adapter 是否仍必须继续公开 |
| `Vite` | `./Vite` | `delete-first` | bundling bridge 是否仍必须继续公开 |
| `vite` | `./vite` | `delete-first` | lowercase alias 是否仍必须继续公开 |

## 当前一句话结论

`T3` 已冻结为最小 browser host wiring contract：root 只留 `SandboxClientTag / SandboxClientLayer`，子路径只留 `vite`；`Client / Protocol / Service / Types / Vite` 全部退出独立 public surface。
