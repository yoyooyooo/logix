---
title: Toolkit Candidate Intake
status: living
version: 2
---

# Toolkit Candidate Intake

## 目标

定义官方 toolkit 候选提炼的长期识别协议。

本页只冻结：

- intake 角色
- 候选分类法
- 证据等级
- `closed-core-surface` 的判断口径
- strict one-hop derivation 回 core 的判断口径
- `call` 方向的额外门禁

本页不维护活跃候选清单。
活跃台账统一看 [../../internal/toolkit-candidate-ledger.md](../../internal/toolkit-candidate-ledger.md)。

## 角色

本页是 maintainer-curated toolkit 候选识别协议的单点事实源。

它服务两个目标：

1. 把 examples / app residue / 历史 draft 的提炼动作收成统一流程
2. 在候选真正进入 toolkit 讨论前，先把不该进入 toolkit 的对象挡在 core truth 之外

本页额外固定一条 intake 总原则：

- 优先降低误学成本，不优先降低临时样板量

## 上游约束

本页只建立在下面这些已冻结输入上：

- [./11-toolkit-layer.md](./11-toolkit-layer.md)
- [../../adr/2026-04-18-official-toolkit-layer.md](../../adr/2026-04-18-official-toolkit-layer.md)
- [./10-react-host-projection-boundary.md](./10-react-host-projection-boundary.md)
- [../form/05-public-api-families.md](../form/05-public-api-families.md)
- [../form/13-exact-surface-contract.md](../form/13-exact-surface-contract.md)

如果本页与这些页面冲突，以上游约束为准，并回头修本页。

## 候选分类法

所有候选当前只允许冻结到下面四类之一：

### 1. `closed-core-surface`

含义：

- 当前已存在的 canonical noun
- 必须继续停在 core
- 不进入 toolkit 候选池

### 2. `core-gap`

含义：

- 当前暴露出的真实 primitive 缺口
- 若要升格，默认优先回 core
- 在 core 未闭合前，不冻结 toolkit wrapper

### 3. `toolkit-first-wave`

含义：

- 当前证据密度最高
- 完全建立在既有 truth 之上
- 可以成为 toolkit 第一波候选

### 4. `reject-residue`

含义：

- 当前不升格
- 可能是 demo-local residue、single-demo policy、历史 draft noun，或应被明确拒绝的第二入口

进入这四类之前，维护者必须先回答三分法：

1. 它是否在补 owner truth / primitive contract / identity / diagnostics / verification 真相
2. 它是否只是建立在既有 truth 之上的 de-sugared recipe
3. 它是否混入 value / error / ui / event / 页面 policy

若第 3 项为真，默认直接归 `reject-residue`。

## 形状标签

每个候选额外带一个 `shape` 标签：

- `view-helper`
- `render-adapter`
- `recipe`
- `wrapper-family`
- `law-guard`

`shape` 只描述当前 residue 的观察形状，不承诺 future public noun、object shape、hook family 或 cache contract。
对命中 strict derivation gate 的候选，`shape` 不能被拿来主张 helper family。

## 证据等级

每个候选额外带一个 `evidence-grade`：

- `canonical-core-surface`
- `live-residue`
- `historical-draft`
- `single-demo`

当前冻结规则：

- `toolkit-first-wave` 默认只接受先通过 strict derivation gate 后仍然成立的 `live-residue`
- `historical-draft` 只能作为 exclusion evidence，不得单独支撑 first-wave 判定
- `single-demo` 默认不进入 first-wave
- “能少写很多代码”不是 first-wave 正证据

## Core-first 门禁补充

除了 toolkit layer 已冻结的 truth 门禁，本页额外固定：

- `host law`
- `acquisition law`
- `orchestration law`

这三类对象默认也优先留在 core。

它们不应因为“可以包一层 wrapper”就进入 toolkit 候选池。

同样地，它们也不应因为“能少写很多代码”就进入 toolkit 候选池。

## Strict Derivation Gate

在把任何对象放进 `toolkit-first-wave` 前，先检查它是否同时满足下面条件：

- 输入 truth 已经在 core / domain route 冻结
- 只是对这份 truth 做一跳代数投影
- 投影公式可以直接写成显式等式
- 不携带 handle、hook family、selector / equality / cache contract
- 不重打包 raw passthrough 字段
- 不混入 actionability、页面 policy 或 UI local policy

若全部满足，当前去向固定为：

- exact surface 已闭合时，归入 `closed-core-surface`
- exact surface 尚未闭合时，归入 `core-gap`

这类对象不进入 `toolkit-first-wave`。

## Recipe Protocol Gate

若候选未命中 strict derivation gate，但仍想进入 `toolkit-first-wave`，还必须同时满足：

- 它覆盖一个明确而高频的场景
- 它有稳定的 de-sugared mapping
- 它明确列出 uncovered scenario
- uncovered scenario 一律直接退回 core / domain owner

缺任一项，默认不进入 first-wave。

## Closed Core Surfaces

下面这些对象默认视为当前已闭合的 core canonical surface：

- `useModule(ModuleTag)`
- `useModule(Program, options?)`
- `host.imports.get(ModuleTag)`
- `useImportedModule(parent, ModuleTag)`
- `useRuntime()`
- `$.use(Tag)`
- `callById(...)`
- `withPolicy(...)`
- `compose(...)`

后续任何 alias、bridge noun、kit facade 若试图覆盖这些 surface，默认进入 `reject-residue`，除非先通过 core reopen。

## React Residue Supplement

当前与 React host residue 相关的补充判断固定为：

- 已删除对象默认视为 `reject-residue`
- 不得沿用历史 family、object shape 或 noun lineage 直接回流
- 若未来真有新的局部 recipe 候选，必须先提供新的场景证据与 de-sugared mapping 再进入 intake
- 若未来候选会触碰 core host truth，必须先走 core reopen
- 若未来候选会制造第二套“更顺手 host 习惯”，直接视为 `reject-residue`

## `call` 方向的额外门禁

当前 `call` 方向只允许先冻结边界，不急着冻结 concrete toolkit candidate。

这意味着：

- `call` 相关对象优先归入 `closed-core-surface`、`core-gap` 或 `reject-residue`
- 若未来要重开 toolkit recipe，必须先证明它不会长出第二 orchestration truth
- 旧 orchestration surface 与 `Logic.ts` 只作为 boundary / exclusion evidence，不作为 toolkit candidate 来源

## 历史 draft 处置规则

历史 draft 默认不直接构成 toolkit 候选正证据。

它们只能：

- 提供 carry-forward 底层裁决
- 提供 reject / stale-draft noun lineage
- 提供 cookbook / recipe 素材

不能：

- 直接把旧 noun family 搬进新的 toolkit 计划
- 绕过 `live-residue` 证据门禁

## 当前一句话结论

toolkit 候选提炼当前先做分类法、strict derivation gate、closed core surfaces 与 call 边界冻结；活跃候选台账继续放在 [../../internal/toolkit-candidate-ledger.md](../../internal/toolkit-candidate-ledger.md) 里维护。
