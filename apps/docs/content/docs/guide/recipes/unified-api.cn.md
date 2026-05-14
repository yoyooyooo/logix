---
title: Pattern examples
description: 在不创建第二套 runtime 或 host API 的前提下复用 Logix 行为。
---

可复用 Logix pattern 应保持小，并且能机械回解到 canonical spine。

常用两种形状：

- 不需要 module state 时，用纯 Effect helper
- 需要 state、actions 或 module-local scheduling 时，用显式接收 `$` 的 Logic helper

## 纯 Effect helper

```ts
import { Effect } from "effect"

export const runBulkOperation = (operation: string) =>
  Effect.gen(function* () {
    const bulk = yield* BulkOperationService
    const ids = ["1", "2", "3"]
    yield* bulk.applyToMany({ ids, operation })
    return ids.length
  })
```

这种形状与 Module、Program、Runtime、React host 解耦，因此容易复用。

## Logic helper

```ts
import { Effect } from "effect"

export const installDebouncedSearch = ($: any) =>
  $.onAction("keywordChanged").runLatest((action: { readonly payload: string }) =>
    Effect.gen(function* () {
      yield* $.state.mutate((draft: any) => {
        draft.keyword = action.payload
        draft.status = action.payload ? "loading" : "idle"
      })

      if (!action.payload) return
      const results = yield* SearchService.search(action.payload)

      yield* $.state.mutate((draft: any) => {
        draft.results = results
        draft.status = "ready"
      })
    }),
  )
```

当 pattern 需要 Bound API 能力时，把它放进 `Module.logic(...)` 内使用。helper 应保持窄边界：不要自己分配 Runtime、读取 React、或发明另一个 state owner。

## 选型

| 需求 | 使用 |
| --- | --- |
| 不需要 module state | 纯 Effect helper |
| 需要 module state、actions、watchers、局部 mutation | 显式接收 `$` 的 Logic helper |
| UI bindings | 可回解到 `useModule + useSelector + handle methods` 的 React component 或 toolkit helper |

## 规则

- 不创建第二套 action protocol。
- 不把写入藏进不可追踪 callback。
- helper 不拥有 cache、runtime instance 或 React subscription。
- 优先使用显式参数，不依赖隐藏全局状态。

## 相关页面

- [Bound API ($)](../../api/core/bound-api)
- [Canonical spine](../essentials/canonical-spine)
