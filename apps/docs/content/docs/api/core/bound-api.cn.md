---
title: Bound API ($)
description: 在 logic 中使用 Bound API 读取状态、派发动作、解析依赖并注册生命周期。
---

`$` 是 `Module.logic(...)` 内可用的 Bound API。

它提供这些能力：

- 状态读取与写入
- action 派发与 watcher
- runtime service lookup
- imported child resolution
- 生命周期注册
- 字段行为声明

## State

```ts
const state = yield* $.state.read

yield* $.state.mutate((draft) => {
  draft.count += 1
})
```

## Actions

```ts
yield* $.dispatch({ _tag: "increment", payload: undefined })
yield* $.dispatchers.increment()
```

## runtime service lookup

```ts
const service = yield* $.use(UserService)
```

`$.use(Tag)` 从当前 runtime scope 读取服务。

## imported children

```ts
const child = yield* $.imports.get(Child.tag)
const value = yield* child.read((s) => s.value)
```

Imported child 必须通过 `Program.make(..., { capabilities: { imports } })` 以 Program 形式提供。

## 生命周期

```ts
Module.logic(($) => {
  $.lifecycle.onInitRequired(Effect.log("init"))
  $.lifecycle.onDestroy(Effect.log("destroy"))

  return Effect.void
})
```

生命周期注册属于 declaration phase。

## 字段行为

```ts
Module.logic(($) => {
  $.fields({
    normalized: $.fields.computed({
      deps: ["query"],
      get: (query) => String(query ?? "").trim().toLowerCase(),
    }),
  })

  return Effect.void
})
```

## 说明

- declaration phase 和 run phase 是分开的
- 生命周期和字段声明属于 declaration phase
- `$.onAction(...)`、`$.onState(...)`、`$.use(...)`、`$.imports.get(...)` 属于 run phase

## 相关页面

- [Handle](./handle)
- [跨模块协作](../../guide/learn/cross-module-communication)
