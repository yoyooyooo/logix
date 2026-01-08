---
title: 'Pattern 模式示例'
description: 展示如何使用 BoundApi Pattern 和 Functional Pattern 编写可复用的业务逻辑。
---

本示例展示了如何使用 Pattern 编写可复用、模块化的业务逻辑。

### 适合谁

- 负责在团队内设计 Pattern / Template / 资产体系的架构师或高级工程师；
- 希望把高频业务流程（如"级联加载"、"乐观更新"）抽象成可配置资产。

### 前置知识

- 熟悉 Effect、Layer 以及 Service Tag 的基本用法；
- 理解 Logix Logic 与 BoundApi 的关系。

### 读完你将获得

- 一套"Pattern 资产 + Effect 实现 + 在 Logic 中消费"的完整范式；
- 区分 Functional Pattern 和 BoundApi Pattern 的使用场景。

## 1. Functional Pattern（工具型）

完全与 Store 解耦的 `(config) => Effect` 函数，通过 Service 获取依赖：

```typescript
// patterns/bulk-operation.ts
import { Effect, Context } from 'effect'

// 定义 Service 契约
class BulkOperationService extends Context.Tag('@svc/BulkOp')<
  BulkOperationService,
  { applyToMany: (params: { ids: string[]; operation: string }) => Effect.Effect<void> }
>() {}

// Functional Pattern：不依赖具体 Store
export const runBulkOperation = (config: { operation: string }) =>
  Effect.gen(function* () {
    const bulk = yield* BulkOperationService
    const ids = ['1', '2', '3'] // 实际从参数或 Service 获取

    yield* bulk.applyToMany({ ids, operation: config.operation })
    return ids.length
  })
```

特点：

- 入口为 `runXxx(config)`，返回 `Effect`；
- 可在多个 Store / Runtime 中复用。

## 2. BoundApi Pattern（状态感知型）

依赖 Store 状态的 Pattern，通过显式接收 `$: BoundApi` 参数：

```typescript
// patterns/cascade.ts
import { Effect } from 'effect'
import * as Logix from '@logixjs/core'

/**
 * @pattern Cascade (级联加载)
 * @description 监听上游字段 → 重置下游 → 加载数据 → 更新结果
 */
export const runCascadePattern = <Sh extends Logix.AnyModuleShape, R, T, Data>(
  $: Logix.BoundApi<Sh, R>,
  config: {
    source: (s: Logix.StateOf<Sh>) => T | undefined | null
    loader: (val: T) => Logix.Logic.Of<Sh, R, Data, never>
    onReset: (draft: Logix.Logic.Draft<Logix.StateOf<Sh>>) => void
    onSuccess: (draft: Logix.Logic.Draft<Logix.StateOf<Sh>>, data: Data) => void
  },
) => {
  return $.onState(config.source).runLatest((val) =>
    Effect.gen(function* () {
      yield* $.state.mutate((draft) => {
        config.onReset(draft)
      })
      if (val == null) return

      const data = yield* config.loader(val)
      yield* $.state.mutate((draft) => {
        config.onSuccess(draft, data)
      })
    }),
  )
}
```

特点：

- 入口为 `runXxxPattern($, config)`，第一个参数为 `BoundApi`；
- 通过 `$` 使用模块能力（`$.onState / $.state.mutate`）。

## 3. 在 Logic 中消费 Pattern

```typescript
// features/address/logic.ts
import { Effect } from 'effect'
import { AddressModule } from './module'
import { runCascadePattern } from '@/patterns/cascade'

export const AddressLogic = AddressModule.logic(($) =>
  Effect.gen(function* () {
    // 使用 BoundApi Pattern
	    yield* runCascadePattern($, {
	      source: (s) => s.provinceId,
	      loader: (provinceId) =>
	        Effect.gen(function* () {
	          const api = yield* $.use(AddressApi)
	          return yield* api.getCities(provinceId)
	        }),
	      onReset: (d) => {
	        d.cities = []
	        d.cityId = null
	      },
	      onSuccess: (d, cities) => {
	        d.cities = cities
	      },
	    })
	  }),
)
```

## 4. 命名规范

| 形态       | 命名约定                   | 示例                           |
| ---------- | -------------------------- | ------------------------------ |
| Functional | `runXxx(config)`           | `runBulkOperation(config)`     |
| BoundApi   | `runXxxPattern($, config)` | `runCascadePattern($, config)` |

## 下一步

- 查看 API 参考文档：[API 参考](../../api/)
- 回顾核心概念：[Thinking in Logix](../essentials/thinking-in-logix)
- 返回文档首页：[文档首页](../../)
