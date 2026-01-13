---
title: StateTrait
description: 字段级能力规则（computed/link/source/externalStore/check），让 Runtime 能收敛、可解释、可治理。
---

StateTrait 是 Logix 的 **能力规则（capability rules）** 层：你可以把派生、联动、校验、外部写回等规则，以“可 diff 的声明”挂到 Module 上，让 Runtime 能：

- 构建显式依赖图（用于增量重算），
- 在事务窗口内一致地收敛规则，
- 输出诊断证据，解释“哪个规则影响了哪个字段、为什么”。

## Traits 放在哪里

常见有两个落点：

1. **Module-level `traits`**：在 `Logix.Module.make(...)` 里声明（Form/Query 等领域包通常走这条路）。
2. **Logic setup**：在可复用 Logic 里通过 `$.traits.declare(...)` 声明，让规则跟着 Logic 一起复用。

通用约束：trait spec 应当是**纯数据**——确定性、无随机、无时间依赖、无 IO。

## 最小示例（computed）

```ts
import * as Logix from '@logixjs/core'
import { Schema } from 'effect'

const State = Schema.Struct({
  keyword: Schema.String,
  normalized: Schema.String,
})

export const SearchDef = Logix.Module.make('Search', {
  state: State,
  actions: {},
  traits: Logix.StateTrait.from(State)({
    normalized: Logix.StateTrait.computed({
      deps: ['keyword'],
      get: (keyword) => keyword.trim().toLowerCase(),
    }),
  }),
})
```

## 什么时候需要直接用 StateTrait

大多数业务代码更推荐走上层领域包（例如 Form），而不是手写 trait。你通常会在这些场景触碰 StateTrait：

- 你在封装可复用的能力层，希望规则跟随 Logic 一起迁移/复用；
- 你需要可解释、可增量的派生/校验来支撑复杂约束区域；
- 你需要通过 `StateTrait.externalStore` 把外部推送源声明式写回状态。

## 延伸阅读

- [Guide: Traits](../../guide/essentials/traits)
- [Recipe: ExternalStore](../../guide/recipes/external-store)
- [API: ExternalStore](./external-store)
- [/api-reference](/api-reference)（完整签名与导出）
