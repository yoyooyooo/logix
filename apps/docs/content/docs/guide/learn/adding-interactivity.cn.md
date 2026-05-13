---
title: Logic flows
description: 通过 action stream、state stream 和显式运行策略构建长期业务行为。
---

Logic flow 会把 action 和状态变化转成长期业务行为。

常见入口有两条：

- `$.onAction(...)`
- `$.onState(...)`

## 示例

```ts
SearchModule.logic("search-logic", ($) =>
  $.onState((s) => s.keyword)
    .debounce(300)
    .filter((kw) => kw.length > 2)
    .runLatest((kw) =>
      Effect.gen(function* () {
        const api = yield* $.use(SearchApi)
        const results = yield* api.search(kw)
        yield* $.state.mutate((draft) => {
          draft.results = results
        })
      }),
    ),
)
```

## 运行策略

主要策略包括：

- `run`
- `runParallel`
- `runLatest`
- `runExhaust`

## 同一段逻辑的三种读法

同一段 flow 可以写成：

- Logic DSL
- reaction helpers
- raw Effect 或 Stream 组合

公开推荐继续是 Logic DSL，只有在需要更低层抽象时才下钻。

## 说明

- latest-wins 场景用 `runLatest`
- 需要阻止重复执行时用 `runExhaust`
- 状态写回继续在 effect 体内显式完成

## 相关页面

- [Flows & Effects](../essentials/flows-and-effects)
- [Common recipes](../recipes/common-patterns)
