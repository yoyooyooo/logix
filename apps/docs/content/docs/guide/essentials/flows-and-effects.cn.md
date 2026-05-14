---
title: Flows & Effects
description: 把 Effect-based behavior 挂到 actions、state changes 与 services 上。
---

Logic 是挂载到 Module 上的 Effect-based behavior。

```ts
const SearchLogic = Search.logic("search-logic", ($) =>
  Effect.gen(function* () {
    yield* $.onAction("keywordChanged").runLatest(
      Effect.gen(function* () {
        const state = yield* $.state.read
        // run service work, then write state
      }),
    )
  }),
)
```

## Declaration work

有些工作需要在 builder root 同步声明：

```ts
const Logic = Search.logic("logic", ($) => {
  $.readyAfter(loadInitialConfig, { id: "initial-config" })

  return Effect.gen(function* () {
    // run phase
  })
})
```

公开路线不是 `{ setup, run }`。声明放在 builder root，并返回 run effect。

## Services

在 logic 内用 `$.use(ServiceTag)` 解析服务。根据 ownership，通过 `Program.make(..., { capabilities: { services } })` 或 `Runtime.make(..., { layer })` 安装 service layers。
