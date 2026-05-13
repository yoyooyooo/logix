---
title: Query
description: 通过 `@logixjs/query` 构造 query programs，并显式注入缓存和去重引擎。
---

`@logixjs/query` 是一个 program-first resource kit。

它把这些对象一起收进模块状态：

- query params
- query UI state
- resource snapshots

这样整条 query 链路就可以保持可订阅、可调试、可回放。

## 最小用法

```ts
export const SearchQuery = Query.make("SearchQuery", {
  params: Schema.Struct({ q: Schema.String }),
  initialParams: { q: "" },
  ui: { query: { autoEnabled: true } },
  queries: ($) => ({
    list: $.source({
      resource: SearchSpec,
      deps: ["params.q", "ui.query.autoEnabled"],
      triggers: ["onMount", "onKeyChange"],
      concurrency: "switch",
      key: (q, autoEnabled) => (autoEnabled && q ? { q } : undefined),
    }),
  }),
})
```

## 引擎注入

外部缓存或去重引擎通过显式方式注入：

```ts
const runtime = Logix.Runtime.make(RootProgram, {
  layer: Layer.mergeAll(AppInfraLayer, Query.Engine.layer(Query.TanStack.engine(new QueryClient()))),
  middleware: [Query.Engine.middleware()],
})
```

## Owner 模型

- Query 负责定义 query program
- 外部引擎继续保持可选且显式
- params、UI state 和 snapshots 继续留在模块状态里

## 常见用法

- 把 imported query module 当成普通 child program 使用
- 由拥有者模块驱动 param 变化或 refresh
- 保持 query orchestration 显式

## 相关页面

- [Cross-module communication](./cross-module-communication)
